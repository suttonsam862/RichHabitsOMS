import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import pgSession from "connect-pg-simple";
import MemoryStore from "memorystore";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { supabase, testSupabaseConnection } from "./db"; // Import from our new db.ts file
import { authenticateRequest } from "./routes/auth/auth"; // Import our new auth middleware
import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";
import { URL } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Generate a strong random session secret
const generateRandomString = (length = 32) => {
  return crypto.randomBytes(length).toString('base64');
};

// Use environment variable or generate a secure random secret
const sessionSecret = process.env.SESSION_SECRET || 
  `ThreadCraft-${generateRandomString(32)}-${Date.now()}`;

// Configure enhanced memory store with proper memory management
const MemoryStoreClass = MemoryStore(session);

// Initialize session store based on environment
let sessionStore;
let pgStoreEnabled = false;

// Safely check database URL connectivity before attempting to use PG session store
const canConnectToPg = (() => {
  try {
    if (!process.env.DATABASE_URL) return false;
    
    // Parse the URL to check if it's a valid PostgreSQL URL
    const dbUrl = new URL(process.env.DATABASE_URL);
    return dbUrl.protocol === 'postgres:' || dbUrl.protocol === 'postgresql:';
  } catch (error: any) {
    console.warn('Invalid DATABASE_URL format:', error?.message || 'Unknown error');
    return false;
  }
})();

// Configure session store based on environment and connectivity
if (process.env.NODE_ENV === 'production' && canConnectToPg && process.env.USE_PG_SESSION === 'true') {
  try {
    // Use PostgreSQL session store for production
    const PgSessionStore = pgSession(session);
    sessionStore = new PgSessionStore({
      conString: process.env.DATABASE_URL,
      tableName: 'user_sessions', // Changed to avoid conflicts with any existing 'session' table
      createTableIfMissing: true,
      pruneSessionInterval: 60 * 15, // 15 minutes
      errorLog: console.error.bind(console)
    });
    pgStoreEnabled = true;
    console.log('Using PostgreSQL session store');
  } catch (error) {
    console.error('Failed to initialize PostgreSQL session store:', error);
    console.log('Falling back to memory store');
    pgStoreEnabled = false;
  }
}

// If PostgreSQL store failed or wasn't configured, use memory store with proper cleanup
if (!pgStoreEnabled) {
  try {
    console.log('Using enhanced memory session store');
    sessionStore = new MemoryStoreClass({
      checkPeriod: 86400000, // Prune expired entries every 24h
      max: 1000, // Maximum number of sessions to store
      ttl: 86400000, // Time to live in milliseconds (24h)
      dispose: (key, value) => {
        if (process.env.NODE_ENV !== 'production') {
          console.log(`Session expired: ${key.substring(0, 8)}...`);
        }
      },
      stale: false // Delete stale sessions
    });
  } catch (err: any) {
    console.warn('Error initializing enhanced memory store, falling back to default Express memory store');
    sessionStore = undefined; // Default memory store will be used
  }
}

// Setup session middleware with appropriate storage for the environment
app.use(session({
  store: sessionStore,
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: { 
    // In production, Replit handles HTTPS - so we can set secure cookies
    // But we provide an override in case the deployment platform doesn't support HTTPS
    secure: process.env.NODE_ENV === 'production' && process.env.DISABLE_SECURE_COOKIES !== 'true',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax', // Prevents CSRF while allowing normal navigation
    httpOnly: true, // Prevents client-side JS from accessing the cookie
    path: '/' // Makes cookie available for all routes
  },
  rolling: true // Refresh session with each request to prevent expiration
}));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    // Verify Supabase connection
    console.log("Checking database initialization state with Supabase client...");
    const connected = await testSupabaseConnection();
    
    if (!connected) {
      console.warn("Supabase connection failed. Please check your environment variables and database setup.");
      console.log("Will continue and retry connection as needed");
    } else {
      console.log("Supabase connection verified successfully");
    }
    
    // Add authentication middleware before API routes
    app.use('/api', authenticateRequest);
    
    // Register API routes first
    const server = await registerRoutes(app);

    // Error handling middleware for API routes
    app.use("/api", (err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ message });
      console.error(err);
    });

    // Static file serving and client-side routing should come after API routes
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }
    
    app.use(express.static(path.resolve(__dirname, "../client/dist")));
    
    // Catch-all route should be last
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(__dirname, "../client/dist/index.html"));
    });

    // ALWAYS serve the app on port 5000
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    const port = 5000;
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      log(`serving on port ${port}`);
    });
  } catch (error) {
    console.error("Failed to start application:", error);
    process.exit(1);
  }
})();
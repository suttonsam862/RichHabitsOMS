import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import pgSession from "connect-pg-simple";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { supabase, testSupabaseConnection } from "./db"; // Import from our new db.ts file
import { authenticateRequest } from "./auth"; // Import our new auth middleware
import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";

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

// Initialize session store based on environment
// For production, we'd use PostgreSQL, but for development we'll use memory store
// since direct PostgreSQL connection to Supabase isn't available from external networks
let sessionStore;

if (process.env.NODE_ENV === 'production' && process.env.USE_PG_SESSION === 'true') {
  // Use PostgreSQL session store for production
  const PgSessionStore = pgSession(session);
  sessionStore = new PgSessionStore({
    conString: process.env.DATABASE_URL,
    tableName: 'session',
    createTableIfMissing: true,
    pruneSessionInterval: 60 * 15
  });
  console.log('Using PostgreSQL session store');
} else {
  // Use memory store for development (note: this doesn't persist across restarts)
  console.log('Using memory session store for development');
  // Memory store is the default when no store is specified
  sessionStore = undefined;
}

// Setup session middleware with appropriate storage for the environment
app.use(session({
  store: sessionStore,
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax',
    httpOnly: true
  },
  rolling: true // Refresh session with each request to prevent expiration
}));

// Add authentication middleware
app.use(authenticateRequest);

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
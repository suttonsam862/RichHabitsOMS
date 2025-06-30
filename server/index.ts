import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import MemoryStore from "memorystore";
import pgSession from "connect-pg-simple";

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

import cors from "cors";
import { createServer } from "http";
import { setupVite, serveStatic, log } from "./vite";
import { supabase, testSupabaseConnection, closeConnections } from "./db";
import { authenticateRequest } from "./routes/auth/auth";
import { globalErrorHandler, notFoundHandler } from "./middleware/errorHandler";
import { 
  apiLimiter, 
  authLimiter, 
  securityHeaders, 
  corsOptions, 
  sanitizeInput 
} from "./middleware/security";
import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";
import { URL } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Configure trust proxy for Replit environment - only in production
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Apply security headers first
app.use(securityHeaders);

// Apply CORS
app.use(cors(corsOptions));

// Apply rate limiting to all API routes
app.use('/api', apiLimiter);

// Apply stricter rate limiting to auth routes
app.use('/api/auth', authLimiter);

// Body parsing with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Sanitize all inputs
app.use(sanitizeInput);

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
      checkPeriod: 3600000, // Prune expired entries every hour (not 24h)
      max: 10000, // Increased maximum sessions
      ttl: 7 * 24 * 60 * 60 * 1000, // 7 days TTL (matches cookie maxAge)
      dispose: (key, value) => {
        // Reduce noise in logs - only log in development and less frequently
        if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
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
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days - longer session life
    sameSite: 'lax', // Prevents CSRF while allowing normal navigation
    httpOnly: true, // Prevents client-side JS from accessing the cookie
    path: '/' // Makes cookie available for all routes
  },
  rolling: true, // Refresh session with each request to prevent expiration
  name: 'threadcraft.session' // Custom session name
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

// Import API routes
import catalogOptionsRoutes from './routes/api/catalogOptionsRoutes';
import catalogRoutes from './routes/api/catalogRoutes';
import customerRoutes from './routes/api/customerRoutes';
import imageRoutes from './routes/api/imageRoutes';
import invitationRoutes from './routes/api/invitationRoutes';
import userRolesRoutes from './routes/api/userRolesRoutes';
import authRoutes from './routes/api/authRoutes';
import healthRoutes from './routes/health';

(async () => {
  try {
    console.log('\n🚀 === THREADCRAFT APPLICATION STARTUP ===');
    console.log(`📅 Startup Time: ${new Date().toISOString()}`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔧 Node Version: ${process.version}`);
    console.log(`💻 Platform: ${process.platform}`);

    // Environment Variable Check
    console.log('\n🔍 ENVIRONMENT VARIABLES CHECK:');
    const requiredEnvVars = [
      'SUPABASE_URL',
      'SUPABASE_ANON_KEY', 
      'DATABASE_URL'
    ];

    const optionalEnvVars = [
      'SUPABASE_SERVICE_KEY',
      'SESSION_SECRET',
      'SENDGRID_API_KEY'
    ];

    let missingRequired = [];
    let missingOptional = [];

    requiredEnvVars.forEach(varName => {
      const isSet = !!process.env[varName];
      console.log(`   ${isSet ? '✅' : '❌'} ${varName}: ${isSet ? 'Set' : 'MISSING'}`);
      if (!isSet) missingRequired.push(varName);
    });

    optionalEnvVars.forEach(varName => {
      const isSet = !!process.env[varName];
      console.log(`   ${isSet ? '✅' : '⚠️'} ${varName}: ${isSet ? 'Set' : 'Missing (optional)'}`);
      if (!isSet) missingOptional.push(varName);
    });

    if (missingRequired.length > 0) {
      console.error('\n💀 CRITICAL: Missing required environment variables:');
      missingRequired.forEach(varName => {
        console.error(`   - ${varName}`);
      });
      console.error('Application cannot start without these variables. Check your .env file or Replit secrets.');
      process.exit(1);
    }

    if (missingOptional.length > 0) {
      console.warn('\n⚠️ WARNING: Missing optional environment variables:');
      missingOptional.forEach(varName => {
        console.warn(`   - ${varName}`);
      });
      console.warn('Some features may be disabled without these variables.');
    }

    // Verify Supabase connection
    console.log("\n🗄️ CHECKING DATABASE INITIALIZATION...");
    const connected = await testSupabaseConnection();

    if (!connected) {
      console.error("\n❌ SUPABASE CONNECTION FAILED");
      console.error("🔧 IMMEDIATE ACTIONS REQUIRED:");
      console.error("   1. Check if Supabase project is active and accessible");
      console.error("   2. Verify environment variables are correct");
      console.error("   3. Check database schema is properly set up");
      console.error("   4. Verify Row Level Security policies");
      console.error("\n⚠️ Will continue startup but database operations may fail");
    } else {
      console.log("✅ Supabase connection verified successfully");
    }

    // Create HTTP server
    const server = createServer(app);

    // Register health and auth routes first (no auth required for these)
    app.use('/api', healthRoutes);
    app.use('/api/auth', authRoutes);

    // Add authentication middleware for protected routes
    app.use('/api/catalog-options', authenticateRequest);
    app.use('/api/catalog', authenticateRequest);
    app.use('/api/customers', authenticateRequest);
    app.use('/api/images', authenticateRequest);
    app.use('/api/invitations', authenticateRequest);
    app.use('/api/users', authenticateRequest);

    // Register protected API routes
    app.use('/api/catalog-options', catalogOptionsRoutes);
    app.use('/api/catalog', catalogRoutes);
    app.use('/api/customers', customerRoutes);
    app.use('/api/images', imageRoutes);
    app.use('/api/invitations', invitationRoutes);
    app.use('/api/users', userRolesRoutes);

    // Serve uploaded images
    app.use('/uploads', express.static('uploads'));

    // 404 handler for API routes
    app.use('/api/*', notFoundHandler);

    // Global error handling middleware
    app.use(globalErrorHandler);

    // Static file serving and client-side routing should come AFTER all API routes
    if (process.env.NODE_ENV === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // ALWAYS serve the app on port 5000
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    const port = 5000;
    const httpServer = server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      log(`serving on port ${port}`);
    });

    // Graceful shutdown for scaling events
    const shutdown = async (signal: string) => {
      console.log(`${signal} received, shutting down gracefully`);
      httpServer.close(() => {
        console.log('HTTP server closed');
        closeConnections().then(() => {
          process.exit(0);
        });
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    console.error("Failed to start application:", error);
    process.exit(1);
  }
})();
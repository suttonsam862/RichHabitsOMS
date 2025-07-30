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
import { globalErrorHandler, notFoundHandler, centralizedExceptionLogger } from "./middleware/errorHandler";
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

// Configure trust proxy for Replit environment
app.set('trust proxy', 1);

// Add host validation middleware for Replit
app.use((req, res, next) => {
  // Allow all requests in development or if no host restrictions needed
  if (process.env.NODE_ENV === 'development') {
    return next();
  }

  const host = req.get('host');
  const origin = req.get('origin');

  // Allow localhost and Replit domains
  if (host && (
    host.includes('localhost') ||
    host.includes('.replit.dev') ||
    host.includes('.repl.co')
  )) {
    return next();
  }

  // If we have a Replit domain in environment, allow it
  if (process.env.REPLIT_DEV_DOMAIN && host && host.includes(process.env.REPLIT_DEV_DOMAIN)) {
    return next();
  }

  next();
});

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

// Add centralized exception logger middleware to capture all exceptions and request bodies
app.use(centralizedExceptionLogger);

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

// Enhanced request logging middleware for all API routes
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  // Log all incoming API requests immediately
  if (path.startsWith("/api")) {
    console.log(`🌐 API Request: ${req.method} ${path} - ${new Date().toISOString()}`);
    
    // Log request body for POST/PUT/PATCH requests (but not for auth routes for security)
    if (['POST', 'PUT', 'PATCH'].includes(req.method) && !path.includes('/auth/')) {
      console.log(`📦 Request Body:`, JSON.stringify(req.body, null, 2));
    }
  }

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
      const duration = Date.now() - start;
      if (path.startsWith("/api")) {
        // Log all API responses with status and timing
        console.log(`📊 API Response: ${req.method} ${path} → ${res.statusCode} (${duration}ms)`);
        
        // Log response body for errors or in development mode
        if (capturedJsonResponse && (res.statusCode >= 400 || process.env.NODE_ENV === 'development')) {
          console.log(`📋 Response Body:`, JSON.stringify(capturedJsonResponse, null, 2));
        }

        // Reduce noise from expected failures in legacy logging
        if (
          (path === '/api/auth/me' && res.statusCode === 401) ||
          (path.includes('/api/') && res.statusCode === 401) ||
          (path.includes('/api/') && res.statusCode === 403) ||
          res.statusCode === 404
        ) {
          return; // Don't log expected failures to legacy system
        }

        // Only log errors and successful operations in development to legacy system
        if (process.env.NODE_ENV === 'development' && (res.statusCode >= 500 || res.statusCode < 400)) {
          let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
          if (capturedJsonResponse && res.statusCode >= 400) {
            logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
          }

          if (logLine.length > 80) {
            logLine = logLine.slice(0, 79) + "…";
          }

          log(logLine);
        }
      }
    });

  next();
});

// Import API routes
import catalogOptionsRoutes from './routes/api/catalogOptionsRoutes';
import fabricOptionsRoutes from './routes/api/fabricOptionsRoutes';
import catalogRoutes from './routes/api/catalogRoutes';
// import catalogImageRoutes from './routes/api/catalogImageRoutes'; // Removed - using Supabase Storage only
import imageReorderRoutes from './routes/api/imageReorderRoutes';
import imageAccessRoutes from './routes/api/imageAccessRoutes';
import customerRoutes from './routes/api/customerRoutes';
import dashboardRoutes from './routes/api/dashboardRoutes';
import orderRoutes from './routes/api/orderRoutes';
// import orderImageRoutes from './routes/api/orderImageRoutes'; // Removed - using Supabase Storage only
import storageCleanupRoutes from './routes/api/storageCleanupRoutes';
import organizationRoutes from './routes/api/organizationRoutes';
// import unifiedImageRoutes from './routes/api/unifiedImageRoutes'; // Removed - using Supabase Storage only
import invitationRoutes from './routes/api/invitationRoutes';
import userManagementRoutes from './routes/api/userManagementRoutes';
import securityRoutes from './routes/api/securityRoutes';
import userRolesRoutes from './routes/api/userRolesRoutes';
import authRoutes from './routes/api/authRoutes';
// import imageVariantsRoutes from './routes/api/imageVariantsRoutes'; // Removed - using Supabase Storage only
import enhancedOrderRoutes from './routes/api/enhancedOrderRoutes';
import messageRoutes from './routes/api/messageRoutes';

import healthRoutes from './routes/health';
import manufacturingRoutes, { 
  getManufacturingStats, 
  getDesignTasks, 
  getProductionTasks, 
  getManufacturingQueue,
  getManufacturers,
  createManufacturer,
  updateManufacturer,
  getUserManufacturers
} from './routes/api/manufacturingRoutes';
// import { uploadMiddleware, uploadManufacturerMedia, getManufacturerMedia, deleteManufacturerMedia } from './routes/api/manufacturerMediaRoutes'; // Removed - using Supabase Storage only

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

    let missingRequired: string[] = [];
    let missingOptional: string[] = [];

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
    app.use('/api/fabric-options', authenticateRequest);
    app.use('/api/catalog', authenticateRequest);
    app.use('/api/customers', authenticateRequest);
    app.use('/api/manufacturing', authenticateRequest);
    app.use('/api/users', authenticateRequest);
    app.use('/api/design-tasks', authenticateRequest);
    app.use('/api/production-tasks', authenticateRequest);
    app.use('/api/images-unified', authenticateRequest);
    app.use('/api/images/access', authenticateRequest);
    app.use('/api/invitations', authenticateRequest);
    app.use('/api/user-management', authenticateRequest);
    app.use('/api/users', authenticateRequest);
    app.use('/api/messages', authenticateRequest);
    app.use('/api/storage-cleanup', authenticateRequest);
    app.use('/api/upload-test', authenticateRequest);

    // Register protected API routes
    app.use('/api/catalog-options', catalogOptionsRoutes);
    app.use('/api/fabric-options', fabricOptionsRoutes);
    app.use('/api/catalog', catalogRoutes);
    // app.use('/api/catalog', catalogImageRoutes); // Removed - using Supabase Storage only
    app.use('/api', imageReorderRoutes);
    app.use('/api/customers', customerRoutes);
    app.use('/api/dashboard', dashboardRoutes);
    app.use('/api/orders', orderRoutes);
    // app.use('/api/orders', orderImageRoutes); // Removed - using Supabase Storage only
    app.use('/api/organizations', organizationRoutes);
    // app.use('/api/images-unified', unifiedImageRoutes); // Removed - using Supabase Storage only
    app.use('/api/images/access', imageAccessRoutes); // Image access and temporary links
    // app.use('/api', imageVariantsRoutes); // Removed - using Supabase Storage only
    app.use('/api', enhancedOrderRoutes); // Enhanced order management routes
    app.use('/api/invitations', invitationRoutes);
    app.use('/api/user-management', userManagementRoutes);
app.use('/api/security', securityRoutes);
    app.use('/api/user-roles', userRolesRoutes);
app.use('/api/users', userManagementRoutes);
    app.use('/api/messages', messageRoutes);

    app.use('/api/manufacturing', manufacturingRoutes);
    app.use('/api/storage-cleanup', storageCleanupRoutes);

    // Manufacturing Management API endpoints (individual handlers for compatibility)
    app.get('/api/manufacturing/stats', getManufacturingStats);
    app.get('/api/manufacturing/manufacturers', getManufacturers);
    app.post('/api/manufacturing/manufacturers', createManufacturer);
    app.patch('/api/manufacturing/manufacturers/:id', updateManufacturer);
    app.get('/api/users/manufacturers', getUserManufacturers);
    
    // Manufacturer media routes removed - using Supabase Storage only
    app.get('/api/design-tasks', getDesignTasks);
    app.get('/api/production-tasks', getProductionTasks);
    app.get('/api/manufacturing/queue', getManufacturingQueue);

    // Dashboard stats endpoint - Critical fix for 404 error
    app.get('/api/dashboard/stats', authenticateRequest, async (req: Request, res: Response) => {
      try {
        console.log('📊 Fetching dashboard statistics...');

        // Get comprehensive dashboard statistics
        const { data: users, error: usersError } = await supabase
          .from('user_profiles')
          .select('id, role, created_at');

        if (usersError) {
          console.error('Error fetching users:', usersError);
          return res.status(500).json({
            success: false,
            error: 'Failed to fetch user statistics'
          });
        }

        // Get catalog statistics
        const { data: catalogItems, error: catalogError } = await supabase
          .from('catalog_items')
          .select('id, created_at');

        // Get order statistics  
        const { data: orders, error: ordersError } = await supabase
          .from('orders')
          .select('id, status, created_at');

        // Calculate statistics
        const totalUsers = users?.length || 0;
        const customersTotal = users?.filter(u => u.role === 'customer').length || 0;
        const adminUsers = users?.filter(u => u.role === 'admin').length || 0;
        const staffUsers = users?.filter(u => ['salesperson', 'designer', 'manufacturer'].includes(u.role as string)).length || 0;
        const totalCatalogItems = catalogItems?.length || 0;
        const totalOrders = orders?.length || 0;
        const activeOrders = orders?.filter(o => ['draft', 'design', 'production'].includes(o.status as string)).length || 0;

        const dashboardStats = {
          users: totalUsers,
          analytics: {
            totalUsers,
            customersTotal,
            authAccountsTotal: totalUsers,
            needsAccountCreation: 0,
            activeAccounts: totalUsers,
            adminUsers,
            customerUsers: customersTotal,
            staffUsers,
            totalCatalogItems,
            totalOrders,
            activeOrders
          }
        };

        console.log('Dashboard stats generated:', dashboardStats);

        res.json(dashboardStats);
      } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to generate dashboard statistics'
        });
      }
    });

    // Serve uploaded images
    app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
      maxAge: '1d',
      etag: false,
      lastModified: false
    }));

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
      console.log('\n🎉 === THREADCRAFT SERVER READY ===');
      console.log(`📅 Server Started: ${new Date().toISOString()}`);
      console.log(`🌐 Listening on: http://0.0.0.0:${port}`);
      console.log(`🔗 Health Check: http://0.0.0.0:${port}/api/health`);
      console.log(`✅ All routes registered and ready for requests`);
      console.log('=== SERVER STARTUP COMPLETE ===\n');
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
import express from 'express';
import cors from 'cors';
import session from 'express-session';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { setupVite } from './vite.js';
import { registerRoutes } from './routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  const app = express();
  const port = parseInt(process.env.PORT || '5000', 10);

  // Apply CORS middleware
  app.use(cors({
    origin: true,
    credentials: true,
  }));

  // Configure session middleware
  app.use(session({
    secret: process.env.SESSION_SECRET || 'threadcraft-fallback-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { 
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      httpOnly: true
    }
  }));

  // Parse JSON and urlencoded data
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Create HTTP server
  const server = createServer(app);

  // Set up Vite development server or static file serving
  await setupVite(app, server);

  // Register API routes
  registerRoutes(app);

  // Start the server
  server.listen(port, '0.0.0.0', () => {
    console.log(`🎉 === THREADCRAFT SERVER READY ===`);
    console.log(`📅 Server Started: ${new Date().toISOString()}`);
    console.log(`🌐 Listening on: http://0.0.0.0:${port}`);
    console.log(`🔗 Health Check: http://0.0.0.0:${port}/api/health`);
    console.log(`✅ All routes registered and ready for requests`);
    console.log(`=== SERVER STARTUP COMPLETE ===`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    server.close(() => {
      console.log('Process terminated');
    });
  });
}

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
import { Router, Request, Response } from 'express';
import { testSupabaseConnection } from '../db';

const router = Router();

// Health check endpoint for load balancers
router.get('/health', async (req: Request, res: Response) => {
  try {
    // Quick health check without waiting for slow database operations
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    };

    // Don't block health check on database - check asynchronously
    setTimeout(async () => {
      try {
        const dbConnected = await testSupabaseConnection();
        console.log(`Database status: ${dbConnected ? 'connected' : 'disconnected'}`);
      } catch (error) {
        console.log('Database health check failed:', error);
      }
    }, 0);

    res.json(health);
  } catch (error) {
    console.error('Health check error:', error);
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      note: 'Basic health check passed'
    });
  }
});

// Readiness check for Kubernetes-style deployments
router.get('/ready', async (req: Request, res: Response) => {
  try {
    const dbConnected = await testSupabaseConnection();
    if (dbConnected) {
      res.status(200).json({ status: 'ready' });
    } else {
      res.status(503).json({ status: 'not ready', reason: 'database disconnected' });
    }
  } catch (error) {
    res.status(503).json({ 
      status: 'not ready', 
      reason: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Root health check for deployment
router.get('/', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    message: 'ThreadCraft API is running',
    timestamp: new Date().toISOString()
  });
});

export default router;
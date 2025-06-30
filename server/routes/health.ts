import { Router, Request, Response } from 'express';
import { testSupabaseConnection } from '../db';

const router = Router();

// Health check endpoint for load balancers
router.get('/health', async (req: Request, res: Response) => {
  try {
    const dbConnected = await testSupabaseConnection();

    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: dbConnected ? 'connected' : 'disconnected',
      memory: process.memoryUsage(),
      version: process.env.npm_package_version || '1.0.0'
    };

    if (!dbConnected) {
      return res.status(503).json({ ...health, status: 'degraded' });
    }

    res.json(health);
  } catch (error) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
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
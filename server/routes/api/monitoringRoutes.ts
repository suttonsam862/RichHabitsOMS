
import { Router, Request, Response } from 'express';
import SystemMonitor from '../../monitoring/SystemMonitor.js';
import SecurityMonitor from '../../monitoring/SecurityMonitor.js';
import { requireAuth, requireRole } from '../auth/auth.js';

const router = Router();
const systemMonitor = SystemMonitor.getInstance();
const securityMonitor = SecurityMonitor.getInstance();

// System health endpoint (public for load balancer health checks)
router.get('/health', async (req: Request, res: Response) => {
  try {
    const health = systemMonitor.getSystemHealth();
    
    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    console.error('Error getting system health:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get system health',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Performance metrics endpoint
router.get('/metrics', requireAuth, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const hours = parseInt(req.query.hours as string) || 24;
    const metrics = systemMonitor.getPerformanceMetrics(hours);
    
    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('Error getting performance metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get performance metrics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// System alerts endpoint
router.get('/alerts', requireAuth, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const alerts = systemMonitor.getActiveAlerts();
    
    res.json({
      success: true,
      data: alerts
    });
  } catch (error) {
    console.error('Error getting system alerts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get system alerts',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Resolve alert endpoint
router.post('/alerts/:alertId/resolve', requireAuth, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const { alertId } = req.params;
    const resolved = systemMonitor.resolveAlert(alertId);
    
    if (resolved) {
      res.json({
        success: true,
        message: 'Alert resolved successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }
  } catch (error) {
    console.error('Error resolving alert:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resolve alert',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Security alerts endpoint
router.get('/security/alerts', requireAuth, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const alerts = securityMonitor.getSecurityAlerts(limit);
    
    res.json({
      success: true,
      data: alerts
    });
  } catch (error) {
    console.error('Error getting security alerts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get security alerts',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Threat intelligence endpoint
router.get('/security/threats', requireAuth, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const intelligence = securityMonitor.getThreatIntelligence();
    
    res.json({
      success: true,
      data: intelligence
    });
  } catch (error) {
    console.error('Error getting threat intelligence:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get threat intelligence',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Access patterns endpoint
router.get('/security/patterns', requireAuth, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const { userId, ipAddress, hours } = req.query;
    const patterns = securityMonitor.getAccessPatterns(
      userId as string,
      ipAddress as string,
      parseInt(hours as string) || 24
    );
    
    res.json({
      success: true,
      data: patterns
    });
  } catch (error) {
    console.error('Error getting access patterns:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get access patterns',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Block IP endpoint
router.post('/security/block-ip', requireAuth, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const { ipAddress, reason } = req.body;
    
    if (!ipAddress || !reason) {
      return res.status(400).json({
        success: false,
        message: 'IP address and reason are required'
      });
    }
    
    securityMonitor.blockIpAddress(ipAddress, reason);
    
    res.json({
      success: true,
      message: 'IP address blocked successfully'
    });
  } catch (error) {
    console.error('Error blocking IP address:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to block IP address',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;

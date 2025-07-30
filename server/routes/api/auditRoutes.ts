import { Router } from 'express';
import { requireAuth } from '../auth/auth.js';
import { OrderAuditLogger } from '../../services/auditLogger.js';
import { z } from 'zod';

const router = Router();

// Validation schemas
const getAuditHistorySchema = z.object({
  orderId: z.string().uuid(),
  limit: z.coerce.number().min(1).max(500).optional().default(50)
});

const getRecentActivitySchema = z.object({
  orderIds: z.array(z.string().uuid()).optional(),
  hoursBack: z.coerce.number().min(1).max(168).optional().default(24), // Max 1 week
  limit: z.coerce.number().min(1).max(200).optional().default(100)
});

/**
 * GET /api/audit/orders/:orderId/history
 * Get audit history for a specific order
 */
router.get('/orders/:orderId/history', requireAuth, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { limit } = getAuditHistorySchema.parse({
      orderId,
      limit: req.query.limit
    });

    const auditHistory = await OrderAuditLogger.getOrderAuditHistory(orderId, limit);
    
    // Transform data for frontend
    const formattedHistory = auditHistory.map((entry: any) => ({
      id: entry.id,
      orderId: entry.orderId,
      userId: entry.userId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      fieldName: entry.fieldName,
      oldValue: entry.oldValue,
      newValue: entry.newValue,
      changesSummary: entry.changesSummary,
      metadata: entry.metadata,
      timestamp: entry.timestamp.toISOString(),
      createdAt: entry.createdAt.toISOString()
    }));

    res.status(200).json({
      success: true,
      data: formattedHistory,
      totalEntries: formattedHistory.length,
      orderId
    });

  } catch (error) {
    console.error('Failed to fetch audit history:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to fetch audit history',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/audit/orders/:orderId/stats
 * Get audit statistics for a specific order
 */
router.get('/orders/:orderId/stats', requireAuth, async (req, res) => {
  try {
    const { orderId } = req.params;
    
    if (!orderId || typeof orderId !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Valid order ID is required'
      });
    }

    const stats = await OrderAuditLogger.getOrderAuditStats(orderId);

    res.status(200).json({
      success: true,
      data: {
        ...stats,
        lastActivity: stats.lastActivity?.toISOString() || null
      },
      orderId
    });

  } catch (error) {
    console.error('Failed to fetch audit stats:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to fetch audit statistics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/audit/recent-activity
 * Get recent audit activity across orders
 */
router.get('/recent-activity', requireAuth, async (req, res) => {
  try {
    const { orderIds, hoursBack, limit } = getRecentActivitySchema.parse({
      orderIds: req.query.orderIds ? JSON.parse(req.query.orderIds as string) : undefined,
      hoursBack: req.query.hoursBack,
      limit: req.query.limit
    });

    // If no orderIds provided, get recent activity for all orders the user has access to
    const finalOrderIds = orderIds || [];
    
    const recentActivity = await OrderAuditLogger.getRecentActivity(finalOrderIds, hoursBack, limit);
    
    // Transform data for frontend
    const formattedActivity = recentActivity.map((entry: any) => ({
      id: entry.id,
      orderId: entry.orderId,
      userId: entry.userId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      fieldName: entry.fieldName,
      oldValue: entry.oldValue,
      newValue: entry.newValue,
      changesSummary: entry.changesSummary,
      metadata: entry.metadata,
      timestamp: entry.timestamp.toISOString(),
      createdAt: entry.createdAt.toISOString()
    }));

    res.status(200).json({
      success: true,
      data: formattedActivity,
      totalEntries: formattedActivity.length,
      filters: { orderIds: finalOrderIds, hoursBack, limit }
    });

  } catch (error) {
    console.error('Failed to fetch recent activity:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to fetch recent activity',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/audit/manual-entry
 * Create manual audit entry (for admin use)
 */
router.post('/manual-entry', requireAuth, async (req, res) => {
  try {
    // Only allow admins to create manual entries
    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can create manual audit entries'
      });
    }

    const {
      orderId,
      action,
      entityType,
      entityId,
      fieldName,
      oldValue,
      newValue,
      changesSummary,
      metadata
    } = req.body;

    const auditEntry = await OrderAuditLogger.logChange({
      orderId,
      userId: req.user.id,
      action,
      entityType,
      entityId,
      fieldName,
      oldValue,
      newValue,
      changesSummary,
      metadata: {
        ...metadata,
        manualEntry: true,
        createdBy: req.user.id,
        userAgent: req.get('User-Agent'),
        ip: req.ip
      }
    });

    res.status(201).json({
      success: true,
      data: auditEntry,
      message: 'Manual audit entry created successfully'
    });

  } catch (error) {
    console.error('Failed to create manual audit entry:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to create manual audit entry',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
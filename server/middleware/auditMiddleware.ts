import { Request, Response, NextFunction } from 'express';
import { OrderAuditLogger } from '../services/auditLogger.js';
import { AUDIT_ACTIONS } from '../models/orderAuditLog.js';

// Interface for audit context
interface AuditContext {
  orderId?: string;
  userId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, any>;
}

// Extend Request interface to include audit context
declare global {
  namespace Express {
    interface Request {
      auditContext?: AuditContext;
    }
  }
}

/**
 * Middleware to set up audit context for tracking changes
 */
export function setupAuditContext(options: {
  action?: string;
  entityType?: string;
  extractOrderId?: (req: Request) => string | undefined;
}) {
  return (req: Request, res: Response, next: NextFunction) => {
    req.auditContext = {
      userId: req.user?.id,
      action: options.action,
      entityType: options.entityType,
      orderId: options.extractOrderId ? options.extractOrderId(req) : req.params.orderId || req.params.id,
      metadata: {
        method: req.method,
        path: req.path,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        query: req.query,
        timestamp: new Date().toISOString()
      }
    };
    next();
  };
}

/**
 * Middleware to automatically log audit entries after successful operations
 */
export function auditAfterResponse(options: {
  action: string;
  entityType?: string;
  getChangesSummary?: (req: Request, res: Response) => string;
  extractEntityId?: (req: Request, res: Response) => string | undefined;
  extractChanges?: (req: Request, res: Response) => { oldValue?: any; newValue?: any; fieldName?: string };
}) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Store original send function
    const originalSend = res.send;

    // Override send to capture response and log audit entry
    res.send = function(body: any) {
      // Only log if response was successful (2xx status codes)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const auditContext = req.auditContext;
        
        if (auditContext?.orderId && auditContext?.userId) {
          // Extract changes if function provided
          const changes = options.extractChanges ? options.extractChanges(req, res) : {};
          
          // Log the audit entry
          OrderAuditLogger.logChange({
            orderId: auditContext.orderId,
            userId: auditContext.userId,
            action: options.action as any,
            entityType: options.entityType || auditContext.entityType || 'order',
            entityId: options.extractEntityId ? options.extractEntityId(req, res) : auditContext.entityId,
            changesSummary: options.getChangesSummary ? options.getChangesSummary(req, res) : undefined,
            metadata: {
              ...auditContext.metadata,
              responseStatus: res.statusCode,
              responseTime: Date.now() - (auditContext.metadata?.startTime || Date.now())
            },
            ...changes
          }).catch(error => {
            console.error('Failed to log audit entry:', error);
          });
        }
      }

      // Call original send function
      return originalSend.call(this, body);
    };

    next();
  };
}

/**
 * Helper function to manually log audit entries within route handlers
 */
export async function logAuditEntry(req: Request, options: {
  action: string;
  orderId?: string;
  entityType?: string;
  entityId?: string;
  fieldName?: string;
  oldValue?: any;
  newValue?: any;
  changesSummary?: string;
  additionalMetadata?: Record<string, any>;
}) {
  const auditContext = req.auditContext;
  
  return OrderAuditLogger.logChange({
    orderId: options.orderId || auditContext?.orderId || '',
    userId: auditContext?.userId || req.user?.id,
    action: options.action as any,
    entityType: options.entityType || auditContext?.entityType || 'order',
    entityId: options.entityId || auditContext?.entityId,
    fieldName: options.fieldName,
    oldValue: options.oldValue,
    newValue: options.newValue,
    changesSummary: options.changesSummary,
    metadata: {
      ...auditContext?.metadata,
      ...options.additionalMetadata
    }
  });
}

/**
 * Middleware specifically for order operations
 */
export const auditOrderOperation = (action: string, getChangesSummary?: (req: Request) => string) => {
  return setupAuditContext({
    action,
    entityType: 'order',
    extractOrderId: (req) => req.params.orderId || req.params.id || req.body?.orderId
  });
};
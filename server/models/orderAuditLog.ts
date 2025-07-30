import { pgTable, uuid, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

export const orderAuditLog = pgTable('order_audit_log', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').notNull(),
  userId: uuid('user_id'), // User who made the change
  action: text('action').notNull(), // CREATE, UPDATE, DELETE, STATUS_CHANGE, ASSIGN, etc.
  entityType: text('entity_type').notNull(), // order, order_item, assignment, etc.
  entityId: uuid('entity_id'), // ID of the specific entity changed
  fieldName: text('field_name'), // Specific field that changed
  oldValue: jsonb('old_value'), // Previous value
  newValue: jsonb('new_value'), // New value
  changesSummary: text('changes_summary'), // Human-readable summary
  metadata: jsonb('metadata'), // Additional context (IP, user agent, etc.)
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  orderIdIdx: index('idx_audit_order_id').on(table.orderId),
  userIdIdx: index('idx_audit_user_id').on(table.userId),
  actionIdx: index('idx_audit_action').on(table.action),
  timestampIdx: index('idx_audit_timestamp').on(table.timestamp),
  entityIdx: index('idx_audit_entity').on(table.entityType, table.entityId)
}));

// Zod schemas for validation
export const insertOrderAuditLogSchema = createInsertSchema(orderAuditLog).omit({
  id: true,
  createdAt: true,
  timestamp: true
});

export const selectOrderAuditLogSchema = z.object({
  id: z.string().uuid(),
  orderId: z.string().uuid(),
  userId: z.string().uuid().nullable(),
  action: z.string(),
  entityType: z.string(),
  entityId: z.string().uuid().nullable(),
  fieldName: z.string().nullable(),
  oldValue: z.any().nullable(),
  newValue: z.any().nullable(),
  changesSummary: z.string().nullable(),
  metadata: z.any().nullable(),
  timestamp: z.date(),
  createdAt: z.date()
});

// Types
export type InsertOrderAuditLog = z.infer<typeof insertOrderAuditLogSchema>;
export type SelectOrderAuditLog = z.infer<typeof selectOrderAuditLogSchema>;

// Common audit actions
export const AUDIT_ACTIONS = {
  // Order actions
  ORDER_CREATED: 'ORDER_CREATED',
  ORDER_UPDATED: 'ORDER_UPDATED',
  ORDER_DELETED: 'ORDER_DELETED',
  STATUS_CHANGED: 'STATUS_CHANGED',
  PRIORITY_CHANGED: 'PRIORITY_CHANGED',
  
  // Assignment actions
  DESIGNER_ASSIGNED: 'DESIGNER_ASSIGNED',
  DESIGNER_UNASSIGNED: 'DESIGNER_UNASSIGNED',
  MANUFACTURER_ASSIGNED: 'MANUFACTURER_ASSIGNED',
  MANUFACTURER_UNASSIGNED: 'MANUFACTURER_UNASSIGNED',
  SALESPERSON_ASSIGNED: 'SALESPERSON_ASSIGNED',
  
  // Item actions
  ITEM_ADDED: 'ITEM_ADDED',
  ITEM_UPDATED: 'ITEM_UPDATED',
  ITEM_REMOVED: 'ITEM_REMOVED',
  
  // Customer actions
  CUSTOMER_UPDATED: 'CUSTOMER_UPDATED',
  NOTES_UPDATED: 'NOTES_UPDATED',
  
  // Production actions
  PRODUCTION_STARTED: 'PRODUCTION_STARTED',
  PRODUCTION_COMPLETED: 'PRODUCTION_COMPLETED',
  QUALITY_CHECK_PASSED: 'QUALITY_CHECK_PASSED',
  QUALITY_CHECK_FAILED: 'QUALITY_CHECK_FAILED',
  
  // Delivery actions
  SHIPPED: 'SHIPPED',
  DELIVERED: 'DELIVERED',
  
  // Payment actions
  PAYMENT_RECEIVED: 'PAYMENT_RECEIVED',
  REFUND_ISSUED: 'REFUND_ISSUED',
  
  // File actions
  FILE_UPLOADED: 'FILE_UPLOADED',
  FILE_DELETED: 'FILE_DELETED',
  
  // Communication actions
  MESSAGE_SENT: 'MESSAGE_SENT',
  EMAIL_SENT: 'EMAIL_SENT'
} as const;

export type AuditAction = typeof AUDIT_ACTIONS[keyof typeof AUDIT_ACTIONS];
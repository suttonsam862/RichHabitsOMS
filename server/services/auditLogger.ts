import { createClient } from '@supabase/supabase-js';
import { orderAuditLog, InsertOrderAuditLog, AUDIT_ACTIONS, AuditAction } from '../models/orderAuditLog.js';
// Create Supabase client for audit operations
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export class OrderAuditLogger {
  /**
   * Log an audit entry for order changes
   */
  static async logChange({
    orderId,
    userId,
    action,
    entityType = 'order',
    entityId,
    fieldName,
    oldValue,
    newValue,
    changesSummary,
    metadata = {}
  }: {
    orderId: string;
    userId?: string;
    action: AuditAction;
    entityType?: string;
    entityId?: string;
    fieldName?: string;
    oldValue?: any;
    newValue?: any;
    changesSummary?: string;
    metadata?: Record<string, any>;
  }) {
    try {
      const auditEntry = {
        order_id: orderId,
        user_id: userId || null,
        action,
        entity_type: entityType,
        entity_id: entityId || null,
        field_name: fieldName || null,
        old_value: oldValue !== undefined ? oldValue : null,
        new_value: newValue !== undefined ? newValue : null,
        changes_summary: changesSummary || null,
        metadata: Object.keys(metadata).length > 0 ? metadata : null
      };

      const { data: result, error } = await supabase
        .from('order_audit_log')
        .insert(auditEntry)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    } catch (error) {
      console.error('Failed to log audit entry:', error);
      // Don't throw error to avoid breaking the main operation
      return null;
    }
  }

  /**
   * Log order status change
   */
  static async logStatusChange(orderId: string, userId: string, oldStatus: string, newStatus: string, reason?: string) {
    return this.logChange({
      orderId,
      userId,
      action: AUDIT_ACTIONS.STATUS_CHANGED,
      fieldName: 'status',
      oldValue: oldStatus,
      newValue: newStatus,
      changesSummary: `Order status changed from "${oldStatus}" to "${newStatus}"${reason ? ` - ${reason}` : ''}`,
      metadata: { reason }
    });
  }

  /**
   * Log assignment changes
   */
  static async logAssignment(orderId: string, userId: string, assignmentType: 'designer' | 'manufacturer' | 'salesperson', assigneeId: string, assigneeName: string, isUnassignment = false) {
    const action = isUnassignment 
      ? (assignmentType === 'designer' ? AUDIT_ACTIONS.DESIGNER_UNASSIGNED : 
         assignmentType === 'manufacturer' ? AUDIT_ACTIONS.MANUFACTURER_UNASSIGNED :
         AUDIT_ACTIONS.SALESPERSON_ASSIGNED)
      : (assignmentType === 'designer' ? AUDIT_ACTIONS.DESIGNER_ASSIGNED : 
         assignmentType === 'manufacturer' ? AUDIT_ACTIONS.MANUFACTURER_ASSIGNED :
         AUDIT_ACTIONS.SALESPERSON_ASSIGNED);

    return this.logChange({
      orderId,
      userId,
      action,
      fieldName: `assigned_${assignmentType}_id`,
      oldValue: isUnassignment ? assigneeId : null,
      newValue: isUnassignment ? null : assigneeId,
      changesSummary: `${assignmentType.charAt(0).toUpperCase() + assignmentType.slice(1)} ${isUnassignment ? 'unassigned' : 'assigned'}: ${assigneeName}`,
      metadata: { assigneeId, assigneeName, assignmentType }
    });
  }

  /**
   * Log order item changes
   */
  static async logItemChange(orderId: string, userId: string, action: 'added' | 'updated' | 'removed', itemData: any, oldItemData?: any) {
    const auditAction = action === 'added' ? AUDIT_ACTIONS.ITEM_ADDED :
                       action === 'updated' ? AUDIT_ACTIONS.ITEM_UPDATED :
                       AUDIT_ACTIONS.ITEM_REMOVED;

    return this.logChange({
      orderId,
      userId,
      action: auditAction,
      entityType: 'order_item',
      entityId: itemData.id,
      oldValue: oldItemData,
      newValue: action !== 'removed' ? itemData : null,
      changesSummary: `Order item ${action}: ${itemData.productName || itemData.product_name}`,
      metadata: { itemData, oldItemData }
    });
  }

  /**
   * Log field updates with detailed change tracking
   */
  static async logFieldUpdate(orderId: string, userId: string, fieldName: string, oldValue: any, newValue: any, humanReadableField?: string) {
    const displayField = humanReadableField || fieldName.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').toLowerCase();
    
    return this.logChange({
      orderId,
      userId,
      action: AUDIT_ACTIONS.ORDER_UPDATED,
      fieldName,
      oldValue,
      newValue,
      changesSummary: `${displayField.charAt(0).toUpperCase() + displayField.slice(1)} changed from "${oldValue}" to "${newValue}"`,
      metadata: { fieldName, displayField }
    });
  }

  /**
   * Get audit history for an order
   */
  static async getOrderAuditHistory(orderId: string, limit = 50) {
    try {
      const { data: auditEntries, error } = await supabase
        .from('order_audit_log')
        .select('*')
        .eq('order_id', orderId)
        .order('timestamp', { ascending: false })
        .limit(limit);
      
      if (error) throw error;

      return auditEntries;
    } catch (error) {
      console.error('Failed to fetch audit history:', error);
      return [];
    }
  }

  /**
   * Get recent audit activity for multiple orders
   */
  static async getRecentActivity(orderIds: string[], hoursBack = 24, limit = 100) {
    try {
      const cutoffTime = new Date();
      cutoffTime.setHours(cutoffTime.getHours() - hoursBack);

      const { data: auditEntries, error } = await supabase
        .from('order_audit_log')
        .select('*')
        .gte('timestamp', cutoffTime.toISOString())
        .order('timestamp', { ascending: false })
        .limit(limit);
      
      if (error) throw error;

      // Filter by orderIds if provided
      return auditEntries ? auditEntries.filter((entry: any) => orderIds.length === 0 || orderIds.includes(entry.order_id)) : [];
    } catch (error) {
      console.error('Failed to fetch recent activity:', error);
      return [];
    }
  }

  /**
   * Get audit statistics for an order
   */
  static async getOrderAuditStats(orderId: string) {
    try {
      const auditEntries = await this.getOrderAuditHistory(orderId, 1000);
      
      const stats = {
        totalChanges: auditEntries.length,
        statusChanges: auditEntries.filter((entry: any) => entry.action === AUDIT_ACTIONS.STATUS_CHANGED).length,
        assignments: auditEntries.filter((entry: any) => 
          entry.action.includes('ASSIGNED') || entry.action.includes('UNASSIGNED')
        ).length,
        itemChanges: auditEntries.filter((entry: any) => 
          entry.action.includes('ITEM_')
        ).length,
        lastActivity: auditEntries[0]?.timestamp || null,
        uniqueUsers: [...new Set(auditEntries.map((entry: any) => entry.user_id).filter(Boolean))].length
      };

      return stats;
    } catch (error) {
      console.error('Failed to fetch audit stats:', error);
      return {
        totalChanges: 0,
        statusChanges: 0,
        assignments: 0,
        itemChanges: 0,
        lastActivity: null,
        uniqueUsers: 0
      };
    }
  }

  /**
   * Log bulk changes (for batch operations)
   */
  static async logBulkChanges(changes: Array<Parameters<typeof OrderAuditLogger.logChange>[0]>) {
    try {
      const auditEntries = changes.map(change => ({
        order_id: change.orderId,
        user_id: change.userId || null,
        action: change.action,
        entity_type: change.entityType || 'order',
        entity_id: change.entityId || null,
        field_name: change.fieldName || null,
        old_value: change.oldValue !== undefined ? change.oldValue : null,
        new_value: change.newValue !== undefined ? change.newValue : null,
        changes_summary: change.changesSummary || null,
        metadata: change.metadata && Object.keys(change.metadata).length > 0 ? change.metadata : null
      }));

      const { data: results, error } = await supabase
        .from('order_audit_log')
        .insert(auditEntries)
        .select();
      
      if (error) throw error;
      return results;
    } catch (error) {
      console.error('Failed to log bulk audit entries:', error);
      return [];
    }
  }
}
/**
 * Global Data Synchronization Hook
 * Ensures data consistency across all views by managing cache invalidation and real-time updates
 */
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';

// Define cache keys for consistent invalidation
export const CACHE_KEYS = {
  customers: ['/api/customers'] as string[],
  orders: ['/api/orders'] as string[],
  manufacturers: ['/api/users/manufacturers'] as string[],
  productionTasks: ['/api/production-tasks'] as string[],
  designTasks: ['/api/design-tasks'] as string[],
  catalogItems: ['/api/catalog-items'] as string[],
  messages: ['/api/messages'] as string[],
  users: ['/api/user-management/users'] as string[],
  manufacturingStats: ['/api/manufacturing/stats'] as string[],
  ordersByStatus: (status?: string) => status ? ['/api/orders', { status }] : ['/api/orders'],
  usersByRole: (role: string) => ['/api/user-management/users/role', role],
};

// Event system for cross-component communication
class DataSyncEventBus {
  private events: Map<string, Set<Function>> = new Map();

  emit(event: string, data?: any) {
    const callbacks = this.events.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in data sync event ${event}:`, error);
        }
      });
    }
  }

  on(event: string, callback: Function) {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event)!.add(callback);

    // Return cleanup function
    return () => {
      const callbacks = this.events.get(event);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.events.delete(event);
        }
      }
    };
  }

  once(event: string, callback: Function) {
    const cleanup = this.on(event, (...args: any[]) => {
      callback(...args);
      cleanup();
    });
    return cleanup;
  }
}

export const dataSyncEventBus = new DataSyncEventBus();

// Data sync events
export const DATA_SYNC_EVENTS = {
  CUSTOMER_CREATED: 'customer:created',
  CUSTOMER_UPDATED: 'customer:updated',
  CUSTOMER_DELETED: 'customer:deleted',
  ORDER_CREATED: 'order:created',
  ORDER_UPDATED: 'order:updated',
  ORDER_STATUS_CHANGED: 'order:status_changed',
  ORDER_DELETED: 'order:deleted',
  MANUFACTURER_ASSIGNED: 'manufacturer:assigned',
  PRODUCTION_TASK_CREATED: 'production_task:created',
  PRODUCTION_TASK_UPDATED: 'production_task:updated',
  PRODUCTION_TASK_STATUS_CHANGED: 'production_task:status_changed',
  DESIGN_TASK_CREATED: 'design_task:created',
  DESIGN_TASK_UPDATED: 'design_task:updated',
  USER_CREATED: 'user:created',
  USER_UPDATED: 'user:updated',
  CATALOG_ITEM_CREATED: 'catalog_item:created',
  CATALOG_ITEM_UPDATED: 'catalog_item:updated',
  MESSAGE_SENT: 'message:sent',
  BULK_UPDATE: 'bulk:update',
} as const;

export function useGlobalDataSync() {
  const queryClient = useQueryClient();

  // Invalidate specific cache keys
  const invalidateCache = useCallback(async (keys: (string[] | string)[], immediate = true) => {
    console.log('🔄 Invalidating cache keys:', keys);
    
    try {
      if (immediate) {
        await Promise.all(
          keys.map(key => 
            queryClient.invalidateQueries({ 
              queryKey: Array.isArray(key) ? key : [key],
              exact: false 
            })
          )
        );
      } else {
        // Delayed invalidation for bulk operations
        setTimeout(() => {
          keys.forEach(key => 
            queryClient.invalidateQueries({ 
              queryKey: Array.isArray(key) ? key : [key],
              exact: false 
            })
          );
        }, 100);
      }
    } catch (error) {
      console.error('Error invalidating cache:', error);
    }
  }, [queryClient]);

  // Invalidate all data
  const invalidateAll = useCallback(async () => {
    console.log('🔄 Invalidating all cached data');
    try {
      await queryClient.invalidateQueries();
    } catch (error) {
      console.error('Error invalidating all cache:', error);
    }
  }, [queryClient]);

  // Customer-related sync functions
  const syncCustomers = useCallback(async () => {
    await invalidateCache([CACHE_KEYS.customers]);
  }, [invalidateCache]);

  const handleCustomerChange = useCallback(async (customerId?: string) => {
    await invalidateCache([
      CACHE_KEYS.customers,
      CACHE_KEYS.orders, // Orders include customer data
    ]);
    dataSyncEventBus.emit(DATA_SYNC_EVENTS.CUSTOMER_UPDATED, { customerId });
  }, [invalidateCache]);

  // Order-related sync functions
  const syncOrders = useCallback(async () => {
    await invalidateCache([
      CACHE_KEYS.orders,
      CACHE_KEYS.manufacturingStats,
    ]);
  }, [invalidateCache]);

  const handleOrderChange = useCallback(async (orderId?: string, statusChanged = false) => {
    await invalidateCache([
      CACHE_KEYS.orders,
      CACHE_KEYS.productionTasks, // Tasks are linked to orders
      CACHE_KEYS.designTasks,
      CACHE_KEYS.manufacturingStats,
      CACHE_KEYS.manufacturers, // Workload calculations
    ]);
    
    if (statusChanged) {
      dataSyncEventBus.emit(DATA_SYNC_EVENTS.ORDER_STATUS_CHANGED, { orderId });
    } else {
      dataSyncEventBus.emit(DATA_SYNC_EVENTS.ORDER_UPDATED, { orderId });
    }
  }, [invalidateCache]);

  // Manufacturing-related sync functions
  const syncManufacturing = useCallback(async () => {
    await invalidateCache([
      CACHE_KEYS.manufacturers,
      CACHE_KEYS.productionTasks,
      CACHE_KEYS.manufacturingStats,
    ]);
  }, [invalidateCache]);

  const handleTaskChange = useCallback(async (taskId?: string, taskType: 'production' | 'design' = 'production') => {
    const cacheKeys: string[][] = [
      CACHE_KEYS.manufacturingStats,
      CACHE_KEYS.orders, // Orders show task status
    ];
    
    if (taskType === 'production') {
      cacheKeys.push(CACHE_KEYS.productionTasks, CACHE_KEYS.manufacturers);
      dataSyncEventBus.emit(DATA_SYNC_EVENTS.PRODUCTION_TASK_UPDATED, { taskId });
    } else {
      cacheKeys.push(CACHE_KEYS.designTasks);
      dataSyncEventBus.emit(DATA_SYNC_EVENTS.DESIGN_TASK_UPDATED, { taskId });
    }
    
    await invalidateCache(cacheKeys);
  }, [invalidateCache]);

  // User management sync functions
  const syncUsers = useCallback(async (role?: string) => {
    const cacheKeys: string[][] = [CACHE_KEYS.users];
    
    if (role === 'manufacturer') {
      cacheKeys.push(CACHE_KEYS.manufacturers);
    }
    
    await invalidateCache(cacheKeys);
  }, [invalidateCache]);

  // Catalog sync functions
  const syncCatalog = useCallback(async () => {
    await invalidateCache([CACHE_KEYS.catalogItems]);
  }, [invalidateCache]);

  // Messages sync functions
  const syncMessages = useCallback(async () => {
    await invalidateCache([CACHE_KEYS.messages]);
  }, [invalidateCache]);

  // Bulk operations for better performance
  const handleBulkUpdate = useCallback(async (affectedDataTypes: string[]) => {
    const cacheKeys: string[][] = [];
    
    if (affectedDataTypes.includes('customers')) cacheKeys.push(CACHE_KEYS.customers);
    if (affectedDataTypes.includes('orders')) cacheKeys.push(CACHE_KEYS.orders);
    if (affectedDataTypes.includes('manufacturers')) cacheKeys.push(CACHE_KEYS.manufacturers);
    if (affectedDataTypes.includes('tasks')) {
      cacheKeys.push(CACHE_KEYS.productionTasks, CACHE_KEYS.designTasks);
    }
    if (affectedDataTypes.includes('stats')) cacheKeys.push(CACHE_KEYS.manufacturingStats);
    
    await invalidateCache(cacheKeys, false); // Delayed for bulk operations
    dataSyncEventBus.emit(DATA_SYNC_EVENTS.BULK_UPDATE, { affectedDataTypes });
  }, [invalidateCache]);

  // Set up event listeners for automatic cache invalidation
  useEffect(() => {
    const cleanupFunctions: Function[] = [];

    // Customer events
    cleanupFunctions.push(
      dataSyncEventBus.on(DATA_SYNC_EVENTS.CUSTOMER_CREATED, syncCustomers),
      dataSyncEventBus.on(DATA_SYNC_EVENTS.CUSTOMER_UPDATED, syncCustomers),
      dataSyncEventBus.on(DATA_SYNC_EVENTS.CUSTOMER_DELETED, syncCustomers)
    );

    // Order events
    cleanupFunctions.push(
      dataSyncEventBus.on(DATA_SYNC_EVENTS.ORDER_CREATED, syncOrders),
      dataSyncEventBus.on(DATA_SYNC_EVENTS.ORDER_UPDATED, syncOrders),
      dataSyncEventBus.on(DATA_SYNC_EVENTS.ORDER_STATUS_CHANGED, syncOrders),
      dataSyncEventBus.on(DATA_SYNC_EVENTS.ORDER_DELETED, syncOrders)
    );

    // Manufacturing events
    cleanupFunctions.push(
      dataSyncEventBus.on(DATA_SYNC_EVENTS.MANUFACTURER_ASSIGNED, syncManufacturing),
      dataSyncEventBus.on(DATA_SYNC_EVENTS.PRODUCTION_TASK_CREATED, syncManufacturing),
      dataSyncEventBus.on(DATA_SYNC_EVENTS.PRODUCTION_TASK_UPDATED, syncManufacturing),
      dataSyncEventBus.on(DATA_SYNC_EVENTS.DESIGN_TASK_CREATED, syncManufacturing),
      dataSyncEventBus.on(DATA_SYNC_EVENTS.DESIGN_TASK_UPDATED, syncManufacturing)
    );

    // User events
    cleanupFunctions.push(
      dataSyncEventBus.on(DATA_SYNC_EVENTS.USER_CREATED, () => syncUsers()),
      dataSyncEventBus.on(DATA_SYNC_EVENTS.USER_UPDATED, () => syncUsers())
    );

    // Catalog events
    cleanupFunctions.push(
      dataSyncEventBus.on(DATA_SYNC_EVENTS.CATALOG_ITEM_CREATED, syncCatalog),
      dataSyncEventBus.on(DATA_SYNC_EVENTS.CATALOG_ITEM_UPDATED, syncCatalog)
    );

    // Message events
    cleanupFunctions.push(
      dataSyncEventBus.on(DATA_SYNC_EVENTS.MESSAGE_SENT, syncMessages)
    );

    return () => {
      cleanupFunctions.forEach(cleanup => cleanup());
    };
  }, [syncCustomers, syncOrders, syncManufacturing, syncUsers, syncCatalog, syncMessages]);

  return {
    // Cache invalidation functions
    invalidateCache,
    invalidateAll,
    
    // Specific sync functions
    syncCustomers,
    syncOrders,
    syncManufacturing,
    syncUsers,
    syncCatalog,
    syncMessages,
    
    // Event handlers
    handleCustomerChange,
    handleOrderChange,
    handleTaskChange,
    handleBulkUpdate,
    
    // Event bus for manual triggering
    eventBus: dataSyncEventBus,
    events: DATA_SYNC_EVENTS,
    cacheKeys: CACHE_KEYS,
  };
}

// Helper hook for specific data types
export function useDataSync(dataType: keyof typeof CACHE_KEYS) {
  const { invalidateCache, eventBus, events } = useGlobalDataSync();
  
  const sync = useCallback(async () => {
    await invalidateCache([CACHE_KEYS[dataType]]);
  }, [invalidateCache, dataType]);
  
  return { sync, eventBus, events };
}

// Helper for mutation success handlers
export function createMutationSuccessHandler(
  dataSync: ReturnType<typeof useGlobalDataSync>,
  config: {
    dataTypes: string[];
    eventType?: string;
    customHandler?: (data: any) => void;
  }
) {
  return (data: any) => {
    console.log('🎯 Mutation succeeded, syncing data:', config.dataTypes);
    
    // Handle custom logic first
    if (config.customHandler) {
      config.customHandler(data);
    }
    
    // Trigger appropriate sync
    if (config.eventType) {
      dataSync.eventBus.emit(config.eventType, data);
    } else {
      dataSync.handleBulkUpdate(config.dataTypes);
    }
  };
}
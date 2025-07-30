/**
 * Centralized Query Key Management
 * 
 * This file defines all query keys used throughout the application to ensure
 * consistency and enable proper cache invalidation.
 */

export const queryKeys = {
  // Authentication & Users
  auth: {
    user: ['auth', 'user'],
    profile: ['auth', 'profile'],
  },
  
  // Customers
  customers: {
    all: ['customers'],
    list: (filters?: Record<string, any>) => ['customers', 'list', filters],
    detail: (id: string) => ['customers', 'detail', id],
    orders: (customerId: string) => ['customers', customerId, 'orders'],
    dashboard: (customerId: string) => ['customers', customerId, 'dashboard'],
  },
  
  // Catalog
  catalog: {
    all: ['catalog'],
    items: (filters?: Record<string, any>) => ['catalog', 'items', filters],
    item: (id: string) => ['catalog', 'item', id],
    categories: ['catalog', 'categories'],
    sports: ['catalog', 'sports'],
    fabrics: ['catalog', 'fabrics'],
  },
  
  // Orders
  orders: {
    all: ['orders'],
    list: (filters?: Record<string, any>) => ['orders', 'list', filters],
    detail: (id: string) => ['orders', 'detail', id],
    enhanced: ['orders', 'enhanced'],
  },
  
  // Manufacturing & Design
  manufacturing: {
    tasks: ['manufacturing', 'tasks'],
    queue: ['manufacturing', 'queue'],
    workload: ['manufacturing', 'workload'],
  },
  
  design: {
    tasks: ['design', 'tasks'],
    queue: ['design', 'queue'],
    workload: ['design', 'workload'],
  },
  
  // Team & Users
  team: {
    all: ['team'],
    workload: ['team', 'workload'],
    users: ['team', 'users'],
    roles: ['team', 'roles'],
  },
  
  // Admin
  admin: {
    users: ['admin', 'users'],
    customers: ['admin', 'customers'],
    permissions: ['admin', 'permissions'],
    roleStats: ['admin', 'role-statistics'],
  },
};

/**
 * Cache invalidation patterns for common operations
 */
export const invalidationPatterns = {
  // When a customer is created/updated/deleted
  onCustomerChange: [
    queryKeys.customers.all,
    queryKeys.admin.customers,
  ],
  
  // When a catalog item is created/updated/deleted
  onCatalogChange: [
    queryKeys.catalog.all,
    queryKeys.catalog.items(),
  ],
  
  // When an order is created/updated/deleted
  onOrderChange: [
    queryKeys.orders.all,
    queryKeys.orders.enhanced,
  ],
  
  // When team assignments change
  onTeamChange: [
    queryKeys.team.all,
    queryKeys.team.workload,
    queryKeys.manufacturing.workload,
    queryKeys.design.workload,
  ],
};

/**
 * Helper function to invalidate related caches after mutations
 */
export function getInvalidationKeys(operation: keyof typeof invalidationPatterns) {
  return invalidationPatterns[operation];
}
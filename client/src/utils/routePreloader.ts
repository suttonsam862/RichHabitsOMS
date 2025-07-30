/**
 * Route preloader utility for dynamic import preloading
 * Preloads adjacent routes to improve navigation performance
 */

// Define route dependencies and their preload modules
export const routePreloadMap: Record<string, (() => Promise<any>)[]> = {
  // Customer management routes
  '/customers': [
    () => import('@/pages/admin/CustomerEditPage'),
    () => import('@/pages/admin/AddCustomerForm'),
  ],
  '/admin/customers/:id/edit': [
    () => import('@/pages/admin/CustomerListPage'),
    () => import('@/pages/admin/AddCustomerForm'),
  ],

  // Catalog management routes
  '/catalog': [
    () => import('@/pages/admin/CatalogItemEditPage'),
    () => import('@/pages/admin/AddCatalogItemForm'),
  ],
  '/admin/catalog/:id/edit': [
    () => import('@/pages/admin/CatalogPage'),
    () => import('@/pages/admin/AddCatalogItemForm'),
  ],

  // Order management routes
  '/orders': [
    () => import('@/pages/OrderEditPage'),
    () => import('@/pages/orders/OrderCreatePage'),
  ],
  '/orders/edit/:id': [
    () => import('@/pages/orders/EnhancedOrderManagement'),
    () => import('@/pages/orders/OrderCreatePage'),
  ],
  '/orders/create': [
    () => import('@/pages/OrderEditPage'),
    () => import('@/pages/orders/EnhancedOrderManagement'),
  ],

  // Manufacturing routes
  '/manufacturing': [
    () => import('@/pages/orders/EnhancedOrderManagement'),
  ],

  // Dashboard routes
  '/dashboard': [
    () => import('@/pages/admin/CustomerListPage'),
    () => import('@/pages/admin/CatalogPage'),
    () => import('@/pages/orders/EnhancedOrderManagement'),
  ],
};

/**
 * Preload routes based on current route
 * @param currentPath - Current route path
 */
export const preloadAdjacentRoutes = (currentPath: string) => {
  // Find matching route pattern
  const routeKey = Object.keys(routePreloadMap).find(pattern => {
    // Convert pattern to regex for matching
    const regex = new RegExp('^' + pattern.replace(/:[\w]+/g, '[^/]+') + '$');
    return regex.test(currentPath);
  });

  if (routeKey && routePreloadMap[routeKey]) {
    // Preload all associated routes
    routePreloadMap[routeKey].forEach((importFn: () => Promise<any>) => {
      try {
        importFn().catch((error: any) => {
          console.debug('Route preload failed (non-critical):', error);
        });
      } catch (error: any) {
        console.debug('Route preload error (non-critical):', error);
      }
    });
  }
};

/**
 * Preload specific route
 * @param routePath - Route to preload
 */
export const preloadSpecificRoute = (routePath: string) => {
  // Map route paths to their import functions
  const routeImports: Record<string, () => Promise<any>> = {
    '/customers': () => import('@/pages/admin/CustomerListPage'),
    '/admin/customers/edit': () => import('@/pages/admin/CustomerEditPage'),
    '/catalog': () => import('@/pages/admin/CatalogPage'),
    '/admin/catalog/edit': () => import('@/pages/admin/CatalogItemEditPage'),
    '/orders': () => import('@/pages/orders/EnhancedOrderManagement'),
    '/orders/edit': () => import('@/pages/OrderEditPage'),
    '/orders/create': () => import('@/pages/orders/OrderCreatePage'),
    '/manufacturing': () => import('@/pages/orders/EnhancedOrderManagement'),
    '/dashboard': () => import('@/pages/dashboard/AdminDashboard'),
  };

  const importFn = routeImports[routePath];
  if (importFn) {
    importFn().catch((error: any) => {
      console.debug('Specific route preload failed (non-critical):', error);
    });
  }
};

/**
 * Preload routes when hovering over navigation links
 * @param linkPath - Path of the link being hovered
 */
export const preloadOnHover = (linkPath: string) => {
  preloadSpecificRoute(linkPath);
  preloadAdjacentRoutes(linkPath);
};

/**
 * Intelligent preload based on user behavior patterns
 * Common workflows to preload:
 * - List → Edit transitions
 * - Create → Edit transitions
 * - Dashboard → Management pages
 */
export const intelligentPreload = (currentPath: string, userRole?: string) => {
  // Admin role gets more aggressive preloading
  if (userRole === 'admin') {
    // Preload all management interfaces
    [
      '/customers',
      '/catalog', 
      '/orders',
      '/manufacturing'
    ].forEach(path => preloadSpecificRoute(path));
  }

  // Always preload adjacent routes for current page
  preloadAdjacentRoutes(currentPath);

  // Workflow-specific preloading
  if (currentPath.includes('/customers')) {
    preloadSpecificRoute('/admin/customers/edit');
  }
  
  if (currentPath.includes('/catalog')) {
    preloadSpecificRoute('/admin/catalog/edit');
  }
  
  if (currentPath.includes('/orders')) {
    preloadSpecificRoute('/orders/edit');
    preloadSpecificRoute('/orders/create');
  }
};

/**
 * Hook for route change detection and preloading
 */
export const useRoutePreloader = () => {
  return {
    preloadAdjacentRoutes,
    preloadSpecificRoute,
    preloadOnHover,
    intelligentPreload,
  };
};
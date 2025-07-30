/**
 * Navigation utilities for post-creation redirects and scroll management
 */

/**
 * Scrolls to the top of the page smoothly
 */
export const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

/**
 * Redirect with a delay and optional scroll to top
 * @param navigate - React Router navigate function
 * @param path - Path to navigate to
 * @param delay - Delay in milliseconds (default: 100)
 * @param scroll - Whether to scroll to top (default: true)
 */
export const redirectWithDelay = (
  navigate: (path: string) => void,
  path: string,
  delay: number = 100,
  scroll: boolean = true
) => {
  setTimeout(() => {
    navigate(path);
    if (scroll) {
      scrollToTop();
    }
  }, delay);
};

/**
 * Extract entity ID from various response structures
 * @param response - API response object
 * @param entityName - Name of entity (e.g., 'customer', 'order', 'catalogItem')
 * @returns string | null - The extracted ID or null if not found
 */
export const extractEntityId = (response: any, entityName: string): string | null => {
  if (!response) return null;
  
  // Try different response structures
  const possibleIds = [
    response.id,
    response[entityName]?.id,
    response.data?.id,
    response.data?.[entityName]?.id,
    response[`${entityName}Id`],
    response.data?.[`${entityName}Id`]
  ];
  
  return possibleIds.find(id => id && typeof id === 'string') || null;
};

/**
 * Standard post-creation redirect pattern
 * @param response - API response from creation
 * @param entityName - Name of entity being created
 * @param navigate - React Router navigate function
 * @param basePath - Base path for the entity edit page (e.g., '/admin/customers', '/orders/edit')
 * @param fallbackPath - Path to redirect to if ID extraction fails
 */
export const handlePostCreationRedirect = (
  response: any,
  entityName: string,
  navigate: (path: string) => void,
  basePath: string,
  fallbackPath: string = '/'
) => {
  const entityId = extractEntityId(response, entityName);
  
  if (entityId) {
    redirectWithDelay(navigate, `${basePath}/${entityId}`, 100, true);
  } else {
    console.warn(`Could not extract ${entityName} ID from response:`, response);
    redirectWithDelay(navigate, fallbackPath, 100, true);
  }
};
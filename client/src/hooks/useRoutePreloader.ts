/**
 * React hook for intelligent route preloading
 */

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { intelligentPreload } from '@/utils/routePreloader';

/**
 * Hook that automatically preloads adjacent routes based on current location
 * @param userRole - Current user role for intelligent preloading
 * @param enableIntelligentPreload - Whether to enable intelligent preloading (default: true)
 */
export const useRoutePreloader = (userRole?: string, enableIntelligentPreload: boolean = true) => {
  const location = useLocation();

  useEffect(() => {
    if (enableIntelligentPreload) {
      // Small delay to avoid interfering with current route loading
      const timeoutId = setTimeout(() => {
        intelligentPreload(location.pathname, userRole);
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [location.pathname, userRole, enableIntelligentPreload]);

  return {
    currentPath: location.pathname,
  };
};
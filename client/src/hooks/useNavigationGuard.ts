
import { useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

interface NavigationGuardOptions {
  preventUnauthorizedBack?: boolean;
  requireAuth?: boolean;
  onNavigationBlocked?: () => void;
}

export const useNavigationGuard = (options: NavigationGuardOptions = {}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useAuth();
  
  const { 
    preventUnauthorizedBack = true, 
    requireAuth = true,
    onNavigationBlocked 
  } = options;

  // Safe navigation function that handles auth state
  const safeNavigate = useCallback((path: string, options?: { replace?: boolean }) => {
    if (requireAuth && !user && !loading) {
      navigate('/login', { replace: true });
      return;
    }
    
    navigate(path, options);
  }, [navigate, user, loading, requireAuth]);

  // Handle browser back button
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      // Check if user is authenticated for protected routes
      if (requireAuth && !user && !loading) {
        event.preventDefault();
        navigate('/login', { replace: true });
        if (onNavigationBlocked) onNavigationBlocked();
        return;
      }

      // Prevent going back to login if already authenticated
      if (user && location.pathname === '/login') {
        event.preventDefault();
        navigate('/dashboard', { replace: true });
        return;
      }
    };

    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [user, loading, location.pathname, navigate, requireAuth, onNavigationBlocked]);

  return {
    safeNavigate,
    canGoBack: window.history.length > 1,
    currentPath: location.pathname
  };
};

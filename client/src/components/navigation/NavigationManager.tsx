import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';

/**
 * Navigation Manager Component
 * Handles proper navigation flow and prevents users from getting stuck at login
 */
export const NavigationManager = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Don't do anything while auth is loading
    if (loading) return;

    // If user is authenticated and on login page, redirect to their dashboard
    if (user && location.pathname === '/login') {
      const targetPath = user.role ? `/dashboard/${user.role}` : '/dashboard';
      navigate(targetPath, { replace: true });
      return;
    }

    // If user is authenticated and on root, redirect to their dashboard
    if (user && location.pathname === '/') {
      const targetPath = user.role ? `/dashboard/${user.role}` : '/dashboard';
      navigate(targetPath, { replace: true });
      return;
    }

    // Handle browser back button for authenticated users
    const handlePopState = (event: PopStateEvent) => {
      // If user is authenticated and trying to go back to login, redirect to dashboard
      if (user && (window.location.pathname === '/login' || window.location.pathname === '/')) {
        event.preventDefault();
        const targetPath = user.role ? `/dashboard/${user.role}` : '/dashboard';
        navigate(targetPath, { replace: true });
      }
    };

    // Add the event listener
    window.addEventListener('popstate', handlePopState);

    // Cleanup
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [user, loading, location.pathname, navigate]);

  // This component doesn't render anything, it just manages navigation
  return null;
};
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

    // Only handle specific navigation cases to avoid conflicts
    const currentPath = location.pathname;
    
    // If user is authenticated and on login page, redirect to their dashboard
    if (user && currentPath === '/login') {
      const targetPath = user.role ? `/dashboard/${user.role}` : '/dashboard';
      setTimeout(() => {
        navigate(targetPath, { replace: true });
      }, 100);
      return;
    }

    // If user is authenticated and on root, redirect to their dashboard
    if (user && currentPath === '/') {
      const targetPath = user.role ? `/dashboard/${user.role}` : '/dashboard';
      setTimeout(() => {
        navigate(targetPath, { replace: true });
      }, 100);
      return;
    }
  }, [user, loading, location.pathname, navigate]);

  // This component doesn't render anything, it just manages navigation
  return null;
};
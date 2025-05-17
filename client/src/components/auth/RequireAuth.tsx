import { useEffect } from 'react';
import { useLocation, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';

interface RequireAuthProps {
  allowedRoles?: string[];
}

export function RequireAuth({ allowedRoles = [] }: RequireAuthProps) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  // If still loading auth state, don't render anything yet
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading"/>
      </div>
    );
  }

  // If not authenticated, redirect to login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If roles are specified and user doesn't have permission
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    // Redirect to the user's appropriate dashboard
    return <Navigate to={`/dashboard/${user.role}`} replace />;
  }

  // If user is authenticated and authorized, render the route
  return <Outlet />;
}
import { ReactNode } from 'react';
import { useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';

interface RequireAuthProps {
  children: ReactNode;
  allowedRoles?: ('admin' | 'customer' | 'salesperson' | 'designer' | 'manufacturer' | 'catalog_manager')[];
}

export function RequireAuth({ allowedRoles = [], children }: RequireAuthProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Enhanced loading state with proper visual feedback
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="animate-spin w-12 h-12 border-4 border-[#00d1ff] border-t-transparent rounded-full"></div>
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[#00d1ff]/20 to-[#00ff9f]/20 blur-md"></div>
          </div>
          <div className="text-white/70 text-sm font-medium">
            Loading...
          </div>
        </div>
      </div>
    );
  }

  // If not authenticated, redirect to login but preserve the intended destination
  if (!user) {
    console.log('RequireAuth: No user found, redirecting to login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If roles are specified and user doesn't have permission
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role as any)) {
    // Check for custom roles
    if (user.customRole && allowedRoles.includes(user.customRole as any)) {
      // Custom role has access, allow through
      console.log('RequireAuth: Custom role access granted', user.customRole);
      return <>{children}</>;
    }
    
    console.log('RequireAuth: User lacks required role, redirecting to dashboard', {
      userRole: user.role,
      allowedRoles,
      customRole: user.customRole
    });
    
    // Redirect to the user's appropriate dashboard
    return <Navigate to={`/dashboard/${user.role}`} replace />;
  }

  // If user is authenticated and authorized, render the children
  console.log('RequireAuth: Access granted for', user.role);
  return <>{children}</>;
}
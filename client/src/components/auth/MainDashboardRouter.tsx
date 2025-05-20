import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";

/**
 * Component to route users to their role-specific dashboard
 * This handles the redirection after login when a user lands on /dashboard
 */
export const MainDashboardRouter = () => {
  const { user, role, loading } = useAuth();

  // Decide which dashboard to show based on user role
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // If we have a role, redirect to the appropriate dashboard
  if (role) {
    return <Navigate to={`/dashboard/${role}`} replace />;
  }

  // If no role is found but user is authenticated, default to customer dashboard
  if (user) {
    console.warn("User authenticated but no role found, defaulting to customer dashboard");
    return <Navigate to="/dashboard/customer" replace />;
  }

  // Fallback to login if no user found
  return <Navigate to="/login" replace />;
};

export default MainDashboardRouter;
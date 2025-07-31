import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";

/**
 * Component to route users to their role-specific dashboard
 * This handles the redirection after login when a user lands on /dashboard
 */
export const MainDashboardRouter = () => {
  const { user, role, loading } = useAuth();

  useEffect(() => {
    if (user && role) {
      console.log("MainDashboardRouter: User authenticated with role:", role);
    }
  }, [user, role]);

  // Show loading state while authentication is being checked
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="animate-spin w-12 h-12 border-4 border-[#00d1ff] border-t-transparent rounded-full"></div>
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[#00d1ff]/20 to-[#00ff9f]/20 blur-md"></div>
          </div>
          <div className="text-white/70 text-sm font-medium">
            Loading dashboard...
          </div>
        </div>
      </div>
    );
  }

  // If no user is found, redirect to login
  if (!user) {
    console.log("MainDashboardRouter: No user found, redirecting to login");
    return <Navigate to="/login" replace />;
  }

  // If we have a role, redirect to the appropriate dashboard
  if (role) {
    console.log("MainDashboardRouter: Redirecting to dashboard for role:", role);
    return <Navigate to={`/dashboard/${role}`} replace />;
  }

  // If no role is found but user is authenticated, default to customer dashboard
  console.warn("MainDashboardRouter: User authenticated but no role found, defaulting to customer dashboard");
  return <Navigate to="/dashboard/customer" replace />;
};

export default MainDashboardRouter;
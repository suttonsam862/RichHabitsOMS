
import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export const MainDashboardRouter = () => {
  const { user, loading, error } = useAuth();

  useEffect(() => {
    if (user) {
      console.log("MainDashboardRouter: User authenticated with role:", user.role);
    }
  }, [user]);

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

  // Show error state if there's an auth error
  if (error) {
    console.error("MainDashboardRouter: Auth error:", error);
    return <Navigate to="/login" replace />;
  }

  // If no user is found, redirect to login
  if (!user) {
    console.log("MainDashboardRouter: No user found, redirecting to login");
    return <Navigate to="/login" replace />;
  }

  // Redirect to the appropriate dashboard based on role
  const dashboardRoute = `/dashboard/${user.role}`;
  console.log("MainDashboardRouter: Redirecting to dashboard:", dashboardRoute);
  return <Navigate to={dashboardRoute} replace />;
};

export default MainDashboardRouter;

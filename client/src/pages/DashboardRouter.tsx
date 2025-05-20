import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";

/**
 * A component that routes users to their role-specific dashboard
 * This is a simpler implementation that works for both wouter and react-router-dom
 */
export default function DashboardRouter() {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (!loading) {
      if (role) {
        // Navigate to the appropriate dashboard based on user role
        navigate(`/dashboard/${role}`);
      } else if (user) {
        // If user exists but no role is found, default to customer
        console.warn("User authenticated but no role found, defaulting to customer dashboard");
        navigate("/dashboard/customer");
      } else {
        // No user, go to login
        navigate("/login");
      }
    }
  }, [role, user, loading, navigate]);
  
  // Show loading indicator while checking auth status
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full"></div>
    </div>
  );
}
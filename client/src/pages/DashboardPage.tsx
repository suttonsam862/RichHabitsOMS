import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";

/**
 * Dashboard page that redirects to the appropriate role-specific dashboard
 */
export default function DashboardPage() {
  const { user, role, loading } = useAuth();
  const [redirectPath, setRedirectPath] = useState<string | null>(null);

  useEffect(() => {
    if (!loading) {
      if (role) {
        // Set redirect to the appropriate dashboard based on role
        setRedirectPath(`/dashboard/${role}`);
      } else if (user) {
        // If no role, default to customer
        console.warn("User has no role, defaulting to customer dashboard");
        setRedirectPath("/dashboard/customer");
      } else {
        // No user, go to login
        setRedirectPath("/login");
      }
    }
  }, [user, role, loading]);

  // Show loading state while determining redirect
  if (loading || !redirectPath) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  // Redirect to the appropriate dashboard or login page
  return <Navigate to={redirectPath} replace />;
}
import { useContext } from "react";
import { AuthContext } from "@/context/AuthContext";
import { useLocation } from "wouter";

export const useAuth = () => {
  const auth = useContext(AuthContext);
  const [location, setLocation] = useLocation();

  // Redirect to login if not authenticated
  const requireAuth = (allowedRoles?: string[]) => {
    // If still loading, don't do anything yet
    if (auth.loading) return false;

    // If not authenticated, redirect to login
    if (!auth.isAuthenticated) {
      setLocation("/login");
      return false;
    }

    // If roles are specified, check if user has the required role
    if (allowedRoles && auth.user) {
      const hasRole = allowedRoles.includes(auth.user.role);
      if (!hasRole) {
        setLocation("/dashboard"); // Redirect to dashboard if not authorized
        return false;
      }
    }

    return true;
  };

  return {
    ...auth,
    requireAuth,
  };
};

export default useAuth;

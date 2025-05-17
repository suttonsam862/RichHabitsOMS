import { useContext } from "react";
import { AuthContext } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";

export const useAuth = () => {
  const auth = useContext(AuthContext);
  const navigate = useNavigate();

  // Redirect to login if not authenticated
  const requireAuth = (allowedRoles?: string[]) => {
    // If still loading, don't do anything yet
    if (auth.loading) return false;

    // If not authenticated, redirect to login
    if (!auth.isAuthenticated) {
      navigate("/login");
      return false;
    }

    // If roles are specified, check if user has the required role
    if (allowedRoles && auth.user) {
      const hasRole = allowedRoles.includes(auth.user.role);
      if (!hasRole) {
        // Redirect to the appropriate dashboard based on user role
        navigate(`/dashboard/${auth.user.role}`);
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

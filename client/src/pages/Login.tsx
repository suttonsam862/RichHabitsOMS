import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { AuthForm } from "@/components/auth/AuthForm";

export default function Login() {
  const { user, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  
  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !loading && user) {
      console.log("Already authenticated as:", user.role);
      // Redirect to the appropriate dashboard based on user role
      navigate("/dashboard");
    }
  }, [isAuthenticated, loading, navigate, user]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-gray-900">ThreadCraft</h1>
          <p className="mt-2 text-sm text-gray-600">
            Custom Clothing Order Management System
          </p>
        </div>
        <AuthForm type="login" />
      </div>
    </div>
  );
}

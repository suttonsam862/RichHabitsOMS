import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { AuthForm } from "@/components/auth/AuthForm";

/**
 * Rich Habits login page with blackout glassmorphism theme
 */
export default function Login() {
  const { user, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  
  // Redirect if already authenticated - simplified logic
  useEffect(() => {
    if (isAuthenticated && !loading && user) {
      console.log("Already authenticated as:", user.role);
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, loading, navigate, user]);

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Rich Habits background with gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-rich-black via-gray-900 to-black opacity-95" />
      
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-neon-blue opacity-5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-neon-green opacity-5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="max-w-md w-full space-y-8 relative z-10">
        {/* Rich Habits branding header */}
        <div className="text-center">
          <div className="rich-card p-8 mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-4 tracking-wide">
              RICH HABITS
            </h1>
            <div className="subtitle text-neon-blue mb-2">
              ThreadCraft
            </div>
            <p className="text-muted-foreground text-sm">
              Luxury Custom Clothing Management
            </p>
          </div>
        </div>
        
        {/* Authentication form with glassmorphism */}
        <div className="rich-card p-8">
          <AuthForm type="login" />
        </div>
        
        {/* Rich Habits footer branding */}
        <div className="text-center text-xs text-muted-foreground">
          <p className="subtitle text-neon-green">
            Affordable Luxury • Premium Quality
          </p>
        </div>
      </div>
    </div>
  );
}

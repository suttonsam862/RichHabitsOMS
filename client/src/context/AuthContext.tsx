import { createContext, useState, useEffect, ReactNode } from "react";
import { apiRequest } from "@/lib/queryClient";
// Using window.location instead of useLocation for consistent navigation

interface User {
  id: number;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  role: string;
  customRole?: string;
  visiblePages?: string[];
}

interface AuthContextType {
  user: User | null;
  role: string;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: any) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  hasPageAccess: (pageName: string) => boolean;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  role: '',
  loading: true,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  isAuthenticated: false,
  hasPageAccess: () => false,
});

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  // Removed wouter dependency

  // Check if user is already authenticated
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        // Check for stored token in localStorage
        const storedToken = localStorage.getItem('authToken');

        if (!storedToken) {
          console.log('No auth token found in localStorage');
          setUser(null);
          setLoading(false);
          return;
        }

        // The server handles token validation with Supabase Auth
        const res = await fetch("/api/auth/me", {
          headers: {
            Authorization: `Bearer ${storedToken}`
          },
          credentials: 'include'
        });

        if (!res.ok) {
          console.log('Auth validation failed, clearing session');
          localStorage.removeItem('authToken');
          localStorage.removeItem('tokenExpires');
          setUser(null);
          setLoading(false);
          return;
        }

        const userData = await res.json();
        if (userData && userData.success && userData.user) {
          console.log('User session validated successfully');
          console.log('Already authenticated as:', userData.user.role);
          setUser(userData.user);
        } else {
          console.log('Invalid user data received');
          localStorage.removeItem('authToken');
          localStorage.removeItem('tokenExpires');
          setUser(null);
        }
      } catch (error) {
        console.error('Error checking auth status:', error);
        // Clear potentially invalid tokens
        localStorage.removeItem('authToken');
        localStorage.removeItem('tokenExpires');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  // Login function
  const login = async (email: string, password: string) => {
    try {
      console.log(`Attempting login for ${email}`);

      // Clear any existing tokens/data
      localStorage.removeItem('authToken');
      localStorage.removeItem('tokenExpires');

      // Create a safe fetch request that always returns JSON, even on errors
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include"
      });

      // Always parse response as JSON
      let data;
      try {
        const text = await response.text();
        if (!text) {
          throw new Error("Empty response from server");
        }

        try {
          data = JSON.parse(text);
        } catch (parseError) {
          console.error("JSON parse error:", parseError, "Response text:", text);
          throw new Error("Invalid response format from server. Please try again later.");
        }
      } catch (responseError) {
        console.error("Response processing error:", responseError);
        throw new Error("Unable to process server response. Please try again later.");
      }

      // Handle error responses
      if (!response.ok) {
        console.error("Authentication failed:", data);
        throw new Error(data?.message || "Authentication failed. Please check your credentials.");
      }

      // Validate response format
      if (!data.success || !data.user) {
        console.error("Invalid auth response format:", data);
        throw new Error("Invalid response from authentication server");
      }

      // Check for session with token (backend returns session.token)
      if (!data.session?.token) {
        console.error("No authentication token found in response");
        console.log("Response data structure:", data);
        throw new Error("Authentication failed - no token returned");
      }

      // Store token in localStorage for future auth checks
      localStorage.setItem('authToken', data.session.token);
      if (data.session.expiresAt) {
        localStorage.setItem('tokenExpires', data.session.expiresAt.toString());
      }

      // Update user state with authenticated user data
      setUser(data.user);

      console.log("Authentication successful");
      return data.user;
    } catch (error: any) {
      console.error("Login error:", error);

      // Ensure a clean error is thrown with helpful message
      if (error instanceof Error) {
        throw error;
      } else if (typeof error === 'string') {
        throw new Error(error);
      } else {
        throw new Error("Authentication failed. Please try again later.");
      }
    }
  };

  // Register function
  const register = async (userData: any) => {
    try {
      const res = await apiRequest("POST", "/api/auth/register", userData);
      const newUser = await res.json();
      setUser(newUser);
    } catch (error) {
      console.error("Registration error:", error);
      throw error;
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await apiRequest("POST", "/api/auth/logout");
      setUser(null);
      // Clear any cached data in localStorage
      localStorage.clear();
      // Redirect to login page
      window.location.href = "/login";
    } catch (error) {
      console.error("Logout error:", error);
      // Force logout even if API call fails
      setUser(null);
      localStorage.clear();
      window.location.href = "/login";
    }
  };

  const role = user?.role || '';
  const isAuthenticated = !!user;

  // Custom role-based page access control
  const hasPageAccess = (pageName: string): boolean => {
    if (!user) return false;

    // Admin users have access to all pages
    if (user.role === 'admin') return true;

    // Check custom role visibility
    if (user.visiblePages && user.visiblePages.length > 0) {
      return user.visiblePages.includes(pageName.toLowerCase());
    }

    // Default role-based access for backwards compatibility
    switch (user.role) {
      case 'salesperson':
        return ['dashboard', 'orders', 'customers'].includes(pageName.toLowerCase());
      case 'designer':
        return ['dashboard', 'orders', 'design'].includes(pageName.toLowerCase());
      case 'manufacturer':
        return ['dashboard', 'orders', 'production'].includes(pageName.toLowerCase());
      case 'customer':
        return ['dashboard', 'orders'].includes(pageName.toLowerCase());
      default:
        return false;
    }
  };

  // Show loading spinner while checking auth state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        loading,
        login,
        register,
        logout,
        isAuthenticated,
        hasPageAccess,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
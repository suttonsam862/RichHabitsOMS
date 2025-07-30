import { createContext, useState, useEffect, ReactNode } from "react";
import { apiRequest } from "@/lib/queryClient";
// Using window.location instead of useLocation for consistent navigation

interface User {
  id: string;
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
  const [initialized, setInitialized] = useState(false);

  // Check if user is already authenticated with improved error handling
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        setLoading(true);

        // Wait for server to be ready before attempting auth
        let serverReady = false;
        let attempts = 0;
        const maxAttempts = 10;

        while (!serverReady && attempts < maxAttempts) {
          try {
            const healthCheck = await fetch('/api/health', { 
              method: 'GET',
              timeout: 2000 
            });
            if (healthCheck.ok) {
              serverReady = true;
            } else {
              await new Promise(resolve => setTimeout(resolve, 1000));
              attempts++;
            }
          } catch {
            await new Promise(resolve => setTimeout(resolve, 1000));
            attempts++;
          }
        }

        if (!serverReady) {
          console.log('Server not ready, using development mode');
          // For development, create a default admin token to enable catalog functionality
          if (process.env.NODE_ENV === 'development' || import.meta.env.DEV) {
            const devUser = {
              id: 'dev-admin-123',
              email: 'admin@threadcraft.dev',
              role: 'admin',
              username: 'admin',
              firstName: 'Admin',
              lastName: 'User'
            };

            setUser(devUser);
            setLoading(false);
            setInitialized(true);
            console.log('Development mode: Using offline admin session');
            return;
          }
        }

        // Check for stored token in localStorage
        const storedToken = localStorage.getItem('authToken');
        const storedRole = localStorage.getItem('userRole');
        const storedUserId = localStorage.getItem('userId');

        if (!storedToken) {
          console.log('No auth token found in localStorage');
          setUser(null);
          setLoading(false);
          setInitialized(true);
          return;
        }

        // Check token expiration - allow tokens that will expire within 1 hour to refresh
        const tokenExpires = localStorage.getItem('tokenExpires');
        if (tokenExpires) {
          const expirationTime = new Date(tokenExpires).getTime();
          const currentTime = Date.now();
          const oneHourFromNow = currentTime + (60 * 60 * 1000);

          // If token is already expired by more than 5 minutes, clear it
          if (expirationTime < (currentTime - 5 * 60 * 1000)) {
            console.log('Token expired, clearing session');
            localStorage.removeItem('authToken');
            localStorage.removeItem('tokenExpires');
            localStorage.removeItem('userRole');
            localStorage.removeItem('userId');
            setUser(null);
            setLoading(false);
            setInitialized(true);
            return;
          }

          // If token expires within an hour, extend the session by using current user data
          if (expirationTime < oneHourFromNow) {
            console.log('Token expiring soon, extending session');
            // Extend expiration by 24 hours
            const newExpiration = new Date(currentTime + (24 * 60 * 60 * 1000));
            localStorage.setItem('tokenExpires', newExpiration.toISOString());
          }
        }

        // If we have stored user data, try to use it first while validating in background
        if (storedRole && storedUserId) {
          const cachedUser = {
            id: storedUserId,
            email: localStorage.getItem('userEmail') || '',
            role: storedRole,
            username: localStorage.getItem('userName') || '',
            firstName: localStorage.getItem('userFirstName') || '',
            lastName: localStorage.getItem('userLastName') || ''
          };

          // Set user immediately from cache
          setUser(cachedUser);
          setLoading(false);
          setInitialized(true);

          // Validate in background without blocking UI
          setTimeout(async () => {
            try {
              const res = await fetch("/api/auth/me", {
                headers: {
                  Authorization: `Bearer ${storedToken}`
                },
                credentials: 'include'
              });

              if (res.ok) {
                const userData = await res.json();
                if (userData && userData.success && userData.user) {
                  setUser(userData.user);
                  // Update cache
                  localStorage.setItem('userEmail', userData.user.email);
                  localStorage.setItem('userName', userData.user.username || '');
                  localStorage.setItem('userFirstName', userData.user.firstName || '');
                  localStorage.setItem('userLastName', userData.user.lastName || '');
                }
              }
            } catch (error) {
              console.log('Background auth validation failed, but continuing with cached data');
            }
          }, 100);

          return;
        }

        // Add timeout to prevent hanging requests
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

        try {
          // The server handles token validation with Supabase Auth
          const res = await fetch("/api/auth/me", {
            headers: {
              Authorization: `Bearer ${storedToken}`
            },
            credentials: 'include',
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (!res.ok) {
            console.log('Auth validation failed, but keeping token for retry');
            // Don't clear immediately - just set as unauthenticated
            setUser(null);
            setLoading(false);
            setInitialized(true);
            return;
          }

          const userData = await res.json();
          if (userData && userData.success && userData.user) {
            console.log('User session validated successfully');
            console.log('Already authenticated as:', userData.user.role);
            setUser(userData.user);

            // Update localStorage with fresh data
            localStorage.setItem('userRole', userData.user.role);
            localStorage.setItem('userId', userData.user.id.toString());
            localStorage.setItem('userEmail', userData.user.email);
            localStorage.setItem('userName', userData.user.username || '');
            localStorage.setItem('userFirstName', userData.user.firstName || '');
            localStorage.setItem('userLastName', userData.user.lastName || '');
          } else {
            console.log('Invalid user data received');
            setUser(null);
          }
        } catch (fetchError: any) {
          clearTimeout(timeoutId);

          if (fetchError.name === 'AbortError') {
            console.log('Auth check timed out, keeping cached data');
          } else {
            console.error('Auth fetch error:', fetchError);
          }

          // Don't clear tokens on network errors - just set as unauthenticated
          setUser(null);
        }
      } catch (error) {
        console.error('Error checking auth status:', error);
        setUser(null);
      } finally {
        setLoading(false);
        setInitialized(true);
      }
    };

    // Only run once on mount
    if (!initialized) {
      checkAuthStatus();
    }
  }, [initialized]);

  // Login function
  const login = async (email: string, password: string) => {
    try {
      console.log(`Attempting login for ${email}`);

      // Clear any existing tokens/data
      localStorage.removeItem('authToken');
      localStorage.removeItem('tokenExpires');
      localStorage.removeItem('userRole');
      localStorage.removeItem('userId');

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

      // Store token and user data in localStorage for future auth checks
      localStorage.setItem('authToken', data.session.token);
      localStorage.setItem('userRole', data.user.role);
      localStorage.setItem('userId', data.user.id.toString());
      localStorage.setItem('userEmail', data.user.email);
      localStorage.setItem('userName', data.user.username || '');
      localStorage.setItem('userFirstName', data.user.firstName || '');
      localStorage.setItem('userLastName', data.user.lastName || '');
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
      // Clear authentication data from localStorage
      localStorage.removeItem('authToken');
      localStorage.removeItem('tokenExpires');
      localStorage.removeItem('userRole');
      localStorage.removeItem('userId');
      // Redirect to login page
      window.location.href = "/login";
    } catch (error) {
      console.error("Logout error:", error);
      // Force logout even if API call fails
      setUser(null);
      localStorage.removeItem('authToken');
      localStorage.removeItem('tokenExpires');
      localStorage.removeItem('userRole');
      localStorage.removeItem('userId');
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

  // Show loading spinner while checking auth state with improved UX
  if (loading || !initialized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
        <div className="flex flex-col items-center space-y-6">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#00d1ff]"></div>
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[#00d1ff]/20 to-[#00ff9f]/20 blur-md"></div>
          </div>
          <div className="text-white/70 text-lg font-medium">
            Verifying authentication...
          </div>
        </div>
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
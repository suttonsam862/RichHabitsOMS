import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

interface User {
  id: string;
  email: string;
  role: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  isSuperAdmin?: boolean;
  visiblePages?: string[];
  customRole?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  initialized: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
  hasPageAccess: (page: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const authCheckInProgress = useRef(false);
  const lastAuthCheck = useRef<number>(0);

  const checkAuth = useCallback(async (forceCheck = false) => {
    const now = Date.now();

    // Prevent multiple simultaneous auth checks
    if (authCheckInProgress.current) {
      return;
    }

    // Be less aggressive with rate limiting - minimum 5 seconds between requests
    // Always allow forced checks (like on page refresh/initialization)
    if (!forceCheck && now - lastAuthCheck.current < 5000) {
      return;
    }

    authCheckInProgress.current = true;
    lastAuthCheck.current = now;

    try {
      setLoading(true);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // Longer timeout

      const response = await fetch('/api/auth/me', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      }).catch(error => {
        clearTimeout(timeoutId);
        // If the user was logged in and now we get a network error, don't immediately log them out
        if (user && error.name !== 'AbortError') {
          console.warn('Auth check network error, keeping user logged in:', error.message);
          return null; // Skip updating user state
        }
        throw error;
      });

      clearTimeout(timeoutId);

      // If we couldn't reach the server but user was logged in, don't log them out
      if (!response && user) {
        console.warn('Auth check failed due to network issues, keeping user logged in');
        return;
      }

      if (response && response.ok) {
        const data = await response.json().catch(() => ({}));
        if (data.success && data.user) {
          setUser(data.user);
          setError(null);
        } else {
          // Only log out if we get a clear invalid response
          setUser(null);
        }
      } else if (response && response.status === 401) {
        // Clear authentication only on explicit 401
        setUser(null);
        setError(null);
      } else if (response) {
        // For other errors, be less aggressive about logging out
        console.warn('Auth check failed with status:', response.status);
        if (!user) {
          setUser(null); // Only clear if user wasn't logged in
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn('Auth check timeout');
      } else {
        console.error('Auth check error:', error);
      }
      setUser(null);
      setError(null); // Don't show auth errors to user
    } finally {
      setLoading(false);
      setInitialized(true);
      authCheckInProgress.current = false;
    }
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      }).catch(error => {
        throw new Error(`Network error: ${error.message}`);
      });

      const data = await response.json().catch(() => ({
        success: false,
        message: 'Invalid response from server'
      }));

      if (response.ok && data.success && data.user) {
        setUser(data.user);
        setError(null);
        return true;
      } else {
        const errorMsg = data.message || 'Login failed';
        setError(errorMsg);
        toast({
          title: "Login Failed",
          description: errorMsg,
          variant: "destructive",
        });
        return false;
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Network error';
      setError(errorMsg);
      toast({
        title: "Login Failed",
        description: errorMsg,
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const logout = useCallback(async () => {
    try {
      setLoading(true);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        signal: controller.signal,
      }).catch(error => {
        clearTimeout(timeoutId);
        // Don't throw - logout should always succeed locally
        console.warn('Logout request failed:', error);
      });

      clearTimeout(timeoutId);
    } catch (error) {
      console.warn('Logout request failed:', error);
    } finally {
      setUser(null);
      setError(null);
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Page access control function
  const hasPageAccess = useCallback((page: string): boolean => {
    if (!user) return false;

    // Super admin has access to everything
    if (user.isSuperAdmin) return true;

    // If user has custom visible pages array, use that
    if (user.visiblePages && user.visiblePages.length > 0) {
      return user.visiblePages.includes(page);
    }

    // Default role-based access control
    switch (user.role) {
      case 'admin':
        return true; // Admin has access to all pages
      case 'salesperson':
        return ['dashboard', 'customers', 'orders', 'catalog'].includes(page);
      case 'designer':
        return ['dashboard', 'orders', 'designs'].includes(page);
      case 'manufacturer':
        return ['dashboard', 'orders', 'production'].includes(page);
      case 'customer':
        return ['dashboard', 'orders'].includes(page);
      default:
        return ['dashboard'].includes(page); // Basic access
    }
  }, [user]);

  // Optimized initial auth check - immediate execution with force flag
  useEffect(() => {
    if (!initialized) {
      checkAuth(true).finally(() => setInitialized(true));
    }
  }, [initialized, checkAuth]);

  // Check auth when window gains focus (user returns to tab) - but less frequently
  useEffect(() => {
    const handleFocus = () => {
      // Only check if we're already initialized and have a user, and not too frequently
      if (initialized && user && (Date.now() - lastAuthCheck.current) > 30000) { // 30 seconds minimum
        checkAuth();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [initialized, user, checkAuth]);

  // Handle page visibility change (tab becomes visible) - but less frequently
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && initialized && user && 
          (Date.now() - lastAuthCheck.current) > 30000) { // 30 seconds minimum
        checkAuth();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [initialized, user, checkAuth]);

  return (
    <AuthContext.Provider 
      value={{
        user,
        loading,
        initialized,
        error,
        login,
        logout,
        checkAuth,
        clearError,
        hasPageAccess,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
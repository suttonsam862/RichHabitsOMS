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

  const checkAuth = useCallback(async () => {
    const now = Date.now();

    // Prevent multiple simultaneous auth checks
    if (authCheckInProgress.current) {
      return;
    }

    // Rate limit auth checks - minimum 5 seconds between requests
    if (now - lastAuthCheck.current < 5000) {
      return;
    }

    authCheckInProgress.current = true;
    lastAuthCheck.current = now;

    try {
      setLoading(true);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch('/api/auth/me', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      }).catch(error => {
        clearTimeout(timeoutId);
        throw error;
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        if (data.success && data.user) {
          setUser(data.user);
          setError(null);
        } else {
          setUser(null);
        }
      } else if (response.status === 401) {
        // Normal unauthenticated state - don't spam logs
        setUser(null);
        setError(null);
      } else {
        setUser(null);
        console.warn('Auth check failed:', response.status);
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

  // Initial auth check
  useEffect(() => {
    if (!initialized) {
      checkAuth();
    }
  }, [initialized, checkAuth]);

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
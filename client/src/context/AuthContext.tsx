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
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
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
      });

      const data = await response.json();

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
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
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
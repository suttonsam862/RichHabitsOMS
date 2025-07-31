import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { checkServerHealth } from '@/lib/globalFetchInterceptor';
import { isHmrReconnecting } from '@/lib/viteHmrFix';

interface User {
  id: string;
  email: string;
  role: string;
  profile_id?: string;
}

interface AuthContextType {
  user: User | null;
  role: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [authCheckAttempts, setAuthCheckAttempts] = useState(0);
  const [serverReady, setServerReady] = useState(false);
  const { toast } = useToast();

  const MAX_AUTH_ATTEMPTS = 3;
  const AUTH_RETRY_DELAY = 2000;

  // Wait for server to be ready before checking auth
  const waitForServer = useCallback(async (): Promise<boolean> => {
    if (serverReady) return true;

    try {
      const ready = await checkServerHealth();
      setServerReady(ready);
      return ready;
    } catch (error) {
      console.warn('Server health check failed:', error);
      return false;
    }
  }, [serverReady]);

  const checkAuth = useCallback(async () => {
    // Don't check auth if we've exceeded attempts
    if (authCheckAttempts >= MAX_AUTH_ATTEMPTS) {
      setLoading(false);
      return;
    }

    // Don't check auth during HMR reconnection
    if (import.meta.env.DEV && isHmrReconnecting()) {
      console.debug('🔄 Skipping auth check during HMR reconnection');
      setTimeout(checkAuth, 2000);
      return;
    }

    // Wait for server to be ready
    const ready = await waitForServer();
    if (!ready) {
      console.log('⏳ Server not ready, delaying auth check...');
      setTimeout(() => {
        setAuthCheckAttempts(prev => prev + 1);
        checkAuth();
      }, AUTH_RETRY_DELAY);
      return;
    }

    try {
      const response = await fetch('/api/auth/me', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData.user);
        setRole(userData.user?.role || null);
        setAuthCheckAttempts(0); // Reset attempts on success
      } else if (response.status === 401) {
        // Expected when not logged in - clear auth state
        setUser(null);
        setRole(null);
        setAuthCheckAttempts(0); // Don't count 401 as failure
      } else {
        console.warn('Auth check failed:', response.status);
        setAuthCheckAttempts(prev => prev + 1);
      }
    } catch (error) {
      // Handle network errors gracefully during startup
      if (error instanceof Error && error.message.includes('Server not ready')) {
        console.debug('🔄 Auth check delayed - server starting up');
        setTimeout(checkAuth, AUTH_RETRY_DELAY);
        return;
      }

      console.warn('Auth check error:', error);
      setAuthCheckAttempts(prev => prev + 1);

      // Only retry if we haven't exceeded attempts
      if (authCheckAttempts < MAX_AUTH_ATTEMPTS - 1) {
        setTimeout(checkAuth, AUTH_RETRY_DELAY);
        return;
      } else {
        // Max attempts reached - clear auth state and stop retrying
        setUser(null);
        setRole(null);
      }
    }

    setLoading(false);
  }, [authCheckAttempts, waitForServer]);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData.user);
        setRole(userData.user?.role || null);
        setAuthCheckAttempts(0); // Reset attempts on successful login
        return true;
      } else {
        const errorData = await response.json();
        toast({
          title: "Login Failed",
          description: errorData.message || "Invalid credentials",
          variant: "destructive",
        });
        return false;
      }
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: "Login Error",
        description: "Unable to connect to server",
        variant: "destructive",
      });
      return false;
    }
  }, [toast]);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.warn('Logout request failed:', error);
    }

    setUser(null);
    setRole(null);
    setAuthCheckAttempts(0);
  }, []);

  // Initial auth check with server readiness
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <AuthContext.Provider value={{ user, role, loading, login, logout, checkAuth }}>
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
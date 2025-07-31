
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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

interface AuthState {
  user: User | null;
  loading: boolean;
  initialized: boolean;
  error: string | null;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Centralized auth configuration
const AUTH_CONFIG = {
  CHECK_INTERVAL: 5 * 60 * 1000, // 5 minutes
  RETRY_DELAY: 1000,
  SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 hours
} as const;

// Auth state manager for better control
class AuthStateManager {
  private state: AuthState = {
    user: null,
    loading: true,
    initialized: false,
    error: null,
  };

  private listeners: Set<(state: AuthState) => void> = new Set();
  private checkInProgress = false;
  private lastCheck = 0;

  constructor() {
    this.setState = this.setState.bind(this);
    this.subscribe = this.subscribe.bind(this);
    this.unsubscribe = this.unsubscribe.bind(this);
  }

  setState(updates: Partial<AuthState>) {
    this.state = { ...this.state, ...updates };
    this.listeners.forEach(listener => listener(this.state));
  }

  getState() {
    return this.state;
  }

  subscribe(listener: (state: AuthState) => void) {
    this.listeners.add(listener);
    return () => this.unsubscribe(listener);
  }

  unsubscribe(listener: (state: AuthState) => void) {
    this.listeners.delete(listener);
  }

  async checkAuth(): Promise<void> {
    // Prevent concurrent checks
    if (this.checkInProgress) {
      return;
    }

    // Rate limiting
    const now = Date.now();
    if (now - this.lastCheck < 1000) {
      return;
    }

    this.checkInProgress = true;
    this.lastCheck = now;

    try {
      const response = await fetch('/api/auth/me', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          this.setState({
            user: data.user,
            loading: false,
            initialized: true,
            error: null,
          });
        } else {
          this.setState({
            user: null,
            loading: false,
            initialized: true,
            error: null,
          });
        }
      } else {
        // 401 is expected when not logged in
        this.setState({
          user: null,
          loading: false,
          initialized: true,
          error: response.status === 401 ? null : `Auth check failed: ${response.status}`,
        });
      }
    } catch (error) {
      console.warn('Auth check failed:', error);
      this.setState({
        user: null,
        loading: false,
        initialized: true,
        error: null, // Don't show network errors to user
      });
    } finally {
      this.checkInProgress = false;
    }
  }

  async login(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    this.setState({ loading: true, error: null });

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        this.setState({
          user: data.user,
          loading: false,
          initialized: true,
          error: null,
        });
        return { success: true };
      } else {
        this.setState({
          user: null,
          loading: false,
          error: data.message || 'Login failed',
        });
        return { success: false, error: data.message || 'Login failed' };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Network error';
      this.setState({
        user: null,
        loading: false,
        error: errorMessage,
      });
      return { success: false, error: errorMessage };
    }
  }

  async logout(): Promise<void> {
    this.setState({ loading: true });

    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.warn('Logout request failed:', error);
    }

    this.setState({
      user: null,
      loading: false,
      initialized: true,
      error: null,
    });
  }

  clearError() {
    this.setState({ error: null });
  }
}

// Global auth state manager instance
const authStateManager = new AuthStateManager();

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>(authStateManager.getState());
  const { toast } = useToast();

  // Subscribe to auth state changes
  useEffect(() => {
    const unsubscribe = authStateManager.subscribe(setAuthState);
    return unsubscribe;
  }, []);

  // Initial auth check
  useEffect(() => {
    if (!authState.initialized) {
      authStateManager.checkAuth();
    }
  }, [authState.initialized]);

  // Periodic auth check for active sessions
  useEffect(() => {
    if (!authState.user) return;

    const interval = setInterval(() => {
      authStateManager.checkAuth();
    }, AUTH_CONFIG.CHECK_INTERVAL);

    return () => clearInterval(interval);
  }, [authState.user]);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    const result = await authStateManager.login(email, password);
    
    if (!result.success) {
      toast({
        title: "Login Failed",
        description: result.error || "Invalid credentials",
        variant: "destructive",
      });
    }
    
    return result.success;
  }, [toast]);

  const logout = useCallback(async () => {
    await authStateManager.logout();
  }, []);

  const checkAuth = useCallback(async () => {
    await authStateManager.checkAuth();
  }, []);

  const clearError = useCallback(() => {
    authStateManager.clearError();
  }, []);

  return (
    <AuthContext.Provider 
      value={{
        ...authState,
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

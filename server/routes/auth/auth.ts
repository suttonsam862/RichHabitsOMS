import { Request, Response, NextFunction } from 'express';
import { supabase } from '../../db';

// Enhanced session interface
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
        firstName?: string;
        lastName?: string;
        username?: string;
        isSuperAdmin?: boolean;
      };
    }

    interface Session {
      user?: any;
      token?: string;
      expires?: string;
    }
  }
}

// Auth state cache to reduce database calls
const authCache = new Map<string, { user: any; timestamp: number }>();
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes
const AUTH_RATE_LIMIT = new Map<string, { count: number; timestamp: number }>();
const MAX_AUTH_CHECKS_PER_MINUTE = 30;

export const authenticateRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Skip auth for static assets and non-API routes
    if (req.path.startsWith('/assets/') || 
        req.path.startsWith('/static/') ||
        req.path.startsWith('/@') ||
        (req.path.includes('.') && !req.path.startsWith('/api/'))) {
      return next();
    }

    // OPTIMIZED: Trust valid sessions completely, no token re-validation needed
    if (req.session?.user && req.session?.expires) {
      const sessionExpiry = new Date(req.session.expires);
      
      // If session is still valid, trust it completely
      if (sessionExpiry > new Date()) {
        req.user = req.session.user;
        
        // Auto-extend session if it's more than halfway to expiry
        const now = new Date();
        const sessionDuration = sessionExpiry.getTime() - (sessionExpiry.getTime() - (7 * 24 * 60 * 60 * 1000));
        const halfwayPoint = sessionExpiry.getTime() - (sessionDuration / 2);
        
        if (now.getTime() > halfwayPoint) {
          const newExpiry = new Date();
          newExpiry.setTime(newExpiry.getTime() + (7 * 24 * 60 * 60 * 1000));
          req.session.expires = newExpiry.toISOString();
          req.session.touch();
        }
        
        return next();
      } else {
        // Clear expired session
        console.log('Session expired for user:', req.session.user?.email);
        req.session.destroy((err) => {
          if (err) console.error('Session destruction error:', err);
        });
      }
    }

    // Only validate tokens for NEW sessions or when session is missing
    let token: string | null = null;
    let user: any = null;

    // Check Authorization header for new authentication
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    // If we have a token, validate it and create session
    if (token) {
      // Check cache first
      const cacheKey = `token:${token.substring(0, 20)}`;
      const cached = authCache.get(cacheKey);

      if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
        user = cached.user;
      } else {
        // Validate with Supabase (only for new tokens)
        const { data: { user: supabaseUser }, error } = await supabase.auth.getUser(token);

        if (supabaseUser && !error) {
          user = {
            id: supabaseUser.id,
            email: supabaseUser.email,
            role: supabaseUser.user_metadata?.role || 'customer',
            firstName: supabaseUser.user_metadata?.firstName,
            lastName: supabaseUser.user_metadata?.lastName,
            username: supabaseUser.email?.split('@')[0],
            isSuperAdmin: supabaseUser.user_metadata?.is_super_admin || false,
          };

          // Cache the result
          authCache.set(cacheKey, { user, timestamp: Date.now() });
          
          // Create a new session to avoid future token validations
          if (req.session) {
            const sessionExpiry = new Date();
            sessionExpiry.setTime(sessionExpiry.getTime() + (7 * 24 * 60 * 60 * 1000));
            
            req.session.user = user;
            req.session.token = token;
            req.session.expires = sessionExpiry.toISOString();
            req.session.cookie.maxAge = 7 * 24 * 60 * 60 * 1000;
            
            console.log('✅ New session created for user:', user.email);
          }
        }
      }
    }

    // Set user on request if found
    if (user) {
      req.user = user;
    }

    next();
  } catch (error) {
    console.error('Authentication middleware error:', error);
    next();
  }
};

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    next();
  } catch (error) {
    console.error('RequireAuth error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication error'
    });
  }
}

export const requireRole = (roles: string | string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Insufficient permissions',
        requiredRoles: allowedRoles,
        userRole: req.user.role
      });
    }

    next();
  };
};

export async function loginUser(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    console.log('Login attempt for:', email);

    // Authenticate with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error || !data.user || !data.session) {
      console.log('Login failed:', error?.message);
      return res.status(401).json({
        success: false,
        message: error?.message || 'Invalid credentials'
      });
    }

    console.log('Login successful for user:', data.user.id);

    // Prepare user object
    const user = {
      id: data.user.id,
      email: data.user.email!,
      role: data.user.user_metadata?.role || 'customer',
      firstName: data.user.user_metadata?.firstName || '',
      lastName: data.user.user_metadata?.lastName || '',
      username: data.user.email?.split('@')[0] || '',
      isSuperAdmin: data.user.user_metadata?.is_super_admin || false,
      visiblePages: data.user.user_metadata?.visiblePages || [],
    };

    // Store in session with longer expiry for better UX
    const sessionExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    
    // Initialize session object if it doesn't exist
    if (!req.session) {
      console.error('Session middleware not initialized');
      return res.status(500).json({
        success: false,
        message: 'Session configuration error'
      });
    }
    
    req.session.user = user;
    req.session.token = data.session.access_token;
    req.session.expires = sessionExpiry.toISOString();
    req.session.cookie.maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
    
    // Mark session as authenticated to avoid re-validation
    req.session.authenticated = true;
    req.session.lastValidated = new Date().toISOString();

    // Clear any cached auth data for this user
    authCache.forEach((value, key) => {
      if (value.user?.id === user.id) {
        authCache.delete(key);
      }
    });

    console.log('Session created, expires:', sessionExpiry);

    return res.json({
      success: true,
      message: 'Login successful',
      user,
      session: {
        token: data.session.access_token,
        expiresAt: sessionExpiry.toISOString()
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

export async function logoutUser(req: Request, res: Response) {
  try {
    // Clear any cached auth data
    if (req.user?.id) {
      authCache.forEach((value, key) => {
        if (value.user?.id === req.user!.id) {
          authCache.delete(key);
        }
      });
    }

    // Destroy session
    if (req.session) {
      req.session.destroy((err) => {
        if (err) {
          console.warn('Session destruction error:', err);
        }
      });
    }

    return res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({
      success: false,
      message: 'Logout error'
    });
  }
}

export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    // Check session first
    if (!req.session || !req.session.token) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    const token = req.session.token;

    // Validate token with Supabase
    const { data: user, error } = await supabase.auth.getUser(token);

    if (error || !user.user) {
      // Clear invalid session
      req.session.destroy((err) => {
        if (err) console.error('Session destroy error:', err);
      });

      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    // Skip profile lookup to avoid RLS issues - use user metadata instead
    const userFromAuth = user.user;
    const profile = {
      id: userFromAuth.id,
      email: userFromAuth.email,
      role: userFromAuth.user_metadata?.role || 'customer',
      first_name: userFromAuth.user_metadata?.firstName || '',
      last_name: userFromAuth.user_metadata?.lastName || '',
      username: userFromAuth.email?.split('@')[0] || '',
      is_super_admin: userFromAuth.user_metadata?.is_super_admin || false,
      visible_pages: userFromAuth.user_metadata?.visiblePages || []
    };

    // Update session expiry
    req.session.touch();

    res.json({
      success: true,
      user: {
        id: profile.id,
        email: profile.email,
        role: profile.role,
        firstName: profile.first_name,
        lastName: profile.last_name,
        username: profile.username,
        isSuperAdmin: profile.is_super_admin,
        visiblePages: profile.visible_pages || []
      }
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Default export for backward compatibility
export default {
  authenticateRequest,
  requireAuth,
  requireRole,
  loginUser,
  logoutUser,
  getCurrentUser
};
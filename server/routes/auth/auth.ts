import { Request, Response, NextFunction } from 'express';
import { supabase } from '../../db';

// Custom interface to extend Express Request and Session
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
    
    interface Session {
      auth?: {
        token?: string;
        user?: any;
      };
    }
  }
}

/**
 * Authenticate requests using Supabase Auth
 */
// Cache for user sessions to reduce DB calls
const userCache = new Map<string, { user: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const authenticateRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Skip auth middleware for static assets and non-API routes to prevent loops
    if (req.path.startsWith('/assets/') || 
        req.path.startsWith('/static/') ||
        req.path.startsWith('/@') ||
        req.path.includes('.') && !req.path.startsWith('/api/')) {
      return next();
    }

    // Only log for API routes to reduce console spam
    const shouldLog = req.path.startsWith('/api/');
    
    if (shouldLog) {
      console.log('=== Authentication Debug ===');
      console.log('Headers:', req.headers.authorization ? 'Present' : 'Missing');
      console.log('Session:', req.session ? 'Present' : 'Missing');
    }
    
    let token = null;
    
    // First check Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const [bearer, headerToken] = authHeader.split(' ');
      if (bearer === 'Bearer' && headerToken) {
        token = headerToken;
        console.log('Using token from Authorization header');
      }
    }
    
    // Fallback to session token
    if (!token && req.session?.auth?.token) {
      token = req.session.auth.token;
      console.log('Using token from session');
    }
    
    if (!token) {
      if (shouldLog) {
        console.log('No token found, proceeding unauthenticated');
      }
      return next();
    }
    
    // Validate token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      if (shouldLog) {
        console.log('Token validation failed:', error?.message || 'No user found');
      }
      return next();
    }
    
    if (shouldLog) {
      console.log('Token validated successfully for user:', user.email);
    }
    
    // Store authenticated user in request with fallback data
    req.user = {
      id: user.id,
      email: user.email,
      role: user.user_metadata?.role || 'customer',
      is_super_admin: user.user_metadata?.is_super_admin || false,
      email_verified: user.user_metadata?.email_verified || user.email_confirmed_at != null,
      // Include raw user data as fallback
      ...user.user_metadata
    };
    
    if (shouldLog) {
      console.log('User authenticated:', req.user.email, 'Role:', req.user.role);
    }
    
    next();
  } catch (err) {
    console.error('Authentication error:', err);
    next();
  }
};

/**
 * Middleware to require authentication
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
  
  next();
};

/**
 * Middleware to require specific role
 */
export const requireRole = (roles: string | string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }
    
    next();
  };
};

// Default export for backward compatibility
export default {
  authenticateRequest,
  requireAuth,
  requireRole
};
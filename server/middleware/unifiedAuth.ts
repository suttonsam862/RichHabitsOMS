
import { Request, Response, NextFunction } from 'express';
import { supabase } from '../db';

// Extend Express types
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
  }
}

// Unified authentication that handles both session and token auth
export const unifiedAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Skip auth for static assets and health checks
    if (req.path.startsWith('/assets/') || 
        req.path.startsWith('/static/') ||
        req.path === '/api/health' ||
        req.path === '/api/ready') {
      return next();
    }

    let user: any = null;

    // 1. Check existing session first (fastest)
    if (req.session?.user && req.session?.expires) {
      const sessionExpiry = new Date(req.session.expires);
      if (sessionExpiry > new Date()) {
        req.user = req.session.user;
        return next();
      }
    }

    // 2. Check Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      try {
        // Validate token with Supabase
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

          // Create session for future requests
          if (req.session) {
            const sessionExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
            req.session.user = user;
            req.session.expires = sessionExpiry.toISOString();
            req.session.authenticated = true;
          }

          req.user = user;
        }
      } catch (error) {
        console.error('Token validation error:', error);
      }
    }

    // 3. Check cookies (fallback)
    if (!user && req.session?.token) {
      try {
        const { data: { user: supabaseUser }, error } = await supabase.auth.getUser(req.session.token);
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
          req.user = user;
        }
      } catch (error) {
        console.error('Session token validation error:', error);
      }
    }

    next();
  } catch (error) {
    console.error('Unified auth error:', error);
    next();
  }
};

// Require authentication middleware
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }
  next();
};

// Role-based access control
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

export default { unifiedAuth, requireAuth, requireRole };

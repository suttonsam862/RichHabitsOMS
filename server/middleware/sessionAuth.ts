
import { Request, Response, NextFunction } from 'express';
import { supabase } from '../db';

// Session-based auth that minimizes database calls
export const sessionBasedAuth = (req: Request, res: Response, next: NextFunction) => {
  // Skip auth for static assets
  if (req.path.startsWith('/assets/') || 
      req.path.startsWith('/static/') ||
      !req.path.startsWith('/api/')) {
    return next();
  }

  // Trust valid sessions completely - no database calls needed
  if (req.session?.authenticated && 
      req.session?.user && 
      req.session?.expires &&
      new Date(req.session.expires) > new Date()) {
    
    req.user = req.session.user;
    
    // Auto-extend sessions close to expiry (no DB call)
    const expiryTime = new Date(req.session.expires).getTime();
    const now = Date.now();
    const timeUntilExpiry = expiryTime - now;
    const sessionDuration = 7 * 24 * 60 * 60 * 1000; // 7 days
    
    // If less than 1 day remaining, extend it
    if (timeUntilExpiry < (24 * 60 * 60 * 1000)) {
      const newExpiry = new Date(now + sessionDuration);
      req.session.expires = newExpiry.toISOString();
      req.session.touch();
      console.log('🔄 Session extended for user:', req.user.email);
    }
    
    return next();
  }

  // If no valid session, require fresh authentication
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required - no valid session'
    });
  }

  // Only validate new tokens (not cached sessions)
  next();
};

// Middleware specifically for protecting routes that require authentication
export const requireSession = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Valid session required'
    });
  }
  next();
};

// Middleware for role-based access using session data
export const requireSessionRole = (roles: string | string[]) => {
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

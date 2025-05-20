import { Request, Response, NextFunction } from 'express';
import { supabase } from './db';

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
export const authenticateRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      // No auth header, check for session token in cookies
      const token = req.session?.auth?.token || null;
      
      if (!token) {
        return next(); // Unauthenticated request
      }

      // Validate token with Supabase
      const { data: { user }, error } = await supabase.auth.getUser(token);
      
      if (error || !user) {
        // Invalid or expired token
        return next();
      }
      
      // Get user profile from database
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      // Store authenticated user in request
      req.user = {
        id: user.id,
        email: user.email,
        ...profile
      };
      
      return next();
    }
    
    // Parse Bearer token
    const [bearer, token] = authHeader.split(' ');
    
    if (bearer !== 'Bearer' || !token) {
      return next(); // Invalid auth header
    }
    
    // Validate token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      // Invalid or expired token
      return next();
    }
    
    // Get user profile from database
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    // Store authenticated user in request
    req.user = {
      id: user.id,
      email: user.email,
      ...profile
    };
    
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
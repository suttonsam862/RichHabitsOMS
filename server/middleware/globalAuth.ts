
import { Request, Response, NextFunction } from 'express';
import { supabase } from '../db';

// Global authentication state
let globalAuthState = {
  isAuthenticated: false,
  user: null as any,
  lastValidated: 0,
  validationInterval: 5 * 60 * 1000 // 5 minutes
};

// Unified authentication middleware that ALL routes will use
export const globalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Skip auth for static assets and health checks
    if (req.path.startsWith('/assets/') || 
        req.path.startsWith('/static/') ||
        req.path === '/api/health' ||
        req.path === '/api/ready') {
      return next();
    }

    let user: any = null;
    const now = Date.now();

    // Check for Authorization header (primary method)
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      try {
        // Validate token with Supabase
        const { data: { user: supabaseUser }, error } = await supabase.auth.getUser(token);
        
        if (supabaseUser && !error) {
          // Get user profile for role information
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('role, username, first_name, last_name, is_super_admin')
            .eq('id', supabaseUser.id)
            .single();

          user = {
            id: supabaseUser.id,
            email: supabaseUser.email,
            role: profile?.role || supabaseUser.user_metadata?.role || 'customer',
            firstName: profile?.first_name || supabaseUser.user_metadata?.firstName || '',
            lastName: profile?.last_name || supabaseUser.user_metadata?.lastName || '',
            username: profile?.username || supabaseUser.email?.split('@')[0] || '',
            isSuperAdmin: profile?.is_super_admin || supabaseUser.user_metadata?.is_super_admin || false,
          };

          // Update global auth state
          globalAuthState = {
            isAuthenticated: true,
            user,
            lastValidated: now,
            validationInterval: 5 * 60 * 1000
          };

          req.user = user;
        } else {
          // Clear global auth state on token failure
          globalAuthState = {
            isAuthenticated: false,
            user: null,
            lastValidated: now,
            validationInterval: 5 * 60 * 1000
          };
        }
      } catch (error) {
        console.error('Global auth token validation error:', error);
        globalAuthState = {
          isAuthenticated: false,
          user: null,
          lastValidated: now,
          validationInterval: 5 * 60 * 1000
        };
      }
    }

    // Use cached auth state if recent and valid
    if (!user && globalAuthState.isAuthenticated && 
        (now - globalAuthState.lastValidated) < globalAuthState.validationInterval) {
      req.user = globalAuthState.user;
    }

    next();
  } catch (error) {
    console.error('Global auth middleware error:', error);
    // Clear global auth state on any error
    globalAuthState = {
      isAuthenticated: false,
      user: null,
      lastValidated: Date.now(),
      validationInterval: 5 * 60 * 1000
    };
    next();
  }
};

// Require authentication middleware
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user || !globalAuthState.isAuthenticated) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required - global auth validation failed'
    });
  }
  next();
};

// Role-based access control
export const requireRole = (roles: string | string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !globalAuthState.isAuthenticated) {
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

// Admin access middleware
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user || !globalAuthState.isAuthenticated) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (req.user.role !== 'admin' && !req.user.isSuperAdmin) {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }

  next();
};

export default { globalAuth, requireAuth, requireRole, requireAdmin };

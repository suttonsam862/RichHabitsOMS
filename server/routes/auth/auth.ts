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

// Rate limiting for auth checks to prevent spam
const authCheckLimiter = new Map<string, { count: number; timestamp: number }>();
const AUTH_CHECK_LIMIT = 10; // Max 10 checks per minute per IP
const AUTH_CHECK_WINDOW = 60 * 1000; // 1 minute

export const authenticateRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Skip auth middleware for static assets and non-API routes to prevent loops
    if (req.path.startsWith('/assets/') || 
        req.path.startsWith('/static/') ||
        req.path.startsWith('/@') ||
        req.path.includes('.') && !req.path.startsWith('/api/')) {
      return next();
    }

    // Rate limiting for auth checks to prevent spam
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    const authLimitKey = `${clientIP}:${req.path}`;
    
    if (req.path === '/api/auth/me') {
      const limitData = authCheckLimiter.get(authLimitKey);
      
      if (limitData) {
        if (now - limitData.timestamp < AUTH_CHECK_WINDOW) {
          if (limitData.count >= AUTH_CHECK_LIMIT) {
            // Too many requests, return cached response
            return res.status(401).json({
              success: false,
              message: 'Not authenticated',
              cached: true
            });
          }
          limitData.count++;
        } else {
          // Reset window
          authCheckLimiter.set(authLimitKey, { count: 1, timestamp: now });
        }
      } else {
        authCheckLimiter.set(authLimitKey, { count: 1, timestamp: now });
      }
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

    // For development mode, allow only specific secure test tokens
    if (process.env.NODE_ENV === 'development' && token && token.startsWith('dev-test-token-')) {
      const testRole = token.split('-').pop();
      if (['admin', 'salesperson', 'designer', 'manufacturer', 'customer'].includes(testRole!)) {
        if (shouldLog) {
          console.log('Development mode: Using secure test token for role:', testRole);
        }
        req.user = {
          id: `dev-test-${testRole}`,
          email: `test-${testRole}@threadcraft.dev`,
          role: testRole!,
          is_super_admin: testRole === 'admin',
          email_verified: true
        };
        return next();
      }
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
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    console.log('=== Authentication Debug ===');
    console.log('Headers:', req.headers.authorization ? 'Present' : 'Missing');
    console.log('Session:', req.session ? 'Present' : 'Missing');

    let token: string | undefined;

    // Check Authorization header first
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
      console.log('Using token from Authorization header');
    }
    // Fallback to session
    else if (req.session?.token) {
      token = req.session.token;
      console.log('Using token from session');
    }

    if (!token) {
      console.log('No token found');
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // SECURITY FIX: Removed dangerous development bypass  
    // Previous code was a critical vulnerability allowing any token > 10 chars

    // For development, use specific secure test tokens only
    if (process.env.NODE_ENV === 'development' && token.startsWith('dev-test-token-')) {
      const testRole = token.split('-').pop();
      if (['admin', 'salesperson', 'designer', 'manufacturer', 'customer'].includes(testRole!)) {
        console.log('⚠️  Development mode: Using secure test token for role:', testRole);
        req.user = {
          id: `dev-test-${testRole}`,
          email: `test-${testRole}@threadcraft.dev`,
          role: testRole!
        };
        return next();
      }
    }

    // Validate JWT format before attempting Supabase validation
    const tokenSegments = token.split('.');
    if (tokenSegments.length !== 3) {
      console.log('🚨 401 REJECTION - Malformed JWT token');
      console.log(`   Path: ${req.method} ${req.path}`);
      console.log(`   Reason: Invalid JWT format - token has ${tokenSegments.length} segments instead of 3`);
      console.log(`   Token preview: ${token.substring(0, 20)}...`);
      
      return res.status(401).json({
        success: false,
        message: 'Invalid token format',
        error: 'Token contains an invalid number of segments'
      });
    }

    try {
      // Try to validate the token with Supabase
      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (error || !user) {
        console.log('🚨 401 REJECTION - Supabase token validation failed');
        console.log(`   Path: ${req.method} ${req.path}`);
        console.log(`   Reason: ${error?.message || 'No user found for token'}`);
        console.log(`   Token preview: ${token.substring(0, 20)}...`);

        return res.status(401).json({ 
          success: false,
          message: 'Invalid or expired token',
          error: error?.message 
        });
      }

    console.log('Token validated successfully for user:', user.email);

    // Get user role from metadata, default to customer
    const userRole = user.user_metadata?.role || 'customer';

    // Attach user info to request
    req.user = {
      id: user.id,
      email: user.email!,
      role: userRole
    };

    console.log('User authenticated:', req.user.email, 'Role:', req.user.role);

    // Update session with fresh token info if using session
    if (req.session && req.session.token) {
      req.session.user = req.user;
      req.session.expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours
    }

    next();
  } catch (jwtError: any) {
    console.log('🚨 401 REJECTION - JWT token validation error');
    console.log(`   Path: ${req.method} ${req.path}`);
    console.log(`   Reason: JWT parsing/validation failed - ${jwtError?.message || 'Unknown JWT error'}`);
    console.log(`   Token preview: ${token?.substring(0, 20)}...`);

    return res.status(401).json({
      success: false,
      message: 'Invalid JWT token format',
      error: jwtError?.message || 'Token validation failed'
    });
  }
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({
      success: false,
      message: 'Authentication failed'
    });
  }
}

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

//login
export async function loginUser(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    console.log('Attempting login for user:', email);

    // Authenticate with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      console.error('Login error:', error.message);
      return res.status(401).json({
        success: false,
        message: error.message
      });
    }

    if (!data.user || !data.session) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    console.log('User authenticated successfully:', data.user.id);

    // Log user metadata for debugging
    console.log('User metadata from Supabase Auth:', data.user.user_metadata);

    // Get user role from metadata
    let userRole = data.user.user_metadata?.role || 'customer';

    // Special handling for super admin
    if (data.user.user_metadata?.is_super_admin) {
      console.log('User is a super admin, setting role to admin');
      userRole = 'admin';
    }

    // Try to get user profile
    let userProfile = null;
    try {
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.log('Could not fetch user profile');
      } else {
        userProfile = profile;
      }
    } catch (profileError) {
      console.warn('Profile operation failed:', profileError);
    }

    const user = {
      id: data.user.id,
      email: data.user.email!,
      role: userRole,
      firstName: data.user.user_metadata?.firstName || userProfile?.first_name || '',
      lastName: data.user.user_metadata?.lastName || userProfile?.last_name || '',
      customRole: data.user.user_metadata?.customRole,
      visiblePages: data.user.user_metadata?.visiblePages
    };

    // Store in session with proper expiration (extend session time)
    const sessionExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
    req.session.user = user;
    req.session.token = data.session.access_token;
    req.session.expires = sessionExpiry.toISOString();
    req.session.cookie.maxAge = 24 * 60 * 60 * 1000; // 24 hours

    console.log('Login successful, session expires at:', sessionExpiry);

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

// Default export for backward compatibility
export default {
  authenticateRequest,
  requireAuth,
  requireRole
};
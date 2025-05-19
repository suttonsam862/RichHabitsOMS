import { supabase } from './supabase';
import express, { Request, Response, NextFunction } from 'express';
import session from 'express-session';
import MemoryStore from 'memorystore';

// Setup session store
const MemoryStoreSession = MemoryStore(session);

export interface SupabaseUser {
  id: string;
  email: string;
  role: 'admin' | 'salesperson' | 'designer' | 'manufacturer' | 'customer';
  username?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  company?: string;
  stripeCustomerId?: string;
}

export function configureAuth(app: express.Express) {
  // Configure session middleware
  app.use(
    session({
      cookie: {
        maxAge: 86400000, // 24 hours
        secure: process.env.NODE_ENV === 'production',
      },
      store: new MemoryStoreSession({
        checkPeriod: 86400000, // prune expired entries every 24h
      }),
      resave: false,
      saveUninitialized: false,
      secret: process.env.SESSION_SECRET || 'threadcraft-app-secret',
    })
  );

  // Add middleware to check supabase auth on each request
  app.use(async (req: Request, res: Response, next: NextFunction) => {
    // Skip auth check for public routes, static files, and the root/client-side routes
    if (
      req.path === '/api/auth/login' ||
      req.path === '/api/auth/register' ||
      req.path === '/api/health' ||
      req.path.startsWith('/uploads/') ||
      req.path.startsWith('/assets/') ||
      // Skip auth check for static files and client-side routes
      !req.path.startsWith('/api/') ||
      req.method === 'GET'
    ) {
      return next();
    }

    // If user is already authenticated in the session, continue
    if (req.session.user) {
      req.user = req.session.user;
      return next();
    }

    // Check for auth header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      try {
        // Validate the token with Supabase
        const { data: { user }, error } = await supabase.auth.getUser(token);
        
        if (error || !user) {
          console.log('Invalid token:', error?.message);
          return res.status(401).json({ message: 'Unauthorized' });
        }

        // Get user metadata/info
        const userData = user.user_metadata as {
          role: 'admin' | 'salesperson' | 'designer' | 'manufacturer' | 'customer';
          username?: string;
          firstName?: string;
          lastName?: string;
        };

        // Create session user
        const sessionUser: SupabaseUser = {
          id: user.id,
          email: user.email || '',
          role: userData.role || 'customer', // Default to customer if no role
          username: userData.username,
          firstName: userData.firstName,
          lastName: userData.lastName
        };

        // Store in session
        req.session.user = sessionUser;
        req.user = sessionUser;
        
        return next();
      } catch (err) {
        console.error('Token validation error:', err);
        return res.status(401).json({ message: 'Unauthorized' });
      }
    }

    // If not authenticated through any method, return 401
    return res.status(401).json({ message: 'Unauthorized' });
  });

  // Authentication middleware
  return {
    // Middleware to ensure user is authenticated
    isAuthenticated: (req: Request, res: Response, next: NextFunction) => {
      if (req.user) {
        return next();
      }
      res.status(401).json({ message: 'Unauthorized' });
    },

    // Middleware to check if user has the required role
    hasRole: (role: string | string[]) => {
      return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
          return res.status(401).json({ message: 'Unauthorized' });
        }

        const user = req.user as SupabaseUser;
        
        if (Array.isArray(role)) {
          if (role.includes(user.role)) {
            return next();
          }
        } else if (user.role === role) {
          return next();
        }

        return res.status(403).json({ message: 'Forbidden' });
      };
    },
  };
}

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: SupabaseUser;
    }
    interface Session {
      user?: SupabaseUser;
    }
  }
}
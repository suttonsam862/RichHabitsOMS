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
    // Skip auth check for public routes
    if (
      req.path === '/api/auth/login' ||
      req.path === '/api/auth/register' ||
      req.path === '/api/health' ||
      !req.path.startsWith('/api/')
    ) {
      return next();
    }

    const token = req.session.token || (req.headers.authorization?.startsWith('Bearer ') && 
      req.headers.authorization.substring(7));

    if (!token) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      
      if (error || !user) {
        return res.status(401).json({ message: 'Invalid token' });
      }

      // Only store essential user data from Supabase Auth
      req.user = {
        id: user.id,
        email: user.email || '',
        role: user.user_metadata.role || 'customer'
      };
      
      return next();
    } catch (err) {
      console.error('Token validation error:', err);
      return res.status(401).json({ message: 'Unauthorized' });
    }
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
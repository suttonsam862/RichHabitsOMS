import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { compare } from "bcrypt";
import { storage } from "./storage";
import { supabase } from "./supabase";
import type { User } from "@shared/schema";
import express, { Request, Response, NextFunction } from "express";
import session from "express-session";
import MemoryStore from "memorystore";

// Setup session store
const MemoryStoreSession = MemoryStore(session);

export function configureAuth(app: express.Express) {
  // Configure session middleware
  app.use(
    session({
      cookie: {
        maxAge: 86400000, // 24 hours
        secure: process.env.NODE_ENV === "production",
      },
      store: new MemoryStoreSession({
        checkPeriod: 86400000, // prune expired entries every 24h
      }),
      resave: false,
      saveUninitialized: false,
      secret: process.env.SESSION_SECRET || "threadcraft-app-secret",
    })
  );

  // Initialize passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure local strategy using Supabase Auth when possible
  passport.use(
    new LocalStrategy(
      { usernameField: "email" },
      async (email, password, done) => {
        try {
          console.log(`Attempting login for email: ${email}`);
          
          // First try to authenticate with Supabase
          const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email,
            password
          });
          
          if (!authError && authData?.user) {
            console.log('Authenticated with Supabase Auth');
            
            // Get the full user profile from our users table
            const user = await storage.getUserByEmail(email);
            if (user) {
              return done(null, user);
            }
            
            // If user exists in Supabase Auth but not in our users table,
            // we should create a record in our users table
            console.log('User exists in Supabase Auth but not in our users table');
            return done(null, false, { message: "User account not fully set up" });
          }
          
          // If Supabase Auth fails, fall back to our custom implementation
          console.log('Falling back to custom authentication');
          const user = await storage.getUserByEmail(email);
          if (!user) {
            console.log('User not found');
            return done(null, false, { message: "Incorrect email or password" });
          }

          console.log('User found, comparing passwords');
          const passwordValid = await compare(password, user.password);
          console.log(`Password valid: ${passwordValid}`);
          if (!passwordValid) {
            return done(null, false, { message: "Incorrect email or password" });
          }

          // Also sign in with Supabase Auth to keep them in sync
          try {
            await supabase.auth.signInWithPassword({ email, password });
          } catch (e) {
            console.log('Failed to sync with Supabase Auth, continuing anyway');
          }

          return done(null, user);
        } catch (error) {
          console.error('Authentication error:', error);
          return done(error);
        }
      }
    )
  );

  // Serialize and deserialize user
  passport.serializeUser((user: Express.User, done) => {
    done(null, (user as User).id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Authentication middleware
  return {
    // Middleware to ensure user is authenticated
    isAuthenticated: (req: Request, res: Response, next: NextFunction) => {
      if (req.isAuthenticated()) {
        return next();
      }
      res.status(401).json({ message: "Unauthorized" });
    },

    // Middleware to check if user has the required role
    hasRole: (role: string | string[]) => {
      return (req: Request, res: Response, next: NextFunction) => {
        if (!req.isAuthenticated()) {
          return res.status(401).json({ message: "Unauthorized" });
        }

        const user = req.user as User;
        
        if (Array.isArray(role)) {
          if (role.includes(user.role)) {
            return next();
          }
        } else if (user.role === role) {
          return next();
        }

        return res.status(403).json({ message: "Forbidden" });
      };
    },
  };
}

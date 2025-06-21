import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to authenticate user
 */
export function authenticateUser(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  next();
}

/**
 * Middleware to verify that the user is an admin
 * This provides an additional layer of security for admin routes
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  // Check if the user is authenticated and is an admin
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  // Check if user has admin role
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden: Admin access required' });
  }
  
  // User is authenticated and is an admin, proceed
  next();
}

/**
 * Middleware to require specific roles
 */
export function requireRole(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    if (!req.user?.role || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
    }
    
    next();
  };
}
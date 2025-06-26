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
 * Middleware to require authentication (checks both session and token)
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  // Check session authentication first
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }

  // Check for authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('=== Authentication Debug ===');
    console.log('Headers:', authHeader ? 'Present' : 'Missing');
    console.log('Session:', req.isAuthenticated ? (req.isAuthenticated() ? 'Present' : 'Missing') : 'No session method');
    console.log('No token found, proceeding unauthenticated');
    return res.status(401).json({ 
      success: false, 
      message: 'Authentication required' 
    });
  }

  // For now, we'll accept any bearer token as valid
  // In production, you'd verify this token properly
  const token = authHeader.substring(7);
  if (token) {
    // Set a dummy user for now - replace with proper token validation
    req.user = { 
      id: 'authenticated-user', 
      role: 'admin',
      email: 'user@example.com' 
    };
    return next();
  }

  return res.status(401).json({ 
    success: false, 
    message: 'Authentication required' 
  });
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
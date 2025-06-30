
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { Request, Response, NextFunction } from 'express';

// General API rate limiting
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limiting for authentication endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

// Create account limiting
export const createAccountLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // limit each IP to 3 account creations per hour
  message: {
    success: false,
    message: 'Too many accounts created from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Password reset limiting
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // limit each IP to 3 password reset requests per hour
  message: {
    success: false,
    message: 'Too many password reset attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Security headers
export const securityHeaders = helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'development' ? false : {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      connectSrc: ["'self'", "wss:", "https:"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"]
    }
  },
  crossOriginEmbedderPolicy: false
});

// CORS configuration
export const corsOptions = {
  origin: (origin: string | undefined, callback: Function) => {
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    // Allow localhost and Replit domains
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5000',
      'https://9a09c15e-e041-45c1-b33a-b993b4ad0a54-00-2s8p16rwqqhd6.kirk.replit.dev'
    ];
    
    if (allowedOrigins.includes(origin) || origin.includes('.replit.dev')) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  optionsSuccessStatus: 200
};

// Request sanitization
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  // Remove any potential XSS attempts from request body
  if (req.body) {
    const sanitizeValue = (value: any): any => {
      if (typeof value === 'string') {
        return value
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+=/gi, '');
      }
      if (typeof value === 'object' && value !== null) {
        for (const key in value) {
          value[key] = sanitizeValue(value[key]);
        }
      }
      return value;
    };
    
    req.body = sanitizeValue(req.body);
  }
  
  next();
};

// File upload security
export const fileUploadSecurity = (req: Request, res: Response, next: NextFunction) => {
  // Check file types and sizes
  if (req.file) {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: 'File type not allowed'
      });
    }
    
    if (req.file.size > maxSize) {
      return res.status(400).json({
        success: false,
        message: 'File size too large'
      });
    }
  }
  
  next();
};

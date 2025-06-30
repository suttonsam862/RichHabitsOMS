

import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  status?: string;
  isOperational?: boolean;
  code?: string;
}

export class ValidationError extends Error {
  statusCode = 400;
  status = 'fail';
  isOperational = true;

  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends Error {
  statusCode = 401;
  status = 'fail';
  isOperational = true;

  constructor(message: string = 'Authentication required') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error {
  statusCode = 403;
  status = 'fail';
  isOperational = true;

  constructor(message: string = 'Insufficient permissions') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends Error {
  statusCode = 404;
  status = 'fail';
  isOperational = true;

  constructor(message: string = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class DatabaseError extends Error {
  statusCode = 500;
  status = 'error';
  isOperational = true;

  constructor(message: string = 'Database operation failed') {
    super(message);
    this.name = 'DatabaseError';
  }
}

// Ultra-comprehensive error logging function
function logError(err: AppError, req: Request, additionalContext: any = {}) {
  const timestamp = new Date().toISOString();
  const requestId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  console.error('\n🚨 === COMPREHENSIVE ERROR LOG ===');
  console.error(`📅 Timestamp: ${timestamp}`);
  console.error(`🆔 Request ID: ${requestId}`);
  console.error(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Request Details
  console.error('\n📡 REQUEST DETAILS:');
  console.error(`   Method: ${req.method}`);
  console.error(`   URL: ${req.originalUrl}`);
  console.error(`   Path: ${req.path}`);
  console.error(`   Query: ${JSON.stringify(req.query)}`);
  console.error(`   User Agent: ${req.get('User-Agent') || 'Unknown'}`);
  console.error(`   IP Address: ${req.ip || req.connection.remoteAddress || 'Unknown'}`);
  console.error(`   Referrer: ${req.get('Referer') || 'Direct'}`);
  
  // Authentication Context
  console.error('\n🔐 AUTHENTICATION CONTEXT:');
  console.error(`   Session Exists: ${!!req.session}`);
  console.error(`   Session ID: ${req.session?.id || 'None'}`);
  console.error(`   User ID: ${(req as any).user?.id || 'Anonymous'}`);
  console.error(`   User Email: ${(req as any).user?.email || 'Unknown'}`);
  console.error(`   User Role: ${(req as any).user?.role || 'Unknown'}`);
  console.error(`   Auth Header: ${req.get('Authorization') ? 'Present' : 'Missing'}`);
  
  // Request Body (sanitized)
  if (req.body && Object.keys(req.body).length > 0) {
    const sanitizedBody = { ...req.body };
    // Remove sensitive fields
    delete sanitizedBody.password;
    delete sanitizedBody.token;
    delete sanitizedBody.secret;
    console.error('\n📝 REQUEST BODY (sanitized):');
    console.error(`   ${JSON.stringify(sanitizedBody, null, 2)}`);
  }
  
  // Error Details
  console.error('\n💥 ERROR DETAILS:');
  console.error(`   Error Type: ${err.name || 'Unknown'}`);
  console.error(`   Error Message: ${err.message}`);
  console.error(`   Status Code: ${err.statusCode || 500}`);
  console.error(`   Status: ${err.status || 'error'}`);
  console.error(`   Operational: ${err.isOperational || false}`);
  console.error(`   Error Code: ${err.code || 'Unknown'}`);
  
  // Stack Trace
  if (err.stack) {
    console.error('\n📚 STACK TRACE:');
    const stackLines = err.stack.split('\n');
    stackLines.forEach((line, index) => {
      console.error(`   ${index + 1}: ${line.trim()}`);
    });
  }
  
  // Database Context (if available)
  if (additionalContext.database) {
    console.error('\n🗄️ DATABASE CONTEXT:');
    console.error(`   Connection Status: ${additionalContext.database.connected || 'Unknown'}`);
    console.error(`   Active Connections: ${additionalContext.database.activeConnections || 'Unknown'}`);
    console.error(`   Last Query: ${additionalContext.database.lastQuery || 'Unknown'}`);
  }
  
  // Application State
  console.error('\n🖥️ APPLICATION STATE:');
  console.error(`   Memory Usage: ${JSON.stringify(process.memoryUsage(), null, 2)}`);
  console.error(`   Uptime: ${process.uptime()} seconds`);
  console.error(`   Node Version: ${process.version}`);
  console.error(`   Platform: ${process.platform}`);
  
  // Environment Variables (non-sensitive)
  console.error('\n🌍 ENVIRONMENT CHECK:');
  console.error(`   NODE_ENV: ${process.env.NODE_ENV || 'Not set'}`);
  console.error(`   SUPABASE_URL: ${process.env.SUPABASE_URL ? 'Set' : 'Missing'}`);
  console.error(`   DATABASE_URL: ${process.env.DATABASE_URL ? 'Set' : 'Missing'}`);
  console.error(`   SESSION_SECRET: ${process.env.SESSION_SECRET ? 'Set' : 'Missing'}`);
  
  // Additional Context
  if (Object.keys(additionalContext).length > 0) {
    console.error('\n🔍 ADDITIONAL CONTEXT:');
    console.error(JSON.stringify(additionalContext, null, 2));
  }
  
  console.error('\n=== END ERROR LOG ===\n');
}

const handleDatabaseError = (err: any): AppError => {
  console.error('\n🗄️ DATABASE ERROR ANALYSIS:');
  console.error(`   Error Code: ${err.code}`);
  console.error(`   Error Details: ${err.details}`);
  console.error(`   Error Hint: ${err.hint}`);
  console.error(`   Error Message: ${err.message}`);
  
  if (err.code === 'PGRST301') {
    console.error('   DIAGNOSIS: Resource not found in database - check if table/record exists');
    return new NotFoundError('Resource not found in database');
  }
  if (err.code === '23505') {
    console.error('   DIAGNOSIS: Duplicate entry detected - unique constraint violation');
    return new ValidationError('Duplicate entry detected');
  }
  if (err.code === '23503') {
    console.error('   DIAGNOSIS: Foreign key constraint violation - referenced resource missing');
    return new ValidationError('Referenced resource does not exist');
  }
  if (err.code === 'PGRST204') {
    console.error('   DIAGNOSIS: Column not found - database schema mismatch');
    return new DatabaseError(`Database schema error: ${err.message}`);
  }
  
  console.error('   DIAGNOSIS: General database error - check connection and query syntax');
  return new DatabaseError(err.message);
};

const handleJWTError = (): AppError => {
  console.error('\n🔐 JWT ERROR ANALYSIS:');
  console.error('   DIAGNOSIS: Invalid JWT token - token may be malformed, expired, or using wrong secret');
  return new AuthenticationError('Invalid token');
};

const handleJWTExpiredError = (): AppError => {
  console.error('\n🔐 JWT EXPIRED ERROR ANALYSIS:');
  console.error('   DIAGNOSIS: JWT token has expired - user needs to re-authenticate');
  return new AuthenticationError('Token expired');
};

const sendErrorDev = (err: AppError, res: Response) => {
  res.status(err.statusCode || 500).json({
    success: false,
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack
  });
};

const sendErrorProd = (err: AppError, res: Response) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode || 500).json({
      success: false,
      status: err.status,
      message: err.message
    });
  } else {
    // Programming or other unknown error: don't leak error details
    console.error('💥 CRITICAL PRODUCTION ERROR - SENSITIVE DETAILS HIDDEN FROM CLIENT');
    res.status(500).json({
      success: false,
      status: 'error',
      message: 'Something went wrong!'
    });
  }
};

export const globalErrorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Log comprehensive error details
  logError(err, req);

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else {
    let error = { ...err };
    error.message = err.message;

    if (error.code?.includes('PG') || error.code?.includes('PGRST')) error = handleDatabaseError(error);
    if (error.name === 'JsonWebTokenError') error = handleJWTError();
    if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();

    sendErrorProd(error, res);
  }
};

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch((err) => {
      console.error('\n⚡ ASYNC HANDLER ERROR CAUGHT:');
      console.error(`   Function: ${fn.name || 'Anonymous'}`);
      console.error(`   Route: ${req.method} ${req.path}`);
      console.error(`   Error: ${err.message}`);
      next(err);
    });
  };
};

export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  console.error('\n🔍 404 NOT FOUND ERROR:');
  console.error(`   Requested URL: ${req.originalUrl}`);
  console.error(`   Method: ${req.method}`);
  console.error(`   User Agent: ${req.get('User-Agent')}`);
  console.error(`   IP: ${req.ip}`);
  console.error('   DIAGNOSIS: Route not found - check if route is properly registered');
  
  const err = new NotFoundError(`Can't find ${req.originalUrl} on this server!`);
  next(err);
};


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

// Centralized error logging function with comprehensive request/exception capture
function logError(err: AppError, req: Request, additionalContext: any = {}) {
  const timestamp = new Date().toISOString();
  const requestId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  console.error('\n🚨 === COMPREHENSIVE ERROR LOG ===');
  console.error(`📅 Timestamp: ${timestamp}`);
  console.error(`🆔 Request ID: ${requestId}`);
  console.error(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);

  // Request Details
  console.error(`🔗 Method: ${req.method}`);
  console.error(`🔗 URL: ${req.originalUrl || req.url}`);
  console.error(`🔗 Path: ${req.path}`);
  console.error(`🌐 User Agent: ${req.get('User-Agent') || 'Unknown'}`);
  console.error(`📍 IP Address: ${req.ip || req.connection.remoteAddress || 'Unknown'}`);
  
  // Headers (exclude sensitive ones)
  const sanitizedHeaders = { ...req.headers };
  delete sanitizedHeaders.authorization;
  delete sanitizedHeaders.cookie;
  delete sanitizedHeaders['x-api-key'];
  console.error(`📋 Headers:`, JSON.stringify(sanitizedHeaders, null, 2));

  // Request Body (exclude sensitive fields)
  if (req.body && Object.keys(req.body).length > 0) {
    const sanitizedBody = { ...req.body };
    delete sanitizedBody.password;
    delete sanitizedBody.token;
    delete sanitizedBody.secret;
    delete sanitizedBody.apiKey;
    console.error(`📦 Request Body:`, JSON.stringify(sanitizedBody, null, 2));
  }

  // Query Parameters
  if (req.query && Object.keys(req.query).length > 0) {
    console.error(`🔍 Query Params:`, JSON.stringify(req.query, null, 2));
  }

  // Route Parameters
  if (req.params && Object.keys(req.params).length > 0) {
    console.error(`🎯 Route Params:`, JSON.stringify(req.params, null, 2));
  }

  // Session Information (if available)
  if (req.session) {
    const sessionInfo = {
      id: req.session.id,
      userId: (req.session as any).userId,
      userRole: (req.session as any).userRole,
      isAuthenticated: !!(req.session as any).userId
    };
    console.error(`👤 Session Info:`, JSON.stringify(sessionInfo, null, 2));
  }

  // User Context (if available from auth middleware)
  if ((req as any).user) {
    const userInfo = {
      id: (req as any).user.id,
      email: (req as any).user.email,
      role: (req as any).user.role
    };
    console.error(`👤 User Context:`, JSON.stringify(userInfo, null, 2));
  }

  // Error Details
  console.error(`💥 Error Type: ${err.name || 'Unknown'}`);
  console.error(`💥 Error Message: ${err.message}`);
  console.error(`💥 Status Code: ${err.statusCode || 500}`);
  console.error(`💥 Operational: ${err.isOperational || false}`);
  
  // Stack Trace (formatted for readability)
  if (err.stack) {
    console.error(`📚 Stack Trace:`);
    const stackLines = err.stack.split('\n');
    stackLines.slice(0, 10).forEach((line: string, index: number) => {
      console.error(`   ${index + 1}: ${line.trim()}`);
    });
  }

  // Memory Usage at Error Time
  const memUsage = process.memoryUsage();
  console.error(`🖥️ Memory Usage: RSS=${Math.round(memUsage.rss / 1024 / 1024)}MB, Heap=${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`);
  
  // Additional Context
  if (Object.keys(additionalContext).length > 0) {
    console.error(`🔍 Additional Context:`, JSON.stringify(additionalContext, null, 2));
  }

  console.error('=== END ERROR LOG ===\n');
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

const sendErrorResponse = (err: AppError, res: Response) => {
  // Don't leak error details in production
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (err.isOperational) {
    // Operational errors are safe to expose
    res.status(err.statusCode || 500).json({
      success: false,
      status: err.status,
      message: err.message,
      ...(isProduction ? {} : { stack: err.stack }),
    });
  } else {
    // Programming errors - don't leak details
    console.error('💀 CRITICAL: Unexpected Error:', err);
    res.status(500).json({
      success: false,
      status: 'error',
      message: isProduction ? 'Something went wrong!' : err.message,
      ...(isProduction ? {} : { stack: err.stack }),
    });
  }
};

// Global error handler middleware
export const globalErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let error: AppError = err;

  // Log all errors with comprehensive context
  logError(error, req);

  // Handle specific error types
  if (err.name === 'ValidationError') {
    error = new ValidationError(err.message);
  } else if (err.code?.startsWith('PG') || err.code?.match(/^\d{5}$/)) {
    error = handleDatabaseError(err);
  } else if (err.message?.includes('JWT') || err.message?.includes('token')) {
    error = new AuthenticationError('Invalid or expired token');
  } else if (err.name === 'ZodError') {
    error = new ValidationError('Invalid request data');
  }

  // Ensure all errors have required properties
  error.statusCode = error.statusCode || 500;
  error.status = error.status || 'error';
  error.isOperational = error.isOperational ?? false;

  sendErrorResponse(error, res);
};

// 404 handler for API routes
export const notFoundHandler = (req: Request, res: Response) => {
  const error = new NotFoundError(`Route ${req.originalUrl} not found`);
  logError(error, req);
  sendErrorResponse(error, res);
};

// Async wrapper for route handlers to catch async errors
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Centralized exception logger middleware - captures ALL thrown exceptions
export const centralizedExceptionLogger = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Store original methods
  const originalJson = res.json;
  const originalSend = res.send;
  const originalEnd = res.end;

  // Override res.json to capture error responses
  res.json = function(body: any) {
    if (res.statusCode >= 400) {
      console.error('\n🔥 === RESPONSE ERROR CAPTURED ===');
      console.error(`📅 Timestamp: ${new Date().toISOString()}`);
      console.error(`🔗 ${req.method} ${req.originalUrl}`);
      console.error(`📦 Request Body:`, JSON.stringify(req.body || {}, null, 2));
      console.error(`🚨 Response Status: ${res.statusCode}`);
      console.error(`💣 Response Body:`, JSON.stringify(body, null, 2));
      console.error('=== END RESPONSE ERROR ===\n');
    }
    return originalJson.call(this, body);
  };

  // Override res.send to capture text error responses
  res.send = function(body: any) {
    if (res.statusCode >= 400) {
      console.error('\n🔥 === RESPONSE ERROR CAPTURED (SEND) ===');
      console.error(`📅 Timestamp: ${new Date().toISOString()}`);
      console.error(`🔗 ${req.method} ${req.originalUrl}`);
      console.error(`📦 Request Body:`, JSON.stringify(req.body || {}, null, 2));
      console.error(`🚨 Response Status: ${res.statusCode}`);
      console.error(`💣 Response Body:`, body);
      console.error('=== END RESPONSE ERROR ===\n');
    }
    return originalSend.call(this, body);
  };

  next();
};

// Export the logError function for use in other modules
export { logError };
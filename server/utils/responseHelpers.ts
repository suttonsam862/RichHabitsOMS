
import { Response } from 'express';

/**
 * Standardized API response helpers
 * Ensures consistent response format across all endpoints
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp?: string;
}

/**
 * Send standardized success response
 */
export const sendSuccess = <T = any>(
  res: Response, 
  data: T, 
  message: string = 'Operation successful',
  statusCode: number = 200
): void => {
  res.status(statusCode).json({
    success: true,
    data,
    message,
    timestamp: new Date().toISOString()
  });
};

/**
 * Send standardized error response
 */
export const sendError = (
  res: Response,
  statusCode: number,
  message: string,
  error?: string
): void => {
  res.status(statusCode).json({
    success: false,
    message,
    error,
    timestamp: new Date().toISOString()
  });
};

/**
 * Send validation error response
 */
export const sendValidationError = (
  res: Response,
  errors: Record<string, string>,
  message: string = 'Validation failed'
): void => {
  res.status(400).json({
    success: false,
    message,
    errors,
    timestamp: new Date().toISOString()
  });
};

/**
 * Send not found response
 */
export const sendNotFound = (
  res: Response,
  resource: string = 'Resource'
): void => {
  sendError(res, 404, `${resource} not found`);
};

/**
 * Send unauthorized response
 */
export const sendUnauthorized = (
  res: Response,
  message: string = 'Unauthorized access'
): void => {
  sendError(res, 401, message);
};

/**
 * Send forbidden response
 */
export const sendForbidden = (
  res: Response,
  message: string = 'Access forbidden'
): void => {
  sendError(res, 403, message);
};

/**
 * Send internal server error response
 */
export const sendInternalError = (
  res: Response,
  error: Error,
  message: string = 'Internal server error'
): void => {
  console.error('Internal server error:', error);
  sendError(res, 500, message, error.message);
};

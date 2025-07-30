/**
 * Request validation utilities for ThreadCraft API
 * Provides comprehensive validation checks for required fields in req.body
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Validation error class for consistent error handling
 */
export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Validates that required fields exist in req.body
 * @param fields - Array of required field names
 * @returns Express middleware function
 */
export function validateRequiredFields(fields: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const missingFields: string[] = [];

    for (const field of fields) {
      if (!req.body[field] && req.body[field] !== 0 && req.body[field] !== false) {
        missingFields.push(field);
      }
    }

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`,
        missingFields
      });
    }

    next();
  };
}

/**
 * Validates email format
 * @param email - Email string to validate
 * @returns boolean indicating if email is valid
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates UUID format
 * @param uuid - UUID string to validate
 * @returns boolean indicating if UUID is valid
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validates phone number format (US and international)
 * @param phone - Phone string to validate
 * @returns boolean indicating if phone is valid
 */
export function isValidPhone(phone: string): boolean {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // US phone numbers: 10 digits
  // International: 7-15 digits
  return digits.length >= 7 && digits.length <= 15;
}

/**
 * Validates numeric values (including prices)
 * @param value - Value to validate
 * @returns boolean indicating if value is a valid number
 */
export function isValidNumber(value: any): boolean {
  const num = parseFloat(value);
  return !isNaN(num) && isFinite(num);
}

/**
 * Validates positive numeric values (for prices, quantities)
 * @param value - Value to validate
 * @returns boolean indicating if value is a positive number
 */
export function isValidPositiveNumber(value: any): boolean {
  const num = parseFloat(value);
  return !isNaN(num) && isFinite(num) && num > 0;
}

/**
 * Sanitizes string input by trimming whitespace
 * @param value - String to sanitize
 * @returns Sanitized string
 */
export function sanitizeString(value: any): string {
  if (typeof value !== 'string') {
    return String(value || '').trim();
  }
  return value.trim();
}

/**
 * Validates customer creation data
 * @param data - Customer data object
 * @returns Validation result with errors if any
 */
export function validateCustomerData(data: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.firstName || !sanitizeString(data.firstName)) {
    errors.push('firstName is required');
  }
  
  if (!data.lastName || !sanitizeString(data.lastName)) {
    errors.push('lastName is required');
  }

  if (!data.email || !isValidEmail(data.email)) {
    errors.push('Valid email is required');
  }

  if (data.phone && !isValidPhone(data.phone)) {
    errors.push('Valid phone number is required');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates catalog item creation data
 * @param data - Catalog item data object
 * @returns Validation result with errors if any
 */
export function validateCatalogItemData(data: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.name || !sanitizeString(data.name)) {
    errors.push('name is required');
  }

  if (!data.base_price && data.base_price !== 0) {
    errors.push('base_price is required');
  } else if (!isValidPositiveNumber(data.base_price)) {
    errors.push('base_price must be a positive number');
  }

  if (!data.category || !sanitizeString(data.category)) {
    errors.push('category is required');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates order creation data
 * @param data - Order data object
 * @returns Validation result with errors if any
 */
export function validateOrderData(data: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.customer_id || !isValidUUID(data.customer_id)) {
    errors.push('Valid customer_id is required');
  }

  if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
    errors.push('At least one order item is required');
  }

  // Validate each order item
  if (data.items && Array.isArray(data.items)) {
    data.items.forEach((item: any, index: number) => {
      if (!item.product_name || !sanitizeString(item.product_name)) {
        errors.push(`Item ${index + 1}: product_name is required`);
      }
      
      if (!item.unit_price && item.unit_price !== 0) {
        errors.push(`Item ${index + 1}: unit_price is required`);
      } else if (!isValidPositiveNumber(item.unit_price)) {
        errors.push(`Item ${index + 1}: unit_price must be a positive number`);
      }
      
      if (!item.quantity || !isValidPositiveNumber(item.quantity)) {
        errors.push(`Item ${index + 1}: quantity must be a positive number`);
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Express middleware for standardized API response format
 * Sets consistent response structure for success/error
 */
export function standardizeApiResponse() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Store original json method
    const originalJson = res.json;
    
    // Override json method to ensure consistent format
    res.json = function(body: any) {
      // If already in standard format, use as-is
      if (body && typeof body === 'object' && ('success' in body)) {
        return originalJson.call(this, body);
      }
      
      // Standardize successful responses
      if (res.statusCode >= 200 && res.statusCode < 400) {
        return originalJson.call(this, {
          success: true,
          data: body
        });
      }
      
      // Standardize error responses
      return originalJson.call(this, {
        success: false,
        message: body?.message || body || 'An error occurred'
      });
    };
    
    next();
  };
}
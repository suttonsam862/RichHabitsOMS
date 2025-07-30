/**
 * Common validation utilities for API routes
 */

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePassword(password: string): boolean {
  return password && password.length >= 6;
}

export function validateRequired(fields: Record<string, any>, requiredFields: string[]): string | null {
  const missingFields = requiredFields.filter(field => !fields[field]);
  if (missingFields.length > 0) {
    return `Missing required fields: ${missingFields.join(', ')} are required`;
  }
  return null;
}

export function validateRole(role: string): boolean {
  const validRoles = ['customer', 'salesperson', 'designer', 'manufacturer', 'admin'];
  return validRoles.includes(role);
}

export function createErrorResponse(message: string, statusCode: number = 400) {
  return {
    success: false,
    message
  };
}

export function createSuccessResponse(data: any) {
  return {
    success: true,
    data
  };
}
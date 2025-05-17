import { requireAdmin } from '../../server/middleware/adminAuth';
import { Request, Response, NextFunction } from 'express';

describe('Admin Authentication Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {};
    mockResponse = {
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis()
    };
    nextFunction = jest.fn();
  });

  test('should return 401 if user is not authenticated', () => {
    // Setup for unauthenticated request
    mockRequest.isAuthenticated = jest.fn().mockReturnValue(false);
    
    // Call middleware
    requireAdmin(mockRequest as Request, mockResponse as Response, nextFunction);
    
    // Assert response
    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Unauthorized' });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  test('should return 403 if user is not an admin', () => {
    // Setup for authenticated non-admin user
    mockRequest.isAuthenticated = jest.fn().mockReturnValue(true);
    mockRequest.user = { role: 'customer' };
    
    // Call middleware
    requireAdmin(mockRequest as Request, mockResponse as Response, nextFunction);
    
    // Assert response
    expect(mockResponse.status).toHaveBeenCalledWith(403);
    expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Forbidden: Admin access required' });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  test('should call next if user is authenticated as admin', () => {
    // Setup for authenticated admin user
    mockRequest.isAuthenticated = jest.fn().mockReturnValue(true);
    mockRequest.user = { role: 'admin' };
    
    // Call middleware
    requireAdmin(mockRequest as Request, mockResponse as Response, nextFunction);
    
    // Assert next was called
    expect(nextFunction).toHaveBeenCalled();
    expect(mockResponse.status).not.toHaveBeenCalled();
    expect(mockResponse.json).not.toHaveBeenCalled();
  });
});
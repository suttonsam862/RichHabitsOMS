import express from 'express';
import supertest from 'supertest';
import { registerRoutes } from '../../server/routes';
import { configureAuth } from '../../server/auth';
import { storage } from '../../server/storage';

// Mock the storage methods
jest.mock('../../server/storage', () => ({
  storage: {
    approveDesignTask: jest.fn(),
    assignManufacturerToOrder: jest.fn(),
    markOrderAsPaid: jest.fn(),
    getOrderStatistics: jest.fn(),
    getUsersByRole: jest.fn(),
    getRecentOrders: jest.fn()
  }
}));

describe('Admin Routes', () => {
  let app: express.Express;
  let server: any;
  let request: supertest.SuperTest<supertest.Test>;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    
    // Configure authentication
    configureAuth(app);
    
    // Add mock authentication middleware for testing
    app.use((req, res, next) => {
      if (req.headers['x-mock-user-role']) {
        req.isAuthenticated = () => true;
        req.user = { role: req.headers['x-mock-user-role'] as string };
      }
      next();
    });
    
    // Register the routes
    server = await registerRoutes(app);
    
    // Create the supertest instance
    request = supertest(app);
  });

  afterAll((done) => {
    if (server) {
      server.close(done);
    } else {
      done();
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Dashboard Stats Endpoint', () => {
    const endpoint = '/api/dashboard/stats';
    
    test('should return 401 when user is not authenticated', async () => {
      const response = await request.get(endpoint);
      expect(response.status).toBe(401);
    });
    
    test('should return 403 when user is not an admin', async () => {
      const response = await request
        .get(endpoint)
        .set('x-mock-user-role', 'customer');
      
      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('message', 'Forbidden: Admin access required');
    });
    
    test('should return 200 and stats data when user is admin', async () => {
      // Mock storage responses
      const mockOrderStats = [{ status: 'draft', count: 5 }];
      const mockUserCounts = [{ role: 'customer', count: 10 }];
      const mockOrders = [{ id: 1, orderNumber: 'ORD-001' }];
      
      (storage.getOrderStatistics as jest.Mock).mockResolvedValue(mockOrderStats);
      (storage.getUsersByRole as jest.Mock).mockResolvedValue(mockUserCounts);
      (storage.getRecentOrders as jest.Mock).mockResolvedValue(mockOrders);
      
      const response = await request
        .get(endpoint)
        .set('x-mock-user-role', 'admin');
      
      expect(response.status).toBe(200);
      expect(storage.getOrderStatistics).toHaveBeenCalled();
      expect(response.body).toHaveProperty('orderStats');
    });
  });

  describe('Assign Manufacturer Endpoint', () => {
    const orderId = 1;
    const manufacturerId = 2;
    const endpoint = `/api/orders/${orderId}/assign-manufacturer`;
    
    test('should return 401 when user is not authenticated', async () => {
      const response = await request
        .patch(endpoint)
        .send({ manufacturerId });
        
      expect(response.status).toBe(401);
    });
    
    test('should return 403 when user is not an admin', async () => {
      const response = await request
        .patch(endpoint)
        .set('x-mock-user-role', 'designer')
        .send({ manufacturerId });
      
      expect(response.status).toBe(403);
    });
    
    test('should return 200 and updated order when user is admin', async () => {
      const mockUpdatedOrder = { 
        id: orderId, 
        status: 'pending_production', 
        manufacturerId 
      };
      
      (storage.assignManufacturerToOrder as jest.Mock).mockResolvedValue(mockUpdatedOrder);
      
      const response = await request
        .patch(endpoint)
        .set('x-mock-user-role', 'admin')
        .send({ manufacturerId });
      
      expect(response.status).toBe(200);
      expect(storage.assignManufacturerToOrder).toHaveBeenCalledWith(orderId, manufacturerId);
      expect(response.body).toEqual(mockUpdatedOrder);
    });
  });

  describe('Approve Design Task Endpoint', () => {
    const taskId = 1;
    const endpoint = `/api/design-tasks/${taskId}/approve`;
    
    test('should return 401 when user is not authenticated', async () => {
      const response = await request.patch(endpoint);
      expect(response.status).toBe(401);
    });
    
    test('should return 403 when user is not an admin', async () => {
      const response = await request
        .patch(endpoint)
        .set('x-mock-user-role', 'manufacturer');
      
      expect(response.status).toBe(403);
    });
    
    test('should return 200 and updated task when user is admin', async () => {
      const mockUpdatedTask = { id: taskId, status: 'approved' };
      
      (storage.approveDesignTask as jest.Mock).mockResolvedValue(mockUpdatedTask);
      
      const response = await request
        .patch(endpoint)
        .set('x-mock-user-role', 'admin');
      
      expect(response.status).toBe(200);
      expect(storage.approveDesignTask).toHaveBeenCalledWith(taskId);
      expect(response.body).toEqual(mockUpdatedTask);
    });
  });

  describe('Mark Order as Paid Endpoint', () => {
    const orderId = 1;
    const endpoint = `/api/orders/${orderId}/mark-paid`;
    
    test('should return 401 when user is not authenticated', async () => {
      const response = await request.patch(endpoint);
      expect(response.status).toBe(401);
    });
    
    test('should return 403 when user is not an admin', async () => {
      const response = await request
        .patch(endpoint)
        .set('x-mock-user-role', 'salesperson');
      
      expect(response.status).toBe(403);
    });
    
    test('should return 200 and updated order when user is admin', async () => {
      const mockUpdatedOrder = { id: orderId, isPaid: true };
      
      (storage.markOrderAsPaid as jest.Mock).mockResolvedValue(mockUpdatedOrder);
      
      const response = await request
        .patch(endpoint)
        .set('x-mock-user-role', 'admin');
      
      expect(response.status).toBe(200);
      expect(storage.markOrderAsPaid).toHaveBeenCalledWith(orderId);
      expect(response.body).toEqual(mockUpdatedOrder);
    });
  });
});
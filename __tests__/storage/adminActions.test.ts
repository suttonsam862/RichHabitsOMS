import { DatabaseStorage } from '../../server/storage';
import { eq } from 'drizzle-orm';
import * as schema from '../../shared/schema';

// Mocking the database operations
jest.mock('../../server/db', () => {
  const mockSelect = jest.fn();
  const mockUpdate = jest.fn();
  
  return {
    db: {
      select: () => ({ from: () => ({ where: mockSelect }) }),
      update: () => ({ set: () => ({ where: () => ({ returning: mockUpdate }) }) })
    },
    mockSelect,
    mockUpdate
  };
});

describe('Admin Storage Methods', () => {
  let storage: DatabaseStorage;
  
  beforeEach(() => {
    storage = new DatabaseStorage();
    jest.clearAllMocks();
  });

  describe('approveDesignTask', () => {
    it('should approve a design task', async () => {
      // Mock data
      const taskId = 1;
      const mockTask = {
        id: taskId,
        status: 'submitted',
        orderId: 1
      };
      const mockOrder = {
        id: mockTask.orderId,
        status: 'design_review'
      };
      const mockUpdatedTask = {
        ...mockTask,
        status: 'approved'
      };
      const mockUpdatedOrder = {
        ...mockOrder,
        status: 'design_approved'
      };

      // Mock database responses
      const { mockSelect, mockUpdate } = require('../../server/db');
      mockSelect.mockResolvedValueOnce([mockTask]).mockResolvedValueOnce([mockOrder]);
      mockUpdate.mockResolvedValueOnce([mockUpdatedTask]).mockResolvedValueOnce([mockUpdatedOrder]);

      // Test the method
      const result = await storage.approveDesignTask(taskId);

      // Assertions
      expect(result).toEqual(mockUpdatedTask);
      expect(mockUpdate).toHaveBeenCalledTimes(2);
    });
  });

  describe('assignManufacturerToOrder', () => {
    it('should assign a manufacturer to an order', async () => {
      // Mock data
      const orderId = 1;
      const manufacturerId = 2;
      const mockOrder = {
        id: orderId,
        status: 'design_approved'
      };
      const mockUpdatedOrder = {
        ...mockOrder,
        status: 'pending_production',
        manufacturerId
      };

      // Mock database responses
      const { mockSelect, mockUpdate } = require('../../server/db');
      mockSelect.mockResolvedValueOnce([mockOrder]);
      mockUpdate.mockResolvedValueOnce([mockUpdatedOrder]);

      // Test the method
      const result = await storage.assignManufacturerToOrder(orderId, manufacturerId);

      // Assertions
      expect(result).toEqual(mockUpdatedOrder);
      expect(mockUpdate).toHaveBeenCalledTimes(1);
    });
  });

  describe('markOrderAsPaid', () => {
    it('should mark an order as paid', async () => {
      // Mock data
      const orderId = 1;
      const mockOrder = {
        id: orderId,
        status: 'draft',
        isPaid: false
      };
      const mockUpdatedOrder = {
        ...mockOrder,
        isPaid: true
      };

      // Mock database responses
      const { mockSelect, mockUpdate } = require('../../server/db');
      mockSelect.mockResolvedValueOnce([mockOrder]);
      mockUpdate.mockResolvedValueOnce([mockUpdatedOrder]);

      // Test the method
      const result = await storage.markOrderAsPaid(orderId);

      // Assertions
      expect(result).toEqual(mockUpdatedOrder);
      expect(mockUpdate).toHaveBeenCalledTimes(1);
    });
  });
});
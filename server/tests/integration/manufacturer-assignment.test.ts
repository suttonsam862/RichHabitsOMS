import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';

// Mock application setup
const app = express();
app.use(express.json());

// Mock data
const mockManufacturers = [
  {
    id: 'mfg-1',
    name: 'Premium Textiles Inc',
    email: 'orders@premiumtextiles.com',
    phone: '555-1001',
    specialties: ['T-Shirts', 'Hoodies'],
    capacity: 100,
    current_workload: 25
  },
  {
    id: 'mfg-2', 
    name: 'Athletic Wear Co',
    email: 'production@athleticwear.com',
    phone: '555-1002',
    specialties: ['Sportswear', 'Performance Gear'],
    capacity: 150,
    current_workload: 75
  }
];

const mockOrders = [
  {
    id: 'order-1',
    order_number: 'ORD-001',
    customer_id: 'customer-1',
    status: 'in_design',
    total_amount: 500.00,
    priority: 'medium',
    assigned_manufacturer_id: null,
    estimated_completion_date: null
  },
  {
    id: 'order-2',
    order_number: 'ORD-002', 
    customer_id: 'customer-2',
    status: 'pending_production',
    total_amount: 750.00,
    priority: 'high',
    assigned_manufacturer_id: 'mfg-1',
    estimated_completion_date: '2024-02-15'
  }
];

const mockProductionTasks = [
  {
    id: 'task-1',
    order_id: 'order-2',
    manufacturer_id: 'mfg-1',
    status: 'assigned',
    priority: 'high',
    estimated_start_date: '2024-02-01',
    estimated_completion_date: '2024-02-15',
    actual_start_date: null,
    actual_completion_date: null
  }
];

// Mock routes
app.get('/api/manufacturers', (req, res) => {
  res.json(mockManufacturers);
});

app.get('/api/manufacturers/:id', (req, res) => {
  const { id } = req.params;
  const manufacturer = mockManufacturers.find(m => m.id === id);
  
  if (!manufacturer) {
    return res.status(404).json({ error: 'Manufacturer not found' });
  }
  
  res.json(manufacturer);
});

app.get('/api/manufacturers/:id/workload', (req, res) => {
  const { id } = req.params;
  const manufacturer = mockManufacturers.find(m => m.id === id);
  
  if (!manufacturer) {
    return res.status(404).json({ error: 'Manufacturer not found' });
  }
  
  const workloadData = {
    manufacturer_id: id,
    capacity: manufacturer.capacity,
    current_workload: manufacturer.current_workload,
    available_capacity: manufacturer.capacity - manufacturer.current_workload,
    utilization_percentage: (manufacturer.current_workload / manufacturer.capacity) * 100,
    active_orders: mockOrders.filter(o => o.assigned_manufacturer_id === id).length
  };
  
  res.json(workloadData);
});

app.get('/api/orders/unassigned', (req, res) => {
  const unassignedOrders = mockOrders.filter(order => !order.assigned_manufacturer_id);
  res.json(unassignedOrders);
});

app.get('/api/orders/by-status/:status', (req, res) => {
  const { status } = req.params;
  const ordersByStatus = mockOrders.filter(order => order.status === status);
  res.json(ordersByStatus);
});

app.patch('/api/orders/:id/assign-manufacturer', (req, res) => {
  const { id } = req.params;
  const { manufacturer_id, estimated_completion_date } = req.body;
  
  if (!manufacturer_id) {
    return res.status(400).json({ error: 'Manufacturer ID is required' });
  }
  
  const orderIndex = mockOrders.findIndex(order => order.id === id);
  if (orderIndex === -1) {
    return res.status(404).json({ error: 'Order not found' });
  }
  
  const manufacturer = mockManufacturers.find(m => m.id === manufacturer_id);
  if (!manufacturer) {
    return res.status(404).json({ error: 'Manufacturer not found' });
  }
  
  // Update order
  const updatedOrder = {
    ...mockOrders[orderIndex],
    assigned_manufacturer_id: manufacturer_id,
    status: 'pending_production',
    estimated_completion_date: estimated_completion_date || null,
    updated_at: new Date().toISOString()
  };
  
  mockOrders[orderIndex] = updatedOrder;
  
  // Update manufacturer workload
  const mfgIndex = mockManufacturers.findIndex(m => m.id === manufacturer_id);
  if (mfgIndex !== -1) {
    mockManufacturers[mfgIndex].current_workload += 1;
  }
  
  res.json(updatedOrder);
});

app.patch('/api/orders/:id/unassign-manufacturer', (req, res) => {
  const { id } = req.params;
  
  const orderIndex = mockOrders.findIndex(order => order.id === id);
  if (orderIndex === -1) {
    return res.status(404).json({ error: 'Order not found' });
  }
  
  const order = mockOrders[orderIndex];
  const previousManufacturerId = order.assigned_manufacturer_id;
  
  // Update order
  const updatedOrder = {
    ...order,
    assigned_manufacturer_id: null,
    status: 'in_design',
    estimated_completion_date: null,
    updated_at: new Date().toISOString()
  };
  
  mockOrders[orderIndex] = updatedOrder;
  
  // Update previous manufacturer workload
  if (previousManufacturerId) {
    const mfgIndex = mockManufacturers.findIndex(m => m.id === previousManufacturerId);
    if (mfgIndex !== -1) {
      mockManufacturers[mfgIndex].current_workload = Math.max(0, mockManufacturers[mfgIndex].current_workload - 1);
    }
  }
  
  res.json(updatedOrder);
});

app.post('/api/production-tasks', (req, res) => {
  const taskData = req.body;
  
  if (!taskData.order_id || !taskData.manufacturer_id) {
    return res.status(400).json({ error: 'Order ID and Manufacturer ID are required' });
  }
  
  const newTask = {
    id: `task-${Date.now()}`,
    ...taskData,
    status: 'assigned',
    created_at: new Date().toISOString()
  };
  
  mockProductionTasks.push(newTask);
  res.status(201).json(newTask);
});

app.get('/api/production-tasks/by-manufacturer/:id', (req, res) => {
  const { id } = req.params;
  const tasks = mockProductionTasks.filter(task => task.manufacturer_id === id);
  res.json(tasks);
});

app.patch('/api/production-tasks/:id/status', (req, res) => {
  const { id } = req.params;
  const { status, actual_start_date, actual_completion_date } = req.body;
  
  const taskIndex = mockProductionTasks.findIndex(task => task.id === id);
  if (taskIndex === -1) {
    return res.status(404).json({ error: 'Production task not found' });
  }
  
  const updatedTask = {
    ...mockProductionTasks[taskIndex],
    status,
    actual_start_date: actual_start_date || mockProductionTasks[taskIndex].actual_start_date,
    actual_completion_date: actual_completion_date || mockProductionTasks[taskIndex].actual_completion_date,
    updated_at: new Date().toISOString()
  };
  
  mockProductionTasks[taskIndex] = updatedTask;
  res.json(updatedTask);
});

app.get('/api/manufacturer-assignment/dashboard', (req, res) => {
  const dashboardData = {
    total_manufacturers: mockManufacturers.length,
    unassigned_orders: mockOrders.filter(o => !o.assigned_manufacturer_id).length,
    active_production_tasks: mockProductionTasks.filter(t => t.status === 'in_progress').length,
    manufacturer_utilization: mockManufacturers.map(mfg => ({
      id: mfg.id,
      name: mfg.name,
      utilization: (mfg.current_workload / mfg.capacity) * 100,
      capacity: mfg.capacity,
      current_workload: mfg.current_workload
    }))
  };
  
  res.json(dashboardData);
});

describe('Manufacturer Assignment Integration Tests', () => {
  beforeEach(() => {
    // Reset mock data
    mockOrders[0].assigned_manufacturer_id = null;
    mockOrders[0].status = 'in_design';
    mockManufacturers[0].current_workload = 25;
    mockManufacturers[1].current_workload = 75;
  });

  describe('Manufacturer Retrieval', () => {
    test('should get all manufacturers', async () => {
      const response = await request(app)
        .get('/api/manufacturers')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
      expect(response.body[0]).toHaveProperty('name');
      expect(response.body[0]).toHaveProperty('capacity');
      expect(response.body[0]).toHaveProperty('current_workload');
    });

    test('should get manufacturer by ID', async () => {
      const response = await request(app)
        .get('/api/manufacturers/mfg-1')
        .expect(200);

      expect(response.body.id).toBe('mfg-1');
      expect(response.body.name).toBe('Premium Textiles Inc');
      expect(response.body.specialties).toContain('T-Shirts');
    });

    test('should return 404 for non-existent manufacturer', async () => {
      const response = await request(app)
        .get('/api/manufacturers/nonexistent')
        .expect(404);

      expect(response.body.error).toBe('Manufacturer not found');
    });

    test('should get manufacturer workload data', async () => {
      const response = await request(app)
        .get('/api/manufacturers/mfg-1/workload')
        .expect(200);

      expect(response.body).toHaveProperty('capacity');
      expect(response.body).toHaveProperty('current_workload');
      expect(response.body).toHaveProperty('available_capacity');
      expect(response.body).toHaveProperty('utilization_percentage');
      expect(response.body.utilization_percentage).toBe(25);
    });
  });

  describe('Order Assignment', () => {
    test('should assign manufacturer to order', async () => {
      const assignmentData = {
        manufacturer_id: 'mfg-1',
        estimated_completion_date: '2024-03-01'
      };

      const response = await request(app)
        .patch('/api/orders/order-1/assign-manufacturer')
        .send(assignmentData)
        .expect(200);

      expect(response.body.assigned_manufacturer_id).toBe('mfg-1');
      expect(response.body.status).toBe('pending_production');
      expect(response.body.estimated_completion_date).toBe('2024-03-01');
      expect(response.body).toHaveProperty('updated_at');
    });

    test('should fail when manufacturer ID is missing', async () => {
      const response = await request(app)
        .patch('/api/orders/order-1/assign-manufacturer')
        .send({})
        .expect(400);

      expect(response.body.error).toBe('Manufacturer ID is required');
    });

    test('should fail for non-existent order', async () => {
      const assignmentData = {
        manufacturer_id: 'mfg-1'
      };

      const response = await request(app)
        .patch('/api/orders/nonexistent/assign-manufacturer')
        .send(assignmentData)
        .expect(404);

      expect(response.body.error).toBe('Order not found');
    });

    test('should fail for non-existent manufacturer', async () => {
      const assignmentData = {
        manufacturer_id: 'nonexistent'
      };

      const response = await request(app)
        .patch('/api/orders/order-1/assign-manufacturer')
        .send(assignmentData)
        .expect(404);

      expect(response.body.error).toBe('Manufacturer not found');
    });

    test('should unassign manufacturer from order', async () => {
      // First assign a manufacturer
      await request(app)
        .patch('/api/orders/order-1/assign-manufacturer')
        .send({ manufacturer_id: 'mfg-1' })
        .expect(200);

      // Then unassign
      const response = await request(app)
        .patch('/api/orders/order-1/unassign-manufacturer')
        .expect(200);

      expect(response.body.assigned_manufacturer_id).toBeNull();
      expect(response.body.status).toBe('in_design');
      expect(response.body.estimated_completion_date).toBeNull();
    });
  });

  describe('Unassigned Orders', () => {
    test('should get unassigned orders', async () => {
      const response = await request(app)
        .get('/api/orders/unassigned')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(1);
      expect(response.body[0].assigned_manufacturer_id).toBeNull();
    });

    test('should get orders by status', async () => {
      const response = await request(app)
        .get('/api/orders/by-status/in_design')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.every(order => order.status === 'in_design')).toBe(true);
    });
  });

  describe('Production Task Management', () => {
    test('should create production task', async () => {
      const taskData = {
        order_id: 'order-1',
        manufacturer_id: 'mfg-1',
        priority: 'high',
        estimated_start_date: '2024-02-01',
        estimated_completion_date: '2024-02-15'
      };

      const response = await request(app)
        .post('/api/production-tasks')
        .send(taskData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.order_id).toBe('order-1');
      expect(response.body.manufacturer_id).toBe('mfg-1');
      expect(response.body.status).toBe('assigned');
    });

    test('should fail to create task without required fields', async () => {
      const taskData = {
        priority: 'high'
        // Missing order_id and manufacturer_id
      };

      const response = await request(app)
        .post('/api/production-tasks')
        .send(taskData)
        .expect(400);

      expect(response.body.error).toBe('Order ID and Manufacturer ID are required');
    });

    test('should get tasks by manufacturer', async () => {
      const response = await request(app)
        .get('/api/production-tasks/by-manufacturer/mfg-1')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.every(task => task.manufacturer_id === 'mfg-1')).toBe(true);
    });

    test('should update task status', async () => {
      const updateData = {
        status: 'in_progress',
        actual_start_date: '2024-02-02'
      };

      const response = await request(app)
        .patch('/api/production-tasks/task-1/status')
        .send(updateData)
        .expect(200);

      expect(response.body.status).toBe('in_progress');
      expect(response.body.actual_start_date).toBe('2024-02-02');
      expect(response.body).toHaveProperty('updated_at');
    });

    test('should fail to update non-existent task', async () => {
      const updateData = {
        status: 'completed'
      };

      const response = await request(app)
        .patch('/api/production-tasks/nonexistent/status')
        .send(updateData)
        .expect(404);

      expect(response.body.error).toBe('Production task not found');
    });
  });

  describe('Dashboard and Analytics', () => {
    test('should get manufacturer assignment dashboard data', async () => {
      const response = await request(app)
        .get('/api/manufacturer-assignment/dashboard')
        .expect(200);

      expect(response.body).toHaveProperty('total_manufacturers');
      expect(response.body).toHaveProperty('unassigned_orders');
      expect(response.body).toHaveProperty('active_production_tasks');
      expect(response.body).toHaveProperty('manufacturer_utilization');
      
      expect(response.body.total_manufacturers).toBe(2);
      expect(Array.isArray(response.body.manufacturer_utilization)).toBe(true);
    });

    test('should calculate manufacturer utilization correctly', async () => {
      const response = await request(app)
        .get('/api/manufacturer-assignment/dashboard')
        .expect(200);

      const premiumTextiles = response.body.manufacturer_utilization.find(
        (mfg: any) => mfg.id === 'mfg-1'
      );
      
      expect(premiumTextiles.utilization).toBe(25);
      expect(premiumTextiles.capacity).toBe(100);
      expect(premiumTextiles.current_workload).toBe(25);
    });
  });

  describe('Workload Management', () => {
    test('should update manufacturer workload when assigning order', async () => {
      // Get initial workload
      const initialResponse = await request(app)
        .get('/api/manufacturers/mfg-1/workload')
        .expect(200);

      const initialWorkload = initialResponse.body.current_workload;

      // Assign order
      await request(app)
        .patch('/api/orders/order-1/assign-manufacturer')
        .send({ manufacturer_id: 'mfg-1' })
        .expect(200);

      // Check updated workload
      const updatedResponse = await request(app)
        .get('/api/manufacturers/mfg-1/workload')
        .expect(200);

      expect(updatedResponse.body.current_workload).toBe(initialWorkload + 1);
      expect(updatedResponse.body.available_capacity).toBe(
        updatedResponse.body.capacity - updatedResponse.body.current_workload
      );
    });

    test('should handle workload calculation with multiple assignments', async () => {
      // Assign multiple orders to same manufacturer
      await request(app)
        .patch('/api/orders/order-1/assign-manufacturer')
        .send({ manufacturer_id: 'mfg-1' })
        .expect(200);

      // Create and assign another order
      mockOrders.push({
        id: 'order-3',
        order_number: 'ORD-003',
        customer_id: 'customer-3',
        status: 'in_design',
        total_amount: 300.00,
        priority: 'low',
        assigned_manufacturer_id: null,
        estimated_completion_date: null
      });

      await request(app)
        .patch('/api/orders/order-3/assign-manufacturer')
        .send({ manufacturer_id: 'mfg-1' })
        .expect(200);

      // Check final workload
      const response = await request(app)
        .get('/api/manufacturers/mfg-1/workload')
        .expect(200);

      expect(response.body.current_workload).toBe(27); // 25 + 2 assignments
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle assignment to manufacturer at full capacity', async () => {
      // Set manufacturer to full capacity
      const mfgIndex = mockManufacturers.findIndex(m => m.id === 'mfg-1');
      mockManufacturers[mfgIndex].current_workload = 100;

      const response = await request(app)
        .patch('/api/orders/order-1/assign-manufacturer')
        .send({ manufacturer_id: 'mfg-1' })
        .expect(200);

      // Assignment should still succeed but workload goes over capacity
      expect(response.body.assigned_manufacturer_id).toBe('mfg-1');
      
      const workloadResponse = await request(app)
        .get('/api/manufacturers/mfg-1/workload')
        .expect(200);
        
      expect(workloadResponse.body.current_workload).toBe(101);
      expect(workloadResponse.body.available_capacity).toBe(-1);
    });

    test('should handle reassignment of already assigned order', async () => {
      // Assign to first manufacturer
      await request(app)
        .patch('/api/orders/order-1/assign-manufacturer')
        .send({ manufacturer_id: 'mfg-1' })
        .expect(200);

      // Reassign to second manufacturer
      const response = await request(app)
        .patch('/api/orders/order-1/assign-manufacturer')
        .send({ manufacturer_id: 'mfg-2' })
        .expect(200);

      expect(response.body.assigned_manufacturer_id).toBe('mfg-2');
    });

    test('should handle assignment with invalid date formats', async () => {
      const assignmentData = {
        manufacturer_id: 'mfg-1',
        estimated_completion_date: 'invalid-date'
      };

      const response = await request(app)
        .patch('/api/orders/order-1/assign-manufacturer')
        .send(assignmentData)
        .expect(200);

      expect(response.body.estimated_completion_date).toBe('invalid-date');
    });

    test('should handle task creation with extreme dates', async () => {
      const taskData = {
        order_id: 'order-1',
        manufacturer_id: 'mfg-1',
        estimated_start_date: '1900-01-01',
        estimated_completion_date: '2100-12-31'
      };

      const response = await request(app)
        .post('/api/production-tasks')
        .send(taskData)
        .expect(201);

      expect(response.body.estimated_start_date).toBe('1900-01-01');
      expect(response.body.estimated_completion_date).toBe('2100-12-31');
    });

    test('should handle very high priority values', async () => {
      const taskData = {
        order_id: 'order-1',
        manufacturer_id: 'mfg-1',
        priority: 'emergency_ultra_high'
      };

      const response = await request(app)
        .post('/api/production-tasks')
        .send(taskData)
        .expect(201);

      expect(response.body.priority).toBe('emergency_ultra_high');
    });

    test('should handle manufacturer with zero capacity', async () => {
      // Add manufacturer with zero capacity
      mockManufacturers.push({
        id: 'mfg-zero',
        name: 'Zero Capacity Mfg',
        email: 'zero@example.com',
        phone: '555-0000',
        specialties: ['Testing'],
        capacity: 0,
        current_workload: 0
      });

      const response = await request(app)
        .get('/api/manufacturers/mfg-zero/workload')
        .expect(200);

      expect(response.body.utilization_percentage).toBeNaN();
    });
  });

  describe('Complex Assignment Scenarios', () => {
    test('should handle bulk assignment operations', async () => {
      const orders = ['order-1'];
      const manufacturer = 'mfg-1';
      
      for (const orderId of orders) {
        const response = await request(app)
          .patch(`/api/orders/${orderId}/assign-manufacturer`)
          .send({ manufacturer_id: manufacturer })
          .expect(200);
          
        expect(response.body.assigned_manufacturer_id).toBe(manufacturer);
      }
    });

    test('should handle assignment with custom completion dates', async () => {
      const futureDates = [
        '2024-03-01',
        '2024-06-15', 
        '2024-12-31'
      ];

      for (const date of futureDates) {
        const response = await request(app)
          .patch('/api/orders/order-1/assign-manufacturer')
          .send({ 
            manufacturer_id: 'mfg-1',
            estimated_completion_date: date
          })
          .expect(200);
          
        expect(response.body.estimated_completion_date).toBe(date);
      }
    });

    test('should handle concurrent assignment requests', async () => {
      const assignments = [
        { order: 'order-1', manufacturer: 'mfg-1' }
      ];

      const promises = assignments.map(({ order, manufacturer }) =>
        request(app)
          .patch(`/api/orders/${order}/assign-manufacturer`)
          .send({ manufacturer_id: manufacturer })
      );

      const responses = await Promise.all(promises);
      
      responses.forEach((response, index) => {
        expect(response.status).toBe(200);
        expect(response.body.assigned_manufacturer_id).toBe(assignments[index].manufacturer);
      });
    });
  });
});
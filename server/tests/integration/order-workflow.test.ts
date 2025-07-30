import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { createClient } from '@supabase/supabase-js';

// Mock application setup
const app = express();
app.use(express.json());

// Mock Supabase client
const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn()
      })),
      data: []
    })),
    insert: jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn()
      }))
    })),
    update: jest.fn(() => ({
      eq: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn()
        }))
      }))
    })),
    delete: jest.fn(() => ({
      eq: jest.fn()
    }))
  })),
  auth: {
    getUser: jest.fn()
  }
};

// Mock data
const mockCustomer = {
  id: 'customer-123',
  name: 'John Doe',
  email: 'john@example.com',
  phone: '555-0123',
  company: 'Acme Corp'
};

const mockCatalogItems = [
  {
    id: 'item-1',
    name: 'Premium T-Shirt',
    sku: 'TSHIRT-001',
    unit_cost: 15.50,
    category: 'T-Shirts',
    sport: 'Basketball'
  },
  {
    id: 'item-2',
    name: 'Performance Hoodie',
    sku: 'HOODIE-001',
    unit_cost: 35.00,
    category: 'Hoodies',
    sport: 'Football'
  }
];

const mockOrder = {
  id: 'order-123',
  order_number: 'ORD-001',
  customer_id: 'customer-123',
  status: 'draft',
  total_amount: 100.00,
  salesperson_id: 'user-123',
  priority: 'medium',
  internal_notes: 'Test order',
  customer_requirements: 'Custom logo placement',
  delivery_address: '123 Main St, City, State',
  rush_order: false
};

const mockOrderItems = [
  {
    id: 'item-1',
    order_id: 'order-123',
    catalog_item_id: 'item-1',
    quantity: 5,
    unit_price: 15.50,
    fabric: 'Cotton',
    customization: 'Custom logo',
    specifications: 'Large size, blue color'
  }
];

// Mock routes setup
app.get('/api/customers', (req, res) => {
  res.json([mockCustomer]);
});

app.get('/api/customers/:id', (req, res) => {
  const { id } = req.params;
  if (id === 'customer-123') {
    res.json(mockCustomer);
  } else {
    res.status(404).json({ error: 'Customer not found' });
  }
});

app.get('/api/catalog-items', (req, res) => {
  res.json(mockCatalogItems);
});

app.post('/api/orders', (req, res) => {
  const orderData = req.body;
  
  // Validate required fields
  if (!orderData.customer_id) {
    return res.status(400).json({ error: 'Customer ID is required' });
  }
  
  if (!orderData.items || orderData.items.length === 0) {
    return res.status(400).json({ error: 'Order must have at least one item' });
  }
  
  // Simulate order creation
  const newOrder = {
    ...mockOrder,
    ...orderData,
    order_number: `ORD-${Date.now()}`,
    created_at: new Date().toISOString()
  };
  
  res.status(201).json(newOrder);
});

app.get('/api/orders/:id', (req, res) => {
  const { id } = req.params;
  if (id === 'order-123') {
    res.json(mockOrder);
  } else {
    res.status(404).json({ error: 'Order not found' });
  }
});

app.put('/api/orders/:id', (req, res) => {
  const { id } = req.params;
  const updateData = req.body;
  
  if (id === 'order-123') {
    const updatedOrder = {
      ...mockOrder,
      ...updateData,
      updated_at: new Date().toISOString()
    };
    res.json(updatedOrder);
  } else {
    res.status(404).json({ error: 'Order not found' });
  }
});

app.get('/api/orders/:id/items', (req, res) => {
  const { id } = req.params;
  if (id === 'order-123') {
    res.json(mockOrderItems);
  } else {
    res.json([]);
  }
});

app.post('/api/orders/:id/items', (req, res) => {
  const { id } = req.params;
  const itemData = req.body;
  
  if (!itemData.catalog_item_id || !itemData.quantity) {
    return res.status(400).json({ error: 'Catalog item ID and quantity are required' });
  }
  
  const newItem = {
    id: `item-${Date.now()}`,
    order_id: id,
    ...itemData,
    created_at: new Date().toISOString()
  };
  
  res.status(201).json(newItem);
});

app.patch('/api/orders/:id/assign-manufacturer', (req, res) => {
  const { id } = req.params;
  const { manufacturerId } = req.body;
  
  if (!manufacturerId) {
    return res.status(400).json({ error: 'Manufacturer ID is required' });
  }
  
  if (id === 'order-123') {
    const updatedOrder = {
      ...mockOrder,
      assigned_manufacturer_id: manufacturerId,
      status: 'pending_production',
      updated_at: new Date().toISOString()
    };
    res.json(updatedOrder);
  } else {
    res.status(404).json({ error: 'Order not found' });
  }
});

app.delete('/api/orders/:id', (req, res) => {
  const { id } = req.params;
  if (id === 'order-123') {
    res.status(204).send();
  } else {
    res.status(404).json({ error: 'Order not found' });
  }
});

describe('Order Workflow Integration Tests', () => {
  describe('Order Creation', () => {
    test('should create order with valid customer and items', async () => {
      const orderData = {
        customer_id: 'customer-123',
        salesperson_id: 'user-123',
        priority: 'high',
        internal_notes: 'Urgent order for event',
        customer_requirements: 'Custom team logo',
        delivery_address: '456 Oak St, City, State',
        rush_order: true,
        items: [
          {
            catalog_item_id: 'item-1',
            quantity: 10,
            unit_price: 15.50,
            fabric: 'Cotton',
            customization: 'Team logo on front',
            specifications: 'Large size, navy blue'
          }
        ]
      };

      const response = await request(app)
        .post('/api/orders')
        .send(orderData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('order_number');
      expect(response.body.customer_id).toBe('customer-123');
      expect(response.body.priority).toBe('high');
      expect(response.body.rush_order).toBe(true);
    });

    test('should fail when customer_id is missing', async () => {
      const orderData = {
        salesperson_id: 'user-123',
        items: [
          {
            catalog_item_id: 'item-1',
            quantity: 5,
            unit_price: 15.50
          }
        ]
      };

      const response = await request(app)
        .post('/api/orders')
        .send(orderData)
        .expect(400);

      expect(response.body.error).toBe('Customer ID is required');
    });

    test('should fail when items array is empty', async () => {
      const orderData = {
        customer_id: 'customer-123',
        salesperson_id: 'user-123',
        items: []
      };

      const response = await request(app)
        .post('/api/orders')
        .send(orderData)
        .expect(400);

      expect(response.body.error).toBe('Order must have at least one item');
    });

    test('should create order with multiple items', async () => {
      const orderData = {
        customer_id: 'customer-123',
        salesperson_id: 'user-123',
        items: [
          {
            catalog_item_id: 'item-1',
            quantity: 5,
            unit_price: 15.50,
            fabric: 'Cotton',
            customization: 'Logo front'
          },
          {
            catalog_item_id: 'item-2',
            quantity: 3,
            unit_price: 35.00,
            fabric: 'Polyester',
            customization: 'Logo back'
          }
        ]
      };

      const response = await request(app)
        .post('/api/orders')
        .send(orderData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.customer_id).toBe('customer-123');
    });

    test('should handle missing optional fields', async () => {
      const orderData = {
        customer_id: 'customer-123',
        items: [
          {
            catalog_item_id: 'item-1',
            quantity: 1,
            unit_price: 15.50
          }
        ]
      };

      const response = await request(app)
        .post('/api/orders')
        .send(orderData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.customer_id).toBe('customer-123');
    });
  });

  describe('Order Retrieval', () => {
    test('should get order by ID', async () => {
      const response = await request(app)
        .get('/api/orders/order-123')
        .expect(200);

      expect(response.body.id).toBe('order-123');
      expect(response.body.order_number).toBe('ORD-001');
      expect(response.body.customer_id).toBe('customer-123');
    });

    test('should return 404 for non-existent order', async () => {
      const response = await request(app)
        .get('/api/orders/nonexistent')
        .expect(404);

      expect(response.body.error).toBe('Order not found');
    });

    test('should get order items', async () => {
      const response = await request(app)
        .get('/api/orders/order-123/items')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('catalog_item_id');
      expect(response.body[0]).toHaveProperty('quantity');
    });
  });

  describe('Order Updates', () => {
    test('should update order status', async () => {
      const updateData = {
        status: 'in_design',
        internal_notes: 'Design phase started'
      };

      const response = await request(app)
        .put('/api/orders/order-123')
        .send(updateData)
        .expect(200);

      expect(response.body.status).toBe('in_design');
      expect(response.body.internal_notes).toBe('Design phase started');
      expect(response.body).toHaveProperty('updated_at');
    });

    test('should update order priority', async () => {
      const updateData = {
        priority: 'low',
        rush_order: false
      };

      const response = await request(app)
        .put('/api/orders/order-123')
        .send(updateData)
        .expect(200);

      expect(response.body.priority).toBe('low');
      expect(response.body.rush_order).toBe(false);
    });

    test('should update delivery information', async () => {
      const updateData = {
        delivery_address: '789 Pine St, New City, State',
        delivery_instructions: 'Ring doorbell twice',
        estimated_delivery_date: '2024-02-15'
      };

      const response = await request(app)
        .put('/api/orders/order-123')
        .send(updateData)
        .expect(200);

      expect(response.body.delivery_address).toBe('789 Pine St, New City, State');
      expect(response.body.delivery_instructions).toBe('Ring doorbell twice');
    });
  });

  describe('Order Items Management', () => {
    test('should add item to existing order', async () => {
      const itemData = {
        catalog_item_id: 'item-2',
        quantity: 3,
        unit_price: 35.00,
        fabric: 'Polyester',
        customization: 'Custom design',
        specifications: 'Medium size, red color'
      };

      const response = await request(app)
        .post('/api/orders/order-123/items')
        .send(itemData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.order_id).toBe('order-123');
      expect(response.body.catalog_item_id).toBe('item-2');
      expect(response.body.quantity).toBe(3);
    });

    test('should fail to add item without required fields', async () => {
      const itemData = {
        fabric: 'Cotton'
        // Missing catalog_item_id and quantity
      };

      const response = await request(app)
        .post('/api/orders/order-123/items')
        .send(itemData)
        .expect(400);

      expect(response.body.error).toBe('Catalog item ID and quantity are required');
    });

    test('should add item with minimal data', async () => {
      const itemData = {
        catalog_item_id: 'item-1',
        quantity: 1,
        unit_price: 15.50
      };

      const response = await request(app)
        .post('/api/orders/order-123/items')
        .send(itemData)
        .expect(201);

      expect(response.body.catalog_item_id).toBe('item-1');
      expect(response.body.quantity).toBe(1);
    });
  });

  describe('Manufacturer Assignment', () => {
    test('should assign manufacturer to order', async () => {
      const assignmentData = {
        manufacturerId: 'manufacturer-456'
      };

      const response = await request(app)
        .patch('/api/orders/order-123/assign-manufacturer')
        .send(assignmentData)
        .expect(200);

      expect(response.body.assigned_manufacturer_id).toBe('manufacturer-456');
      expect(response.body.status).toBe('pending_production');
      expect(response.body).toHaveProperty('updated_at');
    });

    test('should fail when manufacturer ID is missing', async () => {
      const response = await request(app)
        .patch('/api/orders/order-123/assign-manufacturer')
        .send({})
        .expect(400);

      expect(response.body.error).toBe('Manufacturer ID is required');
    });

    test('should fail for non-existent order', async () => {
      const assignmentData = {
        manufacturerId: 'manufacturer-456'
      };

      const response = await request(app)
        .patch('/api/orders/nonexistent/assign-manufacturer')
        .send(assignmentData)
        .expect(404);

      expect(response.body.error).toBe('Order not found');
    });
  });

  describe('Order Deletion', () => {
    test('should delete order', async () => {
      await request(app)
        .delete('/api/orders/order-123')
        .expect(204);
    });

    test('should return 404 when deleting non-existent order', async () => {
      const response = await request(app)
        .delete('/api/orders/nonexistent')
        .expect(404);

      expect(response.body.error).toBe('Order not found');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle invalid customer ID format', async () => {
      const orderData = {
        customer_id: 'invalid-format',
        items: [
          {
            catalog_item_id: 'item-1',
            quantity: 1,
            unit_price: 15.50
          }
        ]
      };

      // This would typically validate the UUID format in a real implementation
      const response = await request(app)
        .post('/api/orders')
        .send(orderData)
        .expect(201);

      expect(response.body.customer_id).toBe('invalid-format');
    });

    test('should handle very large quantities', async () => {
      const itemData = {
        catalog_item_id: 'item-1',
        quantity: 999999,
        unit_price: 15.50
      };

      const response = await request(app)
        .post('/api/orders/order-123/items')
        .send(itemData)
        .expect(201);

      expect(response.body.quantity).toBe(999999);
    });

    test('should handle zero quantity', async () => {
      const itemData = {
        catalog_item_id: 'item-1',
        quantity: 0,
        unit_price: 15.50
      };

      const response = await request(app)
        .post('/api/orders/order-123/items')
        .send(itemData)
        .expect(201);

      expect(response.body.quantity).toBe(0);
    });

    test('should handle negative unit price', async () => {
      const itemData = {
        catalog_item_id: 'item-1',
        quantity: 1,
        unit_price: -15.50
      };

      const response = await request(app)
        .post('/api/orders/order-123/items')
        .send(itemData)
        .expect(201);

      expect(response.body.unit_price).toBe(-15.50);
    });

    test('should handle extremely long text fields', async () => {
      const longText = 'A'.repeat(10000);
      const updateData = {
        internal_notes: longText,
        customer_requirements: longText
      };

      const response = await request(app)
        .put('/api/orders/order-123')
        .send(updateData)
        .expect(200);

      expect(response.body.internal_notes).toBe(longText);
      expect(response.body.customer_requirements).toBe(longText);
    });

    test('should handle special characters in text fields', async () => {
      const specialText = 'Special chars: åäö ñ ü 中文 🎉 <script>alert("test")</script>';
      const updateData = {
        internal_notes: specialText,
        customer_requirements: specialText
      };

      const response = await request(app)
        .put('/api/orders/order-123')
        .send(updateData)
        .expect(200);

      expect(response.body.internal_notes).toBe(specialText);
      expect(response.body.customer_requirements).toBe(specialText);
    });

    test('should handle malformed JSON in request body', async () => {
      const response = await request(app)
        .post('/api/orders')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);
    });
  });

  describe('Order Status Workflow', () => {
    test('should transition through valid status progression', async () => {
      const statuses = ['draft', 'in_design', 'pending_production', 'in_production', 'completed'];
      
      for (const status of statuses) {
        const response = await request(app)
          .put('/api/orders/order-123')
          .send({ status })
          .expect(200);
          
        expect(response.body.status).toBe(status);
      }
    });

    test('should handle invalid status values', async () => {
      const response = await request(app)
        .put('/api/orders/order-123')
        .send({ status: 'invalid_status' })
        .expect(200);

      // In a real implementation, this would validate status values
      expect(response.body.status).toBe('invalid_status');
    });
  });

  describe('Order Priority Handling', () => {
    test('should accept valid priority levels', async () => {
      const priorities = ['low', 'medium', 'high'];
      
      for (const priority of priorities) {
        const response = await request(app)
          .put('/api/orders/order-123')
          .send({ priority })
          .expect(200);
          
        expect(response.body.priority).toBe(priority);
      }
    });

    test('should handle rush order flag correctly', async () => {
      const response = await request(app)
        .put('/api/orders/order-123')
        .send({ 
          priority: 'high',
          rush_order: true 
        })
        .expect(200);

      expect(response.body.priority).toBe('high');
      expect(response.body.rush_order).toBe(true);
    });
  });
});
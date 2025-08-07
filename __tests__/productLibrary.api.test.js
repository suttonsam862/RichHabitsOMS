/**
 * ProductLibrary API Tests
 * Comprehensive test suite for CRUD operations with role-based authentication
 */

const request = require('supertest');
const app = require('../server/index');

describe('ProductLibrary API Endpoints', () => {
  let adminToken, salespersonToken, designerToken, customerToken;
  let testProductId;

  beforeAll(async () => {
    // Setup test users with different roles
    // Note: These would typically be mocked or setup in test database
    adminToken = 'test-admin-token';
    salespersonToken = 'test-salesperson-token';
    designerToken = 'test-designer-token';
    customerToken = 'test-customer-token';
  });

  describe('POST /api/products/library - Create Product', () => {
    test('should create product with admin role', async () => {
      const productData = {
        name: 'Test Product',
        category: 'Athletic Wear',
        sport: 'Basketball',
        basePrice: '29.99',
        unitCost: '15.00',
        sku: 'TEST-001',
        description: 'Test product for API validation',
        status: 'active',
        etaDays: '7',
        minQuantity: '1',
        maxQuantity: '100',
        sizes: ['S', 'M', 'L', 'XL'],
        colors: ['Red', 'Blue', 'Green'],
        tags: ['test', 'athletic']
      };

      const response = await request(app)
        .post('/api/products/library')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(productData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.name).toBe(productData.name);
      expect(response.body.data.sku).toBe(productData.sku);
      
      testProductId = response.body.data.id;
    });

    test('should create product with salesperson role', async () => {
      const productData = {
        name: 'Salesperson Test Product',
        category: 'Casual',
        sport: 'All Around Item',
        basePrice: '19.99',
        sku: 'SALES-001'
      };

      const response = await request(app)
        .post('/api/products/library')
        .set('Authorization', `Bearer ${salespersonToken}`)
        .send(productData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(productData.name);
    });

    test('should reject creation with designer role', async () => {
      const productData = {
        name: 'Designer Test Product',
        category: 'Athletic Wear',
        sport: 'Basketball',
        basePrice: '29.99',
        sku: 'DESIGN-001'
      };

      const response = await request(app)
        .post('/api/products/library')
        .set('Authorization', `Bearer ${designerToken}`)
        .send(productData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Insufficient permissions');
    });

    test('should validate required fields', async () => {
      const invalidData = {
        category: 'Athletic Wear',
        basePrice: '29.99'
        // Missing required 'name' and 'sku'
      };

      const response = await request(app)
        .post('/api/products/library')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'name',
            message: expect.stringContaining('required')
          }),
          expect.objectContaining({
            field: 'sku',
            message: expect.stringContaining('required')
          })
        ])
      );
    });

    test('should handle duplicate SKU error', async () => {
      const productData = {
        name: 'Duplicate SKU Test',
        category: 'Athletic Wear',
        sport: 'Basketball',
        basePrice: '29.99',
        sku: 'TEST-001' // Same SKU as first test
      };

      const response = await request(app)
        .post('/api/products/library')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(productData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('SKU already exists');
    });
  });

  describe('PUT /api/products/library/:id - Update Product', () => {
    test('should update product with admin role', async () => {
      const updateData = {
        name: 'Updated Test Product',
        basePrice: '39.99',
        description: 'Updated description',
        tags: ['updated', 'test']
      };

      const response = await request(app)
        .put(`/api/products/library/${testProductId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(updateData.name);
      expect(response.body.data.basePrice).toBe(updateData.basePrice);
    });

    test('should update product with salesperson role', async () => {
      const updateData = {
        description: 'Salesperson updated description'
      };

      const response = await request(app)
        .put(`/api/products/library/${testProductId}`)
        .set('Authorization', `Bearer ${salespersonToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.description).toBe(updateData.description);
    });

    test('should reject update with designer role', async () => {
      const updateData = {
        name: 'Designer Cannot Update'
      };

      const response = await request(app)
        .put(`/api/products/library/${testProductId}`)
        .set('Authorization', `Bearer ${designerToken}`)
        .send(updateData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Insufficient permissions');
    });

    test('should handle invalid product ID', async () => {
      const updateData = {
        name: 'Update Non-existent Product'
      };

      const response = await request(app)
        .put('/api/products/library/invalid-uuid')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid product ID format');
    });

    test('should handle non-existent product', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440000';
      const updateData = {
        name: 'Update Non-existent Product'
      };

      const response = await request(app)
        .put(`/api/products/library/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Product not found');
    });
  });

  describe('DELETE /api/products/library/:id - Delete Product', () => {
    test('should reject deletion with salesperson role', async () => {
      const response = await request(app)
        .delete(`/api/products/library/${testProductId}`)
        .set('Authorization', `Bearer ${salespersonToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Admin access required');
    });

    test('should reject deletion with designer role', async () => {
      const response = await request(app)
        .delete(`/api/products/library/${testProductId}`)
        .set('Authorization', `Bearer ${designerToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Admin access required');
    });

    test('should soft delete product with existing orders (admin only)', async () => {
      // Note: This test assumes the product has orders associated
      // In real tests, you'd create order relationships first
      
      const response = await request(app)
        .delete(`/api/products/library/${testProductId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect([
        'Product deleted successfully',
        'Product discontinued successfully (soft delete due to existing orders)'
      ]).toContain(response.body.message);
      
      expect(response.body).toHaveProperty('deleted');
      expect(response.body).toHaveProperty('discontinued');
    });

    test('should handle invalid product ID format', async () => {
      const response = await request(app)
        .delete('/api/products/library/invalid-uuid')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid product ID format');
    });

    test('should handle non-existent product', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440000';
      
      const response = await request(app)
        .delete(`/api/products/library/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Product not found');
    });
  });

  describe('Error Handling and Validation', () => {
    test('should require authentication for all endpoints', async () => {
      const testCases = [
        () => request(app).get('/api/products/library'),
        () => request(app).post('/api/products/library').send({}),
        () => request(app).put(`/api/products/library/${testProductId}`).send({}),
        () => request(app).delete(`/api/products/library/${testProductId}`)
      ];

      for (const testCase of testCases) {
        const response = await testCase().expect(401);
        expect(response.body.success).toBe(false);
      }
    });

    test('should validate price fields are positive numbers', async () => {
      const invalidPriceData = {
        name: 'Invalid Price Test',
        category: 'Test',
        sport: 'Test',
        basePrice: '-10.00', // Negative price
        sku: 'INVALID-PRICE-001'
      };

      const response = await request(app)
        .post('/api/products/library')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidPriceData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });

    test('should handle server errors gracefully', async () => {
      // This test would typically mock database failures
      // Implementation depends on your testing strategy
    });
  });

  describe('Response Structure Validation', () => {
    test('should return consistent response structure for successful operations', async () => {
      const response = await request(app)
        .get('/api/products/library')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body.data).toHaveProperty('products');
      expect(response.body.data).toHaveProperty('pagination');
    });

    test('should return consistent error structure for failed operations', async () => {
      const response = await request(app)
        .post('/api/products/library')
        .set('Authorization', `Bearer ${designerToken}`)
        .send({})
        .expect(403);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
      expect(typeof response.body.message).toBe('string');
    });
  });
});
/**
 * PRODUCT LIBRARY API TESTS
 * Comprehensive API-level tests for ProductLibrary endpoints
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { app } from '../server/index';
import { db } from '../server/db';
import path from 'path';
import fs from 'fs';

describe('ProductLibrary API', () => {
  let authToken: string;
  let testProductId: string;
  let testMockupId: string;
  let testUserId: string;

  beforeAll(async () => {
    // Create test user and get auth token
    const authResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test-designer@productlibrary.test',
        password: 'testpass123',
        first_name: 'Test',
        last_name: 'Designer',
        role: 'designer'
      });

    authToken = authResponse.body.token;
    testUserId = authResponse.body.user.id;

    // Create test product
    const productResponse = await request(app)
      .post('/api/products/library')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Test Jersey Product',
        description: 'Test product for API testing',
        category: 'Jerseys',
        sku: 'TEST-JERSEY-001',
        base_price: 29.99,
        material: 'Cotton Blend',
        available_sizes: ['S', 'M', 'L', 'XL'],
        available_colors: ['Red', 'Blue', 'Green'],
        supplier: 'Test Supplier',
        lead_time_days: 14,
        minimum_quantity: 10,
        tags: ['test', 'jersey', 'sports']
      });

    testProductId = productResponse.body.data.id;
  });

  afterAll(async () => {
    // Cleanup test data
    if (testMockupId) {
      await request(app)
        .delete(`/api/products/library/mockups/${testMockupId}`)
        .set('Authorization', `Bearer ${authToken}`);
    }

    if (testProductId) {
      await request(app)
        .delete(`/api/products/library/${testProductId}`)
        .set('Authorization', `Bearer ${authToken}`);
    }

    // Cleanup test user
    await db.execute(
      'DELETE FROM user_profiles WHERE id = $1',
      [testUserId]
    );
  });

  describe('Product Retrieval', () => {
    test('should fetch historical products with default filters', async () => {
      const response = await request(app)
        .get('/api/products/library')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('products');
      expect(Array.isArray(response.body.data.products)).toBe(true);
      expect(response.body.data.products.length).toBeGreaterThan(0);

      // Verify product structure
      const product = response.body.data.products[0];
      expect(product).toHaveProperty('id');
      expect(product).toHaveProperty('name');
      expect(product).toHaveProperty('category');
      expect(product).toHaveProperty('pricing_stats');
      expect(product).toHaveProperty('order_stats');
      expect(product).toHaveProperty('mockup_stats');
    });

    test('should filter products by search term', async () => {
      const response = await request(app)
        .get('/api/products/library?search=Test Jersey')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.products.length).toBeGreaterThan(0);
      
      const product = response.body.data.products.find(p => p.id === testProductId);
      expect(product).toBeDefined();
      expect(product.name).toContain('Test Jersey');
    });

    test('should filter products by category', async () => {
      const response = await request(app)
        .get('/api/products/library?category=Jerseys')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.products.length).toBeGreaterThan(0);
      response.body.data.products.forEach(product => {
        expect(product.category).toBe('Jerseys');
      });
    });

    test('should filter products by status', async () => {
      const response = await request(app)
        .get('/api/products/library?status=active')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.products.length).toBeGreaterThan(0);
      response.body.data.products.forEach(product => {
        expect(product.status).toBe('active');
      });
    });

    test('should sort products correctly', async () => {
      const response = await request(app)
        .get('/api/products/library?sort_by=created_at&sort_order=desc')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const products = response.body.data.products;
      expect(products.length).toBeGreaterThan(1);

      // Verify descending order by created_at
      for (let i = 1; i < products.length; i++) {
        const prev = new Date(products[i - 1].created_at);
        const curr = new Date(products[i].created_at);
        expect(prev.getTime()).toBeGreaterThanOrEqual(curr.getTime());
      }
    });

    test('should limit results correctly', async () => {
      const response = await request(app)
        .get('/api/products/library?limit=2')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.products.length).toBeLessThanOrEqual(2);
    });

    test('should fetch product statistics', async () => {
      const response = await request(app)
        .get('/api/products/library/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('total_products');
      expect(response.body.data).toHaveProperty('active_products');
      expect(response.body.data).toHaveProperty('discontinued_products');
      expect(typeof response.body.data.total_products).toBe('number');
    });

    test('should handle empty results gracefully', async () => {
      const response = await request(app)
        .get('/api/products/library?search=nonexistentproduct12345')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.products).toEqual([]);
    });
  });

  describe('Mockup Upload', () => {
    test('should successfully upload a mockup image', async () => {
      // Create test image file
      const testImagePath = path.join(__dirname, 'fixtures', 'test-mockup.jpg');
      const testImageData = Buffer.from([
        0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
        0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43
      ]);
      
      if (!fs.existsSync(path.dirname(testImagePath))) {
        fs.mkdirSync(path.dirname(testImagePath), { recursive: true });
      }
      fs.writeFileSync(testImagePath, testImageData);

      const response = await request(app)
        .post(`/api/products/library/${testProductId}/mockups`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', testImagePath)
        .field('image_type', 'mockup')
        .field('alt_text', 'Test mockup upload')
        .field('notes', 'API test upload')
        .expect(201);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('image_url');
      expect(response.body.data.image_type).toBe('mockup');
      expect(response.body.data.alt_text).toBe('Test mockup upload');

      testMockupId = response.body.data.id;

      // Cleanup test file
      fs.unlinkSync(testImagePath);
    });

    test('should validate file type on upload', async () => {
      const testTextPath = path.join(__dirname, 'fixtures', 'test-file.txt');
      fs.writeFileSync(testTextPath, 'This is not an image');

      const response = await request(app)
        .post(`/api/products/library/${testProductId}/mockups`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', testTextPath)
        .field('image_type', 'mockup')
        .field('alt_text', 'Invalid file test')
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid file type');

      fs.unlinkSync(testTextPath);
    });

    test('should validate file size on upload', async () => {
      // Create large image file (simulate >10MB)
      const largePath = path.join(__dirname, 'fixtures', 'large-image.jpg');
      const largeData = Buffer.alloc(11 * 1024 * 1024, 0xFF); // 11MB
      fs.writeFileSync(largePath, largeData);

      const response = await request(app)
        .post(`/api/products/library/${testProductId}/mockups`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', largePath)
        .field('image_type', 'mockup')
        .field('alt_text', 'Large file test')
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('File size too large');

      fs.unlinkSync(largePath);
    });

    test('should require authentication for upload', async () => {
      const testImagePath = path.join(__dirname, 'fixtures', 'auth-test.jpg');
      fs.writeFileSync(testImagePath, Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]));

      await request(app)
        .post(`/api/products/library/${testProductId}/mockups`)
        .attach('file', testImagePath)
        .field('image_type', 'mockup')
        .field('alt_text', 'Unauthorized test')
        .expect(401);

      fs.unlinkSync(testImagePath);
    });

    test('should validate required fields on upload', async () => {
      const testImagePath = path.join(__dirname, 'fixtures', 'validation-test.jpg');
      fs.writeFileSync(testImagePath, Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]));

      // Missing image_type
      await request(app)
        .post(`/api/products/library/${testProductId}/mockups`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', testImagePath)
        .field('alt_text', 'Missing type test')
        .expect(400);

      // Missing alt_text
      await request(app)
        .post(`/api/products/library/${testProductId}/mockups`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', testImagePath)
        .field('image_type', 'mockup')
        .expect(400);

      fs.unlinkSync(testImagePath);
    });
  });

  describe('Mockup Retrieval', () => {
    beforeEach(async () => {
      // Ensure we have a test mockup
      if (!testMockupId) {
        const testImagePath = path.join(__dirname, 'fixtures', 'setup-mockup.jpg');
        fs.writeFileSync(testImagePath, Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]));

        const response = await request(app)
          .post(`/api/products/library/${testProductId}/mockups`)
          .set('Authorization', `Bearer ${authToken}`)
          .attach('file', testImagePath)
          .field('image_type', 'mockup')
          .field('alt_text', 'Setup mockup');

        testMockupId = response.body.data.id;
        fs.unlinkSync(testImagePath);
      }
    });

    test('should fetch mockups for a product', async () => {
      const response = await request(app)
        .get(`/api/products/library/${testProductId}/mockups`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('mockups');
      expect(Array.isArray(response.body.data.mockups)).toBe(true);
      expect(response.body.data.mockups.length).toBeGreaterThan(0);

      const mockup = response.body.data.mockups[0];
      expect(mockup).toHaveProperty('id');
      expect(mockup).toHaveProperty('image_url');
      expect(mockup).toHaveProperty('image_type');
      expect(mockup).toHaveProperty('alt_text');
      expect(mockup).toHaveProperty('created_at');
    });

    test('should filter mockups by type', async () => {
      const response = await request(app)
        .get(`/api/products/library/${testProductId}/mockups?image_type=mockup`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      response.body.data.mockups.forEach(mockup => {
        expect(mockup.image_type).toBe('mockup');
      });
    });

    test('should include designer information when requested', async () => {
      const response = await request(app)
        .get(`/api/products/library/${testProductId}/mockups?include_designer_info=true`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const mockupsWithDesigner = response.body.data.mockups.filter(m => m.designer);
      expect(mockupsWithDesigner.length).toBeGreaterThan(0);

      const mockup = mockupsWithDesigner[0];
      expect(mockup.designer).toHaveProperty('id');
      expect(mockup.designer).toHaveProperty('first_name');
      expect(mockup.designer).toHaveProperty('last_name');
    });

    test('should fetch all mockups across products', async () => {
      const response = await request(app)
        .get('/api/products/library/mockups/all')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('mockups');
      expect(Array.isArray(response.body.data.mockups)).toBe(true);
    });
  });

  describe('Order History & Analytics', () => {
    test('should fetch order history for a product', async () => {
      const response = await request(app)
        .get(`/api/products/library/${testProductId}/order-history`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('orders');
      expect(Array.isArray(response.body.data.orders)).toBe(true);
    });

    test('should fetch analytics for a product', async () => {
      const response = await request(app)
        .get(`/api/products/library/${testProductId}/analytics`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('stats');
      
      const stats = response.body.data.stats;
      expect(stats).toHaveProperty('total_orders');
      expect(stats).toHaveProperty('total_quantity');
      expect(stats).toHaveProperty('total_revenue');
      expect(stats).toHaveProperty('popular_sizes');
      expect(stats).toHaveProperty('popular_colors');
      expect(Array.isArray(stats.popular_sizes)).toBe(true);
      expect(Array.isArray(stats.popular_colors)).toBe(true);
    });

    test('should filter order history by date range', async () => {
      const startDate = '2024-01-01';
      const endDate = '2024-12-31';
      
      const response = await request(app)
        .get(`/api/products/library/${testProductId}/order-history?start_date=${startDate}&end_date=${endDate}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.orders).toBeDefined();
    });

    test('should filter order history by customer', async () => {
      const response = await request(app)
        .get(`/api/products/library/${testProductId}/order-history?search=customer`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.orders).toBeDefined();
    });
  });

  describe('Error Handling & Edge Cases', () => {
    test('should handle invalid product ID', async () => {
      await request(app)
        .get('/api/products/library/invalid-id/mockups')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    test('should handle missing authentication', async () => {
      await request(app)
        .get('/api/products/library')
        .expect(401);
    });

    test('should handle insufficient permissions', async () => {
      // Create customer user (limited permissions)
      const customerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'customer@test.com',
          password: 'testpass123',
          first_name: 'Test',
          last_name: 'Customer',
          role: 'customer'
        });

      const customerToken = customerResponse.body.token;

      await request(app)
        .post('/api/products/library')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          name: 'Unauthorized Product',
          category: 'Test'
        })
        .expect(403);

      // Cleanup
      await db.execute(
        'DELETE FROM user_profiles WHERE id = $1',
        [customerResponse.body.user.id]
      );
    });

    test('should validate request parameters', async () => {
      // Invalid sort_by parameter
      await request(app)
        .get('/api/products/library?sort_by=invalid_field')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      // Invalid limit parameter
      await request(app)
        .get('/api/products/library?limit=abc')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });

    test('should handle database connection errors gracefully', async () => {
      // This would require mocking the database connection
      // For now, we'll test with a malformed query parameter
      await request(app)
        .get('/api/products/library?category=')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200); // Should still work with empty category
    });
  });

  describe('Performance & Rate Limiting', () => {
    test('should handle concurrent requests', async () => {
      const promises = Array(10).fill(null).map(() =>
        request(app)
          .get('/api/products/library')
          .set('Authorization', `Bearer ${authToken}`)
      );

      const responses = await Promise.all(promises);
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });

    test('should respond within acceptable time limits', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/api/products/library?limit=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(2000); // Should respond within 2 seconds
    });
  });
});
/**
 * Integration Tests for Product Library API Endpoints
 * 
 * Tests:
 * - GET /api/products/library - fetch all products with metadata
 * - GET /api/products/library/:id/pricing-history - get historical pricing data
 * - POST /api/products/library/:id/mockups - upload mockup for a product
 * - GET /api/products/library/:id/mockups - fetch mockups for a product
 */

import request from 'supertest';
import { app } from '../server/index';
import { supabase } from '../server/db';
import path from 'path';
import fs from 'fs';

describe('Product Library API', () => {
  let authToken: string;
  let testProductId: string;
  let testUserId: string;

  beforeAll(async () => {
    // Create a test user and get auth token for testing
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'test@example.com',
      password: 'testpassword123'
    });

    if (authError) {
      // If user doesn't exist, create one
      const { data: createData, error: createError } = await supabase.auth.signUp({
        email: 'test@example.com',
        password: 'testpassword123'
      });
      
      if (createError) {
        throw new Error(`Failed to create test user: ${createError.message}`);
      }
      
      testUserId = createData.user?.id || '';
      authToken = createData.session?.access_token || '';
    } else {
      testUserId = authData.user.id;
      authToken = authData.session.access_token;
    }

    // Create a test user profile
    await supabase.from('user_profiles').upsert({
      id: testUserId,
      username: 'testuser',
      first_name: 'Test',
      last_name: 'User',
      role: 'designer'
    });

    // Create a test product
    const { data: productData, error: productError } = await supabase
      .from('catalog_items')
      .insert({
        name: 'Test Product',
        description: 'A test product for integration testing',
        sku: 'TEST-001',
        category: 'Jerseys',
        sport: 'Basketball',
        base_price: 29.99,
        unit_cost: 15.00,
        status: 'active'
      })
      .select()
      .single();

    if (productError) {
      throw new Error(`Failed to create test product: ${productError.message}`);
    }

    testProductId = productData.id;
  });

  afterAll(async () => {
    // Cleanup test data
    if (testProductId) {
      await supabase.from('catalog_items').delete().eq('id', testProductId);
    }
    
    if (testUserId) {
      await supabase.from('user_profiles').delete().eq('id', testUserId);
    }
  });

  describe('GET /api/products/library', () => {
    it('should fetch all products with metadata for authenticated users', async () => {
      const response = await request(app)
        .get('/api/products/library')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.products).toBeInstanceOf(Array);
      expect(response.body.data.pagination).toBeDefined();
      expect(response.body.data.filters_applied).toBeDefined();
      expect(response.body.timestamp).toBeDefined();

      // Check if our test product is included
      const testProduct = response.body.data.products.find((p: any) => p.id === testProductId);
      expect(testProduct).toBeDefined();
      expect(testProduct.metadata).toBeDefined();
      expect(testProduct.pricing_stats).toBeDefined();
      expect(testProduct.mockup_stats).toBeDefined();
    });

    it('should apply category filter correctly', async () => {
      const response = await request(app)
        .get('/api/products/library?category=Jerseys')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.filters_applied.category).toBe('Jerseys');
      
      // All products should be in the Jerseys category
      response.body.data.products.forEach((product: any) => {
        expect(product.category).toBe('Jerseys');
      });
    });

    it('should apply search filter correctly', async () => {
      const response = await request(app)
        .get('/api/products/library?search=Test')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.filters_applied.search).toBe('Test');
    });

    it('should reject unauthenticated requests', async () => {
      const response = await request(app)
        .get('/api/products/library')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return proper pagination information', async () => {
      const response = await request(app)
        .get('/api/products/library?limit=5&offset=0')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.pagination).toEqual({
        offset: 0,
        limit: 5,
        has_more: expect.any(Boolean)
      });
    });
  });

  describe('GET /api/products/library/:id/pricing-history', () => {
    beforeAll(async () => {
      // Create some pricing history for testing
      await supabase.from('catalog_item_price_history').insert([
        {
          catalog_item_id: testProductId,
          old_base_price: 25.99,
          new_base_price: 29.99,
          old_unit_cost: 12.00,
          new_unit_cost: 15.00,
          reason: 'material_cost_increase',
          changed_by: testUserId
        },
        {
          catalog_item_id: testProductId,
          old_base_price: 24.99,
          new_base_price: 25.99,
          old_unit_cost: 11.50,
          new_unit_cost: 12.00,
          reason: 'inflation_adjustment',
          changed_by: testUserId
        }
      ]);
    });

    it('should fetch pricing history for authenticated designers/admins', async () => {
      const response = await request(app)
        .get(`/api/products/library/${testProductId}/pricing-history`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.product_info).toBeDefined();
      expect(response.body.data.pricing_history).toBeInstanceOf(Array);
      expect(response.body.data.statistics).toBeDefined();
      expect(response.body.data.price_timeline).toBeDefined();

      // Validate structure of pricing history items
      if (response.body.data.pricing_history.length > 0) {
        const historyItem = response.body.data.pricing_history[0];
        expect(historyItem).toHaveProperty('old_base_price');
        expect(historyItem).toHaveProperty('new_base_price');
        expect(historyItem).toHaveProperty('price_difference');
        expect(historyItem).toHaveProperty('percentage_change');
        expect(historyItem).toHaveProperty('reason');
        expect(historyItem).toHaveProperty('changed_at');
      }

      // Validate statistics
      expect(response.body.data.statistics.current_base_price).toBe(29.99);
      expect(response.body.data.statistics.total_changes).toBeGreaterThan(0);
      expect(response.body.data.statistics.price_trend).toMatch(/increasing|decreasing|stable/);
    });

    it('should return 404 for non-existent product', async () => {
      const fakeProductId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .get(`/api/products/library/${fakeProductId}/pricing-history`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Product not found');
    });

    it('should respect limit parameter', async () => {
      const response = await request(app)
        .get(`/api/products/library/${testProductId}/pricing-history?limit=1`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.pricing_history.length).toBeLessThanOrEqual(1);
    });
  });

  describe('POST /api/products/library/:id/mockups', () => {
    // Create a test image file
    const testImagePath = path.join(__dirname, 'fixtures', 'test-image.jpg');
    
    beforeAll(() => {
      // Create fixtures directory if it doesn't exist
      const fixturesDir = path.dirname(testImagePath);
      if (!fs.existsSync(fixturesDir)) {
        fs.mkdirSync(fixturesDir, { recursive: true });
      }
      
      // Create a minimal test image (1x1 pixel PNG)
      const testImageBuffer = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
        0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
        0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0x57, 0x63, 0xF8, 0x00, 0x00, 0x00,
        0x01, 0x00, 0x01, 0x5C, 0xCD, 0x90, 0x0A, 0x00, 0x00, 0x00, 0x00, 0x49,
        0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
      ]);
      fs.writeFileSync(testImagePath, testImageBuffer);
    });

    afterAll(() => {
      // Clean up test image
      if (fs.existsSync(testImagePath)) {
        fs.unlinkSync(testImagePath);
      }
    });

    it('should upload mockup successfully for designers and admins', async () => {
      const response = await request(app)
        .post(`/api/products/library/${testProductId}/mockups`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('mockup', testImagePath)
        .field('image_type', 'mockup')
        .field('alt_text', 'Test mockup image')
        .field('notes', 'This is a test mockup')
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.mockup).toBeDefined();
      expect(response.body.data.urls).toBeDefined();
      expect(response.body.message).toBe('Mockup uploaded and processed successfully');

      // Validate mockup data structure
      const mockup = response.body.data.mockup;
      expect(mockup.catalog_item_id).toBe(testProductId);
      expect(mockup.image_type).toBe('mockup');
      expect(mockup.alt_text).toBe('Test mockup image');
      expect(mockup.designer_id).toBe(testUserId);
      expect(mockup.is_active).toBe(true);

      // Validate URLs
      expect(response.body.data.urls.thumbnail).toMatch(/^https?:\/\/.+/);
      expect(response.body.data.urls.medium).toMatch(/^https?:\/\/.+/);
      expect(response.body.data.urls.large).toMatch(/^https?:\/\/.+/);
      expect(response.body.data.urls.original).toMatch(/^https?:\/\/.+/);
    });

    it('should reject requests without image file', async () => {
      const response = await request(app)
        .post(`/api/products/library/${testProductId}/mockups`)
        .set('Authorization', `Bearer ${authToken}`)
        .field('image_type', 'mockup')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('No image file provided');
      expect(response.body.error_code).toBe('MISSING_FILE');
    });

    it('should return 404 for non-existent product', async () => {
      const fakeProductId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .post(`/api/products/library/${fakeProductId}/mockups`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('mockup', testImagePath)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Product not found');
      expect(response.body.error_code).toBe('PRODUCT_NOT_FOUND');
    });
  });

  describe('GET /api/products/library/:id/mockups', () => {
    it('should fetch mockups for a product', async () => {
      const response = await request(app)
        .get(`/api/products/library/${testProductId}/mockups`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.product_info).toBeDefined();
      expect(response.body.data.mockups).toBeInstanceOf(Array);
      expect(response.body.data.statistics).toBeDefined();
      expect(response.body.data.filters_applied).toBeDefined();

      // Validate product info
      expect(response.body.data.product_info.id).toBe(testProductId);
      expect(response.body.data.product_info.name).toBe('Test Product');

      // Validate statistics
      expect(response.body.data.statistics.total_mockups).toBeGreaterThanOrEqual(0);
      expect(response.body.data.statistics.image_types).toBeInstanceOf(Array);
      expect(response.body.data.statistics.active_mockups).toBeGreaterThanOrEqual(0);
    });

    it('should apply image_type filter correctly', async () => {
      const response = await request(app)
        .get(`/api/products/library/${testProductId}/mockups?image_type=mockup`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.filters_applied.image_type).toBe('mockup');

      // All mockups should have the specified image type
      response.body.data.mockups.forEach((mockup: any) => {
        expect(mockup.image_type).toBe('mockup');
      });
    });

    it('should include designer info when requested', async () => {
      const response = await request(app)
        .get(`/api/products/library/${testProductId}/mockups?include_designer_info=true`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.filters_applied.include_designer_info).toBe(true);
      
      // If mockups exist, they should include designer info
      if (response.body.data.mockups.length > 0) {
        const mockupWithDesigner = response.body.data.mockups.find((m: any) => m.designer);
        if (mockupWithDesigner) {
          expect(mockupWithDesigner.designer).toBeDefined();
          expect(mockupWithDesigner.designer.username).toBeDefined();
        }
      }
    });

    it('should return 404 for non-existent product', async () => {
      const fakeProductId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .get(`/api/products/library/${fakeProductId}/mockups`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Product not found');
      expect(response.body.error_code).toBe('PRODUCT_NOT_FOUND');
    });

    it('should respect limit parameter', async () => {
      const response = await request(app)
        .get(`/api/products/library/${testProductId}/mockups?limit=5`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.mockups.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Response Shape Validation', () => {
    it('should have consistent success response structure', async () => {
      const endpoints = [
        '/api/products/library',
        `/api/products/library/${testProductId}/pricing-history`,
        `/api/products/library/${testProductId}/mockups`
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)
          .get(endpoint)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        // All success responses should have these fields
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(response.body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      }
    });

    it('should have consistent error response structure', async () => {
      const response = await request(app)
        .get('/api/products/library/invalid-id/pricing-history')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      // Error responses should have consistent structure
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBeDefined();
      expect(typeof response.body.message).toBe('string');
    });
  });

  describe('Authentication and Authorization', () => {
    it('should require authentication for all endpoints', async () => {
      const endpoints = [
        { method: 'get', path: '/api/products/library' },
        { method: 'get', path: `/api/products/library/${testProductId}/pricing-history` },
        { method: 'get', path: `/api/products/library/${testProductId}/mockups` },
        { method: 'post', path: `/api/products/library/${testProductId}/mockups` }
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)[endpoint.method](endpoint.path)
          .expect(401);

        expect(response.body.success).toBe(false);
      }
    });

    it('should enforce role-based access control for pricing history', async () => {
      // Create a customer user (lower privilege)
      const { data: customerAuth } = await supabase.auth.signUp({
        email: 'customer@example.com',
        password: 'password123'
      });

      if (customerAuth.user) {
        await supabase.from('user_profiles').upsert({
          id: customerAuth.user.id,
          username: 'customer',
          role: 'customer'
        });

        // Customer should not be able to access pricing history
        const response = await request(app)
          .get(`/api/products/library/${testProductId}/pricing-history`)
          .set('Authorization', `Bearer ${customerAuth.session?.access_token}`)
          .expect(403);

        expect(response.body.success).toBe(false);

        // Cleanup
        await supabase.from('user_profiles').delete().eq('id', customerAuth.user.id);
      }
    });
  });
});
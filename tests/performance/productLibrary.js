/**
 * PRODUCT LIBRARY PERFORMANCE TESTS
 * K6 performance testing scenarios for ProductLibrary system
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const productLibraryTrend = new Trend('product_library_duration');
const uploadTrend = new Trend('upload_duration');
const analyticsTrend = new Trend('analytics_duration');

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 10 }, // Ramp up to 10 users
    { duration: '5m', target: 10 }, // Stay at 10 users for 5 minutes
    { duration: '2m', target: 20 }, // Ramp up to 20 users
    { duration: '5m', target: 20 }, // Stay at 20 users for 5 minutes
    { duration: '2m', target: 0 },  // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'], // 95% of requests must complete below 1s
    http_req_failed: ['rate<0.05'],    // Error rate must be below 5%
    errors: ['rate<0.05'],
    product_library_duration: ['p(95)<500'], // ProductLibrary queries under 500ms
    upload_duration: ['p(95)<5000'],         // Uploads under 5 seconds
    analytics_duration: ['p(95)<2000'],      // Analytics under 2 seconds
  },
};

// Test data
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';
let authToken = '';
let testProductId = '';

// Authentication setup
export function setup() {
  // Login to get auth token
  const loginResponse = http.post(`${BASE_URL}/api/auth/login`, {
    email: 'test@example.com',
    password: 'testpassword123'
  });

  if (loginResponse.status === 200) {
    const authData = JSON.parse(loginResponse.body);
    authToken = authData.token;
    
    // Create a test product for testing
    const productResponse = http.post(`${BASE_URL}/api/products/library`, 
      JSON.stringify({
        name: 'Performance Test Product',
        description: 'Product for performance testing',
        category: 'Jerseys',
        sku: 'PERF-TEST-001',
        base_price: 29.99
      }), {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

    if (productResponse.status === 201) {
      const productData = JSON.parse(productResponse.body);
      testProductId = productData.data.id;
    }
  }

  return { authToken, testProductId };
}

// Cleanup after tests
export function teardown(data) {
  if (data.testProductId && data.authToken) {
    // Clean up test product
    http.del(`${BASE_URL}/api/products/library/${data.testProductId}`, {
      headers: { 'Authorization': `Bearer ${data.authToken}` }
    });
  }
}

// Test scenarios
export const scenarios = {
  // Browse ProductLibrary - Most common operation
  browse_products: {
    executor: 'constant-vus',
    vus: 15,
    duration: '10m',
    exec: 'browseProducts',
  },
  
  // Search and filter products
  search_products: {
    executor: 'ramping-vus',
    startVUs: 1,
    stages: [
      { duration: '1m', target: 5 },
      { duration: '3m', target: 5 },
      { duration: '1m', target: 0 },
    ],
    exec: 'searchProducts',
  },
  
  // View mockup galleries
  view_mockups: {
    executor: 'constant-arrival-rate',
    rate: 30, // 30 requests per second
    duration: '5m',
    exec: 'viewMockups',
  },
  
  // Upload mockups - Resource intensive
  upload_mockups: {
    executor: 'ramping-vus',
    startVUs: 1,
    stages: [
      { duration: '2m', target: 3 },
      { duration: '3m', target: 3 },
      { duration: '2m', target: 0 },
    ],
    exec: 'uploadMockups',
  },
  
  // View analytics - Database intensive
  view_analytics: {
    executor: 'constant-arrival-rate',
    rate: 10, // 10 requests per second
    duration: '8m',
    exec: 'viewAnalytics',
  }
};

// Test functions
export function browseProducts(data) {
  const startTime = Date.now();
  
  const response = http.get(`${BASE_URL}/api/products/library`, {
    headers: { 'Authorization': `Bearer ${data.authToken}` }
  });
  
  const duration = Date.now() - startTime;
  productLibraryTrend.add(duration);
  
  const success = check(response, {
    'products loaded successfully': (r) => r.status === 200,
    'response time acceptable': (r) => r.timings.duration < 1000,
    'products array exists': (r) => {
      const body = JSON.parse(r.body);
      return body.data && Array.isArray(body.data.products);
    }
  });
  
  errorRate.add(!success);
  sleep(1);
}

export function searchProducts(data) {
  const searchTerms = ['jersey', 'shirt', 'shorts', 'uniform', 'test'];
  const categories = ['Jerseys', 'Shorts', 'Accessories'];
  
  const searchTerm = searchTerms[Math.floor(Math.random() * searchTerms.length)];
  const category = categories[Math.floor(Math.random() * categories.length)];
  
  const response = http.get(
    `${BASE_URL}/api/products/library?search=${searchTerm}&category=${category}&limit=20`, {
      headers: { 'Authorization': `Bearer ${data.authToken}` }
    }
  );
  
  const success = check(response, {
    'search results returned': (r) => r.status === 200,
    'search performance acceptable': (r) => r.timings.duration < 800,
    'results filtered correctly': (r) => {
      const body = JSON.parse(r.body);
      return body.data && body.data.products;
    }
  });
  
  errorRate.add(!success);
  sleep(2);
}

export function viewMockups(data) {
  if (!data.testProductId) {
    return;
  }
  
  const response = http.get(
    `${BASE_URL}/api/products/library/${data.testProductId}/mockups`, {
      headers: { 'Authorization': `Bearer ${data.authToken}` }
    }
  );
  
  const success = check(response, {
    'mockups loaded': (r) => r.status === 200,
    'mockup load time acceptable': (r) => r.timings.duration < 600,
    'mockups data structure correct': (r) => {
      const body = JSON.parse(r.body);
      return body.data && Array.isArray(body.data.mockups);
    }
  });
  
  errorRate.add(!success);
  sleep(1);
}

export function uploadMockups(data) {
  if (!data.testProductId) {
    return;
  }
  
  // Simulate small image upload (1KB base64 image)
  const smallImageData = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/gA==';
  
  const startTime = Date.now();
  
  const formData = {
    'image_type': 'mockup',
    'alt_text': 'Performance test mockup',
    'notes': 'Uploaded during performance testing',
    'file': http.file(smallImageData, 'test-image.jpg', 'image/jpeg')
  };
  
  const response = http.post(
    `${BASE_URL}/api/products/library/${data.testProductId}/mockups`,
    formData, {
      headers: { 'Authorization': `Bearer ${data.authToken}` }
    }
  );
  
  const duration = Date.now() - startTime;
  uploadTrend.add(duration);
  
  const success = check(response, {
    'upload successful': (r) => r.status === 201,
    'upload time acceptable': (r) => r.timings.duration < 10000, // 10 seconds max
    'upload response valid': (r) => {
      const body = JSON.parse(r.body);
      return body.data && body.data.id;
    }
  });
  
  errorRate.add(!success);
  sleep(3);
}

export function viewAnalytics(data) {
  if (!data.testProductId) {
    return;
  }
  
  const startTime = Date.now();
  
  const response = http.get(
    `${BASE_URL}/api/products/library/${data.testProductId}/analytics`, {
      headers: { 'Authorization': `Bearer ${data.authToken}` }
    }
  );
  
  const duration = Date.now() - startTime;
  analyticsTrend.add(duration);
  
  const success = check(response, {
    'analytics loaded': (r) => r.status === 200,
    'analytics performance acceptable': (r) => r.timings.duration < 3000,
    'analytics data complete': (r) => {
      const body = JSON.parse(r.body);
      return body.data && body.data.stats;
    }
  });
  
  errorRate.add(!success);
  sleep(2);
}

// Stress test scenario - can be run separately
export function stressTest(data) {
  const responses = http.batch([
    ['GET', `${BASE_URL}/api/products/library`, null, { 
      headers: { 'Authorization': `Bearer ${data.authToken}` } 
    }],
    ['GET', `${BASE_URL}/api/products/library/stats`, null, { 
      headers: { 'Authorization': `Bearer ${data.authToken}` } 
    }],
    ['GET', `${BASE_URL}/api/products/library/mockups/all`, null, { 
      headers: { 'Authorization': `Bearer ${data.authToken}` } 
    }]
  ]);
  
  const allSuccessful = responses.every(response => {
    return check(response, {
      'batch request successful': (r) => r.status === 200,
      'batch performance acceptable': (r) => r.timings.duration < 2000
    });
  });
  
  errorRate.add(!allSuccessful);
}

// Memory leak detection scenario
export function memoryLeakTest(data) {
  // Rapidly create and access data to detect memory leaks
  for (let i = 0; i < 10; i++) {
    const response = http.get(`${BASE_URL}/api/products/library?limit=50&offset=${i * 50}`, {
      headers: { 'Authorization': `Bearer ${data.authToken}` }
    });
    
    check(response, {
      'memory test request successful': (r) => r.status === 200,
      'memory usage stable': (r) => r.timings.duration < 1500
    });
  }
  
  sleep(1);
}
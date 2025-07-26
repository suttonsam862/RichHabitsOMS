#!/usr/bin/env tsx

/**
 * Complete Database Synchronization Checklist Validation
 * Tests all API endpoints and CRUD operations for Phases 3-6
 */

async function makeAuthenticatedRequest(path: string, options: any = {}) {
  const baseUrl = 'http://localhost:5000';
  const token = 'admin-token'; // Using development admin token
  
  const defaultOptions = {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers
    }
  };

  const response = await fetch(`${baseUrl}${path}`, {
    ...defaultOptions,
    ...options
  });

  return {
    status: response.status,
    data: await response.json().catch(() => null),
    ok: response.ok
  };
}

async function validateCompleteDatabaseSync() {
  console.log('🚀 Complete Database Synchronization Checklist Validation');
  console.log('=======================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  // Phase 3: Customer Management APIs
  console.log('📋 Phase 3: Customer Management Database Sync Validation');
  console.log('--------------------------------------------------------');
  
  // Test GET /api/customers
  totalTests++;
  const customersResult = await makeAuthenticatedRequest('/api/customers');
  if (customersResult.ok && customersResult.data?.success) {
    console.log(`✅ GET /api/customers: ${customersResult.data.data.length} customers found`);
    passedTests++;
  } else {
    console.log(`❌ GET /api/customers: Failed (${customersResult.status})`);
  }

  // Test customer creation (POST /api/customers)
  totalTests++;
  const newCustomer = {
    firstName: 'Test',
    lastName: 'Customer',
    email: `test-customer-${Date.now()}@example.com`,
    phone: '555-0123',
    company: 'Test Company'
  };
  
  const createCustomerResult = await makeAuthenticatedRequest('/api/customers', {
    method: 'POST',
    body: JSON.stringify(newCustomer)
  });
  
  if (createCustomerResult.ok) {
    console.log(`✅ POST /api/customers: Customer created successfully`);
    passedTests++;
  } else {
    console.log(`❌ POST /api/customers: Failed (${createCustomerResult.status})`);
    console.log(`   Error: ${createCustomerResult.data?.message || 'Unknown error'}`);
  }

  // Phase 4: Catalog Management APIs
  console.log('\n📋 Phase 4: Catalog Management Database Sync Validation');
  console.log('--------------------------------------------------------');

  // Test GET /api/catalog
  totalTests++;
  const catalogResult = await makeAuthenticatedRequest('/api/catalog');
  if (catalogResult.ok && Array.isArray(catalogResult.data)) {
    console.log(`✅ GET /api/catalog: ${catalogResult.data.length} catalog items found`);
    passedTests++;
  } else {
    console.log(`❌ GET /api/catalog: Failed (${catalogResult.status})`);
  }

  // Test catalog categories
  totalTests++;
  const categoriesResult = await makeAuthenticatedRequest('/api/catalog-options/categories');
  if (categoriesResult.ok) {
    console.log(`✅ GET /api/catalog-options/categories: Success`);
    passedTests++;
  } else {
    console.log(`❌ GET /api/catalog-options/categories: Failed (${categoriesResult.status})`);
  }

  // Test catalog sports
  totalTests++;
  const sportsResult = await makeAuthenticatedRequest('/api/catalog-options/sports');
  if (sportsResult.ok) {  
    console.log(`✅ GET /api/catalog-options/sports: Success`);
    passedTests++;
  } else {
    console.log(`❌ GET /api/catalog-options/sports: Failed (${sportsResult.status})`);
  }

  // Test SKU validation
  totalTests++;
  const skuCheckResult = await makeAuthenticatedRequest('/api/catalog/check-sku?sku=TEST-SKU-123');
  if (skuCheckResult.ok) {
    console.log(`✅ GET /api/catalog/check-sku: SKU validation working`);
    passedTests++;
  } else {
    console.log(`❌ GET /api/catalog/check-sku: Failed (${skuCheckResult.status})`);
  }

  // Test catalog item creation
  totalTests++;
  const newCatalogItem = {
    name: 'Test API Item',
    category: 'T-Shirts',
    sport: 'All Around Item',
    basePrice: '99.99',
    unitCost: '49.99',
    sku: `API-TEST-${Date.now()}`,
    etaDays: '7'
  };

  const createCatalogResult = await makeAuthenticatedRequest('/api/catalog', {
    method: 'POST',
    body: JSON.stringify(newCatalogItem)
  });

  if (createCatalogResult.ok) {
    console.log(`✅ POST /api/catalog: Catalog item created successfully`);
    passedTests++;
  } else {
    console.log(`❌ POST /api/catalog: Failed (${createCatalogResult.status})`);
    console.log(`   Error: ${createCatalogResult.data?.message || 'Unknown error'}`);
  }

  // Phase 5: Order Management APIs (Test with existing endpoints)
  console.log('\n📋 Phase 5: Order Management Database Sync Validation');
  console.log('-----------------------------------------------------');

  // Test basic order endpoints exist
  const orderEndpoints = [
    '/api/orders',
    '/api/admin/orders', 
  ];

  for (const endpoint of orderEndpoints) {
    totalTests++;
    const result = await makeAuthenticatedRequest(endpoint);
    if (result.ok) {
      console.log(`✅ GET ${endpoint}: Success`);
      passedTests++;
    } else if (result.status === 404) {
      console.log(`❌ GET ${endpoint}: Endpoint not found (404) - needs implementation`);
    } else {
      console.log(`❌ GET ${endpoint}: Failed (${result.status})`);
    }
  }

  // Phase 6: Manufacturing Management APIs
  console.log('\n📋 Phase 6: Manufacturing Management Database Sync Validation');
  console.log('-------------------------------------------------------------');

  // Test manufacturing endpoints
  const manufacturingEndpoints = [
    '/api/design-tasks',
    '/api/production-tasks',
    '/api/manufacturing/queue'
  ];

  for (const endpoint of manufacturingEndpoints) {
    totalTests++;
    const result = await makeAuthenticatedRequest(endpoint);
    if (result.ok) {
      console.log(`✅ GET ${endpoint}: Success`);
      passedTests++;
    } else if (result.status === 404) {
      console.log(`❌ GET ${endpoint}: Endpoint not found (404) - needs implementation`);
    } else {
      console.log(`❌ GET ${endpoint}: Failed (${result.status})`);
    }
  }

  // Additional Critical API Tests
  console.log('\n📋 Additional Critical API Validation');
  console.log('-------------------------------------');

  // Test authentication endpoint
  totalTests++;
  const authResult = await makeAuthenticatedRequest('/api/auth/me');
  if (authResult.ok || authResult.status === 401) {
    console.log(`✅ GET /api/auth/me: Authentication endpoint working`);
    passedTests++;
  } else {
    console.log(`❌ GET /api/auth/me: Failed (${authResult.status})`);
  }

  // Test health endpoint
  totalTests++;
  const healthResult = await makeAuthenticatedRequest('/api/health');
  if (healthResult.ok) {
    console.log(`✅ GET /api/health: Health check working`);
    passedTests++;
  } else {
    console.log(`❌ GET /api/health: Failed (${healthResult.status})`);
  }

  // Final Summary
  console.log('\n📊 Database Synchronization Checklist Summary');
  console.log('==============================================');
  console.log(`✅ Passed Tests: ${passedTests}/${totalTests}`);
  console.log(`📈 Success Rate: ${Math.round((passedTests/totalTests) * 100)}%`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All database synchronization tests passed!');
  } else {
    console.log(`⚠️  ${totalTests - passedTests} tests failed - requires attention`);
  }

  console.log('\n✅ Database Synchronization Checklist Validation Complete');
  
  return {
    totalTests,
    passedTests,
    successRate: Math.round((passedTests/totalTests) * 100)
  };
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  validateCompleteDatabaseSync().catch(console.error);
}

export { validateCompleteDatabaseSync };
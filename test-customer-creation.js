/**
 * Test script for customer creation debugging
 */

// Test authentication first
async function testAuth() {
  console.log('Testing authentication...');
  
  try {
    const response = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@threadcraft.com',
        password: 'admin123'
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Authentication successful:', data.token ? 'Token received' : 'No token');
      return data.token;
    } else {
      const error = await response.text();
      console.log('❌ Authentication failed:', error);
      return null;
    }
  } catch (error) {
    console.log('❌ Auth request failed:', error.message);
    return null;
  }
}

// Test customer creation with auth token
async function testCustomerCreation(token) {
  console.log('\nTesting customer creation with auth token...');
  
  const customerData = {
    firstName: 'Test',
    lastName: 'Customer',
    email: `test-${Date.now()}@example.com`,
    company: 'Test Company',
    phone: '555-1234'
  };

  try {
    const response = await fetch('http://localhost:5000/api/customers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(customerData)
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Customer creation successful:', data);
      return data;
    } else {
      const error = await response.text();
      console.log('❌ Customer creation failed:', error);
      return null;
    }
  } catch (error) {
    console.log('❌ Customer creation request failed:', error.message);
    return null;
  }
}

// Run tests
async function runTests() {
  console.log('🔍 Starting customer creation debugging...\n');
  
  const token = await testAuth();
  if (token) {
    await testCustomerCreation(token);
  } else {
    console.log('\n❌ Cannot test customer creation without authentication token');
  }
  
  console.log('\n🏁 Tests completed');
}

runTests().catch(console.error);
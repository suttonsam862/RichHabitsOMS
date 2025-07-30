/**
 * Test customer creation from frontend perspective with proper authentication
 */

async function testFrontendCustomerCreation() {
  console.log('🔍 Testing frontend customer creation flow...\n');
  
  // Simulate frontend token retrieval (this would come from localStorage in real frontend)
  const frontendToken = 'dev-admin-token-frontend-' + Date.now();
  
  const customerData = {
    firstName: 'Frontend',
    lastName: 'Customer',
    email: `frontend-customer-${Date.now()}@example.com`,
    company: 'Frontend Company',
    phone: '555-FRONT',
    address: '123 Frontend St',
    city: 'Frontend City',
    state: 'FC',
    zip: '12345',
    country: 'USA',
    sendInvite: false
  };

  try {
    console.log('📤 Frontend customer creation request:');
    console.log('Token:', frontendToken);
    console.log('Data:', JSON.stringify(customerData, null, 2));
    
    const response = await fetch('http://localhost:5000/api/customers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${frontendToken}`
      },
      body: JSON.stringify(customerData)
    });

    const responseText = await response.text();
    console.log('\n📥 Response Status:', response.status);
    console.log('📥 Response Body:', responseText);

    if (response.ok) {
      console.log('\n✅ SUCCESS: Frontend customer creation worked!');
      try {
        const data = JSON.parse(responseText);
        console.log('Created customer:', data.customer);
        return data.customer;
      } catch (e) {
        console.log('Response is not JSON');
      }
    } else {
      console.log('\n❌ FAILED: Frontend customer creation failed');
    }

  } catch (error) {
    console.log('\n💥 Request failed:', error.message);
  }
}

// Test getting customers list after creation
async function testCustomersList() {
  console.log('\n\n🔍 Testing customers list...\n');
  
  try {
    const response = await fetch('http://localhost:5000/api/customers');
    const data = await response.json();
    
    console.log('📋 Customer list:');
    console.log('Total count:', data.count);
    console.log('Recent customers:', data.data?.slice(0, 3)?.map(c => ({
      id: c.id,
      name: `${c.firstName} ${c.lastName}`,
      email: c.email,
      created: c.created_at
    })));
    
  } catch (error) {
    console.log('💥 Customer list request failed:', error.message);
  }
}

async function runFrontendTests() {
  console.log('🚀 Starting frontend customer creation tests...\n');
  
  const newCustomer = await testFrontendCustomerCreation();
  if (newCustomer) {
    await testCustomersList();
  }
  
  console.log('\n🏁 Frontend tests completed');
}

runFrontendTests().catch(console.error);
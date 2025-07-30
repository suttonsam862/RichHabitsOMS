/**
 * Test customer creation bypassing auth user creation
 */

async function testDirectCustomerInsert() {
  console.log('🔍 Testing direct customer profile creation...\n');
  
  const customerData = {
    firstName: 'Direct',
    lastName: 'Customer',
    email: `direct-customer-${Date.now()}@example.com`,
    company: 'Direct Company',
    phone: '555-9999',
    address: '123 Test St',
    city: 'Test City',
    state: 'TS',
    zip: '12345',
    sendInvite: false
  };

  try {
    const response = await fetch('http://localhost:5000/api/customers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer dev-admin-token-${Date.now()}`
      },
      body: JSON.stringify(customerData)
    });

    const responseText = await response.text();
    console.log('📤 Customer creation test:');
    console.log('Status:', response.status);
    console.log('Response:', responseText);

    if (response.ok) {
      console.log('\n✅ SUCCESS: Customer created successfully!');
    } else {
      console.log('\n❌ FAILED: Customer creation failed');
      console.log('Debugging info:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });
    }

  } catch (error) {
    console.log('\n💥 Request failed:', error.message);
  }
}

async function runBypassTest() {
  await testDirectCustomerInsert();
  console.log('\n🏁 Bypass test completed');
}

runBypassTest().catch(console.error);
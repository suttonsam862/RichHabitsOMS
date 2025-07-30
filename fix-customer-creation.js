/**
 * Comprehensive customer creation debugging and fix script
 */

// Test with a real admin token from the browser
async function testWithBrowserToken() {
  console.log('🔍 Testing customer creation with browser token...\n');
  
  // This token should be copied from browser localStorage
  // In development, we'll simulate authentication
  const adminToken = 'dev-admin-token-' + Date.now();
  
  const customerData = {
    firstName: 'Debug',
    lastName: 'Customer', 
    email: `debug-customer-${Date.now()}@example.com`,
    company: 'Debug Company',
    phone: '555-0123',
    sendInvite: false // Don't send actual emails during testing
  };

  try {
    console.log('📤 Sending customer creation request...');
    console.log('Data:', JSON.stringify(customerData, null, 2));
    
    const response = await fetch('http://localhost:5000/api/customers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify(customerData)
    });

    const responseText = await response.text();
    console.log('\n📥 Response Status:', response.status);
    console.log('📥 Response Headers:', Object.fromEntries(response.headers.entries()));
    console.log('📥 Response Body:', responseText);

    if (response.ok) {
      console.log('\n✅ Customer creation successful!');
      try {
        const data = JSON.parse(responseText);
        console.log('Customer data:', data);
      } catch (e) {
        console.log('Response is not JSON');
      }
    } else {
      console.log('\n❌ Customer creation failed');
      console.log('Status:', response.status, response.statusText);
    }

  } catch (error) {
    console.log('\n💥 Request failed:', error.message);
  }
}

// Test getting existing customers
async function testGetCustomers() {
  console.log('\n\n🔍 Testing customer listing...\n');
  
  try {
    const response = await fetch('http://localhost:5000/api/customers');
    const data = await response.json();
    
    console.log('📥 Customer list response:');
    console.log('Status:', response.status);
    console.log('Count:', data.count);
    console.log('First customer:', data.data?.[0]);
    
  } catch (error) {
    console.log('💥 Customer list request failed:', error.message);
  }
}

// Run comprehensive tests
async function runComprehensiveTests() {
  console.log('🚀 Starting comprehensive customer creation debugging...\n');
  
  await testGetCustomers();
  await testWithBrowserToken();
  
  console.log('\n🏁 All tests completed');
}

runComprehensiveTests().catch(console.error);
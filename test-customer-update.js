#!/usr/bin/env node

/**
 * Test customer update endpoints
 */

async function testCustomerUpdate() {
  const baseUrl = 'http://localhost:5000';
  const devToken = 'dev-test-token-admin';
  
  // Helper function to create request headers
  const getHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${devToken}`
  });
  
  try {
    console.log('🧪 Testing Customer Update Endpoints');
    console.log('=====================================\n');

    // First, get list of customers to find a valid ID
    console.log('1. Fetching customers to get valid ID...');
    const customersResponse = await fetch(`${baseUrl}/api/customers`);
    const customersData = await customersResponse.json();
    
    if (!customersData.success || !customersData.data || customersData.data.length === 0) {
      console.error('❌ No customers found to test with');
      return;
    }

    const testCustomer = customersData.data[0];
    console.log(`✅ Found test customer: ${testCustomer.firstName} ${testCustomer.lastName} (${testCustomer.id})`);

    // Test 1: Invalid customer ID format
    console.log('\n2. Testing invalid customer ID format...');
    const invalidIdResponse = await fetch(`${baseUrl}/api/customers/invalid-id`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({
        firstName: 'Test',
        lastName: 'Update'
      })
    });
    
    const invalidIdData = await invalidIdResponse.json();
    console.log(`Status: ${invalidIdResponse.status}`);
    console.log(`Response:`, invalidIdData);
    
    if (invalidIdResponse.status === 400 && invalidIdData.message.includes('Invalid customer ID format')) {
      console.log('✅ Invalid ID validation working correctly');
    } else {
      console.log('❌ Invalid ID validation not working as expected');
    }

    // Test 2: Customer not found
    console.log('\n3. Testing non-existent customer ID...');
    const notFoundResponse = await fetch(`${baseUrl}/api/customers/00000000-0000-0000-0000-000000000000`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({
        firstName: 'Test',
        lastName: 'Update'
      })
    });
    
    const notFoundData = await notFoundResponse.json();
    console.log(`Status: ${notFoundResponse.status}`);
    console.log(`Response:`, notFoundData);
    
    if (notFoundResponse.status === 404 && notFoundData.message.includes('Customer not found')) {
      console.log('✅ Customer not found handling working correctly');
    } else {
      console.log('❌ Customer not found handling not working as expected');
    }

    // Test 3: Valid customer update with PATCH
    console.log('\n4. Testing valid customer update with PATCH...');
    const originalName = testCustomer.firstName;
    const updateData = {
      firstName: `${originalName} Updated`,
      company: 'Updated Test Company',
      phone: '555-0999'
    };
    
    const patchResponse = await fetch(`${baseUrl}/api/customers/${testCustomer.id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(updateData)
    });
    
    const patchData = await patchResponse.json();
    console.log(`Status: ${patchResponse.status}`);
    console.log(`Response:`, JSON.stringify(patchData, null, 2));
    
    if (patchResponse.status === 200 && patchData.success) {
      console.log('✅ PATCH update successful');
      
      // Verify the data was updated
      if (patchData.customer && patchData.customer.firstName === updateData.firstName) {
        console.log('✅ Customer data updated correctly');
      } else {
        console.log('❌ Customer data not updated correctly');
      }
    } else {
      console.log('❌ PATCH update failed');
    }

    // Test 4: Valid customer update with PUT
    console.log('\n5. Testing valid customer update with PUT...');
    const putData = {
      firstName: originalName, // Restore original name
      lastName: testCustomer.lastName,
      email: testCustomer.email,
      company: 'PUT Test Company',
      phone: '555-0888'
    };
    
    const putResponse = await fetch(`${baseUrl}/api/customers/${testCustomer.id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(putData)
    });
    
    const putResponseData = await putResponse.json();
    console.log(`Status: ${putResponse.status}`);
    console.log(`Response:`, JSON.stringify(putResponseData, null, 2));
    
    if (putResponse.status === 200 && putResponseData.success) {
      console.log('✅ PUT update successful');
    } else {
      console.log('❌ PUT update failed');
    }

    // Test 5: Test field mapping (camelCase vs snake_case)
    console.log('\n6. Testing field mapping...');
    const fieldMappingData = {
      first_name: 'Snake Case Test', // snake_case
      lastName: 'Camel Case Test',   // camelCase
      email: testCustomer.email
    };
    
    const mappingResponse = await fetch(`${baseUrl}/api/customers/${testCustomer.id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(fieldMappingData)
    });
    
    const mappingData = await mappingResponse.json();
    console.log(`Status: ${mappingResponse.status}`);
    console.log(`Response:`, JSON.stringify(mappingData, null, 2));
    
    if (mappingResponse.status === 200 && mappingData.success) {
      console.log('✅ Field mapping test successful');
    } else {
      console.log('❌ Field mapping test failed');
    }

    console.log('\n🎉 Customer update endpoint testing completed!');

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

// Run the test
testCustomerUpdate().catch(console.error);
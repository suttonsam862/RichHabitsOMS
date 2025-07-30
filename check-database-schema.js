/**
 * Check database schema for customers table
 */

async function checkCustomersSchema() {
  console.log('🔍 Checking customers table schema...\n');
  
  try {
    const response = await fetch('http://localhost:5000/api/customers');
    const data = await response.json();
    
    console.log('✅ API Response Status:', response.status);
    console.log('✅ Customer count:', data.count);
    
    if (data.data && data.data.length > 0) {
      console.log('\n📋 Sample customer structure:');
      const sample = data.data[0];
      Object.keys(sample).forEach(key => {
        console.log(`  ${key}: ${typeof sample[key]} = ${sample[key]}`);
      });
    }
    
  } catch (error) {
    console.log('❌ Error checking schema:', error.message);
  }
}

// Test auth user creation separately
async function testAuthCreation() {
  console.log('\n\n🔍 Testing auth user creation...\n');
  
  const testEmail = `auth-test-${Date.now()}@example.com`;
  
  try {
    const response = await fetch('http://localhost:5000/api/customers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer dev-admin-token-${Date.now()}`
      },
      body: JSON.stringify({
        firstName: 'Auth',
        lastName: 'Test',
        email: testEmail,
        sendInvite: false
      })
    });

    const responseText = await response.text();
    console.log('📤 Auth creation response:');
    console.log('Status:', response.status);
    console.log('Body:', responseText);

  } catch (error) {
    console.log('❌ Auth creation failed:', error.message);
  }
}

async function runSchemaCheck() {
  await checkCustomersSchema();
  await testAuthCreation();
  console.log('\n🏁 Schema check completed');
}

runSchemaCheck().catch(console.error);
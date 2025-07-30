/**
 * Test Supabase Storage configuration and permissions
 */

async function testSupabaseStorageConfig() {
  console.log('🔍 Testing Supabase Storage configuration and permissions...\n');
  
  try {
    // Test bucket creation/access
    const response = await fetch('http://localhost:5000/api/images/test-storage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer dev-admin-token-${Date.now()}`
      },
      body: JSON.stringify({
        testBuckets: true,
        testUpload: true
      })
    });

    const data = await response.json();
    console.log('📋 Storage test results:');
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));

  } catch (error) {
    console.log('❌ Storage test failed:', error.message);
  }
}

async function testImageUpload() {
  console.log('\n🔍 Testing actual image upload...\n');
  
  try {
    // Create a test form data with a small image
    const formData = new FormData();
    
    // Create a minimal test image blob
    const canvas = document?.createElement ? document.createElement('canvas') : null;
    if (!canvas) {
      console.log('⚠️ Cannot create test image in Node.js environment');
      return;
    }
    
    canvas.width = 100;
    canvas.height = 100;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#00d1ff';
    ctx.fillRect(0, 0, 100, 100);
    
    canvas.toBlob(async (blob) => {
      formData.append('image', blob, 'test-image.png');
      
      const response = await fetch('http://localhost:5000/api/images/catalog/test-item-id', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer dev-admin-token-${Date.now()}`
        },
        body: formData
      });

      console.log('📤 Image upload test:');
      console.log('Status:', response.status);
      const result = await response.text();
      console.log('Response:', result);
    }, 'image/png');
    
  } catch (error) {
    console.log('❌ Image upload test failed:', error.message);
  }
}

async function runStorageTests() {
  await testSupabaseStorageConfig();
  // Note: testImageUpload() requires browser environment for canvas
  console.log('\n🏁 Storage tests completed');
}

runStorageTests().catch(console.error);
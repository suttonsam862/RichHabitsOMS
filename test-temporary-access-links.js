/**
 * TEMPORARY ACCESS LINK TESTING SCRIPT
 * Tests the temporary access link generation functionality
 */

const baseUrl = 'http://localhost:5000';
const authToken = 'dev-test-token-admin';

// Test single image temporary access link generation
async function testSingleImageAccess() {
  console.log('\n🔗 Testing Single Image Temporary Access Link...');
  
  const response = await fetch(`${baseUrl}/api/images/access/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({
      imageId: '550e8400-e29b-41d4-a716-446655440000',
      expiresInSeconds: 3600
    })
  });

  const data = await response.json();
  console.log('Single Image Access Response:', JSON.stringify(data, null, 2));
  
  if (data.success) {
    console.log('✅ Single image access link generated successfully');
    console.log(`🔗 Signed URL: ${data.data.signedUrl.substring(0, 100)}...`);
    console.log(`⏰ Expires At: ${data.data.expiresAt}`);
  } else {
    console.log('❌ Single image access failed:', data.message);
  }
}

// Test bulk image temporary access link generation
async function testBulkImageAccess() {
  console.log('\n🔗 Testing Bulk Image Temporary Access Links...');
  
  const imageIds = [
    '550e8400-e29b-41d4-a716-446655440000',
    '650e8400-e29b-41d4-a716-446655440001',
    '750e8400-e29b-41d4-a716-446655440002'
  ];
  
  const response = await fetch(`${baseUrl}/api/images/access/bulk-generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({
      imageIds,
      expiresInSeconds: 7200
    })
  });

  const data = await response.json();
  console.log('Bulk Image Access Response:', JSON.stringify(data, null, 2));
  
  if (data.success) {
    console.log('✅ Bulk image access links generated');
    console.log(`📊 Summary: ${data.data.summary.successful}/${data.data.summary.total} successful`);
  } else {
    console.log('❌ Bulk image access failed:', data.message);
  }
}

// Test entity-based image temporary access link generation
async function testEntityImageAccess() {
  console.log('\n🔗 Testing Entity Image Temporary Access Links...');
  
  const response = await fetch(`${baseUrl}/api/images/access/entity-generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({
      entityType: 'catalog_item',
      entityId: '550e8400-e29b-41d4-a716-446655440000',
      imagePurpose: 'gallery',
      expiresInSeconds: 3600
    })
  });

  const data = await response.json();
  console.log('Entity Image Access Response:', JSON.stringify(data, null, 2));
  
  if (data.success) {
    console.log('✅ Entity image access links generated');
    console.log(`📊 Found ${data.data.results.length} images for entity`);
  } else {
    console.log('❌ Entity image access failed:', data.message);
  }
}

// Test download link generation
async function testDownloadLink() {
  console.log('\n📥 Testing Download Link Generation...');
  
  const response = await fetch(`${baseUrl}/api/images/access/download`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({
      imageId: '550e8400-e29b-41d4-a716-446655440000',
      downloadFilename: 'my-custom-download-name.jpg',
      expiresInSeconds: 1800
    })
  });

  const data = await response.json();
  console.log('Download Link Response:', JSON.stringify(data, null, 2));
  
  if (data.success) {
    console.log('✅ Download link generated successfully');
    console.log(`📥 Download URL: ${data.data.downloadUrl.substring(0, 100)}...`);
    console.log(`📄 Filename: ${data.data.filename}`);
  } else {
    console.log('❌ Download link generation failed:', data.message);
  }
}

// Test GET endpoint for entity access links
async function testEntityGetEndpoint() {
  console.log('\n🔗 Testing Entity GET Endpoint...');
  
  const response = await fetch(`${baseUrl}/api/images/access/entity/catalog_item/550e8400-e29b-41d4-a716-446655440000?imagePurpose=gallery&expiresInSeconds=3600`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${authToken}`
    }
  });

  const data = await response.json();
  console.log('Entity GET Response:', JSON.stringify(data, null, 2));
  
  if (data.success) {
    console.log('✅ Entity GET endpoint working');
    console.log(`📊 Found ${data.data.results.length} images`);
  } else {
    console.log('❌ Entity GET endpoint failed:', data.message);
  }
}

// Test access statistics endpoint
async function testAccessStats() {
  console.log('\n📊 Testing Access Statistics...');
  
  const response = await fetch(`${baseUrl}/api/images/access/stats`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${authToken}`
    }
  });

  const data = await response.json();
  console.log('Access Stats Response:', JSON.stringify(data, null, 2));
  
  if (data.success) {
    console.log('✅ Access statistics retrieved');
    console.log(`🔧 Temporary links supported: ${data.data.access_tracking.temporary_links_supported}`);
    console.log(`⏰ Max expiry: ${data.data.access_tracking.max_expiry_seconds} seconds`);
  } else {
    console.log('❌ Access statistics failed:', data.message);
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting Temporary Access Link Tests...');
  console.log('=' .repeat(60));
  
  try {
    await testSingleImageAccess();
    await testBulkImageAccess();
    await testEntityImageAccess();
    await testDownloadLink();
    await testEntityGetEndpoint();
    await testAccessStats();
    
    console.log('\n' + '=' .repeat(60));
    console.log('✅ All temporary access link tests completed');
    console.log('\nNote: Some tests may fail if the image_assets table doesn\'t exist yet.');
    console.log('Create the table using create-image-assets-table.sql in Supabase SQL Editor.');
  } catch (error) {
    console.error('❌ Test execution failed:', error);
  }
}

// Run tests automatically
runAllTests();
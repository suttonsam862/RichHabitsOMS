/**
 * COMPREHENSIVE UPLOAD SYSTEM TEST
 * Tests the complete file upload pipeline with real image data
 */

import FormData from 'form-data';
import fs from 'fs';
import fetch from 'node-fetch';
import sharp from 'sharp';

async function createTestImage() {
  // Create a simple test image using Sharp
  const testImage = await sharp({
    create: {
      width: 500,
      height: 500,
      channels: 3,
      background: { r: 0, g: 209, b: 255 }
    }
  })
  .jpeg({ quality: 90 })
  .toBuffer();

  return testImage;
}

async function testImageUploadPipeline() {
  console.log('🧪 Testing Complete Image Upload System\n');

  try {
    // Step 1: Test storage configuration
    console.log('📋 Step 1: Testing storage configuration...');
    const storageTestResponse = await fetch('http://localhost:5000/api/images-fixed/test-storage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer dev-admin-token-${Date.now()}`
      },
      body: JSON.stringify({ testBuckets: true })
    });

    const storageTestData = await storageTestResponse.json();
    console.log('Storage Test Results:', storageTestData);

    if (!storageTestData.success) {
      console.log('❌ Storage test failed, but continuing...');
    }

    // Step 2: Create a test catalog item
    console.log('\n📦 Step 2: Creating test catalog item...');
    const catalogCreateResponse = await fetch('http://localhost:5000/api/catalog', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer dev-admin-token-${Date.now()}`
      },
      body: JSON.stringify({
        name: 'Test Image Upload Item',
        category: 'Clothing',
        sport: 'General',
        price: 25.99,
        sku: `TEST-IMG-${Date.now()}`
      })
    });

    const catalogItemData = await catalogCreateResponse.json();
    
    if (!catalogItemData.success) {
      console.log('❌ Failed to create catalog item:', catalogItemData);
      return;
    }

    const catalogItemId = catalogItemData.data.id;
    console.log('✅ Created catalog item:', catalogItemId);

    // Step 3: Test image upload
    console.log('\n📤 Step 3: Testing image upload...');
    
    // Create test image
    const testImageBuffer = await createTestImage();
    console.log(`📷 Created test image: ${(testImageBuffer.length / 1024).toFixed(2)}KB`);

    // Prepare form data
    const formData = new FormData();
    formData.append('image', testImageBuffer, {
      filename: 'test-upload.jpg',
      contentType: 'image/jpeg'
    });

    // Upload image
    const uploadResponse = await fetch(`http://localhost:5000/api/images-fixed/catalog/${catalogItemId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer dev-admin-token-${Date.now()}`,
        ...formData.getHeaders()
      },
      body: formData
    });

    const uploadData = await uploadResponse.json();
    console.log('\n📋 Upload Response:');
    console.log('Status:', uploadResponse.status);
    console.log('Success:', uploadData.success);
    
    if (uploadData.success) {
      console.log('✅ Image upload successful!');
      console.log('Image URLs:');
      if (uploadData.data.imageUrls) {
        Object.entries(uploadData.data.imageUrls).forEach(([variant, url]) => {
          console.log(`  ${variant}: ${url}`);
        });
      }
    } else {
      console.log('❌ Image upload failed:', uploadData.message);
      if (uploadData.error) {
        console.log('Error details:', uploadData.error);
      }
    }

    // Step 4: Verify catalog item was updated with image URLs
    console.log('\n🔍 Step 4: Verifying catalog item update...');
    const catalogItemResponse = await fetch(`http://localhost:5000/api/catalog/${catalogItemId}`, {
      headers: {
        'Authorization': `Bearer dev-admin-token-${Date.now()}`
      }
    });

    const catalogItemUpdated = await catalogItemResponse.json();
    
    if (catalogItemUpdated.success && catalogItemUpdated.data.base_image_url) {
      console.log('✅ Catalog item updated with image URLs');
      console.log('Base image URL:', catalogItemUpdated.data.base_image_url);
    } else {
      console.log('❌ Catalog item not properly updated with image URLs');
    }

    console.log('\n🏁 Complete upload system test finished');

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error(error.stack);
  }
}

// Run the test
testImageUploadPipeline().catch(console.error);
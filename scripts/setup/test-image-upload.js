
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');

async function testImageUpload() {
  console.log('🖼️ Testing Image Upload System...\n');

  const baseUrl = 'http://0.0.0.0:5000';
  const authToken = 'dev-admin-token-1753494276436'; // Use dev token

  try {
    // Step 1: Create a test catalog item
    console.log('1. Creating test catalog item...');
    const catalogItem = {
      name: 'Image Test Item',
      category: 'T-Shirts',
      sport: 'All Around Item',
      basePrice: 25.99,
      unitCost: 15.00,
      sku: `IMG-TEST-${Date.now()}`,
      etaDays: '7',
      status: 'active'
    };

    const createResponse = await fetch(`${baseUrl}/api/catalog`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(catalogItem)
    });

    if (!createResponse.ok) {
      throw new Error(`Failed to create catalog item: ${createResponse.status}`);
    }

    const createResult = await createResponse.json();
    const itemId = createResult.item.id;
    console.log(`✅ Created catalog item with ID: ${itemId}`);

    // Step 2: Create a test image (1x1 pixel PNG)
    console.log('2. Creating test image...');
    const testImageBuffer = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
      0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0x1D, 0x01, 0x01, 0x00, 0x00, 0xFF,
      0xFF, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, 0x73, 0x75, 0x01, 0x18, 0x00,
      0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
    ]);

    // Step 3: Upload the image
    console.log('3. Uploading image...');
    const formData = new FormData();
    formData.append('image', testImageBuffer, {
      filename: 'test-image.png',
      contentType: 'image/png'
    });

    const uploadResponse = await fetch(`${baseUrl}/api/images/catalog/${itemId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      body: formData
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`Failed to upload image: ${uploadResponse.status} - ${errorText}`);
    }

    const uploadResult = await uploadResponse.json();
    console.log('✅ Image uploaded successfully:', uploadResult);

    // Step 4: Verify the catalog item now has the image URL
    console.log('4. Verifying image association...');
    const verifyResponse = await fetch(`${baseUrl}/api/catalog/${itemId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (!verifyResponse.ok) {
      throw new Error(`Failed to fetch catalog item: ${verifyResponse.status}`);
    }

    const verifyResult = await verifyResponse.json();
    const hasImageUrl = verifyResult.item.base_image_url || verifyResult.item.imageUrl;

    if (hasImageUrl) {
      console.log('✅ Image URL successfully associated with catalog item:', hasImageUrl);
    } else {
      console.log('❌ Image URL not found in catalog item');
      console.log('Item data:', JSON.stringify(verifyResult.item, null, 2));
    }

    // Step 5: Test image accessibility
    console.log('5. Testing image accessibility...');
    if (hasImageUrl) {
      const imageResponse = await fetch(hasImageUrl);
      if (imageResponse.ok) {
        console.log('✅ Image is accessible via URL');
      } else {
        console.log('❌ Image URL is not accessible:', imageResponse.status);
      }
    }

    console.log('\n🎉 Image upload test completed successfully!');

  } catch (error) {
    console.error('❌ Image upload test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testImageUpload();

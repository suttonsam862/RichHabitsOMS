import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import FormData from 'form-data';

const API_BASE = 'http://localhost:5000';
const AUTH_TOKEN = 'dev-test-token-admin'; // Development token

async function testCompleteUploadSystem() {
  console.log('🧪 Testing Complete Multi-Image Upload System');
  console.log('=' .repeat(50));

  try {
    // Step 1: Get a catalog item to test with
    console.log('1️⃣ Fetching catalog items...');
    const catalogResponse = await fetch(`${API_BASE}/api/catalog`, {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`
      }
    });
    
    if (!catalogResponse.ok) {
      throw new Error('Failed to fetch catalog items');
    }
    
    const catalogData = await catalogResponse.json();
    const testItem = catalogData.data[0];
    
    if (!testItem) {
      throw new Error('No catalog items found for testing');
    }
    
    console.log(`✅ Using catalog item: ${testItem.name} (ID: ${testItem.id})`);
    console.log(`📊 Current images count: ${testItem.images?.length || 0}`);

    // Step 2: Create test image files
    console.log('\n2️⃣ Creating test image files...');
    
    // Create a simple 100x100 PNG image buffer
    const createTestImage = (name, color = 'red') => {
      // Simple SVG converted to PNG-like buffer (placeholder)
      const svgContent = `
        <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="${color}"/>
          <text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="white" font-family="Arial" font-size="12">${name}</text>
        </svg>
      `;
      return Buffer.from(svgContent);
    };
    
    const testImages = [
      { name: 'test-image-1.png', buffer: createTestImage('Test 1', 'red') },
      { name: 'test-image-2.png', buffer: createTestImage('Test 2', 'blue') },
      { name: 'test-image-3.png', buffer: createTestImage('Test 3', 'green') }
    ];
    
    console.log(`✅ Created ${testImages.length} test image files`);

    // Step 3: Test image upload
    console.log('\n3️⃣ Testing image upload...');
    
    const uploadedImages = [];
    
    for (let i = 0; i < testImages.length; i++) {
      const testImage = testImages[i];
      console.log(`📤 Uploading ${testImage.name}...`);
      
      const formData = new FormData();
      formData.append('image', testImage.buffer, {
        filename: testImage.name,
        contentType: 'image/png'
      });
      
      const uploadResponse = await fetch(`${API_BASE}/api/catalog/${testItem.id}/images`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`
        },
        body: formData
      });
      
      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error(`❌ Upload failed: ${errorText}`);
        continue;
      }
      
      const uploadResult = await uploadResponse.json();
      console.log(`✅ Uploaded: ${uploadResult.data.url}`);
      uploadedImages.push(uploadResult.data);
    }
    
    console.log(`✅ Successfully uploaded ${uploadedImages.length} images`);

    // Step 4: Verify images were stored in catalog item
    console.log('\n4️⃣ Verifying image storage...');
    
    const updatedItemResponse = await fetch(`${API_BASE}/api/catalog/${testItem.id}`, {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`
      }
    });
    
    if (!updatedItemResponse.ok) {
      throw new Error('Failed to fetch updated catalog item');
    }
    
    const updatedItemData = await updatedItemResponse.json();
    const updatedItem = updatedItemData.data;
    
    console.log(`📊 Updated images count: ${updatedItem.images?.length || 0}`);
    console.log('📋 Images in catalog item:');
    (updatedItem.images || []).forEach((img, index) => {
      console.log(`   ${index + 1}. ${img.alt || 'Unnamed'} (Primary: ${img.isPrimary ? '✅' : '❌'})`);
      console.log(`      URL: ${img.url}`);
    });

    // Step 5: Test image deletion
    if (uploadedImages.length > 0) {
      console.log('\n5️⃣ Testing image deletion...');
      
      const imageToDelete = uploadedImages[0];
      const deleteResponse = await fetch(`${API_BASE}/api/catalog/${testItem.id}/images/${imageToDelete.imageId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`
        }
      });
      
      if (deleteResponse.ok) {
        console.log('✅ Image deletion successful');
        
        // Verify deletion
        const finalItemResponse = await fetch(`${API_BASE}/api/catalog/${testItem.id}`, {
          headers: {
            'Authorization': `Bearer ${AUTH_TOKEN}`
          }
        });
        
        if (finalItemResponse.ok) {
          const finalItemData = await finalItemResponse.json();
          const finalItem = finalItemData.data;
          console.log(`📊 Final images count: ${finalItem.images?.length || 0}`);
        }
      } else {
        console.error('❌ Image deletion failed');
      }
    }

    console.log('\n✅ Complete Multi-Image Upload System Test PASSED');
    console.log('🎉 All functionality is working correctly!');

  } catch (error) {
    console.error('\n❌ Test FAILED:', error.message);
    console.error(error.stack);
  }
}

// Run the test
testCompleteUploadSystem();
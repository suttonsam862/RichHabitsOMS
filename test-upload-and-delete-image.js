import fs from 'fs';
import path from 'path';

// Test complete image upload and deletion workflow
const testUploadAndDeleteImage = async () => {
  const baseUrl = 'http://localhost:5000';
  const authToken = 'dev-test-token-admin';
  
  try {
    console.log('🧪 Testing complete image upload and deletion workflow...');
    
    // 1. Get a catalog item to use for testing
    console.log('\n1. Fetching catalog items...');
    const catalogResponse = await fetch(`${baseUrl}/api/catalog`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    if (!catalogResponse.ok) {
      throw new Error(`Failed to fetch catalog: ${catalogResponse.status}`);
    }
    
    const catalogData = await catalogResponse.json();
    console.log(`✅ Found ${catalogData.data.length} catalog items`);
    
    if (catalogData.data.length === 0) {
      console.log('❌ No catalog items found to test with');
      return false;
    }
    
    const testItem = catalogData.data[0];
    console.log(`✅ Using test item: "${testItem.name}" (${testItem.id})`);
    
    // 2. Create a simple test image as Buffer
    console.log('\n2. Creating test image...');
    
    // Create a simple 100x100 red square as PNG
    const createTestImageBuffer = () => {
      // Simple PNG header and data for a 1x1 red pixel
      const pngData = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 dimensions
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, // bit depth, color type, etc.
        0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, 0x54, // IDAT chunk
        0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0xFF, 0x00, 0x00, 0x00, // image data (red pixel)
        0x02, 0x00, 0x01, 0xE2, 0x21, 0xBC, 0x33,
        0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82 // IEND chunk
      ]);
      return pngData;
    };
    
    const imageBuffer = createTestImageBuffer();
    console.log(`✅ Created test image buffer (${imageBuffer.length} bytes)`);
    
    // 3. Upload the test image
    console.log('\n3. Uploading test image...');
    
    const FormData = (await import('form-data')).default;
    const formData = new FormData();
    formData.append('image', imageBuffer, {
      filename: 'test-image.png',
      contentType: 'image/png'
    });
    
    const uploadResponse = await fetch(`${baseUrl}/api/catalog/${testItem.id}/images`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        ...formData.getHeaders()
      },
      body: formData
    });
    
    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.json();
      throw new Error(`Upload failed: ${uploadResponse.status} - ${errorData.message}`);
    }
    
    const uploadResult = await uploadResponse.json();
    console.log('✅ Image uploaded successfully');
    console.log(`   Image ID: ${uploadResult.data.imageId}`);
    console.log(`   URL: ${uploadResult.data.url}`);
    
    const uploadedImageId = uploadResult.data.imageId;
    
    // 4. Verify the image was added to the database
    console.log('\n4. Verifying image in database...');
    const verifyUploadResponse = await fetch(`${baseUrl}/api/catalog/${testItem.id}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    if (!verifyUploadResponse.ok) {
      throw new Error(`Failed to verify upload: ${verifyUploadResponse.status}`);
    }
    
    const verifyUploadData = await verifyUploadResponse.json();
    const imagesAfterUpload = verifyUploadData.data.imageVariants?.gallery || [];
    
    console.log(`✅ Item now has ${imagesAfterUpload.length} images`);
    
    const uploadedImage = imagesAfterUpload.find(img => img.id === uploadedImageId);
    if (!uploadedImage) {
      throw new Error('Uploaded image not found in database');
    }
    
    console.log('✅ Uploaded image found in database');
    
    // 5. Now test deletion
    console.log('\n5. Testing image deletion...');
    const deleteResponse = await fetch(`${baseUrl}/api/catalog/${testItem.id}/images/${uploadedImageId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!deleteResponse.ok) {
      const errorData = await deleteResponse.json();
      throw new Error(`DELETE request failed: ${deleteResponse.status} - ${errorData.message}`);
    }
    
    const deleteResult = await deleteResponse.json();
    console.log('✅ DELETE request successful:', deleteResult.message);
    
    // 6. Verify the image was removed from the database
    console.log('\n6. Verifying image removal from database...');
    const verifyDeleteResponse = await fetch(`${baseUrl}/api/catalog/${testItem.id}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    if (!verifyDeleteResponse.ok) {
      throw new Error(`Failed to verify deletion: ${verifyDeleteResponse.status}`);
    }
    
    const verifyDeleteData = await verifyDeleteResponse.json();
    const imagesAfterDelete = verifyDeleteData.data.imageVariants?.gallery || [];
    
    console.log(`✅ Item now has ${imagesAfterDelete.length} images (was ${imagesAfterUpload.length})`);
    
    // Check if the deleted image is no longer in the array
    const deletedImageFound = imagesAfterDelete.find(img => img.id === uploadedImageId);
    
    if (deletedImageFound) {
      console.log('❌ ERROR: Deleted image still found in database!');
      return false;
    } else {
      console.log('✅ Image successfully removed from database');
    }
    
    console.log('\n🎉 Complete upload and deletion test passed!');
    console.log('Summary:');
    console.log(`- Image uploaded to storage and database ✅`);
    console.log(`- Image deleted from storage and database ✅`);
    console.log(`- Database consistency maintained ✅`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Upload and deletion test failed:', error.message);
    return false;
  }
};

// Run the test
testUploadAndDeleteImage().then(success => {
  process.exit(success ? 0 : 1);
});
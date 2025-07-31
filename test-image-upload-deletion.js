const fs = require('fs');
const FormData = require('form-data');
const fetch = require('node-fetch');

async function testImageUploadAndDeletion() {
  const baseUrl = 'http://localhost:5000';
  const authToken = 'dev-test-token-admin';
  
  try {
    console.log('🧪 Testing complete image upload and deletion workflow...');
    
    // 1. Get a catalog item for testing
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
    console.log(`   Current images: ${testItem.images?.length || 0}`);
    
    // 2. Create a simple test image buffer
    console.log('\n2. Creating test image...');
    
    // Create a minimal PNG file (1x1 red pixel)
    const pngData = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
      0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 dimensions
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, // bit depth, color type, etc.
      0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, // IDAT chunk
      0x54, 0x08, 0x99, 0x01, 0x01, 0x01, 0x00, 0x00, // image data (red pixel)
      0xFE, 0xFF, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01,
      0x73, 0x75, 0x01, 0x18, 0x00, 0x00, 0x00, 0x00, // IEND chunk
      0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
    ]);
    
    console.log(`✅ Created test PNG (${pngData.length} bytes)`);
    
    // 3. Upload the image
    console.log('\n3. Uploading image to Supabase Storage...');
    
    const formData = new FormData();
    formData.append('image', pngData, {
      filename: 'test-image.png',
      contentType: 'image/png'
    });
    
    const uploadResponse = await fetch(`${baseUrl}/api/catalog/${testItem.id}/upload-image`, {
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
    console.log('✅ Image uploaded successfully:');
    console.log(`   Image ID: ${uploadResult.data.imageId}`);
    console.log(`   Image URL: ${uploadResult.data.url}`);
    console.log(`   Is Primary: ${uploadResult.data.isPrimary}`);
    console.log(`   Message: ${uploadResult.data.message}`);
    
    const uploadedImageId = uploadResult.data.imageId;
    
    // 4. Verify image was added to database
    console.log('\n4. Verifying image in database...');
    const verifyResponse = await fetch(`${baseUrl}/api/catalog/${testItem.id}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    const verifyData = await verifyResponse.json();
    const updatedImages = verifyData.data.images || [];
    const uploadedImage = updatedImages.find(img => img.id === uploadedImageId);
    
    if (!uploadedImage) {
      throw new Error('Uploaded image not found in database!');
    }
    
    console.log('✅ Image found in database:');
    console.log(`   Total images: ${updatedImages.length}`);
    console.log(`   Uploaded image URL: ${uploadedImage.url}`);
    
    // 5. Delete the image
    console.log('\n5. Deleting image from storage and database...');
    
    const deleteResponse = await fetch(`${baseUrl}/api/catalog/${testItem.id}/images/${uploadedImageId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!deleteResponse.ok) {
      const errorData = await deleteResponse.json();
      throw new Error(`Delete failed: ${deleteResponse.status} - ${errorData.message}`);
    }
    
    const deleteResult = await deleteResponse.json();
    console.log('✅ Image deleted successfully:');
    console.log(`   Message: ${deleteResult.data.message}`);
    console.log(`   Storage deleted: ${deleteResult.data.storageDeleted}`);
    console.log(`   Remaining images: ${deleteResult.data.remainingImages}`);
    
    // 6. Verify image was removed from database
    console.log('\n6. Verifying image removal...');
    const finalVerifyResponse = await fetch(`${baseUrl}/api/catalog/${testItem.id}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    const finalData = await finalVerifyResponse.json();
    const finalImages = finalData.data.images || [];
    const deletedImageStillExists = finalImages.find(img => img.id === uploadedImageId);
    
    if (deletedImageStillExists) {
      throw new Error('Deleted image still exists in database!');
    }
    
    console.log('✅ Image successfully removed from database');
    console.log(`   Final image count: ${finalImages.length}`);
    
    console.log('\n🎉 Test completed successfully!');
    console.log('✅ Image upload to Supabase Storage: Working');
    console.log('✅ Database images array update: Working');
    console.log('✅ Image deletion from storage: Working');
    console.log('✅ Database images array cleanup: Working');
    
    return true;
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Full error:', error);
    return false;
  }
}

// Run the test
testImageUploadAndDeletion().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
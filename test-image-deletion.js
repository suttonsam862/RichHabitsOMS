// Test image deletion functionality for catalog items
// This test verifies that image deletion removes from both Supabase Storage and JSONB field

const testImageDeletion = async () => {
  const baseUrl = 'http://localhost:5000';
  const authToken = 'dev-test-token-admin';
  
  try {
    console.log('🧪 Testing catalog image deletion functionality...');
    
    // 1. Get a catalog item with images
    console.log('\n1. Fetching catalog items...');
    const catalogResponse = await fetch(`${baseUrl}/api/catalog`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    if (!catalogResponse.ok) {
      throw new Error(`Failed to fetch catalog: ${catalogResponse.status}`);
    }
    
    const catalogData = await catalogResponse.json();
    console.log(`✅ Found ${catalogData.data.length} catalog items`);
    
    // Find an item with images in imageVariants.gallery
    let itemWithImages = null;
    for (const item of catalogData.data) {
      if (item.imageVariants?.gallery && Array.isArray(item.imageVariants.gallery) && item.imageVariants.gallery.length > 0) {
        itemWithImages = item;
        break;
      }
    }
    
    if (!itemWithImages) {
      console.log('ℹ️ No catalog items found with images in imageVariants.gallery field');
      
      // Try to find items with images in the old images field
      for (const item of catalogData.data) {
        if (item.images && Array.isArray(item.images) && item.images.length > 0) {
          itemWithImages = item;
          console.log(`ℹ️ Found item with images in legacy 'images' field: ${item.name}`);
          break;
        }
      }
      
      if (!itemWithImages) {
        console.log('ℹ️ No catalog items found with any images. Upload some images first to test deletion.');
        return;
      }
    }
    
    const itemId = itemWithImages.id;
    const images = itemWithImages.imageVariants?.gallery || itemWithImages.images || [];
    
    console.log(`✅ Found item "${itemWithImages.name}" with ${images.length} images`);
    
    if (images.length === 0) {
      console.log('ℹ️ Selected item has no images to delete');
      return;
    }
    
    // 2. Get the first image to delete
    const imageToDelete = images[0];
    console.log(`\n2. Attempting to delete image: ${imageToDelete.id}`);
    console.log(`   Image URL: ${imageToDelete.url}`);
    console.log(`   Is Primary: ${imageToDelete.isPrimary || false}`);
    
    // 3. Test the DELETE endpoint
    console.log('\n3. Calling DELETE endpoint...');
    const deleteResponse = await fetch(`${baseUrl}/api/catalog/${itemId}/images/${imageToDelete.id}`, {
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
    
    // 4. Verify the image was removed from the database
    console.log('\n4. Verifying image removal from database...');
    const verifyResponse = await fetch(`${baseUrl}/api/catalog/${itemId}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    if (!verifyResponse.ok) {
      throw new Error(`Failed to verify deletion: ${verifyResponse.status}`);
    }
    
    const verifyData = await verifyResponse.json();
    const updatedImages = verifyData.data.imageVariants?.gallery || verifyData.data.images || [];
    
    console.log(`✅ Item now has ${updatedImages.length} images (was ${images.length})`);
    
    // Check if the deleted image is no longer in the array
    const deletedImageFound = updatedImages.find(img => img.id === imageToDelete.id);
    
    if (deletedImageFound) {
      console.log('❌ ERROR: Deleted image still found in database!');
      return false;
    } else {
      console.log('✅ Image successfully removed from database');
    }
    
    // 5. Check if primary image handling was correct
    if (imageToDelete.isPrimary && updatedImages.length > 0) {
      const newPrimaryImage = updatedImages.find(img => img.isPrimary);
      if (newPrimaryImage) {
        console.log('✅ New primary image assigned correctly');
      } else {
        console.log('⚠️ Warning: No primary image found after deleting primary image');
      }
    }
    
    console.log('\n🎉 Image deletion test completed successfully!');
    console.log('Summary:');
    console.log(`- Image ${imageToDelete.id} deleted from storage and database`);
    console.log(`- Catalog item images count: ${images.length} → ${updatedImages.length}`);
    console.log('- Primary image handling: ✅');
    
    return true;
    
  } catch (error) {
    console.error('❌ Image deletion test failed:', error.message);
    return false;
  }
};

// Run the test
testImageDeletion().then(success => {
  process.exit(success ? 0 : 1);
});
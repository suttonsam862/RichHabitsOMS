import { Request, Response, Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import multer from 'multer';
import sharp from 'sharp';
import { requireAuth, requireRole } from '../auth/auth';
import crypto from 'crypto';

const router = Router();

// Create Supabase admin client
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Only allow image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed') as any, false);
    }
  }
});

/**
 * Upload image for catalog item and add to images array via PATCH
 * POST /api/catalog/:itemId/upload-image
 */
async function uploadCatalogImage(req: Request, res: Response) {
  try {
    const { itemId } = req.params;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    console.log(`Uploading image for catalog item ${itemId}`);
    console.log(`File info: ${req.file.originalname}, ${req.file.size} bytes, ${req.file.mimetype}`);

    // Verify catalog item exists
    const { data: catalogItem, error: fetchError } = await supabaseAdmin
      .from('catalog_items')
      .select('id, name, images')
      .eq('id', itemId)
      .single();

    if (fetchError || !catalogItem) {
      return res.status(404).json({
        success: false,
        message: 'Catalog item not found'
      });
    }

    // Process image with Sharp for optimization
    const optimizedBuffer = await sharp(req.file.buffer)
      .resize(1200, 1200, { 
        fit: 'inside', 
        withoutEnlargement: true 
      })
      .jpeg({ quality: 85 })
      .toBuffer();

    // Generate unique filename
    const fileExtension = 'jpg'; // Always convert to JPG
    const timestamp = new Date().toISOString().split('T')[0];
    const randomId = crypto.randomBytes(8).toString('hex');
    const fileName = `${timestamp}_${randomId}.${fileExtension}`;
    const storagePath = `catalog_items/${itemId}/${fileName}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('uploads')
      .upload(storagePath, optimizedBuffer, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Supabase storage upload error:', uploadError);
      return res.status(500).json({
        success: false,
        message: 'Failed to upload image to storage',
        error: uploadError.message
      });
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from('uploads')
      .getPublicUrl(storagePath);

    const imageUrl = urlData.publicUrl;

    // Create new image object
    const newImage = {
      id: crypto.randomUUID(),
      url: imageUrl,
      alt: req.file.originalname || 'Catalog item image',
      isPrimary: false, // Will be set to true if it's the first image
      order: 0, // Will be updated based on current array length
      metadata: {
        filename: fileName,
        size: optimizedBuffer.length,
        uploadedAt: new Date().toISOString(),
        originalName: req.file.originalname
      }
    };

    // Get current images array
    const currentImages = Array.isArray(catalogItem.images) ? catalogItem.images : [];
    
    // Set as primary if it's the first image
    if (currentImages.length === 0) {
      newImage.isPrimary = true;
    }
    
    // Set order based on current array length
    newImage.order = currentImages.length;

    // Add new image to array
    const updatedImages = [...currentImages, newImage];

    // PATCH the database to update images array
    const { data: updatedItem, error: updateError } = await supabaseAdmin
      .from('catalog_items')
      .update({
        images: updatedImages,
        updated_at: 'NOW()'
      })
      .eq('id', itemId)
      .select()
      .single();

    if (updateError) {
      console.error('Database update error:', updateError);
      
      // Try to cleanup uploaded file if database update fails
      try {
        await supabaseAdmin.storage
          .from('uploads')
          .remove([storagePath]);
      } catch (cleanupError) {
        console.error('Failed to cleanup uploaded file:', cleanupError);
      }

      return res.status(500).json({
        success: false,
        message: 'Failed to update catalog item with image URL',
        error: updateError.message
      });
    }

    console.log(`Image uploaded successfully: ${imageUrl}`);

    res.status(200).json({
      success: true,
      data: {
        imageId: newImage.id,
        url: imageUrl,
        isPrimary: newImage.isPrimary,
        message: 'Image uploaded and added to catalog item successfully',
        updatedItem: {
          id: updatedItem.id,
          name: updatedItem.name,
          images: updatedItem.images
        }
      }
    });

  } catch (error: any) {
    console.error('Unexpected error uploading catalog image:', error);
    return res.status(500).json({
      success: false,
      message: 'Unexpected error uploading image',
      error: error.message
    });
  }
}

/**
 * Delete image from catalog item images array
 * DELETE /api/catalog/:itemId/images/:imageId
 */
async function deleteCatalogImage(req: Request, res: Response) {
  try {
    const { itemId, imageId } = req.params;

    // Get current catalog item
    const { data: catalogItem, error: fetchError } = await supabaseAdmin
      .from('catalog_items')
      .select('id, name, images')
      .eq('id', itemId)
      .single();

    if (fetchError || !catalogItem) {
      return res.status(404).json({
        success: false,
        message: 'Catalog item not found'
      });
    }

    const currentImages = Array.isArray(catalogItem.images) ? catalogItem.images : [];
    const imageToDelete = currentImages.find((img: any) => img.id === imageId);

    if (!imageToDelete) {
      return res.status(404).json({
        success: false,
        message: 'Image not found in catalog item'
      });
    }

    console.log(`Deleting image: ${imageToDelete.id} from catalog item: ${itemId}`);
    console.log(`Image URL: ${imageToDelete.url}`);

    // Extract storage path from URL for deletion
    let storagePath = '';
    try {
      if (imageToDelete.url) {
        // Parse URL to extract the storage path
        const urlParts = imageToDelete.url.split('/storage/v1/object/public/uploads/');
        if (urlParts.length > 1) {
          storagePath = urlParts[1];
        } else {
          // Fallback: try to extract from metadata if available
          if (imageToDelete.metadata?.filename) {
            storagePath = `catalog_items/${itemId}/images/${imageToDelete.metadata.filename}`;
          }
        }
      }
    } catch (urlParseError) {
      console.warn('Could not parse image URL for storage deletion:', urlParseError);
    }

    // Remove image from Supabase Storage
    let storageDeleteSuccess = false;
    if (storagePath) {
      console.log(`Attempting to delete from storage: ${storagePath}`);
      try {
        const { error: storageError } = await supabaseAdmin.storage
          .from('uploads')
          .remove([storagePath]);

        if (storageError) {
          console.warn('Storage deletion warning:', storageError.message);
          // Continue with database removal even if storage deletion fails
        } else {
          console.log('Successfully deleted from Supabase Storage');
          storageDeleteSuccess = true;
        }
      } catch (storageError: any) {
        console.warn('Storage deletion error:', storageError.message);
        // Continue with database removal even if storage deletion fails
      }
    } else {
      console.warn('Could not determine storage path for deletion');
    }

    // Remove image from database images array
    const updatedImages = currentImages.filter((img: any) => img.id !== imageId);
    
    // If deleted image was primary and there are remaining images, make the first one primary
    if (imageToDelete.isPrimary && updatedImages.length > 0) {
      updatedImages[0].isPrimary = true;
      console.log(`Setting new primary image: ${updatedImages[0].id}`);
    }

    // Update database with new images array
    const { data: updatedItem, error: updateError } = await supabaseAdmin
      .from('catalog_items')
      .update({
        images: updatedImages,
        updated_at: 'NOW()'
      })
      .eq('id', itemId)
      .select()
      .single();

    if (updateError) {
      console.error('Database update error:', updateError);
      return res.status(500).json({
        success: false,
        message: 'Failed to remove image from catalog item',
        error: updateError.message
      });
    }

    console.log(`Image deleted successfully. Remaining images: ${updatedImages.length}`);

    res.status(200).json({
      success: true,
      data: {
        message: `Image deleted successfully${storageDeleteSuccess ? ' from both storage and database' : ' from database (storage deletion may have failed)'}`,
        deletedImageId: imageId,
        storageDeleted: storageDeleteSuccess,
        remainingImages: updatedImages.length,
        newPrimaryImage: updatedImages.find((img: any) => img.isPrimary)?.id || null,
        updatedItem: {
          id: updatedItem.id,
          name: updatedItem.name,
          images: updatedItem.images
        }
      }
    });

  } catch (error: any) {
    console.error('Unexpected error deleting catalog image:', error);
    return res.status(500).json({
      success: false,
      message: 'Unexpected error deleting image',
      error: error.message
    });
  }
}

// Routes
router.post('/:itemId/upload-image', requireAuth, requireRole(['admin', 'salesperson']), upload.single('image'), uploadCatalogImage);
router.delete('/:itemId/images/:imageId', requireAuth, requireRole(['admin', 'salesperson']), deleteCatalogImage);

export default router;
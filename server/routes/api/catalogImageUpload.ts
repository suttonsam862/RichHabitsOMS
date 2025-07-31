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

    // Remove image from array
    const updatedImages = currentImages.filter((img: any) => img.id !== imageId);

    // If deleted image was primary and there are other images, make the first one primary
    if (imageToDelete.isPrimary && updatedImages.length > 0) {
      updatedImages[0].isPrimary = true;
    }

    // Update database
    const { error: updateError } = await supabaseAdmin
      .from('catalog_items')
      .update({
        images: updatedImages,
        updated_at: 'NOW()'
      })
      .eq('id', itemId);

    if (updateError) {
      console.error('Database update error:', updateError);
      return res.status(500).json({
        success: false,
        message: 'Failed to update catalog item',
        error: updateError.message
      });
    }

    // Extract storage path from URL and delete from Supabase Storage
    try {
      const url = new URL(imageToDelete.url);
      const pathParts = url.pathname.split('/');
      const storagePathIndex = pathParts.findIndex(part => part === 'uploads') + 1;
      if (storagePathIndex > 0) {
        const storagePath = pathParts.slice(storagePathIndex).join('/');
        await supabaseAdmin.storage
          .from('uploads')
          .remove([storagePath]);
        console.log(`Deleted image from storage: ${storagePath}`);
      }
    } catch (storageError) {
      console.error('Failed to delete from storage:', storageError);
      // Don't fail the request if storage cleanup fails
    }

    res.status(200).json({
      success: true,
      data: {
        message: 'Image deleted successfully',
        deletedImageId: imageId,
        remainingImages: updatedImages.length
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
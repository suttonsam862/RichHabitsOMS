import { Router, Request, Response } from 'express';
import multer from 'multer';
import { createClient } from '@supabase/supabase-js';
import { requireAuth, requireRole } from '../auth/auth';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';

const router = Router();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// Multer configuration for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Upload multiple images for a catalog item
router.post('/:itemId/images', requireAuth, requireRole(['admin', 'catalog_manager']), upload.single('image'), async (req: Request, res: Response) => {
  try {
    const { itemId } = req.params;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    console.log(`🖼️ Processing image for catalog item: ${itemId}`);
    console.log(`📁 Original file: ${req.file.originalname} (${req.file.size} bytes)`);

    // Generate unique filename
    const fileExtension = req.file.originalname.split('.').pop() || 'jpg';
    const filename = `${uuidv4()}.${fileExtension}`;
    const storagePath = `catalog_items/${itemId}/images/${filename}`;

    // Process image with Sharp for optimization
    const processedImage = await sharp(req.file.buffer)
      .resize(1200, 1200, { 
        fit: 'inside',
        withoutEnlargement: true 
      })
      .jpeg({ quality: 90 })
      .toBuffer();

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('catalog-images')
      .upload(storagePath, processedImage, {
        contentType: 'image/jpeg',
        upsert: false
      });

    if (uploadError) {
      console.error('❌ Supabase upload error:', uploadError);
      return res.status(500).json({
        success: false,
        message: 'Failed to upload image to storage',
        error: uploadError.message
      });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('catalog-images')
      .getPublicUrl(storagePath);

    if (!urlData.publicUrl) {
      return res.status(500).json({
        success: false,
        message: 'Failed to get public URL for uploaded image'
      });
    }

    console.log('✅ Image uploaded successfully:', urlData.publicUrl);

    // Update catalog item with new image (append to existing images)
    const { data: catalogItem, error: fetchError } = await supabase
      .from('catalog_items')
      .select('images')
      .eq('id', itemId)
      .single();

    if (fetchError) {
      console.error('❌ Failed to fetch catalog item:', fetchError);
      // Continue anyway, just return the URL
    }

    // Prepare updated images array
    const existingImages = Array.isArray(catalogItem?.images) ? catalogItem.images : [];
    const newImage = {
      id: uuidv4(),
      url: urlData.publicUrl,
      alt: req.file.originalname,
      isPrimary: existingImages.length === 0, // First image is primary
      uploadedAt: new Date().toISOString()
    };

    const updatedImages = [...existingImages, newImage];

    // Update catalog item
    const { error: updateError } = await supabase
      .from('catalog_items')
      .update({ 
        images: updatedImages,
        updated_at: new Date().toISOString()
      })
      .eq('id', itemId);

    if (updateError) {
      console.error('❌ Failed to update catalog item with image:', updateError);
      // Image is uploaded but not linked to catalog item
    }

    res.status(200).json({
      success: true,
      message: 'Image uploaded successfully',
      data: {
        url: urlData.publicUrl,
        storagePath,
        filename,
        originalName: req.file.originalname,
        size: processedImage.length,
        imageId: newImage.id
      }
    });

  } catch (error: any) {
    console.error('❌ Error uploading catalog image:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Delete an image from catalog item
router.delete('/:itemId/images/:imageId', requireAuth, requireRole(['admin', 'catalog_manager']), async (req: Request, res: Response) => {
  try {
    const { itemId, imageId } = req.params;

    console.log(`🗑️ Deleting image ${imageId} from catalog item ${itemId}`);

    // Get current catalog item
    const { data: catalogItem, error: fetchError } = await supabase
      .from('catalog_items')
      .select('images')
      .eq('id', itemId)
      .single();

    if (fetchError || !catalogItem) {
      return res.status(404).json({
        success: false,
        message: 'Catalog item not found'
      });
    }

    const existingImages = Array.isArray(catalogItem.images) ? catalogItem.images : [];
    const imageToDelete = existingImages.find(img => img.id === imageId);

    if (!imageToDelete) {
      return res.status(404).json({
        success: false,
        message: 'Image not found'
      });
    }

    // Extract storage path from URL
    const urlParts = imageToDelete.url.split('/');
    const storagePath = urlParts.slice(-4).join('/'); // catalog_items/{itemId}/images/{filename}

    // Delete from Supabase Storage
    const { error: deleteError } = await supabase.storage
      .from('catalog-images')
      .remove([storagePath]);

    if (deleteError) {
      console.error('❌ Failed to delete from storage:', deleteError);
      // Continue to remove from database anyway
    }

    // Remove from catalog item images array
    const updatedImages = existingImages.filter(img => img.id !== imageId);

    // If deleted image was primary, set first remaining as primary
    if (imageToDelete.isPrimary && updatedImages.length > 0) {
      updatedImages[0].isPrimary = true;
    }

    // Update catalog item
    const { error: updateError } = await supabase
      .from('catalog_items')
      .update({ 
        images: updatedImages,
        updated_at: new Date().toISOString()
      })
      .eq('id', itemId);

    if (updateError) {
      return res.status(500).json({
        success: false,
        message: 'Failed to update catalog item',
        error: updateError.message
      });
    }

    console.log('✅ Image deleted successfully');

    res.status(200).json({
      success: true,
      message: 'Image deleted successfully'
    });

  } catch (error: any) {
    console.error('❌ Error deleting catalog image:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get all images for a catalog item
router.get('/:itemId/images', requireAuth, async (req: Request, res: Response) => {
  try {
    const { itemId } = req.params;

    const { data: catalogItem, error } = await supabase
      .from('catalog_items')
      .select('images')
      .eq('id', itemId)
      .single();

    if (error || !catalogItem) {
      return res.status(404).json({
        success: false,
        message: 'Catalog item not found'
      });
    }

    const images = Array.isArray(catalogItem.images) ? catalogItem.images : [];

    res.status(200).json({
      success: true,
      data: {
        images,
        count: images.length
      }
    });

  } catch (error: any) {
    console.error('❌ Error fetching catalog images:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

export default router;
import { Request, Response, Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { requireAuth, requireRole } from '../auth/auth';
import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

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

// Configure multer for multiple file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit per file
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Image processing configurations
interface ImageVariantConfig {
  width?: number;
  height?: number;
  quality: number;
}

const IMAGE_VARIANTS: Record<string, ImageVariantConfig> = {
  thumbnail: { width: 150, height: 150, quality: 80 },
  medium: { width: 400, height: 400, quality: 85 },
  large: { width: 800, height: 800, quality: 90 },
  original: { quality: 95 } // Keep original size but optimize
};

/**
 * Process a single image into multiple variants
 */
async function processImageVariants(
  imageBuffer: Buffer, 
  originalName: string, 
  catalogItemId: string
): Promise<{ [key: string]: string }> {
  const variants: { [key: string]: string } = {};
  const timestamp = Date.now();
  const baseName = path.parse(originalName).name;

  try {
    // Process each variant
    for (const [variantName, config] of Object.entries(IMAGE_VARIANTS)) {
      let sharpImage = sharp(imageBuffer);
      
      // Resize if width/height specified
      if (config.width && config.height) {
        sharpImage = sharpImage.resize(config.width, config.height, {
          fit: 'cover',
          position: 'center'
        });
      }

      // Convert to WebP and optimize
      const processedBuffer = await sharpImage
        .webp({ quality: config.quality })
        .toBuffer();

      // Generate filename
      const fileName = `${catalogItemId}/${variantName}-${baseName}-${timestamp}.webp`;
      
      // Upload to Supabase Storage
      const { data, error } = await supabaseAdmin.storage
        .from('catalog-images')
        .upload(fileName, processedBuffer, {
          contentType: 'image/webp',
          upsert: true
        });

      if (error) {
        console.error(`Error uploading ${variantName} variant:`, error);
        continue;
      }

      // Get public URL
      const { data: publicData } = supabaseAdmin.storage
        .from('catalog-images')
        .getPublicUrl(fileName);

      variants[variantName] = publicData.publicUrl;
    }

    return variants;
  } catch (error) {
    console.error('Error processing image variants:', error);
    throw error;
  }
}

/**
 * Upload multiple image variants for a catalog item
 * POST /api/catalog/:catalogItemId/images
 */
async function uploadCatalogImages(req: Request, res: Response) {
  try {
    const { catalogItemId } = req.params;
    
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No image files provided'
      });
    }

    console.log(`Processing ${req.files.length} images for catalog item: ${catalogItemId}`);

    // Check if catalog item exists
    const { data: catalogItem, error: fetchError } = await supabaseAdmin
      .from('catalog_items')
      .select('id, name, image_variants')
      .eq('id', catalogItemId)
      .single();

    if (fetchError || !catalogItem) {
      return res.status(404).json({
        success: false,
        message: 'Catalog item not found'
      });
    }

    const processedResults = [];
    const galleryImages = [];
    let primaryVariants = {};

    // Process each uploaded file
    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i] as Express.Multer.File;
      
      try {
        console.log(`Processing image ${i + 1}/${req.files.length}: ${file.originalname}`);
        
        const variants = await processImageVariants(
          file.buffer,
          file.originalname,
          catalogItemId
        );

        if (i === 0) {
          // First image becomes the primary image with all variants
          primaryVariants = variants;
        } else {
          // Additional images go to gallery
          if (variants.medium) {
            galleryImages.push(variants.medium);
          }
        }

        processedResults.push({
          originalName: file.originalname,
          variants,
          isPrimary: i === 0
        });

      } catch (error) {
        console.error(`Error processing file ${file.originalname}:`, error);
        processedResults.push({
          originalName: file.originalname,
          error: error instanceof Error ? error.message : 'Processing failed'
        });
      }
    }

    // Merge with existing image variants
    const existingVariants = (catalogItem.image_variants as any) || {};
    const newImageVariants = {
      ...existingVariants,
      ...primaryVariants,
      gallery: [
        ...(existingVariants.gallery || []),
        ...galleryImages
      ]
    };

    // Update catalog item with new image variants
    const { data: updatedItem, error: updateError } = await supabaseAdmin
      .from('catalog_items')
      .update({
        image_variants: newImageVariants,
        image_url: primaryVariants.medium || (existingVariants as any).medium || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', catalogItemId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating catalog item:', updateError);
      return res.status(500).json({
        success: false,
        message: 'Failed to update catalog item with new images'
      });
    }

    // Calculate statistics
    const successCount = processedResults.filter(r => !r.error).length;
    const totalVariants = Object.keys(primaryVariants).length;
    const totalGalleryImages = galleryImages.length;

    console.log(`✅ Image processing completed:`);
    console.log(`   Files processed: ${successCount}/${req.files.length}`);
    console.log(`   Variants generated: ${totalVariants}`);
    console.log(`   Gallery images added: ${totalGalleryImages}`);

    return res.json({
      success: true,
      message: `Successfully processed ${successCount} of ${req.files.length} images`,
      data: {
        catalogItem: updatedItem,
        processedResults,
        imageVariants: newImageVariants,
        statistics: {
          filesProcessed: successCount,
          totalFiles: req.files.length,
          variantsGenerated: totalVariants,
          galleryImagesAdded: totalGalleryImages
        }
      }
    });

  } catch (error) {
    console.error('Error in uploadCatalogImages:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process images'
    });
  }
}

/**
 * Delete image variants for a catalog item
 * DELETE /api/catalog/:catalogItemId/images
 */
async function deleteCatalogImages(req: Request, res: Response) {
  try {
    const { catalogItemId } = req.params;
    const { variants } = req.body; // Array of variant names to delete, or empty for all

    // Get current image variants
    const { data: catalogItem, error: fetchError } = await supabaseAdmin
      .from('catalog_items')
      .select('image_variants')
      .eq('id', catalogItemId)
      .single();

    if (fetchError || !catalogItem) {
      return res.status(404).json({
        success: false,
        message: 'Catalog item not found'
      });
    }

    const currentVariants = catalogItem.image_variants || {};
    
    // Determine which files to delete
    const filesToDelete = [];
    
    if (!variants || variants.length === 0) {
      // Delete all images
      for (const [variantName, url] of Object.entries(currentVariants)) {
        if (typeof url === 'string' && url.includes('catalog-images/')) {
          const fileName = url.split('catalog-images/')[1];
          filesToDelete.push(fileName);
        } else if (variantName === 'gallery' && Array.isArray(url)) {
          for (const galleryUrl of url) {
            if (typeof galleryUrl === 'string' && galleryUrl.includes('catalog-images/')) {
              const fileName = galleryUrl.split('catalog-images/')[1];
              filesToDelete.push(fileName);
            }
          }
        }
      }
    } else {
      // Delete specific variants
      for (const variantName of variants) {
        const url = currentVariants[variantName];
        if (typeof url === 'string' && url.includes('catalog-images/')) {
          const fileName = url.split('catalog-images/')[1];
          filesToDelete.push(fileName);
        }
      }
    }

    // Delete files from storage
    if (filesToDelete.length > 0) {
      const { error: deleteError } = await supabaseAdmin.storage
        .from('catalog-images')
        .remove(filesToDelete);

      if (deleteError) {
        console.error('Error deleting files from storage:', deleteError);
      }
    }

    // Update catalog item
    const newVariants = variants && variants.length > 0 
      ? Object.fromEntries(
          Object.entries(currentVariants).filter(([key]) => !variants.includes(key))
        )
      : {};

    const { data: updatedItem, error: updateError } = await supabaseAdmin
      .from('catalog_items')
      .update({
        image_variants: newVariants,
        image_url: newVariants.medium || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', catalogItemId)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({
        success: false,
        message: 'Failed to update catalog item'
      });
    }

    return res.json({
      success: true,
      message: `Deleted ${filesToDelete.length} image files`,
      data: {
        catalogItem: updatedItem,
        deletedFiles: filesToDelete.length
      }
    });

  } catch (error) {
    console.error('Error in deleteCatalogImages:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete images'
    });
  }
}

// Route definitions
router.post('/catalog/:catalogItemId/images', 
  requireAuth, 
  requireRole(['admin', 'salesperson']), 
  upload.array('images', 10), // Allow up to 10 images
  uploadCatalogImages
);

router.delete('/catalog/:catalogItemId/images', 
  requireAuth, 
  requireRole(['admin', 'salesperson']), 
  deleteCatalogImages
);

export default router;
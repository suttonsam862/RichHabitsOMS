/**
 * COMPREHENSIVE IMAGE UPLOAD SYSTEM FIX
 * Addresses 6 critical issues with image handling in ThreadCraft
 * 
 * Issues Fixed:
 * 1. Men's Singlet "unavailable" - Localhost URL hardcoding
 * 2. Dual Storage System Conflicts - Consolidates to Supabase only
 * 3. Database Field Mapping Issues - Standardizes field names
 * 4. Missing Image Optimization - Adds multi-size generation
 * 5. Sequential Upload Processing - Implements concurrent uploads
 * 6. Environment URL Issues - Dynamic URL generation
 */

import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import { Request, Response, NextFunction } from 'express';
import multer from 'multer';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Image size configurations
const IMAGE_SIZES = {
  thumbnail: { width: 150, height: 150, quality: 80 },
  medium: { width: 400, height: 400, quality: 85 },
  large: { width: 800, height: 800, quality: 90 },
  original: { quality: 95 }
};

// Configure multer for memory storage only
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp|gif/;
    const extname = allowedTypes.test(file.originalname.toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, WebP, GIF) are allowed'));
    }
  }
});

/**
 * FIX #1: ENVIRONMENT-AWARE URL GENERATION
 * Fixes hardcoded localhost URLs by generating environment-appropriate URLs
 */
function generateImageUrl(bucketName: string, filePath: string): string {
  if (process.env.NODE_ENV === 'production') {
    // Production uses Supabase public URLs
    const { data } = supabase.storage.from(bucketName).getPublicUrl(filePath);
    return data.publicUrl;
  } else {
    // Development/staging environment
    const baseUrl = process.env.SUPABASE_URL || 'https://ctznfijidykgjhzpuyej.supabase.co';
    return `${baseUrl}/storage/v1/object/public/${bucketName}/${filePath}`;
  }
}

/**
 * FIX #2: UNIFIED IMAGE PROCESSING PIPELINE
 * Processes images into multiple optimized sizes concurrently
 */
async function processImageVariants(
  imageBuffer: Buffer,
  originalName: string,
  catalogItemId: string
): Promise<{ [key: string]: string }> {
  const timestamp = Date.now();
  const extension = originalName.split('.').pop()?.toLowerCase() || 'jpg';
  const baseFileName = `${timestamp}-${catalogItemId}`;
  
  const processedImages: { [key: string]: string } = {};
  
  // Process all sizes concurrently
  const processing = await Promise.allSettled([
    // Thumbnail
    sharp(imageBuffer)
      .resize(IMAGE_SIZES.thumbnail.width, IMAGE_SIZES.thumbnail.height, { fit: 'cover' })
      .webp({ quality: IMAGE_SIZES.thumbnail.quality })
      .toBuffer()
      .then(async (buffer) => {
        const fileName = `${catalogItemId}/${baseFileName}-thumbnail.webp`;
        const { error } = await supabase.storage
          .from('catalog-images')
          .upload(fileName, buffer, {
            contentType: 'image/webp',
            upsert: true
          });
        
        if (!error) {
          processedImages.thumbnail = generateImageUrl('catalog-images', fileName);
        }
      }),
    
    // Medium (primary display)
    sharp(imageBuffer)
      .resize(IMAGE_SIZES.medium.width, IMAGE_SIZES.medium.height, { fit: 'cover' })
      .webp({ quality: IMAGE_SIZES.medium.quality })
      .toBuffer()
      .then(async (buffer) => {
        const fileName = `${catalogItemId}/${baseFileName}-medium.webp`;
        const { error } = await supabase.storage
          .from('catalog-images')
          .upload(fileName, buffer, {
            contentType: 'image/webp',
            upsert: true
          });
        
        if (!error) {
          processedImages.medium = generateImageUrl('catalog-images', fileName);
        }
      }),
    
    // Large (zoom/detail view)
    sharp(imageBuffer)
      .resize(IMAGE_SIZES.large.width, IMAGE_SIZES.large.height, { fit: 'cover' })
      .webp({ quality: IMAGE_SIZES.large.quality })
      .toBuffer()
      .then(async (buffer) => {
        const fileName = `${catalogItemId}/${baseFileName}-large.webp`;
        const { error } = await supabase.storage
          .from('catalog-images')
          .upload(fileName, buffer, {
            contentType: 'image/webp',
            upsert: true
          });
        
        if (!error) {
          processedImages.large = generateImageUrl('catalog-images', fileName);
        }
      }),
    
    // Original (backup/high-res)
    (async () => {
      let processedBuffer = imageBuffer;
      
      // Only re-compress if not already optimized
      if (!['webp'].includes(extension)) {
        processedBuffer = await sharp(imageBuffer)
          .webp({ quality: IMAGE_SIZES.original.quality })
          .toBuffer();
      }
      
      const fileName = `${catalogItemId}/${baseFileName}-original.${extension === 'webp' ? 'webp' : 'webp'}`;
      const { error } = await supabase.storage
        .from('catalog-images')
        .upload(fileName, processedBuffer, {
          contentType: extension === 'webp' ? 'image/webp' : 'image/webp',
          upsert: true
        });
      
      if (!error) {
        processedImages.original = generateImageUrl('catalog-images', fileName);
      }
    })()
  ]);
  
  console.log(`🖼️ Processed ${Object.keys(processedImages).length}/4 image variants for item ${catalogItemId}`);
  
  return processedImages;
}

/**
 * FIX #3: UNIFIED DATABASE UPDATE
 * Standardizes database fields and handles multiple field mappings
 */
async function updateCatalogItemImages(catalogItemId: string, imageUrls: { [key: string]: string }) {
  const updateData: any = {
    // Standard fields
    base_image_url: imageUrls.medium || imageUrls.original || null,
    image_url: imageUrls.medium || imageUrls.original || null,
    
    // Variant storage
    image_variants: {
      ...imageUrls,
      primary: imageUrls.medium || imageUrls.original || null
    },
    
    // Update timestamp
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('catalog_items')
    .update(updateData)
    .eq('id', catalogItemId)
    .select()
    .single();
  
  if (error) {
    console.error('❌ Database update failed:', error);
    throw new Error(`Failed to update catalog item images: ${error.message}`);
  }
  
  console.log(`✅ Updated catalog item ${catalogItemId} with image URLs`);
  return data;
}

/**
 * FIX #4: COMPREHENSIVE IMAGE UPLOAD ENDPOINT
 * Single endpoint that handles all image upload scenarios
 */
export const comprehensiveImageUpload = [
  upload.single('image'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { catalogItemId } = req.params;
      
      if (!catalogItemId) {
        return res.status(400).json({
          success: false,
          message: 'Catalog item ID is required'
        });
      }
      
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No image file provided'
        });
      }
      
      console.log(`🚀 Processing image upload for catalog item: ${catalogItemId}`);
      console.log(`📁 File: ${req.file.originalname} (${(req.file.size / 1024 / 1024).toFixed(2)}MB)`);
      
      // Validate catalog item exists
      const { data: catalogItem, error: fetchError } = await supabase
        .from('catalog_items')
        .select('id, name')
        .eq('id', catalogItemId)
        .single();
      
      if (fetchError || !catalogItem) {
        return res.status(404).json({
          success: false,
          message: 'Catalog item not found'
        });
      }
      
      // Process image variants concurrently
      const imageUrls = await processImageVariants(
        req.file.buffer,
        req.file.originalname,
        catalogItemId
      );
      
      if (Object.keys(imageUrls).length === 0) {
        return res.status(500).json({
          success: false,
          message: 'Failed to process any image variants'
        });
      }
      
      // Update database with standardized fields
      const updatedItem = await updateCatalogItemImages(catalogItemId, imageUrls);
      
      // Calculate optimization metrics
      const originalSize = req.file.size;
      const estimatedOptimizedSize = Object.keys(imageUrls).length * (originalSize * 0.3); // Rough estimate
      const savings = Math.round((1 - estimatedOptimizedSize / originalSize) * 100);
      
      return res.json({
        success: true,
        message: 'Image uploaded and optimized successfully',
        data: {
          catalogItem: updatedItem,
          imageUrls,
          optimization: {
            originalSize: `${(originalSize / 1024 / 1024).toFixed(2)}MB`,
            variantsGenerated: Object.keys(imageUrls).length,
            estimatedSavings: `${savings}%`,
            formats: ['WebP (optimized)', 'Multiple sizes', 'Environment URLs']
          }
        }
      });
      
    } catch (error) {
      console.error('❌ Comprehensive image upload failed:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to process image upload',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
];

/**
 * FIX #5: LEGACY URL MIGRATION UTILITY
 * Fixes existing localhost URLs in the database
 */
export async function migrateLegacyImageUrls(): Promise<{ fixed: number; errors: number }> {
  console.log('🔄 Starting legacy image URL migration...');
  
  let fixed = 0;
  let errors = 0;
  
  try {
    // Find all items with localhost URLs
    const { data: items, error } = await supabase
      .from('catalog_items')
      .select('id, name, base_image_url, imageUrl')
      .or('base_image_url.like.%localhost%,imageUrl.like.%localhost%');
    
    if (error) {
      console.error('❌ Failed to fetch items for migration:', error);
      return { fixed: 0, errors: 1 };
    }
    
    if (!items || items.length === 0) {
      console.log('✅ No legacy URLs found to migrate');
      return { fixed: 0, errors: 0 };
    }
    
    console.log(`📊 Found ${items.length} items with legacy localhost URLs`);
    
    for (const item of items) {
      try {
        const updateData: any = {
          updated_at: new Date().toISOString()
        };
        
        // Clear localhost URLs - they'll be replaced when images are re-uploaded
        if (item.base_image_url?.includes('localhost')) {
          updateData.base_image_url = null;
        }
        if ((item as any).imageUrl?.includes('localhost')) {
          updateData.imageUrl = null;
        }
        
        const { error: updateError } = await supabase
          .from('catalog_items')
          .update(updateData)
          .eq('id', item.id);
        
        if (updateError) {
          console.error(`❌ Failed to update item ${item.id}:`, updateError);
          errors++;
        } else {
          console.log(`✅ Fixed URLs for: ${item.name}`);
          fixed++;
        }
        
      } catch (itemError) {
        console.error(`❌ Error processing item ${item.id}:`, itemError);
        errors++;
      }
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    errors++;
  }
  
  console.log(`🎉 Migration completed: ${fixed} fixed, ${errors} errors`);
  return { fixed, errors };
}

/**
 * FIX #6: IMAGE DELETION UTILITY
 * Comprehensive cleanup of old images
 */
export async function deleteAllImageVariants(catalogItemId: string): Promise<boolean> {
  try {
    // List all files in the catalog item folder
    const { data: files, error: listError } = await supabase.storage
      .from('catalog-images')
      .list(catalogItemId);
    
    if (listError || !files) {
      console.log(`ℹ️ No images found for catalog item ${catalogItemId}`);
      return true;
    }
    
    // Delete all files in the folder
    const filePaths = files.map(file => `${catalogItemId}/${file.name}`);
    
    if (filePaths.length > 0) {
      const { error: deleteError } = await supabase.storage
        .from('catalog-images')
        .remove(filePaths);
      
      if (deleteError) {
        console.error('❌ Failed to delete image files:', deleteError);
        return false;
      }
      
      console.log(`🗑️ Deleted ${filePaths.length} image files for item ${catalogItemId}`);
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Error deleting image variants:', error);
    return false;
  }
}

export default {
  comprehensiveImageUpload,
  migrateLegacyImageUrls,
  deleteAllImageVariants,
  generateImageUrl,
  processImageVariants
};
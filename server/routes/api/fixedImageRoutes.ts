/**
 * FIXED IMAGE UPLOAD ROUTES
 * Comprehensive solution for all Supabase Storage upload issues
 */

import { Request, Response, Router } from 'express';
import { requireAuth, requireRole } from '../auth/auth';
import { supabase } from '../../db';
import { createClient } from '@supabase/supabase-js';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';

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

const router = Router();

// Configure multer for memory storage (required for Supabase Storage)
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

// Storage bucket names
const BUCKETS = {
  catalog: 'catalog-images',
  designs: 'design-files',
  measurements: 'measurement-charts'
};

/**
 * Initialize Supabase Storage buckets with proper permissions
 */
async function initializeStorageBuckets() {
  try {
    console.log('🔧 Initializing Supabase Storage buckets...');
    
    for (const [key, bucketName] of Object.entries(BUCKETS)) {
      try {
        // Check if bucket exists
        const { data: bucket, error: getBucketError } = await supabaseAdmin.storage.getBucket(bucketName);
        
        if (getBucketError || !bucket) {
          console.log(`📦 Creating bucket: ${bucketName}`);
          
          // Create bucket
          const { data: createData, error: createError } = await supabaseAdmin.storage.createBucket(bucketName, {
            public: true,
            allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
            fileSizeLimit: 10485760 // 10MB
          });

          if (createError) {
            console.error(`❌ Failed to create bucket ${bucketName}:`, createError);
          } else {
            console.log(`✅ Created bucket: ${bucketName}`);
          }
        } else {
          console.log(`✅ Bucket exists: ${bucketName}`);
        }
      } catch (bucketError) {
        console.error(`❌ Error with bucket ${bucketName}:`, bucketError);
      }
    }
  } catch (error) {
    console.error('❌ Failed to initialize storage buckets:', error);
  }
}

/**
 * Process image into multiple optimized variants
 */
async function processImageVariants(buffer: Buffer, filename: string): Promise<{
  thumbnail: Buffer;
  medium: Buffer;
  large: Buffer;
  original: Buffer;
}> {
  try {
    console.log(`📊 Processing image buffer: ${buffer.length} bytes`);
    
    // Validate image buffer first
    const imageInfo = await sharp(buffer).metadata();
    console.log('📷 Image metadata:', {
      format: imageInfo.format,
      width: imageInfo.width,
      height: imageInfo.height,
      channels: imageInfo.channels
    });
    
    if (!imageInfo.format) {
      throw new Error('Invalid or corrupted image file - no format detected');
    }
    
    const [thumbnail, medium, large] = await Promise.all([
      // Thumbnail: 150x150 WebP
      sharp(buffer)
        .resize(150, 150, { fit: 'cover' })
        .webp({ quality: 80 })
        .toBuffer(),
      
      // Medium: 400x400 WebP
      sharp(buffer)
        .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer(),
      
      // Large: 800x800 WebP
      sharp(buffer)
        .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 90 })
        .toBuffer()
    ]);

    console.log('✅ Generated image variants successfully');
    return {
      thumbnail,
      medium,
      large,
      original: buffer
    };
  } catch (error) {
    console.error('❌ Image processing failed:', error);
    throw new Error(`Failed to process image variants: ${error.message}`);
  }
}

/**
 * Upload image variants to Supabase Storage with retry logic
 */
async function uploadImageVariants(
  variants: { thumbnail: Buffer; medium: Buffer; large: Buffer; original: Buffer },
  catalogItemId: string,
  originalFilename: string
): Promise<{ thumbnail: string; medium: string; large: string; original: string }> {
  const baseFilename = originalFilename.replace(/\.[^/.]+$/, '');
  const timestamp = Date.now();
  
  const uploadTasks = [
    {
      key: 'thumbnail',
      buffer: variants.thumbnail,
      path: `${catalogItemId}/thumbnail-${baseFilename}-${timestamp}.webp`,
      contentType: 'image/webp'
    },
    {
      key: 'medium',
      buffer: variants.medium,
      path: `${catalogItemId}/medium-${baseFilename}-${timestamp}.webp`,
      contentType: 'image/webp'
    },
    {
      key: 'large',
      buffer: variants.large,
      path: `${catalogItemId}/large-${baseFilename}-${timestamp}.webp`,
      contentType: 'image/webp'
    },
    {
      key: 'original',
      buffer: variants.original,
      path: `${catalogItemId}/original-${baseFilename}-${timestamp}.${originalFilename.split('.').pop()}`,
      contentType: 'image/' + (originalFilename.split('.').pop() || 'jpeg')
    }
  ];

  const results: Record<string, string> = {};
  const maxRetries = 3;

  for (const task of uploadTasks) {
    let retries = 0;
    let success = false;

    while (retries < maxRetries && !success) {
      try {
        console.log(`📤 Uploading ${task.key} variant (attempt ${retries + 1}/${maxRetries})`);
        
        const { data, error } = await supabaseAdmin.storage
          .from(BUCKETS.catalog)
          .upload(task.path, task.buffer, {
            contentType: task.contentType,
            cacheControl: '31536000', // 1 year cache
            upsert: true
          });

        if (error) {
          throw error;
        }

        // Get public URL
        const { data: urlData } = supabaseAdmin.storage
          .from(BUCKETS.catalog)
          .getPublicUrl(task.path);

        results[task.key] = urlData.publicUrl;
        success = true;
        console.log(`✅ Uploaded ${task.key}: ${urlData.publicUrl}`);
        
      } catch (error: any) {
        retries++;
        console.error(`❌ Upload attempt ${retries} failed for ${task.key}:`, error);
        
        if (retries < maxRetries) {
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, retries) * 1000));
        } else {
          throw new Error(`Failed to upload ${task.key} after ${maxRetries} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }
  }

  return results as { thumbnail: string; medium: string; large: string; original: string };
}

/**
 * MAIN UPLOAD ENDPOINT: Upload catalog item image with variants
 */
router.post('/catalog/:catalogItemId', requireAuth, upload.single('image'), async (req: Request, res: Response) => {
  try {
    const { catalogItemId } = req.params;
    
    console.log(`🚀 Processing image upload for catalog item: ${catalogItemId}`);
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    console.log(`📁 File: ${req.file.originalname} (${(req.file.size / 1024 / 1024).toFixed(2)}MB)`);

    // Verify catalog item exists
    const { data: catalogItem, error: fetchError } = await supabaseAdmin
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

    // Initialize storage buckets
    await initializeStorageBuckets();

    // Process image variants
    console.log('🔄 Processing image variants...');
    const imageVariants = await processImageVariants(req.file.buffer, req.file.originalname);

    // Upload variants to Supabase Storage
    console.log('📤 Uploading to Supabase Storage...');
    const uploadedUrls = await uploadImageVariants(imageVariants, catalogItemId, req.file.originalname);

    // Update catalog item with image URLs (using correct column names from schema)
    console.log('💾 Updating catalog item with image URLs...');
    const imageVariantsData = {
      thumbnail: uploadedUrls.thumbnail,
      medium: uploadedUrls.medium,
      large: uploadedUrls.large,
      original: uploadedUrls.original,
      uploadedAt: new Date().toISOString()
    };
    
    const { data: updatedItem, error: updateError } = await supabaseAdmin
      .from('catalog_items')
      .update({
        base_image_url: uploadedUrls.medium, // Column from schema: baseImageUrl -> base_image_url
        image_url: uploadedUrls.medium, // Column from schema: imageUrl -> image_url (for backward compatibility)
        image_variants: imageVariantsData, // Column from schema: imageVariants -> image_variants
        updated_at: new Date().toISOString()
      })
      .eq('id', catalogItemId)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Failed to update catalog item:', updateError);
      return res.status(500).json({
        success: false,
        message: 'Failed to update catalog item with image URLs'
      });
    }

    console.log('✅ Image upload completed successfully');

    return res.json({
      success: true,
      message: 'Image uploaded and processed successfully',
      data: {
        catalogItem: updatedItem,
        imageUrls: uploadedUrls,
        variants: Object.keys(uploadedUrls),
        filename: req.file.originalname
      }
    });

  } catch (error: any) {
    console.error('❌ Error in image upload:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during image upload',
      error: error?.message || 'Unknown error'
    });
  }
});

/**
 * TEST ENDPOINT: Test storage configuration
 */
router.post('/test-storage', requireAuth, async (req: Request, res: Response) => {
  try {
    console.log('🧪 Testing Supabase Storage configuration...');
    
    const results = {
      bucketsInitialized: false,
      bucketsList: [],
      authenticationWorking: false,
      uploadPermissions: false
    };

    // Test bucket initialization
    try {
      await initializeStorageBuckets();
      results.bucketsInitialized = true;
    } catch (error: any) {
      console.error('Bucket initialization failed:', error);
    }

    // List buckets
    try {
      const { data: buckets, error } = await supabaseAdmin.storage.listBuckets();
      if (!error && buckets) {
        results.bucketsList = buckets.map((b: any) => b.name);
      }
    } catch (error: any) {
      console.error('Failed to list buckets:', error);
    }

    // Test authentication
    try {
      const { data, error } = await supabaseAdmin.auth.getUser();
      results.authenticationWorking = !error;
    } catch (error: any) {
      console.error('Auth test failed:', error);
    }

    // Test upload permissions with a tiny test file
    try {
      const testBuffer = Buffer.from('test-image-data');
      const testPath = `test/test-${Date.now()}.txt`;
      
      const { data, error } = await supabaseAdmin.storage
        .from(BUCKETS.catalog)
        .upload(testPath, testBuffer, {
          contentType: 'text/plain'
        });

      if (!error) {
        results.uploadPermissions = true;
        // Clean up test file
        await supabaseAdmin.storage.from(BUCKETS.catalog).remove([testPath]);
      }
    } catch (error: any) {
      console.error('Upload permission test failed:', error);
    }

    return res.json({
      success: true,
      message: 'Storage configuration test completed',
      results
    });

  } catch (error: any) {
    console.error('❌ Storage test failed:', error);
    return res.status(500).json({
      success: false,
      message: 'Storage test failed',
      error: error?.message || 'Unknown error'
    });
  }
});

/**
 * DELETE ENDPOINT: Remove all image variants for a catalog item
 */
router.delete('/catalog/:catalogItemId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { catalogItemId } = req.params;
    
    console.log(`🗑️ Deleting images for catalog item: ${catalogItemId}`);

    // List all files for this catalog item
    const { data: files, error } = await supabaseAdmin.storage
      .from(BUCKETS.catalog)
      .list(catalogItemId);

    if (error) {
      throw error;
    }

    if (files && files.length > 0) {
      // Delete all files
      const filePaths = files.map((file: any) => `${catalogItemId}/${file.name}`);
      const { error: deleteError } = await supabaseAdmin.storage
        .from(BUCKETS.catalog)
        .remove(filePaths);

      if (deleteError) {
        throw deleteError;
      }

      console.log(`✅ Deleted ${files.length} files for catalog item ${catalogItemId}`);
    }

    // Clear image URLs from database
    const { error: updateError } = await supabaseAdmin
      .from('catalog_items')
      .update({
        base_image_url: null,
        image_thumbnail_url: null,
        image_large_url: null,
        image_original_url: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', catalogItemId);

    if (updateError) {
      throw updateError;
    }

    return res.json({
      success: true,
      message: 'All images deleted successfully',
      deletedFiles: files?.length || 0
    });

  } catch (error: any) {
    console.error('❌ Error deleting images:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete images',
      error: error?.message || 'Unknown error'
    });
  }
});

export default router;
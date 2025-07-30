/**
 * UNIFIED IMAGE UPLOAD SYSTEM
 * Single standardized pipeline for all image handling using Supabase Storage
 * Replaces the dual system conflict between local files and Supabase
 */

import { Request, Response, Router } from 'express';
import { requireAuth, requireRole } from '../auth/auth';
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
    files: 5 // Allow multiple files
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

// Storage bucket configuration
const STORAGE_BUCKETS = {
  catalog: 'catalog-images',
  designs: 'design-files', 
  orderItems: 'order-item-images',
  manufacturing: 'manufacturing-photos'
} as const;

type BucketType = keyof typeof STORAGE_BUCKETS;

/**
 * Generate unique filename with metadata
 */
function generateUniqueFilename(originalName: string, entityId: string, variant?: string): string {
  const timestamp = Date.now();
  const randomId = uuidv4().split('-')[0]; // Short UUID
  const extension = originalName.split('.').pop()?.toLowerCase() || 'jpg';
  const variantSuffix = variant ? `_${variant}` : '';
  
  return `${entityId}/${timestamp}_${randomId}${variantSuffix}.${extension}`;
}

/**
 * Process image into optimized variants for better performance
 */
async function processImageVariants(buffer: Buffer, filename: string): Promise<{
  thumbnail: { buffer: Buffer; filename: string };
  medium: { buffer: Buffer; filename: string };
  large: { buffer: Buffer; filename: string };
  original: { buffer: Buffer; filename: string };
}> {
  try {
    // Validate image
    const imageInfo = await sharp(buffer).metadata();
    if (!imageInfo.format) {
      throw new Error('Invalid image format');
    }

    const baseFilename = filename.replace(/\.[^/.]+$/, "");
    
    const [thumbnail, medium, large] = await Promise.all([
      // Thumbnail: 150x150 WebP for previews
      sharp(buffer)
        .resize(150, 150, { fit: 'cover' })
        .webp({ quality: 80 })
        .toBuffer(),
      
      // Medium: 500x500 WebP for cards
      sharp(buffer)
        .resize(500, 500, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer(),
      
      // Large: 1200x1200 WebP for detail views
      sharp(buffer)
        .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 90 })
        .toBuffer()
    ]);

    return {
      thumbnail: { buffer: thumbnail, filename: `${baseFilename}_thumb.webp` },
      medium: { buffer: medium, filename: `${baseFilename}_med.webp` },
      large: { buffer: large, filename: `${baseFilename}_lg.webp` },
      original: { buffer, filename }
    };
  } catch (error) {
    console.error('Error processing image variants:', error);
    throw error;
  }
}

/**
 * Upload image variants to Supabase Storage
 */
async function uploadImageVariants(
  bucket: string,
  variants: Awaited<ReturnType<typeof processImageVariants>>,
  entityId: string
): Promise<{
  thumbnailUrl: string;
  mediumUrl: string;
  largeUrl: string;
  originalUrl: string;
  metadata: any;
}> {
  try {
    console.log(`📤 Uploading image variants to bucket: ${bucket}`);
    
    const uploadPromises = Object.entries(variants).map(async ([variantType, { buffer, filename }]) => {
      const path = generateUniqueFilename(filename, entityId, variantType);
      
      const { data, error } = await supabaseAdmin.storage
        .from(bucket)
        .upload(path, buffer, {
          contentType: variantType === 'original' ? 'image/jpeg' : 'image/webp',
          upsert: true
        });

      if (error) {
        console.error(`❌ Failed to upload ${variantType}:`, error);
        throw error;
      }

      const { data: urlData } = supabaseAdmin.storage
        .from(bucket)
        .getPublicUrl(path);

      return {
        variant: variantType,
        url: urlData.publicUrl,
        path: data.path,
        size: buffer.length
      };
    });

    const uploadResults = await Promise.all(uploadPromises);
    
    const urls = uploadResults.reduce((acc, result) => {
      acc[`${result.variant}Url`] = result.url;
      return acc;
    }, {} as any);

    return {
      ...urls,
      metadata: {
        uploadResults,
        entityId,
        bucket,
        uploadedAt: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error('Error uploading image variants:', error);
    throw error;
  }
}

/**
 * CATALOG IMAGE UPLOAD - Primary endpoint for catalog items
 */
router.post('/catalog/:catalogItemId', 
  requireAuth, 
  requireRole(['admin', 'designer']), 
  upload.single('image'), 
  async (req: Request, res: Response) => {
    try {
      const { catalogItemId } = req.params;
      
      console.log(`🎯 Catalog image upload for item: ${catalogItemId}`);
      
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No image file provided'
        });
      }

      // Process image variants
      const variants = await processImageVariants(req.file.buffer, req.file.originalname);
      
      // Upload to Supabase Storage
      const uploadResult = await uploadImageVariants(
        STORAGE_BUCKETS.catalog,
        variants,
        catalogItemId
      );

      // Update catalog item with image URLs
      const { data: updatedItem, error: updateError } = await supabaseAdmin
        .from('catalog_items')
        .update({
          base_image_url: uploadResult.largeUrl,
          thumbnail_url: uploadResult.thumbnailUrl,
          medium_url: uploadResult.mediumUrl,
          original_image_url: uploadResult.originalUrl,
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

      console.log('✅ Catalog image upload completed successfully');
      
      return res.json({
        success: true,
        message: 'Image uploaded and processed successfully',
        data: {
          catalogItem: updatedItem,
          imageUrls: {
            thumbnail: uploadResult.thumbnailUrl,
            medium: uploadResult.mediumUrl,
            large: uploadResult.largeUrl,
            original: uploadResult.originalUrl
          },
          metadata: uploadResult.metadata
        }
      });

    } catch (error: any) {
      console.error('❌ Catalog image upload failed:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to upload catalog image',
        error: error.message
      });
    }
  }
);

/**
 * DESIGN FILE UPLOAD - For design tasks and workflow
 */
router.post('/design/:taskId',
  requireAuth,
  requireRole(['designer', 'admin']),
  upload.single('file'),
  async (req: Request, res: Response) => {
    try {
      const { taskId } = req.params;
      
      console.log(`🎨 Design file upload for task: ${taskId}`);
      
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No design file provided'
        });
      }

      // For design files, we may not need all variants, but keep original + medium
      const variants = await processImageVariants(req.file.buffer, req.file.originalname);
      
      const uploadResult = await uploadImageVariants(
        STORAGE_BUCKETS.designs,
        variants,
        taskId
      );

      // Update design task with file URL
      const { data: updatedTask, error: updateError } = await supabaseAdmin
        .from('design_tasks')
        .update({
          design_file_url: uploadResult.originalUrl,
          preview_url: uploadResult.mediumUrl,
          status: 'submitted',
          submitted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId)
        .select()
        .single();

      if (updateError) {
        console.error('❌ Failed to update design task:', updateError);
        return res.status(500).json({
          success: false,
          message: 'Failed to update design task with file URL'
        });
      }

      console.log('✅ Design file upload completed successfully');
      
      return res.json({
        success: true,
        message: 'Design file uploaded successfully',
        data: {
          designTask: updatedTask,
          fileUrls: {
            original: uploadResult.originalUrl,
            preview: uploadResult.mediumUrl
          },
          metadata: uploadResult.metadata
        }
      });

    } catch (error: any) {
      console.error('❌ Design file upload failed:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to upload design file',
        error: error.message
      });
    }
  }
);

/**
 * ORDER ITEM IMAGE UPLOAD - For custom order items
 */
router.post('/order-item/:orderItemId',
  requireAuth,
  requireRole(['admin', 'salesperson', 'customer']),
  upload.single('image'),
  async (req: Request, res: Response) => {
    try {
      const { orderItemId } = req.params;
      
      console.log(`📦 Order item image upload for: ${orderItemId}`);
      
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No image file provided'
        });
      }

      const variants = await processImageVariants(req.file.buffer, req.file.originalname);
      
      const uploadResult = await uploadImageVariants(
        STORAGE_BUCKETS.orderItems,
        variants,
        orderItemId
      );

      // Update order item with image URL
      const { data: updatedItem, error: updateError } = await supabaseAdmin
        .from('order_items')
        .update({
          image_url: uploadResult.mediumUrl,
          thumbnail_url: uploadResult.thumbnailUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderItemId)
        .select()
        .single();

      if (updateError) {
        console.error('❌ Failed to update order item:', updateError);
        return res.status(500).json({
          success: false,
          message: 'Failed to update order item with image URL'
        });
      }

      console.log('✅ Order item image upload completed successfully');
      
      return res.json({
        success: true,
        message: 'Order item image uploaded successfully',
        data: {
          orderItem: updatedItem,
          imageUrls: {
            main: uploadResult.mediumUrl,
            thumbnail: uploadResult.thumbnailUrl
          },
          metadata: uploadResult.metadata
        }
      });

    } catch (error: any) {
      console.error('❌ Order item image upload failed:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to upload order item image',
        error: error.message
      });
    }
  }
);

/**
 * STORAGE HEALTH CHECK - Test bucket availability and permissions
 */
router.get('/health', requireAuth, async (req: Request, res: Response) => {
  try {
    console.log('🔍 Checking unified image storage health...');
    
    const healthResults = await Promise.all(
      Object.entries(STORAGE_BUCKETS).map(async ([key, bucketName]) => {
        try {
          const { data: bucket, error } = await supabaseAdmin.storage.getBucket(bucketName);
          return {
            bucket: bucketName,
            key,
            status: error ? 'error' : 'healthy',
            error: error?.message
          };
        } catch (err: any) {
          return {
            bucket: bucketName,
            key,
            status: 'error',
            error: err.message
          };
        }
      })
    );

    const healthyBuckets = healthResults.filter(r => r.status === 'healthy').length;
    const totalBuckets = healthResults.length;

    return res.json({
      success: true,
      message: 'Storage health check completed',
      data: {
        overallHealth: healthyBuckets === totalBuckets ? 'healthy' : 'degraded',
        healthyBuckets,
        totalBuckets,
        buckets: healthResults,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('❌ Storage health check failed:', error);
    return res.status(500).json({
      success: false,
      message: 'Storage health check failed',
      error: error.message
    });
  }
});

/**
 * DELETE IMAGE - Remove image and all variants
 */
router.delete('/:bucket/:entityId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { bucket, entityId } = req.params;
    
    if (!Object.values(STORAGE_BUCKETS).includes(bucket as any)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid bucket name'
      });
    }

    console.log(`🗑️ Deleting images for entity ${entityId} from bucket ${bucket}`);

    // List all files for this entity
    const { data: files, error: listError } = await supabaseAdmin.storage
      .from(bucket)
      .list(entityId);

    if (listError) {
      console.error('❌ Failed to list files:', listError);
      return res.status(500).json({
        success: false,
        message: 'Failed to list files for deletion'
      });
    }

    if (files && files.length > 0) {
      const filePaths = files.map(file => `${entityId}/${file.name}`);
      
      const { error: deleteError } = await supabaseAdmin.storage
        .from(bucket)
        .remove(filePaths);

      if (deleteError) {
        console.error('❌ Failed to delete files:', deleteError);
        return res.status(500).json({
          success: false,
          message: 'Failed to delete files'
        });
      }

      console.log(`✅ Deleted ${files.length} files for entity ${entityId}`);
    }

    return res.json({
      success: true,
      message: `Successfully deleted images for ${entityId}`,
      data: {
        deletedFiles: files?.length || 0
      }
    });

  } catch (error: any) {
    console.error('❌ Image deletion failed:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete images',
      error: error.message
    });
  }
});

export default router;
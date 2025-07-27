import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { supabase } from './db';
import { v4 as uuidv4 } from 'uuid';

// Image size configurations for optimal performance
const IMAGE_SIZES = {
  thumbnail: { width: 150, height: 150, quality: 80 },
  medium: { width: 400, height: 400, quality: 85 },
  large: { width: 800, height: 800, quality: 90 },
  original: { quality: 95 }
};

// Memory storage for processing before cloud upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for raw uploads
    files: 1
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(file.originalname.toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, WebP) are allowed'));
    }
  }
});

interface ProcessedImage {
  buffer: Buffer;
  filename: string;
  size: string;
  width: number;
  height: number;
  format: string;
  fileSize: number;
}

/**
 * Process image into multiple optimized sizes
 */
async function processImage(
  buffer: Buffer, 
  originalName: string, 
  itemId: string
): Promise<ProcessedImage[]> {
  const baseFilename = `${itemId}-${Date.now()}`;
  const processedImages: ProcessedImage[] = [];

  for (const [sizeName, config] of Object.entries(IMAGE_SIZES)) {
    try {
      let sharpInstance = sharp(buffer);

      // Apply size-specific transformations
      if (sizeName !== 'original') {
        sharpInstance = sharpInstance
          .resize(config.width, config.height, {
            fit: 'cover',
            position: 'center'
          });
      }

      // Convert to WebP for optimal performance (except original)
      const outputBuffer = await sharpInstance
        .webp({ 
          quality: config.quality,
          effort: 6, // Higher compression effort
          progressive: true
        })
        .toBuffer();

      const metadata = await sharp(outputBuffer).metadata();

      processedImages.push({
        buffer: outputBuffer,
        filename: `${baseFilename}-${sizeName}.webp`,
        size: sizeName,
        width: metadata.width || 0,
        height: metadata.height || 0,
        format: 'webp',
        fileSize: outputBuffer.length
      });

    } catch (error) {
      console.error(`Error processing ${sizeName} image:`, error);
      // Continue with other sizes even if one fails
    }
  }

  return processedImages;
}

/**
 * Upload processed images to Supabase Storage
 */
async function uploadToSupabase(
  processedImages: ProcessedImage[],
  bucketName: string,
  folderPath: string
): Promise<{ [key: string]: string }> {
  const uploadResults: { [key: string]: string } = {};

  for (const image of processedImages) {
    try {
      const filePath = `${folderPath}/${image.filename}`;

      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(filePath, image.buffer, {
          contentType: 'image/webp',
          cacheControl: '31536000', // 1 year cache
          upsert: true
        });

      if (error) {
        console.error(`Upload error for ${image.size}:`, error);
        continue;
      }

      // Generate public URL
      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      uploadResults[image.size] = urlData.publicUrl;

      // Log successful upload
      console.log(`✅ Uploaded ${image.size}: ${image.fileSize} bytes`);

    } catch (error) {
      console.error(`Failed to upload ${image.size}:`, error);
    }
  }

  return uploadResults;
}

/**
 * Optimized catalog image upload middleware
 */
export const optimizedCatalogImageUpload = [
  upload.single('image'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { catalogItemId } = req.params;
      
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No image file provided'
        });
      }

      console.log(`🖼️ Processing image for catalog item: ${catalogItemId}`);
      console.log(`📁 Original file: ${req.file.originalname} (${req.file.size} bytes)`);

      // Process image into multiple sizes
      const processedImages = await processImage(
        req.file.buffer,
        req.file.originalname,
        catalogItemId
      );

      if (processedImages.length === 0) {
        return res.status(500).json({
          success: false,
          message: 'Failed to process image'
        });
      }

      // Upload to Supabase Storage
      const uploadResults = await uploadToSupabase(
        processedImages,
        'catalog-images',
        catalogItemId
      );

      // Update catalog item with image URLs
      const updateData: any = {};
      if (uploadResults.thumbnail) updateData.image_thumbnail_url = uploadResults.thumbnail;
      if (uploadResults.medium) updateData.base_image_url = uploadResults.medium; // Primary display
      if (uploadResults.large) updateData.image_large_url = uploadResults.large;
      if (uploadResults.original) updateData.image_original_url = uploadResults.original;

      // Add image metadata
      updateData.image_metadata = {
        originalSize: req.file.size,
        processedSizes: processedImages.map(img => ({
          size: img.size,
          width: img.width,
          height: img.height,
          fileSize: img.fileSize
        })),
        uploadedAt: new Date().toISOString()
      };

      const { data: updatedItem, error } = await supabase
        .from('catalog_items')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', catalogItemId)
        .select()
        .single();

      if (error) {
        console.error('Database update error:', error);
        return res.status(500).json({
          success: false,
          message: 'Failed to update catalog item with image URLs'
        });
      }

      // Calculate total bandwidth savings
      const originalSize = req.file.size;
      const optimizedSize = processedImages.find(img => img.size === 'medium')?.fileSize || 0;
      const savings = Math.round(((originalSize - optimizedSize) / originalSize) * 100);

      console.log(`📊 Optimization complete:`);
      console.log(`   Original: ${(originalSize / 1024).toFixed(1)}KB`);
      console.log(`   Optimized: ${(optimizedSize / 1024).toFixed(1)}KB`);
      console.log(`   Savings: ${savings}%`);

      return res.json({
        success: true,
        message: 'Image uploaded and optimized successfully',
        data: {
          catalogItem: updatedItem,
          imageUrls: uploadResults,
          optimization: {
            originalSize,
            optimizedSize,
            savings: `${savings}%`,
            sizesGenerated: processedImages.length
          }
        }
      });

    } catch (error) {
      console.error('Optimized image upload error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to process and upload image'
      });
    }
  }
];

/**
 * Delete all image sizes for a catalog item
 */
export async function deleteOptimizedImages(catalogItemId: string): Promise<boolean> {
  try {
    // List all files in the catalog item folder
    const { data: files, error: listError } = await supabase.storage
      .from('catalog-images')
      .list(catalogItemId);

    if (listError || !files) {
      console.error('Error listing files for deletion:', listError);
      return false;
    }

    // Delete all files
    const filePaths = files.map(file => `${catalogItemId}/${file.name}`);
    
    if (filePaths.length > 0) {
      const { error: deleteError } = await supabase.storage
        .from('catalog-images')
        .remove(filePaths);

      if (deleteError) {
        console.error('Error deleting image files:', deleteError);
        return false;
      }

      console.log(`🗑️ Deleted ${filePaths.length} image files for item ${catalogItemId}`);
    }

    // Clear image URLs from database
    const { error: updateError } = await supabase
      .from('catalog_items')
      .update({
        base_image_url: null,
        image_thumbnail_url: null,
        image_large_url: null,
        image_original_url: null,
        image_metadata: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', catalogItemId);

    if (updateError) {
      console.error('Error clearing image URLs from database:', updateError);
      return false;
    }

    return true;

  } catch (error) {
    console.error('Error in deleteOptimizedImages:', error);
    return false;
  }
}

/**
 * Generate responsive image srcset for frontend
 */
export function generateImageSrcSet(baseUrl: string, itemId: string): string {
  return [
    `${baseUrl.replace('-medium.webp', '-thumbnail.webp')} 150w`,
    `${baseUrl} 400w`,
    `${baseUrl.replace('-medium.webp', '-large.webp')} 800w`
  ].join(', ');
}

export default {
  optimizedCatalogImageUpload,
  deleteOptimizedImages,
  generateImageSrcSet
};
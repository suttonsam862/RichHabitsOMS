import { createClient } from '@supabase/supabase-js';
import ImageAssetService from '../server/services/imageAssetService.js';
import { ImageAssetUtils, ImageAssetType } from '../server/models/imageAsset.js';

// Initialize Supabase client for storage operations
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export interface UploadResult {
  success: boolean;
  url?: string;
  path?: string;
  error?: string;
  publicUrl?: string;
  visibility?: 'public' | 'private';
}

export interface FileMetadata {
  name: string;
  size: number;
  type: string;
  lastModified?: number;
  visibility?: 'public' | 'private';
}

export class StorageService {
  private static readonly BUCKETS = {
    UPLOADS: 'uploads',
    PRIVATE_FILES: 'private_files'
  } as const;

  // Standardized folder structure patterns
  // All files MUST be organized within entity-based folders for proper organization
  private static readonly FOLDER_PATTERNS = {
    CATALOG_ITEMS: (itemId: string) => `catalog_items/${itemId}/`,
    CUSTOMERS: (customerId: string) => `customers/${customerId}/`,
    ORDERS: (orderId: string) => `orders/${orderId}/`,
    ORDER_PRODUCTION: (orderId: string) => `orders/${orderId}/production/`,
    ORDER_DESIGNS: (orderId: string) => `orders/${orderId}/designs/`,
    DESIGN_TASKS: (taskId: string) => `design_tasks/${taskId}/`,
    MANUFACTURER_MEDIA: (manufacturerId: string) => `manufacturers/${manufacturerId}/`
  } as const;

  /**
   * Get standardized folder path for entity type
   * Ensures consistent folder structure across all uploads
   */
  static getFolderPath(entityType: 'catalog_items' | 'customers' | 'orders' | 'design_tasks' | 'manufacturers', entityId: string, subFolder?: string): string {
    let basePath: string;
    
    switch (entityType) {
      case 'catalog_items':
        basePath = this.FOLDER_PATTERNS.CATALOG_ITEMS(entityId);
        break;
      case 'customers':
        basePath = this.FOLDER_PATTERNS.CUSTOMERS(entityId);
        break;
      case 'orders':
        if (subFolder === 'production') {
          basePath = this.FOLDER_PATTERNS.ORDER_PRODUCTION(entityId);
        } else if (subFolder === 'designs') {
          basePath = this.FOLDER_PATTERNS.ORDER_DESIGNS(entityId);
        } else {
          basePath = this.FOLDER_PATTERNS.ORDERS(entityId);
        }
        break;
      case 'design_tasks':
        basePath = this.FOLDER_PATTERNS.DESIGN_TASKS(entityId);
        break;
      case 'manufacturers':
        basePath = this.FOLDER_PATTERNS.MANUFACTURER_MEDIA(entityId);
        break;
      default:
        throw new Error(`Unsupported entity type: ${entityType}`);
    }
    
    return basePath;
  }

  /**
   * Upload a file to Supabase Storage
   */
  static async uploadFile(
    bucket: string,
    path: string,
    file: Buffer | Uint8Array | File,
    options?: {
      cacheControl?: string;
      contentType?: string;
      upsert?: boolean;
      visibility?: 'public' | 'private';
    }
  ): Promise<UploadResult> {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, file, {
          cacheControl: options?.cacheControl || '3600',
          contentType: options?.contentType,
          upsert: options?.upsert || false
        });

      if (error) {
        console.error('Storage upload error:', error);
        return {
          success: false,
          error: error.message
        };
      }

      const visibility = options?.visibility || 'public';
      
      // Generate URL based on visibility
      let publicUrl: string | undefined;
      if (visibility === 'public') {
        publicUrl = this.getPublicUrl(bucket, data.path);
      }

      return {
        success: true,
        url: data.path,
        path: data.path,
        publicUrl,
        visibility
      };
    } catch (error) {
      console.error('Storage service error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown upload error'
      };
    }
  }

  /**
   * Delete a file from Supabase Storage
   */
  static async deleteFile(bucket: string, path: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([path]);

      if (error) {
        console.error('Storage delete error:', error);
        return {
          success: false,
          error: error.message
        };
      }

      return { success: true };
    } catch (error) {
      console.error('Storage service delete error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown delete error'
      };
    }
  }

  /**
   * Get public URL for a file
   */
  static getPublicUrl(bucket: string, path: string): string {
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);
    
    return data.publicUrl;
  }

  /**
   * Get signed URL for private files (expires in 1 hour by default)
   */
  static async getSignedUrl(
    bucket: string, 
    path: string, 
    expiresIn: number = 3600
  ): Promise<{ success: boolean; url?: string; error?: string; visibility?: 'private' }> {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, expiresIn);

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true,
        url: data.signedUrl,
        visibility: 'private'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * List files in a bucket path
   */
  static async listFiles(
    bucket: string, 
    path?: string,
    options?: {
      limit?: number;
      offset?: number;
      sortBy?: { column: string; order?: 'asc' | 'desc' };
    }
  ) {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .list(path, {
          limit: options?.limit,
          offset: options?.offset,
          sortBy: options?.sortBy
        });

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true,
        files: data
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Upload customer photo and create asset record
   */
  static async uploadCustomerPhoto(
    customerId: string,
    file: Buffer | Uint8Array,
    metadata: FileMetadata,
    ownerId?: string
  ): Promise<UploadResult & { assetId?: string }> {
    const uuid = require('crypto').randomUUID();
    const extension = metadata.name.split('.').pop()?.toLowerCase() || 'jpg';
    const originalNameClean = metadata.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${uuid}_${originalNameClean}`;
    const visibility = metadata.visibility || 'private'; // Customer photos are private by default
    const bucket = visibility === 'private' ? this.BUCKETS.PRIVATE_FILES : this.BUCKETS.UPLOADS;
    
    // Use standardized folder structure: customers/{id}/
    const folderPath = this.FOLDER_PATTERNS.CUSTOMERS(customerId);
    const path = `${folderPath}${fileName}`;

    const uploadResult = await this.uploadFile(bucket, path, file, {
      contentType: metadata.type,
      upsert: true,
      visibility
    });

    // Create image asset record if upload successful and ownerId provided
    if (uploadResult.success && ownerId && uploadResult.publicUrl) {
      const imageMetadata = ImageAssetUtils.createMetadataFromUpload(
        { originalname: metadata.name, size: metadata.size, mimetype: metadata.type },
        { path: uploadResult.path, publicUrl: uploadResult.publicUrl },
        { userId: ownerId }
      );

      const assetData = ImageAssetUtils.createInsertData(
        ownerId,
        'customer_photo',
        uploadResult.publicUrl,
        imageMetadata,
        { relatedId: customerId, visibility: visibility }
      );

      const assetResult = await ImageAssetService.create(assetData);
      if (assetResult.success && assetResult.data) {
        return { ...uploadResult, assetId: assetResult.data.id };
      }
    }

    return uploadResult;
  }

  /**
   * Upload catalog item image and create asset record
   */
  static async uploadCatalogImage(
    itemId: string,
    file: Buffer | Uint8Array,
    metadata: FileMetadata,
    variant?: string,
    ownerId?: string
  ): Promise<UploadResult & { assetId?: string }> {
    const uuid = require('crypto').randomUUID();
    const extension = metadata.name.split('.').pop()?.toLowerCase() || 'jpg';
    const originalNameClean = metadata.name.replace(/[^a-zA-Z0-9.-]/g, '_').replace(/\.[^/.]+$/, '');
    const variantSuffix = variant ? `_${variant}` : '';
    const fileName = `${uuid}_${originalNameClean}${variantSuffix}.${extension}`;
    const visibility = metadata.visibility || 'public'; // Catalog images are public by default
    const bucket = visibility === 'private' ? this.BUCKETS.PRIVATE_FILES : this.BUCKETS.UPLOADS;
    
    // Use standardized folder structure: catalog_items/{id}/
    const folderPath = this.FOLDER_PATTERNS.CATALOG_ITEMS(itemId);
    const path = `${folderPath}${fileName}`;

    const uploadResult = await this.uploadFile(bucket, path, file, {
      contentType: metadata.type,
      upsert: false,
      visibility
    });

    // Create image asset record if upload successful and ownerId provided
    if (uploadResult.success && ownerId && uploadResult.publicUrl) {
      const imageType: ImageAssetType = variant ? 'variant' : 'catalog_image';
      const imageMetadata = ImageAssetUtils.createMetadataFromUpload(
        { originalname: metadata.name, size: metadata.size, mimetype: metadata.type },
        { path: uploadResult.path, publicUrl: uploadResult.publicUrl },
        { userId: ownerId, variant }
      );

      const assetData = ImageAssetUtils.createInsertData(
        ownerId,
        imageType,
        uploadResult.publicUrl,
        imageMetadata,
        { relatedId: itemId, visibility: visibility }
      );

      const assetResult = await ImageAssetService.create(assetData);
      if (assetResult.success && assetResult.data) {
        return { ...uploadResult, assetId: assetResult.data.id };
      }
    }

    return uploadResult;
  }

  /**
   * Upload production image for order and create asset record
   */
  static async uploadProductionImage(
    orderId: string,
    file: Buffer | Uint8Array,
    metadata: FileMetadata,
    stage?: string,
    ownerId?: string
  ): Promise<UploadResult & { assetId?: string }> {
    const uuid = require('crypto').randomUUID();
    const extension = metadata.name.split('.').pop()?.toLowerCase() || 'jpg';
    const originalNameClean = metadata.name.replace(/[^a-zA-Z0-9.-]/g, '_').replace(/\.[^/.]+$/, '');
    const stagePrefix = stage ? `${stage}_` : '';
    const fileName = `${uuid}_${stagePrefix}${originalNameClean}.${extension}`;
    const visibility = metadata.visibility || 'private'; // Production images are private by default
    const bucket = visibility === 'private' ? this.BUCKETS.PRIVATE_FILES : this.BUCKETS.UPLOADS;
    
    // Use standardized folder structure: orders/{id}/production/
    const folderPath = this.FOLDER_PATTERNS.ORDER_PRODUCTION(orderId);
    const path = `${folderPath}${fileName}`;

    const uploadResult = await this.uploadFile(bucket, path, file, {
      contentType: metadata.type,
      upsert: false,
      visibility
    });

    // Create image asset record if upload successful and ownerId provided
    if (uploadResult.success && ownerId && (uploadResult.publicUrl || visibility === 'private')) {
      const imageMetadata = ImageAssetUtils.createMetadataFromUpload(
        { originalname: metadata.name, size: metadata.size, mimetype: metadata.type },
        { path: uploadResult.path, publicUrl: uploadResult.publicUrl },
        { userId: ownerId, stage }
      );

      const finalUrl = uploadResult.publicUrl || uploadResult.path || uploadResult.url || '';
      const assetData = ImageAssetUtils.createInsertData(
        ownerId,
        'production_image',
        finalUrl,
        imageMetadata,
        { relatedId: orderId, visibility: visibility }
      );

      const assetResult = await ImageAssetService.create(assetData);
      if (assetResult.success && assetResult.data) {
        return { ...uploadResult, assetId: assetResult.data.id };
      }
    }

    return uploadResult;
  }

  /**
   * Upload design file for order
   */
  static async uploadDesignFile(
    orderId: string,
    file: Buffer | Uint8Array,
    metadata: FileMetadata
  ): Promise<UploadResult> {
    const uuid = require('crypto').randomUUID();
    const extension = metadata.name.split('.').pop()?.toLowerCase() || 'pdf';
    const originalNameClean = metadata.name.replace(/[^a-zA-Z0-9.-]/g, '_').replace(/\.[^/.]+$/, '');
    const fileName = `${uuid}_design_${originalNameClean}.${extension}`;
    const visibility = metadata.visibility || 'private'; // Design files are private by default
    const bucket = visibility === 'private' ? this.BUCKETS.PRIVATE_FILES : this.BUCKETS.UPLOADS;
    
    // Use standardized folder structure: orders/{id}/designs/
    const folderPath = this.FOLDER_PATTERNS.ORDER_DESIGNS(orderId);
    const path = `${folderPath}${fileName}`;

    return this.uploadFile(bucket, path, file, {
      contentType: metadata.type,
      upsert: false,
      visibility
    });
  }

  /**
   * Delete customer photo
   */
  static async deleteCustomerPhoto(photoUrl: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Extract path from URL
      const url = new URL(photoUrl);
      const pathSegments = url.pathname.split('/');
      const bucketIndex = pathSegments.findIndex(segment => segment === 'storage');
      
      if (bucketIndex === -1 || bucketIndex + 3 >= pathSegments.length) {
        return {
          success: false,
          error: 'Invalid photo URL format'
        };
      }

      const bucket = pathSegments[bucketIndex + 2];
      const path = pathSegments.slice(bucketIndex + 3).join('/');

      return this.deleteFile(bucket, path);
    } catch (error) {
      return {
        success: false,
        error: 'Failed to parse photo URL'
      };
    }
  }

  /**
   * Delete catalog item image
   */
  static async deleteCatalogImage(imageUrl: string): Promise<{ success: boolean; error?: string }> {
    return this.deleteFileFromUrl(imageUrl);
  }

  /**
   * Delete production image
   */
  static async deleteProductionImage(imageUrl: string): Promise<{ success: boolean; error?: string }> {
    return this.deleteFileFromUrl(imageUrl);
  }

  /**
   * Helper method to delete file from full URL
   */
  private static async deleteFileFromUrl(fileUrl: string): Promise<{ success: boolean; error?: string }> {
    try {
      const url = new URL(fileUrl);
      const pathSegments = url.pathname.split('/');
      const storageIndex = pathSegments.findIndex(segment => segment === 'storage');
      
      if (storageIndex === -1 || storageIndex + 3 >= pathSegments.length) {
        return {
          success: false,
          error: 'Invalid file URL format'
        };
      }

      const bucket = pathSegments[storageIndex + 2];
      const path = pathSegments.slice(storageIndex + 3).join('/');

      return this.deleteFile(bucket, path);
    } catch (error) {
      return {
        success: false,
        error: 'Failed to parse file URL'
      };
    }
  }

  /**
   * Generate optimized image variants (thumbnail, medium, large)
   */
  static async generateImageVariants(
    originalFile: Buffer,
    metadata: FileMetadata
  ): Promise<{
    thumbnail?: Buffer;
    medium?: Buffer;
    large?: Buffer;
    error?: string;
  }> {
    try {
      // Check if Sharp is available for image processing
      let sharp;
      try {
        sharp = require('sharp');
      } catch (e) {
        return {
          error: 'Sharp image processing library not available'
        };
      }

      const variants: { [key: string]: Buffer } = {};

      // Generate thumbnail (150x150)
      variants.thumbnail = await sharp(originalFile)
        .resize(150, 150, { fit: 'cover', position: 'center' })
        .jpeg({ quality: 80 })
        .toBuffer();

      // Generate medium (800x800)
      variants.medium = await sharp(originalFile)
        .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer();

      // Generate large (1200x1200)
      variants.large = await sharp(originalFile)
        .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 90 })
        .toBuffer();

      return variants;
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Failed to generate image variants'
      };
    }
  }

  /**
   * Get file info from storage
   */
  static async getFileInfo(bucket: string, path: string) {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .list(path.split('/').slice(0, -1).join('/'), {
          search: path.split('/').pop()
        });

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      const file = data?.find(f => f.name === path.split('/').pop());
      if (!file) {
        return {
          success: false,
          error: 'File not found'
        };
      }

      return {
        success: true,
        file: {
          name: file.name,
          size: file.metadata?.size,
          lastModified: file.updated_at,
          contentType: file.metadata?.mimetype
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Check if file exists in storage
   */
  static async fileExists(bucket: string, path: string): Promise<boolean> {
    const info = await this.getFileInfo(bucket, path);
    return info.success;
  }

  /**
   * Move/rename file in storage
   */
  static async moveFile(
    bucket: string,
    fromPath: string,
    toPath: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: moveData, error: moveError } = await supabase.storage
        .from(bucket)
        .move(fromPath, toPath);

      if (moveError) {
        return {
          success: false,
          error: moveError.message
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Copy file in storage
   */
  static async copyFile(
    bucket: string,
    fromPath: string,
    toPath: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: copyData, error: copyError } = await supabase.storage
        .from(bucket)
        .copy(fromPath, toPath);

      if (copyError) {
        return {
          success: false,
          error: copyError.message
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Batch delete multiple files
   */
  static async deleteMultipleFiles(
    bucket: string,
    paths: string[]
  ): Promise<{ success: boolean; errors?: string[] }> {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .remove(paths);

      if (error) {
        return {
          success: false,
          errors: [error.message]
        };
      }

      return {
        success: true
      };
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Get storage usage statistics
   */
  static async getStorageStats(bucket?: string): Promise<any> {
    try {
      if (bucket) {
        const files = await this.listFiles(bucket);
        if (!files.success || !files.files) {
          return {
            success: false,
            error: files.error || 'Failed to get file list'
          };
        }

        const totalSize = files.files.reduce((sum, file) => {
          return sum + (file.metadata?.size || 0);
        }, 0);

        return {
          success: true,
          stats: {
            bucket,
            fileCount: files.files.length,
            totalSize,
            totalSizeMB: Math.round(totalSize / (1024 * 1024) * 100) / 100
          }
        };
      }

      // Get stats for all buckets
      const buckets = Object.values(this.BUCKETS);
      const allStats: any[] = await Promise.all(
        buckets.map(async (bucketName: string) => {
          const bucketStats: any = await this.getStorageStats(bucketName);
          return {
            bucket: bucketName,
            ...bucketStats
          };
        })
      );

      return {
        success: true,
        stats: allStats
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

export default StorageService;
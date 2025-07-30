/**
 * Image Asset Model - Centralized image metadata management
 */
import { z } from 'zod';

// Image asset type enum
export const ImageAssetTypeEnum = z.enum([
  'customer_photo',
  'catalog_image', 
  'production_image',
  'design_file',
  'order_attachment',
  'profile_image',
  'logo',
  'thumbnail',
  'variant'
]);

export type ImageAssetType = z.infer<typeof ImageAssetTypeEnum>;

// Visibility enum
export const VisibilityEnum = z.enum(['public', 'private']);
export type Visibility = z.infer<typeof VisibilityEnum>;

// Image metadata schema
export const ImageMetadataSchema = z.object({
  filename: z.string().optional(),
  size: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  format: z.string().optional(),
  alt_text: z.string().optional(),
  caption: z.string().optional(),
  stage: z.string().optional(), // for production images
  variant: z.string().optional(), // for image variants
  processing_status: z.string().optional(),
  storage_path: z.string().optional(),
  bucket: z.string().optional(),
  compression_applied: z.boolean().optional(),
  quality: z.number().min(1).max(100).optional(),
  uploaded_by_user_id: z.string().uuid().optional(),
  upload_session_id: z.string().uuid().optional()
}).catchall(z.any()); // Allow additional fields

export type ImageMetadata = z.infer<typeof ImageMetadataSchema>;

// Base image asset schema
export const ImageAssetSchema = z.object({
  id: z.string().uuid(),
  owner_id: z.string().uuid(),
  type: ImageAssetTypeEnum,
  related_id: z.string().uuid().nullable(),
  url: z.string().url(),
  metadata: ImageMetadataSchema.default({}),
  visibility: VisibilityEnum.default('public'),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  deleted_at: z.string().datetime().nullable()
});

export type ImageAsset = z.infer<typeof ImageAssetSchema>;

// Insert schema (excluding auto-generated fields)
export const InsertImageAssetSchema = z.object({
  owner_id: z.string().uuid(),
  type: ImageAssetTypeEnum,
  related_id: z.string().uuid().nullable().optional(),
  url: z.string().url(),
  metadata: ImageMetadataSchema.default({}),
  visibility: VisibilityEnum.default('public')
});

export type InsertImageAsset = z.infer<typeof InsertImageAssetSchema>;

// Update schema (all fields optional except id)
export const UpdateImageAssetSchema = z.object({
  id: z.string().uuid(),
  type: ImageAssetTypeEnum.optional(),
  related_id: z.string().uuid().nullable().optional(),
  url: z.string().url().optional(),
  metadata: ImageMetadataSchema.optional(),
  visibility: VisibilityEnum.optional(),
  deleted_at: z.string().datetime().nullable().optional()
});

export type UpdateImageAsset = z.infer<typeof UpdateImageAssetSchema>;

// Query filters schema
export const ImageAssetFiltersSchema = z.object({
  owner_id: z.string().uuid().optional(),
  type: ImageAssetTypeEnum.optional(),
  related_id: z.string().uuid().optional(),
  visibility: VisibilityEnum.optional(),
  deleted: z.boolean().optional(), // false = active only, true = deleted only, undefined = all
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
  sort_by: z.enum(['created_at', 'updated_at', 'type']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc')
});

export type ImageAssetFilters = z.infer<typeof ImageAssetFiltersSchema>;

// Response schemas
export const ImageAssetListResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(ImageAssetSchema).optional(),
  total: z.number().optional(),
  limit: z.number().optional(),
  offset: z.number().optional(),
  error: z.string().optional()
});

export type ImageAssetListResponse = z.infer<typeof ImageAssetListResponseSchema>;

export const ImageAssetResponseSchema = z.object({
  success: z.boolean(),
  data: ImageAssetSchema.optional(),
  error: z.string().optional()
});

export type ImageAssetResponse = z.infer<typeof ImageAssetResponseSchema>;

// Utility functions
export class ImageAssetUtils {
  /**
   * Create image metadata from file upload
   */
  static createMetadataFromUpload(
    file: { originalname: string; size: number; mimetype: string },
    uploadResult: { path?: string; publicUrl?: string },
    options: {
      userId?: string;
      sessionId?: string;
      stage?: string;
      variant?: string;
      processingStatus?: string;
    } = {}
  ): ImageMetadata {
    return {
      filename: file.originalname,
      size: file.size,
      format: file.mimetype.split('/')[1],
      storage_path: uploadResult.path,
      uploaded_by_user_id: options.userId,
      upload_session_id: options.sessionId,
      stage: options.stage,
      variant: options.variant,
      processing_status: options.processingStatus || 'completed'
    };
  }

  /**
   * Determine image type from context
   */
  static determineImageType(context: {
    isCustomerPhoto?: boolean;
    isCatalogImage?: boolean;
    isProductionImage?: boolean;
    isDesignFile?: boolean;
    isThumbnail?: boolean;
    isVariant?: boolean;
  }): ImageAssetType {
    if (context.isCustomerPhoto) return 'customer_photo';
    if (context.isCatalogImage) return 'catalog_image';
    if (context.isProductionImage) return 'production_image';
    if (context.isDesignFile) return 'design_file';
    if (context.isThumbnail) return 'thumbnail';
    if (context.isVariant) return 'variant';
    return 'order_attachment'; // default
  }

  /**
   * Create insert data from upload result
   */
  static createInsertData(
    ownerId: string,
    type: ImageAssetType,
    url: string,
    metadata: ImageMetadata,
    options: {
      relatedId?: string;
      visibility?: Visibility;
    } = {}
  ): InsertImageAsset {
    return {
      owner_id: ownerId,
      type,
      url,
      metadata,
      related_id: options.relatedId || null,
      visibility: options.visibility || 'public'
    };
  }

  /**
   * Check if user can access image based on role and ownership
   */
  static canUserAccess(
    image: ImageAsset,
    userId: string,
    userRole: string
  ): boolean {
    // Admin can access everything
    if (userRole === 'admin') return true;

    // Owner can access their own images
    if (image.owner_id === userId) return true;

    // Public images are accessible to authenticated users
    if (image.visibility === 'public') return true;

    // Role-based access for private images
    if (image.visibility === 'private') {
      switch (userRole) {
        case 'salesperson':
          return ['customer_photo', 'order_attachment'].includes(image.type);
        case 'designer':
          return ['design_file', 'production_image', 'catalog_image'].includes(image.type);
        case 'manufacturer':
          return ['production_image', 'design_file'].includes(image.type);
        default:
          return false;
      }
    }

    return false;
  }

  /**
   * Soft delete by setting deleted_at timestamp
   */
  static createSoftDeleteUpdate(imageId: string): UpdateImageAsset {
    return {
      id: imageId,
      deleted_at: new Date().toISOString()
    };
  }

  /**
   * Restore soft deleted image
   */
  static createRestoreUpdate(imageId: string): UpdateImageAsset {
    return {
      id: imageId,
      deleted_at: null
    };
  }
}

export default {
  ImageAssetSchema,
  InsertImageAssetSchema,
  UpdateImageAssetSchema,
  ImageAssetFiltersSchema,
  ImageAssetListResponseSchema,
  ImageAssetResponseSchema,
  ImageAssetTypeEnum,
  VisibilityEnum,
  ImageMetadataSchema,
  ImageAssetUtils
};
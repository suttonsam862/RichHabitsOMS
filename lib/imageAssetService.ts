/**
 * IMAGE ASSET SERVICE
 * Comprehensive image metadata management with traceability
 */

import { supabase } from '../server/db';

export interface ImageAssetRecord {
  id?: string;
  filename: string;
  original_filename: string;
  file_size: number;
  mime_type: string;
  storage_path: string;
  public_url?: string;
  storage_bucket?: string;
  uploaded_by?: string;
  entity_type: 'catalog_item' | 'order' | 'design_task' | 'customer' | 'manufacturer' | 'user_profile' | 'organization';
  entity_id: string;
  image_purpose?: 'gallery' | 'profile' | 'production' | 'design' | 'logo' | 'thumbnail' | 'hero' | 'attachment';
  alt_text?: string;
  caption?: string;
  is_primary?: boolean;
  display_order?: number;
  image_width?: number;
  image_height?: number;
  is_processed?: boolean;
  processing_status?: 'pending' | 'processing' | 'completed' | 'failed';
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
  metadata?: Record<string, any>;
}

export interface CreateImageAssetParams {
  filename: string;
  original_filename: string;
  file_size: number;
  mime_type: string;
  storage_path: string;
  public_url?: string;
  uploaded_by: string;
  entity_type: ImageAssetRecord['entity_type'];
  entity_id: string;
  image_purpose?: ImageAssetRecord['image_purpose'];
  alt_text?: string;
  caption?: string;
  is_primary?: boolean;
  display_order?: number;
  image_width?: number;
  image_height?: number;
  metadata?: Record<string, any>;
}

export class ImageAssetService {
  /**
   * Create a new image asset record with full traceability
   */
  static async createImageAsset(params: CreateImageAssetParams): Promise<ImageAssetRecord> {
    try {
      console.log(`📷 Creating image asset record for ${params.entity_type}:${params.entity_id}`);
      
      const { data, error } = await supabase
        .from('image_assets')
        .insert({
          filename: params.filename,
          original_filename: params.original_filename,
          file_size: params.file_size,
          mime_type: params.mime_type,
          storage_path: params.storage_path,
          public_url: params.public_url,
          storage_bucket: 'uploads',
          uploaded_by: params.uploaded_by,
          entity_type: params.entity_type,
          entity_id: params.entity_id,
          image_purpose: params.image_purpose || 'gallery',
          alt_text: params.alt_text,
          caption: params.caption,
          is_primary: params.is_primary || false,
          display_order: params.display_order || 0,
          image_width: params.image_width,
          image_height: params.image_height,
          is_processed: true,
          processing_status: 'completed',
          metadata: params.metadata || {},
          created_at: 'NOW()',
          updated_at: 'NOW()'
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Failed to create image asset record:', error);
        throw new Error(`Failed to create image asset: ${error.message}`);
      }

      console.log(`✅ Created image asset record: ${data.id}`);
      return data as ImageAssetRecord;
    } catch (error: any) {
      console.error('❌ Image asset creation error:', error);
      throw error;
    }
  }

  /**
   * Get image assets for a specific entity
   */
  static async getImageAssetsByEntity(
    entityType: ImageAssetRecord['entity_type'], 
    entityId: string,
    imagePurpose?: ImageAssetRecord['image_purpose']
  ): Promise<ImageAssetRecord[]> {
    try {
      let query = supabase
        .from('image_assets')
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .is('deleted_at', null)
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: true });

      if (imagePurpose) {
        query = query.eq('image_purpose', imagePurpose);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Failed to fetch image assets:', error);
        throw new Error(`Failed to fetch image assets: ${error.message}`);
      }

      return (data || []) as ImageAssetRecord[];
    } catch (error: any) {
      console.error('❌ Image assets fetch error:', error);
      throw error;
    }
  }

  /**
   * Get a single image asset by ID
   */
  static async getImageAssetById(id: string): Promise<ImageAssetRecord | null> {
    try {
      const { data, error } = await supabase
        .from('image_assets')
        .select('*')
        .eq('id', id)
        .is('deleted_at', null)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Not found
        }
        console.error('❌ Failed to fetch image asset:', error);
        throw new Error(`Failed to fetch image asset: ${error.message}`);
      }

      return data as ImageAssetRecord;
    } catch (error: any) {
      console.error('❌ Image asset fetch error:', error);
      throw error;
    }
  }

  /**
   * Update image asset metadata
   */
  static async updateImageAsset(id: string, updates: Partial<ImageAssetRecord>): Promise<ImageAssetRecord> {
    try {
      console.log(`📝 Updating image asset: ${id}`);
      
      const { data, error } = await supabase
        .from('image_assets')
        .update({
          ...updates,
          updated_at: 'NOW()'
        })
        .eq('id', id)
        .is('deleted_at', null)
        .select()
        .single();

      if (error) {
        console.error('❌ Failed to update image asset:', error);
        throw new Error(`Failed to update image asset: ${error.message}`);
      }

      console.log(`✅ Updated image asset: ${id}`);
      return data as ImageAssetRecord;
    } catch (error: any) {
      console.error('❌ Image asset update error:', error);
      throw error;
    }
  }

  /**
   * Soft delete an image asset (mark as deleted without removing from storage)
   */
  static async softDeleteImageAsset(id: string): Promise<ImageAssetRecord> {
    try {
      console.log(`🗑️ Soft deleting image asset: ${id}`);
      
      const { data, error } = await supabase
        .from('image_assets')
        .update({
          deleted_at: 'NOW()',
          updated_at: 'NOW()'
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('❌ Failed to soft delete image asset:', error);
        throw new Error(`Failed to soft delete image asset: ${error.message}`);
      }

      console.log(`✅ Soft deleted image asset: ${id}`);
      return data as ImageAssetRecord;
    } catch (error: any) {
      console.error('❌ Image asset soft delete error:', error);
      throw error;
    }
  }

  /**
   * Hard delete an image asset (remove from database completely)
   */
  static async hardDeleteImageAsset(id: string): Promise<void> {
    try {
      console.log(`💥 Hard deleting image asset: ${id}`);
      
      const { error } = await supabase
        .from('image_assets')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('❌ Failed to hard delete image asset:', error);
        throw new Error(`Failed to hard delete image asset: ${error.message}`);
      }

      console.log(`✅ Hard deleted image asset: ${id}`);
    } catch (error: any) {
      console.error('❌ Image asset hard delete error:', error);
      throw error;
    }
  }

  /**
   * Update display order for multiple images
   */
  static async updateDisplayOrder(updates: { id: string; display_order: number }[]): Promise<void> {
    try {
      console.log(`🔄 Updating display order for ${updates.length} images`);
      
      const promises = updates.map(update => 
        supabase
          .from('image_assets')
          .update({ 
            display_order: update.display_order,
            updated_at: 'NOW()'
          })
          .eq('id', update.id)
      );

      const results = await Promise.all(promises);
      
      for (const result of results) {
        if (result.error) {
          console.error('❌ Failed to update display order:', result.error);
          throw new Error(`Failed to update display order: ${result.error.message}`);
        }
      }

      console.log(`✅ Updated display order for ${updates.length} images`);
    } catch (error: any) {
      console.error('❌ Display order update error:', error);
      throw error;
    }
  }

  /**
   * Set primary image for an entity (unset others)
   */
  static async setPrimaryImage(entityType: ImageAssetRecord['entity_type'], entityId: string, imageId: string): Promise<void> {
    try {
      console.log(`⭐ Setting primary image for ${entityType}:${entityId} -> ${imageId}`);
      
      // First, unset all primary flags for this entity
      await supabase
        .from('image_assets')
        .update({ 
          is_primary: false,
          updated_at: 'NOW()'
        })
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .is('deleted_at', null);

      // Then set the new primary image
      const { error } = await supabase
        .from('image_assets')
        .update({ 
          is_primary: true,
          updated_at: 'NOW()'
        })
        .eq('id', imageId);

      if (error) {
        console.error('❌ Failed to set primary image:', error);
        throw new Error(`Failed to set primary image: ${error.message}`);
      }

      console.log(`✅ Set primary image: ${imageId}`);
    } catch (error: any) {
      console.error('❌ Primary image update error:', error);
      throw error;
    }
  }

  /**
   * Get images uploaded by a specific user
   */
  static async getImagesByUser(userId: string, limit: number = 50): Promise<ImageAssetRecord[]> {
    try {
      const { data, error } = await supabase
        .from('image_assets')
        .select('*')
        .eq('uploaded_by', userId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('❌ Failed to fetch user images:', error);
        throw new Error(`Failed to fetch user images: ${error.message}`);
      }

      return (data || []) as ImageAssetRecord[];
    } catch (error: any) {
      console.error('❌ User images fetch error:', error);
      throw error;
    }
  }

  /**
   * Generate temporary access link for private images
   */
  static async generateTemporaryAccessLink(
    imageId: string, 
    expiresInSeconds: number = 3600 // Default 1 hour
  ): Promise<{ signedUrl: string; expiresAt: string }> {
    try {
      console.log(`🔗 Generating temporary access link for image: ${imageId} (expires in ${expiresInSeconds}s)`);
      
      // Get image record to verify access and get storage path
      const imageRecord = await this.getImageAssetById(imageId);
      if (!imageRecord) {
        throw new Error(`Image asset not found: ${imageId}`);
      }

      // Generate signed URL for temporary access
      const { data, error } = await supabase.storage
        .from(imageRecord.storage_bucket || 'uploads')
        .createSignedUrl(imageRecord.storage_path, expiresInSeconds);

      if (error) {
        console.error('❌ Failed to generate signed URL:', error);
        throw new Error(`Failed to generate signed URL: ${error.message}`);
      }

      const expiresAt = new Date(Date.now() + (expiresInSeconds * 1000)).toISOString();
      
      // Log access for audit trail
      await this.updateImageAsset(imageId, {
        metadata: {
          ...imageRecord.metadata,
          last_access_generated: new Date().toISOString(),
          access_count: (imageRecord.metadata?.access_count || 0) + 1
        }
      });

      console.log(`✅ Generated temporary access link expires at: ${expiresAt}`);
      return {
        signedUrl: data.signedUrl,
        expiresAt
      };
    } catch (error: any) {
      console.error('❌ Temporary access link generation error:', error);
      throw error;
    }
  }

  /**
   * Generate bulk temporary access links for multiple images
   */
  static async generateBulkTemporaryAccessLinks(
    imageIds: string[],
    expiresInSeconds: number = 3600
  ): Promise<Array<{ imageId: string; signedUrl: string; expiresAt: string; error?: string }>> {
    try {
      console.log(`🔗 Generating ${imageIds.length} temporary access links`);
      
      const results = await Promise.allSettled(
        imageIds.map(async (imageId) => {
          const result = await this.generateTemporaryAccessLink(imageId, expiresInSeconds);
          return { imageId, ...result };
        })
      );

      return results.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          return {
            imageId: imageIds[index],
            signedUrl: '',
            expiresAt: '',
            error: result.reason.message || 'Unknown error'
          };
        }
      });
    } catch (error: any) {
      console.error('❌ Bulk temporary access link generation error:', error);
      throw error;
    }
  }

  /**
   * Generate temporary access links for entity images (by entity type and ID)
   */
  static async generateEntityTemporaryAccessLinks(
    entityType: ImageAssetRecord['entity_type'],
    entityId: string,
    imagePurpose?: ImageAssetRecord['image_purpose'],
    expiresInSeconds: number = 3600
  ): Promise<Array<{ 
    imageId: string; 
    filename: string;
    signedUrl: string; 
    expiresAt: string; 
    image_purpose?: string;
    error?: string 
  }>> {
    try {
      console.log(`🔗 Generating entity access links: ${entityType}:${entityId}`);
      
      // Get all images for this entity
      const images = await this.getImageAssetsByEntity(entityType, entityId, imagePurpose);
      
      if (images.length === 0) {
        console.log(`ℹ️ No images found for ${entityType}:${entityId}`);
        return [];
      }

      // Generate access links for all images
      const imageIds = images.map(img => img.id!);
      const accessLinks = await this.generateBulkTemporaryAccessLinks(imageIds, expiresInSeconds);
      
      // Merge with image metadata
      return accessLinks.map(link => {
        const imageRecord = images.find(img => img.id === link.imageId);
        return {
          ...link,
          filename: imageRecord?.filename || 'unknown',
          image_purpose: imageRecord?.image_purpose
        };
      });
    } catch (error: any) {
      console.error('❌ Entity temporary access links generation error:', error);
      throw error;
    }
  }

  /**
   * Generate temporary download link with custom filename
   */
  static async generateDownloadLink(
    imageId: string,
    downloadFilename?: string,
    expiresInSeconds: number = 3600
  ): Promise<{ downloadUrl: string; expiresAt: string; filename: string }> {
    try {
      console.log(`📥 Generating download link for image: ${imageId}`);
      
      // Get image record
      const imageRecord = await this.getImageAssetById(imageId);
      if (!imageRecord) {
        throw new Error(`Image asset not found: ${imageId}`);
      }

      // Use original filename or provided filename
      const filename = downloadFilename || imageRecord.original_filename;
      
      // Generate signed URL with download transform
      const { data, error } = await supabase.storage
        .from(imageRecord.storage_bucket || 'uploads')
        .createSignedUrl(
          imageRecord.storage_path, 
          expiresInSeconds,
          {
            download: filename // This forces download with specified filename
          }
        );

      if (error) {
        console.error('❌ Failed to generate download URL:', error);
        throw new Error(`Failed to generate download URL: ${error.message}`);
      }

      const expiresAt = new Date(Date.now() + (expiresInSeconds * 1000)).toISOString();
      
      // Log download access
      await this.updateImageAsset(imageId, {
        metadata: {
          ...imageRecord.metadata,
          last_download_generated: new Date().toISOString(),
          download_count: (imageRecord.metadata?.download_count || 0) + 1
        }
      });

      console.log(`✅ Generated download link for: ${filename}`);
      return {
        downloadUrl: data.signedUrl,
        expiresAt,
        filename
      };
    } catch (error: any) {
      console.error('❌ Download link generation error:', error);
      throw error;
    }
  }

  /**
   * Get storage usage statistics
   */
  static async getStorageStats(entityType?: ImageAssetRecord['entity_type']): Promise<{
    total_images: number;
    total_size_bytes: number;
    total_size_mb: number;
    by_purpose: Record<string, number>;
    by_entity_type: Record<string, number>;
  }> {
    try {
      let query = supabase
        .from('image_assets')
        .select('file_size, image_purpose, entity_type')
        .is('deleted_at', null);

      if (entityType) {
        query = query.eq('entity_type', entityType);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Failed to fetch storage stats:', error);
        throw new Error(`Failed to fetch storage stats: ${error.message}`);
      }

      const totalSize = data?.reduce((sum: number, img: any) => sum + (img.file_size || 0), 0) || 0;
      const byPurpose: Record<string, number> = {};
      const byEntityType: Record<string, number> = {};

      data?.forEach((img: any) => {
        const purpose = img.image_purpose || 'unknown';
        const entityType = img.entity_type || 'unknown';
        byPurpose[purpose] = (byPurpose[purpose] || 0) + 1;
        byEntityType[entityType] = (byEntityType[entityType] || 0) + 1;
      });

      return {
        total_images: data?.length || 0,
        total_size_bytes: totalSize,
        total_size_mb: Math.round(totalSize / (1024 * 1024) * 100) / 100,
        by_purpose: byPurpose,
        by_entity_type: byEntityType
      };
    } catch (error: any) {
      console.error('❌ Storage stats error:', error);
      throw error;
    }
  }
}

export default ImageAssetService;
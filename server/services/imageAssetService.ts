/**
 * Image Asset Service - Database operations for image_assets table
 */
import { createClient } from '@supabase/supabase-js';
import { 
  ImageAsset, 
  InsertImageAsset, 
  UpdateImageAsset, 
  ImageAssetFilters,
  ImageAssetUtils,
  ImageAssetType,
  Visibility
} from '../models/imageAsset.js';

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

export class ImageAssetService {
  /**
   * Create a new image asset
   */
  static async create(imageAsset: InsertImageAsset): Promise<{ success: boolean; data?: ImageAsset; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('image_assets')
        .insert(imageAsset)
        .select()
        .single();

      if (error) {
        console.error('Error creating image asset:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Image asset service error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get image asset by ID
   */
  static async getById(id: string): Promise<{ success: boolean; data?: ImageAsset; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('image_assets')
        .select('*')
        .eq('id', id)
        .is('deleted_at', null)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return { success: false, error: 'Image not found' };
        }
        console.error('Error fetching image asset:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Image asset service error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * List image assets with filters
   */
  static async list(filters: ImageAssetFilters): Promise<{ 
    success: boolean; 
    data?: ImageAsset[]; 
    total?: number; 
    error?: string 
  }> {
    try {
      let query = supabase
        .from('image_assets')
        .select('*', { count: 'exact' });

      // Apply filters
      if (filters.owner_id) {
        query = query.eq('owner_id', filters.owner_id);
      }

      if (filters.type) {
        query = query.eq('type', filters.type);
      }

      if (filters.related_id) {
        query = query.eq('related_id', filters.related_id);
      }

      if (filters.visibility) {
        query = query.eq('visibility', filters.visibility);
      }

      // Handle deleted filter
      if (filters.deleted === false) {
        query = query.is('deleted_at', null);
      } else if (filters.deleted === true) {
        query = query.not('deleted_at', 'is', null);
      }
      // If undefined, include both deleted and active

      // Apply sorting
      const sortColumn = filters.sort_by || 'created_at';
      const sortOrder = filters.sort_order || 'desc';
      query = query.order(sortColumn, { ascending: sortOrder === 'asc' });

      // Apply pagination
      const limit = filters.limit || 50;
      const offset = filters.offset || 0;
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        console.error('Error listing image assets:', error);
        return { success: false, error: error.message };
      }

      return { 
        success: true, 
        data: data || [], 
        total: count || 0 
      };
    } catch (error) {
      console.error('Image asset service error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Update image asset
   */
  static async update(imageAsset: UpdateImageAsset): Promise<{ success: boolean; data?: ImageAsset; error?: string }> {
    try {
      const { id, ...updateData } = imageAsset;
      
      const { data, error } = await supabase
        .from('image_assets')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating image asset:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Image asset service error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Soft delete image asset
   */
  static async softDelete(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const updateData = ImageAssetUtils.createSoftDeleteUpdate(id);
      const result = await this.update(updateData);
      
      return { 
        success: result.success, 
        error: result.error 
      };
    } catch (error) {
      console.error('Image asset service error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Restore soft deleted image asset
   */
  static async restore(id: string): Promise<{ success: boolean; data?: ImageAsset; error?: string }> {
    try {
      const updateData = ImageAssetUtils.createRestoreUpdate(id);
      return await this.update(updateData);
    } catch (error) {
      console.error('Image asset service error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Hard delete image asset (permanent)
   */
  static async hardDelete(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('image_assets')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting image asset:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Image asset service error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get images by related entity
   */
  static async getByRelatedId(
    relatedId: string, 
    type?: ImageAssetType,
    includeDeleted: boolean = false
  ): Promise<{ success: boolean; data?: ImageAsset[]; error?: string }> {
    try {
      let query = supabase
        .from('image_assets')
        .select('*')
        .eq('related_id', relatedId);

      if (type) {
        query = query.eq('type', type);
      }

      if (!includeDeleted) {
        query = query.is('deleted_at', null);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching related images:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Image asset service error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get images by owner
   */
  static async getByOwner(
    ownerId: string,
    type?: ImageAssetType,
    includeDeleted: boolean = false
  ): Promise<{ success: boolean; data?: ImageAsset[]; error?: string }> {
    try {
      const filters: ImageAssetFilters = {
        owner_id: ownerId,
        type,
        deleted: includeDeleted ? undefined : false,
        limit: 100,
        offset: 0
      };

      return await this.list(filters);
    } catch (error) {
      console.error('Image asset service error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Update image metadata
   */
  static async updateMetadata(
    id: string, 
    metadata: Record<string, any>
  ): Promise<{ success: boolean; data?: ImageAsset; error?: string }> {
    try {
      // Get existing image to merge metadata
      const existing = await this.getById(id);
      if (!existing.success || !existing.data) {
        return { success: false, error: 'Image not found' };
      }

      const mergedMetadata = {
        ...existing.data.metadata,
        ...metadata
      };

      return await this.update({
        id,
        metadata: mergedMetadata
      });
    } catch (error) {
      console.error('Image asset service error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Batch create image assets
   */
  static async batchCreate(imageAssets: InsertImageAsset[]): Promise<{ 
    success: boolean; 
    data?: ImageAsset[]; 
    error?: string 
  }> {
    try {
      const { data, error } = await supabase
        .from('image_assets')
        .insert(imageAssets)
        .select();

      if (error) {
        console.error('Error batch creating image assets:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Image asset service error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get image statistics
   */
  static async getStats(ownerId?: string): Promise<{ 
    success: boolean; 
    data?: {
      total: number;
      by_type: Record<string, number>;
      by_visibility: Record<string, number>;
      total_size: number;
    }; 
    error?: string 
  }> {
    try {
      let query = supabase
        .from('image_assets')
        .select('type, visibility, metadata')
        .is('deleted_at', null);

      if (ownerId) {
        query = query.eq('owner_id', ownerId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching image stats:', error);
        return { success: false, error: error.message };
      }

      const stats = {
        total: data?.length || 0,
        by_type: {} as Record<string, number>,
        by_visibility: {} as Record<string, number>,
        total_size: 0
      };

      data?.forEach(image => {
        // Count by type
        stats.by_type[image.type] = (stats.by_type[image.type] || 0) + 1;
        
        // Count by visibility
        stats.by_visibility[image.visibility] = (stats.by_visibility[image.visibility] || 0) + 1;
        
        // Sum total size
        if (image.metadata?.size) {
          stats.total_size += image.metadata.size;
        }
      });

      return { success: true, data: stats };
    } catch (error) {
      console.error('Image asset service error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}

export default ImageAssetService;
/**
 * UNIFIED UPLOAD SERVICE
 * Centralized service for all image uploads across the platform
 * Consolidates duplicate logic from multiple upload routes
 */

import multer from 'multer';
import sharp from 'sharp';
import crypto from 'crypto';
import { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

import { 
  EntityType, 
  ImagePurpose, 
  ProcessingProfile,
  UploadRequest,
  BulkUploadRequest,
  UploadResult,
  BulkUploadResult,
  UploadMetadata,
  ENTITY_STORAGE_CONFIG,
  PROCESSING_PROFILES,
  uploadRequestSchema,
  bulkUploadRequestSchema,
  validateFileType,
  validateFileSize,
  generateStoragePath
} from '../../shared/uploadTypes';

import {
  generateUniqueFilename,
  calculateChecksum,
  sanitizeFilename,
  getContentType,
  validateUploadFile,
  createBaseMetadata,
  mergeMetadata,
  generateFullStoragePath,
  createUploadError,
  UPLOAD_ERRORS,
  generateBatchId,
  chunkArray,
  estimateProcessingTime,
  createAuditEntry
} from '../../shared/uploadUtils';

import { ImageAssetService } from './imageAssetService';

// =============================================================================
// SERVICE CLASS
// =============================================================================

export class UnifiedUploadService {
  private supabaseAdmin: any;
  private upload: multer.Multer;

  constructor() {
    // Initialize Supabase admin client
    this.supabaseAdmin = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Configure multer for memory storage
    this.upload = multer({
      storage: multer.memoryStorage(),
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB max (will be validated per entity type)
        files: 10 // Max 10 files per request
      },
      fileFilter: this.fileFilter.bind(this)
    });
  }

  // =============================================================================
  // MULTER CONFIGURATION
  // =============================================================================

  private fileFilter(req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback): void {
    // Basic file type validation (more specific validation happens later)
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only image files and PDFs are allowed') as any, false);
    }
  }

  /**
   * Get multer middleware for single file upload
   */
  public getSingleUploadMiddleware(fieldName: string = 'file') {
    return this.upload.single(fieldName);
  }

  /**
   * Get multer middleware for multiple file upload
   */
  public getMultipleUploadMiddleware(fieldName: string = 'files', maxCount: number = 5) {
    return this.upload.array(fieldName, maxCount);
  }

  // =============================================================================
  // IMAGE PROCESSING
  // =============================================================================

  private async processImage(
    buffer: Buffer,
    processingProfile: ProcessingProfile
  ): Promise<{ buffer: Buffer; contentType: string; dimensions?: { width: number; height: number } }> {
    
    if (processingProfile === 'original') {
      return { buffer, contentType: 'image/jpeg' };
    }

    const options = PROCESSING_PROFILES[processingProfile];
    if (!options) {
      throw new Error(`Unknown processing profile: ${processingProfile}`);
    }

    try {
      let sharpInstance = sharp(buffer);
      
      // Get original dimensions
      const metadata = await sharpInstance.metadata();
      const originalDimensions = { 
        width: metadata.width || 0, 
        height: metadata.height || 0 
      };

      // Apply resize if specified
      if (options.width || options.height) {
        sharpInstance = sharpInstance.resize(options.width, options.height, {
          fit: options.fit || 'inside',
          withoutEnlargement: true,
          background: options.background || 'white'
        });
      }

      // Apply format conversion and quality
      let processedBuffer: Buffer;
      let contentType: string;

      switch (options.format) {
        case 'webp':
          processedBuffer = await sharpInstance
            .webp({ 
              quality: options.quality || 80,
              progressive: options.progressive 
            })
            .toBuffer();
          contentType = 'image/webp';
          break;
        
        case 'png':
          processedBuffer = await sharpInstance
            .png({ 
              quality: options.quality || 80,
              progressive: options.progressive 
            })
            .toBuffer();
          contentType = 'image/png';
          break;
        
        default: // jpeg
          processedBuffer = await sharpInstance
            .jpeg({ 
              quality: options.quality || 85,
              progressive: options.progressive 
            })
            .toBuffer();
          contentType = 'image/jpeg';
      }

      // Get final dimensions
      const finalMetadata = await sharp(processedBuffer).metadata();
      const finalDimensions = {
        width: finalMetadata.width || 0,
        height: finalMetadata.height || 0
      };

      return { 
        buffer: processedBuffer, 
        contentType,
        dimensions: finalDimensions
      };

    } catch (error) {
      console.error('Image processing failed:', error);
      // Return original buffer if processing fails
      return { buffer, contentType: 'image/jpeg' };
    }
  }

  // =============================================================================
  // ENTITY VALIDATION
  // =============================================================================

  private async validateEntity(entityType: EntityType, entityId: string): Promise<boolean> {
    try {
      const tableMap: Record<EntityType, string> = {
        'catalog_item': 'catalog_items',
        'customer': 'customers',
        'user_profile': 'user_profiles',
        'organization': 'organizations',
        'order': 'orders',
        'design_task': 'design_tasks',
        'production_task': 'production_tasks',
        'product_library': 'catalog_items',
        'manufacturer': 'manufacturers'
      };

      const tableName = tableMap[entityType];
      if (!tableName) {
        return false;
      }

      const { data, error } = await this.supabaseAdmin
        .from(tableName)
        .select('id')
        .eq('id', entityId)
        .single();

      return !error && !!data;
    } catch (error) {
      console.error('Entity validation failed:', error);
      return false;
    }
  }

  // =============================================================================
  // CORE UPLOAD METHODS
  // =============================================================================

  /**
   * Upload single file with comprehensive processing
   */
  public async uploadSingle(
    file: Express.Multer.File,
    uploadRequest: UploadRequest,
    userId: string,
    options?: {
      skipEntityValidation?: boolean;
      customMetadata?: any;
      generateThumbnail?: boolean;
    }
  ): Promise<UploadResult> {
    const startTime = Date.now();

    try {
      // Validate request data
      const validatedRequest = uploadRequestSchema.parse(uploadRequest);
      
      // Validate entity exists (unless skipped)
      if (!options?.skipEntityValidation) {
        const entityExists = await this.validateEntity(
          validatedRequest.entity_type, 
          validatedRequest.entity_id
        );
        
        if (!entityExists) {
          return {
            success: false,
            error: UPLOAD_ERRORS.ENTITY_NOT_FOUND(
              validatedRequest.entity_type, 
              validatedRequest.entity_id
            ).message,
            error_code: 'ENTITY_NOT_FOUND'
          };
        }
      }

      // Validate file
      const validationResult = validateUploadFile(
        file.buffer,
        file.originalname,
        file.mimetype,
        validatedRequest.entity_type
      );

      if (!validationResult.valid) {
        return {
          success: false,
          error: validationResult.errors.join('; '),
          error_code: 'VALIDATION_FAILED'
        };
      }

      // Process image
      const processingResult = await this.processImage(
        file.buffer,
        validatedRequest.processing_profile
      );

      // Generate storage path
      const uniqueFilename = generateUniqueFilename(
        file.originalname,
        validatedRequest.processing_profile
      );

      const storagePaths = generateFullStoragePath(
        validatedRequest.entity_type,
        validatedRequest.entity_id,
        validatedRequest.image_purpose,
        uniqueFilename,
        validatedRequest.processing_profile
      );

      // Upload to storage
      const { data: uploadData, error: uploadError } = await this.supabaseAdmin.storage
        .from(storagePaths.bucket)
        .upload(storagePaths.path, processingResult.buffer, {
          contentType: processingResult.contentType,
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        return {
          success: false,
          error: UPLOAD_ERRORS.UPLOAD_FAILED(uploadError.message).message,
          error_code: 'STORAGE_ERROR'
        };
      }

      // Get public URL
      const { data: urlData } = this.supabaseAdmin.storage
        .from(storagePaths.bucket)
        .getPublicUrl(storagePaths.path);

      // Create comprehensive metadata
      const baseMetadata = createBaseMetadata(
        file.originalname,
        file.size,
        file.mimetype,
        userId,
        validatedRequest.processing_profile
      );

      const fullMetadata = mergeMetadata(baseMetadata, {
        checksum: calculateChecksum(file.buffer),
        image_processing: {
          original_dimensions: { width: 0, height: 0 }, // Would need original analysis
          processed_dimensions: processingResult.dimensions,
          compression_ratio: processingResult.buffer.length / file.size,
          format_converted: true,
          processing_time_ms: Date.now() - startTime
        },
        entity_relation: {
          entity_type: validatedRequest.entity_type,
          entity_id: validatedRequest.entity_id,
          image_purpose: validatedRequest.image_purpose,
          is_primary: validatedRequest.is_primary,
          alt_text: validatedRequest.alt_text,
          caption: validatedRequest.caption
        },
        security: {
          access_level: validatedRequest.access_level,
          virus_scan_result: 'clean' // Would integrate with actual virus scanning
        },
        custom: options?.customMetadata
      });

      // Store in image assets table using existing service
      const imageAssetResult = await ImageAssetService.createImageAsset({
        filename: uniqueFilename,
        original_filename: file.originalname,
        file_size: processingResult.buffer.length,
        mime_type: processingResult.contentType,
        storage_bucket: storagePaths.bucket,
        storage_path: storagePaths.path,
        public_url: urlData.publicUrl,
        entity_type: validatedRequest.entity_type,
        entity_id: validatedRequest.entity_id,
        image_purpose: validatedRequest.image_purpose,
        alt_text: validatedRequest.alt_text || '',
        is_active: true,
        metadata: fullMetadata,
        uploaded_by_id: userId
      });

      if (!imageAssetResult.success || !imageAssetResult.data) {
        return {
          success: false,
          error: 'Failed to create image asset record',
          error_code: 'DATABASE_ERROR'
        };
      }

      // Generate thumbnail if requested
      if (options?.generateThumbnail && validatedRequest.processing_profile !== 'thumbnail') {
        // Would implement thumbnail generation here
      }

      return {
        success: true,
        image_asset_id: imageAssetResult.data.id,
        public_url: urlData.publicUrl,
        secure_url: urlData.publicUrl, // Would implement signed URLs for private files
        storage_path: storagePaths.path,
        processing_results: {
          profile: validatedRequest.processing_profile,
          original_size: file.size,
          processed_size: processingResult.buffer.length,
          dimensions: processingResult.dimensions || { width: 0, height: 0 }
        },
        metadata: fullMetadata
      };

    } catch (error: any) {
      console.error('Upload failed with error:', error);
      return {
        success: false,
        error: error.message || 'Unknown upload error',
        error_code: 'UNEXPECTED_ERROR'
      };
    }
  }

  /**
   * Upload multiple files in batch
   */
  public async uploadBatch(
    files: Express.Multer.File[],
    bulkRequest: BulkUploadRequest,
    userId: string
  ): Promise<BulkUploadResult> {
    const startTime = Date.now();
    const batchId = generateBatchId();
    
    try {
      const validatedRequest = bulkUploadRequestSchema.parse(bulkRequest);
      
      if (files.length !== validatedRequest.uploads.length) {
        throw new Error('Number of files must match number of upload requests');
      }

      const results: (UploadResult & { index: number })[] = [];
      const chunks = chunkArray(
        files.map((file, index) => ({ file, request: validatedRequest.uploads[index], index })),
        3 // Process 3 files at a time
      );

      // Process in chunks to prevent overwhelming the system
      for (const chunk of chunks) {
        const chunkPromises = chunk.map(async ({ file, request, index }) => {
          const result = await this.uploadSingle(file, request, userId, {
            customMetadata: { batch_id: batchId, batch_index: index }
          });
          return { ...result, index };
        });

        const chunkResults = await Promise.all(chunkPromises);
        results.push(...chunkResults);
      }

      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);
      const totalSize = files.reduce((sum, file) => sum + file.size, 0);

      return {
        success: failed.length === 0,
        batch_id: batchId,
        results,
        summary: {
          total: files.length,
          successful: successful.length,
          failed: failed.length,
          total_size: totalSize,
          processing_time_ms: Date.now() - startTime
        },
        errors: failed.map(f => f.error).filter(Boolean) as string[]
      };

    } catch (error: any) {
      return {
        success: false,
        batch_id: batchId,
        results: [],
        summary: {
          total: files.length,
          successful: 0,
          failed: files.length,
          total_size: 0,
          processing_time_ms: Date.now() - startTime
        },
        errors: [error.message]
      };
    }
  }

  // =============================================================================
  // EXPRESS ROUTE HANDLERS
  // =============================================================================

  /**
   * Express route handler for single file upload
   */
  public handleSingleUpload = async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file provided',
          error_code: 'NO_FILE'
        });
      }

      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
          error_code: 'AUTH_REQUIRED'
        });
      }

      // Extract upload request from request body
      const uploadRequest: UploadRequest = {
        entity_type: req.body.entity_type,
        entity_id: req.body.entity_id,
        image_purpose: req.body.image_purpose,
        processing_profile: req.body.processing_profile || 'gallery',
        alt_text: req.body.alt_text,
        caption: req.body.caption,
        is_primary: req.body.is_primary === 'true',
        access_level: req.body.access_level || 'private',
        custom_metadata: req.body.custom_metadata ? JSON.parse(req.body.custom_metadata) : undefined
      };

      const result = await this.uploadSingle(req.file, uploadRequest, userId);

      if (result.success) {
        res.status(201).json({
          success: true,
          data: result
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.error,
          error_code: result.error_code
        });
      }

    } catch (error: any) {
      console.error('Upload handler error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error_code: 'INTERNAL_ERROR'
      });
    }
  };

  /**
   * Express route handler for multiple file upload
   */
  public handleBatchUpload = async (req: Request, res: Response) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No files provided',
          error_code: 'NO_FILES'
        });
      }

      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
          error_code: 'AUTH_REQUIRED'
        });
      }

      const bulkRequest: BulkUploadRequest = JSON.parse(req.body.bulk_request);
      const result = await this.uploadBatch(files, bulkRequest, userId);

      res.status(result.success ? 201 : 207).json({
        success: result.success,
        data: result
      });

    } catch (error: any) {
      console.error('Batch upload handler error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error_code: 'INTERNAL_ERROR'
      });
    }
  };

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  /**
   * Get upload statistics
   */
  public async getUploadStats(entityType?: EntityType): Promise<any> {
    try {
      let query = this.supabaseAdmin
        .from('image_assets')
        .select('entity_type, file_size, created_at, image_purpose');

      if (entityType) {
        query = query.eq('entity_type', entityType);
      }

      const { data, error } = await query;
      
      if (error) throw error;

      // Calculate statistics
      const stats = {
        total_uploads: data.length,
        total_size: data.reduce((sum: number, item: any) => sum + (item.file_size || 0), 0),
        by_entity_type: {},
        by_purpose: {},
        recent_uploads: data.filter((item: any) => {
          const uploadDate = new Date(item.created_at);
          const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          return uploadDate > dayAgo;
        }).length
      };

      return stats;
    } catch (error) {
      console.error('Failed to get upload stats:', error);
      throw error;
    }
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

export const unifiedUploadService = new UnifiedUploadService();
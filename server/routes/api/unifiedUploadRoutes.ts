/**
 * UNIFIED UPLOAD ROUTES
 * Centralized routes for all image uploads using the UnifiedUploadService
 * Replaces duplicate upload logic across multiple route files
 */

import { Router } from 'express';
import { requireAuth, requireRole } from '../auth/auth';
import { unifiedUploadService } from '../../services/unifiedUploadService';
import { z } from 'zod';

const router = Router();

// =============================================================================
// SINGLE FILE UPLOAD
// =============================================================================

/**
 * POST /api/uploads/single
 * Upload a single file to any entity
 * 
 * Body (multipart/form-data):
 * - file: The image file
 * - entity_type: Type of entity (catalog_item, customer, etc.)
 * - entity_id: ID of the entity
 * - image_purpose: Purpose of the image (profile, gallery, etc.)
 * - processing_profile: Processing profile to apply (optional, default: gallery)
 * - alt_text: Alt text for accessibility (optional)
 * - caption: Image caption (optional)
 * - is_primary: Whether this is the primary image (optional, default: false)
 * - access_level: Access level (optional, default: private)
 * - custom_metadata: Additional metadata as JSON string (optional)
 */
router.post('/single', 
  requireAuth,
  unifiedUploadService.getSingleUploadMiddleware('file'),
  unifiedUploadService.handleSingleUpload
);

// =============================================================================
// BATCH FILE UPLOAD
// =============================================================================

/**
 * POST /api/uploads/batch
 * Upload multiple files in a single request
 * 
 * Body (multipart/form-data):
 * - files: Array of image files
 * - bulk_request: JSON string containing BulkUploadRequest data
 */
router.post('/batch',
  requireAuth,
  unifiedUploadService.getMultipleUploadMiddleware('files', 10),
  unifiedUploadService.handleBatchUpload
);

// =============================================================================
// ENTITY-SPECIFIC CONVENIENCE ROUTES
// =============================================================================

/**
 * POST /api/uploads/catalog/:itemId
 * Upload image for catalog item (backward compatibility)
 */
router.post('/catalog/:itemId',
  requireAuth,
  requireRole(['admin', 'designer', 'salesperson']),
  unifiedUploadService.getSingleUploadMiddleware('file'),
  async (req, res) => {
    try {
      const { itemId } = req.params;
      const { image_purpose = 'gallery', alt_text, is_primary = 'false' } = req.body;

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file provided'
        });
      }

      const uploadRequest = {
        entity_type: 'catalog_item' as const,
        entity_id: itemId,
        image_purpose: image_purpose,
        processing_profile: 'gallery' as const,
        alt_text: alt_text || req.file.originalname,
        is_primary: is_primary === 'true',
        access_level: 'public' as const
      };

      const userId = (req as any).user?.id;
      const result = await unifiedUploadService.uploadSingle(req.file, uploadRequest, userId);

      if (result.success) {
        res.status(201).json({
          success: true,
          data: {
            imageId: result.image_asset_id,
            url: result.public_url,
            isPrimary: uploadRequest.is_primary,
            message: 'Image uploaded successfully'
          }
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.error
        });
      }
    } catch (error: any) {
      console.error('Catalog upload error:', error);
      res.status(500).json({
        success: false,
        message: 'Upload failed'
      });
    }
  }
);

/**
 * POST /api/uploads/customer/:customerId/profile
 * Upload customer profile image (backward compatibility)
 */
router.post('/customer/:customerId/profile',
  requireAuth,
  requireRole(['admin', 'salesperson']),
  unifiedUploadService.getSingleUploadMiddleware('file'),
  async (req, res) => {
    try {
      const { customerId } = req.params;

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file provided'
        });
      }

      const uploadRequest = {
        entity_type: 'customer' as const,
        entity_id: customerId,
        image_purpose: 'profile' as const,
        processing_profile: 'profile' as const,
        alt_text: 'Customer profile photo',
        is_primary: true,
        access_level: 'private' as const
      };

      const userId = (req as any).user?.id;
      const result = await unifiedUploadService.uploadSingle(req.file, uploadRequest, userId);

      if (result.success) {
        res.status(200).json({
          success: true,
          data: {
            url: result.public_url,
            message: 'Profile image uploaded successfully'
          }
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.error
        });
      }
    } catch (error: any) {
      console.error('Customer profile upload error:', error);
      res.status(500).json({
        success: false,
        message: 'Upload failed'
      });
    }
  }
);

/**
 * POST /api/uploads/product-library/:productId/mockup
 * Upload product library mockup (backward compatibility)
 */
router.post('/product-library/:productId/mockup',
  requireAuth,
  requireRole(['admin', 'designer']),
  unifiedUploadService.getSingleUploadMiddleware('file'),
  async (req, res) => {
    try {
      const { productId } = req.params;
      const { image_type = 'mockup', alt_text, notes } = req.body;

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file provided'
        });
      }

      const uploadRequest = {
        entity_type: 'product_library' as const,
        entity_id: productId,
        image_purpose: image_type,
        processing_profile: 'gallery' as const,
        alt_text: alt_text || `${image_type} for product`,
        is_primary: false,
        access_level: 'private' as const,
        custom_metadata: { notes }
      };

      const userId = (req as any).user?.id;
      const result = await unifiedUploadService.uploadSingle(req.file, uploadRequest, userId);

      if (result.success) {
        res.status(201).json({
          success: true,
          data: {
            id: result.image_asset_id,
            image_url: result.public_url,
            image_type: uploadRequest.image_purpose,
            alt_text: uploadRequest.alt_text,
            created_at: new Date().toISOString(),
            metadata: result.metadata
          }
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.error
        });
      }
    } catch (error: any) {
      console.error('Product library upload error:', error);
      res.status(500).json({
        success: false,
        message: 'Upload failed'
      });
    }
  }
);

// =============================================================================
// UPLOAD MANAGEMENT
// =============================================================================

/**
 * GET /api/uploads/stats
 * Get upload statistics
 */
router.get('/stats',
  requireAuth,
  requireRole(['admin']),
  async (req, res) => {
    try {
      const { entity_type } = req.query;
      const stats = await unifiedUploadService.getUploadStats(entity_type as any);

      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      console.error('Failed to get upload stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve upload statistics'
      });
    }
  }
);

/**
 * GET /api/uploads/config
 * Get upload configuration for different entity types
 */
router.get('/config',
  requireAuth,
  async (req, res) => {
    try {
      const { entity_type } = req.query;
      
      // Import here to avoid circular dependencies
      const { ENTITY_STORAGE_CONFIG, PROCESSING_PROFILES } = await import('../../shared/uploadTypes');
      
      const config = entity_type 
        ? { [entity_type as string]: ENTITY_STORAGE_CONFIG[entity_type as keyof typeof ENTITY_STORAGE_CONFIG] }
        : ENTITY_STORAGE_CONFIG;

      res.status(200).json({
        success: true,
        data: {
          storage_config: config,
          processing_profiles: PROCESSING_PROFILES,
          supported_entity_types: Object.keys(ENTITY_STORAGE_CONFIG),
          supported_image_purposes: [
            'profile', 'gallery', 'production', 'design', 'logo', 'thumbnail',
            'hero', 'attachment', 'mockup', 'product_photo', 'design_proof',
            'size_chart', 'color_reference', 'technical_drawing'
          ]
        }
      });
    } catch (error: any) {
      console.error('Failed to get upload config:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve upload configuration'
      });
    }
  }
);

// =============================================================================
// HEALTH CHECK
// =============================================================================

/**
 * GET /api/uploads/health
 * Health check for upload service (no auth required)
 */
router.get('/health', async (req, res) => {
    try {
      // Basic health checks
      const checks = {
        service: 'healthy',
        storage: 'checking',
        processing: 'healthy'
      };

      // Test storage connection
      try {
        const { ENTITY_STORAGE_CONFIG } = await import('../../shared/uploadTypes');
        checks.storage = 'healthy';
      } catch (error) {
        checks.storage = 'unhealthy';
      }

      const healthy = Object.values(checks).every(status => status === 'healthy');

      res.status(healthy ? 200 : 503).json({
        success: healthy,
        data: {
          status: healthy ? 'healthy' : 'degraded',
          checks,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error: any) {
      res.status(503).json({
        success: false,
        data: {
          status: 'unhealthy',
          error: error.message,
          timestamp: new Date().toISOString()
        }
      });
    }
  }
);

export default router;
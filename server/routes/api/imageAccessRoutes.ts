/**
 * IMAGE ACCESS API ROUTES
 * Handles temporary access link generation for private images
 */

import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../../middleware/adminAuth';
import { ImageAssetService } from '../../../lib/imageAssetService';

const router = Router();

// Schema for temporary access link generation
const generateAccessLinkSchema = z.object({
  imageId: z.string().uuid('Invalid image ID format'),
  expiresInSeconds: z.number().min(60).max(86400).optional() // 1 minute to 24 hours
});

const generateBulkAccessLinksSchema = z.object({
  imageIds: z.array(z.string().uuid()).min(1).max(50), // Max 50 images at once
  expiresInSeconds: z.number().min(60).max(86400).optional()
});

const generateEntityAccessLinksSchema = z.object({
  entityType: z.enum(['catalog_item', 'order', 'design_task', 'customer', 'manufacturer', 'user_profile', 'organization']),
  entityId: z.string().uuid('Invalid entity ID format'),
  imagePurpose: z.enum(['gallery', 'profile', 'production', 'design', 'logo', 'thumbnail', 'hero', 'attachment']).optional(),
  expiresInSeconds: z.number().min(60).max(86400).optional()
});

const generateDownloadLinkSchema = z.object({
  imageId: z.string().uuid('Invalid image ID format'),
  downloadFilename: z.string().optional(),
  expiresInSeconds: z.number().min(60).max(86400).optional()
});

/**
 * POST /api/images/access/generate
 * Generate temporary access link for a single image
 */
router.post('/generate', requireAuth, async (req, res) => {
  try {
    console.log('🔗 Generating temporary access link');
    
    const validatedData = generateAccessLinkSchema.parse(req.body);
    const { imageId, expiresInSeconds = 3600 } = validatedData;

    const result = await ImageAssetService.generateTemporaryAccessLink(imageId, expiresInSeconds);

    res.status(200).json({
      success: true,
      data: {
        imageId,
        signedUrl: result.signedUrl,
        expiresAt: result.expiresAt,
        expiresInSeconds
      }
    });
  } catch (error: any) {
    console.error('❌ Error generating temporary access link:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to generate temporary access link'
    });
  }
});

/**
 * POST /api/images/access/bulk-generate
 * Generate temporary access links for multiple images
 */
router.post('/bulk-generate', requireAuth, async (req, res) => {
  try {
    console.log('🔗 Generating bulk temporary access links');
    
    const validatedData = generateBulkAccessLinksSchema.parse(req.body);
    const { imageIds, expiresInSeconds = 3600 } = validatedData;

    const results = await ImageAssetService.generateBulkTemporaryAccessLinks(imageIds, expiresInSeconds);

    const successful = results.filter(r => !r.error);
    const failed = results.filter(r => r.error);

    res.status(200).json({
      success: true,
      data: {
        results,
        summary: {
          total: imageIds.length,
          successful: successful.length,
          failed: failed.length,
          expiresInSeconds
        }
      }
    });
  } catch (error: any) {
    console.error('❌ Error generating bulk temporary access links:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to generate bulk temporary access links'
    });
  }
});

/**
 * POST /api/images/access/entity-generate
 * Generate temporary access links for all images of a specific entity
 */
router.post('/entity-generate', requireAuth, async (req, res) => {
  try {
    console.log('🔗 Generating entity temporary access links');
    
    const validatedData = generateEntityAccessLinksSchema.parse(req.body);
    const { entityType, entityId, imagePurpose, expiresInSeconds = 3600 } = validatedData;

    const results = await ImageAssetService.generateEntityTemporaryAccessLinks(
      entityType, 
      entityId, 
      imagePurpose, 
      expiresInSeconds
    );

    res.status(200).json({
      success: true,
      data: {
        entityType,
        entityId,
        imagePurpose,
        results,
        summary: {
          total: results.length,
          successful: results.filter(r => !r.error).length,
          failed: results.filter(r => r.error).length,
          expiresInSeconds
        }
      }
    });
  } catch (error: any) {
    console.error('❌ Error generating entity temporary access links:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to generate entity temporary access links'
    });
  }
});

/**
 * POST /api/images/access/download
 * Generate temporary download link with custom filename
 */
router.post('/download', requireAuth, async (req, res) => {
  try {
    console.log('📥 Generating download link');
    
    const validatedData = generateDownloadLinkSchema.parse(req.body);
    const { imageId, downloadFilename, expiresInSeconds = 3600 } = validatedData;

    const result = await ImageAssetService.generateDownloadLink(imageId, downloadFilename, expiresInSeconds);

    res.status(200).json({
      success: true,
      data: {
        imageId,
        downloadUrl: result.downloadUrl,
        filename: result.filename,
        expiresAt: result.expiresAt,
        expiresInSeconds
      }
    });
  } catch (error: any) {
    console.error('❌ Error generating download link:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to generate download link'
    });
  }
});

/**
 * GET /api/images/access/entity/:entityType/:entityId
 * Get temporary access links for entity images (convenience endpoint)
 */
router.get('/entity/:entityType/:entityId', requireAuth, async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    const { imagePurpose, expiresInSeconds = 3600 } = req.query;

    console.log(`🔗 Getting entity access links: ${entityType}:${entityId}`);

    // Validate parameters
    const validatedData = generateEntityAccessLinksSchema.parse({
      entityType,
      entityId,
      imagePurpose: imagePurpose as string || undefined,
      expiresInSeconds: parseInt(expiresInSeconds as string) || 3600
    });

    const results = await ImageAssetService.generateEntityTemporaryAccessLinks(
      validatedData.entityType,
      validatedData.entityId,
      validatedData.imagePurpose,
      validatedData.expiresInSeconds
    );

    res.status(200).json({
      success: true,
      data: {
        entityType: validatedData.entityType,
        entityId: validatedData.entityId,
        imagePurpose: validatedData.imagePurpose,
        results,
        summary: {
          total: results.length,
          successful: results.filter(r => !r.error).length,
          failed: results.filter(r => r.error).length,
          expiresInSeconds: validatedData.expiresInSeconds
        }
      }
    });
  } catch (error: any) {
    console.error('❌ Error getting entity access links:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to get entity access links'
    });
  }
});

/**
 * GET /api/images/access/stats
 * Get access statistics and usage analytics
 */
router.get('/stats', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    console.log('📊 Getting image access statistics');

    const stats = await ImageAssetService.getStorageStats();
    
    // Additional access-specific stats could be added here
    const accessStats = {
      ...stats,
      access_tracking: {
        temporary_links_supported: true,
        max_expiry_seconds: 86400,
        min_expiry_seconds: 60,
        supported_purposes: ['gallery', 'profile', 'production', 'design', 'logo', 'thumbnail', 'hero', 'attachment'],
        supported_entity_types: ['catalog_item', 'order', 'design_task', 'customer', 'manufacturer', 'user_profile', 'organization']
      }
    };

    res.status(200).json({
      success: true,
      data: accessStats
    });
  } catch (error: any) {
    console.error('❌ Error getting access statistics:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get access statistics'
    });
  }
});

export default router;
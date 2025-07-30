/**
 * COMPREHENSIVE IMAGE ROUTES
 * Unified image handling system that replaces all fragmented image routes
 */

import { Router } from 'express';
import { requireAuth, requireRole } from '../auth/auth';
import { 
  comprehensiveImageUpload, 
  migrateLegacyImageUrls, 
  deleteAllImageVariants 
} from '../../comprehensiveImageFix';

const router = Router();

// PRIMARY IMAGE UPLOAD ENDPOINT
// Handles catalog item images with full optimization pipeline
router.post('/catalog/:catalogItemId', 
  requireAuth, 
  requireRole(['admin', 'designer']), 
  ...comprehensiveImageUpload
);

// DELETE ALL IMAGE VARIANTS
router.delete('/catalog/:catalogItemId', 
  requireAuth, 
  requireRole(['admin', 'designer']), 
  async (req, res) => {
    try {
      const { catalogItemId } = req.params;
      
      const success = await deleteAllImageVariants(catalogItemId);
      
      if (success) {
        return res.json({
          success: true,
          message: 'All image variants deleted successfully'
        });
      } else {
        return res.status(500).json({
          success: false,
          message: 'Failed to delete some image variants'
        });
      }
    } catch (error) {
      console.error('❌ Error deleting images:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error during image deletion'
      });
    }
  }
);

// MIGRATION UTILITY ENDPOINT
router.post('/migrate-legacy-urls', 
  requireAuth, 
  requireRole(['admin']), 
  async (req, res) => {
    try {
      const result = await migrateLegacyImageUrls();
      
      return res.json({
        success: true,
        message: 'Legacy URL migration completed',
        data: result
      });
    } catch (error) {
      console.error('❌ Migration error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to migrate legacy URLs'
      });
    }
  }
);

// HEALTH CHECK ENDPOINT
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Comprehensive image system is operational',
    features: [
      'Multi-size image generation',
      'WebP optimization',
      'Environment-aware URLs',
      'Concurrent processing',
      'Legacy migration support'
    ]
  });
});

export default router;
import { Router } from 'express';
import { requireAuth, requireRole } from '../auth/auth';
import { optimizedCatalogImageUpload, deleteOptimizedImages } from '../../optimizedImageUpload';

const router = Router();

// Optimized catalog image upload
router.post('/catalog/:catalogItemId', 
  requireAuth, 
  requireRole(['admin', 'designer']), 
  ...optimizedCatalogImageUpload
);

// Delete optimized catalog images
router.delete('/catalog/:catalogItemId', requireAuth, requireRole(['admin', 'designer']), async (req, res) => {
  try {
    const { catalogItemId } = req.params;
    
    const success = await deleteOptimizedImages(catalogItemId);
    
    if (success) {
      return res.json({
        success: true,
        message: 'All image sizes deleted successfully'
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Failed to delete images'
      });
    }
  } catch (error) {
    console.error('Error deleting optimized images:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router;
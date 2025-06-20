import { Request, Response, Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../db';
import { activityLogs } from '../../../shared/schema';
import { supabase } from '../../db';
import { 
  handleCatalogImageUpload, 
  handleOrderItemImageUpload, 
  getImageUrl, 
  deleteImageFile, 
  extractFilenameFromUrl 
} from '../../imageUpload';
import { requireAuth, requireRole } from '../auth/auth';

const router = Router();

// Upload image for catalog item
router.post('/catalog/:catalogItemId', requireAuth, requireRole(['admin', 'designer']), handleCatalogImageUpload, async (req: Request, res: Response) => {
  try {
    const { catalogItemId } = req.params;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    // Generate image URL
    const imageUrl = getImageUrl(req.file.filename, 'catalog');

    // Update catalog item with new image URL
    const { data: updatedItem, error } = await supabase
      .from('catalog_items')
      .update({ 
        base_image_url: imageUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', catalogItemId)
      .select()
      .single();

    if (error) {
      // Clean up uploaded file if database update fails
      deleteImageFile(req.file.filename, 'catalog');
      return res.status(500).json({
        success: false,
        message: 'Failed to update catalog item with image'
      });
    }

    return res.json({
      success: true,
      message: 'Image uploaded successfully',
      data: {
        catalogItem: updatedItem,
        imageUrl: imageUrl,
        filename: req.file.filename
      }
    });

  } catch (error) {
    console.error('Error uploading catalog image:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to upload image'
    });
  }
});

// Upload measurement chart for catalog item
router.post('/catalog/:catalogItemId/measurement', requireAuth, requireRole(['admin', 'designer']), handleCatalogImageUpload, async (req: Request, res: Response) => {
  try {
    const { catalogItemId } = req.params;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No measurement chart file provided'
      });
    }

    // Generate image URL
    const imageUrl = getImageUrl(req.file.filename, 'catalog');

    // Update catalog item with new measurement chart URL
    const { data: updatedItem, error } = await supabase
      .from('catalog_items')
      .update({ 
        measurement_chart_url: imageUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', catalogItemId)
      .select()
      .single();

    if (error) {
      // Clean up uploaded file if database update fails
      deleteImageFile(req.file.filename, 'catalog');
      return res.status(500).json({
        success: false,
        message: 'Failed to update catalog item with measurement chart'
      });
    }

    return res.json({
      success: true,
      message: 'Measurement chart uploaded successfully',
      data: {
        catalogItem: updatedItem,
        imageUrl: imageUrl,
        filename: req.file.filename
      }
    });
  } catch (error) {
    console.error('Error uploading measurement chart:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to upload measurement chart'
    });
  }
});

// Upload custom image for order item
router.post('/order-item/:orderItemId', requireAuth, requireRole(['admin', 'salesperson', 'designer']), handleOrderItemImageUpload, async (req: Request, res: Response) => {
  try {
    const { orderItemId } = req.params;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    // Generate image URL
    const imageUrl = getImageUrl(req.file.filename, 'order-item');

    // Update order item with custom image URL
    const { data: updatedItem, error } = await supabase
      .from('order_items')
      .update({ 
        custom_image_url: imageUrl
      })
      .eq('id', orderItemId)
      .select()
      .single();

    if (error) {
      // Clean up uploaded file if database update fails
      deleteImageFile(req.file.filename, 'order-item');
      return res.status(500).json({
        success: false,
        message: 'Failed to update order item with custom image'
      });
    }

    return res.json({
      success: true,
      message: 'Custom image uploaded successfully',
      data: {
        orderItem: updatedItem,
        imageUrl: imageUrl,
        filename: req.file.filename
      }
    });

  } catch (error) {
    console.error('Error uploading order item image:', error);

    // Clean up uploaded file on error
    if (req.file) {
      deleteImageFile(req.file.filename, 'order-item');
    }

    return res.status(500).json({
      success: false,
      message: 'Internal server error during image upload'
    });
  }
});

// Delete catalog image
router.delete('/catalog/:catalogItemId', requireAuth, requireRole(['admin', 'designer']), async (req: Request, res: Response) => {
  try {
    const { catalogItemId } = req.params;

    // Get current catalog item to find image URL
    const { data: catalogItem, error: fetchError } = await supabase
      .from('catalog_items')
      .select('base_image_url')
      .eq('id', catalogItemId)
      .single();

    if (fetchError || !catalogItem) {
      return res.status(404).json({
        success: false,
        message: 'Catalog item not found'
      });
    }

    if (!catalogItem.base_image_url) {
      return res.status(400).json({
        success: false,
        message: 'No image to delete'
      });
    }

    // Extract filename from URL and delete file
    const filename = extractFilenameFromUrl(catalogItem.base_image_url as string);
    if (filename) {
      deleteImageFile(filename, 'catalog');
    }

    // Update catalog item to remove image URL
    const { error: updateError } = await supabase
      .from('catalog_items')
      .update({ 
        base_image_url: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', catalogItemId);

    if (updateError) {
      return res.status(500).json({
        success: false,
        message: 'Failed to remove image from catalog item'
      });
    }

    return res.json({
      success: true,
      message: 'Image deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting catalog image:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during image deletion'
    });
  }
});

// Delete order item custom image
router.delete('/order-item/:orderItemId', requireAuth, requireRole(['admin', 'salesperson', 'designer']), async (req: Request, res: Response) => {
  try {
    const { orderItemId } = req.params;

    // Get current order item to find custom image URL
    const { data: orderItem, error: fetchError } = await supabase
      .from('order_items')
      .select('custom_image_url')
      .eq('id', orderItemId)
      .single();

    if (fetchError || !orderItem) {
      return res.status(404).json({
        success: false,
        message: 'Order item not found'
      });
    }

    if (!orderItem.custom_image_url) {
      return res.status(400).json({
        success: false,
        message: 'No custom image to delete'
      });
    }

    // Extract filename from URL and delete file
    const filename = extractFilenameFromUrl(orderItem.custom_image_url as string);
    if (filename) {
      deleteImageFile(filename, 'order-item');
    }

    // Update order item to remove custom image URL
    const { error: updateError } = await supabase
      .from('order_items')
      .update({ custom_image_url: null })
      .eq('id', orderItemId);

    if (updateError) {
      return res.status(500).json({
        success: false,
        message: 'Failed to remove custom image from order item'
      });
    }

    return res.json({
      success: true,
      message: 'Custom image deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting order item image:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during image deletion'
    });
  }
});

export default router;
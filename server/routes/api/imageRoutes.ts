import { Request, Response, Router } from 'express';
import { requireAuth, requireRole } from '../auth/auth';
import { supabase } from '../../db';
import { supabaseImageStorage } from '../../supabaseImageStorage';
import multer from 'multer';

const router = Router();

// Memory storage for processing with Supabase
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(file.originalname.toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, WebP) are allowed'));
    }
  }
});

// Upload image for catalog item
router.post('/catalog/:catalogItemId', requireAuth, requireRole(['admin', 'designer']), upload.single('image'), async (req: Request, res: Response) => {
  try {
    const { catalogItemId } = req.params;
    
    console.log('🖼️ Image upload request received for catalog item:', catalogItemId);
    console.log('📁 Request file info:', req.file ? {
      filename: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    } : 'No file');

    if (!req.file) {
      console.log('❌ No image file provided in upload request');
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    // Upload image to Supabase Storage
    const { data, error: uploadError } = await supabase
      .storage
      .from('catalog-images')
      .upload(`${catalogItemId}/${req.file.originalname}`, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: true
      });

    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      return res.status(500).json({
        success: false,
        message: 'Failed to upload image to Supabase'
      });
    }

    // Generate image URL
    const imageUrl = supabase.storage.from('catalog-images').getPublicUrl(data.path).data.publicUrl;

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
      console.error('Supabase update error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update catalog item with image URL'
      });
    }

    console.log('✅ Image upload completed successfully');
    console.log('🔗 Generated image URL:', imageUrl);
    console.log('📦 Updated catalog item:', updatedItem?.id);

    return res.json({
      success: true,
      message: 'Image uploaded successfully',
      data: {
        catalogItem: updatedItem,
        imageUrl: imageUrl,
        filename: req.file.originalname
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
router.post('/catalog/:catalogItemId/measurement', requireAuth, requireRole(['admin', 'designer']), upload.single('image'), async (req: Request, res: Response) => {
  try {
    const { catalogItemId } = req.params;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No measurement chart file provided'
      });
    }

    // Upload image to Supabase Storage
    const { data, error: uploadError } = await supabase
      .storage
      .from('measurement-charts')
      .upload(`${catalogItemId}/${req.file.originalname}`, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: true
      });

    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      return res.status(500).json({
        success: false,
        message: 'Failed to upload measurement chart to Supabase'
      });
    }

    // Generate image URL
    const imageUrl = supabase.storage.from('measurement-charts').getPublicUrl(data.path).data.publicUrl;

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
      console.error('Supabase update error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update catalog item with measurement chart URL'
      });
    }

    return res.json({
      success: true,
      message: 'Measurement chart uploaded successfully',
      data: {
        catalogItem: updatedItem,
        imageUrl: imageUrl,
        filename: req.file.originalname
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
router.post('/order-item/:orderItemId', requireAuth, requireRole(['admin', 'salesperson', 'designer']), upload.single('image'), async (req: Request, res: Response) => {
  try {
    const { orderItemId } = req.params;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    // Upload image to Supabase Storage
    const { data, error: uploadError } = await supabase
      .storage
      .from('order-item-images')
      .upload(`${orderItemId}/${req.file.originalname}`, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: true
      });

    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      return res.status(500).json({
        success: false,
        message: 'Failed to upload image to Supabase'
      });
    }

    // Generate image URL
    const imageUrl = supabase.storage.from('order-item-images').getPublicUrl(data.path).data.publicUrl;

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
      console.error('Supabase update error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update order item with custom image URL'
      });
    }

    return res.json({
      success: true,
      message: 'Custom image uploaded successfully',
      data: {
        orderItem: updatedItem,
        imageUrl: imageUrl,
        filename: req.file.originalname
      }
    });

  } catch (error) {
    console.error('Error uploading order item image:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to upload image'
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

    // Extract filename from URL (Supabase version)
    const imageUrl = catalogItem.base_image_url;
    const pathParts = imageUrl.split('/');
    const bucketName = pathParts[4];
    const imagePath = `${pathParts[5]}/${pathParts[6]}`;

    // Delete file from Supabase storage
     const { error: deleteError } = await supabase
      .storage
      .from('catalog-images')
      .remove([`${catalogItemId}/${imagePath.split('/').pop()}`]);

    if (deleteError) {
      console.error('Supabase delete error:', deleteError);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete image from Supabase'
      });
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
      console.error('Supabase update error:', updateError);
      return res.status(500).json({
        success: false,
        message: 'Failed to remove image URL from catalog item'
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

        // Extract filename from URL (Supabase version)
    const imageUrl = orderItem.custom_image_url;
    const pathParts = imageUrl.split('/');
    const bucketName = pathParts[4];
    const imagePath = `${pathParts[5]}/${pathParts[6]}`;

    // Delete file from Supabase storage
     const { error: deleteError } = await supabase
      .storage
      .from('order-item-images')
      .remove([`${orderItemId}/${imagePath.split('/').pop()}`]);

    if (deleteError) {
      console.error('Supabase delete error:', deleteError);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete image from Supabase'
      });
    }

    // Update order item to remove custom image URL
    const { error: updateError } = await supabase
      .from('order_items')
      .update({ custom_image_url: null })
      .eq('id', orderItemId);

    if (updateError) {
      console.error('Supabase update error:', updateError);
      return res.status(500).json({
        success: false,
        message: 'Failed to remove custom image URL from order item'
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
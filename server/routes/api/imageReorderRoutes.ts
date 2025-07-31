/**
 * IMAGE REORDER API ROUTES
 * Handles drag-and-drop reordering of images in JSONB fields
 */

import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../../middleware/adminAuth';
import { supabase } from '../../db';
import { ImageAssetService } from '../../../lib/imageAssetService';

const router = Router();

// Schema for reordering request
const reorderSchema = z.object({
  images: z.array(z.object({
    id: z.string(),
    url: z.string(),
    alt: z.string().optional(),
    caption: z.string().optional(),
    isPrimary: z.boolean().optional(),
    order: z.number(),
    metadata: z.any().optional()
  }))
});

// PATCH /api/catalog/:id/reorder-images - Reorder catalog item images
router.patch('/catalog/:id/reorder-images', 
  requireAuth,
  requireRole(['admin', 'salesperson']),
  async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = reorderSchema.parse(req.body);

      console.log(`🎯 Reordering images for catalog item ${id}`);
      console.log(`📊 Updating ${validatedData.images.length} images`);

      // Update the catalog item's images[] database array with new order
      const { data: item, error } = await supabase
        .from('catalog_items')
        .update({
          images: validatedData.images,
          updated_at: 'NOW()'
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('❌ Failed to update catalog item images:', error);
        return res.status(500).json({
          success: false,
          message: 'Failed to update image order'
        });
      }

      console.log(`✅ Successfully reordered images for catalog item ${id}`);

      return res.json({
        success: true,
        data: {
          id: item.id,
          images: item.images,
          updatedAt: item.updated_at
        },
        message: 'Image order updated successfully'
      });

    } catch (error: any) {
      console.error('❌ Image reorder error:', error);
      
      if (error.name === 'ZodError') {
        return res.status(400).json({
          success: false,
          message: 'Invalid request data',
          errors: error.errors
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

// PATCH /api/orders/:id/reorder-images - Reorder order production images
router.patch('/orders/:id/reorder-images',
  requireAuth,
  requireRole(['admin', 'manufacturer', 'designer']),
  async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = reorderSchema.parse(req.body);

      console.log(`🎯 Reordering production images for order ${id}`);
      console.log(`📊 Updating ${validatedData.images.length} images`);

      // Update the order's production_images field with new order
      const { data: order, error } = await supabase
        .from('orders')
        .update({
          production_images: validatedData.images,
          updated_at: 'NOW()'
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('❌ Failed to update order production images:', error);
        return res.status(500).json({
          success: false,
          message: 'Failed to update image order'
        });
      }

      console.log(`✅ Successfully reordered production images for order ${id}`);

      return res.json({
        success: true,
        data: {
          id: order.id,
          productionImages: order.production_images,
          updatedAt: order.updated_at
        },
        message: 'Production image order updated successfully'
      });

    } catch (error: any) {
      console.error('❌ Production image reorder error:', error);
      
      if (error.name === 'ZodError') {
        return res.status(400).json({
          success: false,
          message: 'Invalid request data',
          errors: error.errors
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

// PATCH /api/design-tasks/:id/reorder-images - Reorder design task images
router.patch('/design-tasks/:id/reorder-images',
  requireAuth,
  requireRole(['admin', 'designer']),
  async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = reorderSchema.parse(req.body);

      console.log(`🎯 Reordering design images for task ${id}`);
      console.log(`📊 Updating ${validatedData.images.length} images`);

      // Update the design task's design_files field with new order
      const { data: task, error } = await supabase
        .from('design_tasks')
        .update({
          design_files: validatedData.images,
          updated_at: 'NOW()'
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('❌ Failed to update design task images:', error);
        return res.status(500).json({
          success: false,
          message: 'Failed to update image order'
        });
      }

      console.log(`✅ Successfully reordered design images for task ${id}`);

      return res.json({
        success: true,
        data: {
          id: task.id,
          designFiles: task.design_files,
          updatedAt: task.updated_at
        },
        message: 'Design image order updated successfully'
      });

    } catch (error: any) {
      console.error('❌ Design image reorder error:', error);
      
      if (error.name === 'ZodError') {
        return res.status(400).json({
          success: false,
          message: 'Invalid request data',
          errors: error.errors
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

// GET /api/image-reorder/health - Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Image reorder API is operational',
    features: [
      'Catalog item image reordering',
      'Order production image reordering', 
      'Design task image reordering',
      'JSONB field updates',
      'Drag-and-drop support'
    ]
  });
});

// DELETE /api/catalog/:id/images/:imageId - Delete catalog item image from storage and metadata
router.delete('/catalog/:id/images/:imageId',
  requireAuth,
  requireRole(['admin', 'salesperson']),
  async (req, res) => {
    try {
      const { id: catalogId, imageId } = req.params;

      console.log(`🗑️ Deleting image ${imageId} from catalog item ${catalogId}`);

      // Get current catalog item to find image details
      const { data: catalogItem, error: fetchError } = await supabase
        .from('catalog_items')
        .select('images')
        .eq('id', catalogId)
        .single();

      if (fetchError || !catalogItem) {
        console.error('❌ Failed to fetch catalog item:', fetchError);
        return res.status(404).json({
          success: false,
          message: 'Catalog item not found'
        });
      }

      const currentImages = catalogItem.images || [];
      const imageToDelete = currentImages.find((img: any) => img.id === imageId);

      if (!imageToDelete) {
        return res.status(404).json({
          success: false,
          message: 'Image not found in catalog item'
        });
      }

      // Extract file path from URL for Supabase Storage deletion
      let storagePath = '';
      if (imageToDelete.url) {
        const urlParts = imageToDelete.url.split('/storage/v1/object/public/');
        if (urlParts.length > 1) {
          storagePath = urlParts[1].split('?')[0]; // Remove query params
        }
      }

      // Delete from Supabase Storage if path exists
      if (storagePath) {
        console.log(`🗄️ Deleting from storage: ${storagePath}`);
        const { error: storageError } = await supabase.storage
          .from('uploads')
          .remove([storagePath]);

        if (storageError) {
          console.warn('⚠️ Storage deletion warning:', storageError.message);
          // Continue with metadata removal even if storage deletion fails
        } else {
          console.log(`✅ Successfully deleted from storage: ${storagePath}`);
        }
      }

      // Remove image from metadata
      const updatedImages = currentImages.filter((img: any) => img.id !== imageId);

      // Update catalog item without the deleted image
      const { data: updatedItem, error: updateError } = await supabase
        .from('catalog_items')
        .update({
          images: updatedImages,
          updated_at: 'NOW()'
        })
        .eq('id', catalogId)
        .select()
        .single();

      if (updateError) {
        console.error('❌ Failed to update catalog item metadata:', updateError);
        return res.status(500).json({
          success: false,
          message: 'Failed to update catalog item after image deletion'
        });
      }

      console.log(`✅ Successfully deleted image ${imageId} from catalog item ${catalogId}`);

      return res.json({
        success: true,
        data: {
          id: updatedItem.id,
          deletedImageId: imageId,
          remainingImages: updatedImages,
          images: updatedItem.images
        },
        message: 'Image deleted successfully from both storage and metadata'
      });

    } catch (error: any) {
      console.error('❌ Image deletion error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error during image deletion'
      });
    }
  }
);

// DELETE /api/orders/:id/images/:imageId - Delete order production image from storage and metadata
router.delete('/orders/:id/images/:imageId',
  requireAuth,
  requireRole(['admin', 'manufacturer', 'designer']),
  async (req, res) => {
    try {
      const { id: orderId, imageId } = req.params;

      console.log(`🗑️ Deleting production image ${imageId} from order ${orderId}`);

      // Get current order to find image details
      const { data: order, error: fetchError } = await supabase
        .from('orders')
        .select('production_images')
        .eq('id', orderId)
        .single();

      if (fetchError || !order) {
        console.error('❌ Failed to fetch order:', fetchError);
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      const currentImages = order.production_images || [];
      const imageToDelete = currentImages.find((img: any) => img.id === imageId);

      if (!imageToDelete) {
        return res.status(404).json({
          success: false,
          message: 'Production image not found in order'
        });
      }

      // Extract file path from URL for Supabase Storage deletion
      let storagePath = '';
      if (imageToDelete.url) {
        const urlParts = imageToDelete.url.split('/storage/v1/object/public/');
        if (urlParts.length > 1) {
          storagePath = urlParts[1].split('?')[0]; // Remove query params
        }
      }

      // Delete from Supabase Storage if path exists
      if (storagePath) {
        console.log(`🗄️ Deleting from storage: ${storagePath}`);
        const { error: storageError } = await supabase.storage
          .from('uploads')
          .remove([storagePath]);

        if (storageError) {
          console.warn('⚠️ Storage deletion warning:', storageError.message);
          // Continue with metadata removal even if storage deletion fails
        } else {
          console.log(`✅ Successfully deleted from storage: ${storagePath}`);
        }
      }

      // Remove image from metadata
      const updatedImages = currentImages.filter((img: any) => img.id !== imageId);

      // Update order without the deleted image
      const { data: updatedOrder, error: updateError } = await supabase
        .from('orders')
        .update({
          production_images: updatedImages,
          updated_at: 'NOW()'
        })
        .eq('id', orderId)
        .select()
        .single();

      if (updateError) {
        console.error('❌ Failed to update order metadata:', updateError);
        return res.status(500).json({
          success: false,
          message: 'Failed to update order after image deletion'
        });
      }

      console.log(`✅ Successfully deleted production image ${imageId} from order ${orderId}`);

      return res.json({
        success: true,
        data: {
          id: updatedOrder.id,
          deletedImageId: imageId,
          remainingImages: updatedImages,
          productionImages: updatedOrder.production_images
        },
        message: 'Production image deleted successfully from both storage and metadata'
      });

    } catch (error: any) {
      console.error('❌ Production image deletion error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error during image deletion'
      });
    }
  }
);

// DELETE /api/design-tasks/:id/images/:imageId - Delete design task file from storage and metadata
router.delete('/design-tasks/:id/images/:imageId',
  requireAuth,
  requireRole(['admin', 'designer']),
  async (req, res) => {
    try {
      const { id: taskId, imageId } = req.params;

      console.log(`🗑️ Deleting design file ${imageId} from task ${taskId}`);

      // Get current design task to find file details
      const { data: task, error: fetchError } = await supabase
        .from('design_tasks')
        .select('design_files')
        .eq('id', taskId)
        .single();

      if (fetchError || !task) {
        console.error('❌ Failed to fetch design task:', fetchError);
        return res.status(404).json({
          success: false,
          message: 'Design task not found'
        });
      }

      const currentFiles = task.design_files || [];
      const fileToDelete = currentFiles.find((file: any) => file.id === imageId);

      if (!fileToDelete) {
        return res.status(404).json({
          success: false,
          message: 'Design file not found in task'
        });
      }

      // Extract file path from URL for Supabase Storage deletion
      let storagePath = '';
      if (fileToDelete.url) {
        const urlParts = fileToDelete.url.split('/storage/v1/object/public/');
        if (urlParts.length > 1) {
          storagePath = urlParts[1].split('?')[0]; // Remove query params
        }
      }

      // Delete from Supabase Storage if path exists
      if (storagePath) {
        console.log(`🗄️ Deleting from storage: ${storagePath}`);
        const { error: storageError } = await supabase.storage
          .from('uploads')
          .remove([storagePath]);

        if (storageError) {
          console.warn('⚠️ Storage deletion warning:', storageError.message);
          // Continue with metadata removal even if storage deletion fails
        } else {
          console.log(`✅ Successfully deleted from storage: ${storagePath}`);
        }
      }

      // Remove file from metadata
      const updatedFiles = currentFiles.filter((file: any) => file.id !== imageId);

      // Update design task without the deleted file
      const { data: updatedTask, error: updateError } = await supabase
        .from('design_tasks')
        .update({
          design_files: updatedFiles,
          updated_at: 'NOW()'
        })
        .eq('id', taskId)
        .select()
        .single();

      if (updateError) {
        console.error('❌ Failed to update design task metadata:', updateError);
        return res.status(500).json({
          success: false,
          message: 'Failed to update design task after file deletion'
        });
      }

      console.log(`✅ Successfully deleted design file ${imageId} from task ${taskId}`);

      return res.json({
        success: true,
        data: {
          id: updatedTask.id,
          deletedImageId: imageId,
          remainingFiles: updatedFiles,
          designFiles: updatedTask.design_files
        },
        message: 'Design file deleted successfully from both storage and metadata'
      });

    } catch (error: any) {
      console.error('❌ Design file deletion error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error during file deletion'
      });
    }
  }
);

export default router;
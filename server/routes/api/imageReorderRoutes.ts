/**
 * IMAGE REORDER API ROUTES
 * Handles drag-and-drop reordering of images in JSONB fields
 */

import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../../middleware/adminAuth';
import { supabase } from '../../db';

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

      // Update the catalog item's imageVariants.gallery field with new order
      const { data: item, error } = await supabase
        .from('catalog_items')
        .update({
          image_variants: {
            gallery: validatedData.images
          },
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
          imageVariants: item.image_variants,
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

export default router;
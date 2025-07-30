import { Router } from 'express';
import multer from 'multer';
import { createClient } from '@supabase/supabase-js';

// Create Supabase admin client with service role key
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import sharp from 'sharp';

const router = Router();

// Configure multer for image uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for production images
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and WebP images are allowed'));
    }
  },
});

// POST /api/orders/:orderId/images/production - Upload work-in-progress images
router.post('/:orderId/images/production', upload.array('images', 10), async (req, res) => {
  try {
    const { orderId } = req.params;
    const { taskType, taskId, caption, stage } = req.body;
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No images provided'
      });
    }

    console.log(`📸 Uploading ${files.length} production images for order ${orderId}`);

    // Verify order exists
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, orderNumber')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const uploadedImages = [];
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      console.log(`🔄 Processing image ${i + 1}/${files.length}: ${file.originalname}`);

      try {
        // Generate unique filename
        const fileExtension = path.extname(file.originalname).toLowerCase();
        const uniqueId = uuidv4().split('-')[0];
        const filename = `${timestamp}_${stage || 'progress'}_${uniqueId}${fileExtension}`;
        const storagePath = `orders/${orderId}/production/${filename}`;

        // Optimize image
        let processedBuffer;
        if (file.size > 2 * 1024 * 1024) { // If larger than 2MB
          processedBuffer = await sharp(file.buffer)
            .resize(1920, 1920, { 
              fit: 'inside',
              withoutEnlargement: true 
            })
            .jpeg({ quality: 85 })
            .toBuffer();
          console.log(`🔧 Image optimized: ${file.size} → ${processedBuffer.length} bytes`);
        } else {
          processedBuffer = file.buffer;
        }

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
          .from('uploads')
          .upload(storagePath, processedBuffer, {
            contentType: file.mimetype,
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error(`❌ Upload failed for ${filename}:`, uploadError);
          continue;
        }

        // Get public URL
        const { data: urlData } = supabaseAdmin.storage
          .from('uploads')
          .getPublicUrl(storagePath);

        const imageRecord = {
          id: uuidv4(),
          url: urlData.publicUrl,
          filename: filename,
          originalName: file.originalname,
          size: processedBuffer.length,
          mimeType: file.mimetype,
          caption: caption || `Production progress - ${stage || 'In Progress'}`,
          stage: stage || 'in_progress',
          taskType: taskType || 'production',
          taskId: taskId || null,
          uploadedAt: new Date().toISOString()
        };

        uploadedImages.push(imageRecord);
        console.log(`✅ Image uploaded successfully: ${filename}`);

      } catch (error) {
        console.error(`❌ Error processing ${file.originalname}:`, error);
        continue;
      }
    }

    if (uploadedImages.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No images were successfully uploaded'
      });
    }

    // Update order record with production images
    const { data: existingOrder, error: fetchError } = await supabaseAdmin
      .from('orders')
      .select('production_images')
      .eq('id', orderId)
      .single();

    if (fetchError) {
      console.error('❌ Error fetching existing order:', fetchError);
      return res.status(500).json({
        success: false,
        message: 'Failed to update order record'
      });
    }

    const existingImages = existingOrder?.production_images || [];
    const updatedImages = [...existingImages, ...uploadedImages];

    // Update order with new production images
    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({
        production_images: updatedImages,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (updateError) {
      console.error('❌ Error updating order record:', updateError);
      return res.status(500).json({
        success: false,
        message: 'Images uploaded but failed to update order record'
      });
    }

    // If taskId provided, also update the specific task
    if (taskId && taskType) {
      const tableName = taskType === 'design' ? 'design_tasks' : 'production_tasks';
      
      const { data: existingTask, error: taskFetchError } = await supabaseAdmin
        .from(tableName)
        .select('progress_images')
        .eq('id', taskId)
        .single();

      if (!taskFetchError && existingTask) {
        const existingTaskImages = existingTask.progress_images || [];
        const updatedTaskImages = [...existingTaskImages, ...uploadedImages];

        await supabaseAdmin
          .from(tableName)
          .update({
            progress_images: updatedTaskImages,
            updated_at: new Date().toISOString()
          })
          .eq('id', taskId);

        console.log(`✅ Updated ${tableName} record with ${uploadedImages.length} images`);
      }
    }

    console.log(`🎯 Successfully uploaded ${uploadedImages.length} production images for order ${order.orderNumber}`);

    res.status(200).json({
      success: true,
      message: `Successfully uploaded ${uploadedImages.length} production images`,
      images: uploadedImages,
      orderNumber: order.orderNumber,
      totalImages: updatedImages.length
    });

  } catch (error) {
    console.error('❌ Production image upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload production images',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/orders/:orderId/images/production - Get production images
router.get('/:orderId/images/production', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { stage, taskType, taskId } = req.query;

    console.log(`📋 Fetching production images for order ${orderId}`);

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('production_images, orderNumber')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    let images = order.production_images || [];

    // Filter images based on query parameters
    if (stage) {
      images = images.filter((img: any) => img.stage === stage);
    }

    if (taskType) {
      images = images.filter((img: any) => img.taskType === taskType);
    }

    if (taskId) {
      images = images.filter((img: any) => img.taskId === taskId);
    }

    // Sort by upload date (newest first)
    images.sort((a: any, b: any) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

    res.status(200).json({
      success: true,
      images,
      orderNumber: order.orderNumber,
      totalImages: images.length,
      filters: {
        stage: stage || 'all',
        taskType: taskType || 'all',
        taskId: taskId || 'all'
      }
    });

  } catch (error) {
    console.error('❌ Error fetching production images:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch production images',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// DELETE /api/orders/:orderId/images/production/:imageId - Delete production image
router.delete('/:orderId/images/production/:imageId', async (req, res) => {
  try {
    const { orderId, imageId } = req.params;

    console.log(`🗑️ Deleting production image ${imageId} from order ${orderId}`);

    // Get current order images
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('production_images')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const images = order.production_images || [];
    const imageToDelete = images.find((img: any) => img.id === imageId);

    if (!imageToDelete) {
      return res.status(404).json({
        success: false,
        message: 'Image not found'
      });
    }

    // Delete from storage
    const storagePath = `orders/${orderId}/production/${imageToDelete.filename}`;
    const { error: deleteError } = await supabaseAdmin.storage
      .from('uploads')
      .remove([storagePath]);

    if (deleteError) {
      console.error('❌ Failed to delete from storage:', deleteError);
    }

    // Remove from order record
    const updatedImages = images.filter((img: any) => img.id !== imageId);
    
    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({
        production_images: updatedImages,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (updateError) {
      return res.status(500).json({
        success: false,
        message: 'Failed to update order record'
      });
    }

    // Also remove from task if it exists
    if (imageToDelete.taskId && imageToDelete.taskType) {
      const tableName = imageToDelete.taskType === 'design' ? 'design_tasks' : 'production_tasks';
      
      const { data: task, error: taskError } = await supabaseAdmin
        .from(tableName)
        .select('progress_images')
        .eq('id', imageToDelete.taskId)
        .single();

      if (!taskError && task) {
        const updatedTaskImages = (task.progress_images || []).filter((img: any) => img.id !== imageId);
        
        await supabaseAdmin
          .from(tableName)
          .update({
            progress_images: updatedTaskImages,
            updated_at: new Date().toISOString()
          })
          .eq('id', imageToDelete.taskId);
      }
    }

    console.log(`✅ Successfully deleted production image ${imageId}`);

    res.status(200).json({
      success: true,
      message: 'Production image deleted successfully',
      deletedImage: imageToDelete,
      remainingImages: updatedImages.length
    });

  } catch (error) {
    console.error('❌ Error deleting production image:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete production image',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
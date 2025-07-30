import { Request, Response } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { supabaseAdmin } from '../../db';
import { authenticateRequest } from '../auth/auth';

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow images and documents
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',  
      'image/webp',
      'image/svg+xml',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images (JPEG, PNG, WebP, SVG) and documents (PDF, DOC, DOCX, TXT) are allowed.'));
    }
  }
});

/**
 * POST /api/manufacturing/manufacturers/:id/media
 * Upload manufacturer branding documents and logos
 */
export async function uploadManufacturerMedia(req: Request, res: Response) {
  try {
    const { id: manufacturerId } = req.params;
    const { type, description } = req.body; // type: 'logo', 'branding', 'document', 'certificate'
    
    console.log(`📤 Uploading media for manufacturer ${manufacturerId}, type: ${type}`);
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file provided'
      });
    }

    // Validate manufacturer ID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(manufacturerId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid manufacturer ID format'
      });
    }

    const file = req.file;
    let processedBuffer = file.buffer;
    const timestamp = Date.now();
    const fileExtension = file.originalname.split('.').pop()?.toLowerCase() || 'bin';
    
    // Process images with Sharp for optimization
    if (file.mimetype.startsWith('image/') && file.mimetype !== 'image/svg+xml') {
      try {
        // Optimize images: resize if too large, compress
        const image = sharp(file.buffer);
        const metadata = await image.metadata();
        
        let resizeOptions: any = {};
        if (type === 'logo') {
          // Logos should be reasonable size - max 800x800
          resizeOptions = {
            width: 800,
            height: 800,
            fit: 'inside',
            withoutEnlargement: true
          };
        } else if (metadata.width && metadata.width > 1920) {
          // Other images - max 1920 width
          resizeOptions = {
            width: 1920,
            withoutEnlargement: true
          };
        }
        
        let sharpChain = image;
        if (Object.keys(resizeOptions).length > 0) {
          sharpChain = sharpChain.resize(resizeOptions);
        }
        
        // Apply compression based on format
        if (file.mimetype === 'image/jpeg') {
          processedBuffer = await sharpChain.jpeg({ quality: 85 }).toBuffer();
        } else if (file.mimetype === 'image/png') {
          processedBuffer = await sharpChain.png({ compressionLevel: 6 }).toBuffer();
        } else if (file.mimetype === 'image/webp') {
          processedBuffer = await sharpChain.webp({ quality: 85 }).toBuffer();
        }
        
        console.log(`📷 Image optimized: ${file.size} → ${processedBuffer.length} bytes`);
      } catch (imageError) {
        console.warn('⚠️ Image processing failed, using original:', imageError);
        processedBuffer = file.buffer;
      }
    }

    // Generate storage path
    const fileName = `${type}_${timestamp}.${fileExtension}`;
    const storagePath = `manufacturers/${manufacturerId}/media/${fileName}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('uploads')
      .upload(storagePath, processedBuffer, {
        contentType: file.mimetype,
        upsert: true,
        cacheControl: '3600'
      });

    if (uploadError) {
      console.error('❌ Supabase upload error:', uploadError);
      return res.status(500).json({
        success: false,
        message: 'Failed to upload file to storage',
        error: uploadError.message
      });
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from('uploads')
      .getPublicUrl(storagePath);

    const mediaUrl = urlData.publicUrl;

    // Store media metadata in manufacturer's user_metadata
    try {
      // Get current user metadata
      const { data: currentUser, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(manufacturerId);
      
      if (getUserError) {
        console.error('❌ Error fetching user:', getUserError);
        return res.status(404).json({
          success: false,
          message: 'Manufacturer not found'
        });
      }

      const currentMetadata = currentUser.user?.user_metadata || {};
      const currentMedia = currentMetadata.media || [];

      // Add new media entry
      const newMediaEntry = {
        id: uploadData.id || `media_${timestamp}`,
        type,
        fileName: file.originalname,
        storagePath,
        url: mediaUrl,
        fileSize: processedBuffer.length,
        mimeType: file.mimetype,
        description: description || '',
        uploadedAt: new Date().toISOString()
      };

      const updatedMedia = [...currentMedia, newMediaEntry];

      // Update user metadata
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(manufacturerId, {
        user_metadata: {
          ...currentMetadata,
          media: updatedMedia
        }
      });

      if (updateError) {
        console.error('❌ Error updating user metadata:', updateError);
        return res.status(500).json({
          success: false,
          message: 'Failed to update manufacturer metadata'
        });
      }

      console.log('✅ Media uploaded successfully:', storagePath);

      res.json({
        success: true,
        message: 'Media uploaded successfully',
        data: {
          mediaId: newMediaEntry.id,
          url: mediaUrl,
          storagePath,
          type,
          fileName: file.originalname,
          fileSize: processedBuffer.length,
          uploadedAt: newMediaEntry.uploadedAt
        }
      });

    } catch (metadataError) {
      console.error('❌ Error handling metadata:', metadataError);
      return res.status(500).json({
        success: false,
        message: 'File uploaded but failed to update metadata'
      });
    }

  } catch (error: any) {
    console.error('❌ Upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}

/**
 * GET /api/manufacturing/manufacturers/:id/media
 * Get all media files for a manufacturer
 */
export async function getManufacturerMedia(req: Request, res: Response) {
  try {
    const { id: manufacturerId } = req.params;
    
    console.log(`📋 Fetching media for manufacturer ${manufacturerId}`);

    // Get user metadata
    const { data: userData, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(manufacturerId);
    
    if (getUserError) {
      return res.status(404).json({
        success: false,
        message: 'Manufacturer not found'
      });
    }

    const media = userData.user?.user_metadata?.media || [];

    res.json({
      success: true,
      data: media.map((item: any) => ({
        id: item.id,
        type: item.type,
        fileName: item.fileName,
        url: item.url,
        fileSize: item.fileSize,
        mimeType: item.mimeType,
        description: item.description,
        uploadedAt: item.uploadedAt
      }))
    });

  } catch (error: any) {
    console.error('❌ Get media error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}

/**
 * DELETE /api/manufacturing/manufacturers/:id/media/:mediaId
 * Delete a specific media file
 */
export async function deleteManufacturerMedia(req: Request, res: Response) {
  try {
    const { id: manufacturerId, mediaId } = req.params;
    
    console.log(`🗑️ Deleting media ${mediaId} for manufacturer ${manufacturerId}`);

    // Get current user metadata
    const { data: currentUser, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(manufacturerId);
    
    if (getUserError) {
      return res.status(404).json({
        success: false,
        message: 'Manufacturer not found'
      });
    }

    const currentMetadata = currentUser.user?.user_metadata || {};
    const currentMedia = currentMetadata.media || [];

    // Find media item to delete
    const mediaToDelete = currentMedia.find((item: any) => item.id === mediaId);
    if (!mediaToDelete) {
      return res.status(404).json({
        success: false,
        message: 'Media file not found'
      });
    }

    // Delete from Supabase Storage
    const { error: deleteError } = await supabaseAdmin.storage
      .from('uploads')
      .remove([mediaToDelete.storagePath]);

    if (deleteError) {
      console.warn('⚠️ Storage deletion warning:', deleteError);
    }

    // Remove from metadata
    const updatedMedia = currentMedia.filter((item: any) => item.id !== mediaId);

    // Update user metadata
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(manufacturerId, {
      user_metadata: {
        ...currentMetadata,
        media: updatedMedia
      }
    });

    if (updateError) {
      return res.status(500).json({
        success: false,
        message: 'Failed to update manufacturer metadata'
      });
    }

    console.log('✅ Media deleted successfully:', mediaId);

    res.json({
      success: true,
      message: 'Media deleted successfully'
    });

  } catch (error: any) {
    console.error('❌ Delete media error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}

// Export upload middleware
export const uploadMiddleware = upload.single('file');
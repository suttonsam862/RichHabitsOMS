/**
 * UPLOAD TEST API ROUTES
 * Mock API endpoints for testing upload progress functionality
 */

import { Router } from 'express';
import { requireAuth } from '../../middleware/security.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';

const router = Router();

// Configure multer for test uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'test-uploads');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error as Error, uploadDir);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext);
    cb(null, `${baseName}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB
  },
  fileFilter: (req, file, cb) => {
    // Allow all file types for testing
    cb(null, true);
  }
});

/**
 * POST /api/upload-test/files
 * Test endpoint for file uploads with simulated processing time
 */
router.post('/files', requireAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file provided'
      });
    }

    const { pathPrefix = '' } = req.body;

    // Simulate processing time based on file size
    const fileSize = req.file.size;
    const processingTime = Math.min(Math.max(100, fileSize / 100000), 2000); // 100ms to 2s
    
    await new Promise(resolve => setTimeout(resolve, processingTime));

    const fileInfo = {
      id: `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      url: `/uploads/test-uploads/${req.file.filename}`,
      filename: req.file.originalname,
      path: `${pathPrefix}/${req.file.filename}`,
      size: req.file.size,
      mimetype: req.file.mimetype,
      uploadedAt: new Date().toISOString()
    };

    console.log(`📁 Test upload completed: ${req.file.originalname} (${fileSize} bytes)`);

    res.status(200).json({
      success: true,
      data: fileInfo
    });

  } catch (error: any) {
    console.error('Upload test error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Upload failed'
    });
  }
});

/**
 * GET /api/upload-test/files
 * List test uploaded files
 */
router.get('/files', requireAuth, async (req, res) => {
  try {
    const uploadDir = path.join(process.cwd(), 'uploads', 'test-uploads');
    
    try {
      const files = await fs.readdir(uploadDir);
      const fileInfos = await Promise.all(
        files.map(async (filename) => {
          const filePath = path.join(uploadDir, filename);
          const stats = await fs.stat(filePath);
          
          return {
            id: filename,
            filename,
            size: stats.size,
            uploadedAt: stats.birthtime.toISOString(),
            url: `/uploads/test-uploads/${filename}`
          };
        })
      );

      res.status(200).json({
        success: true,
        data: {
          files: fileInfos,
          count: fileInfos.length
        }
      });

    } catch (error) {
      // Directory doesn't exist yet
      res.status(200).json({
        success: true,
        data: {
          files: [],
          count: 0
        }
      });
    }

  } catch (error: any) {
    console.error('List files error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to list files'
    });
  }
});

/**
 * DELETE /api/upload-test/files/:filename
 * Delete a test uploaded file
 */
router.delete('/files/:filename', requireAuth, async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(process.cwd(), 'uploads', 'test-uploads', filename);
    
    await fs.unlink(filePath);
    
    console.log(`🗑️ Test file deleted: ${filename}`);

    res.status(200).json({
      success: true,
      message: 'File deleted successfully'
    });

  } catch (error: any) {
    console.error('Delete file error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete file'
    });
  }
});

/**
 * POST /api/upload-test/clear
 * Clear all test uploaded files
 */
router.post('/clear', requireAuth, async (req, res) => {
  try {
    const uploadDir = path.join(process.cwd(), 'uploads', 'test-uploads');
    
    try {
      const files = await fs.readdir(uploadDir);
      await Promise.all(
        files.map(filename => 
          fs.unlink(path.join(uploadDir, filename))
        )
      );

      console.log(`🗑️ Cleared ${files.length} test files`);

      res.status(200).json({
        success: true,
        message: `Cleared ${files.length} test files`
      });

    } catch (error) {
      // Directory doesn't exist, nothing to clear
      res.status(200).json({
        success: true,
        message: 'No files to clear'
      });
    }

  } catch (error: any) {
    console.error('Clear files error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to clear files'
    });
  }
});

export default router;
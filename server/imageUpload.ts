import multer from 'multer';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// Memory storage for processing
const storage = multer.memoryStorage();

// Image processing utility
export const processImage = async (
  buffer: Buffer, 
  filename: string, 
  options: { width?: number; height?: number; quality?: number } = {}
): Promise<{ buffer: Buffer; filename: string }> => {
  const { width = 800, height = 800, quality = 80 } = options;

  const processedBuffer = await sharp(buffer)
    .resize(width, height, { 
      fit: 'inside', 
      withoutEnlargement: true 
    })
    .jpeg({ quality })
    .toBuffer();

  const processedFilename = filename.replace(/\.[^/.]+$/, '.jpg');

  return { buffer: processedBuffer, filename: processedFilename };
};

// Optimized file size limits and validation
export const fileFilter = (req: any, file: any, cb: any) => {
  const allowedTypes = /jpeg|jpg|png|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files (JPEG, PNG, WebP) are allowed'));
  }
};

// Scalable storage with automatic cleanup
const createUploadPath = (type: string): string => {
  const uploadPath = path.join(process.cwd(), 'uploads', type);
  if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
  }
  return uploadPath;
};

// Create upload directories if they don't exist
const uploadDirs = {
  catalog: 'uploads/catalog',
  orderItems: 'uploads/order-items',
  temp: 'uploads/temp'
};

Object.values(uploadDirs).forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Generate unique filename
const generateFileName = (originalname: string): string => {
  const ext = path.extname(originalname);
  const timestamp = Date.now();
  const random = crypto.randomBytes(6).toString('hex');
  return `${timestamp}-${random}${ext}`;
};

// Catalog image upload configuration
const catalogStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDirs.catalog);
  },
  filename: (req, file, cb) => {
    cb(null, generateFileName(file.originalname));
  }
});

// Order item custom image upload configuration
const orderItemStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDirs.orderItems);
  },
  filename: (req, file, cb) => {
    cb(null, generateFileName(file.originalname));
  }
});

// Create multer instances
export const catalogImageUpload = multer({
  storage: catalogStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1
  }
});

export const orderItemImageUpload = multer({
  storage: orderItemStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1
  }
});

// Image upload handler for catalog items
export const handleCatalogImageUpload = (req: Request, res: Response, next: NextFunction) => {
  catalogImageUpload.single('image')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'File too large. Maximum size is 5MB.'
        });
      }
      return res.status(400).json({
        success: false,
        message: `Upload error: ${err.message}`
      });
    } else if (err) {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }
    next();
  });
};

// Image upload handler for order items
export const handleOrderItemImageUpload = (req: Request, res: Response, next: NextFunction) => {
  orderItemImageUpload.single('image')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'File too large. Maximum size is 5MB.'
        });
      }
      return res.status(400).json({
        success: false,
        message: `Upload error: ${err.message}`
      });
    } else if (err) {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }
    next();
  });
};

// Helper function to get image URL
export const getImageUrl = (filename: string, type: 'catalog' | 'order-item'): string => {
  const baseUrl = process.env.APP_URL || 'http://localhost:5000';
  return `${baseUrl}/uploads/${type === 'catalog' ? 'catalog' : 'order-items'}/${filename}`;
};

// Helper function to delete image file
export const deleteImageFile = (filename: string, type: 'catalog' | 'order-item'): boolean => {
  try {
    const filePath = path.join(
      type === 'catalog' ? uploadDirs.catalog : uploadDirs.orderItems,
      filename
    );
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting image file:', error);
    return false;
  }
};

// Extract filename from URL
export const extractFilenameFromUrl = (imageUrl: string): string | null => {
  try {
    const url = new URL(imageUrl);
    return path.basename(url.pathname);
  } catch {
    return null;
  }
};
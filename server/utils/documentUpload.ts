
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs/promises';

// Configure multer for document uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'customer-documents');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error as Error, '');
    }
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(6).toString('hex');
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req: any, file: any, cb: any) => {
  // Accept only specific file types
  const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/jpg'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, JPG, and PNG files are allowed.'), false);
  }
};

export const documentUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

export const processDocumentUpload = async (file: Express.Multer.File, customerId: string, documentType: string) => {
  try {
    // Move file to customer-specific directory
    const customerDir = path.join(process.cwd(), 'uploads', 'customer-documents', customerId);
    await fs.mkdir(customerDir, { recursive: true });
    
    const finalPath = path.join(customerDir, file.filename);
    await fs.rename(file.path, finalPath);
    
    return {
      filePath: finalPath,
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
    };
  } catch (error) {
    console.error('Error processing document upload:', error);
    throw error;
  }
};

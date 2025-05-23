import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { supabase } from './db.js';

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'logos');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const customerId = req.body.customerId || 'unknown';
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `${customerId}-${timestamp}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/webp', 'image/png', 'image/jpeg', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only WebP, PNG, and JPG images are allowed'));
    }
  }
});

// Upload customer logo endpoint
router.post('/logo', upload.single('logo'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const customerId = req.body.customerId;
    if (!customerId) {
      return res.status(400).json({ error: 'Customer ID is required' });
    }

    // Generate the URL path for the uploaded file
    const logoUrl = `/uploads/logos/${req.file.filename}`;

    // Update customer record with logo URL
    const { error: updateError } = await supabase
      .from('customers')
      .update({ 
        logo_url: logoUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', customerId);

    if (updateError) {
      console.error('Error updating customer logo:', updateError);
      return res.status(500).json({ error: 'Failed to save logo reference' });
    }

    // Get customer info for response
    const { data: customer, error: fetchError } = await supabase
      .from('customers')
      .select('first_name, last_name, company')
      .eq('id', customerId)
      .single();

    const companyName = customer?.company || 
                       `${customer?.first_name || ''} ${customer?.last_name || ''}`.trim() ||
                       'Custom Company';

    res.json({
      success: true,
      logoUrl,
      companyName,
      filename: req.file.filename,
      message: 'Logo uploaded successfully'
    });

  } catch (error) {
    console.error('Logo upload error:', error);
    res.status(500).json({ error: 'Failed to upload logo' });
  }
});

// Serve uploaded logo files
router.get('/logos/:filename', (req: Request, res: Response) => {
  const filename = req.params.filename;
  const filePath = path.join(process.cwd(), 'uploads', 'logos', filename);
  
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: 'Logo not found' });
  }
});

export { router as uploadRouter };
import { Request, Response, Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from '../auth/auth';

const router = Router();

// Create Supabase admin client
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Only allow image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

/**
 * Upload organization file (logo, graphics, etc.)
 */
router.post('/upload', requireAuth, upload.single('file'), async (req: Request, res: Response) => {
  try {
    console.log('🔄 Organization file upload request received');
    console.log('Request body:', req.body);
    console.log('File info:', req.file ? {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    } : 'No file');

    const { organizationId, customerId, fileType = 'logo', isPrimary = 'false', description } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    if (!organizationId && !customerId) {
      return res.status(400).json({
        success: false,
        message: 'Organization ID or Customer ID is required'
      });
    }

    // Use organizationId or look up organization by customerId
    let targetCustomerId = customerId;
    if (organizationId && !customerId) {
      // Find a customer for this organization
      const { data: orgCustomers, error: customerError } = await supabaseAdmin
        .from('customers')
        .select('id')
        .ilike('company', `%${organizationId.replace(/-/g, ' ')}%`)
        .limit(1);

      if (customerError || !orgCustomers?.length) {
        console.error('Error finding customer for organization:', customerError);
        return res.status(404).json({
          success: false,
          message: 'Organization not found'
        });
      }
      targetCustomerId = orgCustomers[0].id;
    }

    // Generate unique filename
    const fileExtension = path.extname(file.originalname);
    const filename = `${fileType}_${uuidv4()}${fileExtension}`;
    const bucketPath = `organizations/${targetCustomerId}/${filename}`;

    // Optimize image if it's a logo
    let processedBuffer = file.buffer;
    if (fileType === 'logo') {
      try {
        processedBuffer = await sharp(file.buffer)
          .resize(500, 500, { 
            fit: 'inside',
            withoutEnlargement: true 
          })
          .jpeg({ quality: 90 })
          .toBuffer();
        console.log('✅ Logo optimized successfully');
      } catch (optimizeError) {
        console.warn('Logo optimization failed, using original:', optimizeError);
        processedBuffer = file.buffer;
      }
    }

    // Upload to Supabase Storage
    console.log('🔄 Uploading to Supabase Storage:', bucketPath);
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('uploads')
      .upload(bucketPath, processedBuffer, {
        contentType: file.mimetype,
        upsert: false
      });

    if (uploadError) {
      console.error('❌ Supabase storage upload error:', uploadError);
      return res.status(500).json({
        success: false,
        message: `Storage upload failed: ${uploadError.message}`
      });
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from('uploads')
      .getPublicUrl(bucketPath);

    if (!urlData?.publicUrl) {
      console.error('❌ Failed to get public URL');
      return res.status(500).json({
        success: false,
        message: 'Failed to get file URL'
      });
    }

    // Create table if it doesn't exist first
    console.log('🔄 Ensuring organization_files table exists...');
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS organization_files (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
        file_name VARCHAR(255) NOT NULL,
        file_type VARCHAR(50) NOT NULL,
        file_url TEXT NOT NULL,
        file_size INTEGER,
        mime_type VARCHAR(100),
        google_drive_link TEXT,
        google_drive_folder_id VARCHAR(255),
        upload_status VARCHAR(50) DEFAULT 'uploaded',
        is_primary BOOLEAN DEFAULT false,
        description TEXT,
        uploaded_by UUID REFERENCES auth.users(id),
        approved_by UUID REFERENCES auth.users(id),
        approval_date TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      ALTER TABLE organization_files ENABLE ROW LEVEL SECURITY;
      
      DROP POLICY IF EXISTS "Admins can manage all organization files" ON organization_files;
      CREATE POLICY "Admins can manage all organization files" ON organization_files
        FOR ALL USING (
          EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
          )
        );
    `;

    try {
      await supabaseAdmin.rpc('exec_sql', { sql_query: createTableSQL });
      console.log('✅ Organization_files table ensured');
    } catch (tableError) {
      console.warn('⚠️ Could not ensure table exists, proceeding anyway:', tableError);
    }

    // Save file record to database
    console.log('🔄 Saving file record to database');
    const { data: fileRecord, error: dbError } = await supabaseAdmin
      .from('organization_files')
      .insert({
        customer_id: targetCustomerId,
        file_name: file.originalname,
        file_type: fileType,
        file_url: urlData.publicUrl,
        file_size: processedBuffer.length,
        mime_type: file.mimetype,
        upload_status: 'uploaded',
        is_primary: isPrimary === 'true',
        description: description || null,
        uploaded_by: req.user?.id || null
      })
      .select()
      .single();

    if (dbError) {
      console.error('❌ Database insert error:', dbError);
      // Try to clean up uploaded file
      await supabaseAdmin.storage
        .from('uploads')
        .remove([bucketPath])
        .catch(cleanupError => console.warn('Cleanup failed:', cleanupError));

      return res.status(500).json({
        success: false,
        message: `Database error: ${dbError.message}`
      });
    }

    console.log('✅ Organization file uploaded successfully:', fileRecord.id);

    res.json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        id: fileRecord.id,
        fileName: fileRecord.file_name,
        fileType: fileRecord.file_type,
        fileUrl: fileRecord.file_url,
        fileSize: fileRecord.file_size,
        mimeType: fileRecord.mime_type,
        isPrimary: fileRecord.is_primary,
        uploadedAt: fileRecord.created_at
      }
    });

  } catch (error) {
    console.error('❌ Organization file upload error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'File upload failed'
    });
  }
});

/**
 * Get organization files
 */
router.get('/:customerId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const { fileType } = req.query;

    console.log(`🔄 Fetching organization files for customer: ${customerId}`);

    let query = supabaseAdmin
      .from('organization_files')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (fileType) {
      query = query.eq('file_type', fileType);
    }

    const { data: files, error } = await query;

    if (error) {
      console.error('❌ Error fetching organization files:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch organization files'
      });
    }

    res.json({
      success: true,
      data: files || [],
      count: files?.length || 0
    });

  } catch (error) {
    console.error('❌ Error in get organization files:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch organization files'
    });
  }
});

/**
 * Delete organization file
 */
router.delete('/:fileId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { fileId } = req.params;

    console.log(`🔄 Deleting organization file: ${fileId}`);

    // Get file info first
    const { data: fileInfo, error: fetchError } = await supabaseAdmin
      .from('organization_files')
      .select('*')
      .eq('id', fileId)
      .single();

    if (fetchError || !fileInfo) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Extract bucket path from URL
    const urlParts = fileInfo.file_url.split('/');
    const bucketPath = urlParts.slice(-3).join('/'); // organizations/customerId/filename

    // Delete from storage
    const { error: storageError } = await supabaseAdmin.storage
      .from('uploads')
      .remove([bucketPath]);

    if (storageError) {
      console.warn('❌ Storage deletion warning:', storageError);
    }

    // Delete from database
    const { error: dbError } = await supabaseAdmin
      .from('organization_files')
      .delete()
      .eq('id', fileId);

    if (dbError) {
      console.error('❌ Database deletion error:', dbError);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete file record'
      });
    }

    console.log('✅ Organization file deleted successfully');

    res.json({
      success: true,
      message: 'File deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error deleting organization file:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete file'
    });
  }
});

export default router;
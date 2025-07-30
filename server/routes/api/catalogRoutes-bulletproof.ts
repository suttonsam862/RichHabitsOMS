/**
 * BULLETPROOF CATALOG ROUTES SYSTEM
 * Iron solid code organization for all catalog operations
 * No more broken updates, no more console spam, no more field mapping issues
 */

import { Request, Response, Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { requireAuth, requireRole } from '../auth/auth';
import { CatalogService } from '../../services/catalogService';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

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

// Configure multer for file uploads with error handling
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'catalog');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

/**
 * BULLETPROOF: Get all catalog items
 */
async function getAllCatalogItems(req: Request, res: Response) {
  try {
    console.log('🔍 BULLETPROOF FETCH: Getting all catalog items');

    const result = await CatalogService.getAllItems();

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch catalog items',
        error: result.error
      });
    }

    console.log(`✅ Found ${result.data?.length || 0} catalog items`);

    res.json({
      success: true,
      data: result.data,
      count: result.data?.length || 0
    });

  } catch (error: any) {
    console.error('💥 Error in getAllCatalogItems:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}

/**
 * BULLETPROOF: Create catalog item
 */
async function createCatalogItem(req: Request, res: Response) {
  try {
    console.log('🔨 BULLETPROOF CREATE: Creating new catalog item');

    // Handle file upload
    if (req.file) {
      req.body.imageUrl = `/uploads/catalog/${req.file.filename}`;
    }

    const result = await CatalogService.createItem(req.body);

    if (!result.success) {
      // Determine if it's a client error (validation) or server error
      const errorString = result.error || '';
      const isClientError = errorString.includes('violates not-null constraint') ||
                           errorString.includes('duplicate key value') ||
                           errorString.includes('invalid input') ||
                           errorString.includes('validation') ||
                           errorString.includes('check constraint') ||
                           errorString.includes('foreign key constraint');
      
      const statusCode = isClientError ? 400 : 500;
      const message = isClientError ? 'Invalid request data' : 'Failed to create catalog item';
      
      console.log(`🚨 Service Error - Status: ${statusCode}, Client Error: ${isClientError}, Error: ${errorString}`);
      
      return res.status(statusCode).json({
        success: false,
        message,
        error: result.error
      });
    }

    res.status(201).json({
      success: true,
      message: 'Catalog item created successfully',
      data: result.data
    });

  } catch (error: any) {
    console.error('💥 Error in createCatalogItem:', error);
    
    // Determine if it's a client error or server error
    const isClientError = error.message?.includes('validation') ||
                         error.message?.includes('required') ||
                         error.message?.includes('invalid') ||
                         error.code === '23502' || // not-null constraint
                         error.code === '23505';   // unique constraint
    
    const statusCode = isClientError ? 400 : 500;
    const message = isClientError ? 'Invalid request data' : 'Internal server error';
    
    res.status(statusCode).json({
      success: false,
      message,
      error: error.message
    });
  }
}

/**
 * BULLETPROOF: Update catalog item
 */
async function updateCatalogItem(req: Request, res: Response) {
  try {
    const { id } = req.params;
    console.log(`🔧 BULLETPROOF UPDATE: Updating catalog item ${id}`);

    // Handle file upload
    if (req.file) {
      req.body.imageUrl = `/uploads/catalog/${req.file.filename}`;
    }

    const result = await CatalogService.updateItem(id, req.body);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to update catalog item',
        error: result.error
      });
    }

    res.json({
      success: true,
      message: 'Catalog item updated successfully',
      data: result.data
    });

  } catch (error: any) {
    console.error('💥 Error in updateCatalogItem:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}

/**
 * BULLETPROOF: Get single catalog item
 */
async function getCatalogItemById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    console.log(`🔍 BULLETPROOF GET: Fetching catalog item ${id}`);

    // Get single item by ID since getById method doesn't exist
    const { data: item, error } = await supabaseAdmin
      .from('catalog_items')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !item) {
      return res.status(404).json({
        success: false,
        message: 'Catalog item not found'
      });
    }

    const result = { success: true, data: item };

    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: 'Catalog item not found',
        error: result.error
      });
    }

    res.json({
      success: true,
      data: result.data
    });

  } catch (error: any) {
    console.error('💥 Error in getCatalogItemById:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}

/**
 * BULLETPROOF: Delete catalog item
 */
async function deleteCatalogItem(req: Request, res: Response) {
  try {
    const { id } = req.params;
    console.log(`🗑️ BULLETPROOF DELETE: Deleting catalog item ${id}`);

    const result = await CatalogService.deleteItem(id);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to delete catalog item',
        error: result.error
      });
    }

    res.json({
      success: true,
      message: 'Catalog item deleted successfully'
    });

  } catch (error: any) {
    console.error('💥 Error in deleteCatalogItem:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}

/**
 * SKU validation endpoint
 */
async function validateSKU(req: Request, res: Response) {
  try {
    const { sku, excludeId } = req.query;

    if (!sku) {
      return res.status(400).json({
        success: false,
        message: 'SKU parameter is required'
      });
    }

    let query = supabaseAdmin
      .from('catalog_items')
      .select('id')
      .eq('sku', sku as string)
      .limit(1);

    if (excludeId) {
      query = query.neq('id', excludeId as string);
    }

    const { data: existingItems, error } = await query;

    if (error) {
      console.error('Error validating SKU:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to validate SKU',
        error: error.message
      });
    }

    const available = !existingItems || existingItems.length === 0;

    res.json({
      success: true,
      available,
      message: available ? 'SKU is available' : 'SKU already exists'
    });

  } catch (error: any) {
    console.error('Error in validateSKU:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}

// Define routes with proper middleware order
router.get('/', requireAuth, getAllCatalogItems);
router.get('/validate-sku', requireAuth, validateSKU);
router.get('/:id', requireAuth, getCatalogItemById);
router.post('/', requireAuth, requireRole(['admin', 'salesperson']), upload.single('image'), createCatalogItem);
router.patch('/:id', requireAuth, requireRole(['admin', 'salesperson']), upload.single('image'), updateCatalogItem);
router.delete('/:id', requireAuth, requireRole(['admin']), deleteCatalogItem);

export default router;
import { Request, Response, Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { requireAuth, requireRole } from '../auth/auth';
import crypto from 'crypto';
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

/**
 * Create a new catalog item
 */
async function createCatalogItem(req: Request, res: Response) {
  const {
    name,
    description,
    base_price,
    category,
    type,
    fabric_options,
    color_options,
    size_options
  } = req.body;

  // Validate required fields
  if (!name || base_price === undefined) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields: name and base_price are required'
    });
  }

  try {
    console.log('Creating catalog item:', name);

    // Generate a unique ID for the catalog item
    const itemId = crypto.randomUUID();

    // Insert catalog item into database
    const { data: insertedItem, error: itemError } = await supabaseAdmin
      .from('catalog_items')
      .insert({
        id: itemId,
        name,
        description: description || '',
        base_price: parseFloat(base_price),
        category: category || '',
        type: type || '',
        fabric_options: fabric_options || '',
        color_options: color_options || '',
        size_options: size_options || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (itemError) {
      console.error('Error creating catalog item:', itemError);
      return res.status(400).json({
        success: false,
        message: 'Failed to create catalog item: ' + itemError.message,
        details: itemError.details || 'No additional details'
      });
    }

    console.log('Catalog item created successfully:', insertedItem);

    res.status(201).json({
      success: true,
      message: 'Catalog item created successfully',
      item: insertedItem
    });

  } catch (err: any) {
    console.error('Unexpected error creating catalog item:', err);
    console.error(err.message);
    return res.status(400).json({
      success: false,
      message: 'Unexpected error creating catalog item: ' + (err.message || 'Unknown error')
    });
  }
}

// Configure multer for file uploads
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
 * Get all catalog items
 */
async function getAllCatalogItems(req: Request, res: Response) {
  try {
    console.log('Fetching all catalog items from database...');

    const { data: catalogItems, error } = await supabaseAdmin
      .from('catalog_items')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching catalog items:', error);
      return res.status(400).json({
        success: false,
        message: 'Failed to fetch catalog items',
        error: error.message
      });
    }

    console.log(`Found ${catalogItems?.length || 0} catalog items`);

    // Process the data to ensure proper formatting
    const processedItems = (catalogItems || []).map(item => ({
      id: item.id,
      name: item.name || '',
      category: item.category || '',
      sport: item.sport || '',
      basePrice: parseFloat(item.base_price) || 0,
      unitCost: parseFloat(item.unit_cost) || 0,
      sku: item.sku || '',
      etaDays: item.eta_days || '7-10 business days',
      status: item.status || 'active',
      imageUrl: item.image_url || item.base_image_url || null,
      imageVariants: item.image_variants || {},
      description: item.description || '',
      buildInstructions: item.build_instructions || '',
      fabric: item.fabric || '',
      sizes: Array.isArray(item.sizes) ? item.sizes : (item.sizes ? JSON.parse(item.sizes || '[]') : []),
      colors: Array.isArray(item.colors) ? item.colors : (item.colors ? JSON.parse(item.colors || '[]') : []),
      customizationOptions: Array.isArray(item.customization_options) ? item.customization_options : (item.customization_options ? JSON.parse(item.customization_options || '[]') : []),
      minQuantity: parseInt(item.min_quantity) || 1,
      maxQuantity: parseInt(item.max_quantity) || 1000,
      created_at: item.created_at,
      updated_at: item.updated_at
    }));

    res.json({
      success: true,
      data: processedItems,
      count: processedItems.length
    });

  } catch (error: any) {
    console.error('Error in getAllCatalogItems:', error);
    console.error(error.message);
    res.status(400).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

// Duplicate createCatalogItem function removed - using the first implementation above

/**
 * Update a catalog item - BULLETPROOF VERSION
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
      return res.status(400).json({
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
    console.error('Error in updateCatalogItem:', error);
    console.error(error.message);
    res.status(400).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}

/**
 * Delete a catalog item
 */
async function deleteCatalogItem(req: Request, res: Response) {
  try {
    const { id } = req.params;
    console.log(`Deleting catalog item: ${id}`);

    // Get the item first to remove image file if exists
    const { data: existingItem } = await supabaseAdmin
      .from('catalog_items')
      .select('image_url')
      .eq('id', id)
      .single();

    const { error } = await supabaseAdmin
      .from('catalog_items')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting catalog item:', error);
      return res.status(400).json({
        success: false,
        message: 'Failed to delete catalog item',
        error: error.message
      });
    }

    // Remove image file if it exists
    if (existingItem?.image_url) {
      const imagePath = path.join(process.cwd(), existingItem.image_url);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    console.log('Catalog item deleted successfully:', id);

    res.json({
      success: true,
      message: 'Catalog item deleted successfully'
    });

  } catch (error: any) {
    console.error('Error in deleteCatalogItem:', error);
    console.error(error.message);
    res.status(400).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

/**
 * Get a single catalog item
 */
async function getCatalogItem(req: Request, res: Response) {
  try {
    const { id } = req.params;
    console.log(`Fetching catalog item: ${id}`);

    const { data: item, error } = await supabaseAdmin
      .from('catalog_items')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching catalog item:', error);
      return res.status(400).json({
        success: false,
        message: 'Catalog item not found'
      });
    }

    // Process the item data
    const processedItem = {
      id: item.id,
      name: item.name || '',
      category: item.category || '',
      sport: item.sport || '',
      basePrice: parseFloat(item.base_price) || 0,
      unitCost: parseFloat(item.unit_cost) || 0,
      sku: item.sku || '',
      etaDays: item.eta_days || '7-10 business days',
      status: item.status || 'active',
      imageUrl: item.image_url || null,
      description: item.description || '',
      buildInstructions: item.build_instructions || '',
      fabric: item.fabric || '',
      sizes: Array.isArray(item.sizes) ? item.sizes : (item.sizes ? JSON.parse(item.sizes) : []),
      colors: Array.isArray(item.colors) ? item.colors : (item.colors ? JSON.parse(item.colors) : []),
      customizationOptions: Array.isArray(item.customization_options) ? item.customization_options : (item.customization_options ? JSON.parse(item.customization_options) : []),
      minQuantity: parseInt(item.min_quantity) || 1,
      maxQuantity: parseInt(item.max_quantity) || 1000,
      created_at: item.created_at,
      updated_at: item.updated_at
    };

    res.json({
      success: true,
      data: processedItem
    });

  } catch (error: any) {
    console.error('Error in getCatalogItem:', error);
    console.error(error.message);
    res.status(400).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

// Configure routes
router.get('/', getAllCatalogItems);
router.get('/:id', getCatalogItem);
router.post('/', requireAuth, requireRole(['admin', 'catalog_manager', 'customer_catalog_manager']), upload.single('image'), createCatalogItem);
router.patch('/:id', requireAuth, requireRole(['admin', 'catalog_manager', 'customer_catalog_manager']), upload.single('image'), updateCatalogItem);
router.delete('/:id', requireAuth, requireRole(['admin', 'catalog_manager', 'customer_catalog_manager']), deleteCatalogItem);

// Configure routes
router.post('/', requireAuth, requireRole(['admin']), createCatalogItem);

export default router;
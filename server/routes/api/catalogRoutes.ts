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
      return res.status(500).json({
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

  } catch (error) {
    console.error('Error in getAllCatalogItems:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

/**
 * Create a new catalog item
 */
async function createCatalogItem(req: Request, res: Response) {
  try {
    console.log('Creating new catalog item:', req.body);

    const {
      name,
      category,
      sport,
      basePrice,
      unitCost,
      sku,
      etaDays,
      status,
      description,
      buildInstructions,
      fabric,
      sizes,
      colors,
      customizationOptions,
      minQuantity,
      maxQuantity
    } = req.body;

    // Handle file upload
    let imageUrl = null;
    if (req.file) {
      imageUrl = `/uploads/catalog/${req.file.filename}`;
    }

    // Parse arrays if they come as strings
    const parseSizes = typeof sizes === 'string' ? JSON.parse(sizes) : (sizes || []);
    const parseColors = typeof colors === 'string' ? JSON.parse(colors) : (colors || []);
    const parseCustomizations = typeof customizationOptions === 'string' ? JSON.parse(customizationOptions) : (customizationOptions || []);

    const { data: newItem, error } = await supabaseAdmin
      .from('catalog_items')
      .insert({
        name: name || '',
        category: category || '',
        sport: sport || '',
        base_price: parseFloat(basePrice) || 0,
        unit_cost: parseFloat(unitCost) || 0,
        sku: sku || '',
        eta_days: etaDays || '7-10 business days',
        status: status || 'active',
        image_url: imageUrl,
        description: description || '',
        build_instructions: buildInstructions || '',
        fabric: fabric || '',
        sizes: JSON.stringify(parseSizes),
        colors: JSON.stringify(parseColors),
        customization_options: JSON.stringify(parseCustomizations),
        min_quantity: parseInt(minQuantity) || 1,
        max_quantity: parseInt(maxQuantity) || 1000,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating catalog item:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create catalog item',
        error: error.message
      });
    }

    console.log('Catalog item created successfully:', newItem.id);

    res.status(201).json({
      success: true,
      message: 'Catalog item created successfully',
      data: newItem
    });

  } catch (error) {
    console.error('Error in createCatalogItem:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

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
    console.error('Error in updateCatalogItem:', error);
    res.status(500).json({
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
      return res.status(500).json({
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

  } catch (error) {
    console.error('Error in deleteCatalogItem:', error);
    res.status(500).json({
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
      return res.status(404).json({
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

  } catch (error) {
    console.error('Error in getCatalogItem:', error);
    res.status(500).json({
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

export default router;
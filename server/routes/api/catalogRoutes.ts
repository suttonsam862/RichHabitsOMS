import { Request, Response, Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { requireAuth, requireRole } from '../auth/auth';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { CatalogService } from '../../services/catalogService';
import { validateRequiredFields, validateCatalogItemData, standardizeApiResponse } from '../../utils/validation';


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
  try {
    console.log('Creating catalog item with request body:', req.body);

    // Extract and normalize fields - support both camelCase (frontend) and snake_case formats
    const name = req.body.name;
    const description = req.body.description || '';
    const base_price = req.body.base_price || req.body.basePrice;
    const unit_cost = req.body.unit_cost || req.body.unitCost;
    const category = req.body.category || '';
    const sport = req.body.sport || '';
    const fabric = req.body.fabric || '';
    const status = req.body.status || 'active';
    const sku = req.body.sku || '';

    // Validate required fields
    if (!name || base_price === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name and base_price are required'
      });
    }

    // Validate base_price is a valid number
    const parsedPrice = parseFloat(base_price);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      return res.status(400).json({
        success: false,
        message: 'base_price must be a valid positive number'
      });
    }

    // Validate unit_cost if provided
    let parsedUnitCost = 0;
    if (unit_cost !== undefined) {
      parsedUnitCost = parseFloat(unit_cost);
      if (isNaN(parsedUnitCost) || parsedUnitCost < 0) {
        return res.status(400).json({
          success: false,
          message: 'unit_cost must be a valid positive number'
        });
      }
    }

    console.log('Creating catalog item:', name);

    // Generate a unique ID for the catalog item
    const itemId = crypto.randomUUID();

    // Insert catalog item into database with explicit defaults and normalized fields
    const { data: insertedItem, error: itemError } = await supabaseAdmin
      .from('catalog_items')
      .insert({
        id: itemId,
        name: name.trim(),
        description: description,
        base_price: parsedPrice,
        unit_cost: parsedUnitCost,
        category: category.trim(),
        sport: sport.trim(),
        fabric: fabric.trim(),
        status: status,
        sku: sku.trim(),
        created_at: 'NOW()',
        updated_at: 'NOW()'
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

    res.status(200).json({
      success: true,
      data: insertedItem
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

// Local file upload removed - using Supabase Storage only

/**
 * Get all catalog items
 */
async function getAllCatalogItems(req: Request, res: Response) {
  try {
    console.log('Fetching all catalog items from database...');

    const { data: catalogItems, error } = await supabaseAdmin
      .from('catalog_items')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

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
      images: item.image_variants?.gallery || Array.isArray(item.images) ? item.images : [], // Use imageVariants.gallery for multi-images
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

    res.status(200).json({
      success: true,
      data: processedItems
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
      // Image URL handled by Supabase Storage
    }

    const result = await CatalogService.updateItem(id, req.body);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: 'Failed to update catalog item',
        error: result.error
      });
    }

    res.status(200).json({
      success: true,
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

    res.status(200).json({
      success: true,
      data: { id: id }
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
      images: item.image_variants?.gallery || Array.isArray(item.images) ? item.images : [], // Use imageVariants.gallery as fallback for multi-images
      customizationOptions: Array.isArray(item.customization_options) ? item.customization_options : (item.customization_options ? JSON.parse(item.customization_options) : []),
      minQuantity: parseInt(item.min_quantity) || 1,
      maxQuantity: parseInt(item.max_quantity) || 1000,
      created_at: item.created_at,
      updated_at: item.updated_at
    };

    res.status(200).json({
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
router.post('/', requireAuth, requireRole(['admin', 'catalog_manager', 'customer_catalog_manager']), createCatalogItem);
router.patch('/:id', requireAuth, requireRole(['admin', 'catalog_manager', 'customer_catalog_manager']), updateCatalogItem);
router.delete('/:id', requireAuth, requireRole(['admin', 'catalog_manager', 'customer_catalog_manager']), deleteCatalogItem);

export default router;
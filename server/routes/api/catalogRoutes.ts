import { Request, Response, Router } from 'express';
import { supabase } from '../../db.js';
import { createClient } from '@supabase/supabase-js';

// Use service key for catalog operations to bypass RLS
const supabaseService = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);
import { CatalogItem, InsertCatalogItem } from '../../../shared/schema';
import { requireAuth, requireRole } from '../auth/auth';

// Create service role client for delete operations to bypass RLS
const supabaseServiceRole = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);
import { deleteImageFile, extractFilenameFromUrl } from '../../imageUpload';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';

// Comprehensive logging function for catalog operations
function logCatalogOperation(operation: string, req: Request, data?: any, error?: any) {
  const timestamp = new Date().toISOString();
  const requestId = `catalog_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  console.log(`\n📁 === CATALOG OPERATION: ${operation.toUpperCase()} ===`);
  console.log(`🆔 Request ID: ${requestId}`);
  console.log(`📅 Timestamp: ${timestamp}`);
  console.log(`👤 User: ${(req as any).user?.email || 'Anonymous'} (${(req as any).user?.role || 'Unknown'})`);
  console.log(`🌐 Route: ${req.method} ${req.path}`);

  if (data) {
    console.log(`📊 Operation Data:`);
    console.log(JSON.stringify(data, null, 2));
  }

  if (error) {
    console.error(`❌ Operation Error:`);
    console.error(`   Type: ${error.constructor.name}`);
    console.error(`   Message: ${error.message}`);
    console.error(`   Code: ${error.code || 'Unknown'}`);
    if (error.details) console.error(`   Details: ${error.details}`);
    if (error.hint) console.error(`   Hint: ${error.hint}`);
  }

  console.log(`=== END CATALOG OPERATION ===\n`);
}

const router = Router();

/**
 * Get all catalog items with proper data transformation
 */
export async function getCatalogItems(req: Request, res: Response) {
  try {
    logCatalogOperation('get_catalog_items', req);

    console.log('🔍 Attempting to fetch catalog items...');
    console.log('👤 Request user:', (req as any).user?.email, (req as any).user?.role);
    console.log('🔑 Using Supabase client type:', typeof supabase);

    const { data: items, error } = await supabaseService
      .from('catalog_items')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      logCatalogOperation('get_catalog_items', req, null, error);
      console.error('❌ Error fetching catalog items:', error);
      console.error('   Error code:', error.code);
      console.error('   Error details:', error.details);
      console.error('   Error hint:', error.hint);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch catalog items',
        error: error.message 
      });
    }

    console.log('📊 Raw items from database:', items?.length || 0);
    if (items && items.length > 0) {
      console.log('📝 First raw item:', JSON.stringify(items[0], null, 2));
    }

    // Transform database snake_case to camelCase for frontend
    const transformedItems = (items || []).map(item => {
      // Fix image URLs to use correct environment
      let imageUrl = item.base_image_url;
      let measurementChartUrl = item.measurement_chart_url;

      if (imageUrl && imageUrl.includes('localhost:5000')) {
        // Replace localhost with the current environment URL
        const currentHost = process.env.REPL_SLUG ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co` : 'http://0.0.0.0:5000';
        imageUrl = imageUrl.replace('http://localhost:5000', currentHost);
      }

      if (measurementChartUrl && measurementChartUrl.includes('localhost:5000')) {
        const currentHost = process.env.REPL_SLUG ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co` : 'http://0.0.0.0:5000';
        measurementChartUrl = measurementChartUrl.replace('http://localhost:5000', currentHost);
      }

      return {
        id: item.id,
        name: item.name,
        category: item.category,
        sport: item.sport,
        basePrice: parseFloat(String(item.base_price)) || 0,
        unitCost: parseFloat(String(item.unit_cost)) || 0,
        sku: item.sku,
        status: item.status,
        imageUrl: imageUrl,
        measurementChartUrl: measurementChartUrl,
        hasMeasurements: item.has_measurements,
        measurementInstructions: item.measurement_instructions,
        etaDays: item.eta_days,
        preferredManufacturerId: item.preferred_manufacturer_id,
        tags: item.tags || [],
        specifications: item.specifications || {},
        created_at: item.created_at,
        updated_at: item.updated_at,
        buildInstructions: item.build_instructions || ''
      };
    });

    logCatalogOperation('get_catalog_items', req, { count: transformedItems.length });
    console.log(`Found ${transformedItems.length} catalog items`);
    return res.json(transformedItems);
  } catch (error) {
    logCatalogOperation('get_catalog_items', req, null, error);
    console.error('Catalog fetch error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
}

/**
 * Create a new catalog item
 */
export async function createCatalogItem(req: Request, res: Response) {
  try {
    const {
      name,
      category,
      sport,
      basePrice,
      unitCost,
      sku,
      status = 'active',
      imageUrl,
      measurementChartUrl,
      hasMeasurements,
      measurementInstructions,
      etaDays,
      preferredManufacturerId,
      tags,
      specifications,
      buildInstructions
    } = req.body;

    logCatalogOperation('create_catalog_item', req, { requestBody: req.body });

    console.log('Creating new catalog item:', { name, sku, category, sport });

    // Comprehensive server-side validation
    if (!name || !category || !sport || !sku || basePrice === undefined || unitCost === undefined || !etaDays) {
      const error = new Error('Missing required fields: name, category, sport, sku, basePrice, unitCost, and etaDays are required');
      logCatalogOperation('create_catalog_item', req, null, error);
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name, category, sport, sku, basePrice, unitCost, and etaDays are required'
      });
    }

    // Validate data types and ranges
    if (typeof name !== 'string' || name.trim().length === 0 || name.length > 255) {
      const error = new Error('Invalid name: must be a non-empty string under 255 characters');
      logCatalogOperation('create_catalog_item', req, null, error);
      return res.status(400).json({
        success: false,
        message: 'Invalid name: must be a non-empty string under 255 characters'
      });
    }

    if (typeof sku !== 'string' || sku.trim().length < 3 || sku.length > 100) {
      const error = new Error('Invalid SKU: must be 3-100 characters long');
      logCatalogOperation('create_catalog_item', req, null, error);
      return res.status(400).json({
        success: false,
        message: 'Invalid SKU: must be 3-100 characters long'
      });
    }

    const numericBasePrice = Number(basePrice);
    const numericUnitCost = Number(unitCost);

    if (isNaN(numericBasePrice) || numericBasePrice < 0.01 || numericBasePrice > 999999.99) {
      const error = new Error('Invalid base price: must be between $0.01 and $999,999.99');
      logCatalogOperation('create_catalog_item', req, null, error);
      return res.status(400).json({
        success: false,
        message: 'Invalid base price: must be between $0.01 and $999,999.99'
      });
    }

    if (isNaN(numericUnitCost) || numericUnitCost < 0 || numericUnitCost > 999999.99) {
      const error = new Error('Invalid unit cost: must be between $0.00 and $999,999.99');
      logCatalogOperation('create_catalog_item', req, null, error);
      return res.status(400).json({
        success: false,
        message: 'Invalid unit cost: must be between $0.00 and $999,999.99'
      });
    }

    // Validate and parse specifications if provided
    let parsedSpecifications = {};
    if (specifications) {
      if (typeof specifications === 'string' && specifications.trim()) {
        try {
          parsedSpecifications = JSON.parse(specifications);
          if (typeof parsedSpecifications !== 'object' || parsedSpecifications === null || Array.isArray(parsedSpecifications)) {
            throw new Error('Must be an object');
          }
        } catch (error) {
          logCatalogOperation('create_catalog_item', req, null, error);
          return res.status(400).json({
            success: false,
            message: 'Invalid specifications: must be valid JSON object'
          });
        }
      } else if (typeof specifications === 'object' && specifications !== null) {
        parsedSpecifications = specifications;
      }
    }

    // Parse tags if provided
    let parsedTags = [];
    if (tags) {
      if (typeof tags === 'string' && tags.trim()) {
        parsedTags = tags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag.length > 0);
      } else if (Array.isArray(tags)) {
        parsedTags = tags.filter((tag: any) => typeof tag === 'string' && tag.trim().length > 0);
      }
    }

    // Check if SKU already exists (case insensitive)
    const { data: existingItems, error: skuCheckError } = await supabase
      .from('catalog_items')
      .select('id')
      .ilike('sku', sku.trim());

    if (skuCheckError) {
      logCatalogOperation('create_catalog_item', req, null, skuCheckError);
      return res.status(500).json({
        success: false,
        message: 'Failed to check SKU existence',
        error: skuCheckError.message
      });
    }

    if (existingItems && existingItems.length > 0) {
      const error = new Error('SKU already exists (case insensitive check)');
      logCatalogOperation('create_catalog_item', req, null, error);
      return res.status(400).json({
        success: false,
        message: 'SKU already exists (case insensitive check)'
      });
    }

    // For items requiring measurements, we'll allow the validation to pass here
    // and handle measurement chart uploads separately after item creation
    // This allows for file uploads which are processed after the item is created

    const newItem = {
      name: name.trim(),
      category: category.trim(),
      sport: sport.trim(),
      base_price: numericBasePrice,
      unit_cost: numericUnitCost,
      sku: sku.trim().toUpperCase(),
      status: status,
      base_image_url: imageUrl?.trim() || null,
      measurement_chart_url: measurementChartUrl?.trim() || null,
      has_measurements: Boolean(hasMeasurements),
      measurement_instructions: measurementInstructions?.trim() || null,
      eta_days: etaDays.trim(),
      preferred_manufacturer_id: preferredManufacturerId?.trim() || null,
      tags: parsedTags,
      specifications: parsedSpecifications
    };

    // Only include build_instructions if it's provided, to avoid schema errors
    if (buildInstructions !== undefined) {
      (newItem as any).build_instructions = buildInstructions?.trim() || null;
    }

    const { data: item, error } = await supabaseService
      .from('catalog_items')
      .insert([newItem])
      .select()
      .single();

    if (error) {
      logCatalogOperation('create_catalog_item', req, newItem, error);
      console.error('Error creating catalog item:', error);

      // Handle specific database errors
      if (error.code === '23505') { // unique constraint violation
        return res.status(400).json({
          success: false,
          message: 'SKU already exists'
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Failed to create catalog item',
        error: error.message
      });
    }

    logCatalogOperation('create_catalog_item', req, item);
    console.log('Catalog item created successfully:', item.id);
    return res.status(201).json({
      success: true,
      item: {
        ...item,
        // Transform back to camelCase for consistency
        basePrice: item.base_price,
        unitCost: item.unit_cost,
        imageUrl: item.base_image_url,
        measurementChartUrl: item.measurement_chart_url,
        hasMeasurements: item.has_measurements,
        measurementInstructions: item.measurement_instructions,
        etaDays: item.eta_days,
        preferredManufacturerId: item.preferred_manufacturer_id,
        buildInstructions: item.build_instructions || ''
      }
    });
  } catch (error) {
    logCatalogOperation('create_catalog_item', req, null, error);
    console.error('Catalog creation error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

/**
 * Update a catalog item
 */
export async function updateCatalogItem(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const {
      name,
      category,
      sport,
      basePrice,
      unitCost,
      status,
      imageUrl,
      measurementChartUrl,
      hasMeasurements,
      measurementInstructions,
      etaDays,
      preferredManufacturerId,
      tags,
      specifications,
      buildInstructions
    } = req.body;

    logCatalogOperation('update_catalog_item', req, { itemId: id, requestBody: req.body });

    console.log('Updating catalog item:', id);

    // Validate required fields
    if (!name || !category || !sport || basePrice === undefined || unitCost === undefined || !etaDays) {
      const error = new Error('Missing required fields: name, category, sport, basePrice, unitCost, and etaDays are required');
      logCatalogOperation('update_catalog_item', req, null, error);
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name, category, sport, basePrice, unitCost, and etaDays are required'
      });
    }

    // Validate data types and ranges
    const numericBasePrice = Number(basePrice);
    const numericUnitCost = Number(unitCost);

    if (isNaN(numericBasePrice) || numericBasePrice < 0.01 || numericBasePrice > 999999.99) {
      const error = new Error('Invalid base price: must be between $0.01 and $999,999.99');
      logCatalogOperation('update_catalog_item', req, null, error);
      return res.status(400).json({
        success: false,
        message: 'Invalid base price: must be between $0.01 and $999,999.99'
      });
    }

    if (isNaN(numericUnitCost) || numericUnitCost < 0 || numericUnitCost > 999999.99) {
      const error = new Error('Invalid unit cost: must be between $0.00 and $999,999.99');
      logCatalogOperation('update_catalog_item', req, null, error);
      return res.status(400).json({
        success: false,
        message: 'Invalid unit cost: must be between $0.00 and $999,999.99'
      });
    }

    // Parse specifications if provided
    let parsedSpecifications = {};
    if (specifications) {
      if (typeof specifications === 'string' && specifications.trim()) {
        try {
          parsedSpecifications = JSON.parse(specifications);
          if (typeof parsedSpecifications !== 'object' || parsedSpecifications === null || Array.isArray(parsedSpecifications)) {
            throw new Error('Must be an object');
          }
        } catch (error) {
          logCatalogOperation('update_catalog_item', req, null, error);
          return res.status(400).json({
            success: false,
            message: 'Invalid specifications: must be valid JSON object'
          });
        }
      } else if (typeof specifications === 'object' && specifications !== null) {
        parsedSpecifications = specifications;
      }
    }

    // Parse tags if provided
    let parsedTags = [];
    if (tags) {
      if (typeof tags === 'string' && tags.trim()) {
        parsedTags = tags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag.length > 0);
      } else if (Array.isArray(tags)) {
        parsedTags = tags.filter((tag: any) => typeof tag === 'string' && tag.trim().length > 0);
      }
    }

    const updateData = {
      name: name.trim(),
      category: category.trim(),
      sport: sport.trim(),
      base_price: numericBasePrice,
      unit_cost: numericUnitCost,
      status: status,
      base_image_url: imageUrl?.trim() || null,
      measurement_chart_url: measurementChartUrl?.trim() || null,
      has_measurements: Boolean(hasMeasurements),
      measurement_instructions: measurementInstructions?.trim() || null,
      eta_days: etaDays.trim(),
      preferred_manufacturer_id: preferredManufacturerId?.trim() || null,
      tags: parsedTags,
      specifications: parsedSpecifications,
      updated_at: new Date().toISOString()
    };

    // Handle build_instructions field
    if (buildInstructions !== undefined) {
      (updateData as any).build_instructions = buildInstructions?.trim() || null;
    }

    const { data: item, error } = await supabaseService
      .from('catalog_items')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logCatalogOperation('update_catalog_item', req, updateData, error);
      console.error('Error updating catalog item:', error);

      // Handle specific database errors more gracefully
      if (error.message && error.message.includes('build_instructions')) {
        return res.status(500).json({
          success: false,
          message: 'Database schema issue: build_instructions column not found',
          error: 'Please ensure the database schema is up to date'
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Failed to update catalog item',
        error: error.message
      });
    }

    if (!item) {
      const error = new Error('Catalog item not found');
      logCatalogOperation('update_catalog_item', req, updateData, error);
      return res.status(404).json({
        success: false,
        message: 'Catalog item not found'
      });
    }

    logCatalogOperation('update_catalog_item', req, item);
    console.log('Catalog item updated successfully:', id);
    return res.json({
      success: true,
      item: {
        ...item,
        // Transform back to camelCase for consistency
        basePrice: item.base_price,
        unitCost: item.unit_cost,
        imageUrl: item.base_image_url,
        measurementChartUrl: item.measurement_chart_url,
        hasMeasurements: item.has_measurements,
        measurementInstructions: item.measurement_instructions,
        etaDays: item.eta_days,
        preferredManufacturerId: item.preferred_manufacturer_id,
        buildInstructions: item.build_instructions || ''
      }
    });
  } catch (error) {
    logCatalogOperation('update_catalog_item', req, null, error);
    console.error('Catalog update error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

/**
 * Delete a catalog item
 */
export async function deleteCatalogItem(req: Request, res: Response) {
  try {
    const { id } = req.params;

    logCatalogOperation('delete_catalog_item', req, { itemId: id });

    console.log('Deleting catalog item:', id);

    // First check if the item exists
    const { data: existingItem, error: checkError } = await supabase
      .from('catalog_items')
      .select('id, name, sku')
      .eq('id', id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      logCatalogOperation('delete_catalog_item', req, null, checkError);
      console.error('Error checking catalog item existence:', checkError);
      return res.status(500).json({
        success: false,
        message: 'Failed to check catalog item existence',
        error: checkError.message
      });
    }

    if (!existingItem) {
      const notFoundError = new Error('Catalog item not found');
      logCatalogOperation('delete_catalog_item', req, null, notFoundError);
      return res.status(404).json({
        success: false,
        message: 'Catalog item not found'
      });
    }

    console.log('Found item to delete:', existingItem.name, existingItem.sku);

    // Perform the deletion using service role to bypass RLS
    const { data: deletedData, error: deleteError } = await supabaseServiceRole
      .from('catalog_items')
      .delete()
      .eq('id', id)
      .select();

    if (deleteError) {
      logCatalogOperation('delete_catalog_item', req, null, deleteError);
      console.error('Error deleting catalog item:', deleteError);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete catalog item',
        error: deleteError.message
      });
    }

    // Verify deletion was successful
    if (!deletedData || deletedData.length === 0) {
      logCatalogOperation('delete_catalog_item', req, null, new Error('Delete failed - no rows affected'));
      return res.status(500).json({
        success: false,
        message: 'Delete operation failed - item may not exist or RLS blocked deletion'
      });
    }

    logCatalogOperation('delete_catalog_item', req, { 
      itemId: id, 
      success: true, 
      deletedCount: deletedData.length,
      itemName: existingItem.name,
      itemSku: existingItem.sku
    });

    console.log('Catalog item deleted successfully:', id, existingItem.name, `(${deletedData.length} row(s) affected)`);

    return res.json({
      success: true,
      message: 'Catalog item deleted successfully',
      data: {
        deletedItem: existingItem,
        deletedCount: deletedData.length
      }
    });
  } catch (error) {
    logCatalogOperation('delete_catalog_item', req, null, error);
    console.error('Catalog deletion error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

/**
 * Check if SKU exists (used for validation during creation)
 */
export async function checkSkuExists(req: Request, res: Response) {
  try {
    const { sku } = req.query;

    if (!sku || typeof sku !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'SKU parameter is required'
      });
    }

    logCatalogOperation('check_sku', req, { sku });

    // Check if SKU exists (case insensitive)
    const { data: existingItems, error } = await supabase
      .from('catalog_items')
      .select('id, sku')
      .ilike('sku', sku.trim());

    if (error) {
      logCatalogOperation('check_sku', req, null, error);
      console.error('Error checking SKU:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to check SKU',
        error: error.message
      });
    }

    const exists = existingItems && existingItems.length > 0;

    logCatalogOperation('check_sku', req, { 
      sku, 
      exists, 
      foundItems: existingItems?.length || 0 
    });

    return res.json({
      success: true,
      data: {
        exists,
        sku: sku.trim(),
        foundItems: existingItems || []
      }
    });
  } catch (error) {
    logCatalogOperation('check_sku', req, null, error);
    console.error('SKU check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

/**
 * Get a single catalog item by ID
 */
export async function getCatalogItem(req: Request, res: Response) {
  try {
    const { id } = req.params;

    logCatalogOperation('get_catalog_item', req, { itemId: id });

    console.log('Fetching catalog item:', id);

    const { data: item, error } = await supabase
      .from('catalog_items')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      logCatalogOperation('get_catalog_item', req, null, error);
      console.error('Error fetching catalog item:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch catalog item',
        error: error.message
      });
    }

    if (!item) {
      const error = new Error('Catalog item not found');
      logCatalogOperation('get_catalog_item', req, null, error);
      return res.status(404).json({
        success: false,
        message: 'Catalog item not found'
      });
    }

    logCatalogOperation('get_catalog_item', req, item);
    return res.json({
      success: true,
      item
    });
  } catch (error) {
    logCatalogOperation('get_catalog_item', req, null, error);
    console.error('Catalog fetch error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

/**
 * Check if SKU already exists
 */
export async function checkSKUExists(req: Request, res: Response) {
  try {
    const { sku } = req.query;

    logCatalogOperation('check_sku_exists', req, { sku });

    if (!sku) {
      const error = new Error('SKU parameter is required');
      logCatalogOperation('check_sku_exists', req, null, error);
      return res.status(400).json({
        success: false,
        message: 'SKU parameter is required'
      });
    }

    console.log('Checking SKU existence:', sku);

    const { data: existingItems, error } = await supabase
      .from('catalog_items')
      .select('id')
      .eq('sku', sku);

    if (error) {
      logCatalogOperation('check_sku_exists', req, null, error);
      console.error('Error checking SKU:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to check SKU',
        error: error.message
      });
    }

    const existingItem = existingItems && existingItems.length > 0 ? existingItems[0] : null;

    logCatalogOperation('check_sku_exists', req, { sku, exists: !!existingItem });
    return res.json({
      success: true,
      exists: !!existingItem
    });
  } catch (error) {
    logCatalogOperation('check_sku_exists', req, null, error);
    console.error('SKU check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

// Configure routes - Allow catalog_manager and customer_catalog_manager roles
router.get('/', requireAuth, requireRole(['admin', 'catalog_manager', 'customer_catalog_manager']), getCatalogItems);
router.post('/', requireAuth, requireRole(['admin', 'catalog_manager', 'customer_catalog_manager']), createCatalogItem);
router.get('/check-sku', requireAuth, requireRole(['admin', 'catalog_manager', 'customer_catalog_manager']), checkSKUExists);
router.get('/:id', requireAuth, requireRole(['admin', 'catalog_manager', 'customer_catalog_manager']), getCatalogItem);
router.put('/:id', requireAuth, requireRole(['admin', 'catalog_manager', 'customer_catalog_manager']), updateCatalogItem);
router.delete('/:id', requireAuth, requireRole(['admin', 'catalog_manager', 'customer_catalog_manager']), deleteCatalogItem);

export default router;
import { Request, Response, Router } from 'express';
import { supabase } from '../../db';
import { CatalogItem, InsertCatalogItem } from '../../../shared/schema';
import { requireAuth, requireRole } from '../auth/auth';
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

    const { data: items, error } = await supabase
      .from('catalog_items')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      logCatalogOperation('get_catalog_items', req, null, error);
      console.error('Error fetching catalog items:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch catalog items',
        error: error.message 
      });
    }

    // Transform database snake_case to camelCase for frontend
    const transformedItems = (items || []).map(item => ({
      id: item.id,
      name: item.name,
      category: item.category,
      sport: item.sport,
      basePrice: parseFloat(item.base_price) || 0,
      unitCost: parseFloat(item.unit_cost) || 0,
      sku: item.sku,
      status: item.status,
      imageUrl: item.base_image_url,
      measurementChartUrl: item.measurement_chart_url,
      hasMeasurements: item.has_measurements,
      measurementInstructions: item.measurement_instructions,
      etaDays: item.eta_days,
      preferredManufacturerId: item.preferred_manufacturer_id,
      tags: item.tags || [],
      specifications: item.specifications || {},
      created_at: item.created_at,
      updated_at: item.updated_at
    }));

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
      specifications
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
    const { data: existingItem, error: skuCheckError } = await supabase
      .from('catalog_items')
      .select('id')
      .ilike('sku', sku.trim())
      .single();

      if (skuCheckError) {
        logCatalogOperation('create_catalog_item', req, null, skuCheckError);
        return res.status(500).json({
            success: false,
            message: 'Failed to check SKU existence',
            error: skuCheckError.message
        });
    }

    if (existingItem) {
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

    const { data: item, error } = await supabase
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
        preferredManufacturerId: item.preferred_manufacturer_id
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
      specifications
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

    const { data: item, error } = await supabase
      .from('catalog_items')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logCatalogOperation('update_catalog_item', req, updateData, error);
      console.error('Error updating catalog item:', error);
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
        preferredManufacturerId: item.preferred_manufacturer_id
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

    const { error } = await supabase
      .from('catalog_items')
      .delete()
      .eq('id', id);

    if (error) {
      logCatalogOperation('delete_catalog_item', req, null, error);
      console.error('Error deleting catalog item:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete catalog item',
        error: error.message
      });
    }

    logCatalogOperation('delete_catalog_item', req, { itemId: id, success: true });
    console.log('Catalog item deleted successfully:', id);
    return res.json({
      success: true,
      message: 'Catalog item deleted successfully'
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

    const { data: existingItem, error } = await supabase
      .from('catalog_items')
      .select('id')
      .eq('sku', sku)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      logCatalogOperation('check_sku_exists', req, null, error);
      console.error('Error checking SKU:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to check SKU',
        error: error.message
      });
    }

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

// Configure routes
router.get('/', requireAuth, requireRole(['admin']), getCatalogItems);
router.post('/', requireAuth, requireRole(['admin']), createCatalogItem);
router.get('/check-sku', requireAuth, requireRole(['admin']), checkSKUExists);
router.get('/:id', requireAuth, requireRole(['admin']), getCatalogItem);
router.put('/:id', requireAuth, requireRole(['admin']), updateCatalogItem);
router.delete('/:id', requireAuth, requireRole(['admin']), deleteCatalogItem);

export default router;
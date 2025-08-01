import { Request, Response, Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { requireAuth, requireRole } from '../auth/auth';
import { randomUUID } from 'crypto';
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

    // Comprehensive input validation and sanitization
    const validateAndSanitize = (data: any) => {
      const errors: string[] = [];
      
      // Required field validation
      if (!data.name?.trim()) {
        errors.push('Product name is required and cannot be empty');
      }
      
      if (data.basePrice === undefined && data.base_price === undefined) {
        errors.push('Base price is required');
      }
      
      // Sanitize and validate fields
      const sanitized = {
        name: data.name?.trim() || '',
        description: (data.description || '').trim(),
        category: (data.category || '').trim(),
        sport: (data.sport || '').trim(),
        fabric_id: data.fabric_id || data.fabricId || null,
        status: ['active', 'inactive'].includes(data.status) ? data.status : 'active',
        sku: (data.sku || '').trim()
      };
      
      // Price validation
      const basePrice = parseFloat(data.base_price || data.basePrice);
      if (isNaN(basePrice)) {
        errors.push('Base price must be a valid number');
      } else if (basePrice < 0) {
        errors.push('Base price cannot be negative');
      }
      
      const unitCost = parseFloat(data.unit_cost || data.unitCost || 0);
      if (isNaN(unitCost) || unitCost < 0) {
        errors.push('Unit cost must be a valid positive number or zero');
      }
      
      // Length validations
      if (sanitized.name.length > 255) {
        errors.push('Product name cannot exceed 255 characters');
      }
      
      if (sanitized.description.length > 2000) {
        errors.push('Description cannot exceed 2000 characters');
      }
      
      if (sanitized.sku && sanitized.sku.length > 100) {
        errors.push('SKU cannot exceed 100 characters');
      }
      
      return {
        isValid: errors.length === 0,
        errors,
        data: {
          ...sanitized,
          base_price: basePrice,
          unit_cost: unitCost
        }
      };
    };
    
    const validation = validateAndSanitize(req.body);
    
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.errors
      });
    }
    
    const { name, description, category, sport, fabric_id, status, sku, base_price, unit_cost } = validation.data;

    console.log('Creating catalog item:', name);

    // Generate a unique ID for the catalog item
    const itemId = randomUUID();

    // Insert catalog item into database with explicit defaults and normalized fields
    const { data: insertedItem, error: itemError } = await supabaseAdmin
      .from('catalog_items')
      .insert({
        id: itemId,
        name: name.trim(),
        description: description,
        base_price: base_price,
        unit_cost: unit_cost,
        category: category.trim(),
        sport: sport.trim(),
        fabric_id: fabric_id,
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

    // If no items exist, create some sample data
    if (!catalogItems || catalogItems.length === 0) {
      console.log('No catalog items found, creating sample data...');
      
      const sampleItems = [
        {
          id: randomUUID(),
          name: 'Custom Basketball Jersey',
          category: 'Jerseys',
          sport: 'Basketball',
          base_price: 45.99,
          unit_cost: 22.50,
          sku: 'BBJ-001',
          status: 'active',
          description: 'High-quality custom basketball jersey with moisture-wicking fabric',
          specifications: JSON.stringify({
            fabric: '100% Polyester',
            sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
            colors: ['Red', 'Blue', 'Black', 'White'],
            customizationOptions: ['Screen Print', 'Embroidery', 'Heat Transfer'],
            minQuantity: 6,
            maxQuantity: 100,
            etaDays: '7-10 business days'
          }),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: randomUUID(),
          name: 'Football Practice Jersey',
          category: 'Jerseys', 
          sport: 'Football',
          base_price: 38.99,
          unit_cost: 19.25,
          sku: 'FBJ-002',
          status: 'active',
          description: 'Durable practice jersey for football teams',
          specifications: JSON.stringify({
            fabric: '65% Cotton, 35% Polyester',
            sizes: ['S', 'M', 'L', 'XL', 'XXL'],
            colors: ['Navy', 'Red', 'Green', 'Gold'],
            customizationOptions: ['Screen Print', 'Embroidery'],
            minQuantity: 10,
            maxQuantity: 200,
            etaDays: '5-7 business days'
          }),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];

      // Insert sample items
      const { data: insertedItems, error: insertError } = await supabaseAdmin
        .from('catalog_items')
        .insert(sampleItems)
        .select();

      if (insertError) {
        console.error('Error creating sample catalog items:', insertError);
      } else {
        console.log('Sample catalog items created successfully');
      }
    }

    // Fetch again to get the latest data (including any newly created samples)
    const { data: finalCatalogItems, error: finalError } = await supabaseAdmin
      .from('catalog_items')
      .select('*')
      .order('created_at', { ascending: false });

    if (finalError) {
      console.error('Error fetching final catalog items:', finalError);
      return res.status(400).json({
        success: false,
        message: 'Failed to fetch catalog items',
        error: finalError.message
      });
    }

    // Process the data to ensure proper formatting with bulletproof error handling
    const processedItems = (finalCatalogItems || []).map(item => {
      // Parse specifications JSON with comprehensive error handling
      let specs = {};
      try {
        if (item.specifications) {
          if (typeof item.specifications === 'string') {
            specs = JSON.parse(item.specifications);
          } else if (typeof item.specifications === 'object') {
            specs = item.specifications;
          }
        }
      } catch (e) {
        console.warn(`Failed to parse specifications for item ${item.id}:`, e);
        specs = {};
      }

      // Ensure array fields are always arrays
      const safeArray = (value: any, fallback: any[] = []) => {
        if (Array.isArray(value)) return value;
        if (typeof value === 'string' && value.trim()) {
          try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : fallback;
          } catch {
            return value.split(',').map(s => s.trim()).filter(Boolean);
          }
        }
        return fallback;
      };

      return {
        id: item.id,
        name: item.name?.trim() || '',
        category: item.category?.trim() || '',
        sport: item.sport?.trim() || '',
        basePrice: Math.max(0, parseFloat(item.base_price) || 0),
        unitCost: Math.max(0, parseFloat(item.unit_cost) || 0),
        sku: item.sku?.trim() || '',
        etaDays: (specs as any).etaDays || (item as any).eta_days || '7-10 business days',
        status: ['active', 'inactive'].includes(item.status) ? item.status : 'active',
        imageUrl: (item as any).base_image_url || (item as any).image_url || null,
        imageVariants: typeof (item as any).image_variants === 'object' ? (item as any).image_variants : {},
        images: safeArray((item as any).images),
        description: ((item as any).description || (specs as any).description || '').trim(),
        buildInstructions: ((item as any).build_instructions || (specs as any).buildInstructions || '').trim(),
        fabric: ((specs as any).fabric || (item as any).fabric || '').trim(),
        sizes: safeArray((specs as any).sizes || (item as any).sizes),
        colors: safeArray((specs as any).colors || (item as any).colors),
        customizationOptions: safeArray((specs as any).customizationOptions || (item as any).customization_options),
        minQuantity: Math.max(1, parseInt((specs as any).minQuantity || (item as any).min_quantity) || 1),
        maxQuantity: Math.max(1, parseInt((specs as any).maxQuantity || (item as any).max_quantity) || 1000),
        created_at: item.created_at,
        updated_at: item.updated_at
      };
    });

    console.log(`Returning ${processedItems.length} processed catalog items`);

    res.status(200).json({
      success: true,
      data: processedItems
    });

  } catch (error: any) {
    console.error('Error in getAllCatalogItems:', error);
    console.error(error.message);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
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
      images: Array.isArray(item.images) ? item.images : [], // Use actual images[] array from database
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
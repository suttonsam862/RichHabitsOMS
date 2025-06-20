import { Request, Response } from 'express';
import { supabase } from '../../db';
import { CatalogItem, InsertCatalogItem } from '../../../shared/schema';
import { requireAuth, requireRole } from '../auth/auth';
import { deleteImageFile, extractFilenameFromUrl } from '../../imageUpload';

/**
 * Get all catalog items
 */
export async function getCatalogItems(req: Request, res: Response) {
  try {
    console.log('Fetching catalog items from Supabase...');
    
    const { data: items, error } = await supabase
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

    console.log(`Found ${items?.length || 0} catalog items`);
    return res.json(items || []);
  } catch (error) {
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
      description,
      category,
      basePrice,
      sku,
      status = 'active',
      baseImageUrl,
      tags = [],
      specifications = {}
    } = req.body;

    console.log('Creating new catalog item:', { name, sku, category });

    // Validate required fields
    if (!name || !category || !sku || basePrice === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name, category, sku, and basePrice are required'
      });
    }

    // Check if SKU already exists
    const { data: existingItem } = await supabase
      .from('catalog_items')
      .select('id')
      .eq('sku', sku)
      .single();

    if (existingItem) {
      return res.status(400).json({
        success: false,
        message: 'SKU already exists'
      });
    }

    const newItem = {
      name,
      description: description || null,
      category,
      base_price: Number(basePrice),
      sku,
      status,
      image_url: imageUrl || null,
      tags: tags || [],
      specifications: specifications || {}
    };

    const { data: item, error } = await supabase
      .from('catalog_items')
      .insert([newItem])
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

    console.log('Catalog item created successfully:', item.id);
    return res.status(201).json({
      success: true,
      item
    });
  } catch (error) {
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
    const updateData = req.body as Partial<CatalogItem>;

    console.log('Updating catalog item:', id);

    // Remove undefined values
    const cleanedData = Object.fromEntries(
      Object.entries(updateData).filter(([_, value]) => value !== undefined)
    );

    const { data: item, error } = await supabase
      .from('catalog_items')
      .update(cleanedData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating catalog item:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update catalog item',
        error: error.message
      });
    }

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Catalog item not found'
      });
    }

    console.log('Catalog item updated successfully:', id);
    return res.json({
      success: true,
      item
    });
  } catch (error) {
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

    console.log('Deleting catalog item:', id);

    const { error } = await supabase
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

    console.log('Catalog item deleted successfully:', id);
    return res.json({
      success: true,
      message: 'Catalog item deleted successfully'
    });
  } catch (error) {
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

    console.log('Fetching catalog item:', id);

    const { data: item, error } = await supabase
      .from('catalog_items')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching catalog item:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch catalog item',
        error: error.message
      });
    }

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Catalog item not found'
      });
    }

    return res.json({
      success: true,
      item
    });
  } catch (error) {
    console.error('Catalog fetch error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}
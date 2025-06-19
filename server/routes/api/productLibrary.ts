/**
 * Product Library System - For salespeople to reference products and pricing
 */
import { Request, Response } from 'express';
import { supabase } from './db';

// Get all products from library with optional filtering
export async function getProductLibrary(req: Request, res: Response) {
  try {
    const { 
      category, 
      search, 
      active_only = 'true',
      limit = '50',
      offset = '0' 
    } = req.query;

    let query = supabase
      .from('product_library')
      .select(`
        *,
        product_pricing_history(
          unit_price,
          quantity_ordered,
          pricing_date,
          notes
        )
      `)
      .order('total_times_ordered', { ascending: false })
      .order('last_ordered_date', { ascending: false, nullsFirst: false });

    // Apply filters
    if (active_only === 'true') {
      query = query.eq('is_active', true);
    }

    if (category) {
      query = query.eq('category', category);
    }

    if (search) {
      query = query.or(`product_name.ilike.%${search}%, description.ilike.%${search}%, tags.cs.{${search}}`);
    }

    query = query.range(parseInt(offset as string), parseInt(offset as string) + parseInt(limit as string) - 1);

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching product library:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch product library'
      });
    }

    // Calculate pricing stats for each product
    const productsWithStats = data?.map(product => {
      const pricing = product.product_pricing_history || [];
      const prices = pricing.map(p => parseFloat(p.unit_price));
      
      return {
        ...product,
        pricing_stats: {
          min_price: prices.length > 0 ? Math.min(...prices) : product.base_price,
          max_price: prices.length > 0 ? Math.max(...prices) : product.base_price,
          avg_price: prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : product.base_price,
          total_orders: pricing.length,
          last_price: pricing.length > 0 ? prices[0] : product.base_price
        }
      };
    });

    res.json({
      success: true,
      products: productsWithStats,
      total: data?.length || 0
    });

  } catch (error) {
    console.error('Error in getProductLibrary:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

// Get product categories for filtering
export async function getProductCategories(req: Request, res: Response) {
  try {
    const { data, error } = await supabase
      .from('product_library')
      .select('category')
      .eq('is_active', true)
      .not('category', 'is', null);

    if (error) {
      console.error('Error fetching categories:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch categories'
      });
    }

    // Get unique categories
    const categories = [...new Set(data?.map(item => item.category))].filter(Boolean);

    res.json({
      success: true,
      categories
    });

  } catch (error) {
    console.error('Error in getProductCategories:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

// Add new product to library
export async function addProductToLibrary(req: Request, res: Response) {
  try {
    const {
      product_name,
      description,
      category,
      base_price,
      material,
      available_sizes = [],
      available_colors = [],
      supplier,
      supplier_sku,
      lead_time_days,
      minimum_quantity = 1,
      tags = []
    } = req.body;

    if (!product_name || !base_price) {
      return res.status(400).json({
        success: false,
        message: 'Product name and base price are required'
      });
    }

    const { data, error } = await supabase
      .from('product_library')
      .insert({
        product_name,
        description,
        category,
        base_price: parseFloat(base_price),
        material,
        available_sizes,
        available_colors,
        supplier,
        supplier_sku,
        lead_time_days: lead_time_days ? parseInt(lead_time_days) : null,
        minimum_quantity: parseInt(minimum_quantity),
        tags,
        created_by: req.user?.email || 'unknown',
        is_active: true
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding product to library:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to add product to library'
      });
    }

    res.status(201).json({
      success: true,
      message: 'Product added to library successfully',
      product: data
    });

  } catch (error) {
    console.error('Error in addProductToLibrary:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

// Copy product from library to new order
export async function copyProductToOrder(req: Request, res: Response) {
  try {
    const { productId } = req.params;
    const { quantity = 1, customizations = {} } = req.body;

    const { data: product, error } = await supabase
      .from('product_library')
      .select('*')
      .eq('id', productId)
      .single();

    if (error || !product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found in library'
      });
    }

    // Update usage statistics
    await supabase
      .from('product_library')
      .update({
        total_times_ordered: (product.total_times_ordered || 0) + 1,
        last_ordered_date: new Date().toISOString()
      })
      .eq('id', productId);

    // Return product data ready for order creation
    const orderItem = {
      product_name: product.product_name,
      description: product.description,
      quantity: parseInt(quantity),
      unit_price: parseFloat(product.base_price),
      total_price: parseFloat(product.base_price) * parseInt(quantity),
      size: customizations.size || '',
      color: customizations.color || '',
      material: product.material,
      // Include original product reference
      library_product_id: product.id,
      ...customizations
    };

    res.json({
      success: true,
      message: 'Product copied for order',
      order_item: orderItem,
      available_options: {
        sizes: product.available_sizes || [],
        colors: product.available_colors || [],
        material: product.material,
        minimum_quantity: product.minimum_quantity,
        lead_time_days: product.lead_time_days
      }
    });

  } catch (error) {
    console.error('Error in copyProductToOrder:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

// Get pricing history for a specific product
export async function getProductPricingHistory(req: Request, res: Response) {
  try {
    const { productId } = req.params;
    const { limit = '20' } = req.query;

    const { data, error } = await supabase
      .from('product_pricing_history')
      .select(`
        *,
        orders(order_number, status),
        customers(first_name, last_name)
      `)
      .eq('product_library_id', productId)
      .order('pricing_date', { ascending: false })
      .limit(parseInt(limit as string));

    if (error) {
      console.error('Error fetching pricing history:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch pricing history'
      });
    }

    res.json({
      success: true,
      pricing_history: data
    });

  } catch (error) {
    console.error('Error in getProductPricingHistory:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}
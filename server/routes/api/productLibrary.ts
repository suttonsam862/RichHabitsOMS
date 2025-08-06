
/**
 * Product Library System - Complete Backend Implementation
 * Supports historical product tracking, mockups, and pricing data
 */
import { Request, Response, Router } from 'express';
import { supabase } from '../../db';
import { requireAuth, requireRole } from '../auth/auth';
import multer from 'multer';
import sharp from 'sharp';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const router = Router();

// Create Supabase admin client for file uploads
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

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed') as any, false);
    }
  }
});

// Get all products from library with optional filtering
export async function getProductLibrary(req: Request, res: Response) {
  try {
    const { 
      category, 
      search, 
      active_only = 'true',
      limit = '50',
      offset = '0',
      sort_by = 'total_times_ordered',
      sort_order = 'desc'
    } = req.query;

    let query = supabase
      .from('product_library')
      .select(`
        *,
        product_pricing_history(
          id,
          unit_price,
          quantity_ordered,
          pricing_date,
          notes,
          orders(order_number, status),
          customers(first_name, last_name)
        ),
        product_mockups(
          id,
          image_url,
          thumbnail_url,
          medium_url,
          mockup_type,
          view_angle,
          is_primary,
          display_order,
          uploaded_by,
          client_approved
        )
      `);

    // Apply filters
    if (active_only === 'true') {
      query = query.eq('is_active', true);
    }

    if (category) {
      query = query.eq('category', category);
    }

    if (search) {
      query = query.textSearch('search_vector', search, {
        type: 'websearch',
        config: 'english'
      });
    }

    // Apply sorting
    const ascending = sort_order === 'asc';
    query = query.order(sort_by as string, { ascending });
    
    // Add secondary sort for consistency
    if (sort_by !== 'created_at') {
      query = query.order('created_at', { ascending: false });
    }

    // Apply pagination
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
      const pricing = Array.isArray(product.product_pricing_history) ? product.product_pricing_history : [];
      const prices = pricing.map((p: any) => parseFloat(p.unit_price));
      const mockups = Array.isArray(product.product_mockups) ? product.product_mockups : [];
      
      return {
        ...product,
        pricing_stats: {
          min_price: prices.length > 0 ? Math.min(...prices) : product.base_price,
          max_price: prices.length > 0 ? Math.max(...prices) : product.base_price,
          avg_price: prices.length > 0 ? prices.reduce((a: number, b: number) => a + b, 0) / prices.length : product.base_price,
          total_orders: pricing.length,
          last_price: pricing.length > 0 ? prices[0] : product.base_price
        },
        mockup_stats: {
          total_mockups: mockups.length,
          approved_mockups: mockups.filter((m: any) => m.client_approved).length,
          primary_mockup: mockups.find((m: any) => m.is_primary),
          latest_mockup: mockups.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
        }
      };
    });

    res.json({
      success: true,
      products: productsWithStats,
      total: data?.length || 0,
      pagination: {
        offset: parseInt(offset as string),
        limit: parseInt(limit as string),
        has_more: data && data.length === parseInt(limit as string)
      }
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

    // Get unique categories with counts
    const categoryCount: Record<string, number> = {};
    data?.forEach(item => {
      if (item.category) {
        categoryCount[item.category] = (categoryCount[item.category] || 0) + 1;
      }
    });

    const categories = Object.entries(categoryCount).map(([name, count]) => ({
      name,
      count
    }));

    res.json({
      success: true,
      categories: categories.sort((a, b) => b.count - a.count)
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

    const userEmail = (req as any).user?.email || 'unknown';

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
        created_by: userEmail,
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
        total_times_ordered: (Number(product.total_times_ordered) || 0) + parseInt(quantity),
        last_ordered_date: new Date().toISOString()
      })
      .eq('id', productId);

    // Return product data ready for order creation
    const orderItem = {
      product_name: product.product_name,
      description: product.description,
      quantity: parseInt(String(quantity)),
      unit_price: parseFloat(String(product.base_price)),
      total_price: parseFloat(String(product.base_price)) * parseInt(String(quantity)),
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
        orders(order_number, status, created_at),
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

// Upload mockup for a product
export async function uploadProductMockup(req: Request, res: Response) {
  try {
    const { productId } = req.params;
    const { 
      mockup_type = 'product_render',
      view_angle = 'front',
      is_primary = false,
      designer_notes = ''
    } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    console.log(`Uploading mockup for product ${productId}`);

    // Verify product exists
    const { data: product, error: productError } = await supabase
      .from('product_library')
      .select('id, product_name')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Process image with Sharp for optimization
    const optimizedBuffer = await sharp(req.file.buffer)
      .resize(1200, 1200, { 
        fit: 'inside', 
        withoutEnlargement: true 
      })
      .jpeg({ quality: 85 })
      .toBuffer();

    // Create thumbnail
    const thumbnailBuffer = await sharp(req.file.buffer)
      .resize(300, 300, { 
        fit: 'cover' 
      })
      .jpeg({ quality: 80 })
      .toBuffer();

    // Create medium size
    const mediumBuffer = await sharp(req.file.buffer)
      .resize(600, 600, { 
        fit: 'inside', 
        withoutEnlargement: true 
      })
      .jpeg({ quality: 85 })
      .toBuffer();

    // Generate unique filenames
    const timestamp = new Date().toISOString().split('T')[0];
    const randomId = crypto.randomBytes(8).toString('hex');
    const baseFileName = `${timestamp}_${randomId}`;
    
    const paths = {
      original: `product_library/${productId}/mockups/${baseFileName}_original.jpg`,
      large: `product_library/${productId}/mockups/${baseFileName}_large.jpg`,
      medium: `product_library/${productId}/mockups/${baseFileName}_medium.jpg`,
      thumbnail: `product_library/${productId}/mockups/${baseFileName}_thumb.jpg`
    };

    // Upload all variants to Supabase Storage
    const uploads = await Promise.all([
      supabaseAdmin.storage.from('uploads').upload(paths.original, req.file.buffer, {
        contentType: req.file.mimetype,
        cacheControl: '3600'
      }),
      supabaseAdmin.storage.from('uploads').upload(paths.large, optimizedBuffer, {
        contentType: 'image/jpeg',
        cacheControl: '3600'
      }),
      supabaseAdmin.storage.from('uploads').upload(paths.medium, mediumBuffer, {
        contentType: 'image/jpeg',
        cacheControl: '3600'
      }),
      supabaseAdmin.storage.from('uploads').upload(paths.thumbnail, thumbnailBuffer, {
        contentType: 'image/jpeg',
        cacheControl: '3600'
      })
    ]);

    // Check for upload errors
    const uploadError = uploads.find(upload => upload.error);
    if (uploadError) {
      console.error('Supabase storage upload error:', uploadError.error);
      return res.status(500).json({
        success: false,
        message: 'Failed to upload mockup to storage'
      });
    }

    // Get public URLs
    const urls = {
      original: supabaseAdmin.storage.from('uploads').getPublicUrl(paths.original).data.publicUrl,
      image_url: supabaseAdmin.storage.from('uploads').getPublicUrl(paths.large).data.publicUrl,
      medium_url: supabaseAdmin.storage.from('uploads').getPublicUrl(paths.medium).data.publicUrl,
      thumbnail_url: supabaseAdmin.storage.from('uploads').getPublicUrl(paths.thumbnail).data.publicUrl
    };

    // If this is set as primary, unset other primary mockups
    if (is_primary === true || is_primary === 'true') {
      await supabase
        .from('product_mockups')
        .update({ is_primary: false })
        .eq('product_library_id', productId);
    }

    // Get display order
    const { count } = await supabase
      .from('product_mockups')
      .select('*', { count: 'exact', head: true })
      .eq('product_library_id', productId);

    // Insert mockup record
    const { data: mockup, error: insertError } = await supabase
      .from('product_mockups')
      .insert({
        product_library_id: productId,
        image_url: urls.image_url,
        thumbnail_url: urls.thumbnail_url,
        medium_url: urls.medium_url,
        original_url: urls.original,
        mockup_type,
        view_angle,
        is_primary: is_primary === true || is_primary === 'true',
        display_order: count || 0,
        uploaded_by: (req as any).user?.email || 'unknown',
        designer_notes
      })
      .select()
      .single();

    if (insertError) {
      console.error('Database insert error:', insertError);
      
      // Cleanup uploaded files
      try {
        await Promise.all([
          supabaseAdmin.storage.from('uploads').remove([paths.original]),
          supabaseAdmin.storage.from('uploads').remove([paths.large]),
          supabaseAdmin.storage.from('uploads').remove([paths.medium]),
          supabaseAdmin.storage.from('uploads').remove([paths.thumbnail])
        ]);
      } catch (cleanupError) {
        console.error('Failed to cleanup uploaded files:', cleanupError);
      }

      return res.status(500).json({
        success: false,
        message: 'Failed to save mockup record'
      });
    }

    console.log(`Mockup uploaded successfully for product ${productId}`);

    res.status(200).json({
      success: true,
      data: {
        mockup,
        message: 'Mockup uploaded successfully'
      }
    });

  } catch (error: any) {
    console.error('Unexpected error uploading mockup:', error);
    return res.status(500).json({
      success: false,
      message: 'Unexpected error uploading mockup',
      error: error.message
    });
  }
}

// Get mockups for a product
export async function getProductMockups(req: Request, res: Response) {
  try {
    const { productId } = req.params;
    const { mockup_type, approved_only } = req.query;

    let query = supabase
      .from('product_mockups')
      .select('*')
      .eq('product_library_id', productId)
      .order('display_order')
      .order('created_at', { ascending: false });

    if (mockup_type) {
      query = query.eq('mockup_type', mockup_type);
    }

    if (approved_only === 'true') {
      query = query.eq('client_approved', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching mockups:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch mockups'
      });
    }

    res.json({
      success: true,
      mockups: data
    });

  } catch (error) {
    console.error('Error in getProductMockups:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

// Routes
router.get('/', requireAuth, getProductLibrary);
router.get('/categories', requireAuth, getProductCategories);
router.post('/', requireAuth, requireRole(['admin', 'salesperson']), addProductToLibrary);
router.post('/:productId/copy', requireAuth, requireRole(['admin', 'salesperson']), copyProductToOrder);
router.get('/:productId/pricing-history', requireAuth, getProductPricingHistory);
router.post('/:productId/mockups', requireAuth, requireRole(['admin', 'salesperson', 'designer']), upload.single('mockup'), uploadProductMockup);
router.get('/:productId/mockups', requireAuth, getProductMockups);

export default router;

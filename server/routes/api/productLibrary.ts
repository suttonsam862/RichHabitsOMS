
/**
 * Product Library System - Complete Backend Implementation
 * Supports historical product tracking, mockups, and pricing data
 * 
 * Endpoints:
 * - GET /api/products/library - fetch all products with metadata
 * - GET /api/products/library/:id/pricing-history - get historical pricing data  
 * - POST /api/products/library/:id/mockups - upload mockup for a product
 * - GET /api/products/library/:id/mockups - fetch mockups for a product
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

// GET /api/products/library - fetch all products with metadata
export async function getProductLibrary(req: Request, res: Response) {
  try {
    const { 
      category, 
      search, 
      active_only = 'true',
      limit = '50',
      offset = '0',
      sort_by = 'created_at',
      sort_order = 'desc'
    } = req.query;

    // Validate and sanitize query parameters
    const searchTerm = typeof search === 'string' ? search : '';
    const categoryFilter = typeof category === 'string' ? category : '';
    
    let query = supabase
      .from('catalog_items')
      .select(`
        *,
        catalog_item_price_history(
          id,
          old_base_price,
          new_base_price,
          old_unit_cost,
          new_unit_cost,
          changed_by,
          reason,
          created_at
        ),
        catalog_item_image_history(
          id,
          image_path,
          image_url,
          designer_id,
          image_type,
          alt_text,
          metadata,
          is_active,
          upload_timestamp,
          created_at
        )
      `);

    // Apply filters
    if (active_only === 'true') {
      query = query.eq('status', 'active');
    }

    if (categoryFilter) {
      query = query.eq('category', categoryFilter);
    }

    if (searchTerm) {
      query = query.or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,sku.ilike.%${searchTerm}%`);
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

    // Calculate pricing and mockup stats for each product
    const productsWithStats = data?.map(product => {
      const pricingHistory = Array.isArray(product.catalog_item_price_history) ? product.catalog_item_price_history : [];
      const mockups = Array.isArray(product.catalog_item_image_history) ? product.catalog_item_image_history : [];
      const activeMockups = mockups.filter((m: any) => m.is_active);
      
      // Calculate pricing statistics
      const currentPrice = parseFloat(String(product.base_price || '0'));
      const historicalPrices = pricingHistory.map((p: any) => parseFloat(String(p.new_base_price || '0'))).filter(price => price > 0);
      const allPrices = [currentPrice, ...historicalPrices];
      
      return {
        ...product,
        // Enhanced metadata structure
        metadata: {
          sizes: Array.isArray(product.sizes) ? product.sizes : [],
          colors: Array.isArray(product.colors) ? product.colors : [],
          customization_options: Array.isArray(product.customization_options) ? product.customization_options : [],
          specifications: typeof product.specifications === 'object' ? product.specifications : {},
          tags: Array.isArray(product.tags) ? product.tags : []
        },
        pricing_stats: {
          current_price: currentPrice,
          min_price: allPrices.length > 0 ? Math.min(...allPrices) : currentPrice,
          max_price: allPrices.length > 0 ? Math.max(...allPrices) : currentPrice,
          avg_price: allPrices.length > 0 ? allPrices.reduce((a: number, b: number) => a + b, 0) / allPrices.length : currentPrice,
          price_changes: pricingHistory.length,
          last_price_change: pricingHistory.length > 0 ? pricingHistory[0].created_at : null
        },
        mockup_stats: {
          total_mockups: activeMockups.length,
          mockup_types: [...new Set(activeMockups.map((m: any) => m.image_type))],
          latest_mockup: activeMockups.sort((a: any, b: any) => 
            new Date(b.upload_timestamp || b.created_at).getTime() - new Date(a.upload_timestamp || a.created_at).getTime()
          )[0] || null,
          has_primary_image: activeMockups.some((m: any) => m.image_type === 'primary' || m.image_type === 'product_photo')
        }
      };
    });

    // Enhanced response structure
    res.json({
      success: true,
      data: {
        products: productsWithStats,
        total: data?.length || 0,
        pagination: {
          offset: parseInt(offset as string),
          limit: parseInt(limit as string),
          has_more: data && data.length === parseInt(limit as string)
        },
        filters_applied: {
          category: categoryFilter || null,
          search: searchTerm || null,
          active_only: active_only === 'true',
          sort_by: sort_by as string,
          sort_order: sort_order as string
        }
      },
      timestamp: new Date().toISOString()
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
      .from('catalog_items')
      .select('category')
      .eq('status', 'active')
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
    data?.forEach((item: { category: unknown }) => {
      if (typeof item.category === 'string' && item.category) {
        categoryCount[item.category] = (categoryCount[item.category] || 0) + 1;
      }
    });

    const categories = Object.entries(categoryCount).map(([name, count]) => ({
      name,
      count
    }));

    res.json({
      success: true,
      data: {
        categories: categories.sort((a, b) => b.count - a.count)
      },
      timestamp: new Date().toISOString()
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

// GET /api/products/library/:id - get individual product details
export async function getProductById(req: Request, res: Response) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Product ID is required'
      });
    }

    // Fetch product with all related data
    const { data: product, error } = await supabase
      .from('catalog_items')
      .select(`
        *,
        user_profiles!catalog_items_preferred_manufacturer_id_fkey(
          id,
          username,
          first_name,
          last_name
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching product by ID:', error);
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch product details'
      });
    }

    // Process existing product data (without separate history tables for now)
    const currentPrice = parseFloat(String(product.base_price || '0'));
    const currentUnitCost = parseFloat(String(product.unit_cost || '0'));
    
    // Parse existing image data from the product
    const existingImages = Array.isArray(product.images) ? product.images : [];
    const imageVariants = typeof product.imageVariants === 'object' && product.imageVariants ? product.imageVariants : {};
    
    // Enhanced product data with metadata
    const productWithDetails = {
      ...product,
      metadata: {
        sizes: Array.isArray(product.sizes) ? product.sizes : [],
        colors: Array.isArray(product.colors) ? product.colors : [],
        customization_options: Array.isArray(product.customizationOptions) ? product.customizationOptions : [],
        specifications: typeof product.specifications === 'object' && product.specifications ? product.specifications : {},
        tags: Array.isArray(product.tags) ? product.tags : []
      },
      pricing_stats: {
        current_price: currentPrice,
        min_price: currentPrice,
        max_price: currentPrice,
        avg_price: currentPrice,
        price_changes: 0,
        last_price_change: null
      },
      mockup_stats: {
        total_mockups: existingImages.length,
        mockup_types: [...new Set(existingImages.map((img: any) => img.type || 'product'))],
        latest_mockup: existingImages.length > 0 ? {
          image_url: existingImages[0].url || product.imageUrl || product.baseImageUrl,
          image_type: existingImages[0].type || 'product',
          alt_text: existingImages[0].alt || product.name,
          upload_timestamp: existingImages[0].uploadedAt || product.createdAt
        } : null,
        has_primary_image: existingImages.some((img: any) => img.isPrimary) || !!product.imageUrl
      },
      pricing_history: [], // Will be populated by separate endpoint
      mockups: existingImages.map((img: any) => ({
        id: img.id || `img-${Date.now()}`,
        image_url: img.url,
        image_type: img.type || 'product',
        alt_text: img.alt || product.name,
        upload_timestamp: img.uploadedAt || product.createdAt,
        metadata: img,
        is_active: true
      }))
    };

    res.json({
      success: true,
      data: productWithDetails,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in getProductById:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

// GET /api/products/library/:id/pricing-history - get historical pricing data
export async function getProductPricingHistory(req: Request, res: Response) {
  try {
    const { productId } = req.params;
    const { limit = '20' } = req.query;

    // Validate product exists first
    const { data: product, error: productError } = await supabase
      .from('catalog_items')
      .select('id, name, base_price, unit_cost')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Get pricing history from our enhanced schema
    const { data, error } = await supabase
      .from('catalog_item_price_history')
      .select(`
        *,
        user_profiles!catalog_item_price_history_changed_by_fkey(
          id,
          username,
          first_name,
          last_name,
          role
        )
      `)
      .eq('catalog_item_id', productId)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit as string));

    if (error) {
      console.error('Error fetching pricing history:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch pricing history'
      });
    }

    // Calculate pricing trends
    const priceChanges = data || [];
    const currentPrice = parseFloat(product.base_price || '0');
    const pricesOverTime = [
      { price: currentPrice, date: new Date().toISOString(), type: 'current' },
      ...priceChanges.map(change => ({
        price: parseFloat(String(change.old_base_price || '0')),
        date: String(change.created_at || ''),
        type: 'historical'
      }))
    ];

    const priceStats = {
      current_base_price: currentPrice,
      current_unit_cost: parseFloat(String(product.unit_cost || '0')),
      total_changes: priceChanges.length,
      price_trend: priceChanges.length > 0 
        ? (currentPrice > parseFloat(String(priceChanges[priceChanges.length - 1]?.old_base_price || '0')) ? 'increasing' : 'decreasing')
        : 'stable',
      average_change_frequency_days: priceChanges.length > 1 && priceChanges[priceChanges.length - 1]?.created_at
        ? Math.round((Date.now() - new Date(String(priceChanges[priceChanges.length - 1].created_at)).getTime()) / (1000 * 60 * 60 * 24) / priceChanges.length)
        : null
    };

    res.json({
      success: true,
      data: {
        product_info: {
          id: product.id,
          name: product.name,
          current_base_price: currentPrice,
          current_unit_cost: parseFloat(product.unit_cost || '0')
        },
        pricing_history: priceChanges.map(change => {
          const oldPrice = parseFloat(String(change.old_base_price || '0'));
          const newPrice = parseFloat(String(change.new_base_price || '0'));
          const oldCost = parseFloat(String(change.old_unit_cost || '0'));
          const newCost = parseFloat(String(change.new_unit_cost || '0'));
          
          return {
            id: change.id,
            old_base_price: oldPrice,
            new_base_price: newPrice,
            old_unit_cost: oldCost,
            new_unit_cost: newCost,
            price_difference: newPrice - oldPrice,
            percentage_change: oldPrice > 0 
              ? ((newPrice - oldPrice) / oldPrice * 100).toFixed(2)
              : '0',
            reason: change.reason,
            changed_by: change.user_profiles,
            changed_at: change.created_at
          };
        }),
        statistics: priceStats,
        price_timeline: pricesOverTime
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in getProductPricingHistory:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

// POST /api/products/library/:id/mockups - upload mockup for a product
export async function uploadProductMockup(req: Request, res: Response) {
  try {
    const { productId } = req.params;
    const { 
      image_type = 'mockup',
      alt_text = '',
      metadata = '{}',
      notes = ''
    } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided',
        error_code: 'MISSING_FILE'
      });
    }

    // Get user info for attribution
    const userId = (req as any).user?.id;
    const userEmail = (req as any).user?.email || 'unknown';

    console.log(`Uploading mockup for product ${productId} by user ${userEmail}`);

    // Verify product exists
    const { data: product, error: productError } = await supabase
      .from('catalog_items')
      .select('id, name, sku')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
        error_code: 'PRODUCT_NOT_FOUND'
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

    // Parse metadata safely
    let parsedMetadata = {};
    try {
      parsedMetadata = typeof metadata === 'string' ? JSON.parse(metadata) : {};
    } catch (e) {
      console.warn('Invalid metadata JSON, using empty object');
    }

    // Insert into catalog_item_image_history table (our new schema)
    const { data: mockup, error: insertError } = await supabase
      .from('catalog_item_image_history')
      .insert({
        catalog_item_id: productId,
        image_path: paths.large, // Store the path for reference
        image_url: urls.image_url,
        designer_id: userId, // Use actual user ID from auth
        image_type: image_type,
        alt_text: alt_text || `${image_type} for ${product.name}`,
        metadata: {
          ...parsedMetadata,
          file_sizes: {
            original: req.file.size,
            thumbnail_url: urls.thumbnail_url,
            medium_url: urls.medium_url,
            large_url: urls.image_url
          },
          upload_details: {
            original_filename: req.file.originalname,
            mimetype: req.file.mimetype,
            processing_timestamp: new Date().toISOString()
          },
          designer_notes: notes
        },
        is_active: true,
        upload_timestamp: new Date().toISOString()
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

    res.status(201).json({
      success: true,
      data: {
        mockup: {
          id: mockup.id,
          catalog_item_id: mockup.catalog_item_id,
          image_url: mockup.image_url,
          image_type: mockup.image_type,
          alt_text: mockup.alt_text,
          designer_id: mockup.designer_id,
          upload_timestamp: mockup.upload_timestamp,
          is_active: mockup.is_active,
          metadata: mockup.metadata
        },
        urls: {
          thumbnail: urls.thumbnail_url,
          medium: urls.medium_url,
          large: urls.image_url,
          original: urls.original
        }
      },
      message: 'Mockup uploaded and processed successfully',
      timestamp: new Date().toISOString()
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

// GET /api/products/library/:id/mockups - fetch mockups for a product
export async function getProductMockups(req: Request, res: Response) {
  try {
    const { productId } = req.params;
    const { 
      image_type, 
      active_only = 'true',
      limit = '50',
      include_designer_info = 'false'
    } = req.query;

    // Validate product exists first
    const { data: product, error: productError } = await supabase
      .from('catalog_items')
      .select('id, name, sku')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
        error_code: 'PRODUCT_NOT_FOUND'
      });
    }

    // Build query for our new schema
    let query = supabase
      .from('catalog_item_image_history')
      .select(`
        *,
        ${include_designer_info === 'true' ? `
        user_profiles!catalog_item_image_history_designer_id_fkey(
          id,
          username,
          first_name,
          last_name,
          role
        )
        ` : ''}
      `)
      .eq('catalog_item_id', productId)
      .order('upload_timestamp', { ascending: false })
      .limit(parseInt(limit as string));

    // Apply filters
    if (active_only === 'true') {
      query = query.eq('is_active', true);
    }

    if (image_type && typeof image_type === 'string') {
      query = query.eq('image_type', image_type);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching mockups:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch mockups'
      });
    }

    // Process and enhance the mockups data
    const processedMockups = data?.map(mockup => ({
      id: mockup.id,
      catalog_item_id: mockup.catalog_item_id,
      image_url: mockup.image_url,
      image_path: mockup.image_path,
      image_type: mockup.image_type,
      alt_text: mockup.alt_text,
      is_active: mockup.is_active,
      upload_timestamp: mockup.upload_timestamp,
      created_at: mockup.created_at,
      metadata: mockup.metadata,
      designer: include_designer_info === 'true' ? mockup.user_profiles : undefined
    }));

    // Calculate statistics
    const stats = {
      total_mockups: processedMockups?.length || 0,
      image_types: [...new Set(processedMockups?.map(m => m.image_type) || [])],
      latest_upload: processedMockups && processedMockups.length > 0 ? processedMockups[0].upload_timestamp : null,
      active_mockups: processedMockups?.filter(m => m.is_active).length || 0
    };

    res.json({
      success: true,
      data: {
        product_info: {
          id: product.id,
          name: product.name,
          sku: product.sku
        },
        mockups: processedMockups || [],
        statistics: stats,
        filters_applied: {
          image_type: image_type || null,
          active_only: active_only === 'true',
          include_designer_info: include_designer_info === 'true'
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in getProductMockups:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

// Enhanced Routes with proper role-based access control
// GET /api/products/library - fetch all products with metadata (all authenticated users)
router.get('/', requireAuth, getProductLibrary);

// GET /api/products/library/:id - get individual product details (all authenticated users)
router.get('/:id', requireAuth, getProductById);

// POST /api/products/library - create new product (admin and salesperson only)
router.post('/', requireAuth, requireRole(['admin', 'salesperson']), async (req: Request, res: Response) => {
  try {
    const userEmail = (req as any).user?.email || 'unknown';
    
    const { data, error } = await supabase
      .from('catalog_items')
      .insert({
        ...req.body,
        created_by: userEmail,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating catalog item:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create catalog item'
      });
    }

    res.status(201).json({
      success: true,
      data: data
    });
  } catch (error) {
    console.error('Error in create catalog item:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// PATCH /api/products/library/:id - update product (admin and salesperson only)
router.patch('/:id', requireAuth, requireRole(['admin', 'salesperson']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('catalog_items')
      .update({
        ...req.body,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating catalog item:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update catalog item'
      });
    }

    res.json({
      success: true,
      data: data
    });
  } catch (error) {
    console.error('Error in update catalog item:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// DELETE /api/products/library/:id - delete product (admin only)
router.delete('/:id', requireAuth, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const { error } = await supabase
      .from('catalog_items')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting catalog item:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete catalog item'
      });
    }

    res.json({
      success: true,
      message: 'Catalog item deleted successfully'
    });
  } catch (error) {
    console.error('Error in delete catalog item:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET /api/products/library/categories - get product categories (all authenticated users)
router.get('/categories', requireAuth, getProductCategories);

// GET /api/products/library/:id/pricing-history - get historical pricing data (restricted access)
router.get('/:productId/pricing-history', requireAuth, requireRole(['admin', 'salesperson', 'designer']), getProductPricingHistory);

// POST /api/products/library/:id/mockups - upload mockup for a product (designers and admins only)
router.post('/:productId/mockups', requireAuth, requireRole(['admin', 'designer']), upload.single('mockup'), uploadProductMockup);

// GET /api/products/library/:id/mockups - fetch mockups for a product (all authenticated users)  
router.get('/:productId/mockups', requireAuth, getProductMockups);

// POST /api/products/library - add new product to library (admin and salesperson only)
router.post('/', requireAuth, requireRole(['admin', 'salesperson']), addProductToLibrary);

// POST /api/products/library/:productId/copy - copy product to order (admin and salesperson only)
router.post('/:productId/copy', requireAuth, requireRole(['admin', 'salesperson']), copyProductToOrder);

export default router;

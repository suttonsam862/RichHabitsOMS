import { Request, Response, Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { requireAuth, requireRole } from '../auth/auth';

const router = Router();

// Create service role client for admin operations
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

interface OrderItem {
  id?: string;
  order_id?: string;
  product_name: string;
  description: string;
  color: string;
  size: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  catalog_item_id?: string;
}

interface Order {
  id?: string;
  order_number: string;
  customer_id: string;
  status: string;
  total_amount: number;
  tax?: number;
  notes?: string;
  logo_url?: string;
  company_name?: string;
  items?: OrderItem[];
}

/**
 * Get all orders with customer information
 */
async function getAllOrders(req: Request, res: Response) {
  try {
    console.log('Fetching all orders...');

    // First try to get orders with customer join and correct column names
    const { data: orders, error } = await supabaseAdmin
      .from('orders')
      .select(`
        *,
        customers:customer_id (
          id,
          first_name,
          last_name,
          email,
          company
        ),
        order_items (
          id,
          product_name,
          description,
          color,
          size,
          quantity,
          unit_price,
          total_price,
          catalog_item_id
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching orders with join:', error);

      // Fallback: try to get orders without join
      const { data: basicOrders, error: basicError } = await supabaseAdmin
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (basicError) {
        console.error('Error fetching basic orders:', basicError);
        return res.status(500).json({
          success: false,
          message: 'Failed to fetch orders: ' + basicError.message,
          data: []
        });
      }

      console.log(`Found ${basicOrders?.length || 0} orders (without customer data)`);
      return res.json({
        success: true,
        data: basicOrders || [],
        count: basicOrders?.length || 0
      });
    }

    // Transform data for frontend
    const transformedOrders = orders?.map(order => ({
      id: order.id,
      orderNumber: order.order_number,
      customerId: order.customer_id,
      status: order.status,
      totalAmount: parseFloat(order.total_amount) || 0,
      tax: parseFloat(order.tax) || 0,
      notes: order.notes || '',
      logoUrl: order.logo_url,
      companyName: order.company_name || order.customers?.company || 'Unknown Company',
      createdAt: order.created_at,
      updatedAt: order.updated_at,
      customer: order.customers,
      items: order.order_items || []
    })) || [];

    console.log(`Found ${orders?.length || 0} orders with customer data`);
    res.json(transformedOrders);

  } catch (error) {
    console.error('Error in getAllOrders:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: []
    });
  }
}

/**
 * Create a new order with items - FIXED VERSION
 */
async function createOrder(req: Request, res: Response) {
  try {
    const orderData = req.body;
    const {
      orderNumber,
      customerId,
      status = 'draft',
      totalAmount,
      tax = 0,
      notes = '',
      logoUrl,
      companyName,
      items = []
    } = orderData;

    console.log('📝 Creating new order:', { 
      orderNumber, 
      customerId, 
      itemCount: items.length,
      totalAmount,
      status
    });

    // Enhanced validation
    if (!orderNumber?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Order number is required and cannot be empty'
      });
    }

    if (!customerId?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Customer ID is required'
      });
    }

    // Validate UUID format for customerId
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(customerId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid customer ID format. Must be a valid UUID.'
      });
    }

    if (totalAmount === undefined || totalAmount === null || isNaN(totalAmount) || totalAmount < 0) {
      return res.status(400).json({
        success: false,
        message: 'Total amount is required and must be a valid non-negative number'
      });
    }

    // Validate items if provided
    if (items && items.length > 0) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const itemName = item.productName || item.product_name;
        const itemQuantity = item.quantity || 0;
        const itemUnitPrice = item.unitPrice || item.unit_price || 0;

        if (!itemName?.trim()) {
          return res.status(400).json({
            success: false,
            message: `Item ${i + 1}: Product name is required`
          });
        }

        if (!itemQuantity || itemQuantity <= 0) {
          return res.status(400).json({
            success: false,
            message: `Item ${i + 1}: Quantity must be greater than 0`
          });
        }

        if (itemUnitPrice < 0) {
          return res.status(400).json({
            success: false,
            message: `Item ${i + 1}: Unit price cannot be negative`
          });
        }
      }
    }

    // Check if customer exists
    const { data: customerExists, error: customerError } = await supabaseAdmin
      .from('customers')
      .select('id')
      .eq('id', customerId)
      .single();

    if (customerError || !customerExists) {
      return res.status(400).json({
        success: false,
        message: 'Customer not found. Please select a valid customer.'
      });
    }

    // Start order creation transaction
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        order_number: orderNumber.trim(),
        customer_id: customerId,
        status,
        total_amount: totalAmount,
        tax: tax || 0,
        notes: notes?.trim() || null,
        logo_url: logoUrl || null,
        company_name: companyName?.trim() || null
      })
      .select()
      .single();

    if (orderError) {
      console.error('❌ Error creating order:', orderError);
      
      // Provide specific error messages for common issues
      if (orderError.code === '23505') {
        return res.status(409).json({
          success: false,
          message: `Order number "${orderNumber}" already exists. Please use a unique order number.`
        });
      }
      
      if (orderError.code === '23503') {
        return res.status(400).json({
          success: false,
          message: 'Invalid customer reference. Please select a valid customer.'
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Failed to create order',
        error: orderError.message,
        details: orderError.details || null
      });
    }

    console.log('✅ Order created successfully:', order.id);

    // Add order items if provided
    const createdItems = [];
    if (items && items.length > 0) {
      console.log('📦 Adding order items...');
      
      const orderItems = items.map((item: any) => ({
        order_id: order.id,
        product_name: (item.productName || item.product_name || '').trim(),
        description: (item.description || '').trim() || null,
        color: (item.color || '').trim() || null,
        size: (item.size || '').trim() || null,
        quantity: parseInt(item.quantity) || 1,
        unit_price: parseFloat(item.unitPrice || item.unit_price) || 0,
        total_price: parseFloat(item.totalPrice || item.total_price) || 
                     (parseFloat(item.unitPrice || item.unit_price || 0) * parseInt(item.quantity || 1)),
        catalog_item_id: item.catalogItemId || item.catalog_item_id || null
      }));

      console.log('Order items to insert:', JSON.stringify(orderItems, null, 2));

      const { data: insertedItems, error: itemsError } = await supabaseAdmin
        .from('order_items')
        .insert(orderItems)
        .select();

      if (itemsError) {
        console.error('❌ Error creating order items:', itemsError);
        
        // Rollback order creation
        await supabaseAdmin.from('orders').delete().eq('id', order.id);
        
        return res.status(500).json({
          success: false,
          message: 'Failed to create order items. Order has been cancelled.',
          error: itemsError.message,
          details: itemsError.details || null
        });
      }

      createdItems.push(...(insertedItems || []));
      console.log(`✅ Created ${createdItems.length} order items`);
    }

    // Return success response with comprehensive data
    const responseOrder = {
      id: order.id,
      orderNumber: order.order_number,
      customerId: order.customer_id,
      status: order.status,
      totalAmount: parseFloat(order.total_amount),
      tax: parseFloat(order.tax || 0),
      notes: order.notes,
      logoUrl: order.logo_url,
      companyName: order.company_name,
      createdAt: order.created_at,
      items: createdItems.map(item => ({
        id: item.id,
        productName: item.product_name,
        description: item.description,
        color: item.color,
        size: item.size,
        quantity: item.quantity,
        unitPrice: parseFloat(item.unit_price),
        totalPrice: parseFloat(item.total_price),
        catalogItemId: item.catalog_item_id
      }))
    };

    return res.status(201).json({
      success: true,
      message: `Order "${order.order_number}" created successfully with ${createdItems.length} item(s)`,
      data: responseOrder
    });

  } catch (error: any) {
    console.error('💥 Unexpected error in createOrder:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during order creation',
      error: error.message
    });
  }
}

// Apply middleware and define routes
router.use(requireAuth);

router.get('/', getAllOrders);
router.post('/', createOrder);

export default router;
import { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

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

// Validation schemas
// Schema that matches the ACTUAL order_items database structure
const orderItemSchema = z.object({
  product_name: z.string().min(1, "Product name is required"),
  description: z.string().optional(),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  unit_price: z.number().min(0, "Unit price must be non-negative"),
  total_price: z.number().min(0, "Total price must be non-negative"),
  color: z.string().optional(),
  size: z.string().optional()
});

// Schema that matches the ACTUAL database structure
const createOrderSchema = z.object({
  customer_id: z.string().uuid("Customer ID must be a valid UUID"),
  order_number: z.string().optional(),
  salesperson_id: z.string().uuid().optional().nullable(),
  status: z.enum(['draft', 'in_design', 'pending_production', 'in_production', 'completed', 'cancelled']).default('draft'),
  total_amount: z.number().min(0, "Total amount must be non-negative").optional(),
  tax: z.number().min(0).optional().default(0),
  notes: z.string().optional().nullable(),
  is_paid: z.boolean().default(false),
  stripe_session_id: z.string().optional().nullable(),
  payment_date: z.string().optional().nullable(),
  items: z.array(orderItemSchema).min(1, "At least one item is required")
});

const updateOrderSchema = createOrderSchema.partial().omit({ items: true });

// Helper function to generate order number
function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `ORD-${timestamp}-${random}`;
}

// Helper function to validate customer exists
async function validateCustomerExists(customerId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('customers')
    .select('id')
    .eq('id', customerId)
    .single();
  
  return !error && !!data;
}

// Helper function to calculate total amount from items
function calculateTotalAmount(items: any[]): number {
  return items.reduce((total, item) => {
    const itemTotal = item.total_price || (item.quantity * item.unit_price);
    return total + itemTotal;
  }, 0);
}

/**
 * Create a new order with items using database transaction
 */
export async function createOrder(req: Request, res: Response) {
  try {
    console.log('🆕 Creating new order with items...');
    console.log('📝 Request body:', JSON.stringify(req.body, null, 2));

    // Validate request body
    const validationResult = createOrderSchema.safeParse(req.body);
    if (!validationResult.success) {
      console.error('❌ Validation errors:', validationResult.error.errors);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationResult.error.errors
      });
    }

    const orderData = validationResult.data;
    
    // Validate customer exists
    const customerExists = await validateCustomerExists(orderData.customer_id);
    if (!customerExists) {
      console.error('❌ Customer not found:', orderData.customer_id);
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Generate order number if not provided
    if (!orderData.order_number) {
      orderData.order_number = generateOrderNumber();
    }

    // Calculate total amount if not provided
    if (!orderData.total_amount) {
      orderData.total_amount = calculateTotalAmount(orderData.items);
    }

    // Prepare order data (excluding items for separate insertion)
    const { items, ...orderPayload } = orderData;

    // Transform to match ACTUAL database columns
    const dbOrderData = {
      customer_id: orderPayload.customer_id,
      order_number: orderPayload.order_number,
      salesperson_id: orderPayload.salesperson_id || null,
      status: orderPayload.status,
      total_amount: orderPayload.total_amount,
      tax: orderPayload.tax || 0,
      notes: orderPayload.notes || null,
      is_paid: orderPayload.is_paid || false,
      stripe_session_id: orderPayload.stripe_session_id || null,
      payment_date: orderPayload.payment_date || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('💾 Inserting order:', dbOrderData);

    // Start transaction - Create order first
    const { data: newOrder, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert(dbOrderData)
      .select()
      .single();

    if (orderError) {
      console.error('❌ Error creating order:', orderError);
      return res.status(500).json({
        success: false,
        message: 'Failed to create order',
        error: orderError.message
      });
    }

    console.log('✅ Order created successfully:', newOrder.id);

    // Prepare order items data to match ACTUAL database structure
    const orderItemsData = items.map((item, index) => ({
      order_id: newOrder.id,
      product_name: item.product_name,
      description: item.description || '',
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price || (item.quantity * item.unit_price),
      color: item.color || '',
      size: item.size || ''
    }));

    console.log('📦 Inserting order items:', orderItemsData.length);

    // Insert order items
    const { data: newOrderItems, error: itemsError } = await supabaseAdmin
      .from('order_items')
      .insert(orderItemsData)
      .select();

    if (itemsError) {
      console.error('❌ Error creating order items:', itemsError);
      
      // Rollback: Delete the order if items creation failed
      await supabaseAdmin
        .from('orders')
        .delete()
        .eq('id', newOrder.id);

      return res.status(500).json({
        success: false,
        message: 'Failed to create order items, order rolled back',
        error: itemsError.message
      });
    }

    console.log('✅ Order items created successfully:', newOrderItems.length);

    // Return the complete order with items
    const completeOrder = {
      ...newOrder,
      items: newOrderItems
    };

    return res.status(201).json({
      success: true,
      message: 'Order created successfully',
      order: completeOrder
    });

  } catch (error) {
    console.error('💥 Unexpected error creating order:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Get order by ID with items and customer information
 */
export async function getOrderById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    console.log('🔍 Fetching order by ID:', id);

    // Validate UUID format
    if (!id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID format'
      });
    }

    // Get order with customer information
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select(`
        *,
        customers:customer_id (
          id,
          first_name,
          last_name,
          email,
          company,
          phone
        )
      `)
      .eq('id', id)
      .single();

    if (orderError) {
      console.error('❌ Error fetching order:', orderError);
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Get order items
    const { data: orderItems, error: itemsError } = await supabaseAdmin
      .from('order_items')
      .select('*')
      .eq('order_id', id)
      .order('line_number', { ascending: true });

    if (itemsError) {
      console.error('❌ Error fetching order items:', itemsError);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch order items',
        error: itemsError.message
      });
    }

    // Combine order with items
    const completeOrder = {
      ...order,
      items: orderItems || []
    };

    console.log('✅ Order fetched successfully:', id);

    return res.json({
      success: true,
      order: completeOrder
    });

  } catch (error) {
    console.error('💥 Unexpected error fetching order:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

/**
 * Update order (excluding items, which should be managed separately)
 */
export async function updateOrder(req: Request, res: Response) {
  try {
    const { id } = req.params;
    console.log('📝 Updating order:', id);

    // Validate request body
    const validationResult = updateOrderSchema.safeParse(req.body);
    if (!validationResult.success) {
      console.error('❌ Validation errors:', validationResult.error.errors);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationResult.error.errors
      });
    }

    const updateData = validationResult.data;

    // Transform to match ACTUAL database columns
    const dbUpdateData = {
      ...(updateData.customer_id && { customer_id: updateData.customer_id }),
      ...(updateData.order_number && { order_number: updateData.order_number }),
      ...(updateData.salesperson_id !== undefined && { salesperson_id: updateData.salesperson_id }),
      ...(updateData.status && { status: updateData.status }),
      ...(updateData.total_amount !== undefined && { total_amount: updateData.total_amount }),
      ...(updateData.tax !== undefined && { tax: updateData.tax }),
      ...(updateData.notes !== undefined && { notes: updateData.notes }),
      ...(updateData.is_paid !== undefined && { is_paid: updateData.is_paid }),
      ...(updateData.stripe_session_id !== undefined && { stripe_session_id: updateData.stripe_session_id }),
      ...(updateData.payment_date !== undefined && { payment_date: updateData.payment_date }),
      updated_at: new Date().toISOString()
    };

    // Update order
    const { data: updatedOrder, error } = await supabaseAdmin
      .from('orders')
      .update(dbUpdateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('❌ Error updating order:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update order',
        error: error.message
      });
    }

    console.log('✅ Order updated successfully:', id);

    return res.json({
      success: true,
      message: 'Order updated successfully',
      order: updatedOrder
    });

  } catch (error) {
    console.error('💥 Unexpected error updating order:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

/**
 * Get all orders with pagination and filtering
 */
export async function getAllOrders(req: Request, res: Response) {
  try {
    console.log('📋 Fetching all orders with filters...');
    
    const { 
      page = 1, 
      limit = Math.min(Number(req.query.limit) || 20, 100), // Enforce max limit of 100
      status, 
      customer_id, 
      priority,
      search 
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);

    // Build query
    let query = supabaseAdmin
      .from('orders')
      .select(`
        *,
        customers:customer_id (
          id,
          first_name,
          last_name,
          email,
          company
        )
      `, { count: 'exact' });

    // Apply filters (only for columns that exist)
    if (status) query = query.eq('status', status);
    if (customer_id) query = query.eq('customer_id', customer_id);
    if (search) {
      query = query.or(`order_number.ilike.%${search}%,notes.ilike.%${search}%`);
    }

    // Apply pagination and ordering
    const { data: orders, error, count } = await query
      .range(offset, offset + Number(limit) - 1)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching orders:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch orders',
        error: error.message
      });
    }

    console.log(`✅ Fetched ${orders?.length || 0} orders`);

    return res.json({
      success: true,
      orders: orders || [],
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count || 0,
        totalPages: Math.ceil((count || 0) / Number(limit))
      }
    });

  } catch (error) {
    console.error('💥 Unexpected error fetching orders:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

/**
 * Delete order and all associated items
 */
export async function deleteOrder(req: Request, res: Response) {
  try {
    const { id } = req.params;
    console.log('🗑️ Deleting order:', id);

    // First delete order items
    const { error: itemsError } = await supabaseAdmin
      .from('order_items')
      .delete()
      .eq('order_id', id);

    if (itemsError) {
      console.error('❌ Error deleting order items:', itemsError);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete order items',
        error: itemsError.message
      });
    }

    // Then delete the order
    const { data: deletedOrder, error: orderError } = await supabaseAdmin
      .from('orders')
      .delete()
      .eq('id', id)
      .select()
      .single();

    if (orderError) {
      console.error('❌ Error deleting order:', orderError);
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    console.log('✅ Order deleted successfully:', id);

    return res.json({
      success: true,
      message: 'Order deleted successfully',
      order: deletedOrder
    });

  } catch (error) {
    console.error('💥 Unexpected error deleting order:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

/**
 * Add item to existing order
 */
export async function addOrderItem(req: Request, res: Response) {
  try {
    const { id: orderId } = req.params;
    console.log('➕ Adding item to order:', orderId);

    // Validate item data
    const validationResult = orderItemSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationResult.error.errors
      });
    }

    const itemData = validationResult.data;

    // No need for line numbers since they don't exist in schema

    const dbItemData = {
      order_id: orderId,
      product_name: itemData.product_name,
      description: itemData.description || '',
      quantity: itemData.quantity,
      unit_price: itemData.unit_price,
      total_price: itemData.total_price || (itemData.quantity * itemData.unit_price),
      color: itemData.color || '',
      size: itemData.size || ''
    };

    const { data: newItem, error } = await supabaseAdmin
      .from('order_items')
      .insert(dbItemData)
      .select()
      .single();

    if (error) {
      console.error('❌ Error adding order item:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to add order item',
        error: error.message
      });
    }

    console.log('✅ Order item added successfully');

    return res.status(201).json({
      success: true,
      message: 'Order item added successfully',
      item: newItem
    });

  } catch (error) {
    console.error('💥 Unexpected error adding order item:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

/**
 * Get order items for a specific order
 */
export async function getOrderItems(req: Request, res: Response) {
  try {
    const { id: orderId } = req.params;
    console.log('📦 Fetching order items for order:', orderId);

    const { data: items, error } = await supabaseAdmin
      .from('order_items')
      .select('*')
      .eq('order_id', orderId)
      .order('id', { ascending: true })
      .limit(100);

    if (error) {
      console.error('❌ Error fetching order items:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch order items',
        error: error.message
      });
    }

    console.log(`✅ Fetched ${items?.length || 0} order items`);

    return res.json({
      success: true,
      items: items || []
    });

  } catch (error) {
    console.error('💥 Unexpected error fetching order items:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

export default {
  createOrder,
  getOrderById,
  updateOrder,
  getAllOrders,
  deleteOrder,
  addOrderItem,
  getOrderItems
};
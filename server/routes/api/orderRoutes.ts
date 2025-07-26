/**
 * Order management routes - Phase 5 of Database Synchronization Checklist
 */
import { Request, Response, Router } from 'express';
import { supabase } from '../../db.js';
import { requireAuth, requireRole } from '../auth/auth.js';

const router = Router();

/**
 * GET /api/orders - List orders with filters and pagination
 */
export async function getOrders(req: Request, res: Response) {
  try {
    console.log('📋 Fetching orders...');
    
    const { 
      page = 1, 
      limit = 20, 
      status, 
      customerId,
      startDate,
      endDate
    } = req.query;

    let query = supabase
      .from('orders')
      .select(`
        *,
        customers(first_name, last_name, email, company),
        order_items(id, product_name, quantity, unit_price, total_price)
      `)
      .order('created_at', { ascending: false });

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }
    if (customerId) {
      query = query.eq('customerId', customerId);
    }
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    // Apply pagination
    const offset = (Number(page) - 1) * Number(limit);
    query = query.range(offset, offset + Number(limit) - 1);

    const { data: orders, error, count } = await query;

    if (error) {
      console.error('Error fetching orders:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch orders',
        error: error.message
      });
    }

    res.json({
      success: true,
      data: orders || [],
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count || 0,
        pages: Math.ceil((count || 0) / Number(limit))
      }
    });
  } catch (error: any) {
    console.error('Orders fetch failed:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}

/**
 * GET /api/orders/:id - Get specific order details
 */
export async function getOrder(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        *,
        customers(first_name, last_name, email, company, phone),
        order_items(*),
        design_tasks(*),
        production_tasks(*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }
      throw error;
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error: any) {
    console.error('Order fetch failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order',
      error: error.message
    });
  }
}

/**
 * POST /api/orders - Create new order
 */
export async function createOrder(req: Request, res: Response) {
  try {
    const {
      customerId,
      orderNumber,
      status = 'draft',
      totalAmount = '0',
      tax = '0',
      notes,
      items = []
    } = req.body;

    // Validate required fields
    if (!customerId) {
      return res.status(400).json({
        success: false,
        message: 'Customer ID is required'
      });
    }

    // Create order with auto-generated order number if not provided
    const finalOrderNumber = orderNumber || `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

    const { data: newOrder, error: orderError } = await supabase
      .from('orders')
      .insert({
        customer_id: customerId,
        order_number: finalOrderNumber,
        status,
        total_amount: totalAmount,
        tax,
        notes
      })
      .select()
      .single();

    if (orderError) {
      console.error('Order creation error:', orderError);
      return res.status(500).json({
        success: false,
        message: 'Failed to create order',
        error: orderError.message
      });
    }

    // Create order items if provided
    if (items.length > 0) {
      const orderItems = items.map((item: any) => ({
        order_id: newOrder.id,
        product_name: item.productName,
        description: item.description,
        size: item.size,
        color: item.color,
        quantity: item.quantity || '1',
        unit_price: item.unitPrice,
        total_price: item.totalPrice || item.unitPrice,
        catalog_item_id: item.catalogItemId
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) {
        console.error('Order items creation error:', itemsError);
        // Don't fail the entire order creation, just log the error
      }
    }

    res.status(201).json({
      success: true,
      data: newOrder,
      message: 'Order created successfully'
    });
  } catch (error: any) {
    console.error('Order creation failed:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}

/**
 * PUT /api/orders/:id - Update order
 */
export async function updateOrder(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Remove read-only fields
    delete updateData.id;
    delete updateData.created_at;
    
    // Add updated timestamp
    updateData.updated_at = new Date().toISOString();

    const { data: updatedOrder, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }
      throw error;
    }

    res.json({
      success: true,
      data: updatedOrder,
      message: 'Order updated successfully'
    });
  } catch (error: any) {
    console.error('Order update failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update order',
      error: error.message
    });
  }
}

/**
 * PUT /api/orders/:id/status - Update order status
 */
export async function updateOrderStatus(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    const { data: updatedOrder, error } = await supabase
      .from('orders')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }
      throw error;
    }

    res.json({
      success: true,
      data: updatedOrder,
      message: 'Order status updated successfully'
    });
  } catch (error: any) {
    console.error('Order status update failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update order status',
      error: error.message
    });
  }
}

// Apply authentication middleware
router.use(requireAuth);

// Order routes
router.get('/', getOrders);
router.get('/:id', getOrder);
router.post('/', createOrder);
router.put('/:id', updateOrder);
router.put('/:id/status', updateOrderStatus);

export default router;
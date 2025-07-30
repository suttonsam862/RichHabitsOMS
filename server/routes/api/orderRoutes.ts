import { Router, Request, Response } from 'express';
import { requireAuth, requireRole } from '../auth/auth';
import orderController from '../../controllers/orderController';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

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

// Validation schemas
const orderItemSchema = z.object({
  product_name: z.string().min(1, "Product name is required"),
  description: z.string().optional(),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  unit_price: z.number().min(0, "Unit price must be non-negative"),
  total_price: z.number().min(0, "Total price must be non-negative"),
  color: z.string().optional(),
  size: z.string().optional()
});

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
async function createOrder(req: Request, res: Response) {
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

    // Transform to match database columns
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

    // Begin transaction by inserting order first
    const { data: createdOrder, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert(dbOrderData)
      .select()
      .single();

    if (orderError) {
      console.error('❌ Order creation failed:', orderError);
      return res.status(500).json({
        success: false,
        message: 'Failed to create order',
        error: orderError.message
      });
    }

    console.log('✅ Order created successfully:', createdOrder.id);

    // Prepare order items with the new order ID
    const orderItemsData = items.map(item => ({
      order_id: createdOrder.id,
      product_name: item.product_name,
      description: item.description || null,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price,
      color: item.color || null,
      size: item.size || null,
      catalog_item_id: null // Can be linked later if needed
    }));

    console.log('📦 Inserting order items:', orderItemsData.length);

    // Insert order items
    const { data: createdItems, error: itemsError } = await supabaseAdmin
      .from('order_items')
      .insert(orderItemsData)
      .select();

    if (itemsError) {
      console.error('❌ Order items creation failed:', itemsError);
      
      // Rollback: Delete the created order
      await supabaseAdmin
        .from('orders')
        .delete()
        .eq('id', createdOrder.id);

      return res.status(500).json({
        success: false,
        message: 'Failed to create order items, order rolled back',
        error: itemsError.message
      });
    }

    console.log('✅ Order items created successfully:', createdItems.length);

    // Return simplified structure with order and items
    res.status(201).json({
      order: createdOrder,
      items: createdItems
    });

  } catch (error: any) {
    console.error('💥 Order creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}

/**
 * Order Routes - Using transaction-based order creation
 */

// GET /api/orders - Get all orders with filtering and pagination
router.get('/', requireAuth, orderController.getAllOrders);

// GET /api/orders/:id - Get specific order by ID
router.get('/:id', requireAuth, orderController.getOrderById);

// POST /api/orders - Create new order with items
router.post('/', requireAuth, requireRole(['admin', 'salesperson']), createOrder);

// POST /api/orders/create - Create new order with items (alternative endpoint)
router.post('/create', requireAuth, requireRole(['admin', 'salesperson']), createOrder);

// PUT /api/orders/:id - Update order (excluding items)
router.put('/:id', requireAuth, requireRole(['admin', 'salesperson']), orderController.updateOrder);

// DELETE /api/orders/:id - Delete order and all items
router.delete('/:id', requireAuth, requireRole(['admin', 'salesperson']), orderController.deleteOrder);

// GET /api/orders/:id/items - Get order items
router.get('/:id/items', requireAuth, orderController.getOrderItems);

// POST /api/orders/:id/items - Add item to existing order
router.post('/:id/items', requireAuth, requireRole(['admin', 'salesperson']), orderController.addOrderItem);

export default router;
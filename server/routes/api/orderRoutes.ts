import { Router, Request, Response } from 'express';
import { requireAuth, requireRole } from '../auth/auth';
import orderController from '../../controllers/orderController';
import { OrderAuditLogger } from '../../services/auditLogger.js';
import { AUDIT_ACTIONS } from '../../models/orderAuditLog.js';
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
  catalog_item_id: z.string().uuid("Catalog item ID must be a valid UUID").optional().nullable(),
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

// Enhanced validation schema for PATCH updates
const updateOrderItemSchema = z.object({
  id: z.string().uuid().optional(),
  catalog_item_id: z.string().uuid("Catalog item ID must be a valid UUID").optional(),
  catalogItemId: z.string().uuid("Catalog item ID must be a valid UUID").optional(),
  product_name: z.string().min(1).optional(),
  productName: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  quantity: z.number().min(1).optional(),
  unit_price: z.number().min(0).optional(),
  unitPrice: z.number().min(0).optional(),
  total_price: z.number().min(0).optional(),
  totalPrice: z.number().min(0).optional(),
  color: z.string().optional().nullable(),
  size: z.string().optional().nullable(),
  fabric: z.string().optional().nullable(),
  customization: z.string().optional().nullable(),
  status: z.enum(['pending', 'designing', 'approved', 'in_production', 'completed']).optional(),
  production_notes: z.string().optional().nullable(),
  productionNotes: z.string().optional().nullable(),
  estimated_completion_date: z.string().optional().nullable(),
  estimatedCompletionDate: z.string().optional().nullable()
});

const patchOrderSchema = z.object({
  id: z.string().uuid().optional(),
  orderNumber: z.string().optional(),
  order_number: z.string().optional(),
  customerId: z.string().uuid().optional(),
  customer_id: z.string().uuid().optional(),
  status: z.enum([
    'draft', 
    'pending_design', 
    'design_in_progress', 
    'design_review', 
    'design_approved', 
    'pending_production', 
    'in_production', 
    'completed', 
    'cancelled'
  ]).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  assignedDesignerId: z.string().uuid().optional().nullable(),
  assigned_designer_id: z.string().uuid().optional().nullable(),
  assignedManufacturerId: z.string().uuid().optional().nullable(),
  assigned_manufacturer_id: z.string().uuid().optional().nullable(),
  salesperson_id: z.string().uuid().optional().nullable(),
  notes: z.string().optional().nullable(),
  internalNotes: z.string().optional().nullable(),
  internal_notes: z.string().optional().nullable(),
  customerRequirements: z.string().optional().nullable(),
  customer_requirements: z.string().optional().nullable(),
  deliveryAddress: z.string().optional().nullable(),
  delivery_address: z.string().optional().nullable(),
  deliveryInstructions: z.string().optional().nullable(),
  delivery_instructions: z.string().optional().nullable(),
  rushOrder: z.boolean().optional(),
  rush_order: z.boolean().optional(),
  estimatedDeliveryDate: z.string().optional().nullable(),
  estimated_delivery_date: z.string().optional().nullable(),
  actualDeliveryDate: z.string().optional().nullable(),
  actual_delivery_date: z.string().optional().nullable(),
  logoUrl: z.string().optional().nullable(),
  logo_url: z.string().optional().nullable(),
  companyName: z.string().optional().nullable(),
  company_name: z.string().optional().nullable(),
  total_amount: z.number().min(0).optional(),
  totalAmount: z.number().min(0).optional(),
  tax: z.number().min(0).optional(),
  is_paid: z.boolean().optional(),
  items: z.array(updateOrderItemSchema).optional()
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
      return res.status(400).json({
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

    // Transform to match database columns with explicit defaults
    const dbOrderData = {
      customer_id: orderPayload.customer_id,
      order_number: orderPayload.order_number,
      salesperson_id: orderPayload.salesperson_id || null,
      status: orderPayload.status || 'draft',
      total_amount: parseFloat(orderPayload.total_amount?.toString()) || 0.00,
      tax: parseFloat(orderPayload.tax?.toString()) || 0.00,
      discount: 0.00,
      notes: orderPayload.notes || null,
      internal_notes: null,
      customer_requirements: null,
      delivery_address: null,
      delivery_instructions: null,
      priority: 'medium',
      rush_order: false,
      estimated_delivery_date: null,
      actual_delivery_date: null,
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
      return res.status(400).json({
        success: false,
        message: 'Failed to create order',
        error: orderError.message
      });
    }

    console.log('✅ Order created successfully:', createdOrder.id);

    // Prepare order items with explicit defaults
    const orderItemsData = items.map(item => ({
      order_id: createdOrder.id,
      product_name: item.product_name,
      description: item.description || null,
      quantity: parseInt(item.quantity?.toString()) || 1,
      unit_price: parseFloat(item.unit_price?.toString()) || 0.00,
      total_price: parseFloat(item.total_price?.toString()) || 0.00,
      color: item.color || null,
      size: item.size || null,
      fabric: null,
      customization: null,
      status: 'pending',
      production_notes: null,
      estimated_completion_date: null,
      actual_completion_date: null,
      catalog_item_id: item.catalog_item_id || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
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

      return res.status(400).json({
        success: false,
        message: 'Failed to create order items, order rolled back',
        error: itemsError.message
      });
    }

    console.log('✅ Order items created successfully:', createdItems.length);

    // Return simplified structure with order and items
    res.status(201).json({
      success: true,
      order: createdOrder,
      items: createdItems
    });

  } catch (error: any) {
    console.error('💥 Order creation error:', error);
    console.error(error.message);
    res.status(400).json({
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

/**
 * PATCH /api/orders/:id - Update order fields and status with enhanced validation
 */
async function patchOrder(req: Request, res: Response) {
  try {
    const orderId = req.params.id;
    const updateData = req.body;

    console.log(`🔄 PATCH Order ${orderId} - Update request received`);
    console.log('📋 Update data keys:', Object.keys(updateData));

    // Validate order ID format
    if (!orderId || orderId === 'undefined' || orderId === 'null') {
      return res.status(400).json({
        success: false,
        message: 'Valid order ID is required'
      });
    }

    // Validate request body against schema
    let validatedData;
    try {
      validatedData = patchOrderSchema.parse(updateData);
    } catch (validationError: any) {
      console.error('❌ Validation failed:', validationError.errors);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationError.errors
      });
    }

    // Check if order exists
    const { data: existingOrder, error: fetchError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (fetchError || !existingOrder) {
      console.error('❌ Order not found:', fetchError?.message);
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Transform camelCase to snake_case for database
    const dbUpdateData: any = {};
    
    // Handle field mappings with both camelCase and snake_case support
    const fieldMappings = {
      orderNumber: 'order_number',
      customerId: 'customer_id',
      assignedDesignerId: 'assigned_designer_id',
      assignedManufacturerId: 'assigned_manufacturer_id',
      internalNotes: 'internal_notes',
      customerRequirements: 'customer_requirements',
      deliveryAddress: 'delivery_address',
      deliveryInstructions: 'delivery_instructions',
      rushOrder: 'rush_order',
      estimatedDeliveryDate: 'estimated_delivery_date',
      actualDeliveryDate: 'actual_delivery_date',
      logoUrl: 'logo_url',
      companyName: 'company_name',
      totalAmount: 'total_amount'
    };

    // Process each field in the update data
    Object.entries(validatedData).forEach(([key, value]) => {
      if (key === 'items') {
        // Skip items for now - handle separately
        return;
      }
      
      // Map camelCase to snake_case if needed
      const dbField = fieldMappings[key as keyof typeof fieldMappings] || key;
      
      // Only include non-undefined values
      if (value !== undefined) {
        dbUpdateData[dbField] = value;
      }
    });

    // Add updated timestamp
    dbUpdateData.updated_at = new Date().toISOString();

    console.log('🗄️ Database update fields:', Object.keys(dbUpdateData));

    // Update the order
    const { data: updatedOrder, error: updateError } = await supabaseAdmin
      .from('orders')
      .update(dbUpdateData)
      .eq('id', orderId)
      .select('*')
      .single();

    if (updateError) {
      console.error('❌ Order update failed:', updateError.message);
      return res.status(400).json({
        success: false,
        message: 'Failed to update order',
        error: updateError.message
      });
    }

    console.log('✅ Order updated successfully:', updatedOrder.id);

    // Handle comprehensive items update if provided (add, remove, update)
    let updatedItems = null;
    if (validatedData.items && Array.isArray(validatedData.items)) {
      console.log('🔄 Processing comprehensive items update (add/remove/update)...');
      
      try {
        // First, get existing items
        const { data: existingItems } = await supabaseAdmin
          .from('order_items')
          .select('*')
          .eq('order_id', orderId);

        const existingItemIds = new Set(existingItems?.map(item => item.id) || []);
        const newItemIds = new Set(validatedData.items.filter(item => item.id).map(item => item.id));
        
        const itemsToUpdate = [];
        const itemsToInsert = [];
        const itemsToDelete = [];

        console.log(`📊 Items analysis: ${existingItemIds.size} existing, ${validatedData.items.length} in request`);

        // Identify items to delete (existing items not in the new list)
        for (const existingItem of existingItems || []) {
          if (!newItemIds.has(existingItem.id)) {
            itemsToDelete.push(existingItem.id);
          }
        }

        // Process each item in the update request
        for (const item of validatedData.items) {
          // Validate catalog_item_id if provided
          const catalogItemId = item.catalogItemId || item.catalog_item_id;
          if (catalogItemId) {
            const { data: catalogItem, error: catalogError } = await supabaseAdmin
              .from('catalog_items')
              .select('id, name')
              .eq('id', catalogItemId)
              .single();

            if (catalogError || !catalogItem) {
              console.error(`❌ Invalid catalog_item_id: ${catalogItemId}`);
              throw new Error(`Invalid catalog_item_id: ${catalogItemId}. Catalog item not found.`);
            }
            console.log(`✅ Validated catalog item: ${catalogItem.name} (${catalogItemId})`);
          }

          // Transform item data to snake_case with comprehensive field mapping
          const dbItemData: any = {
            order_id: orderId,
            catalog_item_id: catalogItemId || null,
            product_name: item.productName || item.product_name || '',
            description: item.description || '',
            quantity: item.quantity || 1,
            unit_price: item.unitPrice || item.unit_price || 0,
            total_price: item.totalPrice || item.total_price || (item.quantity || 1) * (item.unitPrice || item.unit_price || 0),
            color: item.color || '',
            size: item.size || '',
            fabric: item.fabric || '',
            customization: item.customization || '',
            status: item.status || 'pending',
            production_notes: item.productionNotes || item.production_notes || '',
            estimated_completion_date: item.estimatedCompletionDate || item.estimated_completion_date || null,
            updated_at: new Date().toISOString()
          };

          if (item.id && existingItemIds.has(item.id)) {
            // Update existing item
            itemsToUpdate.push({ id: item.id, ...dbItemData });
            console.log(`🔄 Updating item: ${item.id} - ${dbItemData.product_name}`);
          } else if (!item.id || !existingItemIds.has(item.id)) {
            // Insert new item (remove id if it doesn't exist in database)
            const { id, ...insertData } = dbItemData;
            insertData.created_at = new Date().toISOString();
            itemsToInsert.push(insertData);
            console.log(`➕ Adding new item: ${dbItemData.product_name}`);
          }
        }

        // Perform deletions first
        if (itemsToDelete.length > 0) {
          console.log(`🗑️ Deleting ${itemsToDelete.length} items:`, itemsToDelete);
          const { error: deleteError } = await supabaseAdmin
            .from('order_items')
            .delete()
            .in('id', itemsToDelete);

          if (deleteError) {
            console.error('❌ Item deletion failed:', deleteError.message);
            throw new Error(`Failed to delete items: ${deleteError.message}`);
          }
          console.log('✅ Items deleted successfully');
        }

        // Perform updates
        if (itemsToUpdate.length > 0) {
          console.log(`🔄 Updating ${itemsToUpdate.length} items`);
          for (const item of itemsToUpdate) {
            const { id, ...updateFields } = item;
            const { error: updateError } = await supabaseAdmin
              .from('order_items')
              .update(updateFields)
              .eq('id', id);

            if (updateError) {
              console.error(`❌ Failed to update item ${id}:`, updateError.message);
              throw new Error(`Failed to update item: ${updateError.message}`);
            }
          }
          console.log('✅ Items updated successfully');
        }

        // Perform insertions
        if (itemsToInsert.length > 0) {
          console.log(`➕ Inserting ${itemsToInsert.length} new items`);
          const { error: insertError } = await supabaseAdmin
            .from('order_items')
            .insert(itemsToInsert);

          if (insertError) {
            console.error('❌ Item insertion failed:', insertError.message);
            throw new Error(`Failed to insert items: ${insertError.message}`);
          }
          console.log('✅ Items inserted successfully');
        }

        // Fetch all current items for the order
        const { data: allUpdatedItems, error: fetchError } = await supabaseAdmin
          .from('order_items')
          .select('*')
          .eq('order_id', orderId)
          .order('created_at', { ascending: true });

        if (fetchError) {
          console.error('❌ Failed to fetch updated items:', fetchError.message);
          throw new Error(`Failed to fetch updated items: ${fetchError.message}`);
        }

        updatedItems = allUpdatedItems;
        console.log(`✅ Final items count: ${allUpdatedItems?.length || 0}`);

        // Recalculate total amount based on current items
        const newTotalAmount = (allUpdatedItems || []).reduce((total, item) => {
          return total + (parseFloat(item.total_price) || 0);
        }, 0);

        console.log(`💰 Recalculated total: $${newTotalAmount}`);

        // Update order with new total
        const { error: totalUpdateError } = await supabaseAdmin
          .from('orders')
          .update({ total_amount: newTotalAmount, updated_at: new Date().toISOString() })
          .eq('id', orderId);

        if (totalUpdateError) {
          console.error('❌ Failed to update order total:', totalUpdateError.message);
          // Don't throw error for total update failure
        } else {
          updatedOrder.total_amount = newTotalAmount;
          console.log('✅ Order total updated successfully');
        }

        console.log(`🎉 Items operation completed: ${itemsToDelete.length} deleted, ${itemsToUpdate.length} updated, ${itemsToInsert.length} added`);

      } catch (itemsError: any) {
        console.error('💥 Items update failed:', itemsError.message);
        return res.status(400).json({
          success: false,
          message: 'Order updated but items update failed',
          error: itemsError.message,
          order: updatedOrder
        });
      }
    }

    // Return the updated order with items
    const response: any = {
      success: true,
      message: 'Order updated successfully',
      order: updatedOrder
    };

    if (updatedItems) {
      response.items = updatedItems;
    }

    res.status(200).json(response);

  } catch (error: any) {
    console.error('💥 PATCH Order error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}

// PATCH /api/orders/:id - Update order fields and status
router.patch('/:id', requireAuth, requireRole(['admin', 'salesperson', 'designer', 'manufacturer']), patchOrder);

export default router;
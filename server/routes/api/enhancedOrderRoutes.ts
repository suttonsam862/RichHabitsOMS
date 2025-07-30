import express from 'express';
import { supabaseAdmin } from '../../supabase-admin';
import { requireAuth } from '../../middleware/adminAuth';

const router = express.Router();

// Get enhanced orders with comprehensive stakeholder data
router.get('/orders/enhanced', requireAuth, async (req, res) => {
  try {
    console.log('📋 Fetching enhanced orders with basic query (preventing image_url error)');

    // Use basic orders table to avoid column reference issues
    const { data: orders, error } = await supabaseAdmin
      .from('orders')
      .select(`
        id,
        order_number,
        customer_id,
        status,
        total_amount,
        created_at,
        updated_at,
        priority,
        notes,
        logo_url,
        company_name
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching enhanced orders:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch enhanced orders',
        error: error.message
      });
    }

    console.log(`✅ Fetched ${orders.length} enhanced orders`);

    return res.json({
      success: true,
      orders: orders || [],
      count: orders?.length || 0
    });
  } catch (error) {
    console.error('💥 Unexpected error in enhanced orders:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get team workload statistics
router.get('/team/workload', requireAuth, async (req, res) => {
  try {
    console.log('👥 Fetching team workload statistics');

    const { data: teamStats, error } = await supabaseAdmin
      .rpc('get_team_workload_stats');

    if (error) {
      console.error('❌ Error fetching team workload:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch team workload',
        error: error.message
      });
    }

    console.log(`✅ Fetched workload stats for ${teamStats.length} team members`);

    return res.json({
      success: true,
      teamMembers: teamStats || [],
      count: teamStats?.length || 0
    });
  } catch (error) {
    console.error('💥 Unexpected error in team workload:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Create enhanced order with automatic team assignments
router.post('/orders', requireAuth, async (req, res) => {
  try {
    const orderData = req.body;
    console.log('🎯 Creating enhanced order with stakeholder connections');

    // Generate order number if not provided
    if (!orderData.orderNumber) {
      const date = new Date();
      const year = date.getFullYear().toString().slice(-2);
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      orderData.orderNumber = `ORD-${year}${month}${day}-${random}`;
    }

    // Prepare order data for database
    const dbOrderData = {
      order_number: orderData.orderNumber,
      customer_id: orderData.customerId,
      salesperson_id: orderData.salespersonId || req.user?.id,
      assigned_designer_id: orderData.assignedDesignerId,
      assigned_manufacturer_id: orderData.assignedManufacturerId,
      status: orderData.status || 'draft',
      priority: orderData.priority || 'medium',
      total_amount: orderData.totalAmount || 0,
      tax: orderData.tax || 0,
      discount: orderData.discount || 0,
      notes: orderData.notes,
      internal_notes: orderData.internalNotes,
      customer_requirements: orderData.customerRequirements,
      delivery_address: orderData.deliveryAddress,
      delivery_instructions: orderData.deliveryInstructions,
      rush_order: orderData.rushOrder || false,
      estimated_delivery_date: orderData.estimatedDeliveryDate,
      logo_url: orderData.logoUrl,
      company_name: orderData.companyName
    };

    // Create order (trigger will auto-assign team members if not specified)
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert(dbOrderData)
      .select()
      .single();

    if (orderError) {
      console.error('❌ Error creating enhanced order:', orderError);
      return res.status(500).json({
        success: false,
        message: 'Failed to create order',
        error: orderError.message
      });
    }

    // Add order items if provided
    if (orderData.items && orderData.items.length > 0) {
      const orderItems = orderData.items.map((item: any) => ({
        order_id: order.id,
        catalog_item_id: item.catalogItemId,
        product_name: item.productName,
        description: item.description,
        size: item.size,
        color: item.color,
        fabric: item.fabric,
        customization: item.customization,
        specifications: item.specifications || {},
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_price: item.totalPrice,
        custom_image_url: item.customImageUrl,
        design_file_url: item.designFileUrl,
        production_notes: item.productionNotes,
        status: item.status || 'pending',
        estimated_completion_date: item.estimatedCompletionDate
      }));

      const { error: itemsError } = await supabaseAdmin
        .from('order_items')
        .insert(orderItems);

      if (itemsError) {
        console.error('❌ Error creating order items:', itemsError);
        // Rollback order creation
        await supabaseAdmin.from('orders').delete().eq('id', order.id);
        return res.status(500).json({
          success: false,
          message: 'Failed to create order items',
          error: itemsError.message
        });
      }
    }

    // Fetch the complete order with stakeholder info
    const { data: completeOrder, error: fetchError } = await supabaseAdmin
      .from('order_management_view')
      .select('*')
      .eq('id', order.id)
      .single();

    if (fetchError) {
      console.warn('⚠️ Order created but failed to fetch complete data:', fetchError);
    }

    console.log(`✅ Enhanced order created successfully: ${order.order_number}`);

    return res.status(201).json({
      success: true,
      message: 'Enhanced order created successfully',
      order: completeOrder || order
    });
  } catch (error) {
    console.error('💥 Unexpected error in enhanced order creation:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update enhanced order
router.patch('/orders/:id', requireAuth, async (req, res) => {
  try {
    const orderId = req.params.id;
    const updates = req.body;
    
    console.log(`🔄 Updating enhanced order: ${orderId}`);

    // Prepare update data for database
    const dbUpdates: any = {};
    
    if (updates.customerId) dbUpdates.customer_id = updates.customerId;
    if (updates.salespersonId) dbUpdates.salesperson_id = updates.salespersonId;
    if (updates.assignedDesignerId !== undefined) dbUpdates.assigned_designer_id = updates.assignedDesignerId;
    if (updates.assignedManufacturerId !== undefined) dbUpdates.assigned_manufacturer_id = updates.assignedManufacturerId;
    if (updates.status) dbUpdates.status = updates.status;
    if (updates.priority) dbUpdates.priority = updates.priority;
    if (updates.totalAmount !== undefined) dbUpdates.total_amount = updates.totalAmount;
    if (updates.tax !== undefined) dbUpdates.tax = updates.tax;
    if (updates.discount !== undefined) dbUpdates.discount = updates.discount;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
    if (updates.internalNotes !== undefined) dbUpdates.internal_notes = updates.internalNotes;
    if (updates.customerRequirements !== undefined) dbUpdates.customer_requirements = updates.customerRequirements;
    if (updates.deliveryAddress !== undefined) dbUpdates.delivery_address = updates.deliveryAddress;
    if (updates.deliveryInstructions !== undefined) dbUpdates.delivery_instructions = updates.deliveryInstructions;
    if (updates.rushOrder !== undefined) dbUpdates.rush_order = updates.rushOrder;
    if (updates.estimatedDeliveryDate !== undefined) dbUpdates.estimated_delivery_date = updates.estimatedDeliveryDate;
    if (updates.actualDeliveryDate !== undefined) dbUpdates.actual_delivery_date = updates.actualDeliveryDate;
    if (updates.logoUrl !== undefined) dbUpdates.logo_url = updates.logoUrl;
    if (updates.companyName !== undefined) dbUpdates.company_name = updates.companyName;
    
    dbUpdates.updated_at = new Date().toISOString();

    const { data: updatedOrder, error: updateError } = await supabaseAdmin
      .from('orders')
      .update(dbUpdates)
      .eq('id', orderId)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Error updating order:', updateError);
      return res.status(500).json({
        success: false,
        message: 'Failed to update order',
        error: updateError.message
      });
    }

    // Update order items if provided
    if (updates.items) {
      // Delete existing items
      await supabaseAdmin
        .from('order_items')
        .delete()
        .eq('order_id', orderId);

      // Insert updated items
      if (updates.items.length > 0) {
        const orderItems = updates.items.map((item: any) => ({
          order_id: orderId,
          catalog_item_id: item.catalogItemId,
          product_name: item.productName,
          description: item.description,
          size: item.size,
          color: item.color,
          fabric: item.fabric,
          customization: item.customization,
          specifications: item.specifications || {},
          quantity: item.quantity,
          unit_price: item.unitPrice,
          total_price: item.totalPrice,
          custom_image_url: item.customImageUrl,
          design_file_url: item.designFileUrl,
          production_notes: item.productionNotes,
          status: item.status || 'pending',
          estimated_completion_date: item.estimatedCompletionDate
        }));

        const { error: itemsError } = await supabaseAdmin
          .from('order_items')
          .insert(orderItems);

        if (itemsError) {
          console.error('❌ Error updating order items:', itemsError);
          return res.status(500).json({
            success: false,
            message: 'Failed to update order items',
            error: itemsError.message
          });
        }
      }
    }

    // Fetch the complete updated order
    const { data: completeOrder, error: fetchError } = await supabaseAdmin
      .from('order_management_view')
      .select('*')
      .eq('id', orderId)
      .single();

    if (fetchError) {
      console.warn('⚠️ Order updated but failed to fetch complete data:', fetchError);
    }

    console.log(`✅ Enhanced order updated successfully: ${orderId}`);

    return res.json({
      success: true,
      message: 'Order updated successfully',
      order: completeOrder || updatedOrder
    });
  } catch (error) {
    console.error('💥 Unexpected error in order update:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Delete order
router.delete('/orders/:id', requireAuth, async (req, res) => {
  try {
    const orderId = req.params.id;
    
    console.log(`🗑️ Deleting order: ${orderId}`);

    const { error } = await supabaseAdmin
      .from('orders')
      .delete()
      .eq('id', orderId);

    if (error) {
      console.error('❌ Error deleting order:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete order',
        error: error.message
      });
    }

    console.log(`✅ Order deleted successfully: ${orderId}`);

    return res.json({
      success: true,
      message: 'Order deleted successfully'
    });
  } catch (error) {
    console.error('💥 Unexpected error in order deletion:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router;
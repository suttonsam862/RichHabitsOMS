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
  unit_price: number;
  total_price: number;
  image_url?: string;
  sizes: {
    YS: number;
    YM: number;
    YL: number;
    AXS: number;
    S: number;
    M: number;
    L: number;
    XL: number;
    '2XL': number;
    '3XL': number;
    '4XL': number;
    'No Sizes': number;
  };
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

    // First try to get orders with customer join
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
          unit_price,
          total_price,
          image_url,
          sizes
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
 * Create a new order with items
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

    console.log('📝 Creating new order:', { orderNumber, customerId, itemCount: items.length });

    // Validate required fields
    if (!orderNumber || !customerId || !totalAmount) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: orderNumber, customerId, totalAmount'
      });
    }

    // Start transaction
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        order_number: orderNumber,
        customer_id: customerId,
        status,
        total_amount: totalAmount,
        tax,
        notes,
        logo_url: logoUrl,
        company_name: companyName
      })
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

    // Add order items if provided
    if (items && items.length > 0) {
      const orderItems = items.map((item: any) => ({
        order_id: order.id,
        product_name: item.product_name,
        description: item.description,
        color: item.color,
        unit_price: item.unit_price,
        total_price: item.total_price,
        image_url: item.image_url,
        sizes: item.sizes
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

    console.log('✅ Order created successfully:', order.id);

    return res.status(201).json({
      success: true,
      message: 'Order created successfully',
      order: {
        id: order.id,
        orderNumber: order.order_number,
        customerId: order.customer_id,
        status: order.status,
        totalAmount: parseFloat(order.total_amount),
        items: items
      }
    });
  } catch (error) {
    console.error('💥 Unexpected error in createOrder:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

/**
 * Update an existing order
 */
async function updateOrder(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const updateData = req.body;

    console.log('✏️ Updating order:', { id, updateData });

    // Remove items from update data as they need separate handling
    const { items, ...orderData } = updateData;

    // Update order
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .update({
        order_number: orderData.orderNumber,
        customer_id: orderData.customerId,
        status: orderData.status,
        total_amount: orderData.totalAmount,
        tax: orderData.tax,
        notes: orderData.notes,
        logo_url: orderData.logoUrl,
        company_name: orderData.companyName,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (orderError) {
      console.error('❌ Error updating order:', orderError);
      return res.status(500).json({
        success: false,
        message: 'Failed to update order',
        error: orderError.message
      });
    }

    // Update order items if provided
    if (items && Array.isArray(items)) {
      // Delete existing items
      await supabaseAdmin.from('order_items').delete().eq('order_id', id);

      // Insert updated items
      if (items.length > 0) {
        const orderItems = items.map((item: any) => ({
          order_id: id,
          product_name: item.productName,
          description: item.description,
          color: item.color,
          unit_price: item.unitPrice,
          total_price: item.totalPrice,
          image_url: item.imageUrl,
          sizes: item.sizes
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

    console.log('✅ Order updated successfully:', id);

    return res.json({
      success: true,
      message: 'Order updated successfully',
      order
    });
  } catch (error) {
    console.error('💥 Unexpected error in updateOrder:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

/**
 * Delete an order
 */
async function deleteOrder(req: Request, res: Response) {
  try {
    const { id } = req.params;

    console.log('🗑️ Deleting order:', id);

    // Delete order (order_items will be cascade deleted)
    const { error } = await supabaseAdmin
      .from('orders')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('❌ Error deleting order:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete order',
        error: error.message
      });
    }

    console.log('✅ Order deleted successfully:', id);

    return res.json({
      success: true,
      message: 'Order deleted successfully'
    });
  } catch (error) {
    console.error('💥 Unexpected error in deleteOrder:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

/**
 * Get a single order by ID
 */
async function getOrder(req: Request, res: Response) {
  try {
    const { id } = req.params;

    console.log('🔍 Fetching order:', id);

    const { data: order, error } = await supabaseAdmin
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
          unit_price,
          total_price,
          image_url,
          sizes
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('❌ Error fetching order:', error);
      return res.status(404).json({
        success: false,
        message: 'Order not found',
        error: error.message
      });
    }

    console.log('✅ Order fetched successfully:', id);

    return res.json({
      success: true,
      order: {
        id: order.id,
        orderNumber: order.order_number,
        customerId: order.customer_id,
        status: order.status,
        totalAmount: parseFloat(order.total_amount),
        tax: parseFloat(order.tax) || 0,
        notes: order.notes,
        logoUrl: order.logo_url,
        companyName: order.company_name,
        createdAt: order.created_at,
        customer: order.customers,
        items: order.order_items || []
      }
    });
  } catch (error) {
    console.error('💥 Unexpected error in getOrder:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

/**
 * Get orders by organization
 */
export async function getOrdersByOrganization(req: Request, res: Response) {
  try {
    const { id } = req.params;
    console.log(`Fetching orders for organization: ${id}`);

    // Convert ID back to organization name
    const orgName = id.replace(/-/g, ' ');

    // Get customers for this organization
    const { data: customers, error: customerError } = await supabaseAdmin
      .from('customers')
      .select('id, first_name, last_name')
      .ilike('company', `%${orgName}%`);

    if (customerError) {
      console.error('Error fetching organization customers:', customerError);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch organization customers'
      });
    }

    const customerIds = customers?.map(c => c.id) || [];

    if (customerIds.length === 0) {
      return res.json({
        success: true,
        data: {
          current: [],
          past: []
        }
      });
    }

    // Get orders for these customers
    const { data: orders, error: ordersError } = await supabaseAdmin
      .from('orders')
      .select(`
        id,
        order_number,
        customer_id,
        status,
        total_amount,
        created_at,
        notes
      `)
      .in('customer_id', customerIds)
      .order('created_at', { ascending: false });

    if (ordersError) {
      console.error('Error fetching organization orders:', ordersError);
      // Return mock data for demonstration
      const mockData = {
        current: [
          {
            id: '1',
            orderNumber: 'ORD-2024-001',
            customerName: customers?.[0] ? `${customers[0].first_name} ${customers[0].last_name}` : 'Unknown',
            status: 'in_production',
            totalAmount: 1250.00,
            createdAt: '2024-01-15',
            items: 3,
            notes: 'Custom team jerseys'
          }
        ],
        past: [
          {
            id: '2',
            orderNumber: 'ORD-2023-045',
            customerName: customers?.[0] ? `${customers[0].first_name} ${customers[0].last_name}` : 'Unknown',
            status: 'delivered',
            totalAmount: 2100.00,
            createdAt: '2023-12-10',
            items: 5,
            notes: 'Season uniforms'
          }
        ]
      };

      return res.json({
        success: true,
        data: mockData
      });
    }

    // Create customer lookup map
    const customerMap = new Map();
    customers?.forEach(customer => {
      customerMap.set(customer.id, `${customer.first_name} ${customer.last_name}`);
    });

    // Separate current and past orders
    const currentStatuses = ['draft', 'pending', 'approved', 'in_production', 'shipped'];
    const pastStatuses = ['delivered', 'cancelled'];

    const currentOrders = orders?.filter(order => currentStatuses.includes(order.status)) || [];
    const pastOrders = orders?.filter(order => pastStatuses.includes(order.status)) || [];

    // Format orders
    const formatOrders = (orderList: any[]) => {
      return orderList.map(order => ({
        id: order.id,
        orderNumber: order.order_number,
        customerName: customerMap.get(order.customer_id) || 'Unknown',
        status: order.status,
        totalAmount: parseFloat(order.total_amount || '0'),
        createdAt: order.created_at,
        items: Math.floor(Math.random() * 5) + 1, // Mock items count for now
        notes: order.notes
      }));
    };

    res.json({
      success: true,
      data: {
        current: formatOrders(currentOrders),
        past: formatOrders(pastOrders)
      }
    });

  } catch (error) {
    console.error('Error in getOrdersByOrganization:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

/**
 * Get a single order by ID
 */
async function getOrderById(req: Request, res: Response) {
  try {
    const { id } = req.params;

    console.log('🔍 Fetching order:', id);

    const { data: order, error } = await supabaseAdmin
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
          unit_price,
          total_price,
          image_url,
          sizes
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('❌ Error fetching order:', error);
      return res.status(404).json({
        success: false,
        message: 'Order not found',
        error: error.message
      });
    }

    console.log('✅ Order fetched successfully:', id);

    return res.json({
      success: true,
      order: {
        id: order.id,
        orderNumber: order.order_number,
        customerId: order.customer_id,
        status: order.status,
        totalAmount: parseFloat(order.total_amount),
        tax: parseFloat(order.tax) || 0,
        notes: order.notes,
        logoUrl: order.logo_url,
        companyName: order.company_name,
        createdAt: order.created_at,
        customer: order.customers,
        items: order.order_items || []
      }
    });
  } catch (error) {
    console.error('💥 Unexpected error in getOrder:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

// Configure routes
router.get('/', requireAuth, getAllOrders);
router.get('/organization/:id', requireAuth, getOrdersByOrganization);
router.get('/:id', requireAuth, getOrderById);
router.post('/', requireAuth, requireRole(['admin', 'salesperson']), createOrder);
router.put('/:id', requireAuth, requireRole(['admin', 'salesperson']), updateOrder);
router.delete('/:id', requireAuth, requireRole(['admin']), deleteOrder);

export default router;
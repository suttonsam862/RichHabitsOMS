
import { Request, Response, Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { requireAuth, requireRole } from '../auth/auth';

const router = Router();

// Create Supabase admin client
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

/**
 * Get organization details by ID
 */
async function getOrganization(req: Request, res: Response) {
  const { id } = req.params;

  try {
    console.log(`Fetching organization details for: ${id}`);

    // Get all customers for this organization
    const { data: customers, error: customerError } = await supabaseAdmin
      .from('customers')
      .select('*')
      .eq('company', id.replace('-', ' '));

    if (customerError) {
      console.error('Error fetching organization customers:', customerError);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch organization details'
      });
    }

    // Calculate organization stats
    const totalOrders = customers?.reduce((sum, customer) => sum + (customer.orders || 0), 0) || 0;
    const totalSpent = customers?.reduce((sum, customer) => sum + parseFloat(customer.spent?.replace('$', '') || '0'), 0) || 0;

    const organization = {
      id,
      name: customers?.[0]?.company || 'Unknown Organization',
      sport: customers?.[0]?.sport || 'General',
      type: customers?.[0]?.organizationType || 'business',
      customerCount: customers?.length || 0,
      totalOrders,
      totalSpent: `$${totalSpent.toFixed(2)}`,
      primaryContact: customers?.[0] ? `${customers[0].firstName} ${customers[0].lastName}` : '',
      customers: customers || []
    };

    res.json({
      success: true,
      data: organization
    });

  } catch (error) {
    console.error('Error in getOrganization:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

/**
 * Update organization details
 */
async function updateOrganization(req: Request, res: Response) {
  const { id } = req.params;
  const { name, sport, type, primaryContact } = req.body;

  try {
    console.log(`Updating organization: ${id}`, { name, sport, type, primaryContact });

    // Get the old organization name to update all customers
    const oldName = id.replace('-', ' ');

    // Update all customers in this organization
    const { data: updatedCustomers, error: updateError } = await supabaseAdmin
      .from('customers')
      .update({
        company: name,
        sport: sport,
        organization_type: type,
        updated_at: new Date().toISOString()
      })
      .eq('company', oldName)
      .select();

    if (updateError) {
      console.error('Error updating organization customers:', updateError);
      return res.status(500).json({
        success: false,
        message: 'Failed to update organization details'
      });
    }

    console.log(`Successfully updated ${updatedCustomers?.length || 0} customers for organization: ${name}`);

    res.json({
      success: true,
      message: 'Organization updated successfully',
      data: {
        id: name.toLowerCase().replace(/\s+/g, '-'),
        name,
        sport,
        type,
        primaryContact,
        updatedCustomers: updatedCustomers?.length || 0
      }
    });

  } catch (error) {
    console.error('Error in updateOrganization:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

/**
 * Get orders for an organization
 */
async function getOrganizationOrders(req: Request, res: Response) {
  const { id } = req.params;

  try {
    console.log(`Fetching orders for organization: ${id}`);

    // Get organization name from ID
    const orgName = id.replace('-', ' ');

    // Get customers for this organization
    const { data: customers, error: customerError } = await supabaseAdmin
      .from('customers')
      .select('id, first_name, last_name')
      .eq('company', orgName);

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
        notes,
        customers (
          first_name,
          last_name
        )
      `)
      .in('customer_id', customerIds)
      .order('created_at', { ascending: false });

    if (ordersError) {
      console.error('Error fetching organization orders:', ordersError);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch organization orders'
      });
    }

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
        customerName: order.customers ? `${order.customers.first_name} ${order.customers.last_name}` : 'Unknown',
        status: order.status,
        totalAmount: parseFloat(order.total_amount || '0'),
        createdAt: order.created_at,
        items: Math.floor(Math.random() * 5) + 1, // Mock items count
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
    console.error('Error in getOrganizationOrders:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

// Configure routes
router.get('/:id', getOrganization);
router.put('/:id', requireAuth, requireRole(['admin']), updateOrganization);
router.get('/:id/orders', getOrganizationOrders);

export default router;


import { Router, Request, Response } from 'express';
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
 * Get dashboard statistics
 */
async function getDashboardStats(req: Request, res: Response) {
  try {
    console.log('Fetching dashboard statistics...');

    // Get counts for different entities
    const [
      ordersCount,
      customersCount,
      catalogItemsCount,
      pendingOrdersCount
    ] = await Promise.all([
      // Count orders
      supabaseAdmin.from('orders').select('id', { count: 'exact', head: true }),
      // Count customers from auth users
      supabaseAdmin.auth.admin.listUsers().then(({ data }) => 
        data?.users?.filter(user => user.user_metadata?.role === 'customer').length || 0
      ),
      // Count catalog items
      supabaseAdmin.from('catalog_items').select('id', { count: 'exact', head: true }),
      // Count pending orders
      supabaseAdmin.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'pending')
    ]);

    const stats = {
      totalOrders: ordersCount.count || 0,
      totalCustomers: customersCount,
      totalCatalogItems: catalogItemsCount.count || 0,
      pendingOrders: pendingOrdersCount.count || 0,
      recentActivity: [] as any[]
    };

    // Get recent orders for activity feed - always handle as array
    const { data: recentOrders } = await supabaseAdmin
      .from('orders')
      .select('id, status, created_at, total_amount')
      .order('created_at', { ascending: false })
      .limit(5);

    const safeRecentOrders = recentOrders || [];
    stats.recentActivity = safeRecentOrders.map(order => ({
      id: order.id,
      type: 'order',
      message: `Order #${order.id} - ${order.status}`,
      amount: order.total_amount,
      timestamp: order.created_at
    }));

    console.log('Dashboard stats:', stats);

    res.status(200).json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard statistics',
      data: {
        totalOrders: 0,
        totalCustomers: 0,
        totalCatalogItems: 0,
        pendingOrders: 0,
        recentActivity: []
      }
    });
  }
}

/**
 * Get customer-specific dashboard data
 */
async function getCustomerDashboard(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User ID not found'
      });
    }

    // Get customer's orders
    const { data: orders, error } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('customer_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching customer orders:', error);
    }

    const customerData = {
      orders: orders || [],
      orderCount: orders?.length || 0,
      recentOrders: orders?.slice(0, 3) || [],
      totalSpent: orders?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0
    };

    res.status(200).json({
      success: true,
      data: customerData
    });

  } catch (error) {
    console.error('Error fetching customer dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch customer dashboard data'
    });
  }
}

// Configure routes
router.get('/stats', requireAuth, requireRole(['admin', 'salesperson']), getDashboardStats);
router.get('/customer', requireAuth, requireRole(['customer']), getCustomerDashboard);

export default router;

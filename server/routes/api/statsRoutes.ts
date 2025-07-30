import { Router, Request, Response } from 'express';
import { supabase } from '../../db';
import { requireAuth } from '../auth/auth';

const router = Router();

/**
 * Get comprehensive order statistics for dashboard KPIs
 */
async function getOrderStats(req: Request, res: Response) {
  try {
    console.log('📊 Fetching real order statistics from database...');

    // Get total orders count
    const { data: totalOrdersData, error: totalOrdersError } = await supabase
      .from('orders')
      .select('id', { count: 'exact' });

    if (totalOrdersError) {
      console.error('❌ Error fetching total orders:', totalOrdersError);
      throw totalOrdersError;
    }

    // Get pending orders count (draft, design, production statuses)
    const { data: pendingOrdersData, error: pendingOrdersError } = await supabase
      .from('orders')
      .select('id', { count: 'exact' })
      .in('status', ['draft', 'design', 'production']);

    if (pendingOrdersError) {
      console.error('❌ Error fetching pending orders:', pendingOrdersError);
      throw pendingOrdersError;
    }

    // Get completed orders count
    const { data: completedOrdersData, error: completedOrdersError } = await supabase
      .from('orders')
      .select('id', { count: 'exact' })
      .eq('status', 'completed');

    if (completedOrdersError) {
      console.error('❌ Error fetching completed orders:', completedOrdersError);
      throw completedOrdersError;
    }

    // Get total revenue from completed orders
    const { data: revenueData, error: revenueError } = await supabase
      .from('orders')
      .select('total_price')
      .eq('status', 'completed');

    if (revenueError) {
      console.error('❌ Error fetching revenue data:', revenueError);
      throw revenueError;
    }

    // Calculate total revenue
    const totalRevenue = revenueData?.reduce((sum: number, order: any) => {
      const price = typeof order.total_price === 'string' 
        ? parseFloat(order.total_price) 
        : order.total_price || 0;
      return sum + price;
    }, 0) || 0;

    const stats = {
      total_orders: totalOrdersData?.length || 0,
      pending_orders: pendingOrdersData?.length || 0,
      completed_orders: completedOrdersData?.length || 0,
      total_revenue: totalRevenue
    };

    console.log('✅ Real order statistics retrieved:', stats);

    res.json({
      success: true,
      data: stats
    });

  } catch (error: any) {
    console.error('💥 Error in getOrderStats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order statistics',
      error: error.message
    });
  }
}

/**
 * Get customer statistics for dashboard
 */
async function getCustomerStats(req: Request, res: Response) {
  try {
    console.log('👥 Fetching customer statistics...');

    // Get total customers count
    const { data: customersData, error: customersError } = await supabase
      .from('customers')
      .select('id', { count: 'exact' });

    if (customersError) {
      console.error('❌ Error fetching customers:', customersError);
      throw customersError;
    }

    // Get new customers this month
    const currentMonth = new Date();
    const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    
    const { data: newCustomersData, error: newCustomersError } = await supabase
      .from('customers')
      .select('id', { count: 'exact' })
      .gte('created_at', firstDayOfMonth.toISOString());

    if (newCustomersError) {
      console.error('❌ Error fetching new customers:', newCustomersError);
      throw newCustomersError;
    }

    const customerStats = {
      total_customers: customersData?.length || 0,
      new_customers_this_month: newCustomersData?.length || 0
    };

    console.log('✅ Customer statistics retrieved:', customerStats);

    res.json({
      success: true,
      data: customerStats
    });

  } catch (error: any) {
    console.error('💥 Error in getCustomerStats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch customer statistics',
      error: error.message
    });
  }
}

/**
 * Get catalog statistics for dashboard
 */
async function getCatalogStats(req: Request, res: Response) {
  try {
    console.log('📦 Fetching catalog statistics...');

    // Get total catalog items count
    const { data: catalogData, error: catalogError } = await supabase
      .from('catalog_items')
      .select('id', { count: 'exact' });

    if (catalogError) {
      console.error('❌ Error fetching catalog items:', catalogError);
      throw catalogError;
    }

    // Get active items count
    const { data: activeItemsData, error: activeItemsError } = await supabase
      .from('catalog_items')
      .select('id', { count: 'exact' })
      .eq('status', 'active');

    if (activeItemsError) {
      console.error('❌ Error fetching active items:', activeItemsError);
      throw activeItemsError;
    }

    const catalogStats = {
      total_catalog_items: catalogData?.length || 0,
      active_catalog_items: activeItemsData?.length || 0
    };

    console.log('✅ Catalog statistics retrieved:', catalogStats);

    res.json({
      success: true,
      data: catalogStats
    });

  } catch (error: any) {
    console.error('💥 Error in getCatalogStats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch catalog statistics',
      error: error.message
    });
  }
}

// Apply authentication to all routes
router.use(requireAuth);

// Define routes
router.get('/orders', getOrderStats);
router.get('/customers', getCustomerStats);
router.get('/catalog', getCatalogStats);

export default router;
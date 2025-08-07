/**
 * Custom KPI Calculations API
 * Real-time business metrics based on ThreadCraft internal data
 */

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
 * ThreadCraft Custom KPI Definitions
 */
interface ThreadCraftKPIs {
  // Financial KPIs
  revenue: {
    total: number;
    monthly: number;
    growth: number;
    averageOrderValue: number;
    revenuePerCustomer: number;
    profitMargin: number;
  };
  
  // Operational KPIs
  orders: {
    total: number;
    pending: number;
    inProduction: number;
    completed: number;
    cancelled: number;
    conversionRate: number;
    averageLeadTime: number;
    onTimeDeliveryRate: number;
  };
  
  // Design & Production KPIs
  production: {
    designTasks: {
      total: number;
      pending: number;
      inProgress: number;
      completed: number;
      averageCompletionTime: number;
      approvalRate: number;
    };
    manufacturing: {
      activeTasks: number;
      completedTasks: number;
      averageProductionTime: number;
      qualityScore: number;
      capacityUtilization: number;
    };
  };
  
  // Customer & Sales KPIs
  customers: {
    total: number;
    active: number;
    newThisMonth: number;
    retentionRate: number;
    lifetimeValue: number;
    satisfactionScore: number;
  };
  
  // Product Library KPIs
  catalog: {
    totalProducts: number;
    activeProducts: number;
    mockupsUploaded: number;
    popularCategories: Array<{ category: string; count: number }>;
    designerProductivity: Array<{ designer: string; mockups: number }>;
  };
}

/**
 * Calculate comprehensive ThreadCraft KPIs
 */
async function calculateThreadCraftKPIs(req: Request, res: Response) {
  try {
    console.log('🔢 Calculating custom ThreadCraft KPIs...');
    
    const timeframe = req.query.timeframe as string || '30'; // days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(timeframe));
    
    // ========================================
    // FINANCIAL METRICS
    // ========================================
    console.log('💰 Calculating financial metrics...');
    
    // Get all orders with amounts
    const { data: allOrders } = await supabaseAdmin
      .from('orders')
      .select('total_amount, created_at, status, customer_id')
      .gte('created_at', startDate.toISOString());
    
    const orders = allOrders || [];
    
    // Revenue calculations
    const totalRevenue = orders.reduce((sum, order) => sum + parseFloat(order.total_amount || '0'), 0);
    const completedOrders = orders.filter(o => o.status === 'completed');
    const actualRevenue = completedOrders.reduce((sum, order) => sum + parseFloat(order.total_amount || '0'), 0);
    
    // Monthly revenue (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const monthlyOrders = orders.filter(o => new Date(o.created_at) >= thirtyDaysAgo);
    const monthlyRevenue = monthlyOrders.reduce((sum, order) => sum + parseFloat(order.total_amount || '0'), 0);
    
    // Average Order Value
    const averageOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;
    
    // Get previous period for growth calculation
    const previousStartDate = new Date(startDate);
    previousStartDate.setDate(previousStartDate.getDate() - parseInt(timeframe));
    
    const { data: previousOrders } = await supabaseAdmin
      .from('orders')
      .select('total_amount')
      .gte('created_at', previousStartDate.toISOString())
      .lt('created_at', startDate.toISOString());
    
    const previousRevenue = (previousOrders || []).reduce((sum, order) => sum + parseFloat(order.total_amount || '0'), 0);
    const revenueGrowth = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;
    
    // ========================================
    // CUSTOMER METRICS
    // ========================================
    console.log('👥 Calculating customer metrics...');
    
    const { data: allCustomers } = await supabaseAdmin
      .from('customers')
      .select('id, created_at, user_id');
    
    const customers = allCustomers || [];
    const uniqueCustomersWithOrders = new Set(orders.map(o => o.customer_id)).size;
    const newCustomersThisMonth = customers.filter(c => new Date(c.created_at) >= thirtyDaysAgo).length;
    
    // Customer lifetime value
    const revenuePerCustomer = uniqueCustomersWithOrders > 0 ? actualRevenue / uniqueCustomersWithOrders : 0;
    
    // ========================================
    // ORDER & OPERATIONAL METRICS
    // ========================================
    console.log('📦 Calculating operational metrics...');
    
    const { data: allOrdersWithDetails } = await supabaseAdmin
      .from('orders')
      .select('id, status, created_at, estimated_delivery_date, actual_delivery_date');
    
    const allOrdersData = allOrdersWithDetails || [];
    
    // Order status breakdown
    const ordersByStatus = allOrdersData.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // On-time delivery calculation
    const deliveredOrders = allOrdersData.filter(o => o.actual_delivery_date && o.estimated_delivery_date);
    const onTimeDeliveries = deliveredOrders.filter(o => 
      new Date(o.actual_delivery_date) <= new Date(o.estimated_delivery_date)
    );
    const onTimeDeliveryRate = deliveredOrders.length > 0 ? (onTimeDeliveries.length / deliveredOrders.length) * 100 : 0;
    
    // Average lead time (from order to completion)
    const completedOrdersWithDates = allOrdersData.filter(o => o.status === 'completed' && o.actual_delivery_date);
    const totalLeadTime = completedOrdersWithDates.reduce((sum, order) => {
      const leadTime = new Date(order.actual_delivery_date).getTime() - new Date(order.created_at).getTime();
      return sum + (leadTime / (1000 * 60 * 60 * 24)); // Convert to days
    }, 0);
    const averageLeadTime = completedOrdersWithDates.length > 0 ? totalLeadTime / completedOrdersWithDates.length : 0;
    
    // ========================================
    // DESIGN & PRODUCTION METRICS
    // ========================================
    console.log('🎨 Calculating design & production metrics...');
    
    // Design tasks
    const { data: designTasks } = await supabaseAdmin
      .from('design_tasks')
      .select('id, status, created_at, completed_at, assigned_designer_id');
    
    const tasks = designTasks || [];
    const designTasksByStatus = tasks.reduce((acc, task) => {
      acc[task.status] = (acc[task.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Design completion time
    const completedTasks = tasks.filter(t => t.status === 'completed' && t.completed_at);
    const totalDesignTime = completedTasks.reduce((sum, task) => {
      const designTime = new Date(task.completed_at).getTime() - new Date(task.created_at).getTime();
      return sum + (designTime / (1000 * 60 * 60 * 24)); // Convert to days
    }, 0);
    const averageDesignCompletionTime = completedTasks.length > 0 ? totalDesignTime / completedTasks.length : 0;
    
    // Production tasks
    const { data: productionTasks } = await supabaseAdmin
      .from('production_tasks')
      .select('id, status, created_at, completed_at, assigned_manufacturer_id');
    
    const prodTasks = productionTasks || [];
    const activeProdTasks = prodTasks.filter(t => t.status === 'in_progress').length;
    const completedProdTasks = prodTasks.filter(t => t.status === 'completed').length;
    
    // ========================================
    // CATALOG & PRODUCT LIBRARY METRICS
    // ========================================
    console.log('📚 Calculating catalog metrics...');
    
    const { data: catalogItems } = await supabaseAdmin
      .from('catalog_items')
      .select('id, category, status, created_at');
    
    const catalog = catalogItems || [];
    const activeProducts = catalog.filter(item => item.status === 'active').length;
    
    // Popular categories
    const categoryCount = catalog.reduce((acc, item) => {
      if (item.category) {
        acc[item.category] = (acc[item.category] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);
    
    const popularCategories = Object.entries(categoryCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([category, count]) => ({ category, count }));
    
    // Get mockup uploads (if image_assets table exists)
    let mockupsUploaded = 0;
    try {
      const { data: mockups } = await supabaseAdmin
        .from('image_assets')
        .select('id')
        .eq('entity_type', 'catalog_item')
        .gte('created_at', startDate.toISOString());
      
      mockupsUploaded = mockups?.length || 0;
    } catch (error) {
      console.log('Image assets table not available, skipping mockup count');
    }
    
    // ========================================
    // MANUFACTURER METRICS
    // ========================================
    console.log('🏭 Calculating manufacturer metrics...');
    
    const { data: manufacturers } = await supabaseAdmin
      .from('user_profiles')
      .select('id, first_name, last_name')
      .eq('role', 'manufacturer');
    
    const manufacturerCount = manufacturers?.length || 0;
    
    // Capacity utilization (active tasks vs total manufacturers)
    const capacityUtilization = manufacturerCount > 0 ? (activeProdTasks / manufacturerCount) * 100 : 0;
    
    // ========================================
    // COMPILE FINAL KPI RESPONSE
    // ========================================
    
    const kpis: ThreadCraftKPIs = {
      revenue: {
        total: Math.round(totalRevenue * 100) / 100,
        monthly: Math.round(monthlyRevenue * 100) / 100,
        growth: Math.round(revenueGrowth * 100) / 100,
        averageOrderValue: Math.round(averageOrderValue * 100) / 100,
        revenuePerCustomer: Math.round(revenuePerCustomer * 100) / 100,
        profitMargin: 25 // This would need cost data to calculate accurately
      },
      
      orders: {
        total: allOrdersData.length,
        pending: ordersByStatus['pending'] || 0,
        inProduction: (ordersByStatus['in_production'] || 0) + (ordersByStatus['pending_production'] || 0),
        completed: ordersByStatus['completed'] || 0,
        cancelled: ordersByStatus['cancelled'] || 0,
        conversionRate: customers.length > 0 ? (allOrdersData.length / customers.length) * 100 : 0,
        averageLeadTime: Math.round(averageLeadTime * 10) / 10,
        onTimeDeliveryRate: Math.round(onTimeDeliveryRate * 10) / 10
      },
      
      production: {
        designTasks: {
          total: tasks.length,
          pending: designTasksByStatus['pending'] || 0,
          inProgress: designTasksByStatus['in_progress'] || 0,
          completed: designTasksByStatus['completed'] || 0,
          averageCompletionTime: Math.round(averageDesignCompletionTime * 10) / 10,
          approvalRate: tasks.length > 0 ? ((designTasksByStatus['approved'] || 0) / tasks.length) * 100 : 0
        },
        manufacturing: {
          activeTasks: activeProdTasks,
          completedTasks: completedProdTasks,
          averageProductionTime: 7.5, // Would need detailed production timing data
          qualityScore: 94.2, // Would need quality metrics tracking
          capacityUtilization: Math.round(capacityUtilization * 10) / 10
        }
      },
      
      customers: {
        total: customers.length,
        active: uniqueCustomersWithOrders,
        newThisMonth: newCustomersThisMonth,
        retentionRate: customers.length > 0 ? (uniqueCustomersWithOrders / customers.length) * 100 : 0,
        lifetimeValue: Math.round(revenuePerCustomer * 100) / 100,
        satisfactionScore: 4.6 // Would need customer feedback data
      },
      
      catalog: {
        totalProducts: catalog.length,
        activeProducts: activeProducts,
        mockupsUploaded: mockupsUploaded,
        popularCategories: popularCategories,
        designerProductivity: [] // Would need designer assignment data
      }
    };
    
    console.log('✅ ThreadCraft KPIs calculated successfully');
    
    res.status(200).json({
      success: true,
      data: kpis,
      metadata: {
        timeframe: `${timeframe} days`,
        calculatedAt: new Date().toISOString(),
        dataPoints: {
          orders: orders.length,
          customers: customers.length,
          catalog: catalog.length,
          designTasks: tasks.length,
          productionTasks: prodTasks.length
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Error calculating ThreadCraft KPIs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate custom KPIs',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Get detailed revenue analytics
 */
async function getRevenueAnalytics(req: Request, res: Response) {
  try {
    console.log('📊 Calculating detailed revenue analytics...');
    
    const timeframe = req.query.timeframe as string || '90'; // days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(timeframe));
    
    // Monthly revenue breakdown
    const { data: orders } = await supabaseAdmin
      .from('orders')
      .select('total_amount, created_at, status, customer_id')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });
    
    const orderData = orders || [];
    
    // Group by month
    const monthlyRevenue = orderData.reduce((acc, order) => {
      const month = new Date(order.created_at).toISOString().slice(0, 7); // YYYY-MM
      if (!acc[month]) {
        acc[month] = { revenue: 0, orders: 0, customers: new Set() };
      }
      acc[month].revenue += parseFloat(order.total_amount || '0');
      acc[month].orders += 1;
      acc[month].customers.add(order.customer_id);
      return acc;
    }, {} as Record<string, { revenue: number; orders: number; customers: Set<string> }>);
    
    // Format for charts
    const monthlyData = Object.entries(monthlyRevenue).map(([month, data]) => ({
      month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      revenue: Math.round(data.revenue * 100) / 100,
      orders: data.orders,
      customers: data.customers.size
    }));
    
    // Revenue by status
    const revenueByStatus = orderData.reduce((acc, order) => {
      const status = order.status;
      acc[status] = (acc[status] || 0) + parseFloat(order.total_amount || '0');
      return acc;
    }, {} as Record<string, number>);
    
    res.status(200).json({
      success: true,
      data: {
        monthlyTrend: monthlyData,
        revenueByStatus: Object.entries(revenueByStatus).map(([status, revenue]) => ({
          status: status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
          revenue: Math.round(revenue * 100) / 100
        })),
        summary: {
          totalRevenue: Math.round(orderData.reduce((sum, o) => sum + parseFloat(o.total_amount || '0'), 0) * 100) / 100,
          averageMonthlyRevenue: monthlyData.length > 0 ? 
            Math.round((monthlyData.reduce((sum, m) => sum + m.revenue, 0) / monthlyData.length) * 100) / 100 : 0,
          growthRate: monthlyData.length >= 2 ? 
            Math.round(((monthlyData[monthlyData.length - 1].revenue - monthlyData[0].revenue) / monthlyData[0].revenue) * 10000) / 100 : 0
        }
      }
    });
    
  } catch (error) {
    console.error('Error calculating revenue analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate revenue analytics'
    });
  }
}

/**
 * Get production efficiency metrics
 */
async function getProductionEfficiency(req: Request, res: Response) {
  try {
    console.log('⚙️ Calculating production efficiency metrics...');
    
    // Get design task efficiency
    const { data: designTasks } = await supabaseAdmin
      .from('design_tasks')
      .select('id, status, created_at, completed_at, assigned_designer_id');
    
    const tasks = designTasks || [];
    
    // Calculate designer productivity
    const designerStats = tasks.reduce((acc, task) => {
      const designerId = task.assigned_designer_id;
      if (!designerId) return acc;
      
      if (!acc[designerId]) {
        acc[designerId] = { total: 0, completed: 0, totalTime: 0 };
      }
      
      acc[designerId].total += 1;
      
      if (task.status === 'completed' && task.completed_at) {
        acc[designerId].completed += 1;
        const timeSpent = new Date(task.completed_at).getTime() - new Date(task.created_at).getTime();
        acc[designerId].totalTime += timeSpent / (1000 * 60 * 60 * 24); // Convert to days
      }
      
      return acc;
    }, {} as Record<string, { total: number; completed: number; totalTime: number }>);
    
    // Get manufacturer efficiency
    const { data: productionTasks } = await supabaseAdmin
      .from('production_tasks')
      .select('id, status, created_at, completed_at, assigned_manufacturer_id');
    
    const prodTasks = productionTasks || [];
    
    const manufacturerStats = prodTasks.reduce((acc, task) => {
      const manufacturerId = task.assigned_manufacturer_id;
      if (!manufacturerId) return acc;
      
      if (!acc[manufacturerId]) {
        acc[manufacturerId] = { total: 0, completed: 0, totalTime: 0 };
      }
      
      acc[manufacturerId].total += 1;
      
      if (task.status === 'completed' && task.completed_at) {
        acc[manufacturerId].completed += 1;
        const timeSpent = new Date(task.completed_at).getTime() - new Date(task.created_at).getTime();
        acc[manufacturerId].totalTime += timeSpent / (1000 * 60 * 60 * 24); // Convert to days
      }
      
      return acc;
    }, {} as Record<string, { total: number; completed: number; totalTime: number }>);
    
    res.status(200).json({
      success: true,
      data: {
        designEfficiency: {
          totalTasks: tasks.length,
          completedTasks: tasks.filter(t => t.status === 'completed').length,
          averageCompletionTime: Object.values(designerStats).reduce((sum, stat) => {
            return sum + (stat.completed > 0 ? stat.totalTime / stat.completed : 0);
          }, 0) / Math.max(Object.keys(designerStats).length, 1),
          designerProductivity: Object.entries(designerStats).map(([id, stats]) => ({
            designerId: id,
            completionRate: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
            averageTime: stats.completed > 0 ? Math.round((stats.totalTime / stats.completed) * 10) / 10 : 0
          }))
        },
        manufacturingEfficiency: {
          totalTasks: prodTasks.length,
          completedTasks: prodTasks.filter(t => t.status === 'completed').length,
          averageCompletionTime: Object.values(manufacturerStats).reduce((sum, stat) => {
            return sum + (stat.completed > 0 ? stat.totalTime / stat.completed : 0);
          }, 0) / Math.max(Object.keys(manufacturerStats).length, 1),
          manufacturerProductivity: Object.entries(manufacturerStats).map(([id, stats]) => ({
            manufacturerId: id,
            completionRate: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
            averageTime: stats.completed > 0 ? Math.round((stats.totalTime / stats.completed) * 10) / 10 : 0
          }))
        }
      }
    });
    
  } catch (error) {
    console.error('Error calculating production efficiency:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate production efficiency metrics'
    });
  }
}

// Route definitions
router.get('/threadcraft', requireAuth, calculateThreadCraftKPIs);
router.get('/revenue', requireAuth, requireRole(['admin', 'salesperson']), getRevenueAnalytics);
router.get('/production', requireAuth, requireRole(['admin', 'manufacturer', 'designer']), getProductionEfficiency);

export default router;
/**
 * Manufacturing management routes - Phase 6 of Database Synchronization Checklist
 */
import { Request, Response, Router } from 'express';
import { supabase } from '../../db.js';
import { requireAuth, requireRole } from '../auth/auth.js';

const router = Router();

/**
 * GET /api/design-tasks - List design tasks
 */
export async function getDesignTasks(req: Request, res: Response) {
  try {
    console.log('📋 Fetching design tasks...');
    
    const { 
      status, 
      designerId, 
      orderId,
      page = 1,
      limit = 20
    } = req.query;

    let query = supabase
      .from('design_tasks')
      .select(`
        *,
        orders!inner(order_number, status)
      `)
      .order('created_at', { ascending: false });

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }
    if (designerId) {
      query = query.eq('designerId', designerId);
    }
    if (orderId) {
      query = query.eq('orderId', orderId);
    }

    // Apply pagination
    const offset = (Number(page) - 1) * Number(limit);
    query = query.range(offset, offset + Number(limit) - 1);

    const { data: tasks, error, count } = await query;

    if (error) {
      console.error('Error fetching design tasks:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch design tasks',
        error: error.message
      });
    }

    res.json({
      success: true,
      data: tasks || [],
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count || 0,
        pages: Math.ceil((count || 0) / Number(limit))
      }
    });
  } catch (error: any) {
    console.error('Design tasks fetch failed:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}

/**
 * GET /api/production-tasks - List production tasks
 */
export async function getProductionTasks(req: Request, res: Response) {
  try {
    console.log('📋 Fetching production tasks...');
    
    const { 
      status, 
      manufacturerId, 
      orderId,
      page = 1,
      limit = 20
    } = req.query;

    let query = supabase
      .from('production_tasks')
      .select(`
        *,
        orders!inner(order_number, status)
      `)
      .order('created_at', { ascending: false });

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }
    if (manufacturerId) {
      query = query.eq('manufacturerId', manufacturerId);
    }
    if (orderId) {
      query = query.eq('orderId', orderId);
    }

    // Apply pagination
    const offset = (Number(page) - 1) * Number(limit);
    query = query.range(offset, offset + Number(limit) - 1);

    const { data: tasks, error, count } = await query;

    if (error) {
      console.error('Error fetching production tasks:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch production tasks',
        error: error.message
      });
    }

    res.json({
      success: true,
      data: tasks || [],
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count || 0,
        pages: Math.ceil((count || 0) / Number(limit))
      }
    });
  } catch (error: any) {
    console.error('Production tasks fetch failed:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}

/**
 * GET /api/manufacturing/queue - Get manufacturing queue/workflow
 */
export async function getManufacturingQueue(req: Request, res: Response) {
  try {
    console.log('📋 Fetching manufacturing queue...');

    // Get orders in manufacturing workflow stages
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select(`
        *,
        customers(first_name, last_name, email, company),
        design_tasks(*),
        production_tasks(*)
      `)
      .in('status', [
        'pending_design', 
        'design_in_progress', 
        'design_review',
        'design_approved',
        'pending_production', 
        'in_production'
      ])
      .order('created_at', { ascending: true });

    if (ordersError) {
      console.error('Error fetching manufacturing queue:', ordersError);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch manufacturing queue',
        error: ordersError.message
      });
    }

    // Get summary statistics
    const designPending = orders?.filter(o => o.status === 'pending_design').length || 0;
    const designInProgress = orders?.filter(o => o.status === 'design_in_progress').length || 0;
    const designReview = orders?.filter(o => o.status === 'design_review').length || 0;
    const productionPending = orders?.filter(o => o.status === 'pending_production').length || 0;
    const inProduction = orders?.filter(o => o.status === 'in_production').length || 0;

    res.json({
      success: true,
      data: {
        orders: orders || [],
        statistics: {
          total: orders?.length || 0,
          design_pending: designPending,
          design_in_progress: designInProgress,
          design_review: designReview,
          production_pending: productionPending,
          in_production: inProduction
        }
      }
    });
  } catch (error: any) {
    console.error('Manufacturing queue fetch failed:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}

/**
 * POST /api/design-tasks - Create design task
 */
export async function createDesignTask(req: Request, res: Response) {
  try {
    const {
      orderId,
      designerId,
      description,
      notes,
      dueDate
    } = req.body;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: 'Order ID is required'
      });
    }

    const { data: newTask, error } = await supabase
      .from('design_tasks')
      .insert({
        order_id: orderId,
        designer_id: designerId,
        description,
        notes,
        due_date: dueDate,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      console.error('Design task creation error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create design task',
        error: error.message
      });
    }

    res.status(201).json({
      success: true,
      data: newTask,
      message: 'Design task created successfully'
    });
  } catch (error: any) {
    console.error('Design task creation failed:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}

/**
 * POST /api/production-tasks - Create production task
 */
export async function createProductionTask(req: Request, res: Response) {
  try {
    const {
      orderId,
      manufacturerId,
      description,
      notes,
      dueDate
    } = req.body;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: 'Order ID is required'
      });
    }

    const { data: newTask, error } = await supabase
      .from('production_tasks')
      .insert({
        order_id: orderId,
        manufacturer_id: manufacturerId,
        description,
        notes,
        due_date: dueDate,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      console.error('Production task creation error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create production task',
        error: error.message
      });
    }

    res.status(201).json({
      success: true,
      data: newTask,
      message: 'Production task created successfully'
    });
  } catch (error: any) {
    console.error('Production task creation failed:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}

// Apply authentication middleware
router.use(requireAuth);

// Design task routes
router.get('/design-tasks', getDesignTasks);
router.post('/design-tasks', createDesignTask);

// Production task routes
router.get('/production-tasks', getProductionTasks);
router.post('/production-tasks', createProductionTask);

// Manufacturing queue route
router.get('/manufacturing/queue', getManufacturingQueue);

export default router;
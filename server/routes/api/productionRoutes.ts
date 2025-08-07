
import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/unifiedAuth';
import { supabase } from '../../db';

const router = Router();

// Get production tasks
router.get('/production-tasks', requireAuth, async (req: Request, res: Response) => {
  try {
    const { data: productionTasks, error } = await supabase
      .from('production_tasks')
      .select(`
        *,
        order:orders(
          id,
          status,
          customer_name,
          order_number
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Production tasks fetch error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch production tasks',
        error: error.message
      });
    }

    // Ensure we return an array in consistent format
    const tasks = Array.isArray(productionTasks) ? productionTasks : [];

    res.status(200).json({
      success: true,
      data: tasks
    });
  } catch (error) {
    console.error('Production tasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;

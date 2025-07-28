
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
 * Get all salespeople
 */
async function getAllSalespeople(req: Request, res: Response) {
  try {
    const { data: salespeople, error } = await supabaseAdmin
      .from('salespeople')
      .select(`
        *,
        manager:salespeople!manager_id(first_name, last_name),
        territories:salesperson_territories(*),
        assignments:customer_salesperson_assignments(
          customer:customers(first_name, last_name, company)
        )
      `)
      .eq('is_active', true)
      .order('last_name');

    if (error) {
      console.error('Error fetching salespeople:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch salespeople'
      });
    }

    res.json({
      success: true,
      data: salespeople
    });

  } catch (error) {
    console.error('Error in getAllSalespeople:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

/**
 * Get salesperson by ID
 */
async function getSalespersonById(req: Request, res: Response) {
  const { id } = req.params;

  try {
    const { data: salesperson, error } = await supabaseAdmin
      .from('salespeople')
      .select(`
        *,
        manager:salespeople!manager_id(first_name, last_name, email),
        territories:salesperson_territories(*),
        assignments:customer_salesperson_assignments(
          *,
          customer:customers(*)
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching salesperson:', error);
      return res.status(404).json({
        success: false,
        message: 'Salesperson not found'
      });
    }

    res.json({
      success: true,
      data: salesperson
    });

  } catch (error) {
    console.error('Error in getSalespersonById:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

/**
 * Create new salesperson
 */
async function createSalesperson(req: Request, res: Response) {
  const salespersonData = req.body;

  try {
    // Generate employee ID if not provided
    if (!salespersonData.employee_id) {
      const count = await supabaseAdmin
        .from('salespeople')
        .select('id', { count: 'exact' });
      
      salespersonData.employee_id = `SP${String(count.count! + 1).padStart(4, '0')}`;
    }

    const { data: salesperson, error } = await supabaseAdmin
      .from('salespeople')
      .insert({
        ...salespersonData,
        created_by: req.user?.id,
        updated_by: req.user?.id
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating salesperson:', error);
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(201).json({
      success: true,
      data: salesperson,
      message: 'Salesperson created successfully'
    });

  } catch (error) {
    console.error('Error in createSalesperson:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

/**
 * Update salesperson
 */
async function updateSalesperson(req: Request, res: Response) {
  const { id } = req.params;
  const updateData = req.body;

  try {
    const { data: salesperson, error } = await supabaseAdmin
      .from('salespeople')
      .update({
        ...updateData,
        updated_by: req.user?.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating salesperson:', error);
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.json({
      success: true,
      data: salesperson,
      message: 'Salesperson updated successfully'
    });

  } catch (error) {
    console.error('Error in updateSalesperson:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

/**
 * Assign customer to salesperson
 */
async function assignCustomerToSalesperson(req: Request, res: Response) {
  const { customerId, salespersonId, assignmentType = 'primary' } = req.body;

  try {
    // Check if assignment already exists
    const { data: existingAssignment } = await supabaseAdmin
      .from('customer_salesperson_assignments')
      .select('id')
      .eq('customer_id', customerId)
      .eq('assignment_type', assignmentType)
      .eq('is_active', true)
      .single();

    if (existingAssignment) {
      // Update existing assignment
      const { data: assignment, error } = await supabaseAdmin
        .from('customer_salesperson_assignments')
        .update({
          salesperson_id: salespersonId,
          assigned_by: req.user?.id,
          assigned_date: new Date().toISOString()
        })
        .eq('id', existingAssignment.id)
        .select()
        .single();

      if (error) throw error;

      return res.json({
        success: true,
        data: assignment,
        message: 'Customer assignment updated successfully'
      });
    } else {
      // Create new assignment
      const { data: assignment, error } = await supabaseAdmin
        .from('customer_salesperson_assignments')
        .insert({
          customer_id: customerId,
          salesperson_id: salespersonId,
          assignment_type: assignmentType,
          assigned_by: req.user?.id
        })
        .select()
        .single();

      if (error) throw error;

      return res.status(201).json({
        success: true,
        data: assignment,
        message: 'Customer assigned to salesperson successfully'
      });
    }

  } catch (error) {
    console.error('Error in assignCustomerToSalesperson:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

/**
 * Get available salespeople for assignment
 */
async function getAvailableSalespeople(req: Request, res: Response) {
  try {
    const { data: salespeople, error } = await supabaseAdmin
      .from('salespeople')
      .select('id, first_name, last_name, email, employee_id, current_year_sales, customer_count')
      .eq('is_active', true)
      .eq('employment_status', 'active')
      .order('last_name');

    if (error) {
      console.error('Error fetching available salespeople:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch available salespeople'
      });
    }

    res.json({
      success: true,
      data: salespeople
    });

  } catch (error) {
    console.error('Error in getAvailableSalespeople:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

// Configure routes
router.get('/', requireAuth, requireRole(['admin']), getAllSalespeople);
router.get('/available', requireAuth, requireRole(['admin']), getAvailableSalespeople);
router.get('/:id', requireAuth, requireRole(['admin']), getSalespersonById);
router.post('/', requireAuth, requireRole(['admin']), createSalesperson);
router.patch('/:id', requireAuth, requireRole(['admin']), updateSalesperson);
router.post('/assign-customer', requireAuth, requireRole(['admin']), assignCustomerToSalesperson);

export default router;

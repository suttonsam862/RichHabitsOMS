
import { Request, Response, Router } from 'express';
import { supabase } from '../../db';
import { requireAuth, requireRole } from '../auth/auth';

const router = Router();

// Role-based permission definitions
export const rolePermissions = {
  admin: {
    // Full system access
    manage_users: true,
    manage_orders: true,
    manage_catalog: true,
    manage_settings: true,
    view_analytics: true,
    manage_payments: true,
    manage_inventory: true,
    assign_manufacturers: true,
    assign_designers: true,
    manage_roles: true,
    view_all_data: true,
    delete_data: true,
    export_data: true,
    manage_integrations: true
  },
  salesperson: {
    // Sales-focused permissions
    manage_customers: true,
    create_orders: true,
    view_orders: true,
    edit_own_orders: true,
    view_catalog: true,
    manage_quotes: true,
    view_customer_data: true,
    communicate_customers: true,
    view_sales_analytics: true,
    manage_leads: true
  },
  designer: {
    // Design-focused permissions
    view_design_tasks: true,
    manage_design_files: true,
    upload_designs: true,
    comment_on_orders: true,
    view_order_details: true,
    manage_design_templates: true,
    approve_designs: true,
    request_order_changes: true,
    view_design_analytics: true
  },
  manufacturer: {
    // Production-focused permissions
    view_production_queue: true,
    update_production_status: true,
    manage_inventory: true,
    view_design_files: true,
    comment_on_designs: true,
    request_design_modifications: true,
    update_shipping_status: true,
    manage_quality_control: true,
    view_production_analytics: true,
    report_production_issues: true
  },
  customer: {
    // Customer-focused permissions
    view_own_orders: true,
    create_order_requests: true,
    upload_custom_files: true,
    communicate_with_team: true,
    view_order_status: true,
    make_payments: true,
    view_invoices: true,
    manage_profile: true,
    view_catalog: true
  }
};

// Custom permission management
export interface CustomPermissions {
  userId: string;
  permissions: Record<string, boolean>;
  dataAccess: {
    viewableOrders?: string[]; // Order IDs user can view
    editableOrders?: string[]; // Order IDs user can edit
    viewableCustomers?: string[]; // Customer IDs user can view
    restrictedData?: string[]; // Data types user cannot access
  };
  customLimitations?: {
    maxOrderValue?: number;
    allowedCategories?: string[];
    allowedStatuses?: string[];
    timeRestrictions?: {
      startTime?: string;
      endTime?: string;
      allowedDays?: number[];
    };
  };
}

/**
 * Get manufacturers only
 */
export async function getManufacturers(req: Request, res: Response) {
  try {
    console.log('Fetching manufacturers only...');

    // Get all users with manufacturer role from auth.users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
      console.error('Error fetching auth users:', authError);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch manufacturers',
        error: authError.message
      });
    }

    // Filter for manufacturer role users
    const manufacturers = authUsers.users
      .filter(user => user.user_metadata?.role === 'manufacturer')
      .map(user => ({
        id: user.id,
        email: user.email,
        firstName: user.user_metadata?.firstName || '',
        lastName: user.user_metadata?.lastName || '',
        username: user.user_metadata?.username || user.email?.split('@')[0] || '',
        company: user.user_metadata?.company || '',
        phone: user.user_metadata?.phone || '',
        role: user.user_metadata?.role || 'manufacturer',
        specialties: user.user_metadata?.specialties || '',
        created_at: user.created_at,
        isActive: user.email_confirmed_at !== null
      }));

    console.log(`Found ${manufacturers.length} manufacturers`);

    return res.json({
      success: true,
      users: manufacturers,
      total: manufacturers.length
    });
  } catch (error) {
    console.error('Error fetching manufacturers:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

/**
 * Get users by role with permission filtering
 */
export async function getUsersByRole(req: Request, res: Response) {
  try {
    const { role } = req.params;
    const { includeInactive = false } = req.query;

    console.log(`Fetching users with role: ${role}`);

    // Validate role
    if (!['admin', 'salesperson', 'designer', 'manufacturer', 'customer'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role specified'
      });
    }

    // Get all users from auth.users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
      console.error('Error fetching auth users:', authError);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch users',
        error: authError.message
      });
    }

    // Filter by role and activity status
    const filteredUsers = authUsers.users
      .filter(user => {
        const userRole = user.user_metadata?.role;
        const isActive = user.email_confirmed_at !== null;
        
        return userRole === role && (includeInactive || isActive);
      })
      .map(user => ({
        id: user.id,
        email: user.email,
        firstName: user.user_metadata?.firstName || '',
        lastName: user.user_metadata?.lastName || '',
        username: user.user_metadata?.username || user.email?.split('@')[0] || '',
        company: user.user_metadata?.company || '',
        phone: user.user_metadata?.phone || '',
        role: user.user_metadata?.role || role,
        specialties: user.user_metadata?.specialties || '',
        created_at: user.created_at,
        isActive: user.email_confirmed_at !== null,
        permissions: rolePermissions[role as keyof typeof rolePermissions] || {}
      }));

    console.log(`Found ${filteredUsers.length} users with role ${role}`);

    return res.json({
      success: true,
      users: filteredUsers,
      total: filteredUsers.length,
      role: role
    });
  } catch (error) {
    console.error('Error fetching users by role:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

/**
 * Get user permissions
 */
export async function getUserPermissions(req: Request, res: Response) {
  try {
    const { userId } = req.params;

    console.log(`Fetching permissions for user: ${userId}`);

    // Get user data from auth
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);

    if (userError || !userData.user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const userRole = userData.user.user_metadata?.role;
    const basePermissions = rolePermissions[userRole as keyof typeof rolePermissions] || {};

    // TODO: Fetch custom permissions from database if implemented
    // For now, return base role permissions
    return res.json({
      success: true,
      userId: userId,
      role: userRole,
      permissions: basePermissions,
      customPermissions: null // Placeholder for future custom permissions
    });
  } catch (error) {
    console.error('Error fetching user permissions:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

/**
 * Create a new user with specific role and permissions
 */
export async function createUserWithRole(req: Request, res: Response) {
  try {
    const {
      email,
      password,
      firstName,
      lastName,
      role,
      company,
      phone,
      specialties,
      customPermissions
    } = req.body;

    console.log(`Creating new user with role: ${role}`);

    // Validate required fields
    if (!email || !password || !firstName || !lastName || !role) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: email, password, firstName, lastName, and role are required'
      });
    }

    // Validate role
    if (!['admin', 'salesperson', 'designer', 'manufacturer', 'customer'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role specified'
      });
    }

    // Create user with Supabase Auth
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        firstName,
        lastName,
        role,
        company: company || '',
        phone: phone || '',
        specialties: specialties || '',
        username: email.split('@')[0],
        permissions: rolePermissions[role as keyof typeof rolePermissions] || {}
      }
    });

    if (error) {
      console.error('Error creating user:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create user',
        error: error.message
      });
    }

    if (!data?.user) {
      return res.status(500).json({
        success: false,
        message: 'Unknown error creating user'
      });
    }

    console.log('User created successfully:', data.user.id);

    return res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: {
        id: data.user.id,
        email: data.user.email,
        firstName,
        lastName,
        role,
        company: company || '',
        phone: phone || '',
        specialties: specialties || '',
        permissions: rolePermissions[role as keyof typeof rolePermissions] || {},
        created_at: data.user.created_at
      }
    });
  } catch (error) {
    console.error('Error creating user with role:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

// Configure routes
router.get('/manufacturers', requireAuth, requireRole(['admin']), getManufacturers);
router.get('/role/:role', requireAuth, requireRole(['admin']), getUsersByRole);
router.get('/:userId/permissions', requireAuth, requireRole(['admin']), getUserPermissions);
router.post('/create', requireAuth, requireRole(['admin']), createUserWithRole);

export default router;

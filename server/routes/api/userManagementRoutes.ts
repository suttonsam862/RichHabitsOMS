import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../../db';
import { requireAuth, requireRole } from '../auth/auth';
import { 
  createUserSchema, 
  updateUserSchema, 
  createRoleSchema,
  CreateUserData,
  UpdateUserData,
  CreateRoleData
} from '../../../shared/userManagementSchema';

const router = Router();

/**
 * GET /api/user-management/users
 * Get all users with comprehensive data
 */
router.get('/users', requireAuth, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 50, search, status, role } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = supabase
      .from('enhanced_user_profiles')
      .select(`
        *,
        custom_roles!custom_role (
          name,
          display_name,
          description
        ),
        user_sessions!inner (
          last_activity,
          status
        )
      `)
      .order('created_at', { ascending: false });

    // Apply filters
    if (search) {
      query = query.or(`email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (role) {
      query = query.eq('role', role);
    }

    // Apply pagination
    query = query.range(offset, offset + Number(limit) - 1);

    const { data: users, error, count } = await query;

    if (error) {
      console.error('Error fetching users:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch users',
        error: error.message
      });
    }

    // Get user statistics
    const { data: stats } = await supabase
      .from('enhanced_user_profiles')
      .select('status, role', { count: 'exact' });

    const analytics = {
      totalUsers: count || 0,
      activeUsers: users?.filter(u => u.status === 'active').length || 0,
      suspendedUsers: users?.filter(u => u.status === 'suspended').length || 0,
      pendingUsers: users?.filter(u => u.status === 'pending_activation').length || 0,
    };

    res.json({
      success: true,
      data: {
        users: users || [],
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: count || 0,
          totalPages: Math.ceil((count || 0) / Number(limit))
        },
        analytics
      }
    });

  } catch (error) {
    console.error('Error in user management route:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/user-management/users
 * Create a new user
 */
router.post('/users', requireAuth, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const validationResult = createUserSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationResult.error.format()
      });
    }

    const userData: CreateUserData = validationResult.data;
    const currentUser = (req as any).user;

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('enhanced_user_profiles')
      .select('id')
      .eq('email', userData.email)
      .single();

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Create user in Supabase Auth
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: userData.email,
      email_confirm: false,
      user_metadata: {
        role: userData.role,
        firstName: userData.firstName,
        lastName: userData.lastName
      }
    });

    if (authError) {
      console.error('Auth user creation error:', authError);
      return res.status(500).json({
        success: false,
        message: 'Failed to create auth user',
        error: authError.message
      });
    }

    // Create enhanced user profile
    const { data: userProfile, error: profileError } = await supabase
      .from('enhanced_user_profiles')
      .insert({
        id: authUser.user.id,
        username: userData.email.split('@')[0],
        email: userData.email,
        first_name: userData.firstName,
        last_name: userData.lastName,
        role: userData.role,
        phone: userData.phone,
        company: userData.company,
        department: userData.department,
        title: userData.title,
        status: 'pending_activation',
        created_by: currentUser.id
      })
      .select()
      .single();

    if (profileError) {
      console.error('Profile creation error:', profileError);
      // Cleanup: delete auth user if profile creation fails
      await supabase.auth.admin.deleteUser(authUser.user.id);
      return res.status(500).json({
        success: false,
        message: 'Failed to create user profile',
        error: profileError.message
      });
    }

    // Send invitation if requested
    if (userData.sendInvitation) {
      const invitationToken = generateInvitationToken();
      
      await supabase
        .from('user_invitations')
        .insert({
          email: userData.email,
          first_name: userData.firstName,
          last_name: userData.lastName,
          role: userData.role,
          invitation_token: invitationToken,
          invited_by: currentUser.id,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        });

      // TODO: Send invitation email
    }

    // Log audit event
    await logAuditEvent({
      userId: currentUser.id,
      action: 'create',
      resource: 'user',
      resourceId: userProfile.id,
      newValues: userProfile,
      success: true
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: { user: userProfile }
    });

  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PUT /api/user-management/users/:id
 * Update user information
 */
router.put('/users/:id', requireAuth, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validationResult = updateUserSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationResult.error.format()
      });
    }

    const updateData: UpdateUserData = validationResult.data;
    const currentUser = (req as any).user;

    // Get current user data for audit log
    const { data: currentUserData } = await supabase
      .from('enhanced_user_profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (!currentUserData) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update user profile
    const { data: updatedUser, error } = await supabase
      .from('enhanced_user_profiles')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
        last_modified_by: currentUser.id
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating user:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update user',
        error: error.message
      });
    }

    // Log audit event
    await logAuditEvent({
      userId: currentUser.id,
      action: 'update',
      resource: 'user',
      resourceId: id,
      oldValues: currentUserData,
      newValues: updatedUser,
      success: true
    });

    res.json({
      success: true,
      message: 'User updated successfully',
      data: { user: updatedUser }
    });

  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /api/user-management/users/:id
 * Delete or deactivate user
 */
router.delete('/users/:id', requireAuth, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { hardDelete = false } = req.query;
    const currentUser = (req as any).user;

    // Get user data for audit log
    const { data: userData } = await supabase
      .from('enhanced_user_profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (!userData) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (hardDelete === 'true') {
      // Hard delete from auth and profile
      await supabase.auth.admin.deleteUser(id);
      
      const { error } = await supabase
        .from('enhanced_user_profiles')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting user:', error);
        return res.status(500).json({
          success: false,
          message: 'Failed to delete user',
          error: error.message
        });
      }
    } else {
      // Soft delete - set status to terminated
      const { error } = await supabase
        .from('enhanced_user_profiles')
        .update({
          status: 'terminated',
          updated_at: new Date().toISOString(),
          last_modified_by: currentUser.id
        })
        .eq('id', id);

      if (error) {
        console.error('Error deactivating user:', error);
        return res.status(500).json({
          success: false,
          message: 'Failed to deactivate user',
          error: error.message
        });
      }
    }

    // Log audit event
    await logAuditEvent({
      userId: currentUser.id,
      action: 'delete',
      resource: 'user',
      resourceId: id,
      oldValues: userData,
      metadata: { hardDelete },
      success: true
    });

    res.json({
      success: true,
      message: hardDelete === 'true' ? 'User deleted successfully' : 'User deactivated successfully'
    });

  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/user-management/roles
 * Get all custom roles
 */
router.get('/roles', requireAuth, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const { data: roles, error } = await supabase
      .from('custom_roles')
      .select(`
        *,
        role_permissions (
          permission_id,
          granted,
          conditions,
          expires_at,
          permissions (
            resource,
            action,
            description
          )
        )
      `)
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Error fetching roles:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch roles',
        error: error.message
      });
    }

    res.json({
      success: true,
      data: { roles: roles || [] }
    });

  } catch (error) {
    console.error('Error in roles route:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/user-management/roles
 * Create a new custom role
 */
router.post('/roles', requireAuth, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const validationResult = createRoleSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationResult.error.format()
      });
    }

    const roleData: CreateRoleData = validationResult.data;
    const currentUser = (req as any).user;

    // Check if role name already exists
    const { data: existingRole } = await supabase
      .from('custom_roles')
      .select('id')
      .eq('name', roleData.name)
      .single();

    if (existingRole) {
      return res.status(409).json({
        success: false,
        message: 'Role with this name already exists'
      });
    }

    // Create the role
    const { data: newRole, error } = await supabase
      .from('custom_roles')
      .insert({
        name: roleData.name,
        display_name: roleData.displayName,
        description: roleData.description,
        inherits_from: roleData.inheritsFrom,
        permissions: roleData.permissions,
        created_by: currentUser.id
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating role:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create role',
        error: error.message
      });
    }

    // Log audit event
    await logAuditEvent({
      userId: currentUser.id,
      action: 'create',
      resource: 'role',
      resourceId: newRole.id,
      newValues: newRole,
      success: true
    });

    res.status(201).json({
      success: true,
      message: 'Role created successfully',
      data: { role: newRole }
    });

  } catch (error) {
    console.error('Error creating role:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Utility functions
function generateInvitationToken(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

async function logAuditEvent(event: {
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  oldValues?: any;
  newValues?: any;
  metadata?: any;
  success: boolean;
}) {
  try {
    await supabase
      .from('audit_logs')
      .insert({
        user_id: event.userId,
        action: event.action as any,
        resource: event.resource,
        resource_id: event.resourceId,
        old_values: event.oldValues,
        new_values: event.newValues,
        metadata: event.metadata,
        success: event.success
      });
  } catch (error) {
    console.error('Error logging audit event:', error);
    // Don't throw - audit logging shouldn't break the main operation
  }
}

export default router;
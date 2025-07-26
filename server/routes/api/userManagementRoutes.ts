import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../../db';
import { createClient } from '@supabase/supabase-js';
import type { 
  EnhancedUserProfile, 
  InsertEnhancedUserProfile,
  CreateUserData,
  UpdateUserData 
} from '../../../shared/userManagementSchema';
import { requireAuth, requireRole } from '../auth/auth';
import { sendEmail, getUserInviteEmailTemplate } from '../../email';

const router = Router();

// Schema definitions
const createUserSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Valid email is required'),
  role: z.string().min(1, 'Role is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().optional(),
  company: z.string().optional(),
  department: z.string().optional(),
  title: z.string().optional(),
  sendInvitation: z.boolean().default(false),
});

const updateUserSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
  department: z.string().optional(),
  title: z.string().optional(),
  status: z.enum(['active', 'inactive', 'suspended', 'terminated', 'pending_activation']).optional(),
  role: z.string().optional(),
});

/**
 * GET /api/user-management/users
 * Get all users with comprehensive data
 */
router.get('/users', requireAuth, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 50, search, status, role } = req.query;

    let query = supabase
      .from('enhanced_user_profiles')
      .select(`
        id,
        username,
        email,
        first_name,
        last_name,
        role,
        phone,
        company,
        department,
        title,
        status,
        is_email_verified,
        last_login,
        created_at,
        updated_at,
        permissions,
        custom_attributes
      `)
      .order('created_at', { ascending: false });

    // Apply filters
    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (role && role !== 'all') {
      query = query.eq('role', role);
    }

    // Apply pagination
    const offset = (Number(page) - 1) * Number(limit);
    query = query.range(offset, offset + Number(limit) - 1);

    const { data: users, error, count } = await query;

    if (error) {
      console.error('Error fetching users:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch users'
      });
    }

    res.json({
      success: true,
      data: {
        users: users || [],
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: count || 0,
          totalPages: Math.ceil((count || 0) / Number(limit))
        }
      }
    });

  } catch (error) {
    console.error('Error in get users:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * POST /api/user-management/users
 * Create new user with optional email invitation
 */
router.post('/users', requireAuth, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).user;
    const validationResult = createUserSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationResult.error.format()
      });
    }

    const userData = validationResult.data;
    const { firstName, lastName, email, role, password, phone, company, department, title, sendInvitation } = userData;

    console.log('Creating user:', email, 'with role:', role);

    // Create auth user first
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (authError || !authData.user) {
      console.error('Auth user creation error:', authError);
      return res.status(500).json({
        success: false,
        message: 'Failed to create auth user',
        error: authError?.message
      });
    }

    // Create enhanced user profile
    const { data: userProfile, error: profileError } = await supabase
      .from('enhanced_user_profiles')
      .insert({
        id: authData.user.id,
        username: email.split('@')[0],
        email,
        first_name: firstName,
        last_name: lastName,
        role,
        phone,
        company,
        department,
        title,
        status: 'active',
        is_email_verified: true,
        permissions: {},
        custom_attributes: {}
      })
      .select()
      .single();

    if (profileError) {
      console.error('Profile creation error:', profileError);
      // Cleanup: delete auth user if profile creation fails
      await supabase.auth.admin.deleteUser(authData.user.id);
      return res.status(500).json({
        success: false,
        message: 'Failed to create user profile',
        error: profileError.message
      });
    }

    // Send invitation email if requested
    let emailSent = false;
    if (sendInvitation) {
      try {
        const invitationToken = generateInvitationToken();
        
        // Store invitation in database
        await supabase
          .from('user_invitations')
          .insert({
            email,
            first_name: firstName,
            last_name: lastName,
            role,
            invitation_token: invitationToken,
            invited_by: currentUser.id,
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
          });

        // Generate email template
        const emailTemplate = getUserInviteEmailTemplate(
          email,
          firstName,
          lastName,
          invitationToken,
          password // Include temporary password
        );

        // Send email
        emailSent = await sendEmail(emailTemplate);
        
        if (emailSent) {
          console.log('✅ Invitation email sent successfully to:', email);
        } else {
          console.log('⚠️ Failed to send invitation email to:', email);
        }
      } catch (emailError) {
        console.error('Error sending invitation email:', emailError);
      }
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

    console.log('User created successfully:', userProfile.id);

    res.status(201).json({
      success: true,
      message: sendInvitation 
        ? `User created successfully. ${emailSent ? 'Invitation email sent.' : 'Email sending failed - please send login details manually.'}`
        : 'User created successfully',
      data: { user: userProfile },
      emailSent
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
    const currentUser = (req as any).user;
    const validationResult = updateUserSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationResult.error.format()
      });
    }

    const updates = validationResult.data;

    // Get current user data for audit log
    const { data: currentData } = await supabase
      .from('enhanced_user_profiles')
      .select('*')
      .eq('id', id)
      .single();

    // Update user profile
    const { data: updatedUser, error } = await supabase
      .from('enhanced_user_profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
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
      oldValues: currentData,
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
 * Delete user (soft delete by default)
 */
router.delete('/users/:id', requireAuth, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { hardDelete } = req.query;
    const currentUser = (req as any).user;

    // Get current user data for audit log
    const { data: currentData } = await supabase
      .from('enhanced_user_profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (hardDelete === 'true') {
      // Hard delete - remove from database
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

      // Also delete auth user
      await supabase.auth.admin.deleteUser(id);
    } else {
      // Soft delete - set status to terminated
      const { error } = await supabase
        .from('enhanced_user_profiles')
        .update({
          status: 'terminated',
          updated_at: new Date().toISOString()
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
      action: hardDelete === 'true' ? 'delete' : 'deactivate',
      resource: 'user',
      resourceId: id,
      oldValues: currentData,
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
      .from('user_audit_logs')
      .insert({
        user_id: event.userId,
        action: event.action,
        resource: event.resource,
        resource_id: event.resourceId,
        old_values: event.oldValues,
        new_values: event.newValues,
        metadata: event.metadata,
        success: event.success,
        timestamp: new Date().toISOString()
      });
  } catch (error) {
    console.error('Failed to log audit event:', error);
  }
}

export default router;
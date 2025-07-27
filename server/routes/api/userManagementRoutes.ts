import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../../db';
import { createClient } from '@supabase/supabase-js';

// Create admin client with service role key for user management operations
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
  password: z.string().optional(),
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

    let query = supabaseAdmin
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

    // Generate temporary password if none provided
    const finalPassword = password || generateTemporaryPassword();
    const isTemporaryPassword = !password;

    // Create auth user first using admin client
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: finalPassword,
      email_confirm: true,
      user_metadata: {
        role,
        firstName,
        lastName
      }
    });

    if (authError || !authData.user) {
      console.error('Auth user creation error:', authError);
      return res.status(500).json({
        success: false,
        message: 'Failed to create auth user',
        error: authError?.message
      });
    }

    // Create enhanced user profile using admin client
    const { data: userProfile, error: profileError } = await supabaseAdmin
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
        status: isTemporaryPassword ? 'pending_activation' : 'active',
        is_email_verified: true,
        permissions: {},
        custom_attributes: {
          requires_password_setup: isTemporaryPassword
        }
      })
      .select()
      .single();

    if (profileError) {
      console.error('Profile creation error:', profileError);
      // Cleanup: delete auth user if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
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
          isTemporaryPassword ? finalPassword : undefined // Only include password if it's temporary
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
      data: { 
        user: userProfile,
        temporaryPassword: isTemporaryPassword && !sendInvitation ? finalPassword : undefined
      },
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

function generateTemporaryPassword(): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%&*';
  const allChars = uppercase + lowercase + numbers + symbols;
  
  let password = '';
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  
  for (let i = 4; i < 12; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  return password.split('').sort(() => 0.5 - Math.random()).join('');
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

// Configure routes for manufacturers and role-based user queries
router.get('/manufacturers', requireAuth, requireRole(['admin', 'salesperson']), getManufacturers);
router.get('/role/:role', requireAuth, requireRole(['admin']), getUsersByRole);

/**
 * Get all manufacturers
 */
async function getManufacturers(req: Request, res: Response) {
  try {
    console.log('Fetching manufacturers...');

    // Get all users with manufacturer role
    const { data: users, error } = await supabaseAdmin.auth.admin.listUsers();
    
    if (error) {
      console.error('Error fetching users:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch manufacturers'
      });
    }

    // Filter for manufacturer role users
    const manufacturers = users.users
      .filter(user => user.user_metadata?.role === 'manufacturer')
      .map(user => ({
        id: user.id,
        email: user.email,
        firstName: user.user_metadata?.firstName || '',
        lastName: user.user_metadata?.lastName || '',
        company: user.user_metadata?.company || '',
        phone: user.user_metadata?.phone || '',
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
        status: user.email_confirmed_at ? 'active' : 'pending'
      }));

    console.log(`Found ${manufacturers.length} manufacturers`);

    res.json({
      success: true,
      data: manufacturers,
      count: manufacturers.length
    });

  } catch (error) {
    console.error('Error in getManufacturers:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

/**
 * Get all users by role
 */
async function getUsersByRole(req: Request, res: Response) {
  try {
    const { role } = req.params;
    console.log(`Fetching users with role: ${role}`);

    const { data: users, error } = await supabaseAdmin.auth.admin.listUsers();
    
    if (error) {
      console.error('Error fetching users:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch users'
      });
    }

    // Filter for specified role
    const filteredUsers = users.users
      .filter(user => user.user_metadata?.role === role)
      .map(user => ({
        id: user.id,
        email: user.email,
        firstName: user.user_metadata?.firstName || '',
        lastName: user.user_metadata?.lastName || '',
        company: user.user_metadata?.company || '',
        phone: user.user_metadata?.phone || '',
        role: user.user_metadata?.role || '',
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
        status: user.email_confirmed_at ? 'active' : 'pending'
      }));

    console.log(`Found ${filteredUsers.length} users with role ${role}`);

    res.json({
      success: true,
      data: filteredUsers,
      count: filteredUsers.length
    });

  } catch (error) {
    console.error('Error in getUsersByRole:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

// Configure routes
router.get('/manufacturers', requireAuth, requireRole(['admin', 'salesperson']), getManufacturers);
router.get('/role/:role', requireAuth, requireRole(['admin']), getUsersByRole);

export default router;

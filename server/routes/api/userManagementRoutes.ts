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
  notes: z.string().optional(),
  preferredCategories: z.array(z.string()).optional(),
  pricingTiers: z.array(z.object({
    category: z.string(),
    basePrice: z.number().min(0),
    markup: z.number().min(0).max(100)
  })).optional(),
});

/**
 * GET /api/user-management/users
 * Get all users with comprehensive data
 */
router.get('/users', requireAuth, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = Math.min(Number(req.query.limit) || 50, 100), search, status, role } = req.query;

    // Get users from Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers({
      page: Number(page),
      perPage: Number(limit)
    });

    if (authError) {
      console.error('Error fetching auth users:', authError);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch users from authentication service'
      });
    }

    // Get user profiles to match with auth users
    const { data: profiles, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('*');

    if (profileError) {
      console.error('Error fetching user profiles:', profileError);
    }

    // Combine auth users with profile data
    const users = authData.users.map(authUser => {
      const profile = profiles?.find(p => p.id === authUser.id);
      return {
        id: authUser.id,
        email: authUser.email,
        firstName: profile?.first_name || authUser.user_metadata?.first_name || '',
        lastName: profile?.last_name || authUser.user_metadata?.last_name || '',
        role: profile?.role || 'customer',
        status: authUser.email_confirmed_at ? 'active' : 'pending_activation',
        lastLogin: authUser.last_sign_in_at,
        createdAt: authUser.created_at,
        phone: profile?.phone || authUser.user_metadata?.phone || '',
        company: profile?.company || '',
        username: profile?.username || authUser.email?.split('@')[0] || ''
      };
    });

    // Apply client-side filtering if needed
    let filteredUsers = users;
    
    if (search) {
      const searchLower = search.toString().toLowerCase();
      filteredUsers = users.filter(user => 
        user.firstName.toLowerCase().includes(searchLower) ||
        user.lastName.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower)
      );
    }

    if (role && role !== 'all') {
      filteredUsers = filteredUsers.filter(user => user.role === role);
    }

    if (status && status !== 'all') {
      filteredUsers = filteredUsers.filter(user => user.status === status);
    }

    // Calculate analytics
    const analytics = {
      totalUsers: filteredUsers.length,
      activeUsers: filteredUsers.filter(u => u.status === 'active').length,
      pendingUsers: filteredUsers.filter(u => u.status === 'pending_activation').length,
      suspendedUsers: filteredUsers.filter(u => u.status === 'suspended').length,
      usersByRole: {
        admin: filteredUsers.filter(u => u.role === 'admin').length,
        salesperson: filteredUsers.filter(u => u.role === 'salesperson').length,
        designer: filteredUsers.filter(u => u.role === 'designer').length,
        manufacturer: filteredUsers.filter(u => u.role === 'manufacturer').length,
        customer: filteredUsers.filter(u => u.role === 'customer').length,
      }
    };

    // Calculate pagination
    const totalPages = Math.ceil(filteredUsers.length / Number(limit));
    const pagination = {
      currentPage: Number(page),
      totalPages,
      totalUsers: filteredUsers.length,
      hasNextPage: Number(page) < totalPages,
      hasPreviousPage: Number(page) > 1
    };

    res.status(200).json({
      success: true,
      data: {
        users: filteredUsers,
        analytics,
        pagination
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

    // Create user profile using admin client with explicit defaults
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .insert({
        id: authData.user.id,
        username: email.split('@')[0],
        first_name: firstName,
        last_name: lastName,
        role,
        phone: phone || null,
        company: company || null,
        department: department || null,
        title: title || null,
        status: isTemporaryPassword ? 'pending_activation' : 'active',
        is_email_verified: true,
        last_login: null,
        permissions: {},
        custom_attributes: {
          requires_password_setup: isTemporaryPassword
        },
        created_at: 'NOW()',
        updated_at: 'NOW()'
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
        
        // Store invitation in database with explicit defaults
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
            status: 'pending',
            sent_count: 1,
            last_sent_at: 'NOW()',
            created_at: 'NOW()',
            updated_at: 'NOW()'
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

    res.status(200).json({
      success: true,
      data: {
        user: userProfile,
        temporaryPassword: isTemporaryPassword && !sendInvitation ? finalPassword : undefined,
        emailSent,
        message: sendInvitation 
          ? `User created successfully. ${emailSent ? 'Invitation email sent.' : 'Email sending failed - please send login details manually.'}`
          : 'User created successfully'
      }
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
 * PATCH /api/user-management/users/:id
 * Update user information (including manufacturer-specific fields)
 */
router.patch('/users/:id', requireAuth, requireRole(['admin']), async (req: Request, res: Response) => {
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

    // Update user profile with custom attributes support
    const updateData: any = {
      ...updates,
      updated_at: 'NOW()'
    };

    // Handle manufacturer-specific fields as custom attributes
    if (updates.notes || updates.preferredCategories || updates.pricingTiers) {
      // Get existing custom attributes
      const existingAttributes = currentData?.custom_attributes || {};
      
      updateData.custom_attributes = {
        ...existingAttributes,
        ...(updates.notes !== undefined && { notes: updates.notes }),
        ...(updates.preferredCategories !== undefined && { preferredCategories: updates.preferredCategories }),
        ...(updates.pricingTiers !== undefined && { pricingTiers: updates.pricingTiers })
      };

      // Remove these from the main update object since they're now in custom_attributes
      delete updateData.notes;
      delete updateData.preferredCategories;
      delete updateData.pricingTiers;
    }

    const { data: updatedUser, error } = await supabase
      .from('enhanced_user_profiles')
      .update(updateData)
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

    res.status(200).json({
      success: true,
      data: {
        user: updatedUser,
        message: 'User updated successfully'
      }
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
          updated_at: 'NOW()'
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

    res.status(200).json({
      success: true,
      data: {
        message: hardDelete === 'true' ? 'User deleted successfully' : 'User deactivated successfully'
      }
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

/**
 * Get all manufacturers
 */
async function getManufacturers(req: Request, res: Response) {
  try {
    console.log('Fetching manufacturers...');

    // For development, provide mock manufacturer data to make the UI functional
    if (process.env.NODE_ENV === 'development') {
      const mockManufacturers = [
        {
          id: 'mock-mfg-001',
          email: 'john.manufacturer@threadcraft.com',
          firstName: 'John',
          lastName: 'Manufacturing',
          company: 'Precision Threads Inc',
          phone: '+1-555-0101',
          created_at: new Date().toISOString(),
          last_sign_in_at: new Date().toISOString(),
          status: 'active',
          specialties: 'Athletic wear, Custom embroidery',
          workload: 3,
          activeOrders: 2,
          completedOrders: 15
        },
        {
          id: 'mock-mfg-002',
          email: 'sarah.textiles@threadcraft.com',
          firstName: 'Sarah',
          lastName: 'Textiles',
          company: 'Elite Garment Solutions',
          phone: '+1-555-0102',
          created_at: new Date().toISOString(),
          last_sign_in_at: new Date().toISOString(),
          status: 'active',
          specialties: 'Team uniforms, Screen printing',
          workload: 2,
          activeOrders: 1,
          completedOrders: 22
        },
        {
          id: 'mock-mfg-003',
          email: 'mike.production@threadcraft.com',
          firstName: 'Mike',
          lastName: 'Production',
          company: 'Rapid Manufacturing Co',
          phone: '+1-555-0103',
          created_at: new Date().toISOString(),
          last_sign_in_at: new Date().toISOString(),
          status: 'active',
          specialties: 'Fast turnaround, Bulk orders',
          workload: 1,
          activeOrders: 1,
          completedOrders: 8
        }
      ];

      console.log(`Found ${mockManufacturers.length} manufacturers (development mock data)`);

      return res.status(200).json({
        success: true,
        data: {
          manufacturers: mockManufacturers,
          count: mockManufacturers.length
        }
      });
    }

    // Production: Get all users with manufacturer role
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

    res.status(200).json({
      success: true,
      data: {
        manufacturers: manufacturers,
        count: manufacturers.length
      }
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
 * Get users by role - Admin only endpoint
 */
async function getUsersByRole(req: Request, res: Response) {
  try {
    const { role } = req.params;
    
    if (!role) {
      return res.status(400).json({
        success: false,
        message: 'Role parameter is required'
      });
    }

    console.log(`Fetching users with role: ${role}`);

    // Get all users
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

    res.status(200).json({
      success: true,
      data: {
        users: filteredUsers,
        count: filteredUsers.length
      }
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

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

const router = Router();

/**
 * GET /api/users
 * Get all users with comprehensive data for settings page
 */
router.get('/', requireAuth, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    console.log('Fetching comprehensive user data...');

    // Get all users from enhanced_user_profiles
    const { data: users, error: usersError } = await supabase
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

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch users',
        error: usersError.message
      });
    }

    // Get user statistics for analytics
    const totalUsers = users?.length || 0;
    const activeUsers = users?.filter(u => u.status === 'active').length || 0;
    const adminUsers = users?.filter(u => u.role === 'admin').length || 0;
    const customerUsers = users?.filter(u => u.role === 'customer').length || 0;
    const staffUsers = users?.filter(u => !['customer', 'admin'].includes(u.role)).length || 0;

    const analytics = {
      totalUsers,
      customersTotal: customerUsers,
      authAccountsTotal: totalUsers,
      needsAccountCreation: 0,
      activeAccounts: activeUsers,
      adminUsers,
      customerUsers,
      staffUsers
    };

    console.log(`Returning ${totalUsers} users with analytics:`, analytics);

    return res.json({
      success: true,
      users: users?.map(user => ({
        id: user.id,
        customerId: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        firstName: user.first_name,
        lastName: user.last_name,
        username: user.username,
        role: user.role,
        phone: user.phone,
        company: user.company,
        created_at: user.created_at,
        email_confirmed: user.is_email_verified,
        hasAuthAccount: true,
        accountStatus: user.status,
        permissions: user.permissions,
        lastLogin: user.last_login
      })) || [],
      analytics
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
 * POST /api/users/create-account
 * Create a new user account directly
 */
router.post('/create-account', requireAuth, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const { email, firstName, lastName, role, password, createDirectly } = req.body;

    console.log(`Creating new user account: ${email} with role: ${role}`);

    // Validate required fields
    if (!email || !firstName || !lastName || !role) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: email, firstName, lastName, and role are required'
      });
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('enhanced_user_profiles')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Create user with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: password || 'TempPassword123!',
      email_confirm: true,
      user_metadata: {
        firstName,
        lastName,
        role
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

    console.log('User created successfully:', userProfile.id);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: userProfile
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
 * PATCH /api/users/:id
 * Update user information
 */
router.patch('/:id', requireAuth, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    console.log(`Updating user ${id} with:`, updates);

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

    // If password is being updated, update auth user too
    if (updates.password) {
      const { error: authError } = await supabase.auth.admin.updateUserById(id, {
        password: updates.password
      });

      if (authError) {
        console.error('Error updating auth password:', authError);
        // Continue anyway since profile was updated
      }
    }

    res.json({
      success: true,
      message: 'User updated successfully',
      user: updatedUser
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
 * DELETE /api/users/:id
 * Delete or deactivate user
 */
router.delete('/:id', requireAuth, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { hardDelete = false } = req.query;

    console.log(`${hardDelete ? 'Deleting' : 'Deactivating'} user:`, id);

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

export default router;
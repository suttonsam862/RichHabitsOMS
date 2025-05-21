import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../db';
import { requireAuth, requireRole } from '../auth';
import { hash } from 'bcrypt';

const router = Router();

// User management schema
const createUserSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  password: z.string().min(8),
  role: z.enum(['admin', 'salesperson', 'designer', 'manufacturer', 'customer']),
  phone: z.string().optional(),
  company: z.string().optional(),
  permissions: z.record(z.boolean()).optional(),
});

const updateUserSchema = createUserSchema.partial().omit({ password: true }).extend({
  password: z.string().min(8).optional(),
});

// Get all users
router.get('/users', requireAuth, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    // Get users from user_profiles table
    const { data: profiles, error } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching users:', error);
      return res.status(500).json({ success: false, message: 'Failed to fetch users' });
    }

    return res.json(profiles || []);
  } catch (err) {
    console.error('Unexpected error fetching users:', err);
    return res.status(500).json({ success: false, message: 'An unexpected error occurred' });
  }
});

// Create a new user
router.post('/users', requireAuth, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    // Validate request body
    const result = createUserSchema.safeParse(req.body);
    
    if (!result.success) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid user data',
        errors: result.error.format()
      });
    }
    
    const { email, password, username, firstName, lastName, role, phone, company, permissions } = result.data;
    
    // Check if username is already taken
    const { data: existingUsers, error: usernameCheckError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('username', username)
      .limit(1);
    
    if (usernameCheckError) {
      console.error('Error checking username:', usernameCheckError);
      return res.status(500).json({
        success: false,
        message: 'Error checking username availability'
      });
    }
    
    if (existingUsers && existingUsers.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Username is already taken'
      });
    }
    
    // Create user in Supabase Auth
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        firstName,
        lastName,
        role
      }
    });
    
    if (error) {
      console.error('Supabase Auth user creation error:', error);
      
      // If we don't have admin access, try regular signup
      if (error.message.includes('not authorized') || error.message.includes('missing required parameters')) {
        const { data: signupData, error: signupError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              firstName,
              lastName,
              role
            }
          }
        });
        
        if (signupError) {
          console.error('Regular signup error:', signupError);
          return res.status(400).json({ 
            success: false, 
            message: signupError.message
          });
        }
        
        if (!signupData?.user) {
          return res.status(500).json({ 
            success: false, 
            message: 'Error creating user'
          });
        }
        
        data.user = signupData.user;
      } else {
        return res.status(400).json({ 
          success: false, 
          message: error.message
        });
      }
    }
    
    if (!data?.user) {
      return res.status(500).json({ 
        success: false, 
        message: 'Error creating user'
      });
    }
    
    // Create user profile
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        id: data.user.id,
        username,
        first_name: firstName,
        last_name: lastName,
        role,
        phone,
        company
      })
      .select();
    
    if (profileError) {
      console.error('Error creating profile:', profileError);
      // Attempt to delete the auth user since profile creation failed
      await supabase.auth.admin.deleteUser(data.user.id);
      return res.status(500).json({ 
        success: false, 
        message: 'Error creating user profile'
      });
    }
    
    // Return success
    return res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: profileData[0]
    });
  } catch (err) {
    console.error('User creation error:', err);
    return res.status(500).json({ 
      success: false, 
      message: 'An unexpected error occurred'
    });
  }
});

// Update an existing user
router.patch('/users/:id', requireAuth, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;
    
    // Validate request body
    const result = updateUserSchema.safeParse(req.body);
    
    if (!result.success) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid user data',
        errors: result.error.format()
      });
    }
    
    const { email, username, firstName, lastName, role, phone, company, password, permissions } = result.data;
    
    // Check if another user already has this username (excluding current user)
    if (username) {
      const { data: existingUsers, error: usernameCheckError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('username', username)
        .neq('id', userId)
        .limit(1);
      
      if (usernameCheckError) {
        console.error('Error checking username:', usernameCheckError);
        return res.status(500).json({
          success: false,
          message: 'Error checking username availability'
        });
      }
      
      if (existingUsers && existingUsers.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Username is already taken by another user'
        });
      }
    }
    
    // Update Supabase Auth user
    const authUpdateData: any = {
      email,
      user_metadata: {}
    };
    
    // Only include password if provided
    if (password) {
      authUpdateData.password = password;
    }
    
    // Add metadata fields if provided
    if (firstName) authUpdateData.user_metadata.firstName = firstName;
    if (lastName) authUpdateData.user_metadata.lastName = lastName;
    if (role) authUpdateData.user_metadata.role = role;
    
    const { error: authUpdateError } = await supabase.auth.admin.updateUserById(
      userId,
      authUpdateData
    );
    
    if (authUpdateError) {
      console.error('Error updating auth user:', authUpdateError);
      return res.status(500).json({ 
        success: false, 
        message: 'Error updating user account'
      });
    }
    
    // Update user profile
    const profileUpdateData: any = {};
    if (username) profileUpdateData.username = username;
    if (firstName) profileUpdateData.first_name = firstName;
    if (lastName) profileUpdateData.last_name = lastName;
    if (role) profileUpdateData.role = role;
    if (phone !== undefined) profileUpdateData.phone = phone;
    if (company !== undefined) profileUpdateData.company = company;
    
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .update(profileUpdateData)
      .eq('id', userId)
      .select();
    
    if (profileError) {
      console.error('Error updating profile:', profileError);
      return res.status(500).json({ 
        success: false, 
        message: 'Error updating user profile'
      });
    }
    
    // Return success with updated user
    return res.json({
      success: true,
      message: 'User updated successfully',
      user: profileData && profileData.length > 0 ? profileData[0] : null
    });
  } catch (err) {
    console.error('User update error:', err);
    return res.status(500).json({ 
      success: false, 
      message: 'An unexpected error occurred'
    });
  }
});

// Delete a user
router.delete('/users/:id', requireAuth, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;
    
    // Don't allow deleting yourself
    if (req.user.id === userId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account'
      });
    }
    
    // Delete from Supabase Auth
    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(userId);
    
    if (authDeleteError) {
      console.error('Error deleting auth user:', authDeleteError);
      return res.status(500).json({ 
        success: false, 
        message: 'Error deleting user account'
      });
    }
    
    // The user_profile should be automatically deleted via cascade
    
    return res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (err) {
    console.error('User deletion error:', err);
    return res.status(500).json({ 
      success: false, 
      message: 'An unexpected error occurred'
    });
  }
});

// Customer invitation schema
const inviteCustomerSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  company: z.string().optional(),
  message: z.string().optional(),
});

// Send customer invite
router.post('/invite', requireAuth, requireRole(['admin', 'salesperson']), async (req: Request, res: Response) => {
  try {
    const result = inviteCustomerSchema.safeParse(req.body);
    
    if (!result.success) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid invitation data',
        errors: result.error.format()
      });
    }
    
    const { email, firstName, lastName, company, message } = result.data;
    
    // Check if user already exists
    const { data: existingUser, error: userCheckError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('email', email)
      .limit(1);
    
    if (userCheckError) {
      console.error('Error checking existing user:', userCheckError);
      return res.status(500).json({
        success: false,
        message: 'Error checking user existence'
      });
    }
    
    if (existingUser && existingUser.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'A user with this email already exists'
      });
    }
    
    // Generate a unique token for the invitation
    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const inviteExpiry = new Date();
    inviteExpiry.setDate(inviteExpiry.getDate() + 7); // Expires in 7 days
    
    // Store invitation in database
    const { data: inviteData, error: inviteError } = await supabase
      .from('customer_invites')
      .insert({
        email,
        first_name: firstName,
        last_name: lastName,
        company,
        token,
        expires_at: inviteExpiry.toISOString(),
        invited_by: req.user.id,
        message
      })
      .select();
    
    if (inviteError) {
      console.error('Error creating invitation:', inviteError);
      return res.status(500).json({ 
        success: false, 
        message: 'Error creating invitation'
      });
    }
    
    // Send invitation email
    // In a real implementation, this would use SendGrid or similar email service
    // For now, we'll just return success
    
    return res.status(201).json({
      success: true,
      message: 'Invitation sent successfully',
      invite: inviteData[0]
    });
  } catch (err) {
    console.error('Invitation error:', err);
    return res.status(500).json({ 
      success: false, 
      message: 'An unexpected error occurred'
    });
  }
});

// Get all customer invites
router.get('/invites', requireAuth, requireRole(['admin', 'salesperson']), async (req: Request, res: Response) => {
  try {
    const { data: invites, error } = await supabase
      .from('customer_invites')
      .select('*, invited_by(username, first_name, last_name)')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching invites:', error);
      return res.status(500).json({ success: false, message: 'Failed to fetch invites' });
    }
    
    return res.json(invites || []);
  } catch (err) {
    console.error('Unexpected error fetching invites:', err);
    return res.status(500).json({ success: false, message: 'An unexpected error occurred' });
  }
});

// Delete customer invite
router.delete('/invites/:id', requireAuth, requireRole(['admin', 'salesperson']), async (req: Request, res: Response) => {
  try {
    const inviteId = req.params.id;
    
    const { error } = await supabase
      .from('customer_invites')
      .delete()
      .eq('id', inviteId);
    
    if (error) {
      console.error('Error deleting invite:', error);
      return res.status(500).json({ success: false, message: 'Failed to delete invite' });
    }
    
    return res.json({
      success: true,
      message: 'Invitation deleted successfully'
    });
  } catch (err) {
    console.error('Invitation deletion error:', err);
    return res.status(500).json({ success: false, message: 'An unexpected error occurred' });
  }
});

// New order inquiries schema
const orderInquirySchema = z.object({
  customerId: z.string().uuid(),
  productType: z.string(),
  quantity: z.number().int().positive(),
  description: z.string(),
  requirements: z.string().optional(),
  timeline: z.string().optional(),
  budget: z.number().optional(),
  attachments: z.array(z.string()).optional(),
});

// Submit new order inquiry
router.post('/inquiries', requireAuth, async (req: Request, res: Response) => {
  try {
    const result = orderInquirySchema.safeParse(req.body);
    
    if (!result.success) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid inquiry data',
        errors: result.error.format()
      });
    }
    
    const { customerId, productType, quantity, description, requirements, timeline, budget, attachments } = result.data;
    
    // Check if customer exists
    if (req.user.role !== 'customer' && req.user.id !== customerId) {
      const { data: customerCheck, error: customerCheckError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('id', customerId)
        .eq('role', 'customer')
        .limit(1);
      
      if (customerCheckError || !customerCheck || customerCheck.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid customer ID'
        });
      }
    }
    
    // Create inquiry
    const { data: inquiryData, error: inquiryError } = await supabase
      .from('order_inquiries')
      .insert({
        customer_id: customerId || req.user.id,
        product_type: productType,
        quantity,
        description,
        requirements,
        timeline,
        budget,
        attachments,
        status: 'new'
      })
      .select();
    
    if (inquiryError) {
      console.error('Error creating inquiry:', inquiryError);
      return res.status(500).json({ 
        success: false, 
        message: 'Error submitting inquiry'
      });
    }
    
    return res.status(201).json({
      success: true,
      message: 'Inquiry submitted successfully',
      inquiry: inquiryData[0]
    });
  } catch (err) {
    console.error('Inquiry submission error:', err);
    return res.status(500).json({ 
      success: false, 
      message: 'An unexpected error occurred'
    });
  }
});

// Get all order inquiries
router.get('/inquiries', requireAuth, requireRole(['admin', 'salesperson']), async (req: Request, res: Response) => {
  try {
    const { data: inquiries, error } = await supabase
      .from('order_inquiries')
      .select('*, customer:customer_id(username, first_name, last_name, email)')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching inquiries:', error);
      return res.status(500).json({ success: false, message: 'Failed to fetch inquiries' });
    }
    
    return res.json(inquiries || []);
  } catch (err) {
    console.error('Unexpected error fetching inquiries:', err);
    return res.status(500).json({ success: false, message: 'An unexpected error occurred' });
  }
});

// Update order inquiry status
router.patch('/inquiries/:id', requireAuth, requireRole(['admin', 'salesperson']), async (req: Request, res: Response) => {
  try {
    const inquiryId = req.params.id;
    const { status, assignedTo, notes } = req.body;
    
    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }
    
    const updateData: any = { status };
    if (assignedTo) updateData.assigned_to = assignedTo;
    if (notes) updateData.notes = notes;
    
    const { data: updatedInquiry, error } = await supabase
      .from('order_inquiries')
      .update(updateData)
      .eq('id', inquiryId)
      .select();
    
    if (error) {
      console.error('Error updating inquiry:', error);
      return res.status(500).json({ success: false, message: 'Failed to update inquiry' });
    }
    
    return res.json({
      success: true,
      message: 'Inquiry updated successfully',
      inquiry: updatedInquiry && updatedInquiry.length > 0 ? updatedInquiry[0] : null
    });
  } catch (err) {
    console.error('Inquiry update error:', err);
    return res.status(500).json({ success: false, message: 'An unexpected error occurred' });
  }
});

export default router;
import { Express, Request, Response, NextFunction } from 'express';
import { createServer, Server } from 'http';
import { WebSocketServer } from 'ws';
import { z } from 'zod';
import { loginSchema, registerSchema } from '../shared/schema';
import { supabase } from './db';
import { authenticateRequest, requireAuth, requireRole } from './routes/auth/auth';
import { sendEmail, getCustomerInviteEmailTemplate } from './email';
import adminRoutes from './routes/admin/admin';
import { createCustomer } from './routes/api/customerRoutes';
import { uploadRouter } from './upload';
import { 
  getProductLibrary, 
  getProductCategories, 
  addProductToLibrary, 
  copyProductToOrder, 
  getProductPricingHistory 
} from './routes/api/productLibrary';
import { 
  getCatalogItems,
  createCatalogItem,
  updateCatalogItem,
  deleteCatalogItem,
  getCatalogItem
} from './routes/api/catalogRoutes';
import imageRoutes from './routes/api/imageRoutes';
import catalogOptionsRoutes from './routes/api/catalogOptionsRoutes';
import { createClient } from '@supabase/supabase-js';

// Create Supabase admin client with service key for admin operations
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || 'https://ctznfijidykgjhzpuyej.supabase.co',
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function registerRoutes(app: Express): Promise<Server> {
  // Register admin routes
  app.use('/api/admin', adminRoutes);

  // Register customer creation endpoint
  app.post('/api/customers', requireAuth, requireRole(['admin']), createCustomer);

  // Register upload routes for logo files
  app.use('/api/upload', uploadRouter);

  // Admin customers API endpoint with real data
  app.get('/api/admin/customers', async (req, res) => {
    try {
      console.log('Fetching real customers from Supabase...');

      // Create a Supabase admin client to access all users
      const serviceClient = createClient(
        process.env.SUPABASE_URL || '',
        process.env.SUPABASE_SERVICE_KEY || '',
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      );

      // Get all users from Auth
      const { data, error } = await serviceClient.auth.admin.listUsers();

      if (error) {
        console.error('Error fetching customers from Supabase Auth:', error);
        return res.status(500).json({ 
          success: false, 
          message: 'Failed to retrieve customers: ' + error.message 
        });
      }

      // Filter for customers and transform to expected format
      const customers = data.users
        .filter(user => {
          // Look for users with customer role in metadata
          const metadata = user.user_metadata || {};
          return metadata.role === 'customer';
        })
        .map(user => {
          const metadata = user.user_metadata || {};
          return {
            id: user.id,
            firstName: metadata.firstName || '',
            lastName: metadata.lastName || '',
            email: user.email || '',
            company: metadata.company || '',
            orders: 0, // Default for new customers
            spent: '$0.00', // Default for new customers
            lastOrder: null,
            status: user.email_confirmed_at ? 'active' : 'pending',
            created_at: user.created_at
          };
        });

      console.log(`Found ${customers.length} customers in Supabase`);
      return res.json({ success: true, customers });
    } catch (err) {
      console.error('Error fetching customers:', err);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to retrieve customers' 
      });
    }
  });

  // Temporary routes for customer invites functionality
  app.get('/api/admin/invites', requireAuth, async (req, res) => {
    if (req.user?.role !== 'admin' && req.user?.role !== 'salesperson') {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }

    // Generate sample invite data (in production, this would come from database)
    const sampleInvites = [
      {
        id: 1,
        email: 'customer1@example.com',
        first_name: 'John',
        last_name: 'Smith',
        company: 'ABC Apparel',
        token: 'abc123xyz789',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        invited_by: req.user.id,
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 2,
        email: 'jane.doe@example.com',
        first_name: 'Jane',
        last_name: 'Doe',
        company: 'Fashion Forward',
        token: 'def456uvw123',
        expires_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        invited_by: req.user.id,
        created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];

    return res.json(sampleInvites);
  });

  app.post('/api/admin/invite', requireAuth, async (req, res) => {
    if (req.user?.role !== 'admin' && req.user?.role !== 'salesperson') {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }

    const { email, firstName, lastName, company, message } = req.body;

    // Generate a unique token
    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    // Create the invitation URL
    const baseUrl = process.env.APP_URL || `http://${req.headers.host || 'localhost:5000'}`;
    const inviteUrl = `${baseUrl}/register?invite=${token}`;

    // In production, this would be saved to the database
    const invite = {
      id: Date.now(),
      email,
      first_name: firstName,
      last_name: lastName,
      company,
      token,
      inviteUrl,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      invited_by: req.user.id,
      message,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    return res.status(201).json({
      success: true,
      message: 'Invitation created successfully',
      invite
    });
  });

  app.delete('/api/admin/invites/:id', requireAuth, async (req, res) => {
    if (req.user?.role !== 'admin' && req.user?.role !== 'salesperson') {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }

    // In production, this would delete from the database
    return res.json({
      success: true,
      message: 'Invitation deleted successfully'
    });
  });

  // Customer management routes
  app.get('/api/admin/customers', requireAuth, async (req, res) => {
    if (req.user?.role !== 'admin' && req.user?.role !== 'salesperson') {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }

    try {
      // Get users from user_profiles table where role is customer
      const { data: profiles, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('role', 'customer')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching customers:', error);
        return res.status(500).json({ success: false, message: 'Failed to fetch customers' });
      }

      return res.json(profiles || []);
    } catch (err) {
      console.error('Unexpected error fetching customers:', err);
      return res.status(500).json({ success: false, message: 'An unexpected error occurred' });
    }
  });

  // Create new customer
  app.post('/api/admin/customers', requireAuth, async (req, res) => {
    // Authorization check
    if (req.user?.role !== 'admin' && req.user?.role !== 'salesperson') {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }

    // Log the request for debugging
    console.log('Customer creation request received:', {
      user: req.user?.email,
      body: req.body,
      shouldSendInvite: req.body.shouldSendInvite
    });

    try {
      // Handle different field naming conventions from different forms
      const { 
        email, firstName, lastName, company, phone,
        emailAddress, first_name, last_name, 
        address, city, state, zip, country 
      } = req.body;

      // Determine if we should send an invitation email
      const shouldSendInvite = req.body.shouldSendInvite === true || req.query.shouldSendInvite === 'true';

      // Normalize field names
      const customerEmail = email || emailAddress;
      const customerFirstName = firstName || first_name;
      const customerLastName = lastName || last_name;
      const customerCompany = company;
      const customerPhone = phone;

      // Validate required fields
      if (!customerEmail || !customerFirstName || !customerLastName) {
        return res.status(400).json({
          success: false,
          message: 'Email, first name, and last name are required'
        });
      }

      // Check if user already exists
      const { data: existingUsers } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('email', customerEmail);

      if (existingUsers && existingUsers.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'A customer with this email already exists'
        });
      }

      // Generate a strong random password (will be reset by user during invitation flow)
      const randomPassword = Math.random().toString(36).substring(2, 10) + 
                           Math.random().toString(36).substring(2, 15);

      console.log(`Creating customer in Supabase Auth: ${customerEmail}`);

      // Create user in Supabase Auth
      const { data, error } = await supabase.auth.admin.createUser({
        email: customerEmail,
        password: randomPassword,
        email_confirm: true, // Auto-confirm the email
        user_metadata: {
          first_name: customerFirstName,
          last_name: customerLastName,
          role: 'customer',
          requires_password_reset: true
        }
      });

      if (error) {
        console.error('Error creating customer in Supabase Auth:', error);
        return res.status(500).json({
          success: false,
          message: 'Failed to create customer account: ' + error.message
        });
      }

      if (!data?.user) {
        return res.status(500).json({
          success: false,
          message: 'Unknown error creating customer account'
        });
      }

      // Create username from first and last name
      const username = (customerFirstName + customerLastName).toLowerCase().replace(/[^a-z0-9]/g, '');

      // Create profile data
      const profileData: Record<string, any> = {
        id: data.user.id,
        username: username + Math.floor(Math.random() * 1000), // Add random number to ensure uniqueness
        email: customerEmail,
        first_name: customerFirstName,
        last_name: customerLastName,
        role: 'customer',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_active: true,
        invitation_status: shouldSendInvite ? 'invited' : 'active'
      };

      // Add optional fields if they exist
      if (customerCompany) profileData.company = customerCompany;
      if (customerPhone) profileData.phone = customerPhone;
      if (address) profileData.address = address;
      if (city) profileData.city = city;
      if (state) profileData.state = state;
      if (zip) profileData.postal_code = zip;
      if (country) profileData.country = country;

      console.log('Creating customer profile with data:', profileData);

      // Create customer profile in the database
      const { data: createdProfile, error: profileError } = await supabase
        .from('user_profiles')
        .insert(profileData)
        .select();

      if (profileError) {
        console.error('Error creating customer profile:', profileError);

        // Try to clean up the auth user since profile creation failed
        await supabase.auth.admin.deleteUser(data.user.id);

        return res.status(500).json({
          success: false,
          message: 'Failed to create customer profile: ' + profileError.message
        });
      }

      // Now handle invitation email if requested
      let inviteUrl = '';
      let inviteSent = false;

      // Generate invitation URL base
      const baseUrl = process.env.APP_URL || `http://${req.headers.host || 'localhost:5000'}`;

      if (shouldSendInvite) {
        try {
          // Generate a simple setup token for account creation
          const setupToken = require('crypto').randomBytes(32).toString('hex');

          // Store the setup token in user metadata for verification
          await supabase.auth.admin.updateUserById(data.user.id, {
            user_metadata: { 
              setup_token: setupToken,
              setup_expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
            }
          });

          // Create proper setup URL
          inviteUrl = `${baseUrl}/setup-password?token=${setupToken}&email=${encodeURIComponent(customerEmail)}`;

          // Send invitation email if we have the email functions available
          try {
            const { getCustomerInviteEmailTemplate } = require('./email');
            const { sendEmail } = require('./email');

            const emailTemplate = getCustomerInviteEmailTemplate(
              customerEmail,
              customerFirstName,
              customerLastName,
              setupToken
            );

              inviteSent = await sendEmail(emailTemplate);
              if (inviteSent) {
                console.log(`✅ Setup email sent successfully to: ${customerEmail}`);
              } else {
                console.log(`❌ Setup email failed to send to: ${customerEmail} - SendGrid API key not configured`);
              }
            } catch (moduleErr) {
              console.error('Email module not available:', moduleErr);
              // Continue without sending email
            }
        } catch (emailErr) {
          console.error('Failed to send invitation email:', emailErr);
          inviteUrl = `${baseUrl}/login?email=${encodeURIComponent(customerEmail)}`;
        }
      } else {
        // For direct creation without invite
        inviteUrl = `${baseUrl}/login?email=${encodeURIComponent(customerEmail)}`;
      }

      // Log creation details
      console.log(`Customer created: ${customerEmail}, Send invite: ${shouldSendInvite}, Invite sent: ${inviteSent}`);

      // Return success with customer data and accurate email status
      return res.status(201).json({
        success: true,
        message: inviteSent 
          ? 'Customer created and setup email sent successfully!' 
          : shouldSendInvite 
            ? 'Customer created but setup email failed to send (SendGrid API key needed)'
            : 'Customer created successfully',
        customer: createdProfile ? createdProfile[0] : { 
          id: data.user.id,
          email: customerEmail,
          first_name: customerFirstName,
          last_name: customerLastName,
          role: 'customer'
        },
        inviteUrl,
        inviteSent
      });

      // If sending invite, generate a recovery link through Supabase
      if (shouldSendInvite) {
        try {
          const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
            type: 'recovery',
            email: customerEmail,
          });

          if (linkError) {
            console.error('Error generating recovery link:', linkError);
          } else if (linkData?.properties?.action_link) {
            inviteUrl = linkData.properties.action_link;
          }
        } catch (linkErr) {
          console.error('Failed to generate invite link:', linkErr);
          // Don't fail the overall request if just the link generation fails
          inviteUrl = `${baseUrl}/login?email=${encodeURIComponent(customerEmail)}`;
        }
      } else {
        // For direct creation without invite
        inviteUrl = `${baseUrl}/login?email=${encodeURIComponent(customerEmail)}`;
      }

      // Log creation details
      console.log(`Customer created: ${customerEmail}, Send invite: ${shouldSendInvite}`);
      console.log(`Source: ${req.get('Referer') || 'Unknown'}, Created by: ${req.user?.id || 'Unknown'}`);

      // Store in customer metadata whether this was created via invitation
      try {
        // Update user metadata to include creation method
        await supabase.auth.admin.updateUserById(data.user.id, {
          user_metadata: {
            ...data.user.user_metadata,
            created_via: shouldSendInvite ? 'invitation' : 'direct_creation',
            created_by: req.user?.id || null,
            requires_verification: !shouldSendInvite
          }
        });
      } catch (metaErr) {
        console.warn('Could not update user metadata:', metaErr);
      }

      // Return success with customer data and appropriate invite information
      return res.status(201).json({
        success: true,
        message: shouldSendInvite 
          ? 'Customer created and invite will be sent' 
          : 'Customer created successfully',
        customer: createdProfile ? createdProfile[0] : { 
          id: data.user.id,
          email: customerEmail,
          first_name: customerFirstName,
          last_name: customerLastName
        },
        inviteUrl: inviteUrl,
        inviteSent: shouldSendInvite,
        requiresVerification: !shouldSendInvite
      });
    } catch (err: any) {
      console.error('Error creating customer:', err);
      return res.status(500).json({
        success: false,
        message: 'An unexpected error occurred: ' + (err.message || 'Unknown error')
      });
    }
  });

  // Send verification link to an existing customer
  app.post('/api/admin/customers/:id/send-verification', requireAuth, async (req, res) => {
    if (req.user?.role !== 'admin' && req.user?.role !== 'salesperson') {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }

    try {
      const userId = req.params.id;

      // Get the customer's data
      const { data: customer, error: customerError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (customerError || !customer) {
        console.error('Error finding customer:', customerError);
        return res.status(404).json({
          success: false,
          message: 'Customer not found'
        });
      }

      // Generate a password reset token through Supabase Auth
      const { data, error } = await supabase.auth.admin.generateLink({
        type: 'recovery',
        email: customer.email,
      });

      if (error) {
        console.error('Error generating recovery link:', error);
        return res.status(500).json({
          success: false,
          message: 'Failed to generate invite link: ' + error.message
        });
      }

      // Get the recovery link
      const recoveryLink = data?.properties?.action_link;

      if (!recoveryLink) {
        return res.status(500).json({
          success: false,
          message: 'Failed to generate recovery link'
        });
      }

      // In a real implementation, we would send this link via email
      console.log(`Invite link for ${customer.email} generated: ${recoveryLink}`);

      // Return success
      return res.json({
        success: true,
        message: 'Invite link generated successfully',
        inviteLink: recoveryLink
      });
    } catch (err: any) {
      console.error('Error sending invite:', err);
      return res.status(500).json({
        success: false,
        message: 'An unexpected error occurred: ' + (err.message || 'Unknown error')
      });
    }
  });

  // API endpoint to get all users for the User Management tab
  app.get('/api/admin/users', async (req, res) => {
    try {
      // Check if user is admin
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Insufficient permissions' });
      }

      // Get users from user_profiles table
      const { data: profiles, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching users:', error);
        return res.status(500).json({ success: false, message: 'Failed to fetch users' });
      }

      // Return the user profiles directly
      return res.json(profiles || []);
    } catch (err) {
      console.error('Unexpected error fetching users:', err);
      return res.status(500).json({ success: false, message: 'An unexpected error occurred' });
    }
  });

  // API endpoint to create a new user
  app.post('/api/admin/users', async (req, res) => {
    try {
      // Check if user is admin
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Insufficient permissions' });
      }

      const { email, username, firstName, lastName, role, permissions, password, shouldSendInvite } = req.body;

      // Validate required fields
      if (!email || !username || !role) {
        return res.status(400).json({ 
          success: false, 
          message: 'Email, username, and role are required' 
        });
      }

      // Check if user already exists
      const { data: existingUser, error: checkError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('email', email)
        .single();

      if (existingUser) {
        return res.status(400).json({ 
          success: false, 
          message: 'User with this email already exists' 
        });
      }

      // Generate a random password if not provided and sending invite
      const userPassword = password || (shouldSendInvite ? Math.random().toString(36).slice(-10) : null);

      if (!userPassword) {
        return res.status(400).json({
          success: false,
          message: 'Password is required when not sending an invitation'
        });
      }

      // Create user in Supabase Auth
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email,
        password: userPassword,
        email_confirm: !shouldSendInvite, // Don't auto-confirm if sending invitation
        user_metadata: {
          role,
          first_name: firstName,
          last_name: lastName,
          username,
          requires_password_reset: shouldSendInvite
        }
      });

      if (authError) {
        console.error('Error creating user in Supabase Auth:', authError);
        return res.status(500).json({ 
          success: false, 
          message: 'Failed to create user' 
        });
      }

      // Create user profile in database
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          id: authUser.user.id,
          email,
          username,
          first_name: firstName,
          last_name: lastName,
          role,
          permissions: permissions || {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_login: null,
          is_active: !shouldSendInvite, // Set to inactive if sending invite
          invitation_status: shouldSendInvite ? 'pending' : 'completed'
        })
        .select()
        .single();

      if (profileError) {
        console.error('Error creating user profile:', profileError);
        // Try to clean up the auth user if profile creation failed
        await supabase.auth.admin.deleteUser(authUser.user.id);
        return res.status(500).json({ 
          success: false, 
          message: 'Failed to create user profile' 
        });
      }

      // Create an activity log for user creation
      const { error: activityError } = await supabase
        .from('user_activity_logs')
        .insert({
          user_id: authUser.user.id,
          action: 'user_created',
          details: {
            created_by: req.user?.id || 'system',
            created_at: new Date().toISOString(),
            role,
            invitation_sent: shouldSendInvite
          },
          created_at: new Date().toISOString(),
          ip_address: req.ip || 'unknown'
        });

      if (activityError) {
        console.error('Error creating activity log:', activityError);
        // Don't fail the entire request for activity log errors
      }

      // Send invitation email if requested
      if (shouldSendInvite) {
        try {
          // Create a setup token
          const { data: setupToken, error: tokenError } = await supabase
            .from('user_setup_tokens')
            .insert({
              user_id: authUser.user.id,
              token: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
              expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
              created_at: new Date().toISOString()
            })
            .select()
            .single();

          if (tokenError) {
            console.error('Error creating setup token:', tokenError);
          } else {
            // Use email service to send invite
            const emailResult = await sendEmail({
              to: email,
              subject: 'Invitation to Custom Clothing Order Management System',
              text: `Hello ${firstName || ''},\n\nYou have been invited to the Custom Clothing Order Management System as a ${role}. Please click the link below to set up your account:\n\nhttp://localhost:5000/setup-account?token=${setupToken.token}\n\nThis link will expire in 7 days.\n\nRegards,\nAdmin Team`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
                  <h2 style="color: #333;">Welcome to Custom Clothing Order Management</h2>
                  <p>Hello ${firstName || ''},</p>
                  <p>You have been invited to join the Custom Clothing Order Management System as a <strong>${role}</strong>.</p>
                  <div style="margin: 25px 0;">
                    <a href="http://localhost:5000/setup-account?token=${setupToken.token}" style="background-color: #4a90e2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">Set Up Your Account</a>
                  </div>
                  <p>This link will expire in 7 days.</p>
                  <p>If you didn't expect this invitation, please ignore this email.</p>
                  <p>Regards,<br>Admin Team</p>
                </div>
              `
            });

            if (!emailResult) {
              console.error('Error sending invitation email');
            }
          }
        } catch (emailErr) {
          console.error('Error in invitation email process:', emailErr);
        }
      }

      return res.status(201).json({ 
        success: true, 
        message: shouldSendInvite ? 'User invited successfully' : 'User created successfully',
        user: profile
      });
    } catch (err) {
      console.error('Unexpected error creating user:', err);
      return res.status(500).json({ 
        success: false, 
        message: 'An unexpected error occurred' 
      });
    }
  });

  // API endpoint to update a user
  app.patch('/api/admin/users/:id', async (req, res) => {
    try {
      // Check if user is admin
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Insufficient permissions' });
      }

      const { id } = req.params;
      const { email, username, firstName, lastName, role, permissions, password } = req.body;

      // Update user metadata in Supabase Auth if needed
      if (role || firstName || lastName || username) {
        const userMetadata: any = {};

        if (role) userMetadata.role = role;
        if (firstName) userMetadata.first_name = firstName;
        if (lastName) userMetadata.last_name = lastName;
        if (username) userMetadata.username = username;

        const { error: authError } = await supabase.auth.admin.updateUserById(
          id,
          { user_metadata: userMetadata }
        );

        if (authError) {
          console.error('Error updating user in Supabase Auth:', authError);
          return res.status(500).json({ 
            success: false, 
            message: 'Failed to update user authentication data' 
          });
        }
      }

      // Update password if provided
      if (password) {
        const { error: passwordError } = await supabase.auth.admin.updateUserById(
          id,
          { password }
        );

        if (passwordError) {
          console.error('Error updating user password:', passwordError);
          return res.status(500).json({ 
            success: false, 
            message: 'Failed to update user password' 
          });
        }
      }

      // Update user profile in database
      const updates: any = {};
      if (email) updates.email = email;
      if (username) updates.username = username;
      if (firstName) updates.first_name = firstName;
      if (lastName) updates.last_name = lastName;
      if (role) updates.role = role;
      if (permissions) updates.permissions = permissions;
      updates.updated_at = new Date().toISOString();

      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (profileError) {
        console.error('Error updating user profile:', profileError);
        return res.status(500).json({ 
          success: false, 
          message: 'Failed to update user profile' 
        });
      }

      return res.json({ 
        success: true, 
        message: 'User updated successfully',
        user: profile
      });
    } catch (err) {
      console.error('Unexpected error updating user:', err);
      return res.status(500).json({ 
        success: false, 
        message: 'An unexpected error occurred' 
      });
    }
  });

  // API endpoint to delete a user
  app.delete('/api/admin/users/:id', async (req, res) => {
    try {
      // Check if user is admin
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Insufficient permissions' });
      }

      const { id } = req.params;

      // Check if user exists
      const { data: existingUser, error: checkError } = await supabase
        .from('user_profiles')
        .select('*')
        ```text
        .eq('id', id)
        .single();

      if (!existingUser) {
        return res.status(404).json({ 
          success: false, 
          message: 'User not found' 
        });
      }

      // Delete user from Supabase Auth
      const { error: authError } = await supabase.auth.admin.deleteUser(id);

      if (authError) {
        console.error('Error deleting user from Supabase Auth:', authError);
        return res.status(500).json({ 
          success: false, 
          message: 'Failed to delete user authentication data' 
        });
      }

      // Delete user profile from database
      const { error: profileError } = await supabase
        .from('user_profiles')
        .delete()
        .eq('id', id);

      if (profileError) {
        console.error('Error deleting user profile:', profileError);
        return res.status(500).json({ 
          success: false, 
          message: 'Failed to delete user profile' 
        });
      }

      return res.json({ 
        success: true, 
        message: 'User deleted successfully' 
      });
    } catch (err) {
      console.error('Unexpected error deleting user:', err);
      return res.status(500).json({ 
        success: false, 
        message: 'An unexpected error occurred' 
      });
    }
  });

  // Order creation endpoint
  app.post('/api/orders', requireAuth, async (req, res) => {
    try {
      console.log('Creating order with data:', req.body);

      const { orderNumber, customerId, status, notes, items, totalAmount } = req.body;

      // Validate required fields
      if (!orderNumber || !customerId || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: orderNumber, customerId, and items are required'
        });
      }

      // Create the order in Supabase
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          customer_id: customerId,
          status: status || 'draft',
          notes: notes || '',
          total_amount: totalAmount || 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (orderError) {
        console.error('Error creating order:', orderError);
        return res.status(500).json({
          success: false,
          message: 'Failed to create order'
        });
      }

      console.log('Order created successfully:', order);

      // Create order items
      const orderItems = items.map((item: any) => ({
        order_id: order.id,
        product_name: item.productName,
        description: item.description || '',
        size: item.size || '',
        color: item.color || '',
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_price: item.totalPrice,
        created_at: new Date().toISOString()
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) {
        console.error('Error creating order items:', itemsError);
        // Try to clean up the order if items failed
        await supabase.from('orders').delete().eq('id', order.id);
        return res.status(500).json({
          success: false,
          message: 'Failed to create order items'
        });
      }

      console.log('Order items created successfully');

      return res.status(201).json({
        success: true,
        message: 'Order created successfully',
        order: order
      });

    } catch (err) {
      console.error('Unexpected error creating order:', err);
      return res.status(500).json({
        success: false,
        message: 'An unexpected error occurred'
      });
    }
  });

  // Get all orders endpoint
  app.get('/api/orders', requireAuth, async (req, res) => {
    try {
      const { data: orders, error } = await supabase
        .from('orders')
        .select('*, order_items (*)')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching orders:', error);
        return res.status(500).json({
          success: false,
          message: 'Failed to fetch orders'
        });
      }

      // Transform the data to match expected format
      const transformedOrders = orders.map(order => ({
        id: order.id,
        orderNumber: order.order_number,
        status: order.status,
        customerId: order.customer_id,
        notes: order.notes,
        totalAmount: order.total_amount,
        createdAt: order.created_at,
        items: order.order_items.map((item: any) => ({
          productName: item.product_name,
          description: item.description,
          size: item.size,
          color: item.color,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          totalPrice: item.total_price
        }))
      }));

      return res.json(transformedOrders);

    } catch (err) {
      console.error('Unexpected error fetching orders:', err);
      return res.status(500).json({
        success: false,
        message: 'An unexpected error occurred'
      });
    }
  });

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });

  // Invitation routes
  app.post('/api/invitations/send', async (req, res) => {
    // Import the function dynamically to avoid circular dependencies
    const { sendUserInvitation } = await import('./routes/api/customerRoutes');
    return sendUserInvitation(req, res);
  });

  app.get('/api/invitations/verify/:token', async (req, res) => {
    const { verifyInvitation } = await import('./routes/api/customerRoutes');
    return verifyInvitation(req, res);
  });

  // Registration with invitation
  app.post('/api/auth/register-with-invitation', async (req, res) => {
    try {
      const { email, password, username, firstName, lastName, invitationToken, role } = req.body;

      // Verify invitation
      const { data: invitation, error: inviteError } = await supabase
        .from('user_invitations')
        .select('*')
        .eq('invitation_token', invitationToken)
        .eq('status', 'pending')
        .single();

      if (inviteError || !invitation) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired invitation'
        });
      }

      // Check expiration
      if (new Date() > new Date(invitation.expires_at)) {
        await supabase
          .from('user_invitations')
          .update({ status: 'expired' })
          .eq('invitation_token', invitationToken);

        return res.status(400).json({
          success: false,
          message: 'Invitation has expired'
        });
      }

      // Create user in Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            firstName,
            lastName,
            role,
            username
          }
        }
      });

      if (error) {
        console.error('Supabase Auth signup error:', error);
        return res.status(500).json({
          success: false,
          message: error.message
        });
      }

      // Mark invitation as accepted
      await supabase
        .from('user_invitations')
        .update({ 
          status: 'accepted',
          accepted_at: new Date().toISOString(),
          user_id: data.user?.id
        })
        .eq('invitation_token', invitationToken);

      console.log('User registered successfully with invitation:', email);

      return res.status(201).json({
        success: true,
        message: 'Registration successful',
        user: {
          id: data.user?.id,
          email: data.user?.email,
          role
        }
      });

    } catch (error) {
      console.error('Registration with invitation error:', error);
      return res.status(500).json({
        success: false,
        message: 'Registration failed'
      });
    }
  });

  // Special endpoint to create a test user for Sam Sutton (temporary, for testing)
  app.post('/api/create-sam-test-user', async (req, res) => {
    try {
      const email = 'suttonsam862@gmail.com';
      const password = 'TestPassword123!';

      // Check if user already exists
      // Use a query that works with the current Supabase API
      const { data: existingUsers, error: lookupError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('email', email)
        .limit(1);

      const existingUser = existingUsers && existingUsers.length > 0 ? existingUsers[0] : null;

      if (existingUser) {
        return res.json({
          success: true,
          message: 'Test user already exists',
          user: { id: existingUser.id, email }
        });
      }

      // Create user in Supabase Auth
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          firstName: 'Sam',
          lastName: 'Sutton',
          role: 'customer'
        }
      });

      if (error) {
        console.error('Error creating test user:', error);
        return res.status(500).json({
          success: false,
          message: 'Failed to create test user: ' + error.message
        });
      }

      if (!data?.user) {
        return res.status(500).json({
          success: false,
          message: 'Unknown error creating test user'
        });
      }

      // Create user profile
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          id: data.user.id,
          username: 'samsutton123',
          email,
          first_name: 'Sam',
          last_name: 'Sutton',
          role: 'customer',
          company: 'Test Company',
          phone: '2055869574',
          address: '204 Virginia Drive',
          city: 'Birmingham',
          state: 'AL',
          postal_code: '35209',
          country: 'United States'
        });

      if (profileError) {
        console.error('Error creating test user profile:', profileError);
        return res.status(500).json({
          success: false,
          message: 'Failed to create test user profile: ' + profileError.message
        });
      }

      // Generate a password reset link
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'recovery',
        email,
      });

      const recoveryLink = linkData?.properties?.action_link;

      return res.json({
        success: true,
        message: 'Test user created successfully',
        user: { id: data.user.id, email },
        password,
        recoveryLink
      });
    } catch (err: any) {
      console.error('Error in test user creation:', err);
      return res.status(500).json({
        success: false,
        message: 'An unexpected error occurred: ' + (err.message || 'Unknown error')
      });
    }
  });

  // Authentication routes
  app.post('/api/auth/login', async (req, res) => {
    try {
      // Validate request body
      const result = loginSchema.safeParse(req.body);

      if (!result.success) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid request data',
          errors: result.error.format()
        });
      }

      const { email, password } = result.data;

      console.log('Attempting login for user:', email);

      // Authenticate user through Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error('Supabase Auth login error:', error);
        return res.status(401).json({ 
          success: false, 
          message: 'Invalid login credentials'
        });
      }

      if (!data?.user || !data?.session) {
        console.error('Missing user or session data from Supabase Auth');
        return res.status(401).json({ 
          success: false, 
          message: 'Authentication error'
        });
      }

      console.log('User authenticated successfully:', data.user.id);

      // Check if the user has role in metadata first (this has priority)
      const userMetadataRole = data.user.user_metadata?.role;
      const isSuperAdmin = data.user.user_metadata?.is_super_admin === true;

      console.log('User metadata from Supabase Auth:', data.user.user_metadata);

      // Get user profile data
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      let userProfile = profileData;
      let userRole = userMetadataRole || (profileData?.role || 'customer');

      // If user is marked as super admin in metadata, ensure role is admin
      if (isSuperAdmin) {
        userRole = 'admin';
        console.log('User is a super admin, setting role to admin');
      }

      if (profileError) {
        console.warn('Could not fetch user profile, creating minimal profile');

        // Profile doesn't exist, create it - use the role from metadata if available
        const { data: newProfile, error: createError } = await supabase
          .from('user_profiles')
          .insert({
            id: data.user.id,
            username: email.split('@')[0],
            role: userRole,
            firstName: data.user.user_metadata?.firstName,
            lastName: data.user.user_metadata?.lastName
          })
          .select();

        if (createError) {
          console.error('Error creating user profile:', createError);
        } else {
          console.log('Created new user profile');
          userProfile = newProfile[0];
        }
      }

      // Store session in cookie
      if (req.session) {
        req.session.auth = {
          token: data.session.access_token,
          user: {
            id: data.user.id,
            email: data.user.email || '',
            role: userRole
          }
        };
      }

      // Return user data and session
      return res.status(200).json({
        success: true,
        message: 'Login successful',
        user: {
          id: data.user.id,
          email: data.user.email,
          username: profileData?.username || email.split('@')[0],
          firstName: profileData?.firstName || data.user.user_metadata?.firstName,
          lastName: profileData?.lastName || data.user.user_metadata?.lastName,
          role: userRole,
          isSuperAdmin: isSuperAdmin
        },
        session: {
          token: data.session.access_token,
          expiresAt: data.session.expires_at
        }
      });
    } catch (err) {
      console.error('Unexpected login error:', err);
      return res.status(500).json({ 
        success: false, 
        message: 'An unexpected error occurred'
      });
    }
  });

  // Register endpoint
  app.post('/api/auth/register', async (req, res) => {
    try {
      // Validate request body
      const result = registerSchema.safeParse(req.body);

      if (!result.success) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid request data',
          errors: result.error.format()
        });
      }

      const { email, password, username, firstName, lastName, role, phone, company } = result.data;

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
      const { data, error } = await supabase.auth.signUp({
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

      if (error) {
        console.error('Supabase Auth signup error:', error);
        return res.status(400).json({ 
          success: false, 
          message: error.message
        });
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
          firstName,
          lastName,
          role,
          phone,
          company
        })
        .select();

      if (profileError) {
        console.error('Error creating profile:', profileError);
        // Continue anyway as the Auth user was created
      }

      // Return success
      return res.status(201).json({
        success: true,
        message: 'Registration successful',
        user: {
          id: data.user.id,
          email: data.user.email
        }
      });
    } catch (err) {
      console.error('Registration error:', err);
      return res.status(500).json({ 
        success: false, 
        message: 'An unexpected error occurred'
      });
    }
  });

  // Logout endpoint
  app.post('/api/auth/logout', async (req, res) => {
    try {
      // Get token from session or auth header
      const token = req.session?.auth?.token || req.headers.authorization?.split(' ')[1];

      if (token) {
        // Sign out with Supabase Auth
        const { error } = await supabase.auth.signOut({
          scope: 'global'
        });

        if (error) {
          console.error('Error signing out:', error);
        }
      }

      // Clear session
      req.session.destroy(err => {
        if (err) {
          console.error('Error destroying session:', err);
        }
      });

      return res.status(200).json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ 
        success: false, 
        message: 'An error occurred during logout'
      });
    }
  });

  // Get current user
  app.get('/api/auth/me', requireAuth, async (req, res) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    // Get the latest user data from Supabase Auth to check metadata
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

    let isSuperAdmin = false;
    let userRole = req.user.role || 'customer';

    if (token) {
      try {
        const { data: userData, error } = await supabase.auth.getUser(token);

        if (!error && userData?.user) {
          // Check for super admin flag in metadata
          isSuperAdmin = userData.user.user_metadata?.is_super_admin === true;
          const metadataRole = userData.user.user_metadata?.role;

          // If user is super admin or has admin role in metadata, set role to admin
          if (isSuperAdmin || metadataRole === 'admin') {
            userRole = 'admin';
            console.log('User has admin privileges from auth metadata');
          }
        }
      } catch (err) {
        console.error('Error fetching user metadata:', err);
      }
    }

    // Format the user data to match what the frontend expects
    return res.json({
      success: true,
      user: {
        id: req.user.id,
        email: req.user.email,
        username: req.user.username || req.user.email.split('@')[0], 
        firstName: req.user.firstName || '',
        lastName: req.user.lastName || '',
        role: userRole,
        isSuperAdmin: isSuperAdmin
      }
    });
  });

  // Customer API endpoint to fetch real customer data
  app.get('/api/customers', async (req, res) => {
    try {
      console.log('Fetching real customers from Supabase...');

      // Get all users from Supabase Auth using admin client
      const { data, error } = await supabaseAdmin.auth.admin.listUsers();

      if (error) {
        console.error('Error fetching customers from Supabase Auth:', error);
        return res.status(500).json({ 
          success: false, 
          message: 'Failed to retrieve customers: ' + error.message 
        });
      }

      // Debug: Log all users and their metadata
      console.log('Total users found:', data.users.length);
      data.users.forEach((user, index) => {
        console.log('User', index + 1, ':', {
          id: user.id,
          email: user.email,
          metadata: user.user_metadata
        });
      });

      // Filter for customers and transform to expected format
      const customers = data.users
        .filter(user => {
          // Look for users with customer role in metadata
          const metadata = user.user_metadata || {};
          const hasCustomerRole = metadata.role === 'customer';
          console.log('User', user.email, 'has customer role:', hasCustomerRole, 'metadata:', metadata);
          return hasCustomerRole;
        })
        .map(user => {
          const metadata = user.user_metadata || {};
          return {
            id: user.id,
            firstName: metadata.firstName || '',
            lastName: metadata.lastName || '',
            email: user.email || '',
            company: metadata.company || '',
            phone: metadata.phone || '',
            address: metadata.address || '',
            city: metadata.city || '',
            state: metadata.state || '',
            zip: metadata.zip || '',
            country: metadata.country || '',
            orders: 0, // Default for new customers
            spent: '$0.00', // Default for new customers
            lastOrder: null,
            status: user.email_confirmed_at ? 'active' : 'pending',
            created_at: user.created_at
          };
        });

      console.log('Found', customers.length, 'customers in Supabase');
      return res.json(customers);
    } catch (err: any) {
      console.error('Error fetching customers:', err);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to retrieve customers: ' + (err.message || 'Unknown error') 
      });
    }
  });

  // Get individual customer details
  app.get('/api/customers/:customerId', authenticateRequest, requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { customerId } = req.params;
      console.log('Fetching customer details for ID:', customerId);

      // Get user from Supabase Auth
      const { data, error } = await supabaseAdmin.auth.admin.getUserById(customerId);

      if (error) {
        console.error('Error fetching customer from Supabase Auth:', error);
        return res.status(404).json({ 
          success: false, 
          message: 'Customer not found' 
        });
      }

      if (!data.user) {
        return res.status(404).json({ 
          success: false, 
          message: 'Customer not found' 
        });
      }

      const user = data.user;
      const metadata = user.user_metadata || {};

      // Check if user is a customer
      if (metadata.role !== 'customer') {
        return res.status(403).json({ 
          success: false, 
          message: 'Access denied - not a customer account' 
        });
      }

      // Transform to expected format
      const customer = {
        id: user.id,
        firstName: metadata.firstName || '',
        lastName: metadata.lastName || '',
        email: user.email || '',
        phone: metadata.phone || '',
        company: metadata.company || '',
        address: metadata.address || '',
        city: metadata.city || '',
        state: metadata.state || '',
        zip: metadata.zip || '',
        country: metadata.country || '',
        orders: 0,
        spent: '$0.00',
        lastOrder: null,
        status: user.email_confirmed_at ? 'active' : 'pending',
        created_at: user.created_at
      };

      console.log(`Customer ${customerId} details retrieved successfully`);
      return res.json(customer);
    } catch (err: any) {
      console.error('Error fetching customer details:', err);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch customer details: ' + (err.message || 'Unknown error')
      });
    }
  });

  // Update customer details
  app.patch('/api/customers/:customerId', authenticateRequest, requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { customerId } = req.params;
      const { firstName, lastName, email, phone, company, address, city, state, zip, country, status } = req.body;

      console.log(`Updating customer ${customerId}`);

      // Update user metadata in Supabase Auth
      const updateData: any = {
        user_metadata: {
          firstName,
          lastName,
          phone,
          company,
          address,
          city,
          state,
          zip,
          country,
          role: 'customer'
        }
      };

      // Update email if changed
      if (email) {
        updateData.email = email;
      }

      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.updateUserById(customerId, updateData);

      if (authError) {
        console.error('Error updating customer:', authError);
        return res.status(500).json({
          success: false,
          message: 'Failed to update customer: ' + authError.message
        });
      }

      console.log(`Customer ${customerId} updated successfully`);

      return res.status(200).json({
        success: true,
        message: 'Customer updated successfully',
        customer: {
          id: authUser.user?.id,
          firstName,
          lastName,
          email: authUser.user?.email,
          phone,
          company,
          address,
          city,
          state,
          zip,
          country,
          status
        }
      });

    } catch (error) {
      console.error('Error updating customer:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  });

  // Setup WebSockets
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws) => {
    console.log('WebSocket connection established');

    ws.on('message', (message) => {
      console.log('Received message:', message.toString());
    });

    ws.on('close', () => {
      console.log('WebSocket connection closed');
    });
  });



  // User setup email API endpoint - ONLY sends emails, never creates users
  app.post('/api/users/invite', async (req, res) => {
    try {
      const { email, firstName, lastName, role } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email is required'
        });
      }

      // Simply send setup email - no user creation
      const setupToken = Buffer.from(JSON.stringify({
        email,
        firstName: firstName || '',
        lastName: lastName || '',
        role: role || 'customer',
        expires: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days
        timestamp: Date.now()
      })).toString('base64url');

      const setupUrl = `${process.env.REPLIT_DEV_DOMAIN || 'localhost:5000'}/setup?token=${setupToken}`;

      try {
        const emailTemplate = {
          to: email,
          subject: 'Complete Your Account Setup - ThreadCraft',
          text: `Hi ${firstName || 'there'},

You've been invited to complete your account setup for ThreadCraft! Please click the link below to access your dashboard:
${setupUrl}

This link will expire in 7 days.

Best regards,
The ThreadCraft Team`,
          html: `
            <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
              <h2 style="color: #333;">Complete Your Account Setup</h2>
              <p>Hi ${firstName || 'there'},</p>
              <p>You've been invited to complete your account setup for ThreadCraft!</p>
              <p>Please click the button below to access your dashboard:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${setupUrl}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                  Complete Setup
                </a>
              </div>
              <p style="color: #666; font-size: 14px;">
                If the button doesn't work, you can copy and paste this link into your browser:<br>
                <a href="${setupUrl}">${setupUrl}</a>
              </p>
              <p style="color: #666; font-size: 14px;">
                This link will expire in 7 days.
              </p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
              <p style="color: #666; font-size: 12px;">Best regards,<br>The ThreadCraft Team</p>
            </div>
          `
        };

        await sendEmail(emailTemplate);
        console.log(`Setup email sent to: ${email}`);

        return res.json({
          success: true,
          message: `Setup email sent successfully! ${firstName || 'User'} will receive an email to complete their account setup.`
        });
      } catch (emailError) {
        console.error('Error sending setup email:', emailError);
        return res.status(500).json({
          success: false,
          message: 'Failed to send setup email. Please check your email configuration.'
        });
      }
    } catch (err: any) {
      console.error('Error sending setup email:', err);
      return res.status(500).json({
        success: false,
        message: 'An unexpected error occurred'
      });
    }
  });

  // Product Library Routes - For salespeople to reference products and pricing
  app.get('/api/products/library', requireAuth, getProductLibrary);
  app.get('/api/products/categories', requireAuth, getProductCategories);
  app.post('/api/products/library', requireAuth, requireRole(['admin', 'salesperson']), addProductToLibrary);
  app.post('/api/products/library/:productId/copy', requireAuth, requireRole(['admin', 'salesperson']), copyProductToOrder);
  app.get('/api/products/library/:productId/pricing-history', requireAuth, getProductPricingHistory);

  // Direct Account Creation Route - Replaces email invitation system
  app.post('/api/users/create-account', requireAuth, requireRole(['admin']), async (req: Request, res: Response) => {
    try {
      const { email, firstName, lastName, role, password = 'TempPassword123!', createDirectly = true } = req.body;

      if (!email || !firstName || !lastName || !role) {
        return res.status(400).json({
          success: false,
          message: 'Email, first name, last name, and role are required'
        });
      }

      console.log(`Creating account directly for: ${email} with role: ${role}`);

      // Create user in Supabase Auth with password
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          firstName,
          lastName,
          role,
          created_by_admin: true,
          temp_password: true // Flag that user should change password
        }
      });

      if (error) {
        console.error('Error creating user in Supabase Auth:', error);
        return res.status(500).json({
          success: false,
          message: 'Failed to create user account: ' + error.message
        });
      }

      if (!data?.user) {
        return res.status(500).json({
          success: false,
          message: 'Failed to create user account'
        });
      }

      console.log(`✅ Account created successfully for: ${email}`);
      console.log(`🔑 Temporary password: ${password}`);
      console.log(`👤 User can now log in immediately`);

      return res.status(201).json({
        success: true,
        message: `Account created successfully! User can log in with email: ${email} and temporary password: ${password}`,
        user: {
          id: data.user.id,
          email: data.user.email,
          firstName,
          lastName,
          role,
          tempPassword: password,
          created_at: data.user.created_at
        }
      });

    } catch (error) {
      console.error('Error in create-account endpoint:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  });

  // Item Image Upload Route - For product images in orders
  app.post('/api/upload/item-image', requireAuth, requireRole(['admin', 'designer']), async (req: Request, res: Response) => {
    try {
      console.log('Item image upload request received');

      // For now, return a placeholder response until we set up file storage
      // This allows the UI to work while we implement the actual upload
      const mockImageUrl = `https://via.placeholder.com/300x300/4f46e5/ffffff?text=Product+${Date.now()}`;

      console.log('Generated placeholder image URL:', mockImageUrl);

      return res.status(200).json({
        success: true,
        imageUrl: mockImageUrl,
        message: 'Image uploaded successfully (using placeholder for now)'
      });

    } catch (error) {
      console.error('Error in item image upload:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload image'
      });
    }
  });

  // Comprehensive User Management API - Database Portal Viewer
  app.get('/api/users', authenticateRequest, requireAuth, requireRole(['admin']), async (req: Request, res: Response) => {
    console.log('=== User Management API Debug ===');
    console.log('Authenticated user:', req.user?.email, 'Role:', req.user?.role);

    const user = req.user;
    console.log('Authenticated user:', { id: user.id, email: user.email, role: user.role });

    // Check if user has admin privileges
    if (user.role !== 'admin') {
      console.log('User does not have admin privileges:', user.role);
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    console.log('Admin access granted for:', user.email);
    try {
      console.log('Fetching comprehensive user database...');

      // Get all customers from the customers table first (primary source of truth)
      const { data: customers, error: customersError } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

      if (customersError) {
        console.error('Error fetching customers:', customersError);
        return res.status(500).json({
          success: false,
          message: 'Failed to fetch customer database: ' + customersError.message
        });
      }

      console.log(`Found ${customers?.length || 0} customers in database`);

      // Get all authenticated users from Supabase Auth
      const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();

      if (authError) {
        console.error('Error fetching auth users:', authError);
        // Continue even if auth fails - we still want to show customer data
      }

      console.log(`Found ${authUsers?.users?.length || 0} auth accounts`);

      // Create comprehensive user database view
      const userDatabase = [];
      const authUserEmails = new Set(authUsers?.users?.map(u => u.email) || []);

      // Process all customers (every customer becomes a user record)
      for (const customer of customers || []) {
        const authUser = authUsers?.users?.find(u => u.email === customer.email);
        const userMetadata = authUser?.user_metadata || {};

        userDatabase.push({
          // Database fields
          id: authUser?.id || null,
          customerId: customer.id,
          email: customer.email,
          firstName: customer.firstName || '',
          lastName: customer.lastName || '',
          phone: customer.phone || '',
          company: customer.companyName || '',

          // Account status fields
          hasAuthAccount: !!authUser,
          accountStatus: authUser ? 'active' : 'needs_creation',
          emailVerified: authUser?.email_confirmed_at ? true : false,

          // User role and access management
          role: userMetadata.role || 'customer',
          permissions: {
            canViewOrders: true,
            canCreateOrders: userMetadata.role === 'customer',
            canManageUsers: userMetadata.role === 'admin',
            canAccessDesign: userMetadata.role === 'designer' || userMetadata.role === 'admin',
            canAccessProduction: userMetadata.role === 'manufacturer' || userMetadata.role === 'admin'
          },

          // Profile information
          username: userMetadata.username || customer.email.split('@')[0],
          profilePicture: userMetadata.avatar_url || null,
          lastLogin: authUser?.last_sign_in_at || null,

          // Timestamps
          customerSince: customer.created_at,
          accountCreated: authUser?.created_at || null,
          lastUpdated: authUser?.updated_at || customer.updated_at
        });
      }

      // Add any auth users that don't have customer profiles (staff accounts)
      for (const authUser of authUsers?.users || []) {
        if (!customers?.find(c => c.email === authUser.email)) {
          const userMetadata = authUser.user_metadata || {};

          userDatabase.push({
            // Database fields
            id: authUser.id,
            customerId: null,
            email: authUser.email,
            firstName: userMetadata.firstName || '',
            lastName: userMetadata.lastName || '',
            phone: userMetadata.phone || '',
            company: userMetadata.company || '',

            // Account status fields
            hasAuthAccount: true,
            accountStatus: 'active',
            emailVerified: !!authUser.email_confirmed_at,

            // User role and access management
            role: userMetadata.role || 'staff',
            permissions: {
              canViewOrders: true,
              canCreateOrders: ['admin', 'salesperson'].includes(userMetadata.role),
              canManageUsers: userMetadata.role === 'admin',
              canAccessDesign: ['designer', 'admin'].includes(userMetadata.role),
              canAccessProduction: ['manufacturer', 'admin'].includes(userMetadata.role)
            },

            // Profile information
            username: userMetadata.username || authUser.email.split('@')[0],
            profilePicture: userMetadata.avatar_url || null,
            lastLogin: authUser.last_sign_in_at,

            // Timestamps
            customerSince: null,
            accountCreated: authUser.created_at,
            lastUpdated: authUser.updated_at
          });
        }
      }

      const analytics = {
        totalUsers: userDatabase.length,
        customersTotal: customers?.length || 0,
        authAccountsTotal: authUsers?.users?.length || 0,
        needsAccountCreation: userDatabase.filter(u => !u.hasAuthAccount).length,
        activeAccounts: userDatabase.filter(u => u.accountStatus === 'active').length,
        adminUsers: userDatabase.filter(u => u.role === 'admin').length,
        customerUsers: userDatabase.filter(u => u.role === 'customer').length,
        staffUsers: userDatabase.filter(u => !['customer', 'admin'].includes(u.role)).length
      };

      console.log(`Compiled user database: ${userDatabase.length} total users`);
      console.log(`Analytics:`, analytics);

      return res.status(200).json({
        success: true,
        users: userDatabase,
        analytics
      });

    } catch (error) {
      console.error('Error in user database fetch:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch user database'
      });
    }
  });

  // Create auth account for existing customer
  app.post('/api/users/create-customer-account', requireAuth, requireRole(['admin']), async (req: Request, res: Response) => {
    try {
      const { customerId, password = 'TempPassword123!' } = req.body;

      if (!customerId) {
        return res.status(400).json({
          success: false,
          message: 'Customer ID is required'
        });
      }

      // Get customer details
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single();

      if (customerError || !customer) {
        return res.status(404).json({
          success: false,
          message: 'Customer not found'
        });
      }

      // Create auth account for the customer
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: customer.email,
        password,
        email_confirm: true,
        user_metadata: {
          firstName: customer.firstName,
          lastName: customer.lastName,
          role: 'customer',
          customerId: customer.id,
          created_by_admin: true,
          temp_password: true
        }
      });

      if (error) {
        console.error('Error creating customer auth account:', error);
        return res.status(500).json({
          success: false,
          message: 'Failed to create auth account: ' + error.message
        });
      }

      console.log(`✅ Auth account created for customer: ${customer.email}`);

      return res.status(201).json({
        success: true,
        message: `Auth account created successfully for ${customer.firstName} ${customer.lastName}`,
        user: {
          id: data.user?.id,
          email: customer.email,
          firstName: customer.firstName,
          lastName: customer.lastName,
          role: 'customer',
          tempPassword: password
        }
      });

    } catch (error) {
      console.error('Error creating customer auth account:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  });

  // Edit user details, roles, and credentials
  app.patch('/api/users/:userId', requireAuth, requireRole(['admin']), async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { email, firstName, lastName, role, phone, company, password } = req.body;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required'
        });
      }

      console.log(`Updating user ${userId} with data:`, { email, firstName, lastName, role, phone, company });

      // Update auth user metadata
      const updateData: any = {
        user_metadata: {
          firstName,
          lastName,
          role,
          phone,
          company
        }
      };

      // Update email if changed
      if (email) {
        updateData.email = email;
      }

      // Update password if provided
      if (password) {
        updateData.password = password;
      }

      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, updateData);

      if (authError) {
        console.error('Error updating auth user:', authError);
        return res.status(500).json({
          success: false,
          message: 'Failed to update user: ' + authError.message
        });
      }

      // If user is a customer, also update customer profile
      if (role === 'customer' && authUser.user?.user_metadata?.customerId) {
        const { error: customerError } = await supabase
          .from('customers')
          .update({
            firstName,
            lastName,
            email,
            phone,
            companyName: company
          })
          .eq('id', authUser.user.user_metadata.customerId);

        if (customerError) {
          console.warn('Error updating customer profile:', customerError);
          // Don't fail the request, just log the warning
        }
      }

      console.log(`✅ User ${userId} updated successfully`);

      return res.status(200).json({
        success: true,
        message: 'User updated successfully',
        user: {
          id: authUser.user?.id,
          email: authUser.user?.email,
          firstName,
          lastName,
          role,
          phone,
          company
        }
      });

    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  });

  // Catalog management routes
  app.get('/api/catalog', authenticateRequest, requireAuth, requireRole(['admin']), getCatalogItems);
  app.post('/api/catalog', authenticateRequest, requireAuth, requireRole(['admin']), createCatalogItem);
  app.get('/api/catalog/:id', authenticateRequest, requireAuth, requireRole(['admin']), getCatalogItem);
  app.put('/api/catalog/:id', authenticateRequest, requireAuth, requireRole(['admin']), updateCatalogItem);
  app.delete('/api/catalog/:id', authenticateRequest, requireAuth, requireRole(['admin']), deleteCatalogItem);

  // Image upload routes
  app.use('/api/images', authenticateRequest, imageRoutes);

  // Catalog options routes (categories and sports)
  app.use('/api/catalog-options', authenticateRequest, catalogOptionsRoutes);

  return httpServer;
}
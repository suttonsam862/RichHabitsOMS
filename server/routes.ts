import { Express, Request, Response, NextFunction } from 'express';
import { createServer, Server } from 'http';
import { WebSocketServer } from 'ws';
import { z } from 'zod';
import { loginSchema, registerSchema } from '../shared/schema';
import { supabase } from './db';
import { requireAuth, requireRole } from './auth';
import adminRoutes from './routes/admin';

export async function registerRoutes(app: Express): Promise<Server> {
  // Register admin routes
  app.use('/api/admin', adminRoutes);
  
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
    if (req.user?.role !== 'admin' && req.user?.role !== 'salesperson') {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }
    
    try {
      // Handle different field naming conventions from different forms
      const { 
        email, firstName, lastName, company, phone,
        emailAddress, first_name, last_name, 
        address, city, state, zip, country 
      } = req.body;
      
      // Normalize field names
      const customerEmail = email || emailAddress;
      const customerFirstName = firstName || first_name;
      const customerLastName = lastName || last_name;
      const customerCompany = company;
      const customerPhone = phone;
      
      // Add additional address fields if present
      const additionalData: Record<string, any> = {};
      if (address) additionalData.address = address;
      if (city) additionalData.city = city;
      if (state) additionalData.state = state;
      if (zip) additionalData.zip = zip;
      if (country) additionalData.country = country;
      
      if (!customerEmail || !customerFirstName || !customerLastName) {
        return res.status(400).json({
          success: false,
          message: 'Email, first name, and last name are required'
        });
      }
      
      // Generate a random password (in a real app, we would send this via email)
      const randomPassword = Math.random().toString(36).substring(2, 10) + 
                           Math.random().toString(36).substring(2, 10);
      
      // Create user in Supabase Auth
      const { data, error } = await supabase.auth.admin.createUser({
        email: customerEmail,
        password: randomPassword,
        email_confirm: true,
        user_metadata: {
          firstName: customerFirstName,
          lastName: customerLastName,
          role: 'customer',
          ...additionalData
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
      
      // Prepare additional data for user profile
      const profileData: Record<string, any> = {
        id: data.user.id,
        username: username + Math.floor(Math.random() * 1000), // Add random number to ensure uniqueness
        email: customerEmail,
        first_name: customerFirstName,
        last_name: customerLastName,
        role: 'customer'
      };
      
      // Add optional fields if they exist
      if (customerCompany) profileData.company = customerCompany;
      if (customerPhone) profileData.phone = customerPhone;
      if (address) profileData.address = address;
      if (city) profileData.city = city;
      if (state) profileData.state = state;
      if (zip) profileData.postal_code = zip;
      if (country) profileData.country = country;
      
      // Log what we're inserting
      console.log('Creating customer profile with data:', profileData);
      
      // Create customer profile
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
      
      // Determine if this is a request from the customer page or user management
      // Check both query parameters and body for sendInvite flag
      const sendInvite = req.query.sendInvite === 'true' || req.body.sendInvite === true;
      
      // Generate invitation URL (different for invites vs direct creation)
      const baseUrl = process.env.APP_URL || `http://${req.headers.host || 'localhost:5000'}`;
      let inviteUrl = '';
      
      // If sending invite, generate a recovery link through Supabase
      if (sendInvite) {
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
      console.log(`Customer created: ${customerEmail}, Send invite: ${sendInvite}`);
      console.log(`Source: ${req.get('Referer') || 'Unknown'}, Created by: ${req.user?.id || 'Unknown'}`);
      
      // Store in customer metadata whether this was created via invitation
      try {
        // Update user metadata to include creation method
        await supabase.auth.admin.updateUserById(data.user.id, {
          user_metadata: {
            ...data.user.user_metadata,
            created_via: sendInvite ? 'invitation' : 'direct_creation',
            created_by: req.user?.id || null,
            requires_verification: !sendInvite
          }
        });
      } catch (metaErr) {
        console.warn('Could not update user metadata:', metaErr);
      }
      
      // Return success with customer data and appropriate invite information
      return res.status(201).json({
        success: true,
        message: sendInvite 
          ? 'Customer created and invite will be sent' 
          : 'Customer created successfully',
        customer: createdProfile ? createdProfile[0] : { 
          id: data.user.id,
          email: customerEmail,
          first_name: customerFirstName,
          last_name: customerLastName
        },
        inviteUrl: inviteUrl,
        inviteSent: sendInvite,
        requiresVerification: !sendInvite
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
  
  // Route to get all users for the settings page
  app.get('/api/admin/users', async (req, res) => {
    // Check if we can find a session cookie
    const sessionToken = req.session?.auth?.token;
    
    // For debugging - log that we're trying to access users endpoint
    console.log('Accessing /api/admin/users endpoint');
    console.log('Session token exists:', !!sessionToken);
    console.log('User in request:', !!req.user, req.user?.role);
    
    // First try to validate using the session cookie if exists
    if (sessionToken) {
      try {
        // Validate user with Supabase
        const { data, error } = await supabase.auth.getUser(sessionToken);
        
        if (!error && data?.user) {
          // Verify if user has admin role from metadata
          const isAdmin = data.user.user_metadata?.role === 'admin' || 
                         data.user.user_metadata?.is_super_admin === true;
          
          if (isAdmin) {
            // Get users from user_profiles table
            const { data: profiles, error: profilesError } = await supabase
              .from('user_profiles')
              .select('*')
              .order('created_at', { ascending: false });
    
            if (profilesError) {
              console.error('Error fetching users:', profilesError);
              return res.status(500).json({ success: false, message: 'Failed to fetch users' });
            }
    
            return res.json(profiles || []);
          }
        }
      } catch (err) {
        console.error('Error validating session:', err);
      }
    }
    
    // If we got here, either there's no session or the user doesn't have admin privileges
    // Check if we have a user in the request that came from our middleware
    if (req.user?.role === 'admin') {
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
    }
    
    // If we got here, user is definitely not authorized
    return res.status(403).json({ success: false, message: 'Insufficient permissions' });
  });
  
  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
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
      
      console.log(`Attempting login for user: ${email}`);
      
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
      
      console.log(`User authenticated successfully: ${data.user.id}`);
      
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

  return httpServer;
}
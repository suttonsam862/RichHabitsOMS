import { Express, Request, Response } from 'express';
import { createServer, Server } from 'http';
import { WebSocketServer } from 'ws';
import { z } from 'zod';
import { loginSchema, registerSchema } from '../shared/schema';
import { supabase } from './db';
import { requireAuth, requireRole } from './auth';

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
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
      
      // Get user profile data
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();
      
      let userProfile = profileData;
      
      if (profileError) {
        console.warn('Could not fetch user profile, creating minimal profile');
        
        // Profile doesn't exist, create it
        const { data: newProfile, error: createError } = await supabase
          .from('user_profiles')
          .insert({
            id: data.user.id,
            username: email.split('@')[0],
            role: 'customer',
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
            email: data.user.email,
            role: userProfile?.role || 'customer'
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
          role: profileData?.role || 'customer'
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
  app.get('/api/auth/me', requireAuth, (req, res) => {
    return res.json({
      success: true,
      user: req.user
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

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { loginSchema, registerSchema } from '../../../shared/schema';
import { supabase } from '../../db';
import { createClient } from '@supabase/supabase-js';

const router = Router();

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

// Login endpoint
router.post('/login', async (req: Request, res: Response) => {
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

    // Return user data and session with custom role metadata
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
        customRole: data.user.user_metadata?.customRole,
        visiblePages: data.user.user_metadata?.visiblePages || [],
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
router.post('/register', async (req: Request, res: Response) => {
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
router.post('/logout', async (req: Request, res: Response) => {
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
router.get('/me', async (req: Request, res: Response) => {
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

export default router;

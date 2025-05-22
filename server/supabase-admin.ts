/**
 * Enhanced Supabase client with admin privileges
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Validate required environment variables
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.warn('Missing Supabase credentials for admin operations.');
  console.warn('Please ensure SUPABASE_URL and SUPABASE_SERVICE_KEY are set in .env');
}

// Create Supabase client with SERVICE KEY for admin privileges
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

/**
 * Create a user with admin privileges
 */
export async function createUserWithAdminRights(email: string, password: string, userData: any = {}) {
  try {
    // Create user with admin role in metadata
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        ...userData,
        role: 'admin'
      }
    });

    if (error) {
      console.error('Error creating admin user:', error);
      return { success: false, error };
    }

    // Update user with additional data if needed
    if (data.user) {
      // You can add additional user setup here if needed
      console.log(`Admin user created: ${email} with ID: ${data.user.id}`);
    }

    return { success: true, data };
  } catch (err) {
    console.error('Unexpected error creating admin user:', err);
    return { success: false, error: err };
  }
}

/**
 * Promote an existing user to admin
 */
export async function promoteUserToAdmin(userId: string) {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      {
        user_metadata: {
          role: 'admin',
          is_super_admin: true
        }
      }
    );

    if (error) {
      console.error('Error promoting user to admin:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (err) {
    console.error('Unexpected error promoting user:', err);
    return { success: false, error: err };
  }
}

/**
 * Check if a user has admin privileges
 */
export async function checkAdminPrivileges(userId: string) {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
    
    if (error) {
      console.error('Error checking admin privileges:', error);
      return { isAdmin: false, error };
    }
    
    const userMetadata = data.user?.user_metadata || {};
    const isAdmin = userMetadata.role === 'admin' || userMetadata.is_super_admin === true;
    
    return { isAdmin, user: data.user };
  } catch (err) {
    console.error('Unexpected error checking admin privileges:', err);
    return { isAdmin: false, error: err };
  }
}
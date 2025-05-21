// Script to set the admin user as a super admin in Supabase
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Supabase connection details
const supabaseUrl = process.env.SUPABASE_URL || 'https://ctznfijidykgjhzpuyej.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

// Admin user details
const adminEmail = 'samsutton@rich-habits.com';

async function makeSuperAdmin() {
  console.log('Setting user as super admin in Supabase...');
  
  try {
    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log('Supabase client initialized');
    
    // First, find the user by email to get their ID
    console.log(`Looking up user with email: ${adminEmail}`);
    
    // Try to get the user from user_profiles table if it exists
    let userId;
    
    // Try different approaches to find the user
    
    // 1. First try user_profiles table
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('email', adminEmail)
      .single();
    
    if (profileData) {
      userId = profileData.id;
      console.log(`Found user in user_profiles with ID: ${userId}`);
    } else {
      console.log('User not found in user_profiles, trying users table...');
      
      // 2. Try users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('email', adminEmail)
        .single();
      
      if (userData) {
        userId = userData.id;
        console.log(`Found user in users table with ID: ${userId}`);
      } else {
        // 3. Try to get user from auth.users via admin API (requires service role key)
        console.log('Attempting to find user via auth API...');
        const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
        
        if (authError) {
          console.error('Error listing users from auth:', authError);
        } else {
          const authUser = authData.users.find(u => u.email === adminEmail);
          if (authUser) {
            userId = authUser.id;
            console.log(`Found user in auth.users with ID: ${userId}`);
          }
        }
      }
    }
    
    if (!userId) {
      console.error(`Could not find user with email: ${adminEmail}`);
      return false;
    }
    
    // Now update the user with super admin flag in metadata
    console.log('Updating user auth metadata with super admin flag...');
    
    // Try updating user metadata via auth API
    const { error: updateAuthError } = await supabase.auth.admin.updateUserById(
      userId,
      { user_metadata: { role: 'admin', is_super_admin: true } }
    );
    
    if (updateAuthError) {
      console.error('Error updating auth metadata:', updateAuthError);
      
      // Fallback to regular update if admin update fails
      const { error: regularUpdateError } = await supabase.auth.updateUser({
        data: { 
          role: 'admin',
          is_super_admin: true
        }
      });
      
      if (regularUpdateError) {
        console.error('Error updating user metadata:', regularUpdateError);
        return false;
      }
    }
    
    console.log('Updated user auth metadata successfully');
    
    // Now update the user in any relevant tables
    
    // 1. Try to update users table if it exists
    const { error: userUpdateError } = await supabase
      .from('users')
      .update({ 
        role: 'admin',
        is_super_admin: true 
      })
      .eq('id', userId);
    
    if (userUpdateError) {
      console.log('Note: Could not update users table, might not exist or have these columns');
    } else {
      console.log('Updated users table successfully');
    }
    
    // 2. Try to update user_profiles table if it exists
    const { error: profileUpdateError } = await supabase
      .from('user_profiles')
      .update({ 
        role: 'admin',
        is_super_admin: true 
      })
      .eq('id', userId);
    
    if (profileUpdateError) {
      console.log('Note: Could not update user_profiles table, might not exist or have these columns');
    } else {
      console.log('Updated user_profiles table successfully');
    }
    
    console.log('Super admin flags have been set for the user');
    return true;
  } catch (error) {
    console.error('Unexpected error:', error);
    return false;
  }
}

// Run the function
makeSuperAdmin()
  .then(success => {
    if (success) {
      console.log('Super admin setup completed successfully');
    } else {
      console.error('Super admin setup failed');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('Unhandled error:', err);
    process.exit(1);
  });
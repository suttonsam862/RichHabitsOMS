/**
 * Script to update the admin user with super admin privileges
 * This will grant your admin account full permissions to create users and manage the database
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env file');
  process.exit(1);
}

// Create admin client with the service role key
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Default admin email if not provided
const adminEmail = process.argv[2] || 'admin@example.com';

async function updateToSuperAdmin() {
  try {
    console.log(`Looking for admin user with email: ${adminEmail}`);
    
    // First get the user ID from the profiles table
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('id, email, first_name, last_name, role')
      .eq('email', adminEmail)
      .single();
    
    if (profileError || !profile) {
      console.error('Error finding admin profile:', profileError || 'No profile found');
      
      // Try to get the user directly from auth
      const { data, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
      
      if (usersError) {
        console.error('Failed to list users:', usersError);
        return;
      }
      
      const adminUser = data.users.find(user => user.email === adminEmail);
      
      if (!adminUser) {
        console.error(`No user found with email: ${adminEmail}`);
        return;
      }
      
      // Update the user's metadata directly
      const { data: updateData, error } = await supabaseAdmin.auth.admin.updateUserById(
        adminUser.id,
        {
          user_metadata: {
            role: 'admin',
            is_super_admin: true,
            full_access: true,
            permissions: ['create_user', 'delete_user', 'modify_user', 'create_customer']
          }
        }
      );
      
      if (error) {
        console.error('Error updating admin user:', error);
        return;
      }
      
      console.log('✅ Successfully granted super admin privileges!');
      console.log('User ID:', adminUser.id);
      console.log('User Email:', adminUser.email);
      return;
    }
    
    console.log('Found user profile:', profile);
    
    // Now update both the auth metadata and profile
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      profile.id,
      {
        user_metadata: {
          role: 'admin',
          is_super_admin: true,
          full_access: true,
          permissions: ['create_user', 'delete_user', 'modify_user', 'create_customer']
        }
      }
    );
    
    if (error) {
      console.error('Error updating admin user metadata:', error);
      return;
    }
    
    // Also update the profile in the database
    const { error: updateError } = await supabaseAdmin
      .from('user_profiles')
      .update({
        role: 'admin',
        is_super_admin: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', profile.id);
    
    if (updateError) {
      console.error('Error updating user profile:', updateError);
    } else {
      console.log('✅ User profile updated with super admin privileges');
    }
    
    console.log('✅ Successfully promoted to super admin with full permissions!');
    console.log('User ID:', profile.id);
    console.log('User Email:', profile.email);
    
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

// Run the script
updateToSuperAdmin();
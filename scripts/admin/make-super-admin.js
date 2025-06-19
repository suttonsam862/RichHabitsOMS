/**
 * Script to promote the existing admin to a super admin with full database privileges
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Validate environment variables
const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('ERROR: Missing Supabase credentials.');
  console.error('Please ensure SUPABASE_URL and SUPABASE_SERVICE_KEY are set in your .env file');
  process.exit(1);
}

// Create Supabase admin client with service key for full access
const supabaseAdmin = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Get the admin user email (or use a default value)
const adminEmail = process.argv[2] || 'admin@example.com';

async function makeSuperAdmin() {
  console.log(`Looking for admin user with email: ${adminEmail}`);

  try {
    // First, find the user by email
    const { data: userData, error: userError } = await supabaseAdmin
      .from('user_profiles')
      .select('id, email, first_name, last_name, role')
      .eq('email', adminEmail)
      .single();

    if (userError) {
      console.error('Error finding admin user:', userError);
      return;
    }

    if (!userData) {
      console.error(`No user found with email: ${adminEmail}`);
      return;
    }

    console.log('Found user:', userData);

    // Update the user's metadata to grant super admin privileges
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      userData.id,
      {
        user_metadata: {
          role: 'admin',
          is_super_admin: true,
          has_full_access: true,
          permissions: ['create_users', 'delete_users', 'update_users', 'create_tables', 'edit_tables']
        }
      }
    );

    if (error) {
      console.error('Error promoting admin to super admin:', error);
      return;
    }

    console.log('✅ Successfully promoted user to super admin with full privileges!');
    console.log('User ID:', userData.id);
    console.log('User Email:', userData.email);
    console.log('New Permissions:', data.user.user_metadata);

    // Also update the profile in the database
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .update({
        role: 'admin',
        is_super_admin: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', userData.id);

    if (profileError) {
      console.error('Error updating user profile:', profileError);
    } else {
      console.log('✅ User profile also updated in database');
    }

  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

// Run the script
makeSuperAdmin();
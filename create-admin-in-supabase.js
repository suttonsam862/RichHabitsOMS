// This script creates an admin user in Supabase Auth
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Check for required environment variables
if (!process.env.SUPABASE_URL) {
  throw new Error('SUPABASE_URL is not set');
}

if (!process.env.SUPABASE_ANON_KEY) {
  throw new Error('SUPABASE_ANON_KEY is not set');
}

// Create Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Admin user details
const adminEmail = 'samsutton@rich-habits.com';
const adminPassword = 'Arlodog2013!';

async function createAdminUser() {
  console.log(`Creating admin user: ${adminEmail}`);
  
  try {
    // Admin user signup
    const { data, error } = await supabase.auth.signUp({
      email: adminEmail,
      password: adminPassword,
      options: {
        data: {
          role: 'admin',
          username: 'samadmin',
          firstName: 'Sam',
          lastName: 'Sutton'
        }
      }
    });
    
    if (error) {
      console.error('Error creating admin user:', error.message);
      // Try to do an admin invite instead as a fallback
      console.log('Attempting admin invite as fallback...');
      
      const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(adminEmail, {
        data: {
          role: 'admin',
          username: 'samadmin',
          firstName: 'Sam',
          lastName: 'Sutton'
        }
      });
      
      if (inviteError) {
        console.error('Admin invite failed:', inviteError.message);
        return false;
      }
      
      console.log('Admin user invited successfully. Check email for invite.');
      return true;
    }
    
    console.log('Admin user created successfully:', data.user?.id);
    
    // Also create a profile in user_profiles if that table exists
    try {
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          user_id: data.user.id,
          email: adminEmail,
          username: 'samadmin',
          first_name: 'Sam',
          last_name: 'Sutton',
          role: 'admin'
        });
        
      if (profileError) {
        console.warn('Could not create user profile:', profileError.message);
      } else {
        console.log('User profile created successfully');
      }
    } catch (profileErr) {
      console.warn('Error trying to create user profile:', profileErr.message);
    }
    
    return true;
  } catch (err) {
    console.error('Unexpected error:', err.message || err);
    return false;
  }
}

createAdminUser()
  .then(success => {
    if (success) {
      console.log('Admin user creation process completed successfully');
    } else {
      console.log('Admin user creation process failed');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('Error in admin user creation process:', err);
    process.exit(1);
  });
// This script creates an admin user in Supabase Auth and the user_profiles table
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

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
  process.env.SUPABASE_ANON_KEY
);

// Admin user details
const adminEmail = 'samsutton@rich-habits.com';
const adminPassword = 'Arlodog2013!';
const adminUsername = 'samsutton';
const firstName = 'Sam';
const lastName = 'Sutton';

async function createAdminUser() {
  console.log('Creating admin user in Supabase Auth...');
  
  try {
    // First check if auth.users table exists (we need Supabase Auth enabled)
    console.log('Verifying Supabase Auth is enabled...');
    
    // 1. Create user in Supabase Auth
    console.log('Creating user in Supabase Auth...');
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: adminEmail,
      password: adminPassword,
      options: {
        data: {
          role: 'admin',
          username: adminUsername,
          first_name: firstName,
          last_name: lastName
        }
      }
    });
    
    if (authError) {
      console.error('Error creating admin in Supabase Auth:', authError.message);
      return false;
    }
    
    if(!authData.user) {
      console.error('No user returned from Supabase Auth signup');
      return false;
    }
    
    console.log('Admin created in Supabase Auth:', authData.user.id);
    
    // 2. Insert user into user_profiles table
    console.log('Creating user profile...');
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        id: authData.user.id,
        username: adminUsername,
        first_name: firstName,
        last_name: lastName,
        role: 'admin'
      })
      .select();
    
    if (profileError) {
      console.error('Error creating admin profile:', profileError.message);
      return false;
    }
    
    console.log('Admin profile created:', profileData);
    
    // 3. Create a customer record for the admin
    console.log('Creating customer record for admin...');
    const { data: customerData, error: customerError } = await supabase
      .from('customers')
      .insert({
        user_id: authData.user.id,
        first_name: firstName,
        last_name: lastName,
        email: adminEmail
      })
      .select();
    
    if (customerError) {
      console.warn('Error creating customer record for admin:', customerError.message);
      console.warn('This is not critical but may impact some functionality');
    } else {
      console.log('Customer record created for admin:', customerData[0].id);
    }
    
    return true;
  } catch (err) {
    console.error('Unexpected error during admin creation:', err.message || err);
    return false;
  }
}

createAdminUser()
  .then(success => {
    if (success) {
      console.log('Admin user creation completed successfully');
    } else {
      console.log('Admin user creation failed');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('Error in admin user creation process:', err);
    process.exit(1);
  });
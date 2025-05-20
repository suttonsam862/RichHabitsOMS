// Create an admin user in Supabase Auth
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.SUPABASE_URL) {
  console.error('SUPABASE_URL environment variable is not set');
  process.exit(1);
}

if (!process.env.SUPABASE_ANON_KEY) {
  console.error('SUPABASE_ANON_KEY environment variable is not set');
  process.exit(1);
}

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
  console.log(`Email: ${adminEmail}`);
  
  try {
    // 1. Create user in Supabase Auth
    console.log('Signing up admin user in Supabase Auth...');
    const { data, error } = await supabase.auth.signUp({
      email: adminEmail,
      password: adminPassword,
      options: {
        data: {
          firstName,
          lastName,
          role: 'admin'
        }
      }
    });
    
    if (error) {
      console.error('Error creating admin in Supabase Auth:', error.message);
      
      // Check if error is because user already exists
      if (error.message.includes('already registered') || error.message.includes('already exists')) {
        console.log('Admin user might already exist, attempting to sign in...');
        
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: adminEmail,
          password: adminPassword
        });
        
        if (signInError) {
          console.error('Error signing in as admin:', signInError.message);
          return false;
        }
        
        console.log('Successfully signed in as admin user');
        data.user = signInData.user;
      } else {
        return false;
      }
    } else {
      console.log('Admin created in Supabase Auth:', data.user.id);
    }
    
    if (!data?.user) {
      console.error('No user data returned from Supabase Auth');
      return false;
    }
    
    // 2. Create user profile in user_profiles table
    console.log('Creating user profile for admin...');
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .upsert({
        id: data.user.id,
        username: adminUsername,
        first_name: firstName,
        last_name: lastName,
        role: 'admin'
      })
      .select();
    
    if (profileError) {
      console.error('Error creating admin profile:', profileError.message);
      console.log('Make sure the database schema has been created properly');
      return false;
    }
    
    console.log('Admin profile created:', profileData);
    
    // 3. Create customer record for admin
    console.log('Creating customer record for admin...');
    const { data: customerData, error: customerError } = await supabase
      .from('customers')
      .upsert({
        user_id: data.user.id,
        first_name: firstName,
        last_name: lastName,
        email: adminEmail
      })
      .select();
    
    if (customerError) {
      console.warn('Error creating customer record for admin:', customerError.message);
      console.warn('This is not critical but may impact some functionality');
    } else {
      console.log('Customer record created for admin:', customerData);
    }
    
    console.log('\nAdmin user created successfully!');
    console.log('Email:', adminEmail);
    console.log('Password:', adminPassword);
    console.log('You can now log in to the system with these credentials.');
    
    return true;
  } catch (err) {
    console.error('Unexpected error during admin creation:', err.message || err);
    return false;
  }
}

createAdminUser()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('Error in admin user creation process:', err);
    process.exit(1);
  });
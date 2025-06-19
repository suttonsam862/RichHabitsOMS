// This script creates an admin user in Supabase Auth and the users table
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
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
const adminUsername = 'samadmin';
const firstName = 'Sam';
const lastName = 'Sutton';

async function createAdminUser() {
  console.log('Creating admin user in Supabase Auth...');
  
  try {
    // First, check if the users table exists in the database
    const { error: tableCheckError } = await supabase
      .from('users')
      .select('count(*)', { count: 'exact', head: true });
    
    if (tableCheckError) {
      console.error('Error checking users table. Have you run the migration script in Supabase SQL Editor?');
      console.error(tableCheckError.message);
      return false;
    }
    
    console.log('Users table exists, proceeding with admin creation');
    
    // 1. Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: adminEmail,
      password: adminPassword,
      options: {
        data: {
          role: 'admin',
          username: adminUsername,
          firstName,
          lastName
        }
      }
    });
    
    if (authError) {
      console.error('Error creating admin in Supabase Auth:', authError.message);
      return false;
    }
    
    console.log('Admin created in Supabase Auth:', authData.user.id);
    
    // 2. Hash the password for storage in our custom users table
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    
    // 3. Insert user into our custom users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert({
        email: adminEmail,
        username: adminUsername,
        password: hashedPassword,
        firstName,
        lastName,
        role: 'admin'
      })
      .select();
    
    if (userError) {
      console.error('Error creating admin in users table:', userError.message);
      return false;
    }
    
    console.log('Admin created in users table:', userData[0].id);
    
    // 4. Create a customer record for the admin
    const { data: customerData, error: customerError } = await supabase
      .from('customers')
      .insert({
        userId: userData[0].id,
        firstName,
        lastName,
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
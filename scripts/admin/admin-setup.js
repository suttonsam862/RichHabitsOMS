// Simple script to create admin in Supabase Auth
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing required environment variables SUPABASE_URL or SUPABASE_ANON_KEY');
  process.exit(1);
}

console.log('Connecting to Supabase at:', SUPABASE_URL);

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

// Admin user details
const adminEmail = 'samsutton@rich-habits.com';
const adminPassword = 'Arlodog2013!';

async function createAdminInSupabaseAuth() {
  console.log(`Creating admin user with email: ${adminEmail}`);
  
  try {
    // Create user in Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email: adminEmail,
      password: adminPassword,
      options: {
        data: {
          role: 'admin'
        }
      }
    });
    
    if (error) {
      if (error.message.includes('already registered')) {
        console.log('User already exists, trying to sign in...');
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: adminEmail,
          password: adminPassword
        });
        
        if (signInError) {
          console.error('Sign in failed:', signInError.message);
          return false;
        }
        
        console.log('Successfully signed in with existing user');
        return true;
      } else {
        console.error('Error creating user:', error.message);
        return false;
      }
    }
    
    console.log('Admin user created successfully:', data.user.id);
    return true;
  } catch (err) {
    console.error('Unexpected error:', err);
    return false;
  }
}

createAdminInSupabaseAuth()
  .then(success => {
    if (success) {
      console.log('Admin setup completed successfully');
      console.log('You can now log in with:');
      console.log(`Email: ${adminEmail}`);
      console.log(`Password: ${adminPassword}`);
    } else {
      console.log('Admin setup failed');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('Admin setup error:', err);
    process.exit(1);
  });
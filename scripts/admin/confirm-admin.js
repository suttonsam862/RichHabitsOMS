// Script to confirm the admin email in Supabase Auth
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing required environment variables SUPABASE_URL or SUPABASE_ANON_KEY');
  process.exit(1);
}

// Admin user details
const adminEmail = 'samsutton@rich-habits.com';
const adminPassword = 'Arlodog2013!';

async function confirmAdminUser() {
  console.log(`Attempting to log in as admin to get confirmation token: ${adminEmail}`);
  
  try {
    // Using the Supabase admin client (needs service role key)
    const supabase = createClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY 
    );
    
    // First, attempt to sign in (this might fail, but we can still proceed)
    const { data, error } = await supabase.auth.signInWithPassword({
      email: adminEmail,
      password: adminPassword
    });
    
    if (error) {
      console.log('Sign-in attempt resulted in:', error.message);
      console.log('This is expected if email is not confirmed yet');
    } else {
      console.log('User signed in successfully, email may already be confirmed');
      return true;
    }
    
    // Since we can't directly confirm emails through the JS client without the email link,
    // provide instructions for manual confirmation
    console.log('\n-----------------------------------------------------------------');
    console.log('MANUAL CONFIRMATION REQUIRED:');
    console.log('-----------------------------------------------------------------');
    console.log('1. Go to the Supabase dashboard: https://supabase.com/dashboard/project/_/auth/users');
    console.log('2. Find the user with email:', adminEmail);
    console.log('3. Click on the user to view details');
    console.log('4. Click "Confirm user" button or manually set email_confirmed to true');
    console.log('-----------------------------------------------------------------\n');
    
    return false;
  } catch (err) {
    console.error('Unexpected error:', err);
    return false;
  }
}

confirmAdminUser()
  .then(success => {
    if (success) {
      console.log('Admin email confirmation process completed');
    } else {
      console.log('Please follow the manual steps to confirm the admin email');
    }
    process.exit(0);
  })
  .catch(err => {
    console.error('Error during admin confirmation:', err);
    process.exit(1);
  });
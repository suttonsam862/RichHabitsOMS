// Script to update user to super admin status using standard Auth API
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Supabase connection details
const supabaseUrl = process.env.SUPABASE_URL || 'https://ctznfijidykgjhzpuyej.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

// Admin user details
const adminEmail = 'samsutton@rich-habits.com';
const adminPassword = 'Arlodog2013!';

async function updateToSuperAdmin() {
  console.log('Updating user to super admin status...');
  
  try {
    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log('Supabase client initialized');
    
    // Sign in as the admin user first
    console.log(`Signing in as ${adminEmail}...`);
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: adminEmail,
      password: adminPassword
    });
    
    if (signInError) {
      console.error('Error signing in:', signInError.message);
      return false;
    }
    
    console.log('Successfully signed in');
    
    // Now update the user metadata to include is_super_admin flag
    console.log('Updating user metadata with super admin flag...');
    const { data, error: updateError } = await supabase.auth.updateUser({
      data: { 
        role: 'admin',
        is_super_admin: true
      }
    });
    
    if (updateError) {
      console.error('Error updating user metadata:', updateError);
      return false;
    }
    
    console.log('User metadata updated successfully:');
    console.log(data.user.user_metadata);
    
    // Sign out after updating
    await supabase.auth.signOut();
    console.log('Signed out successfully');
    
    return true;
  } catch (error) {
    console.error('Unexpected error:', error);
    return false;
  }
}

// Run the function
updateToSuperAdmin()
  .then(success => {
    if (success) {
      console.log('Super admin update completed successfully');
    } else {
      console.error('Super admin update failed');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('Unhandled error:', err);
    process.exit(1);
  });
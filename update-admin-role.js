// Script to update the admin user's role in Supabase Auth metadata
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Supabase connection details
const supabaseUrl = process.env.SUPABASE_URL || 'https://ctznfijidykgjhzpuyej.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

// Admin user details
const adminEmail = 'samsutton@rich-habits.com';
const adminPassword = 'Arlodog2013!';

async function updateAdminRole() {
  console.log('Updating admin user role in Supabase Auth...');
  
  try {
    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log('Supabase client initialized');
    
    // First, sign in as the admin
    console.log(`Attempting to sign in as ${adminEmail}...`);
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: adminEmail,
      password: adminPassword
    });
    
    if (signInError) {
      console.error('Error signing in as admin:', signInError.message);
      return false;
    }
    
    console.log('Successfully signed in as admin user');
    
    // Now update the user metadata to set role to admin
    console.log('Updating user metadata...');
    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        role: 'admin'
      }
    });
    
    if (updateError) {
      console.error('Error updating admin user metadata:', updateError);
      return false;
    }
    
    console.log('Admin user metadata updated successfully with role: admin');
    
    // Get user profile data to verify
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('Error getting user data:', userError);
    } else {
      console.log('User metadata:', userData.user.user_metadata);
    }
    
    // Sign out after updating
    await supabase.auth.signOut();
    console.log('Signed out successfully');
    
    return true;
  } catch (error) {
    console.error('Unexpected error:', error);
    return false;
  }
}

// Run the update function
updateAdminRole()
  .then(success => {
    if (success) {
      console.log('Admin role update completed successfully');
    } else {
      console.error('Admin role update failed');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('Unhandled error:', err);
    process.exit(1);
  });
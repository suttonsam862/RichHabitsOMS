import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

// Initialize Supabase client with service key from environment
const supabaseUrl = 'https://ctznfijidykgjhzpuyej.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.DATABASE_URL?.split('@')[0].split(':')[2];

if (!supabaseKey) {
  console.error('Error: No Supabase key found. Please make sure SUPABASE_SERVICE_KEY or DATABASE_URL is set in your environment.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestUser() {
  try {
    const email = 'suttonsam862@gmail.com';
    const password = 'TestPassword123';
    
    console.log('Creating Sam Sutton test user...');
    
    // Check if user already exists in Auth
    const { data: userData, error: userError } = await supabase.auth.signInWithPassword({
      email,
      password: 'wrong-password-to-check-existence'
    });
    
    const userExists = !userError || userError.message.includes('Invalid login credentials');
    
    if (userExists) {
      console.log('User already exists in Supabase Auth. Continuing with profile creation...');
    } else {
      // Create user in Auth
      console.log('Creating user in Supabase Auth...');
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            firstName: 'Sam',
            lastName: 'Sutton',
            role: 'customer'
          }
        }
      });
      
      if (error) {
        console.error('Error creating user in Auth:', error.message);
        process.exit(1);
      }
      
      console.log('User created in Auth with ID:', data.user.id);
    }
    
    // Check if user profile exists
    const { data: profiles, error: profileCheckError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('email', email)
      .limit(1);
    
    if (profileCheckError) {
      console.error('Error checking for existing profile:', profileCheckError.message);
    }
    
    if (profiles && profiles.length > 0) {
      console.log('User profile already exists with ID:', profiles[0].id);
    } else {
      // Get user ID from Auth
      const { data: authUser } = await supabase.auth.getUser();
      const userId = authUser?.user?.id;
      
      if (!userId) {
        console.error('Could not determine user ID. Please check authentication.');
        process.exit(1);
      }
      
      // Create user profile
      console.log('Creating user profile...');
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          id: userId,
          username: 'samsutton123',
          email,
          first_name: 'Sam',
          last_name: 'Sutton',
          role: 'customer',
          company: 'Test Company',
          phone: '2055869574',
          address: '204 Virginia Drive',
          city: 'Birmingham',
          state: 'AL',
          postal_code: '35209',
          country: 'United States'
        });
      
      if (profileError) {
        console.error('Error creating user profile:', profileError.message);
      } else {
        console.log('User profile created successfully!');
      }
    }
    
    console.log('\nTest user created:');
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('\nYou can now log in with these credentials.');
    
  } catch (err) {
    console.error('Unexpected error:', err);
    process.exit(1);
  }
}

createTestUser();
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://ctznfijidykgjhzpuyej.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('Error: Supabase key not found in environment variables');
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestUser() {
  try {
    console.log('Creating test user in Supabase...');
    
    // Generate a random password
    const password = Math.random().toString(36).substring(2, 10) + 
                    Math.random().toString(36).substring(2, 10);
    
    // Create the user in Supabase Auth
    const { data, error } = await supabase.auth.admin.createUser({
      email: 'suttonsam862@gmail.com',
      password: password,
      email_confirm: true,
      user_metadata: {
        firstName: 'Sam',
        lastName: 'Sutton',
        role: 'customer'
      }
    });
    
    if (error) {
      console.error('Error creating user in Supabase Auth:', error);
      return;
    }
    
    console.log('User created in Supabase Auth:', data.user.id);
    
    // Create user profile
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        id: data.user.id,
        username: 'samsutton' + Math.floor(Math.random() * 1000),
        email: 'suttonsam862@gmail.com',
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
      })
      .select();
    
    if (profileError) {
      console.error('Error creating user profile:', profileError);
      // Try to clean up the auth user
      await supabase.auth.admin.deleteUser(data.user.id);
      return;
    }
    
    console.log('User profile created successfully');
    console.log('-----------------------------');
    console.log('User details:');
    console.log('Email:', 'suttonsam862@gmail.com');
    console.log('Password:', password);
    console.log('ID:', data.user.id);
    
    // Generate a password reset/recovery link
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: 'suttonsam862@gmail.com',
    });
    
    if (linkError) {
      console.error('Error generating recovery link:', linkError);
    } else if (linkData?.properties?.action_link) {
      console.log('-----------------------------');
      console.log('Account setup link:');
      console.log(linkData.properties.action_link);
    }
    
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

createTestUser();
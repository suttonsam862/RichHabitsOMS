import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client - use the anonymous key which is safe to expose
const supabaseUrl = 'https://ctznfijidykgjhzpuyej.supabase.co';
const supabaseKey = process.env.DATABASE_URL?.split('@')[0].split(':')[2] || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function createSamUser() {
  try {
    console.log('Creating test user account for Sam Sutton...');
    
    // Generate a simple password for testing
    const password = 'TestPassword123!';
    
    // Create user with the regular signup method
    const { data, error } = await supabase.auth.signUp({
      email: 'suttonsam862@gmail.com',
      password: password,
      options: {
        data: {
          firstName: 'Sam',
          lastName: 'Sutton',
          role: 'customer'
        }
      }
    });
    
    if (error) {
      console.error('Error creating user:', error.message);
      return;
    }
    
    console.log('User created successfully!');
    console.log('User ID:', data.user.id);
    console.log('Email:', 'suttonsam862@gmail.com');
    console.log('Password:', password);
    console.log('Now you can verify this email account.');
    
  } catch (err) {
    console.error('Unexpected error:', err.message);
  }
}

createSamUser();
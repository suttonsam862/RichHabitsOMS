// Script to create the admin user profile in Supabase database
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
const adminId = '0a1fc1ab-b9ba-4580-b798-9034cde69c61'; // This should match the UUID from Supabase Auth

async function createAdminProfile() {
  console.log(`Creating admin profile for user: ${adminEmail} (${adminId})`);
  
  try {
    // First check if the user_profiles table exists
    const { error: tableCheckError } = await supabase
      .from('user_profiles')
      .select('*')
      .limit(1);
    
    if (tableCheckError) {
      console.log('Creating user_profiles table...');
      
      // Create the table using raw SQL
      const { error: createTableError } = await supabase.rpc('exec', { 
        query: `
          CREATE TABLE IF NOT EXISTS user_profiles (
            id UUID PRIMARY KEY,
            role TEXT NOT NULL DEFAULT 'customer'
          );
          
          -- Enable Row Level Security
          ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
          
          -- Create a simple policy that allows all operations
          DROP POLICY IF EXISTS "Allow all operations" ON user_profiles;
          CREATE POLICY "Allow all operations" ON user_profiles FOR ALL USING (true);
        `
      });
      
      if (createTableError) {
        console.error('Error creating user_profiles table:', createTableError);
        return false;
      }
      
      console.log('user_profiles table created successfully');
    }
    
    // Check if admin profile already exists
    const { data: existingProfile, error: profileCheckError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', adminId)
      .single();
    
    if (existingProfile) {
      console.log('Admin profile already exists:', existingProfile);
      return true;
    }
    
    // Create admin profile
    const { data: profile, error: insertError } = await supabase
      .from('user_profiles')
      .insert([
        {
          id: adminId,
          role: 'admin'
        }
      ])
      .select();
    
    if (insertError) {
      console.error('Error creating admin profile:', insertError);
      return false;
    }
    
    console.log('Admin profile created successfully:', profile);
    return true;
  } catch (err) {
    console.error('Unexpected error:', err);
    return false;
  }
}

createAdminProfile()
  .then(success => {
    if (success) {
      console.log('Admin profile setup completed successfully');
    } else {
      console.log('Admin profile setup failed');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('Admin profile setup error:', err);
    process.exit(1);
  });
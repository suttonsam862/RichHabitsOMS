import { supabase } from './supabase';
import bcrypt from 'bcrypt';

/**
 * Script to create the admin user account
 */
async function createAdminUser() {
  console.log('Checking if admin user already exists...');
  
  // Check if users table exists
  const { data: tableCheck, error: tableError } = await supabase
    .from('users')
    .select('count')
    .limit(1);
  
  if (tableError) {
    console.error('Error accessing users table:', tableError.message);
    console.log('Make sure you have run the migration script in Supabase first!');
    return;
  }
  
  console.log('Users table exists. Checking for existing admin...');
  
  // Check for existing admin user
  const { data: existingUsers, error: userError } = await supabase
    .from('users')
    .select('id, email')
    .eq('email', 'samsutton@rich-habits.com');
  
  if (userError) {
    console.error('Error checking for existing admin:', userError.message);
    return;
  }
  
  if (existingUsers && existingUsers.length > 0) {
    console.log('Admin user already exists:', existingUsers[0].email);
    return;
  }
  
  // Create admin user
  console.log('Creating admin user...');
  const hashedPassword = await bcrypt.hash('Arlodog2013!', 10);
  
  const { data: newUser, error: createError } = await supabase
    .from('users')
    .insert([{
      email: 'samsutton@rich-habits.com',
      username: 'samsutton',
      password: hashedPassword,
      firstName: 'Sam',
      lastName: 'Sutton',
      role: 'admin',
      createdAt: new Date().toISOString()
    }])
    .select();
  
  if (createError) {
    console.error('Failed to create admin user:', createError.message);
    return;
  }
  
  console.log('Admin user created successfully:', newUser[0].email);
  console.log('You can now log in with:');
  console.log('Email: samsutton@rich-habits.com');
  console.log('Password: Arlodog2013!');
}

// Run the function
createAdminUser().catch(console.error);
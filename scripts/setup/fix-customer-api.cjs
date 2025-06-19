/**
 * Fix for customer creation API
 */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Create a test customer for verification
async function testCreateCustomer() {
  try {
    console.log('Testing customer creation in Supabase...');
    
    // Generate test data
    const email = `test_customer_${Date.now()}@example.com`;
    const password = 'Test123456!';
    
    // First create the user in Supabase Auth
    console.log(`Creating auth user with email: ${email}`);
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });
    
    if (error) {
      console.error('Failed to create user in Supabase Auth:', error);
      return;
    }
    
    console.log('Successfully created user in Auth service:', data.user.id);
    
    // Create user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        id: data.user.id,
        email,
        username: 'testuser' + Math.floor(Math.random() * 1000),
        first_name: 'Test',
        last_name: 'Customer',
        role: 'customer',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select();
    
    if (profileError) {
      console.error('Failed to create user profile:', profileError);
      return;
    }
    
    console.log('Successfully created customer profile:', profile);
    console.log('\nTEST COMPLETED SUCCESSFULLY!');
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('User ID:', data.user.id);
    
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

// Run the test
testCreateCustomer();
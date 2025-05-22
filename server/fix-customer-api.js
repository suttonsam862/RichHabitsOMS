// This is a temporary fix to test customer creation API
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Validate Supabase URL and key
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  console.error('Missing required environment variables: SUPABASE_URL and SUPABASE_ANON_KEY');
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function createTestCustomer() {
  try {
    console.log('Creating test customer...');
    
    const testEmail = `testcustomer${Date.now()}@example.com`;
    const randomPassword = Math.random().toString(36).substring(2, 10) + 
                           Math.random().toString(36).substring(2, 10);
    
    // Create user in Supabase Auth
    const { data, error } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: randomPassword,
      email_confirm: true,
      user_metadata: {
        first_name: 'Test',
        last_name: 'Customer',
        role: 'customer'
      }
    });
    
    if (error) {
      console.error('Error creating customer in Supabase Auth:', error);
      return;
    }
    
    console.log('Auth user created:', data.user.id);
    
    // Create username from first and last name
    const username = 'testcustomer' + Math.floor(Math.random() * 1000);
    
    // Create customer profile in the database
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        id: data.user.id,
        username: username,
        email: testEmail,
        first_name: 'Test',
        last_name: 'Customer',
        role: 'customer',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_active: true
      })
      .select();
    
    if (profileError) {
      console.error('Error creating customer profile:', profileError);
      return;
    }
    
    console.log('Customer profile created successfully:', profile);
    console.log('\nTest customer created with:');
    console.log('Email:', testEmail);
    console.log('Password:', randomPassword);
    
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

createTestCustomer();
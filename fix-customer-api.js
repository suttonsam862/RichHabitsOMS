/**
 * Simple script to test customer creation via Supabase directly
 * This is a workaround until we fix the main application
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Check if we have the required environment variables
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
    console.log('Creating a test customer in Supabase...');
    
    // Generate unique test email
    const testEmail = `test_customer_${Date.now()}@example.com`;
    const randomPassword = Math.random().toString(36).substring(2, 10) + 
                           Math.random().toString(36).substring(2, 10);
    
    // Step 1: Create user in Supabase Auth
    console.log('Step 1: Creating auth user...');
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: randomPassword,
      email_confirm: true,
      user_metadata: {
        firstName: 'Test',
        lastName: 'Customer',
        role: 'customer'
      }
    });
    
    if (authError) {
      console.error('Error creating auth user:', authError);
      return;
    }
    
    const userId = authData.user.id;
    console.log('Auth user created successfully:', userId);
    
    // Step 2: Create user profile in the database
    console.log('Step 2: Creating user profile...');
    const username = 'testcustomer' + Math.floor(Math.random() * 1000);
    
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        id: userId,
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
      console.error('Error creating user profile:', profileError);
      // Try to clean up auth user
      await supabase.auth.admin.deleteUser(userId);
      return;
    }
    
    console.log('User profile created successfully:', profileData);
    
    // Success!
    console.log('\n✅ TEST CUSTOMER CREATED SUCCESSFULLY');
    console.log('Email:', testEmail);
    console.log('Password:', randomPassword);
    console.log('User ID:', userId);
    
    // Now let's also verify we can retrieve the customer
    const { data: customer, error: getError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('email', testEmail)
      .single();
    
    if (getError) {
      console.error('Error retrieving created customer:', getError);
    } else {
      console.log('\nVerified customer retrieval:', customer);
    }
    
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

// Run the test
createTestCustomer();
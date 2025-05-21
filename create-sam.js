import { supabase } from './server/db.js';

// Create the test user for Sam Sutton
async function createTestUser() {
  try {
    const email = 'suttonsam862@gmail.com';
    const password = 'TestPassword123!';
    
    console.log('Creating test user in Supabase Auth...');
    
    // Create user in Supabase Auth
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        firstName: 'Sam',
        lastName: 'Sutton',
        role: 'customer'
      }
    });
    
    if (error) {
      console.error('Error creating user in Supabase Auth:', error);
      process.exit(1);
    }
    
    console.log('User created in Supabase Auth successfully!');
    console.log('User ID:', data.user.id);
    
    // Create user profile
    console.log('Creating user profile...');
    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        id: data.user.id,
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
      console.error('Error creating user profile:', profileError);
      
      // Try to clean up the auth user
      await supabase.auth.admin.deleteUser(data.user.id);
      process.exit(1);
    }
    
    console.log('User profile created successfully!');
    
    // Generate password reset link
    console.log('Generating verification link...');
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email,
    });
    
    if (linkError) {
      console.error('Error generating verification link:', linkError);
    } else if (linkData?.properties?.action_link) {
      console.log('-----------------------------------------------');
      console.log('Account verification link:');
      console.log(linkData.properties.action_link);
      console.log('-----------------------------------------------');
    }
    
    console.log('Test user created successfully with the following details:');
    console.log('Email:', email);
    console.log('Password:', password);
    
  } catch (err) {
    console.error('Unexpected error:', err);
    process.exit(1);
  }
}

createTestUser();
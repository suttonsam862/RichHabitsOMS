import { supabase } from './supabase';

/**
 * Script to create an admin user in Supabase Auth
 */
async function createSupabaseAdmin() {
  try {
    console.log('Creating admin user in Supabase Auth...');
    
    const email = 'samsutton@rich-habits.com';
    const password = 'Arlodog2013!';
    
    // Check if the user already exists
    const { data: { user: existingUser }, error: existingError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (existingUser) {
      console.log('Admin user already exists in Supabase Auth');
      
      // Update user metadata to ensure role is set to admin
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          role: 'admin',
          username: 'samadmin',
          firstName: 'Sam',
          lastName: 'Sutton',
        }
      });
      
      if (updateError) {
        console.error('Error updating admin user metadata:', updateError);
      } else {
        console.log('Admin user metadata updated successfully');
      }
      
      // Sign out after updating
      await supabase.auth.signOut();
      
      return;
    }
    
    // If login error means user doesn't exist, create them
    if (existingError && existingError.message.includes('Invalid login credentials')) {
      // Create new admin user
      const { data: { user }, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role: 'admin',
            username: 'samadmin',
            firstName: 'Sam',
            lastName: 'Sutton',
          }
        }
      });
      
      if (error) {
        console.error('Error creating admin user:', error);
        return;
      }
      
      console.log('Admin user created successfully:', user?.id);
      
      // Sign out after creation
      await supabase.auth.signOut();
    } else if (existingError) {
      console.error('Error checking for existing user:', existingError);
    }
  } catch (error) {
    console.error('Unexpected error creating admin user:', error);
  }
}

// Execute the function
createSupabaseAdmin().then(() => {
  console.log('Admin user creation process completed');
  process.exit(0);
}).catch(err => {
  console.error('Error in admin user creation process:', err);
  process.exit(1);
});
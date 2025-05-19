import { supabase } from './supabase';
import { hash } from 'bcrypt';

/**
 * Script to create the admin user in Supabase database
 */
async function createAdminUser() {
  try {
    console.log("Checking if admin user already exists...");
    
    const { data: existingUsers, error: checkError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', 'samsutton@rich-habits.com');
    
    if (checkError) {
      console.error("Error checking for existing admin:", checkError.message);
      return;
    }
    
    if (existingUsers && existingUsers.length > 0) {
      console.log("Admin user already exists:", existingUsers[0].email);
      return;
    }
    
    // Create the admin user
    console.log("Creating admin user...");
    const hashedPassword = await hash('Arlodog2013!', 10);
    
    const { data: user, error } = await supabase
      .from('users')
      .insert({
        email: 'samsutton@rich-habits.com',
        username: 'samsutton',
        password: hashedPassword,
        firstName: 'Sam',
        lastName: 'Sutton',
        role: 'admin',
        createdAt: new Date().toISOString()
      })
      .select();
    
    if (error) {
      console.error("Failed to create admin user:", error.message);
      return;
    }
    
    console.log("Admin user created successfully:", user[0].email);
  } catch (error) {
    console.error("Error creating admin user:", error);
  }
}

// Run the function
createAdminUser().catch(console.error);
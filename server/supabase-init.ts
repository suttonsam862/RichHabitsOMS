import { supabase } from './supabase';
import { hash } from 'bcrypt';

/**
 * Safe database initialization that checks for existing data before creating anything
 * This prevents data loss on application restarts
 * Uses Supabase client instead of direct PostgreSQL connection
 */
export async function initializeDatabase() {
  try {
    console.log("Checking database initialization state with Supabase client...");
    
    // Check if admin user exists
    const { data: adminUsers, error: adminError } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'admin');
    
    if (adminError) {
      console.error("Error checking for admin users:", adminError);
      return false;
    }
    
    const adminCount = adminUsers?.length || 0;
    
    // Only initialize if no admin users exist
    if (adminCount === 0) {
      console.log("No admin users found. Initializing database with admin account...");
      
      // Create default admin user
      const hashedPassword = await hash('Arlodog2013!', 10);
      
      const { data, error } = await supabase
        .from('users')
        .insert({
          email: 'samsutton@rich-habits.com',
          username: 'samsutton',
          password: hashedPassword,
          firstName: 'Sam',
          lastName: 'Sutton',
          role: 'admin',
          createdAt: new Date().toISOString()
        });
      
      if (error) {
        console.error("Error creating admin user:", error);
        return false;
      }
      
      console.log("Admin user created successfully");
    } else {
      console.log(`Database already initialized with ${adminCount} admin users`);
    }
    
    return true;
  } catch (error) {
    console.error("Database initialization failed:", error);
    return false;
  }
}
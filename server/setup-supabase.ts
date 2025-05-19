import { supabase } from './supabase';
import { hash } from 'bcrypt';
import fs from 'fs';

/**
 * Script to set up Supabase database and create admin user
 */
async function setupSupabase() {
  try {
    console.log('Setting up Supabase database...');
    
    // Read migration SQL
    const sqlScript = fs.readFileSync('./server/supabase-migration.sql', 'utf8');
    console.log('Migration SQL loaded');
    
    try {
      // Try to directly execute the SQL
      console.log('Executing SQL migration via Supabase REST API...');
      const { error } = await supabase.rpc('exec_sql', { query: sqlScript });
      
      if (error) {
        console.error('Error executing migration via RPC:', error.message);
        console.log('Will attempt to execute individual statements...');
        
        // Split the SQL into individual statements and execute them one by one
        const statements = sqlScript
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0);
        
        console.log(`Found ${statements.length} SQL statements to execute`);
        
        for (let i = 0; i < statements.length; i++) {
          const statement = statements[i] + ';';
          console.log(`Executing statement ${i+1}/${statements.length}`);
          
          const { error } = await supabase.rpc('exec_sql', { query: statement });
          if (error) {
            console.error(`Error executing statement ${i+1}:`, error.message);
            // Continue with next statement
          }
        }
      }
    } catch (err: any) {
      console.error('Failed to execute migration:', err.message || err);
    }
    
    // Create admin user regardless of migration success
    console.log('\nCreating admin user...');
    
    try {
      // Check if users table exists
      const { error: tableError } = await supabase.from('users').select('count').limit(1);
      if (tableError) {
        console.error('Cannot access users table:', tableError.message);
        console.log('You may need to run the migration script manually in the Supabase SQL editor');
        return;
      }
      
      // Check for existing admin user
      const { data: existingUsers, error: userError } = await supabase
        .from('users')
        .select('id, email')
        .eq('email', 'samsutton@rich-habits.com')
        .limit(1);
      
      if (userError) {
        console.error('Error checking for existing admin:', userError.message);
        return;
      }
      
      if (existingUsers && existingUsers.length > 0) {
        console.log('Admin user already exists:', existingUsers[0].email);
        return;
      }
      
      // Create admin user
      const hashedPassword = await hash('Arlodog2013!', 10);
      
      const { data: newUser, error: createError } = await supabase
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
      
      if (createError) {
        console.error('Failed to create admin user:', createError.message);
        return;
      }
      
      console.log('Admin user created successfully:', newUser[0].email);
      console.log('You can now log in with:');
      console.log('Email: samsutton@rich-habits.com');
      console.log('Password: Arlodog2013!');
    } catch (err: any) {
      console.error('Error creating admin user:', err.message || err);
    }
  } catch (error: any) {
    console.error('Setup failed:', error.message || error);
  }
}

// Run the function
setupSupabase().catch(console.error);
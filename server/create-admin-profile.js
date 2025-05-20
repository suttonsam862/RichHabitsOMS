// Script to create admin profile using direct SQL with the Postgres connection
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.DATABASE_URL) {
  console.error('Missing required environment variable DATABASE_URL');
  process.exit(1);
}

// Admin user details
const adminId = '0a1fc1ab-b9ba-4580-b798-9034cde69c61'; // This should match the UUID from Supabase Auth
const adminEmail = 'samsutton@rich-habits.com';

// Create PostgreSQL pool
const connectionConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
};

const pool = new Pool(connectionConfig);

async function createAdminProfile() {
  console.log(`Creating admin profile for user: ${adminEmail} (${adminId})`);
  
  try {
    // Connect to the database
    const client = await pool.connect();
    console.log('Connected to PostgreSQL database');
    
    try {
      // Create the table if it doesn't exist
      await client.query(`
        CREATE TABLE IF NOT EXISTS user_profiles (
          id UUID PRIMARY KEY,
          role TEXT NOT NULL DEFAULT 'customer'
        )
      `);
      
      // Enable Row Level Security if needed
      await client.query(`
        ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
        
        -- Drop policy if exists
        DO $$
        BEGIN
          BEGIN
            DROP POLICY IF EXISTS "Allow all operations" ON user_profiles;
          EXCEPTION
            WHEN undefined_object THEN
              -- Policy doesn't exist, which is fine
          END;
        END $$;
        
        -- Create a simple policy that allows all operations
        CREATE POLICY "Allow all operations" ON user_profiles FOR ALL USING (true);
      `);
      
      console.log('Table and policies created successfully');
      
      // Check if admin profile already exists
      const checkResult = await client.query(
        'SELECT * FROM user_profiles WHERE id = $1',
        [adminId]
      );
      
      if (checkResult.rows.length > 0) {
        console.log('Admin profile already exists:', checkResult.rows[0]);
        return true;
      }
      
      // Create admin profile
      const insertResult = await client.query(
        'INSERT INTO user_profiles (id, role) VALUES ($1, $2) RETURNING *',
        [adminId, 'admin']
      );
      
      console.log('Admin profile created successfully:', insertResult.rows[0]);
      return true;
    } finally {
      // Release the client back to the pool
      client.release();
    }
  } catch (err) {
    console.error('Error creating admin profile:', err);
    return false;
  } finally {
    // Close the pool
    await pool.end();
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
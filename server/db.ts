import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { createClient } from '@supabase/supabase-js';
import * as schema from '../shared/schema';

// Validate required environment variables
if (!process.env.SUPABASE_URL) {
  throw new Error('SUPABASE_URL environment variable is not set');
}

if (!process.env.SUPABASE_ANON_KEY) {
  throw new Error('SUPABASE_ANON_KEY environment variable is not set');
}

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Connection to Supabase PostgreSQL database
const connectionConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
};

console.log('Connecting to Supabase PostgreSQL database...');
console.log(`Connecting to database host: ${new URL(process.env.DATABASE_URL).hostname}`);

// Create PostgreSQL pool
export const pool = new Pool(connectionConfig);

// Initialize Drizzle ORM with our schema
export const db = drizzle(pool, { schema });

// Initialize Supabase client for Auth and Storage
console.log('Connecting to Supabase...');
console.log(`URL: ${process.env.SUPABASE_URL}`);

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

console.log('Supabase client initialized');

// Test Supabase connection
export async function testSupabaseConnection() {
  try {
    const { data, error } = await supabase.from('user_profiles').select('count(*)').limit(1);
    
    if (error) {
      throw error;
    }
    
    console.log('Supabase connection established successfully');
    return true;
  } catch (err) {
    console.error('Error connecting to Supabase:', err);
    return false;
  }
}
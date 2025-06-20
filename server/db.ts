
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

// Optimized connection pool for horizontal scaling
const connectionConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  // Optimize for multiple instances
  max: 10, // Maximum connections per instance
  min: 2,  // Minimum connections to keep alive
  idle: 10000, // Close idle connections after 10s
  acquire: 30000, // Maximum time to get connection
  evict: 1000, // Check for idle connections every 1s
};

console.log('Connecting to Supabase PostgreSQL database...');
console.log(`Connecting to database host: ${new URL(process.env.DATABASE_URL).hostname}`);

// Create PostgreSQL pool with scaling optimizations
export const pool = new Pool(connectionConfig);

// Handle pool errors gracefully
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

// Initialize Drizzle ORM with our schema
export const db = drizzle(pool, { schema });

// Singleton Supabase client with optimized config
let supabaseClient: ReturnType<typeof createClient> | null = null;

export const supabase = (() => {
  if (!supabaseClient) {
    console.log('Initializing Supabase client...');
    supabaseClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
      {
        auth: {
          persistSession: false, // Don't persist sessions for scaling
          autoRefreshToken: false, // Handle token refresh manually
          detectSessionInUrl: false,
          flowType: 'implicit'
        },
        global: {
          headers: {
            'x-application-name': 'RichHabitsOMS',
            'Content-Type': 'application/json'
          },
        },
        // Optimize for performance
        realtime: {
          params: {
            eventsPerSecond: 10
          }
        }
      }
    );
    console.log('Supabase client initialized');
  }
  return supabaseClient;
})();

// Optimized connection test for scaling
export async function testSupabaseConnection() {
  try {
    const { error } = await supabase.from('user_profiles').select('id').limit(1).single();
    
    if (error && error.code === 'PGRST116') {
      console.log('User profiles table exists but empty');
      return true;
    }
    
    if (error && error.code === 'PGRST204') {
      console.log('User profiles table not found, schema may need initialization');
      return true;
    }
    
    console.log('Supabase connection verified successfully');
    return true;
  } catch (err) {
    console.error('Error connecting to Supabase:', err);
    return false;
  }
}

// Graceful shutdown for scaling events
export async function closeConnections() {
  try {
    await pool.end();
    console.log('Database connections closed gracefully');
  } catch (err) {
    console.error('Error closing database connections:', err);
  }
}

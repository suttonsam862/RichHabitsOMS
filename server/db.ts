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
    const supabaseUrl = process.env.SUPABASE_URL || 'https://ctznfijidykgjhzpuyej.supabase.co';
    const supabaseKey = process.env.SUPABASE_ANON_KEY || '';

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase configuration. Please check your environment variables.');
    }

    console.log('Connecting to Supabase PostgreSQL database...');
    console.log('Connecting to database host:', new URL(supabaseUrl).hostname);

    console.log('Initializing Supabase client with optimized settings...');
    supabaseClient = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      },
      db: {
        schema: 'public'
      },
      global: {
        headers: {
          'x-connection-mode': 'pooling'
        }
      },
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      }
    });

    console.log('Supabase client initialized with connection pooling');
  }
  return supabaseClient;
})();

// Connection retry logic
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Test the connection with retry logic
export async function testSupabaseConnection(): Promise<boolean> {
  let retries = 0;

  while (retries < MAX_RETRIES) {
    try {
      console.log(`Testing Supabase connection (attempt ${retries + 1}/${MAX_RETRIES})...`);

      // Simple query to test connection
      const { data, error } = await supabase
        .from('customers')
        .select('count')
        .limit(1);

      if (error) {
        console.error(`Connection test failed (attempt ${retries + 1}):`, error.message);
        retries++;

        if (retries < MAX_RETRIES) {
          console.log(`Retrying in ${RETRY_DELAY}ms...`);
          await delay(RETRY_DELAY * retries); // Exponential backoff
          continue;
        }
        return false;
      }

      console.log('Supabase connection verified successfully');
      return true;
    } catch (err) {
      console.error(`Connection test error (attempt ${retries + 1}):`, err);
      retries++;

      if (retries < MAX_RETRIES) {
        console.log(`Retrying in ${RETRY_DELAY}ms...`);
        await delay(RETRY_DELAY * retries);
      }
    }
  }

  console.error('All connection attempts failed');
  return false;
}

// Health check function for monitoring
export async function healthCheck(): Promise<{
  status: 'healthy' | 'unhealthy';
  latency?: number;
  error?: string;
}> {
  const startTime = Date.now();

  try {
    const { error } = await supabase
      .from('customers')
      .select('count')
      .limit(1);

    const latency = Date.now() - startTime;

    if (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        latency
      };
    }

    return {
      status: 'healthy',
      latency
    };
  } catch (err: any) {
    return {
      status: 'unhealthy',
      error: err.message || 'Unknown error',
      latency: Date.now() - startTime
    };
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
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
  connectionString: process.env.DATABASE_URL || undefined,
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
        schema: undefined
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

  console.log('\n🔌 === DATABASE CONNECTION TEST STARTING ===');
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📍 Supabase URL: ${process.env.SUPABASE_URL ? 'Set' : 'MISSING'}`);
  console.log(`🔑 Anon Key: ${process.env.SUPABASE_ANON_KEY ? 'Set' : 'MISSING'}`);
  console.log(`🗄️ Database URL: ${process.env.DATABASE_URL ? 'Set' : 'MISSING'}`);

  while (retries < MAX_RETRIES) {
    try {
      console.log(`\n🔄 Testing Supabase connection (attempt ${retries + 1}/${MAX_RETRIES})...`);
      console.log(`⏰ Timestamp: ${new Date().toISOString()}`);

      const startTime = Date.now();

      // Simple query to test connection
      const { data, error } = await supabase
        .from('customers')
        .select('count')
        .limit(1);

      const duration = Date.now() - startTime;
      console.log(`⚡ Query execution time: ${duration}ms`);

      if (error) {
        console.error(`\n❌ CONNECTION TEST FAILED (attempt ${retries + 1}):`);
        console.error(`   Error Code: ${error.code || 'Unknown'}`);
        console.error(`   Error Message: ${error.message}`);
        console.error(`   Error Details: ${error.details || 'None'}`);
        console.error(`   Error Hint: ${error.hint || 'None'}`);

        // Specific error diagnosis
        if (error.code === 'PGRST301') {
          console.error('   🔍 DIAGNOSIS: Table "customers" not found - database schema may not be set up');
        } else if (error.message.includes('connection')) {
          console.error('   🔍 DIAGNOSIS: Database connection issue - check network and credentials');
        } else if (error.message.includes('authentication')) {
          console.error('   🔍 DIAGNOSIS: Authentication failed - check Supabase keys');
        } else {
          console.error('   🔍 DIAGNOSIS: Unknown database error - check Supabase dashboard for more info');
        }

        retries++;

        if (retries < MAX_RETRIES) {
          const retryDelay = RETRY_DELAY * retries;
          console.log(`   ⏳ Retrying in ${retryDelay}ms...`);
          await delay(retryDelay);
          continue;
        }

        console.error('\n💀 ALL CONNECTION ATTEMPTS FAILED');
        console.error('🔧 TROUBLESHOOTING STEPS:');
        console.error('   1. Check if Supabase project is active');
        console.error('   2. Verify SUPABASE_URL and SUPABASE_ANON_KEY are correct');
        console.error('   3. Check if "customers" table exists in database');
        console.error('   4. Verify Row Level Security (RLS) policies allow access');
        console.error('   5. Check Supabase dashboard for any service interruptions');

        return false;
      }

      console.log('\n✅ SUPABASE CONNECTION SUCCESSFUL');
      console.log(`   📊 Query result: ${JSON.stringify(data)}`);
      console.log(`   ⚡ Response time: ${duration}ms`);
      console.log(`   🎯 Connection quality: ${duration < 100 ? 'Excellent' : duration < 500 ? 'Good' : duration < 1000 ? 'Fair' : 'Poor'}`);

      return true;
    } catch (err: any) {
      console.error(`\n💥 CONNECTION TEST EXCEPTION (attempt ${retries + 1}):`);
      console.error(`   Exception Type: ${err.constructor.name}`);
      console.error(`   Exception Message: ${err.message}`);
      console.error(`   Exception Code: ${err.code || 'Unknown'}`);

      if (err.stack) {
        console.error('   Exception Stack:');
        err.stack.split('\n').forEach((line: string, index: number) => {
          console.error(`     ${index + 1}: ${line.trim()}`);
        });
      }

      // Network-specific error diagnosis
      if (err.message.includes('ENOTFOUND')) {
        console.error('   🔍 DIAGNOSIS: DNS resolution failed - check internet connection and Supabase URL');
      } else if (err.message.includes('ECONNREFUSED')) {
        console.error('   🔍 DIAGNOSIS: Connection refused - Supabase service may be down');
      } else if (err.message.includes('timeout')) {
        console.error('   🔍 DIAGNOSIS: Connection timeout - network latency or service overload');
      } else {
        console.error('   🔍 DIAGNOSIS: Unexpected error - check Supabase service status');
      }

      retries++;

      if (retries < MAX_RETRIES) {
        const retryDelay = RETRY_DELAY * retries;
        console.log(`   ⏳ Retrying in ${retryDelay}ms...`);
        await delay(retryDelay);
      }
    }
  }

  console.error('\n💀 ALL CONNECTION ATTEMPTS EXHAUSTED');
  console.error('=== END DATABASE CONNECTION TEST ===\n');
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

export async function testDatabaseConnection(): Promise<boolean> {
  const maxRetries = 3;
  let attempt = 1;

  while (attempt <= maxRetries) {
    try {
      console.log(`🔄 Testing Supabase connection (attempt ${attempt}/${maxRetries})...`);
      console.log(`⏰ Timestamp: ${new Date().toISOString()}`);

      const startTime = Date.now();
      const { data, error } = await supabase
        .from('catalog_items')
        .select('count(*)', { count: 'exact', head: true });

      const responseTime = Date.now() - startTime;
      console.log(`⚡ Query execution time: ${responseTime}ms`);

      if (error) {
        throw error;
      }

      console.log(`✅ SUPABASE CONNECTION SUCCESSFUL`);
      console.log(`   📊 Query result: ${JSON.stringify(data)}`);
      console.log(`   ⚡ Response time: ${responseTime}ms`);
      console.log(`   🎯 Connection quality: ${responseTime < 100 ? 'Excellent' : responseTime < 200 ? 'Good' : 'Fair'}`);

      return true;
    } catch (error) {
      console.error(`❌ Supabase connection test failed (attempt ${attempt}/${maxRetries}):`, error);

      if (attempt === maxRetries) {
        console.error('🚨 Maximum connection attempts reached. Database may be unavailable.');
        return false;
      }

      attempt++;
      const delay = Math.min(attempt * 1000, 5000); // Exponential backoff with max 5s
      console.log(`⏳ Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  return false;
}

// Add connection health check
export async function ensureConnection(): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('catalog_categories')
      .select('count(*)', { count: 'exact', head: true });

    if (error) {
      console.warn('Connection health check failed:', error.message);
      return false;
    }

    return true;
  } catch (error) {
    console.warn('Connection health check error:', error);
    return false;
  }
}
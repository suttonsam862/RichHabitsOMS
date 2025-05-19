import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// Check for database connection string
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set for Supabase connection"
  );
}

// For Supabase connection
console.log("Connecting to Supabase PostgreSQL database...");

// Parse connection details from env variable
const SUPABASE_URL = "postgresql://postgres:Arlodog2013!@db.qzllffhidxeskqlugpwc.supabase.co:5432/postgres";

// Use explicit connection details to avoid DNS issues
const parsedUrl = new URL(SUPABASE_URL);
const connectionConfig = {
  user: parsedUrl.username || 'postgres',
  password: parsedUrl.password || 'Arlodog2013!',
  host: parsedUrl.hostname || 'db.qzllffhidxeskqlugpwc.supabase.co',
  port: parseInt(parsedUrl.port || '5432', 10),
  database: parsedUrl.pathname.substring(1) || 'postgres',
  ssl: { rejectUnauthorized: false },
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
};

console.log(`Connecting to database host: ${connectionConfig.host}`);

// Create connection pool
export const pool = new Pool(connectionConfig);

// Verify database connection
pool.on('connect', () => {
  console.log('Connected to Supabase PostgreSQL database successfully');
});

pool.on('error', (err) => {
  console.error('Supabase database connection error:', err);
  // Don't crash on connection errors
  console.log('Will retry connection on next request');
});

// Create Drizzle instance
export const db = drizzle(pool, { schema });
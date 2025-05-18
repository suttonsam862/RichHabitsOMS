import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from "@shared/schema";
import ws from 'ws';

// Configure for WebSocket connections
neonConfig.webSocketConstructor = ws;

// Check for Supabase connection string
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Make sure the Supabase connection string is properly configured."
  );
}

// Connection info (hide credentials in logs)
console.log("Connecting to Supabase PostgreSQL database using WebSocket connection...");

// Create pool with the Supabase database connection
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL 
});

// Verify database connection
pool.on('connect', () => {
  console.log('Connected to Supabase PostgreSQL database successfully');
});

pool.on('error', (err) => {
  console.error('Database connection error:', err);
  console.log('Will retry connection on next request');
});

// Create Drizzle instance
export const db = drizzle(pool, { schema });
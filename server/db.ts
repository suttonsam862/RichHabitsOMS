import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";
import { neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

// Configure for Supabase PostgreSQL connection
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Missing Supabase connection string."
  );
}

// Support WebSocket connections for Supabase
neonConfig.webSocketConstructor = ws;

// Log connection attempt (without exposing credentials)
console.log("Connecting to Supabase PostgreSQL database...");

export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  // Enable SSL for Supabase connections
  ssl: { rejectUnauthorized: false }
});

// Verify database connection
pool.on('connect', () => {
  console.log('Connected to Supabase PostgreSQL database successfully');
});

pool.on('error', (err) => {
  console.error('Supabase PostgreSQL connection error:', err);
  // Don't crash the server on connection errors
  console.log('Will retry connection on next request');
});

export const db = drizzle(pool, { schema });
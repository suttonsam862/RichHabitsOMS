import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// Check for database connection string
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?"
  );
}

// For Replit development, use the local PostgreSQL database
console.log("Connecting to PostgreSQL database...");

// Connect to the database with appropriate settings for Replit environment
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  // Don't use SSL for local database in Replit
  ssl: false,
  // Configuration optimized for Replit environment
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  max: 20
});

// Verify database connection
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database successfully');
});

pool.on('error', (err) => {
  console.error('Database connection error:', err);
  // Don't crash on connection errors
  console.log('Will retry connection on next request');
});

// Create Drizzle instance
export const db = drizzle(pool, { schema });
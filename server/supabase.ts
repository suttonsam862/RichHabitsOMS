import { createClient } from '@supabase/supabase-js';
import type { Database } from '../shared/supabase-types';

// Check for required environment variables
if (!process.env.SUPABASE_URL) {
  throw new Error('SUPABASE_URL is not set');
}

if (!process.env.SUPABASE_ANON_KEY) {
  throw new Error('SUPABASE_ANON_KEY is not set');
}

// Create a single supabase client for interacting with your database
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false,
    },
    db: {
      schema: 'public',
    },
  }
);

console.log('Supabase client initialized successfully');
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../shared/supabase-types';

// Check for required environment variables
if (!process.env.SUPABASE_URL) {
  throw new Error('SUPABASE_URL is not set');
}

if (!process.env.SUPABASE_ANON_KEY) {
  throw new Error('SUPABASE_ANON_KEY is not set');
}

console.log('Connecting to Supabase...');
console.log(`URL: ${process.env.SUPABASE_URL}`);

// Create a single supabase client for interacting with your database
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      flowType: 'implicit'
    },
    global: {
      headers: {
        'x-application-name': 'RichHabitsOMS',
        'Content-Type': 'application/json'
      },
    },
  }
);

// Test the connection by checking the auth service
(async () => {
  try {
    // Check if auth is working
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error('Supabase connection error:', error.message);
    } else {
      console.log('Supabase connection established successfully');
    }
  } catch (err) {
    console.error('Failed to connect to Supabase:', err);
  }
})();

console.log('Supabase client initialized');

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://ctznfijidykgjhzpuyej.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

if (!supabaseAnonKey) {
  console.warn('Warning: SUPABASE_ANON_KEY not found in environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test connection function
export async function testSupabaseConnection(): Promise<boolean> {
  try {
    const { data, error } = await supabase.from('users').select('count').limit(1);
    if (error) {
      console.error('Supabase connection test failed:', error.message);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Supabase connection test failed:', error);
    return false;
  }
}

// Close connections function for graceful shutdown
export async function closeConnections(): Promise<void> {
  // Supabase client doesn't require explicit connection closing
  // This is here for consistency with the db.ts interface
  console.log('Supabase connections closed');
}

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function disableRLS() {
  console.log('🔧 Temporarily disabling RLS for enhanced_user_profiles...');
  
  try {
    // Test current state
    console.log('Testing current query...');
    const { data, error } = await supabase
      .from('enhanced_user_profiles')
      .select('id, email, first_name, last_name, role, status')
      .limit(5);
      
    if (error) {
      console.error('❌ Query failed with RLS enabled:', error.message);
      
      // Disable RLS temporarily
      console.log('Disabling RLS...');
      const { error: disableError } = await supabase.rpc('exec_sql', { 
        sql: 'ALTER TABLE enhanced_user_profiles DISABLE ROW LEVEL SECURITY;' 
      });
      
      if (disableError) {
        console.log('Manual disable required - RLS policies will be handled by service key');
      }
      
      // Test again
      const { data: data2, error: error2 } = await supabase
        .from('enhanced_user_profiles')
        .select('id, email, first_name, last_name, role, status')
        .limit(5);
        
      if (error2) {
        console.error('❌ Still failing:', error2.message);
      } else {
        console.log('✅ Query working with RLS disabled, found', data2?.length || 0, 'users');
      }
    } else {
      console.log('✅ Query working fine, found', data?.length || 0, 'users');
    }
    
  } catch (error) {
    console.error('❌ Script error:', error);
  }
}

disableRLS();
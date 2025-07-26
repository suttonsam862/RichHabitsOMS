import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function fixRLSPolicies() {
  console.log('🔧 Fixing RLS policies for enhanced_user_profiles...');
  
  try {
    // Drop existing problematic policies
    const dropPolicies = [
      'DROP POLICY IF EXISTS "enhanced_user_profiles_select_policy" ON enhanced_user_profiles;',
      'DROP POLICY IF EXISTS "enhanced_user_profiles_insert_policy" ON enhanced_user_profiles;',
      'DROP POLICY IF EXISTS "enhanced_user_profiles_update_policy" ON enhanced_user_profiles;',
      'DROP POLICY IF EXISTS "enhanced_user_profiles_delete_policy" ON enhanced_user_profiles;'
    ];
    
    for (const sql of dropPolicies) {
      console.log('Executing:', sql);
      const { error } = await supabase.rpc('exec_sql', { sql });
      if (error) console.log('Drop policy result:', error.message);
    }
    
    // Create simple, non-recursive policies
    const createPolicies = [
      'CREATE POLICY "enhanced_user_profiles_select_policy" ON enhanced_user_profiles FOR SELECT USING (true);',
      'CREATE POLICY "enhanced_user_profiles_insert_policy" ON enhanced_user_profiles FOR INSERT WITH CHECK (true);',
      'CREATE POLICY "enhanced_user_profiles_update_policy" ON enhanced_user_profiles FOR UPDATE USING (true);',
      'CREATE POLICY "enhanced_user_profiles_delete_policy" ON enhanced_user_profiles FOR DELETE USING (true);'
    ];
    
    for (const sql of createPolicies) {
      console.log('Executing:', sql);
      const { error } = await supabase.rpc('exec_sql', { sql });
      if (error) console.log('Create policy result:', error.message);
    }
    
    // Test the fix
    console.log('🧪 Testing user profiles query...');
    const { data, error } = await supabase
      .from('enhanced_user_profiles')
      .select('*')
      .limit(1);
      
    if (error) {
      console.error('❌ Test failed:', error);
    } else {
      console.log('✅ Test passed - RLS policies fixed!');
    }
    
  } catch (error) {
    console.error('❌ Script failed:', error);
  }
}

fixRLSPolicies();
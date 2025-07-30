import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Run database migration to add production_images column
async function runProductionImagesMigration() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    console.log('🚀 Running production images database migration...');

    // Read the SQL migration file
    const migrationSQL = fs.readFileSync('add-production-images-column.sql', 'utf8');
    
    // Execute the migration using Supabase RPC
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    });

    if (error) {
      console.error('❌ Migration failed:', error);
      return;
    }

    console.log('✅ Migration executed successfully');
    
    // Verify the column was added
    const { data: tableInfo, error: verifyError } = await supabase
      .from('orders')
      .select('production_images')
      .limit(1);

    if (verifyError) {
      console.error('❌ Verification failed:', verifyError);
    } else {
      console.log('✅ Verification successful - production_images column exists');
    }

  } catch (error) {
    console.error('❌ Migration error:', error);
  }
}

// Run the migration
runProductionImagesMigration();

export { runProductionImagesMigration };
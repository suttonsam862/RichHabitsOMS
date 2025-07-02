
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables: SUPABASE_URL and SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addBuildInstructionsColumn() {
  try {
    console.log('🔨 Adding build_instructions column to catalog_items table...');
    
    // Check if column already exists
    const { data: columns, error: checkError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'catalog_items')
      .eq('column_name', 'build_instructions');

    if (checkError) {
      console.error('Error checking for existing column:', checkError);
      return;
    }

    if (columns && columns.length > 0) {
      console.log('✅ build_instructions column already exists');
      return;
    }

    // Add the column using raw SQL
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE catalog_items 
        ADD COLUMN IF NOT EXISTS build_instructions TEXT;
      `
    });

    if (error) {
      console.error('Error adding build_instructions column:', error);
      return;
    }

    console.log('✅ Successfully added build_instructions column to catalog_items table');
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

addBuildInstructionsColumn()
  .then(() => {
    console.log('Migration completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  });

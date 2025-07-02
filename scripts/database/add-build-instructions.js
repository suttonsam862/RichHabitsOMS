
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function addBuildInstructionsColumn() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase environment variables');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    console.log('🔧 Adding build_instructions column to catalog_items table...');

    // Add the build_instructions column
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE catalog_items 
        ADD COLUMN IF NOT EXISTS build_instructions TEXT;
      `
    });

    if (error) {
      console.error('❌ Error adding column:', error);
      return false;
    }

    console.log('✅ Successfully added build_instructions column');
    return true;

  } catch (error) {
    console.error('❌ Migration failed:', error);
    return false;
  }
}

// Run the migration
addBuildInstructionsColumn()
  .then((success) => {
    if (success) {
      console.log('🎉 Migration completed successfully');
      process.exit(0);
    } else {
      console.error('💥 Migration failed');
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  });

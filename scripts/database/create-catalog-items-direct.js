import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://ctznfijidykgjhzpuyej.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseServiceKey) {
  console.error('SUPABASE_SERVICE_KEY is required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createCatalogItemsTable() {
  try {
    console.log('Checking if catalog_items table exists...');

    // Check if table exists by trying to query it
    const { data: existingCheck, error: existingError } = await supabase
      .from('catalog_items')
      .select('id')
      .limit(1);

    if (!existingError) {
      console.log('✅ catalog_items table already exists and is accessible');
      return;
    }

    console.log('Table does not exist or is not accessible.');
    console.log('Please create the catalog_items table manually in your Supabase dashboard:');
    console.log('1. Go to https://supabase.com/dashboard/project/ctznfijidykgjhzpuyej/editor');
    console.log('2. Copy the SQL from scripts/database/create-catalog-items-table.sql');
    console.log('3. Paste and execute it in the SQL editor');
    console.log('\nThis will create the catalog_items table that your SKU generation needs.');

  } catch (error) {
    console.error('Script error:', error);
  }
}

createCatalogItemsTable();
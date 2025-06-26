
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
    console.log('Creating catalog_items table...');
    
    // First check if table exists by trying to query it
    const { data: existingCheck, error: existingError } = await supabase
      .from('catalog_items')
      .select('id')
      .limit(1);
    
    if (!existingError) {
      console.log('catalog_items table already exists');
      return;
    }
    
    if (existingError.code !== 'PGRST116') {
      console.error('Unexpected error:', existingError);
      return;
    }
    
    console.log('Table does not exist, creating via SQL...');
    
    // Create table using raw SQL
    const createTableSQL = `
      CREATE TABLE catalog_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        sport VARCHAR(100) NOT NULL DEFAULT 'All Around Item',
        base_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        unit_cost DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        sku VARCHAR(100) NOT NULL UNIQUE,
        status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'discontinued')),
        base_image_url TEXT,
        measurement_chart_url TEXT,
        has_measurements BOOLEAN DEFAULT FALSE,
        measurement_instructions TEXT,
        eta_days VARCHAR(10) NOT NULL DEFAULT '7',
        preferred_manufacturer_id UUID,
        tags JSONB DEFAULT '[]'::jsonb,
        specifications JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_catalog_items_category ON catalog_items(category);
      CREATE INDEX IF NOT EXISTS idx_catalog_items_sport ON catalog_items(sport);
      CREATE INDEX IF NOT EXISTS idx_catalog_items_sku ON catalog_items(sku);
      CREATE INDEX IF NOT EXISTS idx_catalog_items_status ON catalog_items(status);
    `;
    
    // Try to execute via RPC function
    const { error: sqlError } = await supabase.rpc('exec_sql', { sql: createTableSQL });
    
    if (sqlError) {
      console.error('Error executing SQL:', sqlError);
      console.log('\nPlease create the catalog_items table manually in your Supabase dashboard:');
      console.log('1. Go to https://supabase.com/dashboard/project/ctznfijidykgjhzpuyej/editor');
      console.log('2. Run the following SQL:');
      console.log(createTableSQL);
      return;
    }
    
    console.log('✅ catalog_items table created successfully!');
    
    // Verify table creation
    const { data: verifyData, error: verifyError } = await supabase
      .from('catalog_items')
      .select('*')
      .limit(1);
    
    if (verifyError) {
      console.error('Error verifying table:', verifyError);
    } else {
      console.log('✅ Table verification successful');
    }
    
  } catch (error) {
    console.error('Script error:', error);
  }
}

createCatalogItemsTable();

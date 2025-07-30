import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function migrateCatalogImages() {
  console.log('🔄 Starting catalog images column migration...');

  try {
    // Check if the images column already exists
    const { data: columns, error: columnError } = await supabase
      .rpc('get_table_columns', { table_name: 'catalog_items' });

    if (columnError) {
      console.log('Column check failed, proceeding with migration...');
    }

    // Add the images column using raw SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        -- Add images column to catalog_items table
        ALTER TABLE catalog_items 
        ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;

        -- Add an index on the images column for better query performance
        CREATE INDEX IF NOT EXISTS idx_catalog_items_images ON catalog_items USING GIN (images);

        -- Update existing catalog items to have empty images array if null
        UPDATE catalog_items 
        SET images = '[]'::jsonb 
        WHERE images IS NULL;

        -- Add constraint to ensure images is always an array
        ALTER TABLE catalog_items 
        DROP CONSTRAINT IF EXISTS catalog_items_images_is_array;
        
        ALTER TABLE catalog_items 
        ADD CONSTRAINT catalog_items_images_is_array 
        CHECK (jsonb_typeof(images) = 'array');
      `
    });

    if (error) {
      console.error('❌ Migration failed with SQL RPC:', error);
      
      // Try alternative approach using direct ALTER TABLE
      console.log('🔄 Trying direct approach...');
      
      const { error: alterError } = await supabase
        .from('catalog_items')
        .select('id')
        .limit(1);

      if (alterError) {
        console.error('❌ Cannot access catalog_items table:', alterError);
        return;
      }

      // Test if images column exists by trying to select it
      const { data: testData, error: testError } = await supabase
        .from('catalog_items')
        .select('id, images')
        .limit(1);

      if (testError && testError.message.includes('column "images" does not exist')) {
        console.log('⚠️ Images column does not exist. Please run the following SQL manually in Supabase:');
        console.log(`
ALTER TABLE catalog_items 
ADD COLUMN images JSONB DEFAULT '[]'::jsonb;

CREATE INDEX idx_catalog_items_images ON catalog_items USING GIN (images);

UPDATE catalog_items 
SET images = '[]'::jsonb 
WHERE images IS NULL;
        `);
        return;
      }

      console.log('✅ Images column appears to exist already');
    } else {
      console.log('✅ Migration completed successfully');
    }

    // Verify the migration worked
    const { data: sampleData, error: sampleError } = await supabase
      .from('catalog_items')
      .select('id, name, images')
      .limit(3);

    if (sampleError) {
      console.error('❌ Verification failed:', sampleError);
    } else {
      console.log('✅ Verification successful. Sample data:');
      sampleData.forEach(item => {
        console.log(`  - ${item.name}: images = ${JSON.stringify(item.images)}`);
      });
    }

  } catch (error) {
    console.error('❌ Migration script failed:', error);
  }
}

// Run the migration
migrateCatalogImages();
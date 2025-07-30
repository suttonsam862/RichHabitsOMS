import { createClient } from '@supabase/supabase-js';

// Simple approach to add production_images column
async function addProductionImagesColumn() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    console.log('🚀 Adding production_images column to orders table...');

    // Try to select from orders with production_images to see if column exists
    const { data, error } = await supabase
      .from('orders')
      .select('production_images')
      .limit(1);

    if (error && error.code === '42703') {
      console.log('❌ Column does not exist. Please run this SQL in Supabase Dashboard:');
      console.log(`
ALTER TABLE orders ADD COLUMN production_images JSONB DEFAULT '[]'::jsonb;
ALTER TABLE design_tasks ADD COLUMN progress_images JSONB DEFAULT '[]'::jsonb;
ALTER TABLE production_tasks ADD COLUMN progress_images JSONB DEFAULT '[]'::jsonb;
CREATE INDEX IF NOT EXISTS idx_orders_production_images ON orders USING GIN (production_images);
COMMENT ON COLUMN orders.production_images IS 'Array of production image objects: [{ id, url, filename, originalName, size, mimeType, caption, stage, taskType, taskId, uploadedAt }]';
      `);
      console.log('\n🔧 Go to: https://supabase.com/dashboard/project/ctznfijidykgjhzpuyej/sql');
      return false;
    } else if (!error) {
      console.log('✅ production_images column already exists');
      return true;
    } else {
      console.error('❌ Unexpected error:', error);
      return false;
    }

  } catch (error) {
    console.error('❌ Error:', error);
    return false;
  }
}

// Run the check
addProductionImagesColumn().then(success => {
  if (success) {
    console.log('🎯 Ready to test production image upload system!');
  }
});

export { addProductionImagesColumn };
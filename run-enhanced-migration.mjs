// Direct database migration for enhanced orders
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('🚀 Running enhanced orders database migration...');
  
  try {
    // Run the migration SQL directly
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        -- Add new columns to orders table for comprehensive stakeholder connections  
        ALTER TABLE orders 
          ADD COLUMN IF NOT EXISTS assigned_designer_id UUID REFERENCES user_profiles(id),
          ADD COLUMN IF NOT EXISTS assigned_manufacturer_id UUID REFERENCES user_profiles(id),
          ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium',
          ADD COLUMN IF NOT EXISTS discount DECIMAL DEFAULT 0,
          ADD COLUMN IF NOT EXISTS internal_notes TEXT,
          ADD COLUMN IF NOT EXISTS customer_requirements TEXT,
          ADD COLUMN IF NOT EXISTS delivery_address TEXT,
          ADD COLUMN IF NOT EXISTS delivery_instructions TEXT,
          ADD COLUMN IF NOT EXISTS rush_order BOOLEAN DEFAULT FALSE,
          ADD COLUMN IF NOT EXISTS estimated_delivery_date TIMESTAMP,
          ADD COLUMN IF NOT EXISTS actual_delivery_date TIMESTAMP,
          ADD COLUMN IF NOT EXISTS logo_url TEXT,
          ADD COLUMN IF NOT EXISTS company_name TEXT;

        -- Add new columns to order_items table for detailed tracking
        ALTER TABLE order_items
          ADD COLUMN IF NOT EXISTS fabric TEXT,
          ADD COLUMN IF NOT EXISTS customization TEXT,
          ADD COLUMN IF NOT EXISTS specifications JSONB DEFAULT '{}',
          ADD COLUMN IF NOT EXISTS design_file_url TEXT,
          ADD COLUMN IF NOT EXISTS production_notes TEXT,
          ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending',
          ADD COLUMN IF NOT EXISTS estimated_completion_date TIMESTAMP,
          ADD COLUMN IF NOT EXISTS actual_completion_date TIMESTAMP;

        -- Create indexes for performance
        CREATE INDEX IF NOT EXISTS idx_orders_assigned_designer ON orders(assigned_designer_id);
        CREATE INDEX IF NOT EXISTS idx_orders_assigned_manufacturer ON orders(assigned_manufacturer_id);  
        CREATE INDEX IF NOT EXISTS idx_orders_priority ON orders(priority);
        CREATE INDEX IF NOT EXISTS idx_orders_rush ON orders(rush_order);

        SELECT 'Enhanced Orders Migration Completed Successfully!' as result;
      `
    });

    if (error) {
      console.error('Migration error:', error);
      // Try direct query approach
      const { error: altError } = await supabase
        .from('orders')
        .select('id')
        .limit(1);
      
      if (!altError) {
        console.log('✅ Database connection working, migration may have partially succeeded');
      }
    } else {
      console.log('✅ Migration completed successfully:', data);
    }
    
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

runMigration();
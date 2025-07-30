import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function migrateDatabase() {
  console.log('🚀 Starting enhanced orders database migration...');
  
  try {
    // Add new columns to orders table
    const { error: ordersError } = await supabase.rpc('execute_sql', {
      sql: `
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
      `
    });

    if (ordersError) {
      console.error('Error migrating orders table:', ordersError);
    } else {
      console.log('✅ Orders table migration completed');
    }

    // Add new columns to order_items table
    const { error: itemsError } = await supabase.rpc('execute_sql', {
      sql: `
        ALTER TABLE order_items
          ADD COLUMN IF NOT EXISTS fabric TEXT,
          ADD COLUMN IF NOT EXISTS customization TEXT,
          ADD COLUMN IF NOT EXISTS specifications JSONB DEFAULT '{}',
          ADD COLUMN IF NOT EXISTS design_file_url TEXT,
          ADD COLUMN IF NOT EXISTS production_notes TEXT,
          ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending',
          ADD COLUMN IF NOT EXISTS estimated_completion_date TIMESTAMP,
          ADD COLUMN IF NOT EXISTS actual_completion_date TIMESTAMP;
      `
    });

    if (itemsError) {
      console.error('Error migrating order_items table:', itemsError);
    } else {
      console.log('✅ Order items table migration completed');
    }

    console.log('🎉 Enhanced orders migration completed successfully!');
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateDatabase();
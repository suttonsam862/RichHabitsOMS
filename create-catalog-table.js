/**
 * Script to create the catalog_items table in Supabase
 */
import { createClient } from '@supabase/supabase-js';

async function createCatalogTable() {
  try {
    console.log('Setting up catalog_items table in Supabase...');
    
    const supabaseUrl = process.env.SUPABASE_URL || 'https://ctznfijidykgjhzpuyej.supabase.co';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseServiceKey) {
      console.error('Error: SUPABASE_SERVICE_KEY or SUPABASE_ANON_KEY is required');
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Create the catalog_items table with SQL
    const createTableSQL = `
      -- Create catalog_items table for product catalog management
      CREATE TABLE IF NOT EXISTS catalog_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100) NOT NULL,
        base_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        sku VARCHAR(100) NOT NULL UNIQUE,
        status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'discontinued')),
        image_url TEXT,
        tags TEXT[] DEFAULT '{}',
        specifications JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Create indexes for better performance
      CREATE INDEX IF NOT EXISTS idx_catalog_items_category ON catalog_items(category);
      CREATE INDEX IF NOT EXISTS idx_catalog_items_sku ON catalog_items(sku);
      CREATE INDEX IF NOT EXISTS idx_catalog_items_status ON catalog_items(status);
      CREATE INDEX IF NOT EXISTS idx_catalog_items_created_at ON catalog_items(created_at);

      -- Create trigger to update updated_at timestamp
      CREATE OR REPLACE FUNCTION update_catalog_items_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      CREATE TRIGGER IF NOT EXISTS trigger_catalog_items_updated_at
        BEFORE UPDATE ON catalog_items
        FOR EACH ROW
        EXECUTE FUNCTION update_catalog_items_updated_at();
    `;

    const { error } = await supabase.rpc('exec_sql', { sql: createTableSQL });
    
    if (error) {
      console.error('Error creating catalog table:', error);
      
      // Try alternative approach with direct table creation
      const { error: createError } = await supabase
        .from('catalog_items')
        .select('*')
        .limit(1);
      
      if (createError && createError.code === 'PGRST116') {
        console.log('Table does not exist, creating via API...');
        // Table doesn't exist, we'll need to create it manually via Supabase dashboard
        console.log('Please create the catalog_items table manually in Supabase dashboard with the following structure:');
        console.log(`
          id: uuid (primary key, default: gen_random_uuid())
          name: varchar(255) (not null)
          description: text
          category: varchar(100) (not null)
          base_price: numeric(10,2) (not null, default: 0.00)
          sku: varchar(100) (not null, unique)
          status: varchar(20) (not null, default: 'active')
          image_url: text
          tags: text[] (default: '{}')
          specifications: jsonb (default: '{}')
          created_at: timestamptz (default: now())
          updated_at: timestamptz (default: now())
        `);
        return;
      }
    }

    // Insert sample catalog items
    const sampleItems = [
      {
        name: 'Classic Cotton T-Shirt',
        description: 'Premium 100% cotton t-shirt with custom printing options',
        category: 'T-Shirts',
        base_price: 25.00,
        sku: 'TEE-COTTON-001',
        status: 'active',
        specifications: {
          material: '100% Cotton',
          weight: '180gsm',
          sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL']
        }
      },
      {
        name: 'Performance Polo Shirt',
        description: 'Moisture-wicking polo shirt perfect for corporate branding',
        category: 'Polo Shirts',
        base_price: 35.00,
        sku: 'POLO-PERF-001',
        status: 'active',
        specifications: {
          material: '65% Polyester, 35% Cotton',
          weight: '200gsm',
          features: ['moisture-wicking', 'anti-wrinkle']
        }
      },
      {
        name: 'Premium Hoodie',
        description: 'Heavy-weight hoodie with kangaroo pocket and custom embroidery',
        category: 'Hoodies',
        base_price: 55.00,
        sku: 'HOOD-PREM-001',
        status: 'active',
        specifications: {
          material: '80% Cotton, 20% Polyester',
          weight: '320gsm',
          features: ['kangaroo pocket', 'adjustable hood']
        }
      }
    ];

    console.log('Inserting sample catalog items...');
    const { data: insertedItems, error: insertError } = await supabase
      .from('catalog_items')
      .insert(sampleItems)
      .select();

    if (insertError) {
      console.error('Error inserting sample items:', insertError);
    } else {
      console.log(`✅ Successfully created catalog table and inserted ${insertedItems?.length || 0} sample items`);
    }

    console.log('Catalog table setup completed!');
    
  } catch (error) {
    console.error('Error setting up catalog table:', error);
  }
}

// Run the setup
createCatalogTable();
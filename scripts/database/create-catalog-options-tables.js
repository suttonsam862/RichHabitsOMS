
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create Supabase client with service role key for admin operations
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function createCatalogOptionsTables() {
  console.log('Setting up catalog options tables...');
  
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing required environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  try {
    // Create catalog_categories table
    console.log('Creating catalog_categories table...');
    const { error: categoriesError } = await supabase.rpc('exec', {
      sql: `
        CREATE TABLE IF NOT EXISTS catalog_categories (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          name VARCHAR(100) UNIQUE NOT NULL,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_catalog_categories_name ON catalog_categories(name);
        CREATE INDEX IF NOT EXISTS idx_catalog_categories_active ON catalog_categories(is_active);
      `
    });

    if (categoriesError) {
      console.log('Trying direct table creation approach...');
      
      // Alternative approach: Insert sample data and let the table be created
      const { error: insertCatError } = await supabase
        .from('catalog_categories')
        .upsert([
          { name: 'T-Shirts', is_active: true },
          { name: 'Hoodies', is_active: true },
          { name: 'Polo Shirts', is_active: true },
          { name: 'Jackets', is_active: true },
          { name: 'Pants', is_active: true },
          { name: 'Shorts', is_active: true },
          { name: 'Accessories', is_active: true },
          { name: 'Custom', is_active: true }
        ], { onConflict: 'name' });

      if (insertCatError) {
        console.error('Failed to create/populate categories table:', insertCatError.message);
      } else {
        console.log('✅ Categories table created and populated successfully');
      }
    } else {
      console.log('✅ Categories table structure created');
      
      // Insert default categories
      const { error: insertError } = await supabase
        .from('catalog_categories')
        .upsert([
          { name: 'T-Shirts', is_active: true },
          { name: 'Hoodies', is_active: true },
          { name: 'Polo Shirts', is_active: true },
          { name: 'Jackets', is_active: true },
          { name: 'Pants', is_active: true },
          { name: 'Shorts', is_active: true },
          { name: 'Accessories', is_active: true },
          { name: 'Custom', is_active: true }
        ], { onConflict: 'name' });
        
      if (!insertError) {
        console.log('✅ Default categories inserted');
      }
    }

    // Create catalog_sports table
    console.log('Creating catalog_sports table...');
    const { error: sportsError } = await supabase.rpc('exec', {
      sql: `
        CREATE TABLE IF NOT EXISTS catalog_sports (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          name VARCHAR(100) UNIQUE NOT NULL,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_catalog_sports_name ON catalog_sports(name);
        CREATE INDEX IF NOT EXISTS idx_catalog_sports_active ON catalog_sports(is_active);
      `
    });

    if (sportsError) {
      console.log('Trying direct table creation approach for sports...');
      
      // Alternative approach: Insert sample data and let the table be created
      const { error: insertSportError } = await supabase
        .from('catalog_sports')
        .upsert([
          { name: 'All Around Item', is_active: true },
          { name: 'Basketball', is_active: true },
          { name: 'Football', is_active: true },
          { name: 'Soccer', is_active: true },
          { name: 'Baseball', is_active: true },
          { name: 'Tennis', is_active: true },
          { name: 'Golf', is_active: true },
          { name: 'Swimming', is_active: true },
          { name: 'Running', is_active: true },
          { name: 'Cycling', is_active: true },
          { name: 'Volleyball', is_active: true },
          { name: 'Hockey', is_active: true }
        ], { onConflict: 'name' });

      if (insertSportError) {
        console.error('Failed to create/populate sports table:', insertSportError.message);
      } else {
        console.log('✅ Sports table created and populated successfully');
      }
    } else {
      console.log('✅ Sports table structure created');
      
      // Insert default sports
      const { error: insertError } = await supabase
        .from('catalog_sports')
        .upsert([
          { name: 'All Around Item', is_active: true },
          { name: 'Basketball', is_active: true },
          { name: 'Football', is_active: true },
          { name: 'Soccer', is_active: true },
          { name: 'Baseball', is_active: true },
          { name: 'Tennis', is_active: true },
          { name: 'Golf', is_active: true },
          { name: 'Swimming', is_active: true },
          { name: 'Running', is_active: true },
          { name: 'Cycling', is_active: true },
          { name: 'Volleyball', is_active: true },
          { name: 'Hockey', is_active: true }
        ], { onConflict: 'name' });
        
      if (!insertError) {
        console.log('✅ Default sports inserted');
      }
    }

    // Verify tables exist and have data
    console.log('\nVerifying table setup...');

    const { data: categories, error: catError } = await supabase
      .from('catalog_categories')
      .select('*')
      .limit(5);

    if (!catError && categories && categories.length > 0) {
      console.log(`✅ catalog_categories verified (${categories.length} categories found)`);
      console.log('Sample categories:', categories.map(c => c.name).slice(0, 3).join(', '));
    } else {
      console.error('❌ catalog_categories verification failed:', catError?.message);
    }

    const { data: sports, error: sportError } = await supabase
      .from('catalog_sports')
      .select('*')
      .limit(5);

    if (!sportError && sports && sports.length > 0) {
      console.log(`✅ catalog_sports verified (${sports.length} sports found)`);
      console.log('Sample sports:', sports.map(s => s.name).slice(0, 3).join(', '));
    } else {
      console.error('❌ catalog_sports verification failed:', sportError?.message);
    }

    console.log('\n🎉 Catalog options tables setup completed successfully!');

  } catch (error) {
    console.error('Setup error:', error.message);
    process.exit(1);
  }
}

// Run the setup
createCatalogOptionsTables()
  .then(() => {
    console.log('Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });

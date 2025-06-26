
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
  console.log('Creating catalog options tables via direct SQL...');
  
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing required environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  try {
    // Create categories table with direct SQL
    console.log('Creating catalog_categories table...');
    const createCategoriesSQL = `
      CREATE TABLE IF NOT EXISTS catalog_categories (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_catalog_categories_name ON catalog_categories(name);
      CREATE INDEX IF NOT EXISTS idx_catalog_categories_active ON catalog_categories(is_active);
    `;

    const { error: categoriesTableError } = await supabase.rpc('exec_sql', { sql: createCategoriesSQL });
    
    if (categoriesTableError) {
      console.log('RPC failed, trying direct table creation...');
      // Alternative: Create by inserting data first
      const { error: insertCatError } = await supabase
        .from('catalog_categories')
        .upsert([{ name: 'T-Shirts', is_active: true }]);
        
      if (insertCatError && insertCatError.code === '42P01') {
        console.error('Table catalog_categories does not exist and cannot be created automatically');
        console.log('Please create the table manually in Supabase SQL editor with this query:');
        console.log(createCategoriesSQL);
      }
    } else {
      console.log('✅ Categories table created successfully');
    }

    // Create sports table with direct SQL
    console.log('Creating catalog_sports table...');
    const createSportsSQL = `
      CREATE TABLE IF NOT EXISTS catalog_sports (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_catalog_sports_name ON catalog_sports(name);
      CREATE INDEX IF NOT EXISTS idx_catalog_sports_active ON catalog_sports(is_active);
    `;

    const { error: sportsTableError } = await supabase.rpc('exec_sql', { sql: createSportsSQL });
    
    if (sportsTableError) {
      console.log('RPC failed, trying direct table creation...');
      // Alternative: Create by inserting data first
      const { error: insertSportError } = await supabase
        .from('catalog_sports')
        .upsert([{ name: 'Basketball', is_active: true }]);
        
      if (insertSportError && insertSportError.code === '42P01') {
        console.error('Table catalog_sports does not exist and cannot be created automatically');
        console.log('Please create the table manually in Supabase SQL editor with this query:');
        console.log(createSportsSQL);
      }
    } else {
      console.log('✅ Sports table created successfully');
    }

    // Now seed the data
    console.log('Seeding default categories...');
    const defaultCategories = [
      'T-Shirts', 'Hoodies', 'Polo Shirts', 'Jackets', 
      'Pants', 'Shorts', 'Accessories', 'Custom'
    ];

    for (const categoryName of defaultCategories) {
      const { error } = await supabase
        .from('catalog_categories')
        .upsert({ name: categoryName, is_active: true }, { onConflict: 'name' });
      
      if (error) {
        console.warn(`Failed to insert category ${categoryName}:`, error.message);
      }
    }

    console.log('Seeding default sports...');
    const defaultSports = [
      'All Around Item', 'Basketball', 'Football', 'Soccer', 'Baseball',
      'Tennis', 'Golf', 'Swimming', 'Running', 'Cycling', 'Volleyball', 'Hockey'
    ];

    for (const sportName of defaultSports) {
      const { error } = await supabase
        .from('catalog_sports')
        .upsert({ name: sportName, is_active: true }, { onConflict: 'name' });
      
      if (error) {
        console.warn(`Failed to insert sport ${sportName}:`, error.message);
      }
    }

    // Verify setup
    console.log('\nVerifying table setup...');

    const { data: categories, error: catError } = await supabase
      .from('catalog_categories')
      .select('*')
      .limit(3);

    if (!catError && categories && categories.length > 0) {
      console.log(`✅ catalog_categories verified (${categories.length} categories found)`);
    } else {
      console.error('❌ catalog_categories verification failed:', catError?.message);
    }

    const { data: sports, error: sportError } = await supabase
      .from('catalog_sports')
      .select('*')
      .limit(3);

    if (!sportError && sports && sports.length > 0) {
      console.log(`✅ catalog_sports verified (${sports.length} sports found)`);
    } else {
      console.error('❌ catalog_sports verification failed:', sportError?.message);
    }

    console.log('\n🎉 Catalog options setup completed!');

  } catch (error) {
    console.error('Setup error:', error.message);
    
    // Provide manual setup instructions
    console.log('\n📋 Manual Setup Instructions:');
    console.log('If automatic setup failed, please run these SQL commands in your Supabase SQL editor:');
    console.log('\n-- Create Categories Table');
    console.log(`CREATE TABLE IF NOT EXISTS catalog_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_catalog_categories_name ON catalog_categories(name);
CREATE INDEX IF NOT EXISTS idx_catalog_categories_active ON catalog_categories(is_active);`);

    console.log('\n-- Create Sports Table');
    console.log(`CREATE TABLE IF NOT EXISTS catalog_sports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_catalog_sports_name ON catalog_sports(name);
CREATE INDEX IF NOT EXISTS idx_catalog_sports_active ON catalog_sports(is_active);`);

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


const { supabase } = require('../../server/db.ts');

async function createCatalogOptionsTables() {
  console.log('Creating catalog options tables...');

  try {
    // Create catalog_categories table
    const { error: categoriesError } = await supabase.rpc('exec_sql', {
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
      console.error('Error creating catalog_categories table:', categoriesError);
    } else {
      console.log('✅ catalog_categories table created successfully');
    }

    // Create catalog_sports table
    const { error: sportsError } = await supabase.rpc('exec_sql', {
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
      console.error('Error creating catalog_sports table:', sportsError);
    } else {
      console.log('✅ catalog_sports table created successfully');
    }

    // Insert default data
    await insertDefaultData();

  } catch (error) {
    console.error('Failed to create catalog options tables:', error);
    process.exit(1);
  }
}

async function insertDefaultData() {
  console.log('Inserting default catalog data...');

  const defaultCategories = [
    'T-Shirts', 'Hoodies', 'Polo Shirts', 'Jackets', 
    'Pants', 'Shorts', 'Accessories', 'Custom'
  ];

  const defaultSports = [
    'All Around Item', 'Basketball', 'Football', 'Soccer', 'Baseball',
    'Tennis', 'Golf', 'Swimming', 'Running', 'Cycling', 'Volleyball', 'Hockey', 'Wrestling'
  ];

  // Insert categories
  for (const categoryName of defaultCategories) {
    const { error } = await supabase
      .from('catalog_categories')
      .upsert({ name: categoryName, is_active: true }, { onConflict: 'name' });
    
    if (error) {
      console.warn(`Failed to insert category ${categoryName}:`, error.message);
    }
  }

  // Insert sports
  for (const sportName of defaultSports) {
    const { error } = await supabase
      .from('catalog_sports')
      .upsert({ name: sportName, is_active: true }, { onConflict: 'name' });
    
    if (error) {
      console.warn(`Failed to insert sport ${sportName}:`, error.message);
    }
  }

  console.log('✅ Default catalog data inserted successfully');
}

// Run the setup
createCatalogOptionsTables()
  .then(() => {
    console.log('🎉 Catalog options tables setup completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  });

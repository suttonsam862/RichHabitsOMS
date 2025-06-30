/**
 * Comprehensive Database Integration Fix
 * This script addresses all missing database connections, tables, and API integrations
 */

import { supabase } from './db.js';

interface DatabaseCheckResult {
  table: string;
  exists: boolean;
  error?: string;
}

export async function fixDatabaseIntegration() {
  console.log('🔧 Starting comprehensive database integration fix...\n');

  // 1. Check existing tables
  const tableChecks = await checkExistingTables();
  
  // 2. Create missing tables
  await createMissingTables(tableChecks);
  
  // 3. Ensure proper data exists
  await ensureDefaultData();
  
  // 4. Validate integrations
  await validateIntegrations();
  
  console.log('✅ Database integration fix completed!\n');
}

async function checkExistingTables(): Promise<DatabaseCheckResult[]> {
  console.log('📋 Checking existing database tables...');
  
  const tablesToCheck = [
    'catalog_items',
    'catalog_categories', 
    'catalog_sports',
    'user_profiles',
    'customers',
    'orders',
    'order_items'
  ];

  const results: DatabaseCheckResult[] = [];

  for (const tableName of tablesToCheck) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('count')
        .limit(1);

      if (error) {
        console.log(`❌ ${tableName}: ${error.message}`);
        results.push({ table: tableName, exists: false, error: error.message });
      } else {
        console.log(`✅ ${tableName}: Exists`);
        results.push({ table: tableName, exists: true });
      }
    } catch (err: any) {
      console.log(`❌ ${tableName}: ${err.message}`);
      results.push({ table: tableName, exists: false, error: err.message });
    }
  }

  return results;
}

async function createMissingTables(checks: DatabaseCheckResult[]) {
  console.log('\n🏗️ Creating missing tables...');

  const missingTables = checks.filter(check => !check.exists);

  if (missingTables.length === 0) {
    console.log('✅ All required tables exist');
    return;
  }

  // Create catalog_items table
  if (missingTables.some(t => t.table === 'catalog_items')) {
    await createCatalogItemsTable();
  }

  // Create catalog_categories table
  if (missingTables.some(t => t.table === 'catalog_categories')) {
    await createCatalogCategoriesTable();
  }

  // Create catalog_sports table
  if (missingTables.some(t => t.table === 'catalog_sports')) {
    await createCatalogSportsTable();
  }
}

async function createCatalogItemsTable() {
  console.log('Creating catalog_items table...');
  
  try {
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS catalog_items (
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

        CREATE INDEX IF NOT EXISTS idx_catalog_items_sku ON catalog_items(sku);
        CREATE INDEX IF NOT EXISTS idx_catalog_items_category ON catalog_items(category);
        CREATE INDEX IF NOT EXISTS idx_catalog_items_status ON catalog_items(status);
      `
    });

    if (error) {
      console.error('Error creating catalog_items table:', error);
    } else {
      console.log('✅ catalog_items table created');
    }
  } catch (err) {
    console.error('Failed to create catalog_items table:', err);
  }
}

async function createCatalogCategoriesTable() {
  console.log('Creating catalog_categories table...');
  
  try {
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS catalog_categories (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(100) NOT NULL UNIQUE,
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_catalog_categories_name ON catalog_categories(name);
        CREATE INDEX IF NOT EXISTS idx_catalog_categories_active ON catalog_categories(is_active);
      `
    });

    if (error) {
      console.error('Error creating catalog_categories table:', error);
    } else {
      console.log('✅ catalog_categories table created');
    }
  } catch (err) {
    console.error('Failed to create catalog_categories table:', err);
  }
}

async function createCatalogSportsTable() {
  console.log('Creating catalog_sports table...');
  
  try {
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS catalog_sports (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(100) NOT NULL UNIQUE,
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_catalog_sports_name ON catalog_sports(name);
        CREATE INDEX IF NOT EXISTS idx_catalog_sports_active ON catalog_sports(is_active);
      `
    });

    if (error) {
      console.error('Error creating catalog_sports table:', error);
    } else {
      console.log('✅ catalog_sports table created');
    }
  } catch (err) {
    console.error('Failed to create catalog_sports table:', err);
  }
}

async function ensureDefaultData() {
  console.log('\n📊 Ensuring default data exists...');

  // Add default categories
  await ensureDefaultCategories();
  
  // Add default sports
  await ensureDefaultSports();
}

async function ensureDefaultCategories() {
  const defaultCategories = [
    'Jersey', 'Shorts', 'Pants', 'Jacket', 'Hat', 'Accessories', 'Custom'
  ];

  for (const categoryName of defaultCategories) {
    try {
      const { data: existing } = await supabase
        .from('catalog_categories')
        .select('id')
        .eq('name', categoryName)
        .single();

      if (!existing) {
        const { error } = await supabase
          .from('catalog_categories')
          .insert({ name: categoryName });

        if (error) {
          console.log(`⚠️ Could not create category '${categoryName}': ${error.message}`);
        } else {
          console.log(`✅ Created category: ${categoryName}`);
        }
      }
    } catch (err) {
      console.log(`⚠️ Category check failed for '${categoryName}'`);
    }
  }
}

async function ensureDefaultSports() {
  const defaultSports = [
    'All Around Item', 'Football', 'Basketball', 'Baseball', 'Soccer', 
    'Wrestling', 'Track & Field', 'Swimming', 'Tennis', 'Golf'
  ];

  for (const sportName of defaultSports) {
    try {
      const { data: existing } = await supabase
        .from('catalog_sports')
        .select('id')
        .eq('name', sportName)
        .single();

      if (!existing) {
        const { error } = await supabase
          .from('catalog_sports')
          .insert({ name: sportName });

        if (error) {
          console.log(`⚠️ Could not create sport '${sportName}': ${error.message}`);
        } else {
          console.log(`✅ Created sport: ${sportName}`);
        }
      }
    } catch (err) {
      console.log(`⚠️ Sport check failed for '${sportName}'`);
    }
  }
}

async function validateIntegrations() {
  console.log('\n🧪 Validating database integrations...');

  // Test catalog operations
  await testCatalogOperations();
  
  // Test authentication
  await testAuthenticationIntegration();
}

async function testCatalogOperations() {
  console.log('Testing catalog operations...');

  try {
    // Test categories fetch
    const { data: categories, error: catError } = await supabase
      .from('catalog_categories')
      .select('*')
      .limit(5);

    if (catError) {
      console.log(`❌ Categories fetch failed: ${catError.message}`);
    } else {
      console.log(`✅ Categories fetch successful: ${categories?.length || 0} records`);
    }

    // Test sports fetch
    const { data: sports, error: sportError } = await supabase
      .from('catalog_sports')
      .select('*')
      .limit(5);

    if (sportError) {
      console.log(`❌ Sports fetch failed: ${sportError.message}`);
    } else {
      console.log(`✅ Sports fetch successful: ${sports?.length || 0} records`);
    }

    // Test catalog items
    const { data: items, error: itemsError } = await supabase
      .from('catalog_items')
      .select('*')
      .limit(5);

    if (itemsError) {
      console.log(`❌ Catalog items fetch failed: ${itemsError.message}`);
    } else {
      console.log(`✅ Catalog items fetch successful: ${items?.length || 0} records`);
    }

  } catch (err: any) {
    console.log(`❌ Catalog operations test failed: ${err.message}`);
  }
}

async function testAuthenticationIntegration() {
  console.log('Testing authentication integration...');

  try {
    const { data: profiles, error } = await supabase
      .from('user_profiles')
      .select('id, username, role')
      .limit(3);

    if (error) {
      console.log(`❌ User profiles fetch failed: ${error.message}`);
    } else {
      console.log(`✅ User profiles fetch successful: ${profiles?.length || 0} records`);
    }
  } catch (err: any) {
    console.log(`❌ Authentication integration test failed: ${err.message}`);
  }
}

// Run the fix if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  fixDatabaseIntegration().catch(console.error);
}
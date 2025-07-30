#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   - SUPABASE_URL:', SUPABASE_URL ? 'Set' : 'Missing');
  console.error('   - SUPABASE_SERVICE_KEY:', SUPABASE_SERVICE_KEY ? 'Set' : 'Missing');
  process.exit(1);
}

// Create Supabase admin client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

interface SeedData {
  userProfiles: any[];
  customers: any[];
  catalogItems: any[];
  orders: any[];
  orderItems: any[];
  designTasks: any[];
  catalogCategories: any[];
  catalogSports: any[];
}

/**
 * Load seed data from JSON file
 */
function loadSeedData(): SeedData {
  try {
    const seedDataPath = join(process.cwd(), 'mocks', 'devSeedData.json');
    const seedDataRaw = readFileSync(seedDataPath, 'utf-8');
    return JSON.parse(seedDataRaw);
  } catch (error) {
    console.error('❌ Failed to load seed data:', error);
    process.exit(1);
  }
}

/**
 * Clear existing data from tables (in reverse dependency order)
 */
async function clearExistingData() {
  console.log('🧹 Clearing existing data...');
  
  const tables = [
    'design_tasks',
    'order_items', 
    'orders',
    'customers',
    'catalog_items',
    'user_profiles'
  ];

  for (const table of tables) {
    try {
      const { error } = await supabase
        .from(table)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records
      
      if (error) {
        console.error(`❌ Failed to clear ${table}:`, error.message);
      } else {
        console.log(`✅ Cleared ${table}`);
      }
    } catch (error) {
      console.error(`❌ Error clearing ${table}:`, error);
    }
  }
}

/**
 * Insert data into a specific table with error handling
 */
async function insertTableData(tableName: string, data: any[], keyField: string = 'id') {
  if (!data || data.length === 0) {
    console.log(`⚠️  No data to insert for ${tableName}`);
    return;
  }

  console.log(`📥 Inserting ${data.length} records into ${tableName}...`);

  try {
    // Insert data in batches to avoid timeout
    const batchSize = 10;
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      
      const { data: insertedData, error } = await supabase
        .from(tableName)
        .insert(batch)
        .select();

      if (error) {
        console.error(`❌ Batch insert error for ${tableName}:`, error.message);
        console.error('Failed records:', batch.map(item => item[keyField]));
        errorCount += batch.length;
      } else {
        successCount += insertedData?.length || batch.length;
        console.log(`✅ Inserted batch ${Math.floor(i/batchSize) + 1} for ${tableName} (${batch.length} records)`);
      }
    }

    console.log(`📊 ${tableName} Summary: ${successCount} successful, ${errorCount} failed`);
  } catch (error) {
    console.error(`❌ Critical error inserting into ${tableName}:`, error);
  }
}

/**
 * Create Supabase Auth users for user profiles
 */
async function createAuthUsers(userProfiles: any[]) {
  console.log('👤 Creating Supabase Auth users...');
  
  for (const profile of userProfiles) {
    try {
      const email = `${profile.username}@threadcraft-dev.com`;
      const password = 'DevPassword123!'; // Development password
      
      const { data: authUser, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          username: profile.username,
          firstName: profile.firstName,
          lastName: profile.lastName,
          role: profile.role,
          phone: profile.phone,
          company: profile.company,
          capabilities: profile.capabilities
        }
      });

      if (error) {
        if (error.message.includes('already registered')) {
          console.log(`⚠️  User ${email} already exists, skipping...`);
        } else {
          console.error(`❌ Failed to create auth user ${email}:`, error.message);
        }
      } else {
        console.log(`✅ Created auth user: ${email} (${profile.role})`);
        
        // Update the profile ID to match the auth user ID
        profile.id = authUser.user?.id || profile.id;
      }
    } catch (error) {
      console.error(`❌ Error creating auth user for ${profile.username}:`, error);
    }
  }
}

/**
 * Validate data relationships before insertion
 */
function validateDataRelationships(seedData: SeedData): boolean {
  console.log('🔍 Validating data relationships...');
  
  let isValid = true;
  
  // Check customer-user relationships
  const userIds = new Set(seedData.userProfiles.map(u => u.id));
  for (const customer of seedData.customers) {
    if (customer.userId && !userIds.has(customer.userId)) {
      console.error(`❌ Customer ${customer.id} references non-existent user ${customer.userId}`);
      isValid = false;
    }
  }
  
  // Check order-customer relationships
  const customerIds = new Set(seedData.customers.map(c => c.id));
  for (const order of seedData.orders) {
    if (!customerIds.has(order.customerId)) {
      console.error(`❌ Order ${order.id} references non-existent customer ${order.customerId}`);
      isValid = false;
    }
  }
  
  // Check order item-order relationships
  const orderIds = new Set(seedData.orders.map(o => o.id));
  for (const item of seedData.orderItems) {
    if (!orderIds.has(item.orderId)) {
      console.error(`❌ Order item ${item.id} references non-existent order ${item.orderId}`);
      isValid = false;
    }
  }
  
  if (isValid) {
    console.log('✅ All data relationships are valid');
  }
  
  return isValid;
}

/**
 * Main seeding function
 */
async function seedDatabase() {
  console.log('🌱 === THREADCRAFT DATABASE SEEDING ===');
  console.log(`📅 Started at: ${new Date().toISOString()}`);
  console.log(`🔗 Supabase URL: ${SUPABASE_URL}`);
  
  try {
    // Load seed data
    const seedData = loadSeedData();
    console.log('📋 Loaded seed data successfully');
    
    // Validate relationships
    if (!validateDataRelationships(seedData)) {
      console.error('❌ Data validation failed. Aborting seed operation.');
      process.exit(1);
    }
    
    // Test Supabase connection
    console.log('🔌 Testing database connection...');
    const { data: testData, error: testError } = await supabase
      .from('user_profiles')
      .select('count')
      .single();
    
    if (testError && !testError.message.includes('No rows')) {
      console.error('❌ Database connection failed:', testError.message);
      process.exit(1);
    }
    console.log('✅ Database connection successful');
    
    // Clear existing data
    await clearExistingData();
    
    // Create Auth users first
    await createAuthUsers(seedData.userProfiles);
    
    // Insert data in dependency order
    await insertTableData('user_profiles', seedData.userProfiles);
    await insertTableData('customers', seedData.customers);
    await insertTableData('catalog_items', seedData.catalogItems);
    await insertTableData('orders', seedData.orders);
    await insertTableData('order_items', seedData.orderItems);
    await insertTableData('design_tasks', seedData.designTasks);
    
    console.log('🎉 === DATABASE SEEDING COMPLETED ===');
    console.log(`📅 Finished at: ${new Date().toISOString()}`);
    console.log('');
    console.log('📊 Summary:');
    console.log(`   👤 User Profiles: ${seedData.userProfiles.length}`);
    console.log(`   🏢 Customers: ${seedData.customers.length}`);
    console.log(`   📦 Catalog Items: ${seedData.catalogItems.length}`);
    console.log(`   📋 Orders: ${seedData.orders.length}`);
    console.log(`   📝 Order Items: ${seedData.orderItems.length}`);
    console.log(`   🎨 Design Tasks: ${seedData.designTasks.length}`);
    console.log('');
    console.log('🔐 Development Login Credentials:');
    console.log('   Email: admin@threadcraft-dev.com');
    console.log('   Password: DevPassword123!');
    console.log('');
    console.log('✅ Ready for development and testing!');
    
  } catch (error) {
    console.error('💥 Critical seeding error:', error);
    process.exit(1);
  }
}

/**
 * CLI execution with arguments
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
🌱 ThreadCraft Development Database Seeder

Usage: tsx scripts/devSeed.ts [options]

Options:
  --help, -h     Show this help message
  --dry-run      Validate data without inserting
  --clear-only   Only clear existing data
  --force        Skip confirmation prompts

Environment Variables Required:
  SUPABASE_URL          Supabase project URL
  SUPABASE_SERVICE_KEY  Supabase service role key

Example:
  tsx scripts/devSeed.ts
  tsx scripts/devSeed.ts --dry-run
  tsx scripts/devSeed.ts --clear-only
    `);
    process.exit(0);
  }
  
  if (args.includes('--dry-run')) {
    console.log('🔍 === DRY RUN MODE ===');
    const seedData = loadSeedData();
    const isValid = validateDataRelationships(seedData);
    console.log(isValid ? '✅ Data validation passed' : '❌ Data validation failed');
    process.exit(isValid ? 0 : 1);
  }
  
  if (args.includes('--clear-only')) {
    console.log('🧹 === CLEAR DATA ONLY ===');
    await clearExistingData();
    console.log('✅ Data cleared successfully');
    process.exit(0);
  }
  
  // Confirmation prompt (unless --force)
  if (!args.includes('--force')) {
    console.log('⚠️  This will clear existing data and insert development seed data.');
    console.log('   Continue? (y/N): ');
    
    // Simple confirmation for script execution
    const confirmation = process.env.SEED_CONFIRM || 'y';
    if (confirmation.toLowerCase() !== 'y' && confirmation.toLowerCase() !== 'yes') {
      console.log('❌ Operation cancelled');
      process.exit(0);
    }
  }
  
  await seedDatabase();
}

// Execute if run directly (ES Module compatible)
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { seedDatabase, loadSeedData, validateDataRelationships };
#!/usr/bin/env tsx

/**
 * Database Schema Validation Script for Phase 2 of Database Synchronization Checklist
 * This script validates the current database schema against requirements
 */

import { supabase } from '../../server/db.js';

interface TableInfo {
  table_name: string;
  exists: boolean;
  row_count?: number;
  error?: string;
}

const REQUIRED_TABLES = [
  'orders',
  'order_items', 
  'customers',
  'catalog_items',
  'catalog_categories',
  'catalog_sports',
  'user_profiles',
  'production_tasks',
  'design_tasks',
  'catalog_fabrics'
];

async function checkDatabaseSchema() {
  console.log('🔍 Phase 2: Database Schema Validation');
  console.log('=====================================\n');

  const results: TableInfo[] = [];

  for (const tableName of REQUIRED_TABLES) {
    try {
      const { data, error, count } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true })
        .limit(1);

      if (error) {
        results.push({
          table_name: tableName,
          exists: false,
          error: error.message
        });
        console.log(`❌ ${tableName}: ${error.message}`);
      } else {
        results.push({
          table_name: tableName,
          exists: true,
          row_count: count || 0
        });
        console.log(`✅ ${tableName}: Exists (${count || 0} rows)`);
      }
    } catch (err: any) {
      results.push({
        table_name: tableName,
        exists: false,
        error: err.message
      });
      console.log(`❌ ${tableName}: ${err.message}`);
    }
  }

  // Summary
  const existingTables = results.filter(r => r.exists);
  const missingTables = results.filter(r => !r.exists);

  console.log('\n📊 Schema Validation Summary:');
  console.log(`✅ Existing tables: ${existingTables.length}/${REQUIRED_TABLES.length}`);
  console.log(`❌ Missing tables: ${missingTables.length}`);
  
  if (missingTables.length > 0) {
    console.log('\n🚨 Missing Tables:');
    missingTables.forEach(table => {
      console.log(`   - ${table.table_name}: ${table.error}`);
    });
  }

  console.log('\n✅ Phase 2 Database Schema Validation Complete');
  return { existingTables, missingTables, results };
}

// Run the check if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  checkDatabaseSchema().catch(console.error);
}

export { checkDatabaseSchema };
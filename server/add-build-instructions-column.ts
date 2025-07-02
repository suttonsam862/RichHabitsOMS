/**
 * Add build_instructions column to catalog_items table
 * This script adds the missing column that's causing update failures
 */

import { db } from './db.js';
import { sql } from 'drizzle-orm';

async function addBuildInstructionsColumn(): Promise<void> {
  console.log('🔧 Adding build_instructions column to catalog_items table...');

  try {
    // Add the column using raw SQL
    await db.execute(sql`
      ALTER TABLE catalog_items 
      ADD COLUMN IF NOT EXISTS build_instructions TEXT;
    `);

    console.log('✅ Successfully added build_instructions column');

    // Test the column by querying it
    const testResult = await db.execute(sql`
      SELECT id, name, build_instructions 
      FROM catalog_items 
      LIMIT 1;
    `);

    console.log('✅ Column verified - can query build_instructions field');
    console.log(`Found ${testResult.length} catalog items to test with`);

  } catch (error) {
    console.error('💥 Failed to add build_instructions column:', error);
    throw error;
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  addBuildInstructionsColumn()
    .then(() => {
      console.log('🎉 Database schema update completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Database schema update failed:', error);
      process.exit(1);
    });
}
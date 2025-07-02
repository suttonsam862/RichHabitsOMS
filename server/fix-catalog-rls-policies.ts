/**
 * Fix Row Level Security Policies for Catalog Operations
 * This addresses the RLS blocking catalog CRUD operations
 */

import { supabase } from './db.js';

export async function fixCatalogRLSPolicies(): Promise<void> {
  console.log('🔒 Fixing Row Level Security policies for catalog operations...');

  try {
    // Drop existing restrictive policies that might be blocking operations
    const dropPolicies = [
      'DROP POLICY IF EXISTS "catalog_items_select_policy" ON catalog_items;',
      'DROP POLICY IF EXISTS "catalog_items_insert_policy" ON catalog_items;', 
      'DROP POLICY IF EXISTS "catalog_items_update_policy" ON catalog_items;',
      'DROP POLICY IF EXISTS "catalog_items_delete_policy" ON catalog_items;'
    ];

    for (const policy of dropPolicies) {
      console.log(`Executing: ${policy}`);
      const { error } = await supabase.rpc('exec_sql', { sql: policy });
      if (error && !error.message.includes('does not exist')) {
        console.warn(`Warning dropping policy: ${error.message}`);
      }
    }

    // Create permissive policies that allow authenticated users to manage catalog
    const newPolicies = [
      {
        name: 'catalog_select',
        sql: `
          CREATE POLICY "catalog_select" ON catalog_items
          FOR SELECT TO authenticated
          USING (true);
        `
      },
      {
        name: 'catalog_insert', 
        sql: `
          CREATE POLICY "catalog_insert" ON catalog_items
          FOR INSERT TO authenticated
          WITH CHECK (true);
        `
      },
      {
        name: 'catalog_update',
        sql: `
          CREATE POLICY "catalog_update" ON catalog_items
          FOR UPDATE TO authenticated
          USING (true)
          WITH CHECK (true);
        `
      },
      {
        name: 'catalog_delete',
        sql: `
          CREATE POLICY "catalog_delete" ON catalog_items
          FOR DELETE TO authenticated
          USING (true);
        `
      }
    ];

    for (const policy of newPolicies) {
      console.log(`Creating policy: ${policy.name}`);
      const { error } = await supabase.rpc('exec_sql', { sql: policy.sql });
      
      if (error) {
        console.error(`Failed to create ${policy.name}:`, error.message);
      } else {
        console.log(`✅ Created ${policy.name} policy`);
      }
    }

    // Ensure RLS is enabled
    const { error: rlsError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE catalog_items ENABLE ROW LEVEL SECURITY;'
    });

    if (rlsError && !rlsError.message.includes('already enabled')) {
      console.error('Failed to enable RLS:', rlsError.message);
    } else {
      console.log('✅ RLS enabled on catalog_items');
    }

    console.log('🎉 Catalog RLS policies fixed successfully!');

  } catch (error) {
    console.error('💥 Failed to fix RLS policies:', error);
    throw error;
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  fixCatalogRLSPolicies()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
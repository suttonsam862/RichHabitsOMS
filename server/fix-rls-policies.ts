/**
 * Fix Row Level Security Policies for Catalog Tables
 * This script creates proper RLS policies that allow admin users to manage catalog data
 */

import { supabase } from './db.js';

export async function fixRlsPolicies() {
  console.log('🔒 Fixing Row Level Security policies...\n');

  // 1. Fix catalog_categories policies
  await fixCatalogCategoriesPolicies();
  
  // 2. Fix catalog_sports policies
  await fixCatalogSportsPolicies();
  
  // 3. Fix catalog_items policies
  await fixCatalogItemsPolicies();
  
  // 4. Fix user_profiles infinite recursion
  await fixUserProfilesPolicies();

  console.log('✅ RLS policies fix completed!\n');
}

async function fixCatalogCategoriesPolicies() {
  console.log('Fixing catalog_categories RLS policies...');

  try {
    // First disable RLS temporarily to insert default data
    await supabase.rpc('exec_sql', {
      sql: `
        -- Drop existing policies to avoid conflicts
        DROP POLICY IF EXISTS "catalog_categories_select_policy" ON catalog_categories;
        DROP POLICY IF EXISTS "catalog_categories_insert_policy" ON catalog_categories;
        DROP POLICY IF EXISTS "catalog_categories_update_policy" ON catalog_categories;
        DROP POLICY IF EXISTS "catalog_categories_delete_policy" ON catalog_categories;

        -- Disable RLS temporarily
        ALTER TABLE catalog_categories DISABLE ROW LEVEL SECURITY;
      `
    });

    // Insert default categories without RLS
    const defaultCategories = [
      'Jersey', 'Shorts', 'Pants', 'Jacket', 'Hat', 'Accessories', 'Custom'
    ];

    for (const categoryName of defaultCategories) {
      const { data: existing } = await supabase
        .from('catalog_categories')
        .select('id')
        .eq('name', categoryName)
        .single();

      if (!existing) {
        await supabase
          .from('catalog_categories')
          .insert({ name: categoryName });
        console.log(`✅ Created category: ${categoryName}`);
      }
    }

    // Re-enable RLS with proper policies
    await supabase.rpc('exec_sql', {
      sql: `
        -- Re-enable RLS
        ALTER TABLE catalog_categories ENABLE ROW LEVEL SECURITY;

        -- Allow all authenticated users to read categories
        CREATE POLICY "catalog_categories_select_policy" ON catalog_categories
          FOR SELECT TO authenticated
          USING (true);

        -- Allow admin and catalog managers to insert categories
        CREATE POLICY "catalog_categories_insert_policy" ON catalog_categories
          FOR INSERT TO authenticated
          WITH CHECK (
            EXISTS (
              SELECT 1 FROM user_profiles 
              WHERE id = auth.uid() 
              AND role IN ('admin', 'catalog_manager', 'customer_catalog_manager')
            )
          );

        -- Allow admin and catalog managers to update categories
        CREATE POLICY "catalog_categories_update_policy" ON catalog_categories
          FOR UPDATE TO authenticated
          USING (
            EXISTS (
              SELECT 1 FROM user_profiles 
              WHERE id = auth.uid() 
              AND role IN ('admin', 'catalog_manager', 'customer_catalog_manager')
            )
          );

        -- Allow admin users to delete categories
        CREATE POLICY "catalog_categories_delete_policy" ON catalog_categories
          FOR DELETE TO authenticated
          USING (
            EXISTS (
              SELECT 1 FROM user_profiles 
              WHERE id = auth.uid() 
              AND role = 'admin'
            )
          );
      `
    });

    console.log('✅ catalog_categories RLS policies fixed');
  } catch (error: any) {
    console.error('Error fixing catalog_categories policies:', error.message);
  }
}

async function fixCatalogSportsPolicies() {
  console.log('Fixing catalog_sports RLS policies...');

  try {
    await supabase.rpc('exec_sql', {
      sql: `
        -- Drop existing policies
        DROP POLICY IF EXISTS "catalog_sports_select_policy" ON catalog_sports;
        DROP POLICY IF EXISTS "catalog_sports_insert_policy" ON catalog_sports;
        DROP POLICY IF EXISTS "catalog_sports_update_policy" ON catalog_sports;
        DROP POLICY IF EXISTS "catalog_sports_delete_policy" ON catalog_sports;

        -- Disable RLS temporarily
        ALTER TABLE catalog_sports DISABLE ROW LEVEL SECURITY;
      `
    });

    // Insert default sports
    const defaultSports = [
      'All Around Item', 'Football', 'Basketball', 'Baseball', 'Soccer', 
      'Wrestling', 'Track & Field', 'Swimming', 'Tennis', 'Golf'
    ];

    for (const sportName of defaultSports) {
      const { data: existing } = await supabase
        .from('catalog_sports')
        .select('id')
        .eq('name', sportName)
        .single();

      if (!existing) {
        await supabase
          .from('catalog_sports')
          .insert({ name: sportName });
        console.log(`✅ Created sport: ${sportName}`);
      }
    }

    // Re-enable RLS with proper policies
    await supabase.rpc('exec_sql', {
      sql: `
        -- Re-enable RLS
        ALTER TABLE catalog_sports ENABLE ROW LEVEL SECURITY;

        -- Allow all authenticated users to read sports
        CREATE POLICY "catalog_sports_select_policy" ON catalog_sports
          FOR SELECT TO authenticated
          USING (true);

        -- Allow admin and catalog managers to insert sports
        CREATE POLICY "catalog_sports_insert_policy" ON catalog_sports
          FOR INSERT TO authenticated
          WITH CHECK (
            EXISTS (
              SELECT 1 FROM user_profiles 
              WHERE id = auth.uid() 
              AND role IN ('admin', 'catalog_manager', 'customer_catalog_manager')
            )
          );

        -- Allow admin and catalog managers to update sports
        CREATE POLICY "catalog_sports_update_policy" ON catalog_sports
          FOR UPDATE TO authenticated
          USING (
            EXISTS (
              SELECT 1 FROM user_profiles 
              WHERE id = auth.uid() 
              AND role IN ('admin', 'catalog_manager', 'customer_catalog_manager')
            )
          );

        -- Allow admin users to delete sports
        CREATE POLICY "catalog_sports_delete_policy" ON catalog_sports
          FOR DELETE TO authenticated
          USING (
            EXISTS (
              SELECT 1 FROM user_profiles 
              WHERE id = auth.uid() 
              AND role = 'admin'
            )
          );
      `
    });

    console.log('✅ catalog_sports RLS policies fixed');
  } catch (error: any) {
    console.error('Error fixing catalog_sports policies:', error.message);
  }
}

async function fixCatalogItemsPolicies() {
  console.log('Fixing catalog_items RLS policies...');

  try {
    await supabase.rpc('exec_sql', {
      sql: `
        -- Drop existing policies
        DROP POLICY IF EXISTS "catalog_items_select_policy" ON catalog_items;
        DROP POLICY IF EXISTS "catalog_items_insert_policy" ON catalog_items;
        DROP POLICY IF EXISTS "catalog_items_update_policy" ON catalog_items;
        DROP POLICY IF EXISTS "catalog_items_delete_policy" ON catalog_items;

        -- Enable RLS
        ALTER TABLE catalog_items ENABLE ROW LEVEL SECURITY;

        -- Allow all authenticated users to read catalog items
        CREATE POLICY "catalog_items_select_policy" ON catalog_items
          FOR SELECT TO authenticated
          USING (true);

        -- Allow admin and catalog managers to insert items
        CREATE POLICY "catalog_items_insert_policy" ON catalog_items
          FOR INSERT TO authenticated
          WITH CHECK (
            EXISTS (
              SELECT 1 FROM user_profiles 
              WHERE id = auth.uid() 
              AND role IN ('admin', 'catalog_manager', 'customer_catalog_manager')
            )
          );

        -- Allow admin and catalog managers to update items
        CREATE POLICY "catalog_items_update_policy" ON catalog_items
          FOR UPDATE TO authenticated
          USING (
            EXISTS (
              SELECT 1 FROM user_profiles 
              WHERE id = auth.uid() 
              AND role IN ('admin', 'catalog_manager', 'customer_catalog_manager')
            )
          );

        -- Allow admin users to delete items
        CREATE POLICY "catalog_items_delete_policy" ON catalog_items
          FOR DELETE TO authenticated
          USING (
            EXISTS (
              SELECT 1 FROM user_profiles 
              WHERE id = auth.uid() 
              AND role = 'admin'
            )
          );
      `
    });

    console.log('✅ catalog_items RLS policies fixed');
  } catch (error: any) {
    console.error('Error fixing catalog_items policies:', error.message);
  }
}

async function fixUserProfilesPolicies() {
  console.log('Fixing user_profiles infinite recursion...');

  try {
    await supabase.rpc('exec_sql', {
      sql: `
        -- Drop all existing policies to stop infinite recursion
        DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
        DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
        DROP POLICY IF EXISTS "Admin can view all profiles" ON user_profiles;
        DROP POLICY IF EXISTS "Admin can update all profiles" ON user_profiles;
        DROP POLICY IF EXISTS "user_profiles_select_policy" ON user_profiles;
        DROP POLICY IF EXISTS "user_profiles_insert_policy" ON user_profiles;
        DROP POLICY IF EXISTS "user_profiles_update_policy" ON user_profiles;
        DROP POLICY IF EXISTS "user_profiles_delete_policy" ON user_profiles;

        -- Create simple, non-recursive policies
        CREATE POLICY "user_profiles_select_policy" ON user_profiles
          FOR SELECT TO authenticated
          USING (
            id = auth.uid() OR 
            EXISTS (
              SELECT 1 FROM auth.users 
              WHERE auth.users.id = auth.uid()
              AND auth.users.raw_user_meta_data->>'role' = 'admin'
            )
          );

        CREATE POLICY "user_profiles_insert_policy" ON user_profiles
          FOR INSERT TO authenticated
          WITH CHECK (id = auth.uid());

        CREATE POLICY "user_profiles_update_policy" ON user_profiles
          FOR UPDATE TO authenticated
          USING (
            id = auth.uid() OR 
            EXISTS (
              SELECT 1 FROM auth.users 
              WHERE auth.users.id = auth.uid()
              AND auth.users.raw_user_meta_data->>'role' = 'admin'
            )
          );
      `
    });

    console.log('✅ user_profiles infinite recursion fixed');
  } catch (error: any) {
    console.error('Error fixing user_profiles policies:', error.message);
  }
}

// Run the fix if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  fixRlsPolicies().catch(console.error);
}
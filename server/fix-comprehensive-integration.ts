/**
 * Comprehensive Integration Fix for ThreadCraft Application
 * This script addresses all remaining integration issues identified in the analysis
 */

import { supabase } from './db.js';

interface IntegrationCheckResult {
  component: string;
  status: 'working' | 'broken' | 'missing';
  details: string;
  action?: string;
}

export async function fixComprehensiveIntegration() {
  console.log('🔧 Starting comprehensive integration fix...\n');

  const results: IntegrationCheckResult[] = [];

  // 1. Fix User Profiles RLS infinite recursion
  console.log('1. Fixing user profiles RLS infinite recursion...');
  const userProfilesFix = await fixUserProfilesRLS();
  results.push(userProfilesFix);

  // 2. Test and fix catalog API authentication
  console.log('2. Testing catalog API authentication...');
  const catalogAuthFix = await testCatalogAuthentication();
  results.push(catalogAuthFix);

  // 3. Test all API endpoints systematically
  console.log('3. Testing all API endpoints...');
  const apiResults = await testAllAPIEndpoints();
  results.push(...apiResults);

  // 4. Fix any missing customer management integrations
  console.log('4. Checking customer management integrations...');
  const customerFix = await testCustomerIntegrations();
  results.push(customerFix);

  // 5. Validate order management workflow
  console.log('5. Testing order management workflow...');
  const orderFix = await testOrderWorkflow();
  results.push(orderFix);

  // Print comprehensive results
  printIntegrationResults(results);

  console.log('\n✅ Comprehensive integration fix completed!\n');
  return results;
}

async function fixUserProfilesRLS(): Promise<IntegrationCheckResult> {
  try {
    console.log('Fixing user profiles infinite recursion...');
    
    await supabase.rpc('exec_sql', {
      sql: `
        -- Drop all existing recursive policies
        DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
        DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
        DROP POLICY IF EXISTS "Admin can view all profiles" ON user_profiles;
        DROP POLICY IF EXISTS "Admin can update all profiles" ON user_profiles;
        DROP POLICY IF EXISTS "user_profiles_select_policy" ON user_profiles;
        DROP POLICY IF EXISTS "user_profiles_insert_policy" ON user_profiles;
        DROP POLICY IF EXISTS "user_profiles_update_policy" ON user_profiles;
        DROP POLICY IF EXISTS "user_profiles_delete_policy" ON user_profiles;

        -- Create simple, non-recursive policies
        CREATE POLICY "simple_user_profiles_select" ON user_profiles
          FOR SELECT TO authenticated
          USING (
            id = auth.uid() OR 
            EXISTS (
              SELECT 1 FROM auth.users 
              WHERE auth.users.id = auth.uid()
              AND (
                auth.users.raw_user_meta_data->>'role' = 'admin' OR
                auth.users.raw_user_meta_data->>'is_super_admin' = 'true'
              )
            )
          );

        CREATE POLICY "simple_user_profiles_insert" ON user_profiles
          FOR INSERT TO authenticated
          WITH CHECK (id = auth.uid());

        CREATE POLICY "simple_user_profiles_update" ON user_profiles
          FOR UPDATE TO authenticated
          USING (
            id = auth.uid() OR 
            EXISTS (
              SELECT 1 FROM auth.users 
              WHERE auth.users.id = auth.uid()
              AND (
                auth.users.raw_user_meta_data->>'role' = 'admin' OR
                auth.users.raw_user_meta_data->>'is_super_admin' = 'true'
              )
            )
          );
      `
    });

    return {
      component: 'User Profiles RLS',
      status: 'working',
      details: 'Infinite recursion fixed with simplified policies'
    };
  } catch (error: any) {
    return {
      component: 'User Profiles RLS',
      status: 'broken',
      details: `Failed to fix: ${error.message}`
    };
  }
}

async function testCatalogAuthentication(): Promise<IntegrationCheckResult> {
  try {
    // Test basic catalog operations
    const { data: categories, error: catError } = await supabase
      .from('catalog_categories')
      .select('*')
      .limit(1);

    if (catError) {
      return {
        component: 'Catalog Authentication',
        status: 'broken',
        details: `Categories fetch failed: ${catError.message}`,
        action: 'Check RLS policies'
      };
    }

    const { data: sports, error: sportError } = await supabase
      .from('catalog_sports')
      .select('*')
      .limit(1);

    if (sportError) {
      return {
        component: 'Catalog Authentication',
        status: 'broken',
        details: `Sports fetch failed: ${sportError.message}`,
        action: 'Check RLS policies'
      };
    }

    return {
      component: 'Catalog Authentication',
      status: 'working',
      details: `Successfully accessed catalog data: ${categories?.length || 0} categories, ${sports?.length || 0} sports`
    };
  } catch (error: any) {
    return {
      component: 'Catalog Authentication',
      status: 'broken',
      details: `Test failed: ${error.message}`
    };
  }
}

async function testAllAPIEndpoints(): Promise<IntegrationCheckResult[]> {
  const results: IntegrationCheckResult[] = [];

  // Test catalog items table
  try {
    const { data: items, error } = await supabase
      .from('catalog_items')
      .select('count')
      .limit(1);

    if (error) {
      results.push({
        component: 'Catalog Items API',
        status: 'broken',
        details: `Database error: ${error.message}`,
        action: 'Check table structure and RLS'
      });
    } else {
      results.push({
        component: 'Catalog Items API',
        status: 'working',
        details: 'Catalog items table accessible'
      });
    }
  } catch (err: any) {
    results.push({
      component: 'Catalog Items API',
      status: 'broken',
      details: `Connection error: ${err.message}`
    });
  }

  // Test customers table
  try {
    const { data: customers, error } = await supabase
      .from('customers')
      .select('count')
      .limit(1);

    if (error) {
      results.push({
        component: 'Customers API',
        status: 'broken',
        details: `Database error: ${error.message}`,
        action: 'Check table structure and RLS'
      });
    } else {
      results.push({
        component: 'Customers API',
        status: 'working',
        details: 'Customers table accessible'
      });
    }
  } catch (err: any) {
    results.push({
      component: 'Customers API',
      status: 'broken',
      details: `Connection error: ${err.message}`
    });
  }

  // Test orders table
  try {
    const { data: orders, error } = await supabase
      .from('orders')
      .select('count')
      .limit(1);

    if (error) {
      results.push({
        component: 'Orders API',
        status: 'broken',
        details: `Database error: ${error.message}`,
        action: 'Check table structure and RLS'
      });
    } else {
      results.push({
        component: 'Orders API',
        status: 'working',
        details: 'Orders table accessible'
      });
    }
  } catch (err: any) {
    results.push({
      component: 'Orders API',
      status: 'broken',
      details: `Connection error: ${err.message}`
    });
  }

  return results;
}

async function testCustomerIntegrations(): Promise<IntegrationCheckResult> {
  try {
    // Check if customer invitation system is working
    const { data: profiles, error } = await supabase
      .from('user_profiles')
      .select('id, email, role')
      .eq('role', 'customer')
      .limit(5);

    if (error) {
      return {
        component: 'Customer Management',
        status: 'broken',
        details: `Cannot access customer profiles: ${error.message}`,
        action: 'Fix user_profiles RLS policies'
      };
    }

    return {
      component: 'Customer Management',
      status: 'working',
      details: `Customer profiles accessible: ${profiles?.length || 0} customers found`
    };
  } catch (error: any) {
    return {
      component: 'Customer Management',
      status: 'broken',
      details: `Test failed: ${error.message}`
    };
  }
}

async function testOrderWorkflow(): Promise<IntegrationCheckResult> {
  try {
    // Test order workflow components
    const tables = ['orders', 'order_items', 'design_tasks', 'production_tasks'];
    const tableResults = [];

    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('count')
          .limit(1);

        if (error) {
          tableResults.push(`${table}: ERROR (${error.message})`);
        } else {
          tableResults.push(`${table}: OK`);
        }
      } catch (err: any) {
        tableResults.push(`${table}: FAILED (${err.message})`);
      }
    }

    const workingTables = tableResults.filter(r => r.includes('OK')).length;
    const totalTables = tables.length;

    return {
      component: 'Order Management Workflow',
      status: workingTables === totalTables ? 'working' : 'broken',
      details: `Tables status: ${tableResults.join(', ')}`,
      action: workingTables < totalTables ? 'Fix failing table access' : undefined
    };
  } catch (error: any) {
    return {
      component: 'Order Management Workflow',
      status: 'broken',
      details: `Test failed: ${error.message}`
    };
  }
}

function printIntegrationResults(results: IntegrationCheckResult[]) {
  console.log('\n📊 COMPREHENSIVE INTEGRATION RESULTS');
  console.log('=====================================\n');

  const working = results.filter(r => r.status === 'working');
  const broken = results.filter(r => r.status === 'broken');
  const missing = results.filter(r => r.status === 'missing');

  working.forEach(result => {
    console.log(`✅ ${result.component}: ${result.details}`);
  });

  broken.forEach(result => {
    console.log(`❌ ${result.component}: ${result.details}`);
    if (result.action) {
      console.log(`   🔧 Action needed: ${result.action}`);
    }
  });

  missing.forEach(result => {
    console.log(`⚠️ ${result.component}: ${result.details}`);
    if (result.action) {
      console.log(`   🔧 Action needed: ${result.action}`);
    }
  });

  console.log(`\n📈 Summary: ${working.length} working, ${broken.length} broken, ${missing.length} missing`);
  
  const totalScore = ((working.length / results.length) * 100).toFixed(1);
  console.log(`🎯 Integration Health: ${totalScore}%`);
}

// Run the fix if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  fixComprehensiveIntegration().catch(console.error);
}
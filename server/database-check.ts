
import { db, supabase, testSupabaseConnection } from './db';
import { 
  userProfiles, 
  customers, 
  orders, 
  orderItems,
  catalogItems,
  catalogCategories,
  catalogSports,
  designTasks,
  productionTasks,
  messages,
  payments,
  activityLogs,
  userSettings
} from '../shared/schema';
import { sql } from 'drizzle-orm';

interface TableCheck {
  name: string;
  exists: boolean;
  recordCount: number;
  error?: string;
}

export async function performDatabaseCheck(): Promise<{
  supabaseConnection: boolean;
  tableChecks: TableCheck[];
  summary: string;
}> {
  console.log('🔍 Starting comprehensive database check...');
  
  // Test Supabase connection
  const supabaseConnection = await testSupabaseConnection();
  console.log(`Supabase Connection: ${supabaseConnection ? '✅' : '❌'}`);

  const tableChecks: TableCheck[] = [];
  
  // Define all tables to check
  const tablesToCheck = [
    { name: 'user_profiles', table: userProfiles },
    { name: 'customers', table: customers },
    { name: 'orders', table: orders },
    { name: 'order_items', table: orderItems },
    { name: 'catalog_items', table: catalogItems },
    { name: 'catalog_categories', table: catalogCategories },
    { name: 'catalog_sports', table: catalogSports },
    { name: 'design_tasks', table: designTasks },
    { name: 'production_tasks', table: productionTasks },
    { name: 'messages', table: messages },
    { name: 'payments', table: payments },
    { name: 'activity_logs', table: activityLogs },
    { name: 'user_settings', table: userSettings }
  ];

  // Check each table
  for (const { name, table } of tablesToCheck) {
    try {
      console.log(`Checking table: ${name}...`);
      
      // Try to count records in the table
      const result = await db.select({ count: sql<number>`count(*)` }).from(table);
      const count = result[0]?.count || 0;
      
      tableChecks.push({
        name,
        exists: true,
        recordCount: count
      });
      
      console.log(`✅ ${name}: ${count} records`);
    } catch (error: any) {
      console.log(`❌ ${name}: ${error.message}`);
      tableChecks.push({
        name,
        exists: false,
        recordCount: 0,
        error: error.message
      });
    }
  }

  // Test basic Supabase operations
  try {
    console.log('Testing Supabase direct operations...');
    const { data, error } = await supabase.from('user_profiles').select('count').limit(1);
    if (error && error.code !== 'PGRST116' && error.code !== 'PGRST204') {
      console.log(`⚠️ Supabase direct query warning: ${error.message}`);
    } else {
      console.log('✅ Supabase direct operations working');
    }
  } catch (error: any) {
    console.log(`❌ Supabase direct operations failed: ${error.message}`);
  }

  const existingTables = tableChecks.filter(t => t.exists).length;
  const totalTables = tableChecks.length;
  
  const summary = `Database Check Complete: ${existingTables}/${totalTables} tables accessible, Supabase connection: ${supabaseConnection ? 'OK' : 'FAILED'}`;
  
  console.log('\n📊 Database Check Summary:');
  console.log(summary);
  console.log('Tables with data:');
  tableChecks
    .filter(t => t.exists && t.recordCount > 0)
    .forEach(t => console.log(`  - ${t.name}: ${t.recordCount} records`));
  
  console.log('Tables without data:');
  tableChecks
    .filter(t => t.exists && t.recordCount === 0)
    .forEach(t => console.log(`  - ${t.name}: empty`));
    
  if (tableChecks.some(t => !t.exists)) {
    console.log('Missing/inaccessible tables:');
    tableChecks
      .filter(t => !t.exists)
      .forEach(t => console.log(`  - ${t.name}: ${t.error}`));
  }

  return {
    supabaseConnection,
    tableChecks,
    summary
  };
}

// Health check endpoint helper
export async function getDatabaseHealth() {
  const result = await performDatabaseCheck();
  
  return {
    status: result.supabaseConnection ? 'healthy' : 'unhealthy',
    details: result,
    timestamp: new Date().toISOString()
  };
}

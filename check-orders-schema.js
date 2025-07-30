import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function checkOrdersSchema() {
  console.log('🔍 Checking Orders Table Schema...');
  
  try {
    // Try to get a sample order and inspect its structure
    const { data: sampleOrder, error: sampleError } = await supabase
      .from('orders')
      .select('*')
      .limit(1)
      .single();
    
    let columns, error;
    
    if (sampleError) {
      console.log('❌ No existing orders found:', sampleError.message);
      
      // Try to create a minimal test order to see what columns exist
      console.log('🔍 Testing minimal order creation to discover schema...');
      
      const { data: customers } = await supabase
        .from('customers')
        .select('id')
        .limit(1);
        
      if (!customers?.length) {
        console.log('❌ No customers available for testing');
        return;
      }
      
      const testOrderData = {
        order_number: `SCHEMA-TEST-${Date.now()}`,
        customer_id: customers[0].id,
        status: 'draft',
        total_amount: 0
      };
      
      const { data: testOrder, error: testError } = await supabase
        .from('orders')
        .insert(testOrderData)
        .select()
        .single();
      
      if (testError) {
        console.log('❌ Error creating test order:', testError.message);
        console.log('This tells us what columns exist and which are missing');
        error = testError;
        columns = null;
      } else {
        console.log('✅ Test order created, discovering schema...');
        columns = Object.keys(testOrder).map(key => ({ column_name: key }));
        
        // Clean up test order
        await supabase.from('orders').delete().eq('id', testOrder.id);
        console.log('🧹 Test order cleaned up');
      }
    } else {
      console.log('📊 Found existing order, analyzing structure:');
      console.log(JSON.stringify(sampleOrder, null, 2));
      columns = Object.keys(sampleOrder).map(key => ({ column_name: key }));
      error = null;
    }

    if (error) {
      console.error('❌ Error checking schema:', error);
      return;
    }

    if (columns) {
      console.log('✅ Orders Table Columns:');
      columns.forEach(col => {
        console.log(`  - ${col.column_name}`);
      });
    }

    // Also check order_items table
    console.log('\n🔍 Checking Order Items Table Schema...');
    
    const { data: itemsSample, error: itemsError } = await supabase
      .from('order_items')
      .select('*')
      .limit(1)
      .single();
    
    if (itemsError) {
      console.log('No existing order items');
    } else {
      console.log('📊 Order Items Structure:');
      console.log('  Columns:', Object.keys(itemsSample).join(', '));
    }

  } catch (error) {
    console.error('💥 Error:', error.message);
  }
}

checkOrdersSchema();
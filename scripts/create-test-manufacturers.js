/**
 * Script to create test manufacturer users and production tasks for Manufacturing Management page
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

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

async function createTestManufacturers() {
  console.log('🏭 Creating test manufacturer users...');

  // Create test manufacturer users - using minimal fields that exist in schema
  const { v4: uuidv4 } = await import('crypto');
  
  const manufacturers = [
    {
      id: crypto.randomUUID(),
      email: 'john.manufacturer@threadcraft.com',
      username: 'john_mfg',
      first_name: 'John',
      last_name: 'Manufacturing',
      role: 'manufacturer'
    },
    {
      id: crypto.randomUUID(),
      email: 'sarah.textiles@threadcraft.com', 
      username: 'sarah_tex',
      first_name: 'Sarah',
      last_name: 'Textiles',
      role: 'manufacturer'
    },
    {
      id: crypto.randomUUID(),
      email: 'mike.production@threadcraft.com',
      username: 'mike_prod',
      first_name: 'Mike',
      last_name: 'Production',
      role: 'manufacturer'
    }
  ];

  const { data: createdUsers, error: userError } = await supabase
    .from('user_profiles')
    .insert(manufacturers)
    .select();

  if (userError) {
    console.error('❌ Error creating manufacturers:', userError);
    return;
  }

  console.log(`✅ Created ${createdUsers.length} manufacturer users`);

  // Get the existing order to create production tasks for
  const { data: orders, error: orderError } = await supabase
    .from('orders')
    .select('*')
    .limit(1);

  if (orderError || !orders || orders.length === 0) {
    console.log('ℹ️ No orders found to create production tasks for');
    return;
  }

  const order = orders[0];
  console.log(`📋 Creating production tasks for order: ${order.order_number}`);

  // Create production tasks - using minimal fields
  const productionTasks = [
    {
      id: crypto.randomUUID(),
      order_id: order.id,
      manufacturer_id: createdUsers[0].id,
      task_name: 'Material Sourcing',
      description: 'Source high-quality materials for custom uniform production',
      status: 'pending',
      priority: 'high',
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
    },
    {
      id: crypto.randomUUID(),
      order_id: order.id,
      manufacturer_id: createdUsers[1].id,
      task_name: 'Pattern Creation',
      description: 'Create custom patterns for team uniform sizing',
      status: 'in_progress',
      priority: 'medium',
      due_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString() // 10 days from now
    },
    {
      id: crypto.randomUUID(),
      order_id: order.id,
      manufacturer_id: createdUsers[2].id,
      task_name: 'Quality Control',
      description: 'Final quality inspection and packaging',
      status: 'pending',
      priority: 'low',
      due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() // 14 days from now
    }
  ];

  const { data: createdTasks, error: taskError } = await supabase
    .from('production_tasks')
    .insert(productionTasks)
    .select();

  if (taskError) {
    console.error('❌ Error creating production tasks:', taskError);
    return;
  }

  console.log(`✅ Created ${createdTasks.length} production tasks`);
  
  // Update the order status to have an assigned manufacturer
  const { error: updateError } = await supabase
    .from('orders')
    .update({ 
      status: 'in_production',
      assigned_manufacturer_id: createdUsers[0].id 
    })
    .eq('id', order.id);

  if (updateError) {
    console.error('❌ Error updating order:', updateError);
  } else {
    console.log('✅ Updated order status to in_production');
  }

  console.log('🎉 Test data creation completed successfully!');
}

// Run the script
createTestManufacturers()
  .then(() => {
    console.log('✨ All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
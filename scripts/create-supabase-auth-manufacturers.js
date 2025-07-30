/**
 * Script to create manufacturer users using Supabase Auth API
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

async function createAuthManufacturers() {
  console.log('🔐 Creating manufacturer users via Supabase Auth...');

  // Create manufacturer users via Supabase Auth
  const manufacturers = [
    {
      email: 'john.manufacturer@threadcraft.com',
      password: 'manufacturer123!',
      email_confirm: true,
      user_metadata: {
        username: 'john_mfg',
        firstName: 'John',
        lastName: 'Manufacturing',
        role: 'manufacturer',
        company: 'Precision Threads Inc',
        phone: '+1-555-0101',
        specialties: 'Athletic wear, Custom embroidery'
      }
    },
    {
      email: 'sarah.textiles@threadcraft.com',
      password: 'manufacturer123!',
      email_confirm: true,
      user_metadata: {
        username: 'sarah_tex',
        firstName: 'Sarah',
        lastName: 'Textiles',
        role: 'manufacturer',
        company: 'Elite Garment Solutions',
        phone: '+1-555-0102',
        specialties: 'Team uniforms, Screen printing'
      }
    },
    {
      email: 'mike.production@threadcraft.com',
      password: 'manufacturer123!',
      email_confirm: true,
      user_metadata: {
        username: 'mike_prod',
        firstName: 'Mike',
        lastName: 'Production',
        role: 'manufacturer',
        company: 'Rapid Manufacturing Co',
        phone: '+1-555-0103',
        specialties: 'Fast turnaround, Bulk orders'
      }
    }
  ];

  for (const manufacturerData of manufacturers) {
    try {
      console.log(`Creating manufacturer: ${manufacturerData.email}`);
      
      const { data, error } = await supabase.auth.admin.createUser({
        email: manufacturerData.email,
        password: manufacturerData.password,
        email_confirm: manufacturerData.email_confirm,
        user_metadata: manufacturerData.user_metadata
      });

      if (error) {
        console.error(`❌ Error creating ${manufacturerData.email}:`, error.message);
      } else {
        console.log(`✅ Created manufacturer: ${manufacturerData.email} with ID: ${data.user?.id}`);
      }
    } catch (error) {
      console.error(`💥 Failed to create ${manufacturerData.email}:`, error);
    }
  }

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

  // Get auth users we just created to get their IDs
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
  
  if (authError) {
    console.error('Error getting auth users:', authError);
    return;
  }

  const manufacturerUsers = authUsers.users.filter(user => 
    user.user_metadata?.role === 'manufacturer'
  ).slice(0, 3); // Get first 3 manufacturers

  if (manufacturerUsers.length === 0) {
    console.log('❌ No manufacturer users found');
    return;
  }

  // Create production tasks
  const productionTasks = [
    {
      id: crypto.randomUUID(),
      order_id: order.id,
      manufacturer_id: manufacturerUsers[0].id,
      task_name: 'Material Sourcing',
      description: 'Source high-quality materials for custom uniform production',
      status: 'pending',
      priority: 'high',
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: crypto.randomUUID(),
      order_id: order.id,
      manufacturer_id: manufacturerUsers[1]?.id || manufacturerUsers[0].id,
      task_name: 'Pattern Creation',
      description: 'Create custom patterns for team uniform sizing',
      status: 'in_progress',
      priority: 'medium',
      due_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: crypto.randomUUID(),
      order_id: order.id,
      manufacturer_id: manufacturerUsers[2]?.id || manufacturerUsers[0].id,
      task_name: 'Quality Control',
      description: 'Final quality inspection and packaging',
      status: 'pending',
      priority: 'low',
      due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
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
      assigned_manufacturer_id: manufacturerUsers[0].id 
    })
    .eq('id', order.id);

  if (updateError) {
    console.error('❌ Error updating order:', updateError);
  } else {
    console.log('✅ Updated order status to in_production');
  }

  console.log('🎉 Manufacturer creation and test data setup completed!');
}

// Run the script
createAuthManufacturers()
  .then(() => {
    console.log('✨ All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
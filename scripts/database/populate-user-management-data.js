
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function populateUserManagementData() {
  console.log('🚀 Starting user management data population...');

  try {
    // Create test users
    const testUsers = [
      {
        id: '00000000-0000-0000-0000-000000000001',
        username: 'admin',
        email: 'admin@threadcraft.com',
        first_name: 'Admin',
        last_name: 'User',
        role: 'admin',
        status: 'active',
        is_email_verified: true,
        permissions: {
          manage_users: true,
          manage_roles: true,
          view_all_orders: true,
          manage_system_settings: true
        }
      },
      {
        id: '00000000-0000-0000-0000-000000000002',
        username: 'john.sales',
        email: 'john@example.com',
        first_name: 'John',
        last_name: 'Smith',
        role: 'salesperson',
        status: 'active',
        is_email_verified: true,
        company: 'ThreadCraft Inc',
        permissions: {
          create_orders: true,
          view_customers: true,
          manage_quotes: true
        }
      },
      {
        id: '00000000-0000-0000-0000-000000000003',
        username: 'jane.design',
        email: 'jane@example.com',
        first_name: 'Jane',
        last_name: 'Designer',
        role: 'designer',
        status: 'active',
        is_email_verified: true,
        company: 'ThreadCraft Inc',
        permissions: {
          upload_designs: true,
          edit_designs: true,
          view_design_library: true
        }
      },
      {
        id: '00000000-0000-0000-0000-000000000004',
        username: 'mike.mfg',
        email: 'mike@example.com',
        first_name: 'Mike',
        last_name: 'Manufacturer',
        role: 'manufacturer',
        status: 'active',
        is_email_verified: true,
        company: 'Production Co',
        permissions: {
          view_production_queue: true,
          update_production_status: true,
          manage_inventory: true
        }
      },
      {
        id: '00000000-0000-0000-0000-000000000005',
        username: 'customer1',
        email: 'customer@example.com',
        first_name: 'Customer',
        last_name: 'User',
        role: 'customer',
        status: 'active',
        is_email_verified: true,
        permissions: {
          view_own_orders: true,
          create_order_requests: true,
          make_payments: true
        }
      }
    ];

    // Insert users
    const { data: insertedUsers, error: usersError } = await supabase
      .from('enhanced_user_profiles')
      .upsert(testUsers, { onConflict: 'id' })
      .select();

    if (usersError) {
      console.error('Error inserting users:', usersError);
      return;
    }

    console.log(`✅ Inserted ${insertedUsers.length} test users`);

    // Create some custom roles
    const customRoles = [
      {
        name: 'sales_manager',
        display_name: 'Sales Manager',
        description: 'Manages sales team and has elevated sales permissions',
        permissions: {
          manage_sales_team: true,
          approve_large_orders: true,
          view_sales_analytics: true,
          manage_customer_accounts: true
        }
      },
      {
        name: 'production_supervisor',
        display_name: 'Production Supervisor',
        description: 'Supervises production processes and quality control',
        permissions: {
          supervise_production: true,
          manage_quality_control: true,
          approve_production_changes: true,
          manage_production_staff: true
        }
      }
    ];

    const { data: insertedRoles, error: rolesError } = await supabase
      .from('custom_roles')
      .upsert(customRoles, { onConflict: 'name' })
      .select();

    if (rolesError) {
      console.error('Error inserting roles:', rolesError);
      return;
    }

    console.log(`✅ Inserted ${insertedRoles.length} custom roles`);

    console.log('🎉 User management data population completed successfully!');

  } catch (error) {
    console.error('❌ Error populating user management data:', error);
  }
}

populateUserManagementData();

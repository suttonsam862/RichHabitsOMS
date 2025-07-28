
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

const sampleCustomers = [
  {
    email: 'john.smith@example.com',
    firstName: 'John',
    lastName: 'Smith',
    company: 'Manchester United FC',
    phone: '555-0001',
    sport: 'Soccer',
    organizationType: 'sports'
  },
  {
    email: 'sarah.jones@example.com',
    firstName: 'Sarah',
    lastName: 'Jones',
    company: 'Lakers Basketball Club',
    phone: '555-0002',
    sport: 'Basketball',
    organizationType: 'sports'
  },
  {
    email: 'mike.wilson@example.com',
    firstName: 'Mike',
    lastName: 'Wilson',
    company: 'Corporate Solutions Inc',
    phone: '555-0003',
    sport: '',
    organizationType: 'business'
  },
  {
    email: 'lisa.garcia@example.com',
    firstName: 'Lisa',
    lastName: 'Garcia',
    company: 'State University',
    phone: '555-0004',
    sport: '',
    organizationType: 'education'
  },
  {
    email: 'david.brown@example.com',
    firstName: 'David',
    lastName: 'Brown',
    company: 'Patriots Football Team',
    phone: '555-0005',
    sport: 'Football',
    organizationType: 'sports'
  }
];

async function createSampleCustomers() {
  console.log('Creating sample customers...');

  for (const customer of sampleCustomers) {
    try {
      // Create auth user
      const tempPassword = Math.random().toString(36).substring(2, 12);
      
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: customer.email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          firstName: customer.firstName,
          lastName: customer.lastName,
          role: 'customer',
          company: customer.company,
          phone: customer.phone,
          sport: customer.sport,
          organizationType: customer.organizationType
        }
      });

      if (authError) {
        console.error(`Error creating auth user for ${customer.email}:`, authError);
        continue;
      }

      // Create customer profile
      const { error: profileError } = await supabaseAdmin
        .from('customers')
        .insert({
          id: authUser.user.id,
          email: customer.email,
          first_name: customer.firstName,
          last_name: customer.lastName,
          company: customer.company,
          phone: customer.phone,
          sport: customer.sport,
          organization_type: customer.organizationType,
          created_at: new Date().toISOString()
        });

      if (profileError) {
        console.error(`Error creating profile for ${customer.email}:`, profileError);
      } else {
        console.log(`✅ Created customer: ${customer.firstName} ${customer.lastName} (${customer.email})`);
      }

    } catch (error) {
      console.error(`Unexpected error creating ${customer.email}:`, error);
    }
  }

  console.log('✅ Sample customer creation complete!');
}

createSampleCustomers().catch(console.error);


const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Create Supabase admin client
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

async function createRealCustomers() {
  console.log('🚀 Creating real customers in Supabase...');
  
  const customers = [
    {
      email: 'alice.johnson@techstartup.com',
      firstName: 'Alice',
      lastName: 'Johnson',
      company: 'Tech Startup Inc',
      phone: '555-0100'
    },
    {
      email: 'bob.williams@retailchain.com',
      firstName: 'Bob',
      lastName: 'Williams',
      company: 'Retail Chain Corp',
      phone: '555-0200'
    },
    {
      email: 'carol.davis@consulting.org',
      firstName: 'Carol',
      lastName: 'Davis',
      company: 'Davis Consulting',
      phone: '555-0300'
    },
    {
      email: 'david.miller@sportsteam.net',
      firstName: 'David',
      lastName: 'Miller',
      company: 'City Sports Team',
      phone: '555-0400'
    }
  ];

  for (const customer of customers) {
    try {
      console.log(`Creating customer: ${customer.email}`);
      
      // Generate a temporary password
      const tempPassword = 'TempPass123!';
      
      // Create user in Supabase Auth
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: customer.email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          firstName: customer.firstName,
          lastName: customer.lastName,
          role: 'customer',
          company: customer.company,
          phone: customer.phone
        }
      });
      
      if (error) {
        console.error(`❌ Error creating ${customer.email}:`, error.message);
        continue;
      }
      
      console.log(`✅ Created customer: ${customer.email} (ID: ${data.user.id})`);
      
    } catch (err) {
      console.error(`❌ Unexpected error creating ${customer.email}:`, err.message);
    }
  }
  
  console.log('🎉 Finished creating real customers!');
}

// Run the script
createRealCustomers()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

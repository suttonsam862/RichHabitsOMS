import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://ctznfijidykgjhzpuyej.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseServiceKey) {
  console.error('Missing SUPABASE_SERVICE_KEY or SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createCustomRoleUser(email, password, firstName, lastName, customRole, visiblePages) {
  try {
    console.log(`Creating user: ${email}`);

    // Create user in Supabase Auth
    const { data, error } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: {
        firstName: firstName,
        lastName: lastName,
        role: customRole,
        customRole: customRole,
        visiblePages: visiblePages,
        is_super_admin: false
      }
    });

    if (error) {
      console.error(`Error creating user ${email}:`, error);
      return null;
    }

    console.log(`User created successfully: ${data.user.id}`);
    console.log(`Login credentials:`);
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log(`Custom Role: ${customRole}`);
    console.log(`Visible Pages: ${visiblePages.join(', ')}`);
    console.log(`---`);

    return data.user;
  } catch (error) {
    console.error(`Failed to create user ${email}:`, error);
    return null;
  }
}

async function main() {
  console.log('Creating custom role users...\n');

  // Create Carter Vail with access to Customers and Catalog
  await createCustomRoleUser(
    'cartervail@rich-habits.com',
    'admin123',
    'Carter',
    'Vail',
    'customer_catalog_manager',
    ['customers', 'catalog']
  );

  // Create Charlie Reeves with access to Catalog only
  await createCustomRoleUser(
    'charliereeves@rich-habits.com', 
    'admin123',
    'Charlie',
    'Reeves',
    'catalog_manager',
    ['catalog']
  );

  console.log('\nCustom role users created successfully!');
}

main().catch(console.error);
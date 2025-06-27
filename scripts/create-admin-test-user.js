import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://ctznfijidykgjhzpuyej.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createAdminUser() {
  try {
    const email = 'admin@threadcraft.com';
    const password = 'AdminPass123!';

    console.log('Creating admin user:', email);

    // Create user in Supabase Auth
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        is_super_admin: true
      }
    });

    if (error) {
      console.error('Error creating admin user:', error);
      return;
    }

    console.log('Admin user created successfully:', data.user.id);
    console.log('Login credentials:');
    console.log('Email:', email);
    console.log('Password:', password);

    // Create user profile
    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        id: data.user.id,
        username: 'admin',
        email,
        first_name: 'Admin',
        last_name: 'User',
        role: 'admin',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (profileError) {
      console.warn('Could not create user profile:', profileError.message);
    } else {
      console.log('User profile created successfully');
    }

  } catch (err) {
    console.error('Error in admin user creation:', err);
  }
}

createAdminUser();
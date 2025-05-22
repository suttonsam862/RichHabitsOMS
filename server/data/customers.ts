/**
 * Customer data utilities
 */
import { createClient } from '@supabase/supabase-js';

// Create Supabase admin client with service role key
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

/**
 * Get all customers from Supabase Auth
 */
export async function getAllCustomers() {
  try {
    console.log('Fetching all customers from Supabase Auth');
    
    // Get all users from Auth
    const { data, error } = await supabaseAdmin.auth.admin.listUsers();
    
    if (error) {
      console.error('Error fetching users from Supabase Auth:', error);
      throw error;
    }
    
    // Filter to only include users with customer role
    const customers = data.users
      .filter(user => {
        const metadata = user.user_metadata || {};
        return metadata.role === 'customer';
      })
      .map(user => {
        const metadata = user.user_metadata || {};
        return {
          id: user.id,
          firstName: metadata.firstName || '',
          lastName: metadata.lastName || '',
          email: user.email || '',
          company: metadata.company || '',
          phone: metadata.phone || '',
          address: metadata.address || '',
          city: metadata.city || '',
          state: metadata.state || '',
          zip: metadata.zip || '',
          country: metadata.country || '',
          orders: 0,
          spent: '$0.00',
          lastOrder: null,
          status: user.email_confirmed_at ? 'active' : 'pending',
          created_at: user.created_at
        };
      });
    
    console.log(`Found ${customers.length} customers in Supabase Auth`);
    return customers;
  } catch (err) {
    console.error('Error in getAllCustomers:', err);
    throw err;
  }
}
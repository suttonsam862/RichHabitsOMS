import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

const router = Router();

// Create service role client (admin access) for all Supabase operations
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Get all customers
router.get('/', async (_req: Request, res: Response) => {
  try {
    console.log('Fetching real customers from Supabase...');
    
    // Get all users from Auth
    const { data, error } = await supabaseAdmin.auth.admin.listUsers();
    
    if (error) {
      console.error('Error fetching customers from Supabase Auth:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to retrieve customers: ' + error.message 
      });
    }
    
    // Filter for customers and transform to expected format
    const customers = data.users
      .filter(user => {
        // Look for users with customer role in metadata
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
          orders: 0, // Default for new customers
          spent: '$0.00', // Default for new customers
          lastOrder: null,
          status: user.email_confirmed_at ? 'active' : 'pending',
          created_at: user.created_at
        };
      });
    
    console.log(`Found ${customers.length} customers`);
    return res.json({ success: true, customers });
  } catch (err: any) {
    console.error('Error fetching customers:', err);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to retrieve customers: ' + (err.message || 'Unknown error') 
    });
  }
});

// Get a single customer by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Get user from Auth
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(id);
    
    if (error || !data.user) {
      console.error('Error fetching customer:', error);
      return res.status(404).json({ 
        success: false, 
        message: 'Customer not found' 
      });
    }
    
    const user = data.user;
    const metadata = user.user_metadata || {};
    
    // Convert to expected format
    const customer = {
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
      orders: 0, // Would typically come from orders table
      spent: '$0.00', // Would typically be calculated
      lastOrder: null,
      status: user.email_confirmed_at ? 'active' : 'pending',
      created_at: user.created_at
    };
    
    return res.json({ success: true, customer });
  } catch (err: any) {
    console.error('Error fetching customer details:', err);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to retrieve customer: ' + (err.message || 'Unknown error') 
    });
  }
});

export default router;
/**
 * Customer routes that use real data from Supabase
 */
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const router = express.Router();

// Create Supabase admin client with service role key
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

// Get all customers
router.get('/', async (req, res) => {
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
          orders: 0, // Default for new customers
          spent: '$0.00', // Default for new customers
          lastOrder: null,
          status: user.email_confirmed_at ? 'active' : 'pending',
          created_at: user.created_at
        };
      });
    
    console.log(`Found ${customers.length} customers in Supabase`);
    return res.json({ success: true, customers });
  } catch (err) {
    console.error('Error fetching customers:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve customers' });
  }
});

module.exports = router;
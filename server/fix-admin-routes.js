/**
 * Simple script to add a direct route for customer data
 */
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// This script adds a new route to fetch real customers from Supabase
// Run this after the server has started to add the route

const setupCustomerRoutes = (app) => {
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

  // Add a direct route to get all customers from Supabase
  app.get('/api/admin/real-customers', async (req, res) => {
    try {
      console.log('Fetching real customers from Supabase...');
      
      // Get all users from Auth
      const { data, error } = await supabaseAdmin.auth.admin.listUsers();
      
      if (error) {
        console.error('Error fetching customers:', error);
        return res.status(500).json({ 
          success: false, 
          message: 'Failed to retrieve customers: ' + error.message 
        });
      }
      
      // Filter for customers and transform to expected format
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
            orders: 0,
            spent: '$0.00',
            lastOrder: null,
            status: user.email_confirmed_at ? 'active' : 'pending',
            created_at: user.created_at
          };
        });
      
      console.log(`Found ${customers.length} customers`);
      return res.json({ success: true, customers });
    } catch (err) {
      console.error('Error fetching customers:', err);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to retrieve customers' 
      });
    }
  });

  console.log('✅ Added real customer data route: /api/admin/real-customers');
};

module.exports = { setupCustomerRoutes };
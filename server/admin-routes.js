/**
 * Simple admin customer routes that use the Supabase service key to fetch real customers
 */
import express from 'express';
import { getAllCustomers } from './data/customers.js';

const router = express.Router();

// Get all customers with real data from Supabase
router.get('/customers', async (req, res) => {
  try {
    console.log('Fetching all real customers for admin dashboard...');
    const customers = await getAllCustomers();
    
    return res.json({ 
      success: true, 
      customers 
    });
  } catch (err) {
    console.error('Error in admin customers route:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch customers: ' + (err.message || 'Unknown error')
    });
  }
});

export default router;
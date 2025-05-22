import { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create Supabase admin client with service role key for admin operations
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

/**
 * Create a new customer account in Supabase
 */
export async function createCustomer(req: Request, res: Response) {
  // Check if user has permission to create customers
  if (req.user?.role !== 'admin' && req.user?.role !== 'salesperson') {
    return res.status(403).json({ 
      success: false, 
      message: 'You do not have permission to create customer accounts' 
    });
  }
  
  const {
    firstName,
    lastName,
    email,
    company,
    phone,
    address,
    city,
    state,
    zip,
    country,
    sendInvite = true
  } = req.body;
  
  // Validate required fields
  if (!firstName || !lastName || !email) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields: firstName, lastName, and email are required'
    });
  }
  
  try {
    console.log('Creating customer with email:', email);
    
    // Generate a secure temporary password
    const tempPassword = Math.random().toString(36).substring(2, 10) + 
                         Math.random().toString(36).substring(2, 10);
    
    // Create user with admin API with email confirmation enabled
    console.log('Using Supabase admin API to create auth user...');
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        firstName,
        lastName,
        role: 'customer'
      }
    });
    
    if (error) {
      console.error('Error creating customer auth user:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create customer account: ' + error.message
      });
    }
    
    if (!data?.user) {
      return res.status(500).json({
        success: false,
        message: 'Unknown error creating customer account'
      });
    }
    
    console.log('Successfully created auth user with ID:', data.user.id);
    
    // In a complete implementation, we would:
    // 1. Create a profile record in our database
    // 2. Send an invitation email
    // 3. Link the auth user to our application's user record
    
    // For now, just return success with the user info
    return res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      customer: {
        id: data.user.id,
        firstName,
        lastName,
        email,
        company: company || '',
        created_at: new Date().toISOString()
      }
    });
    
  } catch (err: any) {
    console.error('Unexpected error creating customer:', err);
    return res.status(500).json({
      success: false,
      message: 'Unexpected error creating customer: ' + (err.message || 'Unknown error')
    });
  }
}
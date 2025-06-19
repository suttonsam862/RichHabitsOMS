/**
 * Customer management routes
 */
import { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import * as EmailService from './email';

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
 * Create a new customer in Supabase
 */
export async function createCustomer(req: Request, res: Response) {
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
    console.log('Creating customer account with email:', email);
    
    // Generate a secure temporary password
    const tempPassword = Math.random().toString(36).substring(2, 10) + 
                         Math.random().toString(36).substring(2, 10);
    
    // Create the user in Supabase Auth using admin privileges
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
      console.error('Error creating customer auth account:', error);
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
    
    // Generate username from first and last name
    const username = (firstName + lastName).toLowerCase().replace(/[^a-z0-9]/g, '') + 
                     Math.floor(Math.random() * 1000); // Add random digits for uniqueness
    
    // Create profile record
    const profileData = {
      id: data.user.id,
      username,
      first_name: firstName,
      last_name: lastName,
      email,
      role: 'customer',
      company,
      phone,
      address,
      city,
      state,
      postal_code: zip,
      country,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_active: true
    };
    
    // Insert profile into database
    const { data: insertedProfile, error: profileError } = await supabaseAdmin
      .from('profiles') // Use the actual table name in your Supabase
      .insert(profileData)
      .select();
    
    if (profileError) {
      console.error('Error creating customer profile:', profileError);
      
      // Clean up auth user since profile creation failed
      await supabaseAdmin.auth.admin.deleteUser(data.user.id);
      
      return res.status(500).json({
        success: false,
        message: 'Failed to create customer profile: ' + profileError.message
      });
    }
    
    // Handle sending invitation email if requested
    let inviteUrl = '';
    let inviteSent = false;
    
    if (sendInvite) {
      try {
        // Generate a password reset link for the user to set their own password
        const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'recovery',
          email: email,
        });
        
        if (linkError) {
          console.error('Error generating password reset link:', linkError);
        } else if (linkData?.properties?.action_link) {
          inviteUrl = linkData.properties.action_link;
          
          // Send invitation email with the reset link
          try {
            const emailTemplate = EmailService.getCustomerInviteEmailTemplate(
              email,
              firstName,
              lastName,
              inviteUrl
            );
            
            inviteSent = await EmailService.sendEmail(emailTemplate);
            console.log(`Invitation email ${inviteSent ? 'sent' : 'failed'} to ${email}`);
          } catch (emailErr) {
            console.error('Error sending invitation email:', emailErr);
          }
        }
      } catch (err) {
        console.error('Error in invitation process:', err);
      }
    }
    
    // Return success response
    return res.status(201).json({
      success: true,
      message: inviteSent 
        ? 'Customer created and invitation email sent' 
        : 'Customer created successfully',
      customer: {
        id: data.user.id,
        firstName,
        lastName,
        email,
        company,
        inviteSent
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
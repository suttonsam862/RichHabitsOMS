import { Request, Response } from 'express';
import { supabase } from './db';
import { getCustomerInviteEmailTemplate } from './email';
import { sendEmail } from './email';

/**
 * Create a new customer in Supabase
 */
export async function createCustomer(req: Request, res: Response) {
  // Authorization check
  if (req.user?.role !== 'admin' && req.user?.role !== 'salesperson') {
    return res.status(403).json({ success: false, message: 'Insufficient permissions' });
  }
  
  // Log the request for debugging
  console.log('Customer creation request received:', {
    user: req.user?.email,
    body: req.body
  });
  
  try {
    // Extract and normalize field names
    const { 
      email, firstName, lastName, company, phone,
      emailAddress, first_name, last_name, 
      address, city, state, zip, country, 
      sendInvite = true
    } = req.body;
    
    const customerEmail = email || emailAddress;
    const customerFirstName = firstName || first_name;
    const customerLastName = lastName || last_name;
    const customerCompany = company;
    const customerPhone = phone;
    
    // Validate required fields
    if (!customerEmail || !customerFirstName || !customerLastName) {
      return res.status(400).json({
        success: false,
        message: 'Email, first name, and last name are required'
      });
    }
    
    // Check if user already exists
    const { data: existingUsers } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('email', customerEmail);
    
    if (existingUsers && existingUsers.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'A customer with this email already exists'
      });
    }
    
    // Generate a strong random password
    const randomPassword = Math.random().toString(36).substring(2, 10) + 
                         Math.random().toString(36).substring(2, 15);
    
    console.log(`Creating customer in Supabase Auth: ${customerEmail}`);
    
    // Create user in Supabase Auth
    const { data, error } = await supabase.auth.admin.createUser({
      email: customerEmail,
      password: randomPassword,
      email_confirm: true, // Auto-confirm the email
      user_metadata: {
        first_name: customerFirstName,
        last_name: customerLastName,
        role: 'customer',
        requires_password_reset: true
      }
    });
    
    if (error) {
      console.error('Error creating customer in Supabase Auth:', error);
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
    
    // Create username from first and last name
    const username = (customerFirstName + customerLastName).toLowerCase().replace(/[^a-z0-9]/g, '');
    
    // Create user profile in the database
    const profileData: Record<string, any> = {
      id: data.user.id,
      username: username + Math.floor(Math.random() * 1000), // Add random number to ensure uniqueness
      email: customerEmail,
      first_name: customerFirstName,
      last_name: customerLastName,
      role: 'customer',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_active: true,
      invitation_status: sendInvite ? 'invited' : 'active'
    };
    
    // Add optional fields if they exist
    if (customerCompany) profileData.company = customerCompany;
    if (customerPhone) profileData.phone = customerPhone;
    if (address) profileData.address = address;
    if (city) profileData.city = city;
    if (state) profileData.state = state;
    if (zip) profileData.postal_code = zip;
    if (country) profileData.country = country;
    
    console.log('Creating customer profile with data:', profileData);
    
    // Create customer profile in the database
    const { data: createdProfile, error: profileError } = await supabase
      .from('user_profiles')
      .insert(profileData)
      .select();
    
    if (profileError) {
      console.error('Error creating customer profile:', profileError);
      
      // Try to clean up the auth user since profile creation failed
      await supabase.auth.admin.deleteUser(data.user.id);
      
      return res.status(500).json({
        success: false,
        message: 'Failed to create customer profile: ' + profileError.message
      });
    }
    
    // Now handle invitation email if requested
    let inviteUrl = '';
    let inviteSent = false;
    
    // Generate invitation URL base
    const baseUrl = process.env.APP_URL || `http://${req.headers.host || 'localhost:5000'}`;
    
    if (sendInvite) {
      try {
        // Generate a recovery link through Supabase
        const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
          type: 'recovery',
          email: customerEmail,
        });
        
        if (linkError) {
          console.error('Error generating recovery link:', linkError);
          inviteUrl = `${baseUrl}/login?email=${encodeURIComponent(customerEmail)}`;
        } else if (linkData?.properties?.action_link) {
          inviteUrl = linkData.properties.action_link;
          
          // Send invitation email
          const emailTemplate = getCustomerInviteEmailTemplate(
            customerEmail,
            customerFirstName,
            customerLastName,
            inviteUrl
          );
          
          inviteSent = await sendEmail(emailTemplate);
          console.log(`Invitation email ${inviteSent ? 'sent' : 'failed'} to ${customerEmail}`);
        }
      } catch (emailErr) {
        console.error('Failed to send invitation email:', emailErr);
        inviteUrl = `${baseUrl}/login?email=${encodeURIComponent(customerEmail)}`;
      }
    } else {
      // For direct creation without invite
      inviteUrl = `${baseUrl}/login?email=${encodeURIComponent(customerEmail)}`;
    }
    
    // Log creation details
    console.log(`Customer created: ${customerEmail}, Send invite: ${sendInvite}, Invite sent: ${inviteSent}`);
    
    // Return success with customer data
    return res.status(201).json({
      success: true,
      message: inviteSent 
        ? 'Customer created and invitation email sent successfully' 
        : 'Customer created successfully',
      customer: createdProfile && createdProfile.length > 0 ? createdProfile[0] : { 
        id: data.user.id,
        email: customerEmail,
        first_name: customerFirstName,
        last_name: customerLastName,
        role: 'customer'
      },
      inviteUrl,
      inviteSent
    });
  } catch (err: any) {
    console.error('Error creating customer:', err);
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred: ' + (err.message || 'Unknown error')
    });
  }
}
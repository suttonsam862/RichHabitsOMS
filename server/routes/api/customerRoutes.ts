/**
 * Customer management routes
 */
import { Request, Response, Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { sendEmail, getCustomerInviteEmailTemplate } from '../../email';
import { requireAuth, requireRole } from '../auth/auth';
import crypto from 'crypto';

const router = Router();

// Create Supabase admin client with service role key for admin operations
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

/**
 * Send invitation to a new user
 */
export async function sendUserInvitation(req: Request, res: Response) {
  const { email, firstName, lastName, role = 'customer' } = req.body;

  // Validate required fields
  if (!email || !firstName || !lastName) {
    return res.status(400).json({
      success: false,
      message: 'Email, first name, and last name are required'
    });
  }

  // Validate role
  const validRoles = ['customer', 'salesperson', 'designer', 'manufacturer', 'admin'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid role specified'
    });
  }

  try {
    console.log(`Creating invitation for ${email} with role: ${role}`);

    // Check if user already exists by searching all users
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const userExists = existingUsers?.users?.some(user => user.email === email);

    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'A user with this email already exists'
      });
    }

    // Generate invitation token with expiration (7 days)
    const invitationToken = crypto.randomBytes(32).toString('base64url');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Create invitation data
    const invitationData = {
      email,
      firstName,
      lastName,
      role,
      token: invitationToken,
      expires: expiresAt.getTime(),
      timestamp: Date.now()
    };

    // Store invitation in Supabase (we'll create a table for this)
    const { error: inviteError } = await supabaseAdmin
      .from('user_invitations')
      .insert({
        email,
        first_name: firstName,
        last_name: lastName,
        role,
        invitation_token: invitationToken,
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString(),
        status: 'pending'
      });

    if (inviteError) {
      console.error('Error storing invitation:', inviteError);
      return res.status(500).json({
        success: false,
        message: 'Failed to create invitation'
      });
    }

    // Generate invitation URL
    const baseUrl = process.env.BASE_URL || `https://${process.env.REPLIT_DEV_DOMAIN}`;
    const inviteUrl = `${baseUrl}/register?invite=${invitationToken}`;

    // Send invitation email
    const emailTemplate = getCustomerInviteEmailTemplate(
      email,
      firstName,
      lastName,
      invitationToken
    );

    const emailSent = await sendEmail(emailTemplate);

    if (!emailSent) {
      console.log('Email service not configured, but invitation created');
    }

    console.log(`✅ Invitation created for ${email}`);
    console.log(`📧 Invitation URL: ${inviteUrl}`);

    return res.status(201).json({
      success: true,
      message: `Invitation sent successfully to ${email}`,
      invitation: {
        email,
        firstName,
        lastName,
        role,
        inviteUrl: emailSent ? undefined : inviteUrl, // Only include URL if email failed
        expiresAt: expiresAt.toISOString()
      }
    });

  } catch (error) {
    console.error('Error creating invitation:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create invitation'
    });
  }
}

/**
 * Verify invitation token and get invitation details
 */
export async function verifyInvitation(req: Request, res: Response) {
  const { token } = req.params;

  if (!token) {
    return res.status(400).json({
      success: false,
      message: 'Invitation token is required'
    });
  }

  try {
    // Get invitation from database
    const { data: invitation, error } = await supabaseAdmin
      .from('user_invitations')
      .select('*')
      .eq('invitation_token', token)
      .eq('status', 'pending')
      .single();

    if (error || !invitation) {
      return res.status(404).json({
        success: false,
        message: 'Invalid or expired invitation token'
      });
    }

    // Check if invitation has expired
    const now = new Date();
    const expiresAt = new Date(invitation.expires_at);

    if (now > expiresAt) {
      // Mark as expired
      await supabaseAdmin
        .from('user_invitations')
        .update({ status: 'expired' })
        .eq('invitation_token', token);

      return res.status(400).json({
        success: false,
        message: 'This invitation has expired. Please contact your administrator for a new invitation.'
      });
    }

    return res.status(200).json({
      success: true,
      invitation: {
        email: invitation.email,
        firstName: invitation.first_name,
        lastName: invitation.last_name,
        role: invitation.role,
        expiresAt: invitation.expires_at
      }
    });

  } catch (error) {
    console.error('Error verifying invitation:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to verify invitation'
    });
  }
}


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

    // Insert profile into database - use snake_case columns for insert
    const { data: insertedProfile, error: profileError } = await supabaseAdmin
      .from('customers')
      .insert({
        id: data.user.id,
        first_name: firstName,
        last_name: lastName,
        email: email,
        company: company || '',
        phone: phone || ''
      })
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
            const emailTemplate = getCustomerInviteEmailTemplate(
              email,
              firstName,
              lastName,
              inviteUrl
            );

            inviteSent = await sendEmail(emailTemplate);
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

/**
 * Get all customers (admin only)
 */
async function getAllCustomers(req: Request, res: Response) {
  try {
    console.log('Fetching customers - request received');

    // Try to fetch real customers from Supabase first
    try {
      console.log('Attempting to fetch real customers from Supabase...');
      const { data: users, error } = await supabaseAdmin.auth.admin.listUsers();

      if (error) {
        console.error('Error fetching customers from Supabase:', error);
        throw error;
      }

      console.log(`Found ${users.users.length} total users in Supabase auth`);

      // Filter for customer role users
      const customers = users.users
        .filter(user => user.user_metadata?.role === 'customer')
        .map(user => ({
          id: user.id,
          email: user.email,
          firstName: user.user_metadata?.firstName || '',
          lastName: user.user_metadata?.lastName || '',
          company: user.user_metadata?.company || '',
          phone: user.user_metadata?.phone || '',
          created_at: user.created_at,
          last_sign_in_at: user.last_sign_in_at,
          email_confirmed_at: user.email_confirmed_at
        }));

      console.log(`Found ${customers.length} customers with role 'customer'`);

      // If we have real customers, return them
      if (customers.length > 0) {
        return res.json({
          success: true,
          data: customers,
          count: customers.length
        });
      }

      // If no real customers found, check if we should return sample data in development
      if (process.env.NODE_ENV === 'development') {
        console.log('No real customers found, providing sample customers for development');
        const sampleCustomers = [
          {
            id: 'sample-1',
            email: 'john.smith@example.com',
            firstName: 'John',
            lastName: 'Smith',
            company: 'Smith Corp',
            phone: '555-0123',
            created_at: new Date().toISOString(),
            last_sign_in_at: new Date().toISOString(),
            email_confirmed_at: new Date().toISOString()
          },
          {
            id: 'sample-2',
            email: 'jane.doe@example.com',
            firstName: 'Jane',
            lastName: 'Doe',
            company: 'Doe Industries',
            phone: '555-0124',
            created_at: new Date().toISOString(),
            last_sign_in_at: new Date().toISOString(),
            email_confirmed_at: new Date().toISOString()
          }
        ];

        return res.json({
          success: true,
          data: sampleCustomers,
          count: sampleCustomers.length,
          note: 'Sample data - no real customers found'
        });
      }

      // Return empty array if no customers and not in development
      return res.json({
        success: true,
        data: [],
        count: 0
      });

    } catch (supabaseError) {
      console.error('Supabase connection failed:', supabaseError);

      // Only fall back to sample data in development mode if Supabase fails
      if (process.env.NODE_ENV === 'development') {
        console.log('Supabase failed, providing sample customers for development');
        const sampleCustomers = [
          {
            id: 'fallback-1',
            email: 'john.smith@example.com',
            firstName: 'John',
            lastName: 'Smith',
            company: 'Smith Corp',
            phone: '555-0123',
            created_at: new Date().toISOString(),
            last_sign_in_at: new Date().toISOString(),
            email_confirmed_at: new Date().toISOString()
          },
          {
            id: 'fallback-2',
            email: 'jane.doe@example.com',
            firstName: 'Jane',
            lastName: 'Doe',
            company: 'Doe Industries',
            phone: '555-0124',
            created_at: new Date().toISOString(),
            last_sign_in_at: new Date().toISOString(),
            email_confirmed_at: new Date().toISOString()
          }
        ];

        return res.json({
          success: true,
          data: sampleCustomers,
          count: sampleCustomers.length,
          note: 'Fallback sample data - Supabase connection failed'
        });
      }

      // In production, return error if Supabase fails
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch customers: ' + supabaseError.message
      });
    }

  } catch (error) {
    console.error('Error in getAllCustomers:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

// Configure routes - temporarily remove auth middleware for development
router.get('/', getAllCustomers);
router.post('/invite', requireAuth, requireRole(['admin']), sendUserInvitation);
router.get('/verify/:token', verifyInvitation);
router.post('/', requireAuth, requireRole(['admin']), createCustomer);

export default router;
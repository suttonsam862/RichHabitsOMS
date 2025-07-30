/**
 * Customer management routes
 */
import { Request, Response, Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { sendEmail, getCustomerInviteEmailTemplate } from '../../email';
import { requireAuth, requireRole } from '../auth/auth';
import { customerTransformers } from '../../utils/schemaTransformers';
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
    console.log('Creating customer profile with email:', email);

    // Check if customer already exists in database
    const { data: existingCustomer, error: checkError } = await supabaseAdmin
      .from('customers')
      .select('id, email')
      .eq('email', email)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error checking existing customer:', checkError);
      return res.status(500).json({
        success: false,
        message: 'Failed to validate customer uniqueness: ' + checkError.message
      });
    }

    if (existingCustomer) {
      return res.status(400).json({
        success: false,
        message: 'A customer with this email address already exists'
      });
    }

    // Generate a unique ID for the customer
    const customerId = crypto.randomUUID();

    console.log('Creating customer profile with ID:', customerId);
    // Use schema transformer for database insertion
    const customerData = customerTransformers.toDatabase({
      id: customerId,
      firstName,
      lastName,
      email,
      company: company || '',
      phone: phone || '',
      address: address || '',
      city: city || '',
        state: state || '',
        zip: zip || '',
        country: country || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (profileError) {
      console.error('Error creating customer profile:', profileError);
      console.error('Profile error details:', JSON.stringify(profileError, null, 2));

      return res.status(500).json({
        success: false,
        message: 'Failed to create customer profile: ' + profileError.message,
        details: profileError.details || 'No additional details'
      });
    }

    console.log('Customer profile created successfully:', insertedProfile);

    // Success response with customer data
    res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      customer: {
        id: insertedProfile.id,
        firstName: insertedProfile.first_name,
        lastName: insertedProfile.last_name,
        email: insertedProfile.email,
        company: insertedProfile.company,
        phone: insertedProfile.phone,
        created_at: insertedProfile.created_at
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

    // First, try to get customers from the customers table
    const { data: customerProfiles, error: customerError } = await supabaseAdmin
      .from('customers')
      .select('*');

    if (customerError) {
      console.error('Error fetching customer profiles:', customerError);
    }

    // Also get auth users for additional data
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authError) {
      console.error('Error fetching auth users:', authError);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch customers: ' + authError.message
      });
    }

    // Combine data from both sources
    const authUsers = authData.users;
    const customers: any[] = [];

    // Process customers from the customers table first
    if (customerProfiles && customerProfiles.length > 0) {
      for (const profile of customerProfiles) {
        const authUser = authUsers.find(u => u.id === profile.id || u.email === profile.email);
        
        customers.push({
          id: profile.id,
          email: profile.email,
          firstName: profile.first_name || '',
          lastName: profile.last_name || '',
          company: profile.company || '',
          phone: profile.phone || '',
          sport: profile.sport || '',
          organizationType: profile.organization_type || 'business',
          orders: 0,
          spent: '$0.00',
          lastOrder: null,
          status: authUser?.email_confirmed_at ? 'active' : 'pending',
          created_at: profile.created_at || authUser?.created_at,
          userId: authUser?.id
        });
      }
    }

    // Also include auth users with customer role who might not be in customers table
    const customerRoleUsers: any[] = authUsers
      .filter(user => user.user_metadata?.role === 'customer')
      .filter(user => !customers.find(c => c.id === user.id || c.email === user.email));

    for (const user of customerRoleUsers) {
      customers.push({
        id: user.id,
        email: user.email,
        firstName: user.user_metadata?.firstName || '',
        lastName: user.user_metadata?.lastName || '',
        company: user.user_metadata?.company || '',
        phone: user.user_metadata?.phone || '',
        sport: user.user_metadata?.sport || '',
        organizationType: user.user_metadata?.organizationType || 'business',
        orders: 0,
        spent: '$0.00',
        lastOrder: null,
        status: user.email_confirmed_at ? 'active' : 'pending',
        created_at: user.created_at,
        userId: user.id
      });
    }

    console.log(`Found ${customers.length} total customers (${customerProfiles?.length || 0} from profiles, ${customerRoleUsers.length} from auth only)`);

    res.json({
      success: true,
      data: customers,
      count: customers.length
    });

  } catch (error) {
    console.error('Error in getAllCustomers:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

// Configure routes
router.get('/', getAllCustomers);
router.post('/invite', requireAuth, requireRole(['admin']), sendUserInvitation);
router.get('/verify/:token', verifyInvitation);
router.post('/', requireAuth, requireRole(['admin']), createCustomer);

export default router;
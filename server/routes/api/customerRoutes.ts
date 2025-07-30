/**
 * Customer management routes
 */
import { Request, Response, Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { sendEmail, getCustomerInviteEmailTemplate } from '../../email';
import { requireAuth, requireRole } from '../auth/auth';
import { customerTransformers } from '../../utils/schemaTransformers';
import crypto from 'crypto';
import multer from 'multer';
import { handleCatalogImageUpload } from '../../imageUpload.js';

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
      return res.status(400).json({
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

    return res.status(200).json({
      success: true,
      message: `Invitation sent successfully to ${email}`,
      invitation: {
        email,
        firstName,
        lastName,
        role,
        inviteUrl: emailSent ? undefined : inviteUrl,
        expiresAt: expiresAt.toISOString()
      }
    });

  } catch (error: any) {
    console.error('Error creating invitation:', error);
    console.error(error.message);
    return res.status(400).json({
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
      return res.status(400).json({
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

  } catch (error: any) {
    console.error('Error verifying invitation:', error);
    console.error(error.message);
    return res.status(400).json({
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
    first_name,
    last_name,
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
  if (!first_name || !last_name || !email) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields: first_name, last_name, and email are required'
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
      return res.status(400).json({
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

    // Insert customer directly into database
    const { data: insertedProfile, error: profileError } = await supabaseAdmin
      .from('customers')
      .insert({
        id: customerId,
        first_name,
        last_name,
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

      return res.status(400).json({
        success: false,
        message: 'Failed to create customer profile: ' + profileError.message,
        details: profileError.details || 'No additional details'
      });
    }

    console.log('Customer profile created successfully:', insertedProfile);

    // Success response with customer data
    res.status(200).json({
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
    return res.status(400).json({
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
      return res.status(400).json({
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

    res.status(200).json({
      success: true,
      data: customers,
      count: customers.length
    });

  } catch (error) {
    console.error('Error in getAllCustomers:', error);
    res.status(400).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

/**
 * Update an existing customer in Supabase
 */
async function updateCustomer(req: Request, res: Response) {
  const { id } = req.params;
  const requestTimestamp = new Date().toISOString();
  
  try {
    console.log(`🔄 [${requestTimestamp}] Starting customer update for ID: ${id}`);
    
    // Validate customer ID format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!id || !uuidRegex.test(id)) {
      console.error(`❌ [${requestTimestamp}] Invalid customer ID format: ${id}`);
      return res.status(400).json({
        success: false,
        message: 'Invalid customer ID format - must be a valid UUID'
      });
    }

    console.log(`📥 [${requestTimestamp}] Request body received:`, JSON.stringify(req.body, null, 2));

    // Handle both camelCase (frontend) and snake_case (database) field names
    const {
      firstName, first_name,
      lastName, last_name,
      email,
      company,
      phone,
      address,
      city,
      state,
      zip,
      country,
      status
    } = req.body;

    // Validate that we have at least one field to update
    if (Object.keys(req.body).length === 0) {
      console.error(`❌ [${requestTimestamp}] No update fields provided`);
      return res.status(400).json({
        success: false,
        message: 'No update fields provided'
      });
    }

    // Build update object with snake_case field names for database
    const updateData: any = {};

    // Map camelCase to snake_case and handle both formats with validation
    if (firstName !== undefined || first_name !== undefined) {
      const nameValue = firstName || first_name;
      if (typeof nameValue === 'string' && nameValue.trim().length > 0) {
        updateData.first_name = nameValue.trim();
      }
    }
    if (lastName !== undefined || last_name !== undefined) {
      const nameValue = lastName || last_name;
      if (typeof nameValue === 'string' && nameValue.trim().length > 0) {
        updateData.last_name = nameValue.trim();
      }
    }
    if (email !== undefined) {
      if (typeof email === 'string' && email.includes('@')) {
        updateData.email = email.trim().toLowerCase();
      } else if (email !== null) {
        console.error(`❌ [${requestTimestamp}] Invalid email format: ${email}`);
        return res.status(400).json({
          success: false,
          message: 'Invalid email format'
        });
      }
    }
    
    // Handle optional fields (can be empty strings)
    if (company !== undefined) updateData.company = company || '';
    if (phone !== undefined) updateData.phone = phone || '';
    if (address !== undefined) updateData.address = address || '';
    if (city !== undefined) updateData.city = city || '';
    if (state !== undefined) updateData.state = state || '';
    if (zip !== undefined) updateData.zip = zip || '';
    if (country !== undefined) updateData.country = country || '';
    if (status !== undefined) {
      const validStatuses = ['active', 'inactive', 'suspended'];
      if (validStatuses.includes(status)) {
        updateData.status = status;
      } else {
        console.error(`❌ [${requestTimestamp}] Invalid status value: ${status}`);
        return res.status(400).json({
          success: false,
          message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
        });
      }
    }

    console.log(`📤 [${requestTimestamp}] Final update data for Supabase:`, JSON.stringify(updateData, null, 2));

    // Verify we have fields to update after validation
    if (Object.keys(updateData).length === 0) {
      console.error(`❌ [${requestTimestamp}] No valid update fields after validation`);
      return res.status(400).json({
        success: false,
        message: 'No valid update fields provided after validation'
      });
    }

    // First check if customer exists
    console.log(`🔍 [${requestTimestamp}] Checking if customer exists with ID: ${id}`);
    const { data: existingCustomer, error: checkError } = await supabaseAdmin
      .from('customers')
      .select('id, email, first_name, last_name')
      .eq('id', id)
      .single();

    if (checkError) {
      console.error(`❌ [${requestTimestamp}] Error checking customer existence:`, {
        code: checkError.code,
        message: checkError.message,
        details: checkError.details,
        hint: checkError.hint
      });
      
      if (checkError.code === 'PGRST116') {
        return res.status(400).json({
          success: false,
          message: `Customer not found with ID: ${id}`
        });
      }
      return res.status(400).json({
        success: false,
        message: 'Failed to verify customer: ' + checkError.message
      });
    }

    console.log(`✅ [${requestTimestamp}] Customer found:`, {
      id: existingCustomer.id,
      email: existingCustomer.email,
      name: `${existingCustomer.first_name} ${existingCustomer.last_name}`
    });

    // Update customer in database
    console.log(`🔄 [${requestTimestamp}] Executing Supabase update query...`);
    const { data: updatedProfile, error: profileError } = await supabaseAdmin
      .from('customers')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single();

    if (profileError) {
      console.error(`❌ [${requestTimestamp}] Supabase update error:`, {
        code: profileError.code,
        message: profileError.message,
        details: profileError.details,
        hint: profileError.hint,
        updateData: updateData,
        customerId: id
      });

      return res.status(400).json({
        success: false,
        message: 'Failed to update customer profile: ' + profileError.message
      });
    }

    if (!updatedProfile) {
      console.error(`❌ [${requestTimestamp}] No profile returned after update - customer may not exist`);
      return res.status(400).json({
        success: false,
        message: 'Customer not found after update'
      });
    }

    console.log(`✅ [${requestTimestamp}] Customer profile updated successfully:`, {
      id: updatedProfile.id,
      email: updatedProfile.email,
      name: `${updatedProfile.first_name} ${updatedProfile.last_name}`,
      fieldsUpdated: Object.keys(updateData)
    });

    // Success response with updated customer data in camelCase format
    const responseData = {
      id: updatedProfile.id,
      firstName: updatedProfile.first_name,
      lastName: updatedProfile.last_name,
      email: updatedProfile.email,
      company: updatedProfile.company,
      phone: updatedProfile.phone,
      address: updatedProfile.address,
      city: updatedProfile.city,
      state: updatedProfile.state,
      zip: updatedProfile.zip,
      country: updatedProfile.country,
      status: updatedProfile.status,
      photo_url: updatedProfile.photo_url,
      created_at: updatedProfile.created_at,
      updated_at: updatedProfile.updated_at,
      // For compatibility with frontend expectations
      orders: 0,
      spent: '$0.00',
      lastOrder: null
    };

    console.log(`✅ [${requestTimestamp}] Sending success response to client`);
    
    res.status(200).json({
      success: true,
      updatedCustomer: responseData
    });

  } catch (err: any) {
    console.error(`💥 [${requestTimestamp}] Unexpected error updating customer:`, {
      customerId: id,
      error: {
        name: err.name,
        message: err.message,
        stack: err.stack
      },
      requestBody: req.body,
      timestamp: requestTimestamp
    });
    
    return res.status(400).json({
      success: false,
      message: 'Unexpected error updating customer: ' + (err.message || 'Unknown error')
    });
  }
}

/**
 * Upload customer photo
 */
async function uploadCustomerPhoto(req: Request, res: Response) {
  const { id } = req.params;

  try {
    // Check if file exists
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    console.log(`Uploading photo for customer ${id}, file: ${req.file.originalname}, size: ${req.file.size}`);

    // Ensure bucket exists or create it
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    const bucketExists = buckets?.some(bucket => bucket.name === 'customer-photos');
    
    if (!bucketExists) {
      console.log('Creating customer-photos bucket...');
      const { error: bucketError } = await supabaseAdmin.storage.createBucket('customer-photos', {
        public: true,
        allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
        fileSizeLimit: 5242880 // 5MB
      });
      
      if (bucketError) {
        console.error('Error creating bucket:', bucketError);
        return res.status(400).json({
          success: false,
          message: 'Failed to initialize storage bucket: ' + bucketError.message
        });
      }
    }

    // Generate unique filename to prevent conflicts
    const fileExtension = req.file.originalname.split('.').pop();
    const fileName = `${id}_${Date.now()}.${fileExtension}`;
    
    // Upload file to Supabase storage
    const { data, error } = await supabaseAdmin.storage
      .from('customer-photos')
      .upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: true
      });

    if (error) {
      console.error('Error uploading photo to Supabase:', error);
      return res.status(400).json({
        success: false,
        message: 'Failed to upload photo: ' + error.message
      });
    }

    // Get the public URL for the uploaded photo
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('customer-photos')
      .getPublicUrl(fileName);

    const photoUrl = publicUrl;

    // Update customer record with photo URL
    const { error: updateError } = await supabaseAdmin
      .from('customers')
      .update({ photo_url: photoUrl })
      .eq('id', id);

    if (updateError) {
      console.error('Error updating customer photo URL:', updateError);
      return res.status(400).json({
        success: false,
        message: 'Failed to update customer photo URL'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Photo uploaded successfully',
      photoUrl
    });

  } catch (error: any) {
    console.error('Error uploading customer photo:', error);
    console.error(error.message);
    res.status(400).json({
      success: false,
      message: 'Failed to upload customer photo'
    });
  }
}

// Configure routes
router.get('/', getAllCustomers);
router.post('/invite', requireAuth, requireRole(['admin']), sendUserInvitation);
router.get('/verify/:token', verifyInvitation);
router.post('/', requireAuth, requireRole(['admin']), createCustomer);

router.put('/:id', requireAuth, requireRole(['admin']), updateCustomer);
router.patch('/:id', requireAuth, requireRole(['admin']), updateCustomer);
router.post('/:id/photo', requireAuth, requireRole(['admin']), handleCatalogImageUpload, uploadCustomerPhoto);

// GET single customer endpoint
router.get('/:id', requireAuth, requireRole(['admin']), async (req: Request, res: Response) => {
  const { id } = req.params;
  
  try {
    const { data: customer, error } = await supabaseAdmin
      .from('customers')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !customer) {
      return res.status(400).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Transform to camelCase for frontend compatibility
    const responseData = {
      id: customer.id,
      firstName: customer.first_name,
      lastName: customer.last_name,
      email: customer.email,
      company: customer.company,
      phone: customer.phone,
      address: customer.address,
      city: customer.city,
      state: customer.state,
      zip: customer.zip,
      country: customer.country,
      status: customer.status,
      photo_url: customer.photo_url,
      created_at: customer.created_at,
      updated_at: customer.updated_at,
      orders: 0,
      spent: '$0.00',
      lastOrder: null
    };

    res.status(200).json({
      success: true,
      data: responseData
    });
  } catch (error) {
    console.error('Error fetching customer:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to fetch customer'
    });
  }
});

export default router;
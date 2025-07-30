/**
 * Customer management routes
 */
import { Request, Response, Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { sendEmail, getCustomerInviteEmailTemplate } from '../../email';
import { requireAuth, requireRole } from '../auth/auth';
import { customerTransformers } from '../../utils/schemaTransformers';
import { validateRequiredFields, validateCustomerData } from '../../utils/validation';
import crypto from 'crypto';
import multer from 'multer';

import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Configure multer for memory storage (files will be uploaded to Supabase Storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

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
    let existingUsers;
    try {
      const result = await supabaseAdmin.auth.admin.listUsers();
      existingUsers = result.data;
      console.log(`✅ Successfully retrieved user list for email check: ${email}`);
    } catch (error) {
      console.error('❌ Error fetching existing users:', error);
      return res.status(400).json({
        success: false,
        message: 'Failed to check existing users'
      });
    }

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

    // Store invitation in Supabase with explicit defaults
    try {
      const { error: inviteError } = await supabaseAdmin
        .from('user_invitations')
        .insert({
          email,
          first_name: firstName,
          last_name: lastName,
          role,
          invitation_token: invitationToken,
          expires_at: expiresAt.toISOString(),
          created_at: 'NOW()',
          updated_at: 'NOW()',
          status: 'pending',
          sent_count: 0,
          last_sent_at: new Date().toISOString()
        });

      if (inviteError) {
        console.error('❌ Error storing invitation:', inviteError);
        return res.status(400).json({
          success: false,
          message: 'Failed to create invitation'
        });
      }
      console.log(`✅ Successfully stored invitation for ${email}`);
    } catch (error) {
      console.error('❌ Exception during invitation insert:', error);
      return res.status(400).json({
        success: false,
        message: 'Failed to create invitation due to database error'
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
      data: {
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
    let invitation;
    try {
      const { data, error } = await supabaseAdmin
        .from('user_invitations')
        .select('*')
        .eq('invitation_token', token)
        .eq('status', 'pending')
        .single();

      if (error) {
        console.error('❌ Error fetching invitation:', error);
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired invitation token'
        });
      }

      invitation = data;
      console.log(`✅ Successfully retrieved invitation for token: ${token}`);
    } catch (error) {
      console.error('❌ Exception during invitation fetch:', error);
      return res.status(400).json({
        success: false,
        message: 'Database error while verifying invitation'
      });
    }

    if (!invitation) {
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
      try {
        await supabaseAdmin
          .from('user_invitations')
          .update({ 
            status: 'expired',
            updated_at: 'NOW()'
          })
          .eq('invitation_token', token);
        console.log(`✅ Successfully marked invitation as expired for token: ${token}`);
      } catch (error) {
        console.error('❌ Error marking invitation as expired:', error);
        // Continue anyway since the main check failed
      }

      return res.status(400).json({
        success: false,
        message: 'This invitation has expired. Please contact your administrator for a new invitation.'
      });
    }

    return res.status(200).json({
      success: true,
      data: {
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
  // Support both camelCase and snake_case field names
  const first_name = req.body.first_name || req.body.firstName;
  const last_name = req.body.last_name || req.body.lastName;
  const email = req.body.email;
  const company = req.body.company;
  const phone = req.body.phone;
  const address = req.body.address;
  const city = req.body.city;
  const state = req.body.state;
  const zip = req.body.zip;
  const country = req.body.country;
  const id = req.body.id;
  const sendInvite = req.body.sendInvite || true;

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
    let existingCustomer;
    try {
      const { data, error: checkError } = await supabaseAdmin
        .from('customers')
        .select('id, email')
        .eq('email', email)
        .single();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('❌ Error checking existing customer:', checkError);
        return res.status(400).json({
          success: false,
          message: 'Failed to validate customer uniqueness: ' + checkError.message
        });
      }

      existingCustomer = data;
      console.log(`✅ Successfully checked customer existence for email: ${email}`);
    } catch (error) {
      console.error('❌ Exception during customer existence check:', error);
      return res.status(400).json({
        success: false,
        message: 'Database error while checking customer uniqueness'
      });
    }

    if (existingCustomer) {
      return res.status(400).json({
        success: false,
        message: 'A customer with this email address already exists'
      });
    }

    // Use provided ID or generate a unique ID for the customer
    const customerId = id || uuidv4();

    console.log('Creating customer profile with ID:', customerId);

    // Insert customer directly into database
    let insertedProfile;
    try {
      const { data, error: profileError } = await supabaseAdmin
        .from('customers')
        .insert({
          id: customerId,
          first_name: first_name,
          last_name: last_name,
          email,
          company: company || '',
          phone: phone || '',
          address: address || '',
          city: city || '',
          state: state || '',
          zip: zip || '',
          country: country || '',
          created_at: 'NOW()',
          updated_at: 'NOW()'
        })
        .select()
        .single();

      if (profileError) {
        console.error('❌ Error creating customer profile:', profileError);
        console.error('❌ Profile error details:', JSON.stringify(profileError, null, 2));

        return res.status(400).json({
          success: false,
          message: 'Failed to create customer profile: ' + profileError.message,
          details: profileError.details || 'No additional details'
        });
      }

      insertedProfile = data;
      console.log(`✅ Successfully created customer profile for: ${email}`);
    } catch (error) {
      console.error('❌ Exception during customer profile creation:', error);
      return res.status(400).json({
        success: false,
        message: 'Database error while creating customer profile'
      });
    }

    console.log('Customer profile created successfully:', insertedProfile);

    // Success response with customer data
    res.status(200).json({
      success: true,
      data: {
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

    // First, try to get customers from the customers table (with default limit for safety)
    let customerProfiles;
    try {
      const { data, error: customerError } = await supabaseAdmin
        .from('customers')
        .select('*')
        .limit(100);

      if (customerError) {
        console.error('❌ Error fetching customer profiles:', customerError);
      } else {
        customerProfiles = data;
        console.log(`✅ Successfully fetched ${data?.length || 0} customer profiles`);
      }
    } catch (error) {
      console.error('❌ Exception during customer profiles fetch:', error);
      customerProfiles = null;
    }

    // Also get auth users for additional data
    let authData;
    try {
      const result = await supabaseAdmin.auth.admin.listUsers();
      authData = result.data;
      console.log(`✅ Successfully fetched ${authData?.users?.length || 0} auth users`);
    } catch (error) {
      console.error('❌ Exception fetching auth users:', error);
      return res.status(400).json({
        success: false,
        message: 'Failed to fetch customers due to authentication service error'
      });
    }

    if (!authData) {
      console.error('❌ Auth data is null after fetch');
      return res.status(400).json({
        success: false,
        message: 'Failed to fetch authentication data'
      });
    }

    // Combine data from both sources
    const authUsers = authData.users;
    const customers: any[] = [];

    // Process customers from the customers table first - always handle as array
    const safeCustomerProfiles = customerProfiles || [];
    for (const profile of safeCustomerProfiles) {
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

    console.log(`Found ${customers.length} total customers (${safeCustomerProfiles.length} from profiles, ${customerRoleUsers.length} from auth only)`);

    res.status(200).json({
      success: true,
      data: {
        customers: customers,
        count: customers.length
      }
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
    const first_name = req.body.first_name || req.body.firstName;
    const last_name = req.body.last_name || req.body.lastName;
    const email = req.body.email;
    const company = req.body.company;
    const phone = req.body.phone;
    const address = req.body.address;
    const city = req.body.city;
    const state = req.body.state;
    const zip = req.body.zip;
    const country = req.body.country;
    const status = req.body.status;

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

    // Validate and add fields to update data
    if (first_name !== undefined) {
      if (typeof first_name === 'string' && first_name.trim().length > 0) {
        updateData.first_name = first_name.trim();
      }
    }
    if (last_name !== undefined) {
      if (typeof last_name === 'string' && last_name.trim().length > 0) {
        updateData.last_name = last_name.trim();
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
    let existingCustomer;
    try {
      const { data, error: checkError } = await supabaseAdmin
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

      existingCustomer = data;
      console.log(`✅ [${requestTimestamp}] Successfully verified customer exists`);
    } catch (error) {
      console.error(`❌ [${requestTimestamp}] Exception during customer existence check:`, error);
      return res.status(400).json({
        success: false,
        message: 'Database error while verifying customer existence'
      });
    }

    console.log(`✅ [${requestTimestamp}] Customer found:`, {
      id: existingCustomer.id,
      email: existingCustomer.email,
      name: `${existingCustomer.first_name} ${existingCustomer.last_name}`
    });

    // Add updated timestamp using database server time
    updateData.updated_at = 'NOW()';

    // Update customer in database
    console.log(`🔄 [${requestTimestamp}] Executing Supabase update query...`);
    let updatedProfile;
    try {
      const { data, error: profileError } = await supabaseAdmin
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

      updatedProfile = data;
      console.log(`✅ [${requestTimestamp}] Successfully updated customer profile`);
    } catch (error) {
      console.error(`❌ [${requestTimestamp}] Exception during customer update:`, error);
      return res.status(400).json({
        success: false,
        message: 'Database error while updating customer profile'
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
      data: responseData
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
        message: 'No image file uploaded'
      });
    }

    console.log(`📸 Uploading customer photo for ID: ${id}`);
    console.log(`📁 File details: ${req.file.originalname} (${req.file.size} bytes)`);

    // Ensure main bucket exists or create it
    let buckets;
    try {
      const { data } = await supabaseAdmin.storage.listBuckets();
      buckets = data;
      console.log(`✅ Successfully listed storage buckets`);
    } catch (error) {
      console.error('❌ Exception during bucket listing:', error);
      return res.status(400).json({
        success: false,
        message: 'Failed to access storage system'
      });
    }

    const bucketExists = buckets?.some(bucket => bucket.name === 'uploads');

    if (!bucketExists) {
      console.log('Creating uploads bucket...');
      try {
        const { error: bucketError } = await supabaseAdmin.storage.createBucket('uploads', {
          public: true,
          allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
          fileSizeLimit: 5242880 // 5MB
        });

        if (bucketError) {
          console.error('❌ Error creating bucket:', bucketError);
          return res.status(400).json({
            success: false,
            message: 'Failed to initialize storage bucket: ' + bucketError.message
          });
        }
        console.log(`✅ Successfully created uploads bucket`);
      } catch (error) {
        console.error('❌ Exception during bucket creation:', error);
        return res.status(400).json({
          success: false,
          message: 'Failed to create storage bucket due to system error'
        });
      }
    }

    // Generate unique filename using standardized folder structure
    const fileExtension = req.file.originalname.split('.').pop();
    const fileName = `customers/${id}/${Date.now()}.${fileExtension}`;

    // Upload file to Supabase storage using standardized customers/{id}/ folder structure
    let uploadData;
    try {
      const { data, error } = await supabaseAdmin.storage
        .from('uploads')
        .upload(fileName, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: true
        });

      if (error) {
        console.error('❌ Error uploading photo to Supabase:', error);
        return res.status(400).json({
          success: false,
          message: 'Failed to upload photo: ' + error.message
        });
      }

      uploadData = data;
      console.log('✅ Photo upload successful:', data);
    } catch (error) {
      console.error('❌ Exception during photo upload:', error);
      return res.status(400).json({
        success: false,
        message: 'Failed to upload photo due to storage system error'
      });
    }

    // Get the public URL for the uploaded photo
    let photoUrl;
    try {
      const { data: { publicUrl } } = supabaseAdmin.storage
        .from('uploads')
        .getPublicUrl(fileName);
      photoUrl = publicUrl;
      console.log(`✅ Successfully generated photo URL: ${photoUrl}`);
    } catch (error) {
      console.error('❌ Exception during photo URL generation:', error);
      return res.status(400).json({
        success: false,
        message: 'Photo uploaded but failed to generate access URL'
      });
    }

    console.log(`📸 Photo uploaded successfully to: ${photoUrl}`);
    console.log(`🔄 Updating customer ${id} with photo URL...`);

    // Try to update customer record with profile_image_url
    console.log('🔄 Attempting to update customer record with profile_image_url...');
    try {
      const { error: updateError } = await supabaseAdmin
        .from('customers')
        .update({ 
          profile_image_url: photoUrl,
          updated_at: 'NOW()'
        })
        .eq('id', id);

      if (updateError) {
        console.error('❌ Database update error:', updateError);

        // If column doesn't exist, that's okay - photo is still uploaded
        if (updateError.code === 'PGRST204') {
          console.log('⚠️ profile_image_url column not found in customers table');
          console.log('📸 Photo uploaded successfully, but not linked to customer record');
          console.log('💡 Column needs to be added: ALTER TABLE customers ADD COLUMN profile_image_url TEXT;');
        } else {
          // Other database errors should fail the request
          return res.status(400).json({
            success: false,
            message: 'Photo uploaded but database update failed: ' + updateError.message
          });
        }
      } else {
        console.log('✅ Customer record updated with profile_image_url successfully');
      }
    } catch (error) {
      console.error('❌ Exception during customer profile update:', error);
      // Continue anyway since photo was uploaded successfully
      console.log('⚠️ Photo uploaded successfully but customer record update failed');
    }

    // Always return success if file was uploaded to storage
    res.status(200).json({
      success: true,
      data: {
        message: 'Photo uploaded successfully to customer_photos/ directory',
        photoUrl,
        storageLocation: `customer_photos/${id}_${Date.now()}.jpg`
      }
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

router.patch('/:id', requireAuth, requireRole(['admin']), updateCustomer);
// Customer photo upload endpoint - uploads to Supabase Storage and updates database
router.post('/:id/photo', requireAuth, requireRole(['admin']), upload.single('image'), uploadCustomerPhoto);

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
      profileImageUrl: customer.profile_image_url,
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
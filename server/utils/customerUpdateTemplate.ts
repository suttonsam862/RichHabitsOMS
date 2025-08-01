/**
 * Customer-Specific Database Update Template
 * 
 * This template provides guaranteed customer updates that can be reused
 * across all customer management operations
 */

import { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

// Create Supabase admin client for database operations
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

// Customer validation schema
export const customerUpdateSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Valid email is required'),
  company: z.string().optional(),
  phone: z.string().optional(),
  sport: z.string().optional(),
  organizationType: z.enum(['sports', 'business', 'education', 'nonprofit', 'government']).optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  country: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['active', 'pending', 'inactive']).optional()
});

export type CustomerUpdateData = z.infer<typeof customerUpdateSchema>;

/**
 * Guaranteed customer update handler
 */
export async function guaranteedCustomerUpdate(
  req: Request,
  res: Response
): Promise<void> {
  const customerId = req.params.id;
  
  try {
    console.log(`🔄 Starting guaranteed customer update (ID: ${customerId})`);
    console.log(`📊 Update data:`, req.body);

    // Step 1: Validate authentication
    if (!req.user) {
      console.error(`❌ Authentication failed for customer update`);
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        error: 'AUTHENTICATION_REQUIRED'
      });
    }

    console.log(`✅ User authenticated: ${req.user.email} (${req.user.role})`);

    // Step 2: Validate customer ID
    if (!customerId) {
      console.error(`❌ Missing customer ID`);
      return res.status(400).json({
        success: false,
        message: 'Customer ID is required',
        error: 'MISSING_CUSTOMER_ID'
      });
    }

    // Step 3: Schema validation
    let validatedData: CustomerUpdateData;
    try {
      validatedData = customerUpdateSchema.parse(req.body);
      console.log(`✅ Schema validation passed for customer`);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error(`❌ Schema validation failed for customer:`, error.errors);
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          error: 'VALIDATION_FAILED',
          validationErrors: error.errors.reduce((acc, err) => ({
            ...acc,
            [err.path.join('.')]: err.message
          }), {})
        });
      }
      throw error;
    }

    // Step 4: Check if customer exists
    const { data: existingCustomer, error: fetchError } = await supabaseAdmin
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single();

    if (fetchError || !existingCustomer) {
      console.error(`❌ Customer not found (ID: ${customerId}):`, fetchError);
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
        error: 'CUSTOMER_NOT_FOUND'
      });
    }

    console.log(`✅ Found existing customer:`, {
      id: existingCustomer.id,
      email: existingCustomer.email,
      company: existingCustomer.company
    });

    // Step 5: Check for email conflicts (if email is being changed)
    if (validatedData.email && validatedData.email !== existingCustomer.email) {
      const { data: emailConflict, error: emailCheckError } = await supabaseAdmin
        .from('customers')
        .select('id, email')
        .eq('email', validatedData.email)
        .neq('id', customerId);

      if (emailCheckError) {
        console.error('❌ Error checking email conflicts:', emailCheckError);
        return res.status(500).json({
          success: false,
          message: 'Failed to validate email uniqueness',
          error: 'EMAIL_VALIDATION_FAILED'
        });
      }

      if (emailConflict && emailConflict.length > 0) {
        console.error('❌ Email already exists:', validatedData.email);
        return res.status(409).json({
          success: false,
          message: 'Email address already exists',
          error: 'EMAIL_ALREADY_EXISTS'
        });
      }
    }

    // Step 6: Prepare update data
    const updateData = {
      first_name: validatedData.firstName,
      last_name: validatedData.lastName,
      email: validatedData.email,
      company: validatedData.company || '',
      phone: validatedData.phone || '',
      sport: validatedData.sport || '',
      organization_type: validatedData.organizationType || 'business',
      address: validatedData.address || '',
      city: validatedData.city || '',
      state: validatedData.state || '',
      zip: validatedData.zip || '',
      country: validatedData.country || '',
      notes: validatedData.notes || '',
      status: validatedData.status || 'active',
      updated_at: new Date().toISOString()
    };

    console.log(`🔄 Executing database update for customer...`);

    // Step 7: Perform the update
    const { data: updatedCustomer, error: updateError } = await supabaseAdmin
      .from('customers')
      .update(updateData)
      .eq('id', customerId)
      .select()
      .single();

    if (updateError) {
      console.error(`❌ Database update failed for customer:`, updateError);
      return res.status(500).json({
        success: false,
        message: `Failed to update customer: ${updateError.message}`,
        error: 'DATABASE_UPDATE_FAILED'
      });
    }

    if (!updatedCustomer) {
      console.error(`❌ Update returned no data for customer (ID: ${customerId})`);
      return res.status(500).json({
        success: false,
        message: `Update failed - no data returned`,
        error: 'NO_DATA_RETURNED'
      });
    }

    console.log(`✅ Successfully updated customer:`, {
      id: updatedCustomer.id,
      email: updatedCustomer.email,
      company: updatedCustomer.company
    });

    // Step 8: Create audit log entry
    try {
      await supabaseAdmin
        .from('audit_log')
        .insert({
          table_name: 'customers',
          entity_id: customerId,
          action: 'UPDATE',
          old_data: existingCustomer,
          new_data: updatedCustomer,
          user_id: req.user.id,
          user_email: req.user.email,
          timestamp: new Date().toISOString(),
          ip_address: req.ip,
          user_agent: req.get('User-Agent') || 'Unknown'
        });
      console.log(`✅ Audit log created for customer update`);
    } catch (auditError) {
      console.warn(`⚠️ Audit logging failed for customer:`, auditError);
      // Don't fail the request if audit logging fails
    }

    // Step 9: Return success response
    console.log(`🎉 Guaranteed customer update completed successfully`);
    
    return res.status(200).json({
      success: true,
      message: 'Customer updated successfully',
      data: {
        id: updatedCustomer.id,
        firstName: updatedCustomer.first_name,
        lastName: updatedCustomer.last_name,
        email: updatedCustomer.email,
        company: updatedCustomer.company,
        phone: updatedCustomer.phone,
        sport: updatedCustomer.sport,
        organizationType: updatedCustomer.organization_type,
        status: updatedCustomer.status,
        updatedAt: updatedCustomer.updated_at
      }
    });

  } catch (error) {
    console.error(`💥 Unexpected error during customer update:`, error);
    
    return res.status(500).json({
      success: false,
      message: `Internal server error during customer update`,
      error: 'INTERNAL_SERVER_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Guaranteed customer create handler
 */
export async function guaranteedCustomerCreate(
  req: Request,
  res: Response
): Promise<void> {
  try {
    console.log(`🔄 Starting guaranteed customer create`);
    console.log(`📊 Create data:`, req.body);

    // Authentication validation
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        error: 'AUTHENTICATION_REQUIRED'
      });
    }

    // Schema validation
    let validatedData: CustomerUpdateData;
    try {
      validatedData = customerUpdateSchema.parse(req.body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          error: 'VALIDATION_FAILED',
          validationErrors: error.errors.reduce((acc, err) => ({
            ...acc,
            [err.path.join('.')]: err.message
          }), {})
        });
      }
      throw error;
    }

    // Check for email conflicts
    const { data: emailConflict, error: emailCheckError } = await supabaseAdmin
      .from('customers')
      .select('id, email')
      .eq('email', validatedData.email);

    if (emailCheckError) {
      return res.status(500).json({
        success: false,
        message: 'Failed to validate email uniqueness',
        error: 'EMAIL_VALIDATION_FAILED'
      });
    }

    if (emailConflict && emailConflict.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Email address already exists',
        error: 'EMAIL_ALREADY_EXISTS'
      });
    }

    // Create customer data
    const createData = {
      first_name: validatedData.firstName,
      last_name: validatedData.lastName,
      email: validatedData.email,
      company: validatedData.company || '',
      phone: validatedData.phone || '',
      sport: validatedData.sport || '',
      organization_type: validatedData.organizationType || 'business',
      address: validatedData.address || '',
      city: validatedData.city || '',
      state: validatedData.state || '',
      zip: validatedData.zip || '',
      country: validatedData.country || '',
      notes: validatedData.notes || '',
      status: validatedData.status || 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: createdCustomer, error: createError } = await supabaseAdmin
      .from('customers')
      .insert(createData)
      .select()
      .single();

    if (createError || !createdCustomer) {
      console.error(`❌ Database create failed for customer:`, createError);
      return res.status(500).json({
        success: false,
        message: 'Failed to create customer',
        error: 'DATABASE_CREATE_FAILED'
      });
    }

    // Audit logging
    await supabaseAdmin
      .from('audit_log')
      .insert({
        table_name: 'customers',
        entity_id: createdCustomer.id,
        action: 'CREATE',
        new_data: createdCustomer,
        user_id: req.user.id,
        user_email: req.user.email,
        timestamp: new Date().toISOString()
      })
      .catch(console.warn);

    return res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      data: {
        id: createdCustomer.id,
        firstName: createdCustomer.first_name,
        lastName: createdCustomer.last_name,
        email: createdCustomer.email,
        company: createdCustomer.company,
        status: createdCustomer.status
      }
    });

  } catch (error) {
    console.error(`💥 Unexpected error during customer create:`, error);
    return res.status(500).json({
      success: false,
      message: `Internal server error during customer create`,
      error: 'INTERNAL_SERVER_ERROR'
    });
  }
}
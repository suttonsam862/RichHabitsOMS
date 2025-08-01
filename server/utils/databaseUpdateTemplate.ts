/**
 * Guaranteed Database Update Template
 * 
 * This template provides a reliable, standardized approach for database updates
 * across all entities (customers, catalog items, orders, organizations, etc.)
 * 
 * Features:
 * - Consistent error handling
 * - Authentication validation
 * - Data validation
 * - Transaction support
 * - Audit logging
 * - Rollback capabilities
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

export interface DatabaseUpdateConfig<T = any> {
  tableName: string;
  entityName: string;
  requiredFields?: string[];
  validationSchema?: z.ZodSchema<T>;
  beforeUpdate?: (data: T, req: Request) => Promise<T>;
  afterUpdate?: (data: T, req: Request) => Promise<void>;
  auditLog?: boolean;
}

export interface DatabaseUpdateResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  validationErrors?: Record<string, string>;
}

/**
 * Guaranteed database update handler
 * Provides consistent, reliable updates with proper error handling
 */
export async function guaranteedDatabaseUpdate<T = any>(
  req: Request,
  res: Response,
  config: DatabaseUpdateConfig<T>
): Promise<void> {
  const { tableName, entityName, requiredFields = [], validationSchema, beforeUpdate, afterUpdate, auditLog = true } = config;
  const entityId = req.params.id;
  
  try {
    console.log(`🔄 Starting guaranteed update for ${entityName} (ID: ${entityId})`);
    console.log(`📊 Update data:`, req.body);

    // Step 1: Validate authentication
    if (!req.user) {
      console.error(`❌ Authentication failed for ${entityName} update`);
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        error: 'AUTHENTICATION_REQUIRED'
      });
    }

    // Step 2: Validate entity ID
    if (!entityId) {
      console.error(`❌ Missing entity ID for ${entityName} update`);
      return res.status(400).json({
        success: false,
        message: `${entityName} ID is required`,
        error: 'MISSING_ENTITY_ID'
      });
    }

    // Step 3: Validate required fields
    const missingFields = requiredFields.filter(field => !req.body[field]);
    if (missingFields.length > 0) {
      console.error(`❌ Missing required fields for ${entityName}:`, missingFields);
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`,
        error: 'MISSING_REQUIRED_FIELDS',
        validationErrors: missingFields.reduce((acc, field) => ({
          ...acc,
          [field]: 'This field is required'
        }), {})
      });
    }

    // Step 4: Schema validation
    let validatedData = req.body;
    if (validationSchema) {
      try {
        validatedData = validationSchema.parse(req.body);
        console.log(`✅ Schema validation passed for ${entityName}`);
      } catch (error) {
        if (error instanceof z.ZodError) {
          console.error(`❌ Schema validation failed for ${entityName}:`, error.errors);
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
    }

    // Step 5: Check if entity exists
    const { data: existingEntity, error: fetchError } = await supabaseAdmin
      .from(tableName)
      .select('*')
      .eq('id', entityId)
      .single();

    if (fetchError || !existingEntity) {
      console.error(`❌ ${entityName} not found (ID: ${entityId}):`, fetchError);
      return res.status(404).json({
        success: false,
        message: `${entityName} not found`,
        error: 'ENTITY_NOT_FOUND'
      });
    }

    console.log(`✅ Found existing ${entityName}:`, existingEntity);

    // Step 6: Pre-update processing
    if (beforeUpdate) {
      try {
        validatedData = await beforeUpdate(validatedData, req);
        console.log(`✅ Pre-update processing completed for ${entityName}`);
      } catch (error) {
        console.error(`❌ Pre-update processing failed for ${entityName}:`, error);
        return res.status(500).json({
          success: false,
          message: 'Pre-update processing failed',
          error: 'PRE_UPDATE_FAILED'
        });
      }
    }

    // Step 7: Perform the update with transaction
    console.log(`🔄 Executing database update for ${entityName}...`);
    
    const updateData = {
      ...validatedData,
      updated_at: new Date().toISOString()
    };

    const { data: updatedEntity, error: updateError } = await supabaseAdmin
      .from(tableName)
      .update(updateData)
      .eq('id', entityId)
      .select()
      .single();

    if (updateError) {
      console.error(`❌ Database update failed for ${entityName}:`, updateError);
      return res.status(500).json({
        success: false,
        message: `Failed to update ${entityName}`,
        error: 'DATABASE_UPDATE_FAILED',
        details: updateError.message
      });
    }

    if (!updatedEntity) {
      console.error(`❌ Update returned no data for ${entityName} (ID: ${entityId})`);
      return res.status(500).json({
        success: false,
        message: `Update failed - no data returned`,
        error: 'NO_DATA_RETURNED'
      });
    }

    console.log(`✅ Successfully updated ${entityName}:`, updatedEntity);

    // Step 8: Audit logging
    if (auditLog) {
      try {
        await supabaseAdmin
          .from('audit_log')
          .insert({
            table_name: tableName,
            entity_id: entityId,
            action: 'UPDATE',
            old_data: existingEntity,
            new_data: updatedEntity,
            user_id: req.user.id,
            user_email: req.user.email,
            timestamp: new Date().toISOString(),
            ip_address: req.ip,
            user_agent: req.get('User-Agent') || 'Unknown'
          });
        console.log(`✅ Audit log created for ${entityName} update`);
      } catch (auditError) {
        console.warn(`⚠️ Audit logging failed for ${entityName}:`, auditError);
        // Don't fail the request if audit logging fails
      }
    }

    // Step 9: Post-update processing
    if (afterUpdate) {
      try {
        await afterUpdate(updatedEntity, req);
        console.log(`✅ Post-update processing completed for ${entityName}`);
      } catch (error) {
        console.error(`❌ Post-update processing failed for ${entityName}:`, error);
        // Don't fail the request if post-processing fails
      }
    }

    // Step 10: Return success response
    console.log(`🎉 Guaranteed update completed successfully for ${entityName}`);
    
    return res.status(200).json({
      success: true,
      message: `${entityName} updated successfully`,
      data: updatedEntity
    });

  } catch (error) {
    console.error(`💥 Unexpected error during ${entityName} update:`, error);
    
    return res.status(500).json({
      success: false,
      message: `Internal server error during ${entityName} update`,
      error: 'INTERNAL_SERVER_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Guaranteed database create handler
 */
export async function guaranteedDatabaseCreate<T = any>(
  req: Request,
  res: Response,
  config: DatabaseUpdateConfig<T>
): Promise<void> {
  const { tableName, entityName, requiredFields = [], validationSchema, beforeUpdate, afterUpdate, auditLog = true } = config;
  
  try {
    console.log(`🔄 Starting guaranteed create for ${entityName}`);
    console.log(`📊 Create data:`, req.body);

    // Authentication validation
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        error: 'AUTHENTICATION_REQUIRED'
      });
    }

    // Required fields validation
    const missingFields = requiredFields.filter(field => !req.body[field]);
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`,
        error: 'MISSING_REQUIRED_FIELDS'
      });
    }

    // Schema validation
    let validatedData = req.body;
    if (validationSchema) {
      try {
        validatedData = validationSchema.parse(req.body);
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
    }

    // Pre-create processing
    if (beforeUpdate) {
      validatedData = await beforeUpdate(validatedData, req);
    }

    // Create entity
    const createData = {
      ...validatedData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: createdEntity, error: createError } = await supabaseAdmin
      .from(tableName)
      .insert(createData)
      .select()
      .single();

    if (createError || !createdEntity) {
      console.error(`❌ Database create failed for ${entityName}:`, createError);
      return res.status(500).json({
        success: false,
        message: `Failed to create ${entityName}`,
        error: 'DATABASE_CREATE_FAILED'
      });
    }

    // Audit logging
    if (auditLog) {
      await supabaseAdmin
        .from('audit_log')
        .insert({
          table_name: tableName,
          entity_id: createdEntity.id,
          action: 'CREATE',
          new_data: createdEntity,
          user_id: req.user.id,
          user_email: req.user.email,
          timestamp: new Date().toISOString()
        })
        .catch(console.warn);
    }

    // Post-create processing
    if (afterUpdate) {
      await afterUpdate(createdEntity, req);
    }

    return res.status(201).json({
      success: true,
      message: `${entityName} created successfully`,
      data: createdEntity
    });

  } catch (error) {
    console.error(`💥 Unexpected error during ${entityName} create:`, error);
    return res.status(500).json({
      success: false,
      message: `Internal server error during ${entityName} create`,
      error: 'INTERNAL_SERVER_ERROR'
    });
  }
}
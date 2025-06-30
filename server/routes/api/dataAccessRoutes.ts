
import { Request, Response, Router } from 'express';
import { supabase } from '../../db';
import { requireAuth, requireRole } from '../auth/auth';

const router = Router();

// Data access control middleware with field-level filtering
export const dataAccessControlMiddleware = async (req: Request, res: Response, next: any) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    // Get user's data access permissions
    const { data: permissions, error } = await supabase
      .from('user_data_permissions')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching data permissions:', error);
      return res.status(500).json({ success: false, message: 'Failed to check permissions' });
    }

    // Attach permissions to request for downstream use
    (req as any).dataPermissions = permissions || {};
    
    // Check geographic restrictions
    if (permissions?.geographic_restrictions) {
      const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
      const isAllowedLocation = await checkGeographicRestrictions(clientIP, permissions.geographic_restrictions);
      
      if (!isAllowedLocation) {
        return res.status(403).json({ 
          success: false, 
          message: 'Access denied from this geographic location',
          code: 'GEO_RESTRICTED'
        });
      }
    }

    // Check time-based restrictions
    if (permissions?.time_restrictions) {
      const isAllowedTime = checkTimeRestrictions(permissions.time_restrictions);
      if (!isAllowedTime) {
        return res.status(403).json({ 
          success: false, 
          message: 'Access denied outside of allowed hours',
          code: 'TIME_RESTRICTED'
        });
      }
    }

    next();
  } catch (error) {
    console.error('Data access control error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Field-level data filtering
export const filterFieldsByPermissions = (data: any, permissions: any, tableName: string) => {
  if (!permissions?.field_level_access?.[tableName]) {
    return data;
  }

  const fieldAccess = permissions.field_level_access[tableName];
  const restrictedFields = fieldAccess.restricted_fields || [];
  const viewableFields = fieldAccess.viewable_fields;

  if (Array.isArray(data)) {
    return data.map(item => filterSingleRecord(item, restrictedFields, viewableFields));
  } else {
    return filterSingleRecord(data, restrictedFields, viewableFields);
  }
};

const filterSingleRecord = (record: any, restrictedFields: string[], viewableFields?: string[]) => {
  const filtered = { ...record };

  // Remove restricted fields
  restrictedFields.forEach(field => {
    if (field in filtered) {
      delete filtered[field];
    }
  });

  // If viewable fields are specified, only include those
  if (viewableFields && viewableFields.length > 0) {
    const result: any = {};
    viewableFields.forEach(field => {
      if (field in filtered) {
        result[field] = filtered[field];
      }
    });
    return result;
  }

  return filtered;
};

// Data masking based on sensitivity level
export const maskSensitiveData = (data: any, fieldMaskingRules: any) => {
  if (!fieldMaskingRules) return data;

  const processValue = (value: any, rules: any) => {
    if (typeof value !== 'string') return value;
    
    const { showFirst = 0, showLast = 0, maskChar = '*' } = rules;
    const length = value.length;
    
    if (length <= showFirst + showLast) {
      return maskChar.repeat(length);
    }
    
    const start = value.substring(0, showFirst);
    const end = value.substring(length - showLast);
    const middle = maskChar.repeat(length - showFirst - showLast);
    
    return start + middle + end;
  };

  if (Array.isArray(data)) {
    return data.map(item => {
      const masked = { ...item };
      Object.keys(fieldMaskingRules).forEach(field => {
        if (field in masked) {
          masked[field] = processValue(masked[field], fieldMaskingRules[field]);
        }
      });
      return masked;
    });
  } else {
    const masked = { ...data };
    Object.keys(fieldMaskingRules).forEach(field => {
      if (field in masked) {
        masked[field] = processValue(masked[field], fieldMaskingRules[field]);
      }
    });
    return masked;
  }
};

// Geographic restriction checking
const checkGeographicRestrictions = async (clientIP: string, restrictions: any): Promise<boolean> => {
  try {
    // Simple IP-based location check (in production, use proper geolocation service)
    if (restrictions.allowed_ips && restrictions.allowed_ips.length > 0) {
      return restrictions.allowed_ips.includes(clientIP);
    }
    
    if (restrictions.blocked_ips && restrictions.blocked_ips.includes(clientIP)) {
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Geographic restriction check failed:', error);
    return false;
  }
};

// Time-based restriction checking
const checkTimeRestrictions = (restrictions: any): boolean => {
  try {
    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // Check allowed days
    if (restrictions.allowed_days && restrictions.allowed_days.length > 0) {
      if (!restrictions.allowed_days.includes(currentDay)) {
        return false;
      }
    }
    
    // Check allowed hours
    if (restrictions.start_time && restrictions.end_time) {
      const startHour = parseInt(restrictions.start_time.split(':')[0]);
      const endHour = parseInt(restrictions.end_time.split(':')[0]);
      
      if (currentHour < startHour || currentHour > endHour) {
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('Time restriction check failed:', error);
    return false;
  }
};

/**
 * Get user's data access permissions
 */
export async function getUserDataPermissions(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    
    // Get comprehensive data access configuration
    const { data: permissions, error } = await supabase
      .from('user_data_permissions')
      .select(`
        *,
        field_level_permissions(*),
        geographic_restrictions(*),
        time_restrictions(*)
      `)
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch data permissions'
      });
    }

    res.json({
      success: true,
      permissions: permissions || {},
      hasCustomPermissions: !!permissions
    });
  } catch (error) {
    console.error('Error fetching user data permissions:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

/**
 * Update user's data access permissions
 */
export async function updateUserDataPermissions(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    const {
      fieldLevelAccess,
      geographicRestrictions,
      timeLimitations,
      dataClassification,
      auditRequirements
    } = req.body;

    // Validate permissions structure
    const validationErrors = validatePermissionsStructure({
      fieldLevelAccess,
      geographicRestrictions,
      timeLimitations,
      dataClassification,
      auditRequirements
    });

    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid permissions structure',
        errors: validationErrors
      });
    }

    // Update or insert data permissions
    const { data, error } = await supabase
      .from('user_data_permissions')
      .upsert({
        user_id: userId,
        field_level_access: fieldLevelAccess,
        geographic_restrictions: geographicRestrictions,
        time_restrictions: timeLimitations,
        data_classification: dataClassification,
        audit_requirements: auditRequirements,
        updated_at: new Date().toISOString(),
        updated_by: (req as any).user.id
      })
      .select()
      .single();

    if (error) {
      console.error('Error updating data permissions:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update data permissions'
      });
    }

    // Log the permission change for audit
    await logPermissionChange(userId, (req as any).user.id, 'data_permissions_updated', {
      changes: { fieldLevelAccess, geographicRestrictions, timeLimitations }
    });

    res.json({
      success: true,
      message: 'Data permissions updated successfully',
      permissions: data
    });
  } catch (error) {
    console.error('Error updating user data permissions:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

/**
 * Test data access with current permissions
 */
export async function testDataAccess(req: Request, res: Response) {
  try {
    const { userId, tableName, operation } = req.body;

    // Get user permissions
    const { data: permissions } = await supabase
      .from('user_data_permissions')
      .select('*')
      .eq('user_id', userId)
      .single();

    // Simulate data access test
    const testResult = {
      allowed: true,
      restrictions: [],
      warnings: [],
      fieldAccess: {}
    };

    // Check field-level access
    if (permissions?.field_level_access && permissions.field_level_access[tableName]) {
      const fieldAccess = permissions.field_level_access[tableName] as any;
      testResult.fieldAccess = {
        viewable: fieldAccess?.viewable_fields || [],
        editable: fieldAccess?.editable_fields || [],
        restricted: fieldAccess?.restricted_fields || []
      };
    }

    // Check time restrictions
    if (permissions?.time_restrictions) {
      const timeAllowed = checkTimeRestrictions(permissions.time_restrictions);
      if (!timeAllowed) {
        testResult.restrictions.push('Time-based access restriction would block this operation');
      }
    }

    // Check geographic restrictions
    if (permissions?.geographic_restrictions) {
      testResult.warnings.push('Geographic restrictions are configured and would be checked against user IP');
    }

    res.json({
      success: true,
      testResult,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error testing data access:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

// Validation helper
const validatePermissionsStructure = (permissions: any): string[] => {
  const errors: string[] = [];

  // Validate field level access structure
  if (permissions.fieldLevelAccess) {
    Object.entries(permissions.fieldLevelAccess).forEach(([table, config]: [string, any]) => {
      if (config.restrictedFields && !Array.isArray(config.restrictedFields)) {
        errors.push(`Invalid restrictedFields format for table ${table}`);
      }
      if (config.viewableFields && !Array.isArray(config.viewableFields)) {
        errors.push(`Invalid viewableFields format for table ${table}`);
      }
    });
  }

  // Validate time restrictions
  if (permissions.timeLimitations?.timeRestrictions) {
    const { startTime, endTime } = permissions.timeLimitations.timeRestrictions;
    if (startTime && !/^\d{2}:\d{2}$/.test(startTime)) {
      errors.push('Invalid startTime format, expected HH:MM');
    }
    if (endTime && !/^\d{2}:\d{2}$/.test(endTime)) {
      errors.push('Invalid endTime format, expected HH:MM');
    }
  }

  return errors;
};

// Audit logging helper
const logPermissionChange = async (userId: string, changedBy: string, action: string, details: any) => {
  try {
    await supabase
      .from('audit_logs')
      .insert({
        user_id: userId,
        changed_by: changedBy,
        action,
        details,
        timestamp: new Date().toISOString(),
        ip_address: 'system', // In real implementation, get from request
        user_agent: 'admin-interface'
      });
  } catch (error) {
    console.error('Failed to log permission change:', error);
  }
};

// Configure routes
router.get('/:userId/permissions', requireAuth, requireRole(['admin']), getUserDataPermissions);
router.put('/:userId/permissions', requireAuth, requireRole(['admin']), updateUserDataPermissions);
router.post('/test-access', requireAuth, requireRole(['admin']), testDataAccess);

export default router;

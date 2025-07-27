import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../../db';
import { requireAuth, requireRole } from '../auth/auth';
import crypto from 'crypto';
import * as speakeasy from 'speakeasy';

const router = Router();

/**
 * POST /api/security/mfa/setup
 * Set up multi-factor authentication for user
 */
router.post('/mfa/setup', requireAuth, async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).user;
    const { method, deviceName, phoneNumber } = req.body;

    if (!method || !deviceName) {
      return res.status(400).json({
        success: false,
        message: 'Method and device name are required'
      });
    }

    let secret: string | undefined;
    let qrCode: string | undefined;

    if (method === 'totp') {
      // Generate TOTP secret
      const totpSecret = speakeasy.generateSecret({
        name: `ThreadCraft (${currentUser.email})`,
        issuer: 'ThreadCraft'
      });
      
      secret = totpSecret.base32;
      qrCode = totpSecret.otpauth_url;
    }

    // Store MFA device
    const { data: mfaDevice, error } = await supabase
      .from('user_mfa_devices')
      .insert({
        user_id: currentUser.id,
        device_name: deviceName,
        method,
        secret,
        phone_number: phoneNumber,
        is_active: false // Will be activated after verification
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating MFA device:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to set up MFA device'
      });
    }

    res.json({
      success: true,
      data: {
        deviceId: mfaDevice.id,
        secret: method === 'totp' ? secret : undefined,
        qrCode: method === 'totp' ? qrCode : undefined
      }
    });

  } catch (error) {
    console.error('Error setting up MFA:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * POST /api/security/mfa/verify
 * Verify MFA setup with token
 */
router.post('/mfa/verify', requireAuth, async (req: Request, res: Response) => {
  try {
    const { deviceId, token } = req.body;
    const currentUser = (req as any).user;

    if (!deviceId || !token) {
      return res.status(400).json({
        success: false,
        message: 'Device ID and token are required'
      });
    }

    // Get MFA device
    const { data: mfaDevice, error: deviceError } = await supabase
      .from('user_mfa_devices')
      .select('*')
      .eq('id', deviceId)
      .eq('user_id', currentUser.id)
      .single();

    if (deviceError || !mfaDevice) {
      return res.status(404).json({
        success: false,
        message: 'MFA device not found'
      });
    }

    let isValid = false;

    if (mfaDevice.method === 'totp' && mfaDevice.secret) {
      // Verify TOTP token
      isValid = speakeasy.totp.verify({
        secret: String(mfaDevice.secret),
        encoding: 'base32',
        token: token,
        window: 2 // Allow some time skew
      });
    }

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification token'
      });
    }

    // Activate MFA device
    await supabase
      .from('user_mfa_devices')
      .update({
        is_active: true,
        last_used: new Date().toISOString()
      })
      .eq('id', deviceId);

    // Enable MFA for user
    await supabase
      .from('enhanced_user_profiles')
      .update({
        mfa_enabled: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', currentUser.id);

    // Log security event
    await supabase
      .from('security_events')
      .insert({
        user_id: currentUser.id,
        event_type: 'mfa_enabled',
        severity: 'medium',
        description: `MFA enabled with ${mfaDevice.method} method`,
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      });

    res.json({
      success: true,
      message: 'MFA enabled successfully'
    });

  } catch (error) {
    console.error('Error verifying MFA:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * GET /api/security/password-policy
 * Get current password policy
 */
router.get('/password-policy', requireAuth, async (req: Request, res: Response) => {
  try {
    const { data: policy, error } = await supabase
      .from('password_policies')
      .select('*')
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('Error fetching password policy:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch password policy'
      });
    }

    res.json({
      success: true,
      data: policy
    });

  } catch (error) {
    console.error('Error getting password policy:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * POST /api/security/validate-password
 * Validate password against policy
 */
router.post('/validate-password', requireAuth, async (req: Request, res: Response) => {
  try {
    const { password } = req.body;
    const currentUser = (req as any).user;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required'
      });
    }

    // Get current password policy
    const { data: policy } = await supabase
      .from('password_policies')
      .select('*')
      .eq('is_active', true)
      .single();

    if (!policy) {
      return res.status(500).json({
        success: false,
        message: 'No active password policy found'
      });
    }

    const violations: string[] = [];

    // Check length
    if (password.length < Number(policy.min_length)) {
      violations.push(`Password must be at least ${policy.min_length} characters long`);
    }

    // Check uppercase requirement
    if (policy.require_uppercase && !/[A-Z]/.test(password)) {
      violations.push('Password must contain at least one uppercase letter');
    }

    // Check lowercase requirement
    if (policy.require_lowercase && !/[a-z]/.test(password)) {
      violations.push('Password must contain at least one lowercase letter');
    }

    // Check numbers requirement
    if (policy.require_numbers && !/\d/.test(password)) {
      violations.push('Password must contain at least one number');
    }

    // Check special characters requirement
    if (policy.require_special_chars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      violations.push('Password must contain at least one special character');
    }

    // Check password history if preventing reuse
    if (Number(policy.prevent_reuse) > 0) {
      const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
      
      const { data: history } = await supabase
        .from('password_history')
        .select('password_hash')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })
        .limit(Number(policy.prevent_reuse));

      if (history?.some(h => h.password_hash === passwordHash)) {
        violations.push(`Password cannot be one of your last ${policy.prevent_reuse} passwords`);
      }
    }

    res.json({
      success: true,
      data: {
        isValid: violations.length === 0,
        violations,
        policy: {
          minLength: policy.min_length,
          requireUppercase: policy.require_uppercase,
          requireLowercase: policy.require_lowercase,
          requireNumbers: policy.require_numbers,
          requireSpecialChars: policy.require_special_chars,
          preventReuse: policy.prevent_reuse
        }
      }
    });

  } catch (error) {
    console.error('Error validating password:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * GET /api/security/events
 * Get security events for user or all users (admin)
 */
router.get('/events', requireAuth, async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).user;
    const { userId, page = 1, limit = 50, severity } = req.query;

    let query = supabase
      .from('security_events')
      .select(`
        *,
        enhanced_user_profiles!user_id (
          first_name,
          last_name,
          email
        )
      `)
      .order('created_at', { ascending: false });

    // If not admin, only show own events
    if (currentUser.role !== 'admin') {
      query = query.eq('user_id', currentUser.id);
    } else if (userId) {
      query = query.eq('user_id', userId);
    }

    if (severity) {
      query = query.eq('severity', severity);
    }

    const offset = (Number(page) - 1) * Number(limit);
    query = query.range(offset, offset + Number(limit) - 1);

    const { data: events, error } = await query;

    if (error) {
      console.error('Error fetching security events:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch security events'
      });
    }

    res.json({
      success: true,
      data: { events }
    });

  } catch (error) {
    console.error('Error getting security events:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * POST /api/security/permission-templates
 * Create permission template (admin only)
 */
router.post('/permission-templates', requireAuth, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const { name, description, permissions, category } = req.body;
    const currentUser = (req as any).user;

    if (!name || !permissions) {
      return res.status(400).json({
        success: false,
        message: 'Name and permissions are required'
      });
    }

    const { data: template, error } = await supabase
      .from('permission_templates')
      .insert({
        name,
        description,
        permissions,
        category,
        created_by: currentUser.id
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating permission template:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create permission template'
      });
    }

    res.status(201).json({
      success: true,
      message: 'Permission template created successfully',
      data: { template }
    });

  } catch (error) {
    console.error('Error creating permission template:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * GET /api/security/permission-templates
 * Get all permission templates
 */
router.get('/permission-templates', requireAuth, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const { category } = req.query;

    let query = supabase
      .from('permission_templates')
      .select(`
        *,
        enhanced_user_profiles!created_by (
          first_name,
          last_name,
          email
        )
      `)
      .order('created_at', { ascending: false });

    if (category) {
      query = query.eq('category', category);
    }

    const { data: templates, error } = await query;

    if (error) {
      console.error('Error fetching permission templates:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch permission templates'
      });
    }

    res.json({
      success: true,
      data: { templates }
    });

  } catch (error) {
    console.error('Error getting permission templates:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router;
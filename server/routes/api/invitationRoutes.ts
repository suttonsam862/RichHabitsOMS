
import express from 'express';
import { supabase } from '../../supabase.js';
import crypto from 'crypto';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';

const router = express.Router();

// Configure multer for tax certificate uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = 'uploads/tax-certificates';
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error as Error, '');
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF and image files are allowed.'));
    }
  }
});

// Create invitation with enhanced options
router.post('/create', async (req, res) => {
  try {
    const {
      email,
      role = 'customer',
      customMessage,
      organizationContext,
      expectedOrderVolume,
      priorityLevel = 'standard',
      expirationDays = 7
    } = req.body;

    // Verify admin/salesperson permission
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ success: false, message: 'No authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    // Get current user's role
    const { data: currentUser } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!currentUser || !['admin', 'salesperson'].includes(currentUser.role)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }

    // Check if invitation already exists
    const { data: existingInvitation } = await supabase
      .from('invitations')
      .select('id, status')
      .eq('email', email)
      .single();

    if (existingInvitation && existingInvitation.status === 'pending') {
      return res.status(400).json({ 
        success: false, 
        message: 'Pending invitation already exists for this email' 
      });
    }

    // Generate unique token
    const invitationToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expirationDays);

    // Create invitation
    const { data: invitation, error } = await supabase
      .from('invitations')
      .insert({
        email,
        token: invitationToken,
        role,
        invited_by: user.id,
        expires_at: expiresAt.toISOString(),
        custom_message: customMessage,
        organization_context: organizationContext,
        expected_order_volume: expectedOrderVolume,
        priority_level: priorityLevel,
        metadata: {
          created_by: user.email,
          invitation_type: 'comprehensive_onboarding'
        }
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating invitation:', error);
      return res.status(400).json({ success: false, message: error.message });
    }

    // Initialize onboarding progress
    await supabase
      .from('onboarding_progress')
      .insert({
        invitation_id: invitation.id,
        email: email,
        current_step: 1,
        total_steps: 8,
        step_data: {}
      });

    res.json({
      success: true,
      message: 'Invitation created successfully',
      data: {
        id: invitation.id,
        email: invitation.email,
        token: invitation.token,
        expires_at: invitation.expires_at,
        registration_url: `${process.env.CLIENT_URL || 'http://localhost:3000'}/register?token=${invitation.token}`
      }
    });

  } catch (error) {
    console.error('Error creating invitation:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Get invitation details by token
router.get('/token/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const { data: invitation, error } = await supabase
      .from('invitations')
      .select(`
        *,
        onboarding_progress (*)
      `)
      .eq('token', token)
      .single();

    if (error || !invitation) {
      return res.status(404).json({ success: false, message: 'Invalid invitation token' });
    }

    // Check if invitation is expired
    if (new Date(invitation.expires_at) < new Date()) {
      return res.status(400).json({ success: false, message: 'Invitation has expired' });
    }

    if (invitation.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Invitation has already been used' });
    }

    res.json({
      success: true,
      data: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        custom_message: invitation.custom_message,
        organization_context: invitation.organization_context,
        expected_order_volume: invitation.expected_order_volume,
        onboarding_progress: invitation.onboarding_progress[0] || null
      }
    });

  } catch (error) {
    console.error('Error fetching invitation:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Save onboarding step data
router.post('/onboarding/step', async (req, res) => {
  try {
    const { 
      token, 
      step, 
      stepData, 
      isComplete = false 
    } = req.body;

    // Verify invitation token
    const { data: invitation } = await supabase
      .from('invitations')
      .select('id, email')
      .eq('token', token)
      .single();

    if (!invitation) {
      return res.status(404).json({ success: false, message: 'Invalid invitation token' });
    }

    // Get current onboarding progress
    const { data: progress } = await supabase
      .from('onboarding_progress')
      .select('*')
      .eq('invitation_id', invitation.id)
      .single();

    if (!progress) {
      return res.status(404).json({ success: false, message: 'Onboarding progress not found' });
    }

    // Update step data
    const currentStepData = progress.step_data || {};
    const completedSteps = progress.completed_steps || [];

    currentStepData[`step_${step}`] = stepData;

    if (isComplete && !completedSteps.includes(step)) {
      completedSteps.push(step);
    }

    const nextStep = isComplete ? Math.max(step + 1, progress.current_step) : progress.current_step;

    // Update onboarding progress
    const { error } = await supabase
      .from('onboarding_progress')
      .update({
        current_step: nextStep,
        step_data: currentStepData,
        completed_steps: completedSteps,
        last_activity: new Date().toISOString(),
        ...(completedSteps.length === progress.total_steps && { completed_at: new Date().toISOString() })
      })
      .eq('invitation_id', invitation.id);

    if (error) {
      console.error('Error updating onboarding progress:', error);
      return res.status(400).json({ success: false, message: error.message });
    }

    res.json({
      success: true,
      message: 'Onboarding step saved successfully',
      data: {
        current_step: nextStep,
        completed_steps: completedSteps,
        is_complete: completedSteps.length === progress.total_steps
      }
    });

  } catch (error) {
    console.error('Error saving onboarding step:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Save organization profile
router.post('/onboarding/organization', async (req, res) => {
  try {
    const { token, organizationData } = req.body;

    // Verify invitation token
    const { data: invitation } = await supabase
      .from('invitations')
      .select('id')
      .eq('token', token)
      .single();

    if (!invitation) {
      return res.status(404).json({ success: false, message: 'Invalid invitation token' });
    }

    // Save organization profile
    const { error } = await supabase
      .from('organization_profiles')
      .upsert({
        invitation_id: invitation.id,
        ...organizationData
      });

    if (error) {
      console.error('Error saving organization profile:', error);
      return res.status(400).json({ success: false, message: error.message });
    }

    res.json({
      success: true,
      message: 'Organization profile saved successfully'
    });

  } catch (error) {
    console.error('Error saving organization profile:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Save order preferences
router.post('/onboarding/preferences', async (req, res) => {
  try {
    const { token, preferences } = req.body;

    // Verify invitation token
    const { data: invitation } = await supabase
      .from('invitations')
      .select('id')
      .eq('token', token)
      .single();

    if (!invitation) {
      return res.status(404).json({ success: false, message: 'Invalid invitation token' });
    }

    // Save order preferences
    const { error } = await supabase
      .from('order_preferences')
      .upsert({
        invitation_id: invitation.id,
        ...preferences
      });

    if (error) {
      console.error('Error saving order preferences:', error);
      return res.status(400).json({ success: false, message: error.message });
    }

    res.json({
      success: true,
      message: 'Order preferences saved successfully'
    });

  } catch (error) {
    console.error('Error saving order preferences:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Upload tax exemption certificate
router.post('/onboarding/tax-certificate', upload.single('certificate'), async (req, res) => {
  try {
    const { 
      token, 
      certificate_type, 
      certificate_number, 
      issuing_state, 
      expiration_date 
    } = req.body;

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    // Verify invitation token
    const { data: invitation } = await supabase
      .from('invitations')
      .select('id')
      .eq('token', token)
      .single();

    if (!invitation) {
      return res.status(404).json({ success: false, message: 'Invalid invitation token' });
    }

    // Save tax certificate info
    const { error } = await supabase
      .from('tax_exemption_certificates')
      .insert({
        invitation_id: invitation.id,
        certificate_type,
        certificate_number,
        issuing_state,
        expiration_date,
        file_path: req.file.path,
        original_filename: req.file.originalname,
        file_size_bytes: req.file.size,
        mime_type: req.file.mimetype
      });

    if (error) {
      console.error('Error saving tax certificate:', error);
      return res.status(400).json({ success: false, message: error.message });
    }

    res.json({
      success: true,
      message: 'Tax exemption certificate uploaded successfully'
    });

  } catch (error) {
    console.error('Error uploading tax certificate:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Complete registration and create user account
router.post('/complete-registration', async (req, res) => {
  try {
    const { 
      token, 
      password, 
      firstName, 
      lastName, 
      phone,
      communicationPreferences 
    } = req.body;

    // Verify invitation token
    const { data: invitation } = await supabase
      .from('invitations')
      .select('*')
      .eq('token', token)
      .eq('status', 'pending')
      .single();

    if (!invitation) {
      return res.status(404).json({ success: false, message: 'Invalid or expired invitation' });
    }

    // Create user account in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: invitation.email,
      password: password,
      email_confirm: true
    });

    if (authError) {
      console.error('Error creating user account:', authError);
      return res.status(400).json({ success: false, message: authError.message });
    }

    // Create user profile
    const { error: profileError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email: invitation.email,
        first_name: firstName,
        last_name: lastName,
        phone: phone,
        role: invitation.role,
        created_at: new Date().toISOString()
      });

    if (profileError) {
      console.error('Error creating user profile:', profileError);
      return res.status(400).json({ success: false, message: profileError.message });
    }

    // Update invitation status
    await supabase
      .from('invitations')
      .update({
        status: 'accepted',
        used_at: new Date().toISOString()
      })
      .eq('id', invitation.id);

    // Link organization and preferences to user
    await supabase
      .from('organization_profiles')
      .update({ user_id: authData.user.id })
      .eq('invitation_id', invitation.id);

    await supabase
      .from('order_preferences')
      .update({ user_id: authData.user.id })
      .eq('invitation_id', invitation.id);

    await supabase
      .from('tax_exemption_certificates')
      .update({ user_id: authData.user.id })
      .eq('invitation_id', invitation.id);

    // Save communication preferences
    if (communicationPreferences) {
      await supabase
        .from('communication_preferences')
        .insert({
          user_id: authData.user.id,
          invitation_id: invitation.id,
          ...communicationPreferences
        });
    }

    res.json({
      success: true,
      message: 'Registration completed successfully',
      data: {
        user_id: authData.user.id,
        email: invitation.email,
        role: invitation.role
      }
    });

  } catch (error) {
    console.error('Error completing registration:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Admin: List all invitations with detailed info
router.get('/admin/list', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ success: false, message: 'No authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    // Verify admin permission
    const { data: currentUser } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!currentUser || !['admin', 'salesperson'].includes(currentUser.role)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }

    const { data: invitations, error } = await supabase
      .from('invitations')
      .select(`
        *,
        onboarding_progress (*),
        organization_profiles (*),
        order_preferences (*),
        tax_exemption_certificates (*)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching invitations:', error);
      return res.status(400).json({ success: false, message: error.message });
    }

    res.json({
      success: true,
      data: invitations
    });

  } catch (error) {
    console.error('Error fetching invitations list:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

export default router;

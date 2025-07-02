import { Router } from 'express';
import { supabase } from '../../db';
import crypto from 'crypto';
import { authenticateUser, requireRole } from '../../middleware/adminAuth';

const router = Router();

// Create invitation (admin only)
router.post('/invitations', authenticateUser, requireRole(['admin']), async (req, res) => {
  try {
    const { email, firstName, lastName, role = 'customer' } = req.body;

    if (!email || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: 'Email, first name, and last name are required'
      });
    }

    // Check if user already exists
    const supabaseAdmin = supabase.auth.admin;
    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = users?.users?.find(user => user.email === email);

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Check if invitation already exists
    const { data: existingInvitation } = await supabase
      .from('user_invitations')
      .select('*')
      .eq('email', email)
      .eq('status', 'pending')
      .single();

    if (existingInvitation) {
      return res.status(400).json({
        success: false,
        message: 'Pending invitation already exists for this email'
      });
    }

    // Generate invitation token
    const invitationToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Create invitation record
    const { data: invitation, error } = await supabase
      .from('user_invitations')
      .insert({
        email,
        first_name: firstName,
        last_name: lastName,
        role,
        invitation_token: invitationToken,
        expires_at: expiresAt.toISOString(),
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating invitation:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create invitation'
      });
    }

    // TODO: Send invitation email here
    const invitationUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/register?token=${invitationToken}`;

    console.log(`✅ Invitation created for ${email}`);
    console.log(`Invitation URL: ${invitationUrl}`);

    res.status(201).json({
      success: true,
      message: 'Invitation created successfully',
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expires_at: invitation.expires_at,
        invitation_url: invitationUrl
      }
    });

  } catch (error) {
    console.error('Error creating invitation:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get all invitations (admin only)
router.get('/invitations', authenticateUser, requireRole(['admin']), async (req, res) => {
  try {
    const { data: invitations, error } = await supabase
      .from('user_invitations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching invitations:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch invitations'
      });
    }

    res.json({
      success: true,
      invitations
    });

  } catch (error) {
    console.error('Error fetching invitations:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Verify invitation token
router.get('/invitations/verify/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const { data: invitation, error } = await supabase
      .from('user_invitations')
      .select('*')
      .eq('invitation_token', token)
      .eq('status', 'pending')
      .single();

    if (error || !invitation) {
      return res.status(404).json({
        success: false,
        message: 'Invalid or expired invitation'
      });
    }

    // Check if invitation has expired
    if (new Date() > new Date(invitation.expires_at)) {
      await supabase
        .from('user_invitations')
        .update({ status: 'expired' })
        .eq('invitation_token', token);

      return res.status(400).json({
        success: false,
        message: 'Invitation has expired'
      });
    }

    res.json({
      success: true,
      invitation: {
        email: invitation.email,
        firstName: invitation.first_name,
        lastName: invitation.last_name,
        role: invitation.role
      }
    });

  } catch (error) {
    console.error('Error verifying invitation:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Cancel invitation (admin only)
router.delete('/invitations/:id', authenticateUser, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('user_invitations')
      .update({ status: 'cancelled' })
      .eq('id', id);

    if (error) {
      console.error('Error cancelling invitation:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to cancel invitation'
      });
    }

    res.json({
      success: true,
      message: 'Invitation cancelled successfully'
    });

  } catch (error) {
    console.error('Error cancelling invitation:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router;
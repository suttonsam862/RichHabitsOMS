import { randomBytes } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { sendEmail } from './email';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;

// Create Supabase admin client for user management
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const APP_URL = process.env.APP_URL || `http://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;

/**
 * Generate a secure setup token for inviting new users
 * Using Supabase Auth for modern user management
 */
export async function generateSetupToken(email: string): Promise<string> {
  // Generate a random invitation token
  const token = randomBytes(32).toString('hex');
  
  try {
    // Create an invitation in Supabase Auth
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: {
        invitation_token: token,
        invitation_expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      }
    });
    
    if (error) {
      console.error('Error creating user invitation:', error);
      throw error;
    }
    
    return token;
  } catch (error) {
    console.error('Error generating setup token:', error);
    throw error;
  }
}

/**
 * Verify if a setup token is valid
 * Using Supabase Auth for verification
 */
export async function verifySetupToken(token: string): Promise<string | null> {
  try {
    // Query users by invitation token in metadata
    const { data: users, error } = await supabaseAdmin.auth.admin.listUsers();
    
    if (error) {
      console.error('Error verifying setup token:', error);
      return null;
    }
    
    // Find user with matching invitation token
    const user = users.users.find(u => 
      u.user_metadata?.invitation_token === token &&
      new Date(u.user_metadata?.invitation_expires) > new Date()
    );
    
    return user ? user.id : null;
  } catch (error) {
    console.error('Error verifying setup token:', error);
    return null;
  }
}

/**
 * Complete the user setup process
 * Using Supabase Auth for password setting
 */
export async function completeSetup(userId: string, password: string): Promise<boolean> {
  try {
    // Update user password using Supabase Admin API
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: password,
      user_metadata: {
        setup_completed: true,
        invitation_token: null,
        invitation_expires: null
      }
    });
    
    if (error) {
      console.error('Error completing setup:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error completing setup:', error);
    return false;
  }
}

/**
 * Send a welcome email to a new customer with setup instructions
 */
export async function sendWelcomeEmail(email: string, name: string, token: string): Promise<boolean> {
  const setupUrl = `${APP_URL}/setup-password?token=${token}`;
  
  const emailContent = {
    to: email,
    subject: 'Welcome to Our Custom Clothing Platform - Set Up Your Account',
    text: `
Hello ${name},

Welcome to our custom clothing order management platform! 

An account has been created for you. To complete your registration and set up your password, please visit:

${setupUrl}

This link will expire in 7 days.

If you have any questions, please contact our support team.

Thank you,
The Custom Clothing Team
    `,
    html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #333;">Welcome to Our Custom Clothing Platform!</h2>
  <p>Hello ${name},</p>
  <p>An account has been created for you on our custom clothing order management platform.</p>
  <p>To complete your registration and set up your password, please click the button below:</p>
  <p style="text-align: center; margin: 30px 0;">
    <a href="${setupUrl}" style="background-color: #4F46E5; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">Set Up Your Password</a>
  </p>
  <p>Or copy and paste this URL into your browser: <br> <a href="${setupUrl}">${setupUrl}</a></p>
  <p><strong>This link will expire in 7 days.</strong></p>
  <p>If you have any questions, please contact our support team.</p>
  <p>Thank you,<br>The Custom Clothing Team</p>
</div>
    `
  };
  
  return await sendEmail(emailContent);
}
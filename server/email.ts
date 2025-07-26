/**
 * Email service for sending notifications
 */
import SendGrid from '@sendgrid/mail';

// Initialize SendGrid if API key is available
if (process.env.SENDGRID_API_KEY) {
  SendGrid.setApiKey(process.env.SENDGRID_API_KEY);
}

interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
  from?: string;
}

/**
 * Send email using SendGrid with proper error handling
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const { to, subject, text, html, from = 'samsutton@rich-habits.com' } = options;
  
  // Check if SendGrid is configured
  if (!process.env.SENDGRID_API_KEY) {
    console.log('⚠️ SendGrid API key not configured. Please add SENDGRID_API_KEY to environment variables.');
    console.log('Email would have been sent:', { to, subject });
    return false;
  }
  
  try {
    const emailData = {
      to,
      from,
      subject,
      text,
      html: html || text.replace(/\n/g, '<br>')
    };
    
    await SendGrid.send(emailData);
    console.log(`✅ Email sent successfully to ${to}`);
    return true;
    
  } catch (error: any) {
    console.error('❌ Failed to send email:', error);
    
    if (error.response?.body?.errors) {
      console.error('SendGrid errors:', error.response.body.errors);
    }
    
    // If SendGrid fails, we should still indicate failure so the user knows
    return false;
  }
}

/**
 * Generate a user invitation email template
 */
export function getUserInviteEmailTemplate(
  email: string,
  firstName: string,
  lastName: string,
  invitationToken: string,
  temporaryPassword?: string
): EmailOptions {
  const subject = '🎉 Welcome to ThreadCraft - Your Account is Ready';
  const baseUrl = process.env.BASE_URL || `https://${process.env.REPLIT_DEV_DOMAIN}` || 'http://localhost:5000';
  const loginUrl = `${baseUrl}/login`;
  
  const text = `
Hello ${firstName} ${lastName},

Welcome to ThreadCraft! Your account has been created and you're ready to get started.

LOGIN DETAILS:
Email: ${email}
${temporaryPassword ? `Temporary Password: ${temporaryPassword}` : 'Password: Use the password provided separately'}

Please visit: ${loginUrl}

IMPORTANT SECURITY NOTE:
${temporaryPassword ? 'Please change your temporary password after your first login for security.' : 'Make sure to keep your login credentials secure.'}

WHAT YOU CAN DO NEXT:
• Access your personalized dashboard
• Manage custom clothing orders  
• Track order progress in real-time
• Collaborate with your team

If you have any questions or need assistance, please contact our support team.

Best regards,
The ThreadCraft Team
`;

  const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #1f2937 0%, #111827 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 15px 0; }
        .credentials { background: #e5e7eb; padding: 15px; border-radius: 6px; margin: 15px 0; }
        .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 15px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Welcome to ThreadCraft</h1>
            <p>Your account is ready to use!</p>
        </div>
        <div class="content">
            <p>Hello <strong>${firstName} ${lastName}</strong>,</p>
            
            <p>Welcome to ThreadCraft! Your account has been created and you're ready to get started.</p>
            
            <div class="credentials">
                <h3>🔐 LOGIN DETAILS:</h3>
                <p><strong>Email:</strong> ${email}</p>
                ${temporaryPassword ? `<p><strong>Temporary Password:</strong> ${temporaryPassword}</p>` : '<p><strong>Password:</strong> Use the password provided separately</p>'}
            </div>
            
            <p style="text-align: center;">
                <a href="${loginUrl}" class="button">Login to ThreadCraft</a>
            </p>
            
            ${temporaryPassword ? '<div class="warning"><strong>⚠️ IMPORTANT SECURITY NOTE:</strong><br>Please change your temporary password after your first login for security.</div>' : ''}
            
            <h3>🚀 WHAT YOU CAN DO NEXT:</h3>
            <ul>
                <li>Access your personalized dashboard</li>
                <li>Manage custom clothing orders</li>
                <li>Track order progress in real-time</li>
                <li>Collaborate with your team</li>
            </ul>
            
            <p>If you have any questions or need assistance, please contact our support team.</p>
            
            <p>Best regards,<br><strong>The ThreadCraft Team</strong></p>
        </div>
    </div>
</body>
</html>
`;

  return {
    to: email,
    subject,
    text,
    html
  };
}

/**
 * Generate a customer invitation email
 */
export function getCustomerInviteEmailTemplate(
  email: string,
  firstName: string,
  lastName: string,
  invitationToken: string
): EmailOptions {
  const subject = '🎉 Welcome to ThreadCraft - Complete Your Account Setup';
  const baseUrl = process.env.BASE_URL || `https://${process.env.REPLIT_DEV_DOMAIN}` || 'http://localhost:5000';
  const registerUrl = `${baseUrl}/register?invite=${invitationToken}`;
  
  const text = `
Hello ${firstName} ${lastName},

Welcome to ThreadCraft! You've been invited to join our custom clothing management platform.

To complete your account setup and create your password, please visit:
${registerUrl}

This secure link will allow you to:
• Set your account password
• Access your personalized dashboard  
• Start managing your custom clothing orders
• Track order progress in real-time

IMPORTANT: This link will expire in 7 days for security reasons.

If you have any questions or need assistance, please contact our support team.

Best regards,
The ThreadCraft Team
`;

  const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #1f2937 0%, #111827 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 15px 0; }
        .expiry { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 15px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Welcome to ThreadCraft</h1>
            <p>You're invited to join our platform!</p>
        </div>
        <div class="content">
            <p>Hello <strong>${firstName} ${lastName}</strong>,</p>
            
            <p>Welcome to ThreadCraft! You've been invited to join our custom clothing management platform.</p>
            
            <p style="text-align: center;">
                <a href="${registerUrl}" class="button">Complete Account Setup</a>
            </p>
            
            <h3>🚀 This secure link will allow you to:</h3>
            <ul>
                <li>Set your account password</li>
                <li>Access your personalized dashboard</li>
                <li>Start managing your custom clothing orders</li>
                <li>Track order progress in real-time</li>
            </ul>
            
            <div class="expiry">
                <strong>⏰ IMPORTANT:</strong> This link will expire in 7 days for security reasons.
            </div>
            
            <p>If you have any questions or need assistance, please contact our support team.</p>
            
            <p>Best regards,<br><strong>The ThreadCraft Team</strong></p>
        </div>
    </div>
</body>
</html>
`;

  return {
    to: email,
    subject,
    text,
    html
  };
}
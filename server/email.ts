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
 * Generate a customer invitation email
 */
export function getCustomerInviteEmailTemplate(
  email: string,
  firstName: string,
  lastName: string,
  setupToken: string
): EmailOptions {
  const subject = '🎉 Welcome to Custom Clothing - Complete Your Account Setup';
  const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
  const setupUrl = `${baseUrl}/setup-password?token=${setupToken}&email=${encodeURIComponent(email)}`;
  
  const text = `
Hello ${firstName} ${lastName},

Welcome to Custom Clothing! You've been invited to join our custom clothing management platform.

To complete your account setup and create your password, please visit:
${setupUrl}

This secure link will allow you to:
• Set your account password
• Access your personalized dashboard  
• Start managing your custom clothing orders
• Track order progress in real-time

IMPORTANT: This link will expire in 7 days for security reasons.

If you have any questions or need assistance, please contact our support team.

Best regards,
The Custom Clothing Team
`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Custom Clothing</title>
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
      line-height: 1.6; 
      color: #333; 
      background-color: #f8fafc;
      margin: 0;
      padding: 20px;
    }
    .container { 
      max-width: 600px; 
      margin: 0 auto; 
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 10px 25px rgba(0,0,0,0.1);
    }
    .header { 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
      color: white; 
      padding: 40px 30px; 
      text-align: center; 
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 600;
    }
    .content { 
      padding: 40px 30px; 
    }
    .content h2 {
      color: #2d3748;
      margin-top: 0;
      font-size: 24px;
    }
    .content p {
      color: #4a5568;
      margin-bottom: 16px;
    }
    .button { 
      display: inline-block; 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white; 
      padding: 16px 32px; 
      text-decoration: none; 
      border-radius: 8px; 
      margin: 24px 0;
      font-weight: 600;
      font-size: 16px;
      transition: transform 0.2s ease;
    }
    .button:hover {
      transform: translateY(-1px);
    }
    .features {
      background: #f7fafc;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .features ul {
      margin: 0;
      padding-left: 20px;
      color: #4a5568;
    }
    .features li {
      margin-bottom: 8px;
    }
    .footer { 
      text-align: center; 
      padding: 20px 30px;
      background: #f8fafc;
      color: #718096; 
      font-size: 14px; 
      border-top: 1px solid #e2e8f0;
    }
    .warning {
      background: #fff5f5;
      border: 1px solid #fed7d7;
      color: #c53030;
      padding: 12px;
      border-radius: 6px;
      margin: 16px 0;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Welcome to Custom Clothing!</h1>
    </div>
    <div class="content">
      <h2>Hello ${firstName} ${lastName},</h2>
      <p>Welcome to Custom Clothing! You've been invited to join our custom clothing management platform.</p>
      
      <p>To complete your account setup and start using your personalized dashboard, please click the button below:</p>
      
      <div style="text-align: center;">
        <a href="${setupUrl}" class="button">Complete Account Setup</a>
      </div>
      
      <div class="features">
        <p><strong>This secure link will allow you to:</strong></p>
        <ul>
          <li>Set your account password</li>
          <li>Access your personalized dashboard</li>
          <li>Start managing your custom clothing orders</li>
          <li>Track order progress in real-time</li>
        </ul>
      </div>
      
      <div class="warning">
        <strong>⚠️ Important:</strong> This link will expire in 7 days for security reasons. Please complete your setup soon!
      </div>
      
      <p>If you have any questions or need assistance, please contact our support team.</p>
      
      <p>Best regards,<br><strong>The Custom Clothing Team</strong></p>
    </div>
    <div class="footer">
      <p>This email was sent because you were invited to join Custom Clothing.</p>
      <p>If you believe this was sent in error, please contact our support team.</p>
      <p>Link: ${setupUrl}</p>
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
 * Generate an order status change notification email
 */
export function getOrderStatusChangeEmailTemplate(
  email: string,
  firstName: string,
  orderNumber: string,
  status: string,
  statusMessage: string,
  orderDetailsUrl: string
): EmailOptions {
  const subject = `Order #${orderNumber} Status Update: ${status}`;
  
  const text = `
Hello ${firstName},

Your order #${orderNumber} status has been updated to: ${status}

${statusMessage}

View your order details here: ${orderDetailsUrl}

If you have any questions, please contact our support team.

Thank you,
Custom Clothing Management Team
`;

  return {
    to: email,
    subject,
    text
  };
}

/**
 * Generate a new message notification email
 */
export function getNewMessageEmailTemplate(
  email: string,
  firstName: string,
  senderName: string,
  messagePreview: string,
  threadUrl: string
): EmailOptions {
  const subject = `New Message from ${senderName}`;
  
  const text = `
Hello ${firstName},

You have received a new message from ${senderName}.

Message Preview:
"${messagePreview}"

View and reply to this message: ${threadUrl}

Thank you,
Custom Clothing Management Team
`;

  return {
    to: email,
    subject,
    text
  };
}

/**
 * Generate a design approval email
 */
export function getDesignApprovalEmailTemplate(
  email: string,
  firstName: string,
  designName: string,
  designerName: string,
  designPreviewUrl: string,
  approvalUrl: string
): EmailOptions {
  const subject = `New Design Ready for Approval: ${designName}`;
  
  const text = `
Hello ${firstName},

A new design "${designName}" from ${designerName} is ready for your review and approval.

Please review the design and provide your feedback: ${approvalUrl}

Thank you,
Custom Clothing Management Team
`;

  return {
    to: email,
    subject,
    text
  };
}

/**
 * Generate a payment receipt email
 */
export function getPaymentReceiptEmailTemplate(
  email: string,
  firstName: string,
  orderNumber: string,
  amount: string,
  orderItems: string[],
  receiptUrl: string
): EmailOptions {
  const subject = `Payment Receipt for Order #${orderNumber}`;
  
  const itemsList = orderItems.map(item => `- ${item}`).join('\n');
  
  const text = `
Hello ${firstName},

Thank you for your payment of ${amount} for order #${orderNumber}.

Order Items:
${itemsList}

View and download your receipt: ${receiptUrl}

Thank you for your business,
Custom Clothing Management Team
`;

  return {
    to: email,
    subject,
    text
  };
}
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
 * Send email using SendGrid if API key is available, otherwise mock
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const { to, subject, text, html, from = 'noreply@yourclothingapp.com' } = options;
  
  // Check if SendGrid is configured
  if (!process.env.SENDGRID_API_KEY) {
    console.log('SendGrid API key not found. Email would have been sent:');
    console.log({
      to,
      from,
      subject,
      text: text.substring(0, 100) + (text.length > 100 ? '...' : '')
    });
    return true; // Mock success
  }
  
  try {
    await SendGrid.send({
      to,
      from,
      subject,
      text,
      html: html || text
    });
    
    console.log(`Email sent successfully to ${to}`);
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
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
  inviteUrl: string
): EmailOptions {
  const subject = 'Welcome to Your Custom Clothing Account';
  
  const text = `
Hello ${firstName},

You've been invited to create an account with our Custom Clothing Management System.

Please click the link below to set up your account:
${inviteUrl}

This link will expire in 24 hours.

If you have any questions, please contact our support team.

Thank you,
Custom Clothing Management Team
`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; margin-bottom: 30px; }
    .button { display: inline-block; background-color: #4f46e5; color: white; text-decoration: none; padding: 12px 24px; border-radius: 4px; }
    .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to Your Custom Clothing Account</h1>
    </div>
    
    <p>Hello ${firstName},</p>
    
    <p>You've been invited to create an account with our Custom Clothing Management System.</p>
    
    <p>Please click the button below to set up your account:</p>
    
    <p style="text-align: center; margin: 30px 0;">
      <a href="${inviteUrl}" class="button">Set Up Your Account</a>
    </p>
    
    <p>This link will expire in 24 hours.</p>
    
    <p>If you have any questions, please contact our support team.</p>
    
    <p>Thank you,<br>Custom Clothing Management Team</p>
    
    <div class="footer">
      <p>If the button doesn't work, copy and paste this link in your browser: ${inviteUrl}</p>
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
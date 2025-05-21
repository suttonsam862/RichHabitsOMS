// Simple email service abstraction
// This could be replaced with any email service implementation in the future
// Currently operates in "mock" mode by default, just logging what would be sent

interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
  from?: string;
}

/**
 * Mock email sending function
 * In a production environment, this would connect to a real email service
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    // Just log the email details for now
    console.log('Email would be sent:', {
      to: options.to,
      subject: options.subject,
      textLength: options.text.length,
      hasHtml: !!options.html
    });
    
    // Always return true in mock mode since there's no actual sending
    return true;
  } catch (error) {
    console.error('Email service error:', error);
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
  inviteUrl: string,
  message?: string
): EmailOptions {
  const subject = 'You\'re invited to ThreadCraft';
  
  const text = `Hi ${firstName},
  
You've been invited to join ThreadCraft, your custom clothing management platform.

${message ? `Message from your contact: "${message}"` : ''}

Click the link below to set up your account:
${inviteUrl}

This invitation link will expire in 7 days.

If you have any questions, please contact our support team.

Best regards,
The ThreadCraft Team`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
    .container { padding: 20px; }
    .header { text-align: center; margin-bottom: 30px; }
    .logo { font-size: 24px; font-weight: bold; color: #4F46E5; }
    .button { display: inline-block; background-color: #4F46E5; color: white; text-decoration: none; padding: 12px 24px; border-radius: 4px; margin: 20px 0; }
    .footer { margin-top: 40px; font-size: 14px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">ThreadCraft</div>
    </div>
    
    <p>Hi ${firstName},</p>
    
    <p>You've been invited to join <strong>ThreadCraft</strong>, your custom clothing management platform.</p>
    
    ${message ? `<p><em>Message from your contact:</em> "${message}"</p>` : ''}
    
    <p>Click the button below to set up your account:</p>
    
    <div style="text-align: center;">
      <a href="${inviteUrl}" class="button">Create Your Account</a>
    </div>
    
    <p><small>This invitation link will expire in 7 days.</small></p>
    
    <p>If you have any questions, please contact our support team.</p>
    
    <div class="footer">
      <p>Best regards,<br>The ThreadCraft Team</p>
    </div>
  </div>
</body>
</html>
`;

  return {
    to: email,
    subject,
    text,
    html,
  };
}

/**
 * Generate an order status change notification email
 */
export function getOrderStatusChangeEmailTemplate(
  orderNumber: string,
  newStatus: string,
  customerName: string
): EmailOptions {
  const subject = `Order #${orderNumber} Status Update`;
  
  const text = `Hi ${customerName},

The status of your order #${orderNumber} has been updated to: ${newStatus}

You can view your order details and track its progress in your customer dashboard.

Thank you for choosing ThreadCraft for your custom clothing needs.

Best regards,
The ThreadCraft Team`;

  return {
    to: '', // This should be set when calling this function
    subject,
    text
  };
}

/**
 * Generate a new message notification email
 */
export function getNewMessageEmailTemplate(
  senderName: string,
  messageContent: string
): EmailOptions {
  const subject = `New Message from ${senderName}`;
  
  const text = `You have received a new message from ${senderName}:

"${messageContent}"

You can reply to this message from your ThreadCraft dashboard.

Best regards,
The ThreadCraft Team`;

  return {
    to: '', // This should be set when calling this function
    subject,
    text
  };
}

/**
 * Generate a design approval email
 */
export function getDesignApprovalEmailTemplate(
  orderNumber: string,
  customerName: string
): EmailOptions {
  const subject = `Design Ready for Review - Order #${orderNumber}`;
  
  const text = `Hi ${customerName},

Great news! The design for your order #${orderNumber} is now ready for your review and approval.

Please log in to your ThreadCraft account to view and approve the design. Your feedback is important to us!

Best regards,
The ThreadCraft Design Team`;

  return {
    to: '', // This should be set when calling this function
    subject,
    text
  };
}

/**
 * Generate a payment receipt email
 */
export function getPaymentReceiptEmailTemplate(
  orderNumber: string,
  amount: string,
  customerName: string
): EmailOptions {
  const subject = `Payment Receipt - Order #${orderNumber}`;
  
  const text = `Hi ${customerName},

Thank you for your payment of $${amount} for order #${orderNumber}.

This email serves as your receipt. Your order is now being processed.

Thank you for choosing ThreadCraft for your custom clothing needs.

Best regards,
The ThreadCraft Team`;

  return {
    to: '', // This should be set when calling this function
    subject,
    text
  };
}
import sgMail from '@sendgrid/mail';

// Set SendGrid API key from environment variables
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  console.log('SendGrid API key configured successfully');
} else {
  console.warn('SENDGRID_API_KEY not found in environment variables');
}

/**
 * Send an email using SendGrid
 * @param to Recipient email address
 * @param subject Email subject
 * @param text Plain text content
 * @param html HTML content (optional)
 * @returns Promise that resolves to the SendGrid response
 */
export async function sendEmail(to: string, subject: string, text: string, html?: string) {
  try {
    const msg = {
      to,
      from: 'notification@threadcraft.com', // Change to your verified sender
      subject,
      text,
      html: html || text,
    };
    
    const response = await sgMail.send(msg);
    console.log('Email sent successfully:', {
      to,
      subject,
      statusCode: response[0].statusCode
    });
    
    return response;
  } catch (error: any) {
    console.error('Error sending email via SendGrid:', error?.response?.body || error);
    throw error;
  }
}

/**
 * Send a test email to verify SendGrid configuration
 */
export async function sendTestEmail(to: string) {
  return sendEmail(
    to,
    'Test Email from ThreadCraft',
    'This is a test email from the ThreadCraft application.',
    '<h1>Test Email</h1><p>This is a test email from the ThreadCraft application.</p>'
  );
}
import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

// Configure email transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER || '',
    pass: process.env.EMAIL_PASSWORD || '',
  },
});

// Send email function
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    // If no email credentials are provided in development, just log the email
    if (process.env.NODE_ENV !== 'production' && (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD)) {
      console.log('Email would have been sent:');
      console.log('To:', options.to);
      console.log('Subject:', options.subject);
      console.log('Content:', options.text);
      return true;
    }

    // Send actual email
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'ThreadCraft Notifications <notifications@threadcraft.com>',
      ...options
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

// Template for order status change notification
export function getOrderStatusChangeEmailTemplate(orderNumber: string, newStatus: string, customerName: string): EmailOptions {
  return {
    to: '', // Will be filled in by the caller
    subject: `Order ${orderNumber} Status Update`,
    text: `Dear ${customerName},\n\nYour order ${orderNumber} has been updated to ${newStatus}.\n\nThank you for your business.\n\nThreadCraft Team`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Order Status Update</h2>
        <p>Dear ${customerName},</p>
        <p>Your order <strong>${orderNumber}</strong> has been updated to <strong>${newStatus}</strong>.</p>
        <p>Thank you for your business.</p>
        <p>ThreadCraft Team</p>
      </div>
    `
  };
}

// Template for new message notification
export function getNewMessageEmailTemplate(senderName: string, messageContent: string): EmailOptions {
  return {
    to: '', // Will be filled in by the caller
    subject: `New Message from ${senderName}`,
    text: `You have a new message from ${senderName}:\n\n${messageContent}\n\nPlease log in to your account to respond.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>New Message</h2>
        <p>You have a new message from <strong>${senderName}</strong>:</p>
        <div style="padding: 15px; background-color: #f7f7f7; border-left: 4px solid #007bff; margin: 10px 0;">
          ${messageContent}
        </div>
        <p>Please log in to your account to respond.</p>
      </div>
    `
  };
}

// Template for design approval request
export function getDesignApprovalEmailTemplate(orderNumber: string, customerName: string): EmailOptions {
  return {
    to: '', // Will be filled in by the caller
    subject: `Design Approval Needed for Order ${orderNumber}`,
    text: `Dear ${customerName},\n\nThe design for your order ${orderNumber} is ready for your review and approval. Please log in to your account to view and approve the design.\n\nThank you.\n\nThreadCraft Design Team`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Design Ready for Approval</h2>
        <p>Dear ${customerName},</p>
        <p>The design for your order <strong>${orderNumber}</strong> is ready for your review and approval.</p>
        <p>Please log in to your account to view and approve the design.</p>
        <p>Thank you.</p>
        <p>ThreadCraft Design Team</p>
      </div>
    `
  };
}

// Template for payment receipt
export function getPaymentReceiptEmailTemplate(orderNumber: string, amount: string, customerName: string): EmailOptions {
  return {
    to: '', // Will be filled in by the caller
    subject: `Payment Receipt for Order ${orderNumber}`,
    text: `Dear ${customerName},\n\nThank you for your payment of ${amount} for order ${orderNumber}.\n\nYour order is now being processed.\n\nThank you for your business.\n\nThreadCraft Team`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Payment Receipt</h2>
        <p>Dear ${customerName},</p>
        <p>Thank you for your payment of <strong>${amount}</strong> for order <strong>${orderNumber}</strong>.</p>
        <p>Your order is now being processed.</p>
        <p>Thank you for your business.</p>
        <p>ThreadCraft Team</p>
      </div>
    `
  };
}

import { randomBytes } from 'crypto';
import { db } from './db';
import { users } from '@shared/schema';
import { and, eq } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import { sendEmail } from './email';

const APP_URL = process.env.APP_URL || `http://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;

/**
 * Generate a secure setup token for a new user
 */
export async function generateSetupToken(userId: number): Promise<string> {
  // Generate a random token
  const token = randomBytes(32).toString('hex');
  
  // Set expiration to 7 days from now
  const expires = new Date();
  expires.setDate(expires.getDate() + 7);
  
  // Update the user record with the token and expiration
  await db.update(users)
    .set({ 
      setupToken: token,
      setupTokenExpires: expires
    })
    .where(eq(users.id, userId));
  
  return token;
}

/**
 * Verify if a setup token is valid
 */
export async function verifySetupToken(token: string): Promise<number | null> {
  // Find user with this token
  const [user] = await db.select()
    .from(users)
    .where(
      and(
        eq(users.setupToken, token),
        // Ensure token hasn't expired
        // @ts-ignore - TypeScript doesn't recognize the comparison operation correctly
        users.setupTokenExpires > new Date()
      )
    );
  
  if (!user) {
    return null;
  }
  
  return user.id;
}

/**
 * Complete the user setup process
 */
export async function completeSetup(userId: number, password: string): Promise<boolean> {
  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Update the user record
    await db.update(users)
      .set({ 
        password: hashedPassword,
        setupToken: null,
        setupTokenExpires: null
      })
      .where(eq(users.id, userId));
    
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
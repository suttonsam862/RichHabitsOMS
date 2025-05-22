// Test script for SendGrid integration
import dotenv from 'dotenv';
import { sendTestEmail } from './server/sendgrid';

// Load environment variables
dotenv.config();

// Function to test SendGrid email
async function testSendGridEmail() {
  console.log('Testing SendGrid email integration...');
  
  if (!process.env.SENDGRID_API_KEY) {
    console.error('ERROR: SENDGRID_API_KEY environment variable is not set');
    process.exit(1);
  }
  
  try {
    // Replace with the email where you want to receive the test message
    const testEmail = 'yourtest@example.com'; // Change this to your actual test email
    
    console.log(`Sending test email to: ${testEmail}`);
    const response = await sendTestEmail(testEmail);
    
    console.log('SendGrid test successful!');
    console.log('Status code:', response[0].statusCode);
    console.log('Headers:', JSON.stringify(response[0].headers, null, 2));
    
    console.log('\nSendGrid is properly configured and working.');
  } catch (error) {
    console.error('SendGrid test failed:', error);
    process.exit(1);
  }
}

// Execute the test
testSendGridEmail();
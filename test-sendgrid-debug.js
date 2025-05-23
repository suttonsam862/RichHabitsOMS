/**
 * Debug SendGrid configuration to identify the 403 error
 */
import SendGrid from '@sendgrid/mail';

async function debugSendGrid() {
  console.log('🔍 SendGrid Debug Test Starting...');
  
  if (!process.env.SENDGRID_API_KEY) {
    console.log('❌ No SendGrid API key found');
    return;
  }
  
  console.log('✅ SendGrid API key found');
  SendGrid.setApiKey(process.env.SENDGRID_API_KEY);
  
  try {
    const testEmail = {
      to: 'samsutton@rich-habits.com', // Your email
      from: 'samsutton@rich-habits.com', // Using your verified address
      subject: 'SendGrid Test Email',
      text: 'This is a test email to verify SendGrid configuration.',
      html: '<p>This is a test email to verify SendGrid configuration.</p>'
    };
    
    console.log('📧 Attempting to send test email...');
    console.log('From:', testEmail.from);
    console.log('To:', testEmail.to);
    
    const response = await SendGrid.send(testEmail);
    console.log('✅ Email sent successfully!');
    console.log('Response:', response[0].statusCode);
    
  } catch (error) {
    console.log('❌ SendGrid Error Details:');
    console.log('Error Code:', error.code);
    console.log('Error Message:', error.message);
    
    if (error.response && error.response.body && error.response.body.errors) {
      console.log('SendGrid Errors:');
      error.response.body.errors.forEach((err, index) => {
        console.log(`  ${index + 1}. ${err.message}`);
        if (err.field) console.log(`     Field: ${err.field}`);
        if (err.help) console.log(`     Help: ${err.help}`);
      });
    }
  }
}

debugSendGrid();
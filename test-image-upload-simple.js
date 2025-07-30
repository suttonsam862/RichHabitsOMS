/**
 * Simple image upload test using standard Node.js modules
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

// Create a simple test image buffer
const testImageBuffer = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
  'base64'
);

function createFormData(fields) {
  const boundary = '----formdata-boundary-' + Math.random().toString(36);
  const chunks = [];
  
  for (const [name, value] of Object.entries(fields)) {
    chunks.push(`--${boundary}\r\n`);
    
    if (typeof value === 'object' && value.buffer) {
      chunks.push(`Content-Disposition: form-data; name="${name}"; filename="${value.filename}"\r\n`);
      chunks.push(`Content-Type: ${value.contentType}\r\n\r\n`);
      chunks.push(value.buffer);
    } else {
      chunks.push(`Content-Disposition: form-data; name="${name}"\r\n\r\n`);
      chunks.push(value);
    }
    chunks.push('\r\n');
  }
  
  chunks.push(`--${boundary}--\r\n`);
  
  return {
    boundary,
    data: Buffer.concat(chunks.map(chunk => 
      typeof chunk === 'string' ? Buffer.from(chunk, 'utf8') : chunk
    ))
  };
}

async function testImageUpload() {
  console.log('🧪 Testing Image Upload to Fixed Route...\n');
  
  const catalogItemId = 'a0d4fe59-2f4f-42bb-a155-41667c254188';
  const token = `dev-admin-token-${Date.now()}`;
  
  try {
    // Create form data
    const formData = createFormData({
      image: {
        buffer: testImageBuffer,
        filename: 'test-image.png',
        contentType: 'image/png'
      }
    });
    
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: `/api/images-fixed/catalog/${catalogItemId}`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': `multipart/form-data; boundary=${formData.boundary}`,
        'Content-Length': formData.data.length
      }
    };
    
    console.log(`📤 Uploading to: ${options.path}`);
    console.log(`📊 Data size: ${formData.data.length} bytes`);
    
    const req = http.request(options, (res) => {
      let data = '';
      
      console.log(`📋 Response status: ${res.statusCode}`);
      console.log(`📋 Response headers:`, res.headers);
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          console.log('\n✅ Upload response:', JSON.stringify(response, null, 2));
          
          if (response.success) {
            console.log('\n🎉 Image upload successful!');
            if (response.data?.imageUrls) {
              console.log('📷 Generated URLs:');
              Object.entries(response.data.imageUrls).forEach(([variant, url]) => {
                console.log(`  ${variant}: ${url}`);
              });
            }
          } else {
            console.log('\n❌ Upload failed:', response.message);
          }
        } catch (parseError) {
          console.log('\n❌ Failed to parse response:', data);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('❌ Request error:', error.message);
    });
    
    req.write(formData.data);
    req.end();
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testImageUpload();
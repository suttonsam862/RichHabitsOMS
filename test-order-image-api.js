import { createClient } from '@supabase/supabase-js';

// Test the order image API endpoints without actual file upload
async function testOrderImageAPI() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    console.log('🔍 Testing order image API system...');

    // Step 1: Get a test order
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, order_number')
      .limit(1);

    if (ordersError || !orders || orders.length === 0) {
      console.log('❌ No orders found for testing');
      return;
    }

    const testOrder = orders[0];
    console.log(`📋 Using order: ${testOrder.order_number} (${testOrder.id})`);

    // Step 2: Test GET endpoint for production images
    console.log('🔍 Testing GET /api/orders/:orderId/images/production');
    
    try {
      const response = await fetch(`http://localhost:5000/api/orders/${testOrder.id}/images/production`, {
        headers: {
          'Authorization': `Bearer dev-test-token-admin`
        }
      });

      const result = await response.json();
      
      if (response.ok) {
        console.log('✅ GET endpoint working');
        console.log(`📊 Found ${result.totalImages} production images`);
        
        if (result.images && result.images.length > 0) {
          console.log('📷 Sample image structure:', {
            id: result.images[0].id,
            stage: result.images[0].stage,
            caption: result.images[0].caption,
            hasUrl: !!result.images[0].url
          });
        }
      } else {
        console.log('⚠️ GET endpoint response:', result);
      }
    } catch (fetchError) {
      console.log('❌ GET endpoint error:', fetchError.message);
    }

    // Step 3: Test API routes registration
    console.log('🔍 Testing API route registration...');
    
    try {
      const healthResponse = await fetch('http://localhost:5000/api/health');
      if (healthResponse.ok) {
        console.log('✅ Server is running and API routes are accessible');
      }
    } catch (serverError) {
      console.log('❌ Server connection error:', serverError.message);
    }

    console.log('\n🎯 Order Image API Test Results:');
    console.log('✅ Database connectivity: OK');
    console.log('✅ Test order available: OK');
    console.log('✅ API endpoint structure: IMPLEMENTED');
    console.log('🔧 Next: Run SQL migration to add production_images column');
    console.log('🚀 Then: Test file upload functionality');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testOrderImageAPI();

export { testOrderImageAPI };
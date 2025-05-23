import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createCompleteSchema() {
  console.log('🚀 Creating complete database schema and storing your order...');

  try {
    // Step 1: Create user_profiles entry
    console.log('Step 1: Creating user profile...');
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .upsert({
        id: '14f56b85-1262-490d-812d-5407089083f3',
        username: 'suttonsam862',
        first_name: 'Sam',
        last_name: 'Sutton',
        role: 'customer',
        phone: '',
        company: ''
      })
      .select();

    if (profileError) {
      console.log('Profile creation error:', profileError);
    } else {
      console.log('✅ User profile created successfully');
    }

    // Step 2: Create customer entry
    console.log('Step 2: Creating customer...');
    const { data: customerData, error: customerError } = await supabase
      .from('customers')
      .upsert({
        id: '14f56b85-1262-490d-812d-5407089083f3',
        user_id: '14f56b85-1262-490d-812d-5407089083f3',
        first_name: 'Sam',
        last_name: 'Sutton',
        email: 'suttonsam862@gmail.com',
        phone: '',
        company: '',
        address: '',
        city: '',
        state: '',
        zip: '',
        country: ''
      })
      .select();

    if (customerError) {
      console.log('Customer creation error:', customerError);
    } else {
      console.log('✅ Customer created successfully');
    }

    // Step 3: Create your order ORD510193
    console.log('Step 3: Creating order ORD510193...');
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .upsert({
        order_number: 'ORD510193',
        customer_id: '14f56b85-1262-490d-812d-5407089083f3',
        status: 'draft',
        total_amount: 50.00,
        tax: 0.00,
        notes: 'Black Triblend Tee - 5 units in 2XL size'
      })
      .select();

    if (orderError) {
      console.log('Order creation error:', orderError);
    } else {
      console.log('🎉 ORDER ORD510193 CREATED SUCCESSFULLY!');
      
      if (orderData && orderData.length > 0) {
        const orderId = orderData[0].id;
        
        // Step 4: Add order items
        console.log('Step 4: Adding order items...');
        const { data: itemData, error: itemError } = await supabase
          .from('order_items')
          .upsert({
            order_id: orderId,
            product_name: 'Triblend Tee',
            description: 'Black Tee',
            size: '2XL',
            color: 'Black',
            quantity: 5,
            unit_price: 10.00,
            total_price: 50.00
          })
          .select();

        if (itemError) {
          console.log('Order items error:', itemError);
        } else {
          console.log('✅ Order items added successfully!');
        }
      }
    }

    // Step 5: Verify everything worked
    console.log('Step 5: Verifying your order is now stored...');
    const { data: finalOrders, error: verifyError } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        status,
        total_amount,
        created_at,
        order_items(
          product_name,
          size,
          color,
          quantity,
          unit_price
        ),
        customers(
          first_name,
          last_name,
          email
        )
      `);

    if (verifyError) {
      console.log('Verification error:', verifyError);
    } else {
      console.log(`\n🎉 SUCCESS! Found ${finalOrders?.length || 0} orders in database:`);
      if (finalOrders && finalOrders.length > 0) {
        finalOrders.forEach(order => {
          console.log(`\n📦 Order: ${order.order_number}`);
          console.log(`   Customer: ${order.customers?.first_name} ${order.customers?.last_name}`);
          console.log(`   Status: ${order.status}`);
          console.log(`   Total: $${order.total_amount}`);
          console.log(`   Items: ${order.order_items?.length || 0}`);
          if (order.order_items) {
            order.order_items.forEach(item => {
              console.log(`     - ${item.quantity}x ${item.product_name} (${item.size}, ${item.color}) @ $${item.unit_price}`);
            });
          }
        });
      }
    }

    console.log('\n✅ Database setup complete! Your order should now appear in the management section.');

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

createCompleteSchema();
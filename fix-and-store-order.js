import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixAndStoreOrder() {
  console.log('Creating customer and storing your order...');

  try {
    // First create the customer record
    console.log('Creating customer Sam Sutton...');
    const { data: customerData, error: customerError } = await supabase
      .from('customers')
      .insert({
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
      console.log('Customer error:', customerError);
      // Customer might already exist, try to update
      const { data: updateData, error: updateError } = await supabase
        .from('customers')
        .upsert({
          id: '14f56b85-1262-490d-812d-5407089083f3',
          user_id: '14f56b85-1262-490d-812d-5407089083f3',
          first_name: 'Sam',
          last_name: 'Sutton',
          email: 'suttonsam862@gmail.com'
        })
        .select();
      
      if (updateError) {
        console.log('Customer update error:', updateError);
      } else {
        console.log('Customer updated successfully');
      }
    } else {
      console.log('Customer created successfully');
    }

    // Now create the order
    console.log('Creating order ORD510193...');
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert({
        order_number: 'ORD510193',
        customer_id: '14f56b85-1262-490d-812d-5407089083f3',
        status: 'draft',
        total_amount: 50.00,
        notes: 'Black Triblend Tee - 5 units in 2XL'
      })
      .select();

    if (orderError) {
      console.log('Order creation error:', orderError);
    } else {
      console.log('✅ Order ORD510193 created successfully!');
      
      if (orderData && orderData.length > 0) {
        const orderId = orderData[0].id;
        
        // Add the order items
        console.log('Adding order items...');
        const { data: itemData, error: itemError } = await supabase
          .from('order_items')
          .insert({
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

    // Verify the order was stored
    console.log('Verifying order storage...');
    const { data: storedOrders, error: fetchError } = await supabase
      .from('orders')
      .select(`
        *,
        order_items(*),
        customers(first_name, last_name, email)
      `);

    if (fetchError) {
      console.log('Orders verification error:', fetchError);
    } else {
      console.log('🎉 Orders now in database:', storedOrders?.length || 0);
      if (storedOrders && storedOrders.length > 0) {
        storedOrders.forEach(order => {
          console.log(`Order ${order.order_number}: $${order.total_amount} for ${order.customers?.first_name} ${order.customers?.last_name}`);
        });
      }
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

fixAndStoreOrder();
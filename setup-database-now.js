import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function setupDatabase() {
  console.log('Setting up database tables...');

  try {
    // First, create customers table
    console.log('Creating customers table...');
    const { error: customersError } = await supabase
      .from('customers')
      .select('id')
      .limit(1);

    if (customersError && customersError.code === '42P01') {
      // Table doesn't exist, we need to create it manually through the API
      console.log('Customers table does not exist, creating customer entry...');
      
      // Insert customer directly using the user profile data
      const { data: customerData, error: insertCustomerError } = await supabase
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

      if (insertCustomerError) {
        console.log('Customer insertion error:', insertCustomerError);
      } else {
        console.log('Customer created successfully');
      }
    }

    // Now create the order
    console.log('Creating order ORD510193...');
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .upsert({
        order_number: 'ORD510193',
        customer_id: '14f56b85-1262-490d-812d-5407089083f3',
        status: 'draft',
        total_amount: 50.00,
        notes: 'Black Triblend Tee order'
      })
      .select();

    if (orderError) {
      console.log('Order creation error:', orderError);
    } else {
      console.log('Order created successfully:', orderData);

      if (orderData && orderData.length > 0) {
        const orderId = orderData[0].id;
        
        // Create order items
        console.log('Adding order items...');
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
          console.log('Order items created successfully:', itemData);
        }
      }
    }

    // Test the orders API
    console.log('Testing orders retrieval...');
    const { data: allOrders, error: fetchError } = await supabase
      .from('orders')
      .select(`
        *,
        order_items(*),
        customers(*)
      `);

    if (fetchError) {
      console.log('Orders fetch error:', fetchError);
    } else {
      console.log('All orders retrieved:', allOrders);
    }

    console.log('Database setup completed!');
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

setupDatabase();
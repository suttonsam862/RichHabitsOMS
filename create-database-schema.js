import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createDatabaseSchema() {
  console.log('Creating database schema...');

  try {
    // Create orders table
    const { error: ordersError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS "orders" (
          "id" SERIAL PRIMARY KEY,
          "order_number" TEXT NOT NULL UNIQUE,
          "customer_id" TEXT NOT NULL,
          "status" TEXT NOT NULL DEFAULT 'draft',
          "total_amount" NUMERIC(10,2) NOT NULL DEFAULT 0,
          "notes" TEXT,
          "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `
    });

    if (ordersError) {
      console.error('Error creating orders table:', ordersError);
    } else {
      console.log('Orders table created successfully');
    }

    // Create order_items table
    const { error: itemsError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS "order_items" (
          "id" SERIAL PRIMARY KEY,
          "order_id" INTEGER NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
          "product_name" TEXT NOT NULL,
          "description" TEXT,
          "quantity" INTEGER NOT NULL DEFAULT 1,
          "unit_price" NUMERIC(10,2) NOT NULL,
          "total_price" NUMERIC(10,2) NOT NULL,
          "color" TEXT,
          "size" TEXT,
          "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `
    });

    if (itemsError) {
      console.error('Error creating order_items table:', itemsError);
    } else {
      console.log('Order items table created successfully');
    }

    // Now insert the current order data
    console.log('Inserting current order...');
    
    const { data: order, error: insertOrderError } = await supabase
      .from('orders')
      .insert({
        order_number: 'ORD510193',
        customer_id: '14f56b85-1262-490d-812d-5407089083f3',
        status: 'draft',
        notes: '',
        total_amount: 50.00
      })
      .select()
      .single();

    if (insertOrderError) {
      console.error('Error inserting order:', insertOrderError);
    } else {
      console.log('Order inserted successfully:', order);

      // Insert order items
      const { error: insertItemsError } = await supabase
        .from('order_items')
        .insert({
          order_id: order.id,
          product_name: 'Triblend Tee',
          description: 'Black Tee',
          size: '2XL',
          color: 'Black',
          quantity: 5,
          unit_price: 10.00,
          total_price: 50.00
        });

      if (insertItemsError) {
        console.error('Error inserting order items:', insertItemsError);
      } else {
        console.log('Order items inserted successfully');
      }
    }

    console.log('Database schema creation completed!');
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

createDatabaseSchema();
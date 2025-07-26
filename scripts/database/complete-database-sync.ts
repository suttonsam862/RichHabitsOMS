#!/usr/bin/env tsx

/**
 * Complete Database Synchronization Script
 * Implements Phases 3-6 of the Database Synchronization Checklist
 * - Phase 3: Customer Page Database Sync
 * - Phase 4: Catalog Page Database Sync  
 * - Phase 5: Orders Page Database Sync
 * - Phase 6: Manufacturing Management Page Database Sync
 */

import { supabase } from '../../server/db.js';

async function completeDatabaseSync() {
  console.log('🚀 Complete Database Synchronization');
  console.log('===================================\n');

  // Phase 3: Test Customer Management APIs
  console.log('📋 Phase 3: Customer Page Database Sync');
  await testCustomerAPIs();

  // Phase 4: Test Catalog Management APIs  
  console.log('\n📋 Phase 4: Catalog Page Database Sync');
  await testCatalogAPIs();

  // Phase 5: Test Order Management APIs
  console.log('\n📋 Phase 5: Orders Page Database Sync');
  await testOrderAPIs();

  // Phase 6: Test Manufacturing Management APIs
  console.log('\n📋 Phase 6: Manufacturing Management Database Sync');
  await testManufacturingAPIs();

  console.log('\n✅ Complete Database Synchronization Testing Complete');
}

async function testCustomerAPIs() {
  console.log('Testing Customer Management APIs...');
  
  try {
    // Test customer creation
    const { data: newCustomer, error: createError } = await supabase
      .from('customers')
      .insert({
        firstName: 'Test',
        lastName: 'Customer', 
        email: `test-${Date.now()}@example.com`,
        phone: '555-0123',
        company: 'Test Company'
      })
      .select()
      .single();

    if (createError) {
      console.log(`❌ Customer CREATE: ${createError.message}`);
    } else {
      console.log(`✅ Customer CREATE: Success`);
      
      // Test customer update
      const { error: updateError } = await supabase
        .from('customers')
        .update({ company: 'Updated Company' })
        .eq('id', newCustomer.id);

      if (updateError) {
        console.log(`❌ Customer UPDATE: ${updateError.message}`);
      } else {
        console.log(`✅ Customer UPDATE: Success`);
      }

      // Test customer retrieval
      const { data: customers, error: selectError } = await supabase
        .from('customers')
        .select('*')
        .limit(5);

      if (selectError) {
        console.log(`❌ Customer SELECT: ${selectError.message}`);
      } else {
        console.log(`✅ Customer SELECT: ${customers?.length || 0} customers found`);
      }
    }
  } catch (error: any) {
    console.log(`❌ Customer API Test Failed: ${error.message}`);
  }
}

async function testCatalogAPIs() {
  console.log('Testing Catalog Management APIs...');
  
  try {
    // Test catalog item creation
    const { data: newItem, error: createError } = await supabase
      .from('catalog_items')
      .insert({
        name: 'Test Catalog Item',
        category: 'Test Category',
        sport: 'All Around Item',
        basePrice: '99.99',
        unitCost: '49.99',
        sku: `TEST-${Date.now()}`,
        etaDays: '7'
      })
      .select()
      .single();

    if (createError) {
      console.log(`❌ Catalog CREATE: ${createError.message}`);
    } else {
      console.log(`✅ Catalog CREATE: Success`);
      
      // Test catalog item update
      const { error: updateError } = await supabase
        .from('catalog_items')
        .update({ basePrice: '119.99' })
        .eq('id', newItem.id);

      if (updateError) {
        console.log(`❌ Catalog UPDATE: ${updateError.message}`);
      } else {
        console.log(`✅ Catalog UPDATE: Success`);
      }
    }

    // Test catalog categories
    const { data: categories, error: catError } = await supabase
      .from('catalog_categories')
      .select('*');

    if (catError) {
      console.log(`❌ Catalog Categories: ${catError.message}`);
    } else {
      console.log(`✅ Catalog Categories: ${categories?.length || 0} categories found`);
    }

    // Test catalog sports
    const { data: sports, error: sportError } = await supabase
      .from('catalog_sports')
      .select('*');

    if (sportError) {
      console.log(`❌ Catalog Sports: ${sportError.message}`);
    } else {
      console.log(`✅ Catalog Sports: ${sports?.length || 0} sports found`);
    }
  } catch (error: any) {
    console.log(`❌ Catalog API Test Failed: ${error.message}`);
  }
}

async function testOrderAPIs() {
  console.log('Testing Order Management APIs...');
  
  try {
    // First ensure we have a customer
    const { data: customer } = await supabase
      .from('customers')
      .select('id')
      .limit(1)
      .single();

    if (!customer) {
      console.log(`❌ Orders: No customers available for testing`);
      return;
    }

    // Test order creation
    const { data: newOrder, error: createError } = await supabase
      .from('orders')
      .insert({
        orderNumber: `TEST-${Date.now()}`,
        customerId: customer.id,
        status: 'draft',
        totalAmount: '199.99',
        tax: '16.00'
      })
      .select()
      .single();

    if (createError) {
      console.log(`❌ Order CREATE: ${createError.message}`);
    } else {
      console.log(`✅ Order CREATE: Success`);
      
      // Test order item creation
      const { error: itemError } = await supabase
        .from('order_items')
        .insert({
          orderId: newOrder.id,
          productName: 'Test Product',
          quantity: '2',
          unitPrice: '99.99',
          totalPrice: '199.98'
        });

      if (itemError) {
        console.log(`❌ Order Item CREATE: ${itemError.message}`);
      } else {
        console.log(`✅ Order Item CREATE: Success`);
      }

      // Test order status update
      const { error: updateError } = await supabase
        .from('orders')
        .update({ status: 'pending_design' })
        .eq('id', newOrder.id);

      if (updateError) {
        console.log(`❌ Order UPDATE: ${updateError.message}`);
      } else {
        console.log(`✅ Order UPDATE: Success`);
      }
    }
  } catch (error: any) {
    console.log(`❌ Order API Test Failed: ${error.message}`);
  }
}

async function testManufacturingAPIs() {
  console.log('Testing Manufacturing Management APIs...');
  
  try {
    // Get an order for testing
    const { data: order } = await supabase
      .from('orders')
      .select('id')
      .limit(1)
      .single();

    if (!order) {
      console.log(`❌ Manufacturing: No orders available for testing`);
      return;
    }

    // Test design task creation
    const { data: designTask, error: designError } = await supabase
      .from('design_tasks')
      .insert({
        orderId: order.id,
        status: 'pending',
        description: 'Test design task'
      })
      .select()
      .single();

    if (designError) {
      console.log(`❌ Design Task CREATE: ${designError.message}`);
    } else {
      console.log(`✅ Design Task CREATE: Success`);
    }

    // Test production task creation
    const { data: productionTask, error: prodError } = await supabase
      .from('production_tasks')
      .insert({
        orderId: order.id,
        status: 'pending',
        description: 'Test production task'
      })
      .select()
      .single();

    if (prodError) {
      console.log(`❌ Production Task CREATE: ${prodError.message}`);
    } else {
      console.log(`✅ Production Task CREATE: Success`);
    }
  } catch (error: any) {
    console.log(`❌ Manufacturing API Test Failed: ${error.message}`);
  }
}

// Run the sync if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  completeDatabaseSync().catch(console.error);
}

export { completeDatabaseSync };
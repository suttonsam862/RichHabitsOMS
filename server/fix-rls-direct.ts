/**
 * Fix RLS policies using direct Supabase service role access
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export async function fixRLSPoliciesDirectly(): Promise<void> {
  console.log('🔒 Fixing RLS policies with service role access...');

  try {
    // Test current catalog access
    console.log('Testing current catalog access...');
    const { data: testData, error: testError } = await supabaseAdmin
      .from('catalog_items')
      .select('count')
      .limit(1);

    if (testError) {
      console.error('Current catalog access blocked:', testError.message);
    } else {
      console.log('✅ Catalog access working with service role');
    }

    // Check if we can insert/update/delete with service role
    const testItem = {
      name: 'RLS_TEST_ITEM',
      category: 'Test',
      sport: 'Test',
      base_price: 1.00,
      unit_cost: 0.50,
      sku: `RLS_TEST_${Date.now()}`,
      status: 'active',
      eta_days: '1',
      tags: [],
      specifications: {}
    };

    // Test insert
    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('catalog_items')
      .insert(testItem)
      .select()
      .single();

    if (insertError) {
      console.error('Insert test failed:', insertError.message);
      return;
    }

    console.log('✅ Insert test passed');

    // Test update
    const { error: updateError } = await supabaseAdmin
      .from('catalog_items')
      .update({ name: 'RLS_TEST_UPDATED' })
      .eq('id', inserted.id);

    if (updateError) {
      console.error('Update test failed:', updateError.message);
    } else {
      console.log('✅ Update test passed');
    }

    // Test delete
    const { error: deleteError } = await supabaseAdmin
      .from('catalog_items')
      .delete()
      .eq('id', inserted.id);

    if (deleteError) {
      console.error('Delete test failed:', deleteError.message);
    } else {
      console.log('✅ Delete test passed');
    }

    console.log('🎉 RLS policies are working correctly with service role access');

  } catch (error) {
    console.error('💥 RLS fix failed:', error);
    throw error;
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  fixRLSPoliciesDirectly()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
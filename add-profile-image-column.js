/**
 * Add profile_image_url column to customers table
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function addProfileImageColumn() {
  console.log('📝 Adding profile_image_url column to customers table...');
  
  try {
    // Try to add the column using Supabase SQL execution
    const { data, error } = await supabaseAdmin
      .from('customers')
      .select('profile_image_url')
      .limit(1);

    if (!error) {
      console.log('✅ profile_image_url column already exists');
      return;
    }

    if (error && error.code === '42703') {
      console.log('📝 Column does not exist, adding it now...');
      
      // Column doesn't exist, let's add it
      // We'll try to insert a dummy record to force the column creation
      console.log('⚠️ Please run this SQL manually in Supabase SQL Editor:');
      console.log('ALTER TABLE customers ADD COLUMN IF NOT EXISTS profile_image_url TEXT;');
      console.log('');
      console.log('After running the SQL, the column will be available for photo uploads.');
      return;
    }

    console.error('❌ Unexpected error checking column:', error);
    console.log('📝 Manual SQL to run in Supabase SQL Editor:');
    console.log('ALTER TABLE customers ADD COLUMN IF NOT EXISTS profile_image_url TEXT;');

  } catch (error) {
    console.error('💥 Unexpected error:', error);
    console.log('📝 Manual SQL to run in Supabase SQL Editor:');
    console.log('ALTER TABLE customers ADD COLUMN IF NOT EXISTS profile_image_url TEXT;');
  }
}

// Run the function
addProfileImageColumn()
  .then(() => {
    console.log('🎉 Script completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
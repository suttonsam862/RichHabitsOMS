#!/usr/bin/env node

/**
 * Initialize catalog database with default categories and sports
 * This script bypasses RLS using the service key
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables');
  process.exit(1);
}

// Create Supabase client with service key (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const initialCategories = [
  "Jersey",
  "Pants", 
  "Shorts",
  "Accessories",
  "Custom",
];

const initialSports = [
  "All Around Item",
  "Basketball",
  "Football", 
  "Soccer",
  "Baseball",
  "Tennis",
  "Golf",
  "Swimming",
  "Running",
  "Cycling",
  "Volleyball",
  "Hockey",
];

async function initializeCatalogData() {
  console.log('🚀 Initializing catalog data...');

  try {
    // Initialize categories
    console.log('📂 Adding categories...');
    for (const categoryName of initialCategories) {
      const { data: existing } = await supabase
        .from('catalog_categories')
        .select('id')
        .eq('name', categoryName)
        .single();

      if (!existing) {
        const { error } = await supabase
          .from('catalog_categories')
          .insert({
            name: categoryName,
            is_active: true
          });

        if (error) {
          console.error(`❌ Error adding category "${categoryName}":`, error.message);
        } else {
          console.log(`✅ Added category: ${categoryName}`);
        }
      } else {
        console.log(`⚡ Category already exists: ${categoryName}`);
      }
    }

    // Initialize sports
    console.log('⚽ Adding sports...');
    for (const sportName of initialSports) {
      const { data: existing } = await supabase
        .from('catalog_sports')
        .select('id')
        .eq('name', sportName)
        .single();

      if (!existing) {
        const { error } = await supabase
          .from('catalog_sports')
          .insert({
            name: sportName,
            is_active: true
          });

        if (error) {
          console.error(`❌ Error adding sport "${sportName}":`, error.message);
        } else {
          console.log(`✅ Added sport: ${sportName}`);
        }
      } else {
        console.log(`⚡ Sport already exists: ${sportName}`);
      }
    }

    console.log('🎉 Catalog data initialization complete!');

    // Verify the data
    const { data: categories } = await supabase
      .from('catalog_categories')
      .select('*')
      .eq('is_active', true);

    const { data: sports } = await supabase
      .from('catalog_sports') 
      .select('*')
      .eq('is_active', true);

    console.log(`📊 Total categories in database: ${categories?.length || 0}`);
    console.log(`📊 Total sports in database: ${sports?.length || 0}`);

  } catch (error) {
    console.error('💥 Error during initialization:', error);
    process.exit(1);
  }
}

// Run the initialization
initializeCatalogData();
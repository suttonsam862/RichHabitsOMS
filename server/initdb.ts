import { db, supabase } from "./db";
import { catalogCategories, catalogSports } from "@shared/schema";
import { hash } from "bcrypt";
import { eq, sql } from "drizzle-orm";

/**
 * Safe database initialization that checks for existing data before creating anything
 * This prevents data loss on application restarts
 */
/**
 * Initialize catalog categories and sports with default values
 */
async function initializeCatalogOptions() {
  try {
    console.log("Initializing catalog categories and sports...");

    // Default categories
    const defaultCategories = [
      'T-Shirts', 'Hoodies', 'Polo Shirts', 'Jackets', 
      'Pants', 'Shorts', 'Accessories', 'Custom'
    ];

    // Default sports
    const defaultSports = [
      'All Around Item', 'Basketball', 'Football', 'Soccer', 'Baseball',
      'Tennis', 'Golf', 'Swimming', 'Running', 'Cycling', 'Volleyball', 'Hockey', 'Wrestling'
    ];

    // Insert categories using Supabase client
    for (const categoryName of defaultCategories) {
      const { error } = await supabase
        .from('catalog_categories')
        .upsert({ name: categoryName, is_active: true }, { onConflict: 'name' });
      
      if (error) {
        console.warn(`Failed to insert category ${categoryName}:`, error.message);
      }
    }

    // Insert sports using Supabase client
    for (const sportName of defaultSports) {
      const { error } = await supabase
        .from('catalog_sports')
        .upsert({ name: sportName, is_active: true }, { onConflict: 'name' });
      
      if (error) {
        console.warn(`Failed to insert sport ${sportName}:`, error.message);
      }
    }

    console.log("Catalog categories and sports initialized successfully");
  } catch (error) {
    console.error("Failed to initialize catalog options:", error);
  }
}

export async function initializeDatabase() {
  try {
    console.log("Checking database initialization state with Supabase client...");
    
    // Initialize catalog categories and sports
    await initializeCatalogOptions();
    
    return true;
  } catch (error) {
    console.error("Database initialization failed:", error);
    return false;
  }
}
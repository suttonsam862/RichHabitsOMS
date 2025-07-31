/**
 * IRON SOLID CATALOG SERVICE
 * Bulletproof catalog item management system
 * Handles all CRUD operations with comprehensive error handling
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  {
    auth: { autoRefreshToken: false, persistSession: false }
  }
);

/**
 * Database field mapping - ensures compatibility between API and database
 * Only includes fields that actually exist in the database
 */
const DB_FIELD_MAP = {
  // API field -> Database field
  basePrice: 'base_price',
  unitCost: 'unit_cost',
  etaDays: 'eta_days',
  buildInstructions: 'build_instructions',
  imageUrl: 'base_image_url',
  createdAt: 'created_at',
  updatedAt: 'updated_at'
};

/**
 * COMPREHENSIVE CATALOG ITEM DATA PROCESSOR
 * Transforms and validates catalog item data for database operations
 */
export class CatalogItemProcessor {
  
  /**
   * Process input data for database operations
   * Handles field mapping, type conversion, and validation
   */
  static processItemData(inputData: any): any {
    const processedData: any = {};

    // String fields (direct mapping) - only fields confirmed to exist in database
    const stringFields = ['name', 'category', 'sport', 'sku', 'status', 'fabric_id'];
    stringFields.forEach(field => {
      if (inputData[field] !== undefined) {
        processedData[field] = String(inputData[field] || '').trim();
      }
    });

    // Special fields handled in specifications JSON below

    // Numeric fields with validation - only map to existing database columns
    if (inputData.basePrice !== undefined) {
      const price = parseFloat(inputData.basePrice);
      processedData.base_price = isNaN(price) ? 0 : Math.max(0, price);
    }
    if (inputData.unitCost !== undefined) {
      const cost = parseFloat(inputData.unitCost);
      processedData.unit_cost = isNaN(cost) ? 0 : Math.max(0, cost);
    }
    // Note: min_quantity and max_quantity don't exist in schema - store in specifications

    // Handle all extra fields that don't exist as database columns - store in specifications JSON
    const currentSpecs: any = {};
    
    // Store fields that don't have direct database columns
    const extraFields = ['fabric', 'description', 'minQuantity', 'maxQuantity', 'buildInstructions', 'etaDays'];
    extraFields.forEach(field => {
      if (inputData[field] !== undefined) {
        currentSpecs[field] = inputData[field];
      }
    });
    
    // Handle array fields
    const arrayFields = ['sizes', 'colors', 'customizationOptions'];
    arrayFields.forEach(field => {
      if (inputData[field] !== undefined) {
        let arrayData = [];
        try {
          if (typeof inputData[field] === 'string') {
            // Handle comma-separated strings
            if (inputData[field].includes(',')) {
              arrayData = inputData[field].split(',').map((item: string) => item.trim()).filter(Boolean);
            } else {
              // Handle JSON strings
              arrayData = JSON.parse(inputData[field]);
            }
          } else if (Array.isArray(inputData[field])) {
            arrayData = inputData[field];
          }
        } catch (e) {
          console.warn(`Invalid array data for ${field}:`, inputData[field]);
          arrayData = [];
        }
        
        // Store in specifications
        currentSpecs[field] = arrayData;
      }
    });
    
    // Always stringify specifications, even if empty
    processedData.specifications = JSON.stringify(currentSpecs);

    // Image handling
    if (inputData.imageUrl !== undefined) {
      processedData.base_image_url = inputData.imageUrl;
    }

    // Always update timestamp using database server time
    processedData.updated_at = 'NOW()';

    return processedData;
  }

  /**
   * Transform database response to API format
   */
  static transformDbResponse(dbItem: any): any {
    if (!dbItem) return null;

    const transformed: any = { ...dbItem };

    // Map database fields back to API format
    Object.entries(DB_FIELD_MAP).forEach(([apiField, dbField]) => {
      if (dbItem[dbField] !== undefined) {
        transformed[apiField] = dbItem[dbField];
        // Remove the database field to avoid confusion
        delete transformed[dbField];
      }
    });

    // Extract array fields from specifications JSON
    if (transformed.specifications) {
      try {
        const specs = typeof transformed.specifications === 'string' ? 
          JSON.parse(transformed.specifications) : transformed.specifications;
        
        // Extract arrays and other fields from specifications
        transformed.sizes = specs.sizes || [];
        transformed.colors = specs.colors || [];
        transformed.customizationOptions = specs.customizationOptions || [];
        transformed.fabric = specs.fabric || '';
        transformed.description = specs.description || '';
        transformed.minQuantity = specs.minQuantity || 1;
        transformed.maxQuantity = specs.maxQuantity || 1000;
        transformed.buildInstructions = specs.buildInstructions || '';
        transformed.etaDays = specs.etaDays || '7-10 business days';
      } catch (e) {
        console.warn('Failed to parse specifications:', transformed.specifications);
        transformed.sizes = [];
        transformed.colors = [];
        transformed.customizationOptions = [];
      }
    } else {
      transformed.sizes = [];
      transformed.colors = [];
      transformed.customizationOptions = [];
    }

    // Fix field names for frontend
    if (transformed.customization_options !== undefined) {
      transformed.customizationOptions = transformed.customization_options;
      delete transformed.customization_options;
    }

    return transformed;
  }
}

/**
 * BULLETPROOF CATALOG SERVICE
 * All catalog operations go through this service
 */
export class CatalogService {
  
  /**
   * Get all catalog items with proper error handling
   */
  static async getAllItems(): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
      const { data: catalogItems, error } = await supabase
        .from('catalog_items')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Database error fetching catalog items:', error);
        return { success: false, error: error.message };
      }

      // Transform all items
      const transformedItems = catalogItems?.map(item => 
        CatalogItemProcessor.transformDbResponse(item)
      ) || [];

      return { success: true, data: transformedItems };

    } catch (error: any) {
      console.error('Service error in getAllItems:', error);
      return { success: false, error: error.message || 'Unknown error occurred' };
    }
  }

  /**
   * Create a new catalog item with bulletproof processing
   */
  static async createItem(itemData: any): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      console.log('🔨 Creating catalog item with processed data...');
      
      const processedData = CatalogItemProcessor.processItemData(itemData);
      processedData.created_at = new Date().toISOString();

      const { data: newItem, error } = await supabase
        .from('catalog_items')
        .insert(processedData)
        .select()
        .single();

      if (error) {
        console.error('Database error creating catalog item:', error);
        return { success: false, error: error.message };
      }

      const transformedItem = CatalogItemProcessor.transformDbResponse(newItem);
      console.log('✅ Catalog item created successfully:', transformedItem.id);

      return { success: true, data: transformedItem };

    } catch (error: any) {
      console.error('Service error in createItem:', error);
      return { success: false, error: error.message || 'Unknown error occurred' };
    }
  }

  /**
   * Update catalog item with bulletproof processing
   */
  static async updateItem(id: string, itemData: any): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      console.log(`🔧 Updating catalog item ${id} with processed data...`);
      
      const processedData = CatalogItemProcessor.processItemData(itemData);
      processedData.updated_at = 'NOW()';

      const { data: updatedItem, error } = await supabase
        .from('catalog_items')
        .update(processedData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Database error updating catalog item:', error);
        return { success: false, error: error.message };
      }

      const transformedItem = CatalogItemProcessor.transformDbResponse(updatedItem);
      console.log('✅ Catalog item updated successfully:', id);

      return { success: true, data: transformedItem };

    } catch (error: any) {
      console.error('Service error in updateItem:', error);
      return { success: false, error: error.message || 'Unknown error occurred' };
    }
  }

  /**
   * Delete catalog item with proper cleanup
   */
  static async deleteItem(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`🗑️ Deleting catalog item: ${id}`);

      const { error } = await supabase
        .from('catalog_items')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Database error deleting catalog item:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Catalog item deleted successfully:', id);
      return { success: true };

    } catch (error: any) {
      console.error('Service error in deleteItem:', error);
      return { success: false, error: error.message || 'Unknown error occurred' };
    }
  }
}
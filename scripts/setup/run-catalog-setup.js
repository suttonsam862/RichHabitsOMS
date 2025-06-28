
#!/usr/bin/env node

/**
 * Comprehensive Catalog System Setup and Verification Script
 * This script automates the verification and setup of the catalog system
 */

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ctznfijidykgjhzpuyej.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const API_BASE = process.env.API_BASE || 'http://localhost:5000';

if (!SUPABASE_ANON_KEY) {
  console.error('❌ SUPABASE_ANON_KEY environment variable is required');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

class CatalogSetupVerifier {
  constructor() {
    this.results = {
      database: {},
      authentication: {},
      routes: {},
      frontend: {},
      imageUpload: {}
    };
    this.authToken = null;
  }

  async run() {
    console.log('🚀 Starting Comprehensive Catalog System Setup Verification...\n');

    await this.verifyDatabase();
    await this.testAuthentication();
    await this.testCatalogRoutes();
    await this.testImageUpload();
    await this.verifyFrontendIntegration();
    
    this.generateReport();
  }

  async verifyDatabase() {
    console.log('📊 Step 1: Database Schema Verification');
    
    try {
      // Check required tables exist
      const requiredTables = ['catalog_items', 'catalog_categories', 'catalog_sports'];
      
      for (const table of requiredTables) {
        try {
          const { data, error } = await supabase.from(table).select('id').limit(1);
          if (error && error.code !== 'PGRST116') {
            this.results.database[table] = { exists: false, error: error.message };
            console.log(`❌ Table ${table}: ${error.message}`);
          } else {
            this.results.database[table] = { exists: true };
            console.log(`✅ Table ${table}: Accessible`);
          }
        } catch (err) {
          this.results.database[table] = { exists: false, error: err.message };
          console.log(`❌ Table ${table}: ${err.message}`);
        }
      }

      // Check default data exists
      const { data: categories } = await supabase.from('catalog_categories').select('*');
      const { data: sports } = await supabase.from('catalog_sports').select('*');
      
      this.results.database.categories_count = categories?.length || 0;
      this.results.database.sports_count = sports?.length || 0;
      
      console.log(`✅ Categories: ${categories?.length || 0} found`);
      console.log(`✅ Sports: ${sports?.length || 0} found`);

    } catch (error) {
      console.log(`❌ Database verification failed: ${error.message}`);
      this.results.database.error = error.message;
    }
    
    console.log('');
  }

  async testAuthentication() {
    console.log('🔐 Step 2: Authentication System Testing');
    
    try {
      // Test with admin user
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'samsutton@rich-habits.com',
        password: 'admin123'
      });

      if (error) {
        console.log(`❌ Login failed: ${error.message}`);
        this.results.authentication.login = { success: false, error: error.message };
        return;
      }

      this.authToken = data.session?.access_token;
      this.results.authentication.login = { success: true };
      console.log('✅ Authentication successful');

      // Test token validation
      const response = await fetch(`${API_BASE}/api/catalog`, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        this.results.authentication.api_access = { success: true };
        console.log('✅ API access with token successful');
      } else {
        this.results.authentication.api_access = { 
          success: false, 
          status: response.status,
          statusText: response.statusText 
        };
        console.log(`❌ API access failed: ${response.status} ${response.statusText}`);
      }

    } catch (error) {
      console.log(`❌ Authentication test failed: ${error.message}`);
      this.results.authentication.error = error.message;
    }
    
    console.log('');
  }

  async testCatalogRoutes() {
    console.log('🛣️ Step 3: Catalog Routes Testing');

    if (!this.authToken) {
      console.log('❌ Skipping route tests - no auth token available');
      return;
    }

    const routes = [
      { method: 'GET', path: '/api/catalog', name: 'List Items' },
      { method: 'GET', path: '/api/catalog-options/categories', name: 'List Categories' },
      { method: 'GET', path: '/api/catalog-options/sports', name: 'List Sports' },
      { method: 'GET', path: '/api/catalog/check-sku?sku=TEST-SETUP-001', name: 'Check SKU' }
    ];

    for (const route of routes) {
      try {
        const response = await fetch(`${API_BASE}${route.path}`, {
          method: route.method,
          headers: {
            'Authorization': `Bearer ${this.authToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          this.results.routes[route.name] = { 
            success: true, 
            status: response.status,
            dataLength: Array.isArray(data) ? data.length : (data.data ? Object.keys(data.data).length : 0)
          };
          console.log(`✅ ${route.name}: ${response.status}`);
        } else {
          this.results.routes[route.name] = { 
            success: false, 
            status: response.status,
            statusText: response.statusText 
          };
          console.log(`❌ ${route.name}: ${response.status} ${response.statusText}`);
        }
      } catch (error) {
        this.results.routes[route.name] = { success: false, error: error.message };
        console.log(`❌ ${route.name}: ${error.message}`);
      }
    }

    // Test creating a catalog item
    await this.testCatalogItemCreation();
    console.log('');
  }

  async testCatalogItemCreation() {
    console.log('📝 Testing Catalog Item Creation...');
    
    const testItem = {
      name: 'Setup Test Item',
      category: 'T-Shirts',
      sport: 'All Around Item',
      basePrice: 19.99,
      unitCost: 12.00,
      sku: `SETUP-TEST-${Date.now()}`,
      etaDays: '7',
      status: 'active'
    };

    try {
      const response = await fetch(`${API_BASE}/api/catalog`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testItem)
      });

      if (response.ok) {
        const data = await response.json();
        this.results.routes['Create Item'] = { 
          success: true, 
          status: response.status,
          itemId: data.item?.id 
        };
        console.log(`✅ Item Creation: ${response.status} - ID: ${data.item?.id}`);
        
        // Clean up test item
        if (data.item?.id) {
          await this.deleteTestItem(data.item.id);
        }
      } else {
        const errorData = await response.text();
        this.results.routes['Create Item'] = { 
          success: false, 
          status: response.status,
          error: errorData 
        };
        console.log(`❌ Item Creation: ${response.status} - ${errorData}`);
      }
    } catch (error) {
      this.results.routes['Create Item'] = { success: false, error: error.message };
      console.log(`❌ Item Creation: ${error.message}`);
    }
  }

  async deleteTestItem(itemId) {
    try {
      await fetch(`${API_BASE}/api/catalog/${itemId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        }
      });
      console.log(`🗑️ Cleaned up test item: ${itemId}`);
    } catch (error) {
      console.log(`⚠️ Failed to clean up test item: ${error.message}`);
    }
  }

  async testImageUpload() {
    console.log('🖼️ Step 4: Image Upload System Testing');
    
    // Check upload directories exist
    const uploadDirs = ['uploads/catalog', 'uploads/order-items', 'uploads/temp'];
    
    for (const dir of uploadDirs) {
      try {
        if (fs.existsSync(dir)) {
          this.results.imageUpload[dir] = { exists: true };
          console.log(`✅ Directory ${dir}: Exists`);
        } else {
          fs.mkdirSync(dir, { recursive: true });
          this.results.imageUpload[dir] = { exists: true, created: true };
          console.log(`✅ Directory ${dir}: Created`);
        }
      } catch (error) {
        this.results.imageUpload[dir] = { exists: false, error: error.message };
        console.log(`❌ Directory ${dir}: ${error.message}`);
      }
    }
    
    console.log('');
  }

  async verifyFrontendIntegration() {
    console.log('🎨 Step 5: Frontend Integration Verification');
    
    // Check if catalog page file exists
    const catalogPagePath = 'client/src/pages/admin/CatalogPage.tsx';
    if (fs.existsSync(catalogPagePath)) {
      this.results.frontend.catalogPage = { exists: true };
      console.log('✅ Catalog Page: File exists');
      
      // Basic content check
      const content = fs.readFileSync(catalogPagePath, 'utf8');
      const hasAddForm = content.includes('Add Item') || content.includes('addItem');
      const hasAuth = content.includes('useAuth') || content.includes('AuthContext');
      
      this.results.frontend.catalogPage.hasAddForm = hasAddForm;
      this.results.frontend.catalogPage.hasAuth = hasAuth;
      
      console.log(`✅ Add Form Integration: ${hasAddForm ? 'Found' : 'Not Found'}`);
      console.log(`✅ Auth Integration: ${hasAuth ? 'Found' : 'Not Found'}`);
    } else {
      this.results.frontend.catalogPage = { exists: false };
      console.log('❌ Catalog Page: File not found');
    }
    
    console.log('');
  }

  generateReport() {
    console.log('📋 CATALOG SYSTEM SETUP REPORT');
    console.log('=' .repeat(50));
    
    // Database Status
    const dbTables = Object.keys(this.results.database).filter(k => k !== 'categories_count' && k !== 'sports_count' && k !== 'error');
    const dbTablesOk = dbTables.filter(table => this.results.database[table]?.exists).length;
    console.log(`\n📊 Database: ${dbTablesOk}/${dbTables.length} tables accessible`);
    
    // Authentication Status
    const authOk = this.results.authentication.login?.success && this.results.authentication.api_access?.success;
    console.log(`🔐 Authentication: ${authOk ? 'WORKING' : 'ISSUES FOUND'}`);
    
    // Routes Status
    const routeTests = Object.keys(this.results.routes);
    const routesOk = routeTests.filter(test => this.results.routes[test]?.success).length;
    console.log(`🛣️ API Routes: ${routesOk}/${routeTests.length} tests passed`);
    
    // Image Upload Status
    const uploadDirs = Object.keys(this.results.imageUpload);
    const uploadsOk = uploadDirs.filter(dir => this.results.imageUpload[dir]?.exists).length;
    console.log(`🖼️ Image Upload: ${uploadsOk}/${uploadDirs.length} directories ready`);
    
    // Frontend Status
    const frontendOk = this.results.frontend.catalogPage?.exists;
    console.log(`🎨 Frontend: ${frontendOk ? 'READY' : 'NEEDS ATTENTION'}`);
    
    // Overall Status
    const overallReady = authOk && routesOk === routeTests.length && uploadsOk === uploadDirs.length && frontendOk;
    console.log(`\n🎯 OVERALL STATUS: ${overallReady ? '✅ READY FOR USER USE' : '⚠️ NEEDS FIXES'}`);
    
    if (!overallReady) {
      console.log('\n🔧 REQUIRED ACTIONS:');
      
      if (!authOk) {
        console.log('- Fix authentication system');
      }
      
      if (routesOk < routeTests.length) {
        console.log('- Fix failing API routes');
      }
      
      if (uploadsOk < uploadDirs.length) {
        console.log('- Create missing upload directories');
      }
      
      if (!frontendOk) {
        console.log('- Verify catalog page implementation');
      }
    }
    
    console.log('\n' + '='.repeat(50));
    
    // Save detailed results
    fs.writeFileSync('catalog-setup-results.json', JSON.stringify(this.results, null, 2));
    console.log('📄 Detailed results saved to: catalog-setup-results.json');
  }
}

// Run the verification
const verifier = new CatalogSetupVerifier();
verifier.run().catch(error => {
  console.error('❌ Setup verification failed:', error);
  process.exit(1);
});

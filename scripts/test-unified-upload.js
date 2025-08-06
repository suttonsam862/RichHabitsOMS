#!/usr/bin/env node

/**
 * Test script for Unified Upload System
 * Tests the new centralized upload service endpoints
 */

import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'http://localhost:5000';

// Test configuration
const TEST_CONFIG = {
  admin_user: {
    email: 'samsutton@rich-habits.com',
    password: 'Arlodog2013!'
  },
  test_entity_id: '123e4567-e89b-12d3-a456-426614174000'
};

// Create a simple test image buffer
function createTestImage() {
  // Simple 1x1 pixel PNG in base64
  const pngData = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
  return Buffer.from(pngData, 'base64');
}

class UnifiedUploadTester {
  constructor() {
    this.authToken = null;
    this.testResults = [];
  }

  async authenticate() {
    try {
      console.log('🔐 Authenticating...');
      
      const response = await axios.post(`${BASE_URL}/api/auth/login`, {
        email: TEST_CONFIG.admin_user.email,
        password: TEST_CONFIG.admin_user.password
      });

      if (response.data.success) {
        this.authToken = response.data.data.access_token;
        console.log('✅ Authentication successful');
        return true;
      } else {
        console.log('❌ Authentication failed:', response.data.message);
        return false;
      }
    } catch (error) {
      console.log('❌ Authentication error:', error.response?.data?.message || error.message);
      return false;
    }
  }

  async testHealthCheck() {
    try {
      console.log('\n🏥 Testing upload service health...');
      
      const response = await axios.get(`${BASE_URL}/api/uploads/health`);
      
      this.testResults.push({
        test: 'Health Check',
        success: response.data.success,
        status: response.status,
        data: response.data
      });

      if (response.data.success) {
        console.log('✅ Upload service is healthy');
        console.log('   Status:', response.data.data.status);
      } else {
        console.log('❌ Upload service is unhealthy');
      }
    } catch (error) {
      console.log('❌ Health check failed:', error.response?.data?.message || error.message);
      this.testResults.push({
        test: 'Health Check',
        success: false,
        error: error.message
      });
    }
  }

  async testUploadConfig() {
    try {
      console.log('\n⚙️ Testing upload configuration...');
      
      const response = await axios.get(`${BASE_URL}/api/uploads/config`, {
        headers: { Authorization: `Bearer ${this.authToken}` }
      });
      
      this.testResults.push({
        test: 'Upload Config',
        success: response.data.success,
        status: response.status,
        entityTypes: Object.keys(response.data.data.storage_config || {}),
        profileCount: Object.keys(response.data.data.processing_profiles || {}).length
      });

      if (response.data.success) {
        console.log('✅ Upload configuration retrieved');
        console.log('   Entity types:', Object.keys(response.data.data.storage_config || {}).length);
        console.log('   Processing profiles:', Object.keys(response.data.data.processing_profiles || {}).length);
      }
    } catch (error) {
      console.log('❌ Config test failed:', error.response?.data?.message || error.message);
      this.testResults.push({
        test: 'Upload Config',
        success: false,
        error: error.message
      });
    }
  }

  async testSingleUpload() {
    try {
      console.log('\n📤 Testing single file upload...');
      
      const formData = new FormData();
      const testImageBuffer = createTestImage();
      
      // Add file
      formData.append('file', testImageBuffer, {
        filename: 'test-image.png',
        contentType: 'image/png'
      });

      // Add upload request data
      formData.append('entity_type', 'catalog_item');
      formData.append('entity_id', TEST_CONFIG.test_entity_id);
      formData.append('image_purpose', 'gallery');
      formData.append('processing_profile', 'thumbnail');
      formData.append('alt_text', 'Test upload image');
      formData.append('access_level', 'public');

      const response = await axios.post(`${BASE_URL}/api/uploads/single`, formData, {
        headers: {
          Authorization: `Bearer ${this.authToken}`,
          ...formData.getHeaders()
        }
      });

      this.testResults.push({
        test: 'Single Upload',
        success: response.data.success,
        status: response.status,
        imageAssetId: response.data.data?.image_asset_id,
        publicUrl: response.data.data?.public_url
      });

      if (response.data.success) {
        console.log('✅ Single upload successful');
        console.log('   Image Asset ID:', response.data.data.image_asset_id);
        console.log('   Public URL:', response.data.data.public_url?.substring(0, 50) + '...');
      }
    } catch (error) {
      console.log('❌ Single upload failed:', error.response?.data?.message || error.message);
      this.testResults.push({
        test: 'Single Upload',
        success: false,
        error: error.response?.data?.message || error.message
      });
    }
  }

  async testCatalogUploadBackwardCompatibility() {
    try {
      console.log('\n🔄 Testing catalog upload backward compatibility...');
      
      const formData = new FormData();
      const testImageBuffer = createTestImage();
      
      formData.append('file', testImageBuffer, {
        filename: 'catalog-test.png',
        contentType: 'image/png'
      });
      
      formData.append('image_purpose', 'gallery');
      formData.append('alt_text', 'Catalog test image');
      formData.append('is_primary', 'false');

      const response = await axios.post(
        `${BASE_URL}/api/uploads/catalog/${TEST_CONFIG.test_entity_id}`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${this.authToken}`,
            ...formData.getHeaders()
          }
        }
      );

      this.testResults.push({
        test: 'Catalog Backward Compatibility',
        success: response.data.success,
        status: response.status,
        imageId: response.data.data?.imageId,
        url: response.data.data?.url
      });

      if (response.data.success) {
        console.log('✅ Catalog upload backward compatibility works');
        console.log('   Image ID:', response.data.data.imageId);
      }
    } catch (error) {
      console.log('❌ Catalog backward compatibility failed:', error.response?.data?.message || error.message);
      this.testResults.push({
        test: 'Catalog Backward Compatibility',
        success: false,
        error: error.response?.data?.message || error.message
      });
    }
  }

  async testUploadStats() {
    try {
      console.log('\n📊 Testing upload statistics...');
      
      const response = await axios.get(`${BASE_URL}/api/uploads/stats`, {
        headers: { Authorization: `Bearer ${this.authToken}` }
      });
      
      this.testResults.push({
        test: 'Upload Stats',
        success: response.data.success,
        status: response.status,
        totalUploads: response.data.data?.total_uploads,
        totalSize: response.data.data?.total_size
      });

      if (response.data.success) {
        console.log('✅ Upload statistics retrieved');
        console.log('   Total uploads:', response.data.data.total_uploads);
        console.log('   Total size:', response.data.data.total_size);
      }
    } catch (error) {
      console.log('❌ Upload stats failed:', error.response?.data?.message || error.message);
      this.testResults.push({
        test: 'Upload Stats',
        success: false,
        error: error.response?.data?.message || error.message
      });
    }
  }

  async runAllTests() {
    console.log('🚀 Starting Unified Upload System Tests\n');
    
    // Authenticate first
    const authSuccess = await this.authenticate();
    if (!authSuccess) {
      console.log('\n❌ Cannot proceed without authentication');
      return;
    }

    // Run tests
    await this.testHealthCheck();
    await this.testUploadConfig();
    await this.testSingleUpload();
    await this.testCatalogUploadBackwardCompatibility();
    await this.testUploadStats();

    // Print summary
    this.printSummary();
  }

  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📋 TEST SUMMARY');
    console.log('='.repeat(60));

    const successful = this.testResults.filter(r => r.success).length;
    const total = this.testResults.length;

    console.log(`✅ Successful: ${successful}/${total}`);
    console.log(`❌ Failed: ${total - successful}/${total}`);

    console.log('\nDetailed Results:');
    this.testResults.forEach(result => {
      const status = result.success ? '✅' : '❌';
      console.log(`${status} ${result.test}`);
      if (!result.success && result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });

    if (successful === total) {
      console.log('\n🎉 All tests passed! Unified Upload System is working correctly.');
    } else {
      console.log('\n⚠️  Some tests failed. Check the errors above.');
    }
  }
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new UnifiedUploadTester();
  tester.runAllTests().catch(error => {
    console.error('💥 Test runner crashed:', error);
    process.exit(1);
  });
}
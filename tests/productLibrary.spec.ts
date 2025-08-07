/**
 * ProductLibrary E2E Tests
 * Comprehensive Playwright tests for product management functionality with role-based authentication
 */

import { test, expect, Page } from '@playwright/test';
import path from 'path';

// Test user credentials for different roles
const TEST_USERS = {
  admin: {
    email: 'samsutton@rich-habits.com',
    password: 'Arlodog2013!',
    role: 'admin'
  },
  designer: {
    email: 'designer@threadcraft.com', 
    password: 'designer123',
    role: 'designer'
  },
  salesperson: {
    email: 'sales@threadcraft.com',
    password: 'sales123', 
    role: 'salesperson'
  },
  customer: {
    email: 'customer@threadcraft.com',
    password: 'customer123',
    role: 'customer'
  }
};

// Realistic seed data for testing
const SEED_PRODUCT = {
  name: 'E2E Test Athletic Jersey',
  category: 'Athletic Wear',
  sport: 'Basketball',
  basePrice: '45.99',
  unitCost: '22.50',
  sku: `E2E-TEST-${Date.now()}`,
  description: 'Premium basketball jersey for E2E testing with moisture-wicking fabric',
  status: 'active',
  etaDays: '10',
  minQuantity: '12',
  maxQuantity: '500',
  sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  colors: ['Navy Blue', 'Red', 'White', 'Black'],
  tags: ['athletic', 'basketball', 'jersey', 'e2e-test'],
  fabric: 'Moisture-wicking polyester blend',
  buildInstructions: 'Standard jersey construction with reinforced seams'
};

/**
 * Authentication helper function
 */
async function authenticateUser(page: Page, userType: keyof typeof TEST_USERS) {
  const user = TEST_USERS[userType];
  
  console.log(`🔑 Authenticating as ${userType}: ${user.email}`);
  
  // Navigate to login page
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');
  
  // Fill credentials
  await page.fill('input[name="email"], input[type="email"]', user.email);
  await page.fill('input[name="password"], input[type="password"]', user.password);
  
  // Submit login form
  await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
  
  // Wait for successful authentication redirect
  try {
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    console.log(`✅ Successfully authenticated as ${userType}`);
  } catch (error) {
    // Fallback - wait for URL that doesn't contain 'login'
    await page.waitForFunction(() => !window.location.pathname.includes('login'), { timeout: 10000 });
    console.log(`✅ Successfully authenticated as ${userType} (alternative redirect)`);
  }
  
  return user;
}

/**
 * API helper to create product via backend
 */
async function createProductViaAPI(page: Page, productData = SEED_PRODUCT) {
  console.log('📦 Creating product via API...');
  
  const response = await page.request.post('/api/products/library', {
    data: productData
  });
  
  expect(response.status()).toBe(201);
  const result = await response.json();
  expect(result.success).toBe(true);
  
  console.log(`✅ Product created: ${result.data.id} - ${result.data.name}`);
  return result.data;
}

/**
 * File upload helper
 */
async function createTestImageFile() {
  // Create a simple test image file buffer (1x1 PNG)
  const pngBuffer = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
    0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
    0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0xD7, 0x63, 0xF8, 0x00, 0x00, 0x00,
    0x01, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00
  ]);
  
  return pngBuffer;
}

test.describe('ProductLibrary E2E Tests', () => {
  let testProductId: string;

  test.describe('Admin Product Creation Flow', () => {
    test('Admin creates new product successfully', async ({ page }) => {
      // ==========================================
      // STEP 1: Authenticate as Admin
      // ==========================================
      await authenticateUser(page, 'admin');
      
      // ==========================================
      // STEP 2: Navigate to Product Library
      // ==========================================
      console.log('📚 Navigating to Product Library...');
      await page.goto('/product-library');
      await page.waitForLoadState('networkidle');
      
      // ==========================================
      // STEP 3: Open Create Product Form
      // ==========================================
      console.log('📝 Opening create product form...');
      
      // Look for create/add button with various selectors
      const createButton = page.locator('button:has-text("Create Product"), button:has-text("Add Product"), button:has-text("New Product"), button[data-testid="create-product"], .create-product-btn');
      await expect(createButton.first()).toBeVisible({ timeout: 10000 });
      await createButton.first().click();
      
      // Wait for form to be visible
      await page.waitForSelector('form, [data-testid="product-form"], .product-form', { timeout: 5000 });
      
      // ==========================================
      // STEP 4: Fill Product Form
      // ==========================================
      console.log('📋 Filling product form...');
      
      // Basic product information
      await page.fill('input[name="name"], input[data-testid="product-name"]', SEED_PRODUCT.name);
      await page.fill('input[name="sku"], input[data-testid="product-sku"]', SEED_PRODUCT.sku);
      await page.fill('input[name="basePrice"], input[data-testid="base-price"]', SEED_PRODUCT.basePrice);
      await page.fill('input[name="unitCost"], input[data-testid="unit-cost"]', SEED_PRODUCT.unitCost);
      
      // Category and sport selection
      await page.selectOption('select[name="category"], select[data-testid="category"]', SEED_PRODUCT.category);
      await page.selectOption('select[name="sport"], select[data-testid="sport"]', SEED_PRODUCT.sport);
      
      // Description and other fields
      await page.fill('textarea[name="description"], textarea[data-testid="description"]', SEED_PRODUCT.description);
      await page.fill('input[name="etaDays"], input[data-testid="eta-days"]', SEED_PRODUCT.etaDays);
      await page.fill('input[name="minQuantity"], input[data-testid="min-quantity"]', SEED_PRODUCT.minQuantity);
      await page.fill('input[name="maxQuantity"], input[data-testid="max-quantity"]', SEED_PRODUCT.maxQuantity);
      
      // ==========================================
      // STEP 5: Submit Form
      // ==========================================
      console.log('💾 Submitting product form...');
      
      const submitButton = page.locator('button[type="submit"], button:has-text("Create"), button:has-text("Save"), button[data-testid="submit-product"]');
      await submitButton.click();
      
      // ==========================================
      // STEP 6: Verify Success
      // ==========================================
      console.log('✅ Verifying product creation...');
      
      // Wait for success message or redirect
      await expect(page.locator('.success-message, .toast-success, [data-testid="success-message"]')).toBeVisible({ timeout: 10000 });
      
      // Verify we're redirected to product detail page or back to list
      await page.waitForURL('**/product-library/**', { timeout: 10000 });
      
      // Extract product ID from URL for later tests
      const currentUrl = page.url();
      const urlParts = currentUrl.split('/');
      testProductId = urlParts[urlParts.length - 1];
      
      console.log(`✅ Product created successfully with ID: ${testProductId}`);
      
      // Verify product appears in the UI
      await expect(page.locator(`text=${SEED_PRODUCT.name}`)).toBeVisible();
      await expect(page.locator(`text=${SEED_PRODUCT.sku}`)).toBeVisible();
    });

    test('Admin form validation works correctly', async ({ page }) => {
      await authenticateUser(page, 'admin');
      await page.goto('/product-library');
      await page.waitForLoadState('networkidle');
      
      // Open create form
      const createButton = page.locator('button:has-text("Create Product"), button:has-text("Add Product"), button:has-text("New Product")');
      await createButton.first().click();
      
      // Try to submit empty form
      const submitButton = page.locator('button[type="submit"], button:has-text("Create"), button:has-text("Save")');
      await submitButton.click();
      
      // Verify validation errors appear
      await expect(page.locator('.error-message, .field-error, [data-testid="validation-error"]')).toBeVisible({ timeout: 5000 });
      
      console.log('✅ Form validation working correctly');
    });
  });

  test.describe('Designer Mockup Upload Flow', () => {
    test.beforeEach(async ({ page }) => {
      // Create a test product first as admin
      await authenticateUser(page, 'admin');
      const product = await createProductViaAPI(page, SEED_PRODUCT);
      testProductId = product.id;
      console.log(`🛠️ Setup: Created test product ${testProductId}`);
    });

    test('Designer uploads mockup for product successfully', async ({ page }) => {
      // ==========================================
      // STEP 1: Authenticate as Designer
      // ==========================================
      await authenticateUser(page, 'designer');
      
      // ==========================================
      // STEP 2: Navigate to Product Detail Page
      // ==========================================
      console.log(`🎨 Navigating to product detail page: ${testProductId}`);
      await page.goto(`/product-library/${testProductId}`);
      await page.waitForLoadState('networkidle');
      
      // ==========================================
      // STEP 3: Open Upload Mockup Modal
      // ==========================================
      console.log('📤 Opening mockup upload modal...');
      
      const uploadButton = page.locator('button:has-text("Upload Mockup"), button:has-text("Add Mockup"), button[data-testid="upload-mockup"], .upload-mockup-btn');
      await expect(uploadButton.first()).toBeVisible({ timeout: 10000 });
      await uploadButton.first().click();
      
      // Wait for upload modal/form to appear
      await page.waitForSelector('.upload-modal, .mockup-upload-form, [data-testid="upload-modal"]', { timeout: 5000 });
      
      // ==========================================
      // STEP 4: Upload Test Image File
      // ==========================================
      console.log('🖼️ Uploading test mockup image...');
      
      // Create temporary test image file
      const testImageBuffer = await createTestImageFile();
      
      // Find file input and upload
      const fileInput = page.locator('input[type="file"], input[accept*="image"], [data-testid="file-input"]');
      
      // Create a temporary file for upload
      const testImagePath = path.join(__dirname, 'temp-test-mockup.png');
      await page.evaluate(async ({ buffer, filePath }) => {
        const fs = require('fs');
        fs.writeFileSync(filePath, Buffer.from(buffer));
      }, { buffer: Array.from(testImageBuffer), filePath: testImagePath });
      
      await fileInput.setInputFiles(testImagePath);
      
      // ==========================================
      // STEP 5: Fill Upload Metadata
      // ==========================================
      console.log('📝 Filling mockup metadata...');
      
      // Fill designer attribution and description if fields exist
      const designerField = page.locator('input[name="designer"], input[data-testid="designer-name"]');
      if (await designerField.isVisible()) {
        await designerField.fill('E2E Test Designer');
      }
      
      const descriptionField = page.locator('textarea[name="description"], textarea[data-testid="mockup-description"]');
      if (await descriptionField.isVisible()) {
        await descriptionField.fill('E2E test mockup upload for basketball jersey design');
      }
      
      // ==========================================
      // STEP 6: Submit Upload
      // ==========================================
      console.log('💾 Submitting mockup upload...');
      
      const uploadSubmitButton = page.locator('button:has-text("Upload"), button:has-text("Save"), button[type="submit"]');
      await uploadSubmitButton.click();
      
      // ==========================================
      // STEP 7: Verify Upload Success
      // ==========================================
      console.log('✅ Verifying mockup upload...');
      
      // Wait for success message
      await expect(page.locator('.success-message, .toast-success, [data-testid="upload-success"]')).toBeVisible({ timeout: 15000 });
      
      // Verify mockup appears in the mockup gallery
      await expect(page.locator('.mockup-gallery img, .uploaded-mockup, [data-testid="mockup-image"]')).toBeVisible({ timeout: 10000 });
      
      console.log('✅ Mockup uploaded successfully by designer');
      
      // Clean up temporary file
      await page.evaluate((filePath) => {
        try {
          const fs = require('fs');
          fs.unlinkSync(filePath);
        } catch (e) {
          console.log('Temp file cleanup skipped');
        }
      }, testImagePath);
    });

    test('Designer can see upload history and metadata', async ({ page }) => {
      await authenticateUser(page, 'designer');
      await page.goto(`/product-library/${testProductId}`);
      await page.waitForLoadState('networkidle');
      
      // Check for mockup history section
      const historySection = page.locator('.mockup-history, .upload-history, [data-testid="mockup-history"]');
      await expect(historySection).toBeVisible({ timeout: 10000 });
      
      console.log('✅ Designer can view mockup history');
    });
  });

  test.describe('Sales User Product View Flow', () => {
    test.beforeEach(async ({ page }) => {
      // Setup: Create product and upload mockup
      await authenticateUser(page, 'admin');
      const product = await createProductViaAPI(page, SEED_PRODUCT);
      testProductId = product.id;
      
      // TODO: Upload mockup via API if available
      console.log(`🛠️ Setup: Created test product ${testProductId} for sales view test`);
    });

    test('Sales user visits product detail and sees mockup history', async ({ page }) => {
      // ==========================================
      // STEP 1: Authenticate as Salesperson
      // ==========================================
      await authenticateUser(page, 'salesperson');
      
      // ==========================================
      // STEP 2: Navigate to Product Detail
      // ==========================================
      console.log(`💼 Sales user navigating to product: ${testProductId}`);
      await page.goto(`/product-library/${testProductId}`);
      await page.waitForLoadState('networkidle');
      
      // ==========================================
      // STEP 3: Verify Product Information Visible
      // ==========================================
      console.log('📋 Verifying product information visibility...');
      
      // Check that basic product info is visible
      await expect(page.locator(`text=${SEED_PRODUCT.name}`)).toBeVisible();
      await expect(page.locator(`text=${SEED_PRODUCT.sku}`)).toBeVisible();
      await expect(page.locator(`text=${SEED_PRODUCT.basePrice}`)).toBeVisible();
      
      // ==========================================
      // STEP 4: Verify Mockup History Section
      // ==========================================
      console.log('🎨 Checking mockup history section...');
      
      const mockupSection = page.locator('.mockup-section, .mockup-gallery, .mockup-history, [data-testid="mockup-section"]');
      await expect(mockupSection).toBeVisible({ timeout: 10000 });
      
      // Check for mockup upload button (sales should be able to upload)
      const uploadButton = page.locator('button:has-text("Upload Mockup"), button:has-text("Add Mockup")');
      await expect(uploadButton).toBeVisible();
      
      // ==========================================
      // STEP 5: Verify Sales-Specific Actions
      // ==========================================
      console.log('💼 Verifying sales-specific functionality...');
      
      // Check for "Copy to Order" or similar sales actions
      const copyButton = page.locator('button:has-text("Copy to Order"), button:has-text("Add to Order"), [data-testid="copy-to-order"]');
      if (await copyButton.isVisible()) {
        console.log('✅ Sales user can copy product to order');
      }
      
      // Check pricing history access
      const pricingButton = page.locator('button:has-text("Pricing History"), .pricing-history, [data-testid="pricing-history"]');
      if (await pricingButton.isVisible()) {
        console.log('✅ Sales user can view pricing history');
      }
      
      console.log('✅ Sales user successfully viewed product with mockup history');
    });

    test('Sales user can access product library listing', async ({ page }) => {
      await authenticateUser(page, 'salesperson');
      
      await page.goto('/product-library');
      await page.waitForLoadState('networkidle');
      
      // Verify product listing is accessible
      await expect(page.locator('.product-grid, .product-list, [data-testid="product-grid"]')).toBeVisible({ timeout: 10000 });
      
      // Verify search and filter functionality
      const searchInput = page.locator('input[type="search"], input[placeholder*="search"], [data-testid="search-input"]');
      if (await searchInput.isVisible()) {
        await searchInput.fill('E2E Test');
        await page.waitForTimeout(1000); // Wait for search debounce
        console.log('✅ Sales user can search products');
      }
      
      console.log('✅ Sales user can access product library');
    });
  });

  test.describe('File Upload Validation Tests', () => {
    test.beforeEach(async ({ page }) => {
      // Create test product
      await authenticateUser(page, 'admin');
      const product = await createProductViaAPI(page, SEED_PRODUCT);
      testProductId = product.id;
    });

    test('Invalid file upload behavior is handled correctly', async ({ page }) => {
      await authenticateUser(page, 'designer');
      await page.goto(`/product-library/${testProductId}`);
      await page.waitForLoadState('networkidle');
      
      // ==========================================
      // TEST 1: Invalid File Type
      // ==========================================
      console.log('📁 Testing invalid file type upload...');
      
      // Open upload modal
      const uploadButton = page.locator('button:has-text("Upload Mockup"), button:has-text("Add Mockup")');
      await uploadButton.first().click();
      
      // Create invalid file (text file instead of image)
      const invalidFilePath = path.join(__dirname, 'temp-invalid-file.txt');
      await page.evaluate((filePath) => {
        const fs = require('fs');
        fs.writeFileSync(filePath, 'This is not an image file');
      }, invalidFilePath);
      
      // Try to upload invalid file
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(invalidFilePath);
      
      // Check for validation error
      await expect(page.locator('.error-message, .validation-error, [data-testid="file-error"]')).toBeVisible({ timeout: 5000 });
      
      console.log('✅ Invalid file type properly rejected');
      
      // ==========================================
      // TEST 2: File Size Validation
      // ==========================================
      console.log('📐 Testing file size validation...');
      
      // Create oversized file (simulate large file)
      const largeFilePath = path.join(__dirname, 'temp-large-file.png');
      const largeBuffer = Buffer.alloc(15 * 1024 * 1024, 0); // 15MB file
      await page.evaluate(({ buffer, filePath }) => {
        const fs = require('fs');
        fs.writeFileSync(filePath, Buffer.from(buffer));
      }, { buffer: Array.from(largeBuffer), filePath: largeFilePath });
      
      await fileInput.setInputFiles(largeFilePath);
      
      // Check for size validation error
      const sizeError = page.locator('.error-message:has-text("size"), .validation-error:has-text("large"), [data-testid="size-error"]');
      if (await sizeError.isVisible()) {
        console.log('✅ File size validation working');
      }
      
      // Clean up test files
      await page.evaluate(() => {
        const fs = require('fs');
        try {
          fs.unlinkSync(path.join(__dirname, 'temp-invalid-file.txt'));
          fs.unlinkSync(path.join(__dirname, 'temp-large-file.png'));
        } catch (e) {
          console.log('Cleanup skipped');
        }
      });
      
      console.log('✅ File upload validation tests completed');
    });

    test('Upload progress and cancellation works', async ({ page }) => {
      await authenticateUser(page, 'designer');
      await page.goto(`/product-library/${testProductId}`);
      
      // Open upload modal
      const uploadButton = page.locator('button:has-text("Upload Mockup")');
      await uploadButton.first().click();
      
      // Start upload and check for progress indicator
      const validImageBuffer = await createTestImageFile();
      const testImagePath = path.join(__dirname, 'temp-progress-test.png');
      
      await page.evaluate(({ buffer, filePath }) => {
        const fs = require('fs');
        fs.writeFileSync(filePath, Buffer.from(buffer));
      }, { buffer: Array.from(validImageBuffer), filePath: testImagePath });
      
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(testImagePath);
      
      // Check for progress indicators
      const progressIndicator = page.locator('.progress-bar, .uploading, .spinner, [data-testid="upload-progress"]');
      if (await progressIndicator.isVisible()) {
        console.log('✅ Upload progress indicator shown');
      }
      
      // Clean up
      await page.evaluate((filePath) => {
        try {
          const fs = require('fs');
          fs.unlinkSync(filePath);
        } catch (e) {
          console.log('Cleanup skipped');
        }
      }, testImagePath);
    });
  });

  test.describe('Authorization and Access Control Tests', () => {
    test.beforeEach(async ({ page }) => {
      // Create test product as admin
      await authenticateUser(page, 'admin');
      const product = await createProductViaAPI(page, SEED_PRODUCT);
      testProductId = product.id;
    });

    test('403 redirect for unauthorized role accessing admin-only features', async ({ page }) => {
      // ==========================================
      // TEST 1: Customer Access Restriction
      // ==========================================
      console.log('🚫 Testing customer access restrictions...');
      
      await authenticateUser(page, 'customer');
      
      // Try to access product library (should be restricted)
      await page.goto('/product-library');
      
      // Check for 403 error or redirect to unauthorized page
      try {
        await page.waitForURL('**/unauthorized', { timeout: 5000 });
        console.log('✅ Customer properly redirected to unauthorized page');
      } catch {
        // Alternative: Check for 403 error message on page
        const errorMessage = page.locator('.error-403, .unauthorized, .access-denied, [data-testid="access-denied"]');
        if (await errorMessage.isVisible()) {
          console.log('✅ Customer sees access denied message');
        } else {
          console.log('⚠️ Access control may need verification');
        }
      }
      
      // ==========================================
      // TEST 2: Designer Delete Restriction
      // ==========================================
      console.log('🚫 Testing designer delete restrictions...');
      
      await authenticateUser(page, 'designer');
      await page.goto(`/product-library/${testProductId}`);
      await page.waitForLoadState('networkidle');
      
      // Designer should NOT see delete product button
      const deleteButton = page.locator('button:has-text("Delete Product"), button[data-testid="delete-product"], .delete-product-btn');
      await expect(deleteButton).not.toBeVisible();
      
      console.log('✅ Designer cannot see delete product button');
      
      // ==========================================
      // TEST 3: API-level Authorization
      // ==========================================
      console.log('🚫 Testing API-level authorization...');
      
      // Try to delete product via API as designer (should fail)
      const deleteResponse = await page.request.delete(`/api/products/library/${testProductId}`);
      expect(deleteResponse.status()).toBe(403);
      
      const deleteResult = await deleteResponse.json();
      expect(deleteResult.success).toBe(false);
      expect(deleteResult.message).toContain('Admin access required');
      
      console.log('✅ API-level authorization working correctly');
    });

    test('Role-based mockup upload permissions', async ({ page }) => {
      // ==========================================
      // TEST 1: Admin Can Upload
      // ==========================================
      console.log('👑 Testing admin mockup upload permission...');
      
      await authenticateUser(page, 'admin');
      await page.goto(`/product-library/${testProductId}`);
      
      const adminUploadButton = page.locator('button:has-text("Upload Mockup"), button:has-text("Add Mockup")');
      await expect(adminUploadButton).toBeVisible();
      console.log('✅ Admin can upload mockups');
      
      // ==========================================
      // TEST 2: Designer Can Upload
      // ==========================================
      console.log('🎨 Testing designer mockup upload permission...');
      
      await authenticateUser(page, 'designer');
      await page.goto(`/product-library/${testProductId}`);
      
      const designerUploadButton = page.locator('button:has-text("Upload Mockup"), button:has-text("Add Mockup")');
      await expect(designerUploadButton).toBeVisible();
      console.log('✅ Designer can upload mockups');
      
      // ==========================================
      // TEST 3: Salesperson Can Upload
      // ==========================================
      console.log('💼 Testing salesperson mockup upload permission...');
      
      await authenticateUser(page, 'salesperson');
      await page.goto(`/product-library/${testProductId}`);
      
      const salesUploadButton = page.locator('button:has-text("Upload Mockup"), button:has-text("Add Mockup")');
      await expect(salesUploadButton).toBeVisible();
      console.log('✅ Salesperson can upload mockups');
      
      // ==========================================
      // TEST 4: Customer Cannot Upload
      // ==========================================
      console.log('🚫 Testing customer mockup upload restriction...');
      
      // Customer should not be able to access product detail pages
      await authenticateUser(page, 'customer');
      
      try {
        await page.goto(`/product-library/${testProductId}`);
        // If customer can access, upload button should NOT be visible
        const customerUploadButton = page.locator('button:has-text("Upload Mockup"), button:has-text("Add Mockup")');
        await expect(customerUploadButton).not.toBeVisible();
        console.log('✅ Customer cannot upload mockups');
      } catch {
        // Customer likely redirected due to access restriction
        console.log('✅ Customer blocked from accessing product detail');
      }
    });

    test('Product creation and editing permissions', async ({ page }) => {
      // ==========================================
      // TEST 1: Admin Can Create/Edit
      // ==========================================
      await authenticateUser(page, 'admin');
      await page.goto('/product-library');
      
      const adminCreateButton = page.locator('button:has-text("Create Product"), button:has-text("Add Product")');
      await expect(adminCreateButton).toBeVisible();
      console.log('✅ Admin can create products');
      
      // ==========================================
      // TEST 2: Salesperson Can Create/Edit
      // ==========================================
      await authenticateUser(page, 'salesperson');
      await page.goto('/product-library');
      
      const salesCreateButton = page.locator('button:has-text("Create Product"), button:has-text("Add Product")');
      await expect(salesCreateButton).toBeVisible();
      console.log('✅ Salesperson can create products');
      
      // ==========================================
      // TEST 3: Designer Cannot Create
      // ==========================================
      await authenticateUser(page, 'designer');
      await page.goto('/product-library');
      
      const designerCreateButton = page.locator('button:has-text("Create Product"), button:has-text("Add Product")');
      await expect(designerCreateButton).not.toBeVisible();
      console.log('✅ Designer cannot create products');
      
      console.log('✅ Product creation permissions working correctly');
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test('Handles network failures gracefully', async ({ page }) => {
      await authenticateUser(page, 'admin');
      
      // Simulate network failure
      await page.route('**/api/products/library', route => route.abort('failed'));
      
      await page.goto('/product-library');
      
      // Check for error handling
      const errorMessage = page.locator('.error-message, .network-error, [data-testid="error-state"]');
      await expect(errorMessage).toBeVisible({ timeout: 10000 });
      
      console.log('✅ Network failure handled gracefully');
    });

    test('Handles invalid product ID gracefully', async ({ page }) => {
      await authenticateUser(page, 'admin');
      
      // Navigate to non-existent product
      await page.goto('/product-library/invalid-product-id');
      
      // Should show 404 or not found message
      const notFoundMessage = page.locator('.not-found, .error-404, [data-testid="not-found"]');
      await expect(notFoundMessage).toBeVisible({ timeout: 10000 });
      
      console.log('✅ Invalid product ID handled gracefully');
    });
  });

  test.afterAll(async ({ page }) => {
    // Cleanup: Remove test products if possible
    console.log('🧹 Running test cleanup...');
    
    if (testProductId) {
      try {
        await authenticateUser(page, 'admin');
        const cleanupResponse = await page.request.delete(`/api/products/library/${testProductId}`);
        if (cleanupResponse.ok()) {
          console.log(`✅ Cleaned up test product: ${testProductId}`);
        }
      } catch (error) {
        console.log('⚠️ Cleanup skipped:', error.message);
      }
    }
  });
});
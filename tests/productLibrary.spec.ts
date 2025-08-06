/**
 * PRODUCT LIBRARY E2E TESTS
 * Comprehensive Playwright tests for ProductLibrary system
 */

import { test, expect, Page } from '@playwright/test';
import path from 'path';

test.describe('ProductLibrary System', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    
    // Navigate to ProductLibrary page
    await page.goto('/product-library');
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async () => {
    await page.close();
  });

  test.describe('Product Retrieval & Display', () => {
    test('should load historical products with proper filtering', async () => {
      // Wait for the Historical Products tab to be visible
      await expect(page.locator('[data-testid="historical-products-tab"]')).toBeVisible();
      
      // Check if products are loaded
      await expect(page.locator('[data-testid="product-card"]')).toHaveCountGreaterThan(0);
      
      // Test search functionality
      await page.fill('[data-testid="product-search"]', 'jersey');
      await page.waitForTimeout(500); // Debounce delay
      
      // Verify search results
      const searchResults = page.locator('[data-testid="product-card"]');
      await expect(searchResults).toHaveCountGreaterThan(0);
      
      // Test category filter
      await page.selectOption('[data-testid="category-filter"]', 'Jerseys');
      await page.waitForTimeout(500);
      
      // Verify filtered results
      const filteredResults = page.locator('[data-testid="product-card"]');
      await expect(filteredResults).toHaveCountGreaterThan(0);
    });

    test('should display product details correctly', async () => {
      // Click on first product card
      const firstProduct = page.locator('[data-testid="product-card"]').first();
      await expect(firstProduct).toBeVisible();
      
      // Verify product card contains essential information
      await expect(firstProduct.locator('[data-testid="product-name"]')).toBeVisible();
      await expect(firstProduct.locator('[data-testid="product-category"]')).toBeVisible();
      await expect(firstProduct.locator('[data-testid="product-pricing"]')).toBeVisible();
      
      // Click to select product
      await firstProduct.click();
      
      // Verify product selection updates header
      await expect(page.locator('[data-testid="selected-product-info"]')).toBeVisible();
    });

    test('should handle empty state gracefully', async () => {
      // Apply filters that return no results
      await page.fill('[data-testid="product-search"]', 'nonexistentproduct12345');
      await page.waitForTimeout(500);
      
      // Verify empty state is displayed
      await expect(page.locator('[data-testid="empty-state"]')).toBeVisible();
      await expect(page.locator('text=No products found')).toBeVisible();
      
      // Verify clear filters button works
      await page.click('[data-testid="clear-filters-btn"]');
      await expect(page.locator('[data-testid="product-card"]')).toHaveCountGreaterThan(0);
    });
  });

  test.describe('Mockup Gallery', () => {
    test('should display mockup gallery with grid and list views', async () => {
      // Select a product first
      await page.click('[data-testid="product-card"]');
      
      // Navigate to mockups tab
      await page.click('[data-testid="mockups-tab"]');
      await page.waitForLoadState('networkidle');
      
      // Verify gallery is loaded
      await expect(page.locator('[data-testid="mockup-gallery"]')).toBeVisible();
      
      // Test view mode toggle
      await page.click('[data-testid="list-view-btn"]');
      await expect(page.locator('[data-testid="mockup-list-view"]')).toBeVisible();
      
      await page.click('[data-testid="grid-view-btn"]');
      await expect(page.locator('[data-testid="mockup-grid-view"]')).toBeVisible();
    });

    test('should filter mockups by type and designer', async () => {
      // Select a product and navigate to mockups
      await page.click('[data-testid="product-card"]');
      await page.click('[data-testid="mockups-tab"]');
      
      // Test type filter
      await page.selectOption('[data-testid="mockup-type-filter"]', 'mockup');
      await page.waitForTimeout(500);
      
      // Verify filtered results show only mockups
      const mockupCards = page.locator('[data-testid="mockup-card"]');
      await expect(mockupCards).toHaveCountGreaterThan(0);
      
      // Test designer filter
      await page.selectOption('[data-testid="designer-filter"]', { index: 1 });
      await page.waitForTimeout(500);
    });

    test('should open mockup detail modal', async () => {
      // Select product and navigate to mockups
      await page.click('[data-testid="product-card"]');
      await page.click('[data-testid="mockups-tab"]');
      
      // Click on first mockup
      const firstMockup = page.locator('[data-testid="mockup-card"]').first();
      await firstMockup.click();
      
      // Verify detail modal opens
      await expect(page.locator('[data-testid="mockup-detail-modal"]')).toBeVisible();
      await expect(page.locator('[data-testid="mockup-full-image"]')).toBeVisible();
      
      // Close modal
      await page.click('[data-testid="modal-close-btn"]');
      await expect(page.locator('[data-testid="mockup-detail-modal"]')).not.toBeVisible();
    });
  });

  test.describe('Mockup Upload', () => {
    test('should successfully upload mockup files', async () => {
      // Select a product first
      await page.click('[data-testid="product-card"]');
      
      // Navigate to upload tab
      await page.click('[data-testid="upload-tab"]');
      await page.waitForLoadState('networkidle');
      
      // Open upload dialog
      await page.click('[data-testid="upload-mockups-btn"]');
      await expect(page.locator('[data-testid="upload-dialog"]')).toBeVisible();
      
      // Set mockup type and alt text
      await page.selectOption('[data-testid="mockup-type-select"]', 'mockup');
      await page.fill('[data-testid="alt-text-input"]', 'Test mockup upload');
      await page.fill('[data-testid="notes-textarea"]', 'Automated test upload');
      
      // Upload test image
      const testImagePath = path.join(__dirname, 'fixtures', 'test-mockup.jpg');
      await page.setInputFiles('[data-testid="file-input"]', testImagePath);
      
      // Verify file is selected
      await expect(page.locator('[data-testid="selected-file"]')).toBeVisible();
      
      // Start upload
      await page.click('[data-testid="upload-btn"]');
      
      // Wait for upload completion
      await expect(page.locator('[data-testid="upload-progress"]')).toBeVisible();
      await expect(page.locator('text=Upload Successful')).toBeVisible({ timeout: 10000 });
      
      // Verify dialog closes
      await expect(page.locator('[data-testid="upload-dialog"]')).not.toBeVisible();
    });

    test('should handle upload validation errors', async () => {
      // Select product and navigate to upload
      await page.click('[data-testid="product-card"]');
      await page.click('[data-testid="upload-tab"]');
      
      // Open upload dialog
      await page.click('[data-testid="upload-mockups-btn"]');
      
      // Try to upload without selecting type
      const invalidFile = path.join(__dirname, 'fixtures', 'large-file.txt');
      await page.setInputFiles('[data-testid="file-input"]', invalidFile);
      
      // Attempt upload
      await page.click('[data-testid="upload-btn"]');
      
      // Verify error message
      await expect(page.locator('text=File type')).toBeVisible();
      await expect(page.locator('text=not supported')).toBeVisible();
    });

    test('should handle upload failure and retry', async () => {
      // Mock network failure
      await page.route('/api/products/library/*/mockups', route => {
        if (route.request().method() === 'POST') {
          route.abort('failed');
        }
      });
      
      // Select product and navigate to upload
      await page.click('[data-testid="product-card"]');
      await page.click('[data-testid="upload-tab"]');
      
      // Open upload dialog and configure
      await page.click('[data-testid="upload-mockups-btn"]');
      await page.selectOption('[data-testid="mockup-type-select"]', 'mockup');
      await page.fill('[data-testid="alt-text-input"]', 'Test retry upload');
      
      // Upload test image
      const testImagePath = path.join(__dirname, 'fixtures', 'test-mockup.jpg');
      await page.setInputFiles('[data-testid="file-input"]', testImagePath);
      
      // Start upload (should fail)
      await page.click('[data-testid="upload-btn"]');
      
      // Verify error message
      await expect(page.locator('text=Upload Failed')).toBeVisible({ timeout: 5000 });
      
      // Remove network mock for retry
      await page.unroute('/api/products/library/*/mockups');
      
      // Retry upload
      await page.click('[data-testid="upload-btn"]');
      
      // Verify successful retry
      await expect(page.locator('text=Upload Successful')).toBeVisible({ timeout: 10000 });
    });

    test('should support drag and drop upload', async () => {
      // Select product and navigate to upload
      await page.click('[data-testid="product-card"]');
      await page.click('[data-testid="upload-tab"]');
      
      // Open upload dialog
      await page.click('[data-testid="upload-mockups-btn"]');
      
      // Configure upload options
      await page.selectOption('[data-testid="mockup-type-select"]', 'product_photo');
      await page.fill('[data-testid="alt-text-input"]', 'Drag and drop test');
      
      // Simulate drag and drop
      const dropZone = page.locator('[data-testid="drop-zone"]');
      await expect(dropZone).toBeVisible();
      
      // Upload via file input (simulating drag and drop)
      const testImagePath = path.join(__dirname, 'fixtures', 'test-mockup.jpg');
      await page.setInputFiles('[data-testid="file-input"]', testImagePath);
      
      // Verify file appears in selection
      await expect(page.locator('[data-testid="selected-file"]')).toBeVisible();
      
      // Complete upload
      await page.click('[data-testid="upload-btn"]');
      await expect(page.locator('text=Upload Successful')).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Order History & Analytics', () => {
    test('should display order history with analytics', async () => {
      // Select a product first
      await page.click('[data-testid="product-card"]');
      
      // Navigate to orders tab
      await page.click('[data-testid="orders-tab"]');
      await page.waitForLoadState('networkidle');
      
      // Verify order history is displayed
      await expect(page.locator('[data-testid="order-history"]')).toBeVisible();
      
      // Test analytics toggle
      await page.click('[data-testid="analytics-tab-btn"]');
      await expect(page.locator('[data-testid="analytics-dashboard"]')).toBeVisible();
      
      // Verify key metrics are displayed
      await expect(page.locator('[data-testid="total-orders-metric"]')).toBeVisible();
      await expect(page.locator('[data-testid="total-revenue-metric"]')).toBeVisible();
      await expect(page.locator('[data-testid="popular-sizes-chart"]')).toBeVisible();
      await expect(page.locator('[data-testid="popular-colors-chart"]')).toBeVisible();
    });

    test('should filter order history correctly', async () => {
      // Select product and navigate to orders
      await page.click('[data-testid="product-card"]');
      await page.click('[data-testid="orders-tab"]');
      
      // Test customer search
      await page.fill('[data-testid="customer-search"]', 'John');
      await page.waitForTimeout(500);
      
      // Test size filter
      await page.selectOption('[data-testid="size-filter"]', 'Large');
      await page.waitForTimeout(500);
      
      // Test color filter
      await page.selectOption('[data-testid="color-filter"]', 'Blue');
      await page.waitForTimeout(500);
      
      // Verify filtered results
      const filteredOrders = page.locator('[data-testid="order-item"]');
      await expect(filteredOrders).toHaveCount(0);
    });
  });

  test.describe('Navigation & State Management', () => {
    test('should maintain selected product across tabs', async () => {
      // Select a product
      const firstProduct = page.locator('[data-testid="product-card"]').first();
      await firstProduct.click();
      
      // Verify product is selected
      await expect(page.locator('[data-testid="selected-product-info"]')).toBeVisible();
      
      // Navigate between tabs
      await page.click('[data-testid="mockups-tab"]');
      await expect(page.locator('[data-testid="selected-product-banner"]')).toBeVisible();
      
      await page.click('[data-testid="upload-tab"]');
      await expect(page.locator('[data-testid="selected-product-banner"]')).toBeVisible();
      
      await page.click('[data-testid="orders-tab"]');
      await expect(page.locator('[data-testid="selected-product-banner"]')).toBeVisible();
      
      // Return to historical products
      await page.click('[data-testid="historical-products-tab"]');
      await expect(page.locator('[data-testid="selected-product-info"]')).toBeVisible();
    });

    test('should show appropriate empty states when no product selected', async () => {
      // Navigate to upload tab without selecting product
      await page.click('[data-testid="upload-tab"]');
      await expect(page.locator('[data-testid="no-product-selected"]')).toBeVisible();
      await expect(page.locator('text=Select a Product First')).toBeVisible();
      
      // Navigate to orders tab without selecting product
      await page.click('[data-testid="orders-tab"]');
      await expect(page.locator('[data-testid="no-product-selected"]')).toBeVisible();
    });
  });

  test.describe('Performance & Loading States', () => {
    test('should display loading states correctly', async () => {
      // Mock slow API response
      await page.route('/api/products/library*', route => {
        setTimeout(() => route.continue(), 2000);
      });
      
      // Reload page to trigger loading
      await page.reload();
      
      // Verify loading skeletons
      await expect(page.locator('[data-testid="product-skeleton"]')).toBeVisible();
      
      // Wait for content to load
      await expect(page.locator('[data-testid="product-card"]')).toBeVisible({ timeout: 5000 });
    });

    test('should handle API errors gracefully', async () => {
      // Mock API error
      await page.route('/api/products/library*', route => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Internal server error' })
        });
      });
      
      // Reload page
      await page.reload();
      
      // Verify error state
      await expect(page.locator('[data-testid="error-state"]')).toBeVisible();
      await expect(page.locator('text=Failed to load')).toBeVisible();
      
      // Test retry functionality
      await page.unroute('/api/products/library*');
      await page.click('[data-testid="retry-btn"]');
      
      // Verify content loads after retry
      await expect(page.locator('[data-testid="product-card"]')).toBeVisible({ timeout: 5000 });
    });
  });
});

// Test fixture creation helpers
test.beforeAll(async () => {
  // Create test fixture directory
  const fs = require('fs');
  const path = require('path');
  
  const fixturesDir = path.join(__dirname, 'fixtures');
  if (!fs.existsSync(fixturesDir)) {
    fs.mkdirSync(fixturesDir, { recursive: true });
  }
  
  // Create test image file (1x1 pixel JPEG)
  const testImageData = Buffer.from([
    0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
    0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43
  ]);
  
  fs.writeFileSync(path.join(fixturesDir, 'test-mockup.jpg'), testImageData);
  
  // Create large text file for error testing
  const largeTextData = 'X'.repeat(15 * 1024 * 1024); // 15MB text file
  fs.writeFileSync(path.join(fixturesDir, 'large-file.txt'), largeTextData);
});

/**
 * COMPREHENSIVE CATALOG SYSTEM TEST SUITE
 * Tests every aspect of catalog functionality including:
 * - CRUD operations
 * - Image uploads
 * - Error handling
 * - Authentication
 * - Data validation
 * - UI interactions
 */

import { test, expect } from '@playwright/test';

test.describe('Comprehensive Catalog System Tests', () => {
  let authToken;
  let testItemId;

  test.beforeEach(async ({ page }) => {
    // Login and get auth token
    await page.goto('/login');
    await page.fill('[name="email"]', 'admin@threadcraft.com');
    await page.fill('[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/admin/dashboard');
    
    // Extract auth token from localStorage
    authToken = await page.evaluate(() => localStorage.getItem('authToken'));
    expect(authToken).toBeTruthy();
  });

  test('Complete Catalog CRUD Workflow', async ({ page }) => {
    // Navigate to catalog page
    await page.goto('/admin/catalog');
    await page.waitForLoadState('networkidle');

    // Test 1: Create new catalog item
    await page.click('button:has-text("Add Item")');
    await page.waitForSelector('[role="dialog"]');

    // Fill form step by step (onboarding flow)
    await page.fill('[name="name"]', 'Test Basketball Jersey');
    await page.selectOption('[name="category"]', 'Jerseys');
    await page.selectOption('[name="sport"]', 'Basketball');
    
    // Go to next step
    await page.click('button:has-text("Next")');
    
    // Fill pricing
    await page.fill('[name="basePrice"]', '45.99');
    await page.fill('[name="unitCost"]', '22.50');
    await page.click('button:has-text("Generate SKU")');
    
    // Continue through all steps
    await page.click('button:has-text("Next")');
    await page.fill('[name="description"]', 'High-quality basketball jersey');
    
    await page.click('button:has-text("Next")');
    await page.fill('[name="sizes"]', 'S, M, L, XL');
    await page.fill('[name="colors"]', 'Navy, Red, White');
    
    await page.click('button:has-text("Next")');
    // Skip image upload for now
    
    // Submit form
    await page.click('button:has-text("Create Item")');
    
    // Wait for success toast
    await page.waitForSelector('.toast:has-text("Item Created Successfully")');
    
    // Verify item appears in catalog
    await page.waitForSelector('text=Test Basketball Jersey');
    
    // Test 2: Edit the created item
    await page.click('[data-testid="edit-item"]:near(text="Test Basketball Jersey")');
    await page.waitForSelector('text=Edit Catalog Item');
    
    // Modify the item
    await page.fill('[name="name"]', 'Updated Basketball Jersey');
    await page.click('button:has-text("Update Item")');
    
    // Wait for success
    await page.waitForSelector('.toast:has-text("Item Updated Successfully")');
    
    // Test 3: Search and filter
    await page.goto('/admin/catalog');
    await page.fill('[placeholder="Search catalog items..."]', 'Updated');
    await page.waitForTimeout(500);
    
    // Verify filtered results
    await page.waitForSelector('text=Updated Basketball Jersey');
    
    // Test 4: Delete item
    await page.click('[data-testid="delete-item"]:near(text="Updated Basketball Jersey")');
    await page.waitForSelector('[role="dialog"]:has-text("Delete Catalog Item")');
    await page.fill('[name="confirmationText"]', 'Updated Basketball Jersey');
    await page.click('button:has-text("Delete Item")');
    
    // Wait for success
    await page.waitForSelector('.toast:has-text("Item Deleted Successfully")');
    
    // Verify item is removed
    await expect(page.locator('text=Updated Basketball Jersey')).toHaveCount(0);
  });

  test('Image Upload and Management', async ({ page }) => {
    await page.goto('/admin/catalog');
    
    // Create item for image testing
    await page.click('button:has-text("Add Item")');
    
    // Quick item creation
    await page.fill('[name="name"]', 'Image Test Item');
    await page.selectOption('[name="category"]', 'Jerseys');
    await page.selectOption('[name="sport"]', 'Basketball');
    
    // Navigate to image step
    await page.click('button:has-text("Next")');
    await page.fill('[name="basePrice"]', '25.00');
    await page.click('button:has-text("Next")');
    await page.click('button:has-text("Next")');
    await page.click('button:has-text("Next")');
    
    // Test image upload
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('./test-assets/test-image.jpg');
    
    // Wait for upload completion
    await page.waitForSelector('text=Upload completed');
    
    // Submit form
    await page.click('button:has-text("Create Item")');
    await page.waitForSelector('.toast:has-text("Item Created Successfully")');
    
    // Verify image appears in catalog
    await page.waitForSelector('img[alt*="Image Test Item"]');
  });

  test('Error Handling and Edge Cases', async ({ page }) => {
    await page.goto('/admin/catalog');
    
    // Test 1: Form validation errors
    await page.click('button:has-text("Add Item")');
    await page.click('button:has-text("Create Item")');
    
    // Should show validation errors
    await page.waitForSelector('text=Product name is required');
    
    // Test 2: Network error simulation
    await page.route('/api/catalog', route => route.abort());
    await page.reload();
    
    // Should show error state
    await page.waitForSelector('text=Unable to load catalog');
    
    // Test 3: Authentication error
    await page.evaluate(() => localStorage.removeItem('authToken'));
    await page.reload();
    
    // Should redirect to login or show auth error
    await page.waitForURL(/login|auth/);
  });

  test('Performance and Large Dataset Handling', async ({ page }) => {
    await page.goto('/admin/catalog');
    
    // Test pagination with large dataset
    // Create multiple items quickly via API
    for (let i = 0; i < 25; i++) {
      await page.evaluate(async (index) => {
        const token = localStorage.getItem('authToken');
        await fetch('/api/catalog', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            name: `Bulk Test Item ${index}`,
            category: 'Test',
            sport: 'General',
            basePrice: 10.00 + index,
            unitCost: 5.00
          })
        });
      }, i);
    }
    
    // Reload and test performance
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Should load within reasonable time
    const startTime = Date.now();
    await page.waitForSelector('text=Bulk Test Item');
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(5000); // Should load within 5 seconds
    
    // Test search performance
    await page.fill('[placeholder="Search catalog items..."]', 'Bulk Test');
    await page.waitForTimeout(1000);
    
    // Should show filtered results
    const items = await page.locator('text=Bulk Test Item').count();
    expect(items).toBeGreaterThan(0);
  });
});

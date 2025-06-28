
const { test, expect } = require('@playwright/test');

test.describe('Catalog Route Diagnostic Tests', () => {
  test('Complete catalog functionality check', async ({ page }) => {
    // Track console errors and network failures
    const consoleErrors = [];
    const networkErrors = [];
    const redirects = [];
    const brokenImages = [];

    // ==========================================
    // SETUP: Error and Network Monitoring
    // ==========================================
    
    // Capture console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push({
          type: 'console_error',
          text: msg.text(),
          location: msg.location()
        });
      }
    });

    // Capture JavaScript exceptions
    page.on('pageerror', error => {
      consoleErrors.push({
        type: 'page_error',
        message: error.message,
        stack: error.stack
      });
    });

    // Monitor network requests
    page.on('response', response => {
      const url = response.url();
      const status = response.status();
      
      // Track redirects
      if (status >= 300 && status < 400) {
        redirects.push({
          url: url,
          status: status,
          redirectLocation: response.headers()['location']
        });
      }
      
      // Track failed requests
      if (status >= 400) {
        networkErrors.push({
          url: url,
          status: status,
          statusText: response.statusText()
        });
      }
    });

    // ==========================================
    // TEST 1: Route Navigation and Status Check
    // ==========================================
    console.log('🔍 Testing catalog route navigation...');
    
    try {
      // Navigate to catalog with extended timeout for development environment
      const response = await page.goto('http://0.0.0.0:5000/catalog', {
        waitUntil: 'networkidle',
        timeout: 30000
      });
      
      // Verify response status
      expect(response.status()).toBe(200);
      console.log('✅ Catalog route returns status 200');
      
      // Wait for the page to be fully loaded
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000); // Allow time for React to render
      
    } catch (error) {
      console.error('❌ Failed to navigate to catalog:', error.message);
      throw error;
    }

    // ==========================================
    // TEST 2: Authentication Check (if required)
    // ==========================================
    console.log('🔍 Checking for authentication requirements...');
    
    // Check if we're redirected to login
    const currentUrl = page.url();
    if (currentUrl.includes('/login')) {
      console.log('🔑 Authentication required - attempting login...');
      
      // Attempt to login with test credentials
      await page.fill('input[name="email"], input[type="email"]', 'samsutton@rich-habits.com');
      await page.fill('input[name="password"], input[type="password"]', 'Arlodog2013!');
      await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
      
      // Wait for navigation after login
      await page.waitForURL('**/catalog', { timeout: 10000 });
      console.log('✅ Authentication successful');
    }

    // ==========================================
    // TEST 3: Main Layout and Structure Check
    // ==========================================
    console.log('🔍 Verifying catalog layout structure...');
    
    // Check for main title/heading
    const titleSelectors = [
      'h1:has-text("Product Catalog")',
      'h1:has-text("Catalog")', 
      'h1',
      '[data-testid="catalog-title"]',
      '.catalog-title'
    ];
    
    let titleFound = false;
    for (const selector of titleSelectors) {
      try {
        const title = await page.locator(selector).first();
        if (await title.isVisible()) {
          const titleText = await title.textContent();
          console.log(`✅ Main title found: "${titleText}"`);
          titleFound = true;
          break;
        }
      } catch (error) {
        // Continue to next selector
      }
    }
    
    if (!titleFound) {
      console.error('❌ No main title/heading found');
    }

    // ==========================================
    // TEST 4: Product/Item Components Check
    // ==========================================
    console.log('🔍 Checking for product items...');
    
    // Wait for potential loading states to complete
    await page.waitForTimeout(3000);
    
    // Check for various product item patterns
    const productSelectors = [
      '[data-testid*="catalog-item"]',
      '[data-testid*="product"]',
      'tr:has(td)', // Table rows with data
      '.catalog-item',
      '.product-item',
      '.card:has(img)',
      'table tbody tr',
      '[role="row"]:not([role="columnheader"])'
    ];
    
    let itemsFound = false;
    let itemCount = 0;
    
    for (const selector of productSelectors) {
      try {
        const items = await page.locator(selector);
        const count = await items.count();
        if (count > 0) {
          itemCount = count;
          itemsFound = true;
          console.log(`✅ Found ${count} product items using selector: ${selector}`);
          break;
        }
      } catch (error) {
        // Continue to next selector
      }
    }
    
    if (!itemsFound) {
      // Check for empty state messages
      const emptyStateSelectors = [
        ':has-text("No catalog items")',
        ':has-text("No items found")',
        ':has-text("empty")',
        '.empty-state'
      ];
      
      for (const selector of emptyStateSelectors) {
        try {
          const emptyState = await page.locator(selector).first();
          if (await emptyState.isVisible()) {
            console.log('ℹ️  Catalog appears to be empty (valid state)');
            itemsFound = true; // Empty state is valid
            break;
          }
        } catch (error) {
          // Continue
        }
      }
    }
    
    if (!itemsFound) {
      console.error('❌ No product items or empty state found');
    }

    // ==========================================
    // TEST 5: Image Validation Check
    // ==========================================
    console.log('🔍 Checking for broken images...');
    
    const images = await page.locator('img').all();
    console.log(`Found ${images.length} images to check`);
    
    for (let i = 0; i < images.length; i++) {
      try {
        const img = images[i];
        const src = await img.getAttribute('src');
        const alt = await img.getAttribute('alt') || 'No alt text';
        
        if (!src || src === '' || src === '#') {
          brokenImages.push({
            index: i,
            src: src,
            alt: alt,
            issue: 'Empty or invalid src'
          });
          continue;
        }
        
        // Check if image is visible and properly loaded
        const isVisible = await img.isVisible();
        if (isVisible) {
          // Use JavaScript to check if image loaded properly
          const naturalWidth = await img.evaluate(img => img.naturalWidth);
          const naturalHeight = await img.evaluate(img => img.naturalHeight);
          
          if (naturalWidth === 0 || naturalHeight === 0) {
            brokenImages.push({
              index: i,
              src: src,
              alt: alt,
              issue: 'Failed to load (0 dimensions)'
            });
          }
        }
      } catch (error) {
        brokenImages.push({
          index: i,
          error: error.message,
          issue: 'Error checking image'
        });
      }
    }
    
    if (brokenImages.length === 0) {
      console.log('✅ All images appear to be loading correctly');
    } else {
      console.error(`❌ Found ${brokenImages.length} potentially broken images`);
    }

    // ==========================================
    // TEST 6: Interactive Elements Check
    // ==========================================
    console.log('🔍 Checking interactive elements...');
    
    // Check for key interactive elements
    const interactiveElements = [
      'button:has-text("Add Item")',
      'button:has-text("Add")',
      'input[type="search"]',
      'input[placeholder*="search" i]',
      'select',
      '[role="button"]'
    ];
    
    for (const selector of interactiveElements) {
      try {
        const element = await page.locator(selector).first();
        if (await element.isVisible()) {
          console.log(`✅ Interactive element found: ${selector}`);
        }
      } catch (error) {
        // Element not found, continue
      }
    }

    // ==========================================
    // FINAL: Error Summary and Results
    // ==========================================
    console.log('\n📊 DIAGNOSTIC SUMMARY:');
    console.log('========================');
    
    // Log redirects
    if (redirects.length > 0) {
      console.log(`🔄 Redirects detected: ${redirects.length}`);
      redirects.forEach((redirect, index) => {
        console.log(`  ${index + 1}. ${redirect.url} -> ${redirect.status} -> ${redirect.redirectLocation}`);
      });
    } else {
      console.log('✅ No unexpected redirects');
    }
    
    // Log network errors
    if (networkErrors.length > 0) {
      console.log(`🌐 Network errors: ${networkErrors.length}`);
      networkErrors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error.url} - ${error.status} ${error.statusText}`);
      });
    } else {
      console.log('✅ No network errors');
    }
    
    // Log console errors
    if (consoleErrors.length > 0) {
      console.log(`💥 Console/JavaScript errors: ${consoleErrors.length}`);
      consoleErrors.forEach((error, index) => {
        console.log(`  ${index + 1}. [${error.type}] ${error.message || error.text}`);
        if (error.location) {
          console.log(`     Location: ${error.location.url}:${error.location.lineNumber}`);
        }
      });
    } else {
      console.log('✅ No console errors');
    }
    
    // Log broken images
    if (brokenImages.length > 0) {
      console.log(`🖼️  Broken images: ${brokenImages.length}`);
      brokenImages.forEach((img, index) => {
        console.log(`  ${index + 1}. ${img.issue} - src: ${img.src} - alt: ${img.alt}`);
      });
    } else {
      console.log('✅ No broken images detected');
    }
    
    console.log('========================\n');

    // ==========================================
    // ASSERTIONS: Fail test if critical issues found
    // ==========================================
    
    // Critical assertions that should fail the test
    expect(titleFound, 'Main title/heading should be present').toBe(true);
    expect(itemsFound, 'Should have product items or valid empty state').toBe(true);
    
    // Warning assertions (log but don't fail)
    if (consoleErrors.length > 0) {
      console.warn(`⚠️  Warning: ${consoleErrors.length} console errors detected`);
    }
    
    if (networkErrors.length > 0) {
      console.warn(`⚠️  Warning: ${networkErrors.length} network errors detected`);
    }
    
    if (brokenImages.length > 0) {
      console.warn(`⚠️  Warning: ${brokenImages.length} broken images detected`);
    }
    
    console.log('🎉 Catalog diagnostic test completed successfully!');
  });
});

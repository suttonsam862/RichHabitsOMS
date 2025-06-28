
// Using built-in fetch (Node.js 18+)

const API_BASE = 'http://0.0.0.0:5000';

class CatalogAPITest {
  constructor() {
    this.authToken = null;
    this.results = [];
  }

  async runTests() {
    console.log('🚀 Starting Catalog API Tests...\n');

    try {
      await this.authenticate();
      await this.testCatalogRoutes();
      await this.testCatalogOptions();
      this.printResults();
    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
    }
  }

  async authenticate() {
    console.log('🔐 Testing Authentication...');
    
    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'samsutton@rich-habits.com',
          password: 'Arlodog2013!'
        })
      });

      console.log('Auth response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Auth response data:', data);
        
        // Check both possible token locations
        this.authToken = data.token || data.session?.token;
        
        if (!this.authToken) {
          throw new Error('No token found in response');
        }
        
        this.results.push({ test: 'Authentication', status: '✅ PASS', details: 'Login successful' });
        console.log('✅ Authentication successful');
      } else {
        const errorText = await response.text();
        console.log('Auth error response:', errorText);
        this.results.push({ test: 'Authentication', status: '❌ FAIL', details: `Status: ${response.status} - ${errorText}` });
        throw new Error(`Authentication failed: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.error('Authentication error details:', error);
      this.results.push({ test: 'Authentication', status: '❌ FAIL', details: error.message });
      throw error;
    }
  }

  async testCatalogRoutes() {
    console.log('\n📋 Testing Catalog Routes...');
    
    const routes = [
      { method: 'GET', path: '/api/catalog', name: 'List Catalog Items' },
      { method: 'GET', path: '/api/catalog-options/categories', name: 'List Categories' },
      { method: 'GET', path: '/api/catalog-options/sports', name: 'List Sports' }
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
          this.results.push({ 
            test: route.name, 
            status: '✅ PASS', 
            details: `Status: ${response.status}, Items: ${Array.isArray(data) ? data.length : 'N/A'}` 
          });
          console.log(`✅ ${route.name}: ${response.status}`);
        } else {
          this.results.push({ 
            test: route.name, 
            status: '❌ FAIL', 
            details: `Status: ${response.status}` 
          });
          console.log(`❌ ${route.name}: ${response.status}`);
        }
      } catch (error) {
        this.results.push({ 
          test: route.name, 
          status: '❌ FAIL', 
          details: error.message 
        });
        console.log(`❌ ${route.name}: ${error.message}`);
      }
    }
  }

  async testCatalogOptions() {
    console.log('\n🏷️ Testing Catalog Options...');
    
    try {
      // Test categories
      const categoriesResponse = await fetch(`${API_BASE}/api/catalog-options/categories`, {
        headers: { 'Authorization': `Bearer ${this.authToken}` }
      });
      
      if (categoriesResponse.ok) {
        const categoriesData = await categoriesResponse.json();
        const categoriesCount = categoriesData.data?.categories?.length || 0;
        this.results.push({ 
          test: 'Categories Availability', 
          status: categoriesCount > 0 ? '✅ PASS' : '⚠️ WARN', 
          details: `${categoriesCount} categories found` 
        });
        console.log(`✅ Categories: ${categoriesCount} available`);
      }

      // Test sports
      const sportsResponse = await fetch(`${API_BASE}/api/catalog-options/sports`, {
        headers: { 'Authorization': `Bearer ${this.authToken}` }
      });
      
      if (sportsResponse.ok) {
        const sportsData = await sportsResponse.json();
        const sportsCount = sportsData.data?.sports?.length || 0;
        this.results.push({ 
          test: 'Sports Availability', 
          status: sportsCount > 0 ? '✅ PASS' : '⚠️ WARN', 
          details: `${sportsCount} sports found` 
        });
        console.log(`✅ Sports: ${sportsCount} available`);
      }
    } catch (error) {
      this.results.push({ 
        test: 'Catalog Options', 
        status: '❌ FAIL', 
        details: error.message 
      });
      console.log(`❌ Catalog Options: ${error.message}`);
    }
  }

  printResults() {
    console.log('\n📊 TEST RESULTS SUMMARY');
    console.log('========================');
    
    const passed = this.results.filter(r => r.status.includes('✅')).length;
    const failed = this.results.filter(r => r.status.includes('❌')).length;
    const warnings = this.results.filter(r => r.status.includes('⚠️')).length;
    
    console.log(`Total Tests: ${this.results.length}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Warnings: ${warnings}`);
    console.log('========================\n');
    
    this.results.forEach(result => {
      console.log(`${result.status} ${result.test}: ${result.details}`);
    });
    
    console.log('\n🎯 CATALOG SYSTEM STATUS:', failed === 0 ? '✅ READY' : '⚠️ NEEDS ATTENTION');
  }
}

// Run the tests
const tester = new CatalogAPITest();
tester.runTests().catch(console.error);

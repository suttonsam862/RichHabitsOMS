#!/usr/bin/env node

/**
 * Comprehensive Deployment Validation Script
 * This script validates all deployment checklist requirements
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

class DeploymentValidator {
  constructor() {
    this.results = {
      critical: [],
      database: [],
      auth: [],
      security: [],
      api: [],
      performance: [],
      errors: []
    };
  }

  async validateEnvironmentVariables() {
    console.log('\n🔍 1. ENVIRONMENT VARIABLES VALIDATION');
    
    const criticalVars = [
      'SUPABASE_URL',
      'SUPABASE_ANON_KEY', 
      'SUPABASE_SERVICE_KEY',
      'DATABASE_URL',
      'SESSION_SECRET'
    ];

    for (const varName of criticalVars) {
      if (process.env[varName]) {
        this.results.critical.push(`✅ ${varName}: Set`);
      } else {
        this.results.critical.push(`❌ ${varName}: MISSING`);
      }
    }

    // Check NODE_ENV
    if (process.env.NODE_ENV === 'production') {
      this.results.critical.push('✅ NODE_ENV: production');
    } else {
      this.results.critical.push(`⚠️ NODE_ENV: ${process.env.NODE_ENV || 'not set'} (should be "production" for deployment)`);
    }
  }

  async validateHealthEndpoints() {
    console.log('\n🏥 2. HEALTH ENDPOINTS VALIDATION');
    
    try {
      // Test health endpoint
      const healthResponse = await fetch(`${BASE_URL}/api/health`);
      const healthData = await healthResponse.json();
      
      if (healthResponse.ok && healthData.status === 'ok') {
        this.results.api.push('✅ Health endpoint working');
        this.results.database.push(`✅ Database connection: ${healthData.database}`);
      } else {
        this.results.api.push('❌ Health endpoint failed');
      }

      // Test readiness endpoint
      const readyResponse = await fetch(`${BASE_URL}/api/ready`);
      const readyData = await readyResponse.json();
      
      if (readyResponse.ok && readyData.status === 'ready') {
        this.results.api.push('✅ Readiness endpoint working');
      } else {
        this.results.api.push('❌ Readiness endpoint failed');
      }

    } catch (error) {
      this.results.errors.push(`Health check failed: ${error.message}`);
    }
  }

  async validateAuthEndpoints() {
    console.log('\n🔐 3. AUTHENTICATION ENDPOINTS VALIDATION');
    
    try {
      // Test auth/me endpoint (should return 401 when not authenticated)
      const meResponse = await fetch(`${BASE_URL}/api/auth/me`);
      if (meResponse.status === 401) {
        this.results.auth.push('✅ Auth protection working (401 for unauthenticated)');
      } else {
        this.results.auth.push('❌ Auth protection may be misconfigured');
      }

      // Test login endpoint exists
      const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test', password: 'test' })
      });
      
      if (loginResponse.status === 401 || loginResponse.status === 400) {
        this.results.auth.push('✅ Login endpoint exists and validates credentials');
      } else {
        this.results.auth.push('❌ Login endpoint may not be working correctly');
      }

    } catch (error) {
      this.results.errors.push(`Auth validation failed: ${error.message}`);
    }
  }

  async validateAPIEndpoints() {
    console.log('\n🌐 4. API ENDPOINTS VALIDATION');
    
    const endpoints = [
      '/api/catalog-options/categories',
      '/api/catalog-options/sports',
      '/api/catalog',
      '/api/customers',
      '/api/users'
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`${BASE_URL}${endpoint}`);
        if (response.status === 401 || response.status === 403) {
          this.results.api.push(`✅ ${endpoint}: Protected (requires auth)`);
        } else if (response.ok) {
          this.results.api.push(`✅ ${endpoint}: Accessible`);
        } else {
          this.results.api.push(`⚠️ ${endpoint}: Status ${response.status}`);
        }
      } catch (error) {
        this.results.api.push(`❌ ${endpoint}: Connection failed`);
      }
    }
  }

  async validateFileUploads() {
    console.log('\n📁 5. FILE UPLOAD VALIDATION');
    
    try {
      // Check uploads directory accessibility
      const uploadsResponse = await fetch(`${BASE_URL}/uploads/`);
      if (uploadsResponse.status === 404 || uploadsResponse.status === 403) {
        this.results.api.push('✅ Uploads directory protected from listing');
      } else {
        this.results.api.push('⚠️ Uploads directory may be publicly accessible');
      }
    } catch (error) {
      this.results.errors.push(`File upload validation failed: ${error.message}`);
    }
  }

  async validateSecurityHeaders() {
    console.log('\n🛡️ 6. SECURITY HEADERS VALIDATION');
    
    try {
      const response = await fetch(`${BASE_URL}/api/health`);
      const headers = response.headers;
      
      // Check for security headers
      const securityHeaders = [
        'x-frame-options',
        'x-content-type-options',
        'strict-transport-security',
        'referrer-policy'
      ];

      for (const header of securityHeaders) {
        if (headers.has(header)) {
          this.results.security.push(`✅ ${header}: ${headers.get(header)}`);
        } else {
          this.results.security.push(`❌ ${header}: Missing`);
        }
      }
    } catch (error) {
      this.results.errors.push(`Security headers validation failed: ${error.message}`);
    }
  }

  async validatePerformance() {
    console.log('\n⚡ 7. PERFORMANCE VALIDATION');
    
    try {
      const start = Date.now();
      const response = await fetch(`${BASE_URL}/api/health`);
      const duration = Date.now() - start;
      
      if (duration < 1000) {
        this.results.performance.push(`✅ Health endpoint response time: ${duration}ms`);
      } else {
        this.results.performance.push(`⚠️ Health endpoint response time: ${duration}ms (slow)`);
      }
    } catch (error) {
      this.results.errors.push(`Performance validation failed: ${error.message}`);
    }
  }

  async runAllValidations() {
    console.log('🚀 STARTING DEPLOYMENT VALIDATION\n');
    
    await this.validateEnvironmentVariables();
    await this.validateHealthEndpoints();
    await this.validateAuthEndpoints();
    await this.validateAPIEndpoints();
    await this.validateFileUploads();
    await this.validateSecurityHeaders();
    await this.validatePerformance();
    
    this.printResults();
  }

  printResults() {
    console.log('\n' + '='.repeat(50));
    console.log('📊 DEPLOYMENT VALIDATION RESULTS');
    console.log('='.repeat(50));

    const sections = [
      { name: 'Critical Environment Variables', results: this.results.critical },
      { name: 'Database & Health', results: this.results.database },
      { name: 'Authentication', results: this.results.auth },
      { name: 'API Endpoints', results: this.results.api },
      { name: 'Security Headers', results: this.results.security },
      { name: 'Performance', results: this.results.performance }
    ];

    sections.forEach(section => {
      if (section.results.length > 0) {
        console.log(`\n${section.name}:`);
        section.results.forEach(result => console.log(`  ${result}`));
      }
    });

    if (this.results.errors.length > 0) {
      console.log('\n❌ Errors:');
      this.results.errors.forEach(error => console.log(`  ${error}`));
    }

    // Summary
    const totalChecks = Object.values(this.results).flat().length;
    const passedChecks = Object.values(this.results).flat().filter(r => r.includes('✅')).length;
    const warningChecks = Object.values(this.results).flat().filter(r => r.includes('⚠️')).length;
    const failedChecks = Object.values(this.results).flat().filter(r => r.includes('❌')).length;

    console.log('\n' + '='.repeat(50));
    console.log('📈 SUMMARY');
    console.log('='.repeat(50));
    console.log(`Total Checks: ${totalChecks}`);
    console.log(`✅ Passed: ${passedChecks}`);
    console.log(`⚠️ Warnings: ${warningChecks}`);
    console.log(`❌ Failed: ${failedChecks}`);
    
    const readinessScore = Math.round((passedChecks / totalChecks) * 100);
    console.log(`\n🎯 Deployment Readiness: ${readinessScore}%`);
    
    if (readinessScore >= 90) {
      console.log('🎉 EXCELLENT - Ready for deployment!');
    } else if (readinessScore >= 75) {
      console.log('✅ GOOD - Minor issues to address before deployment');
    } else if (readinessScore >= 50) {
      console.log('⚠️ FAIR - Several issues need attention');
    } else {
      console.log('❌ POOR - Critical issues must be fixed before deployment');
    }
  }
}

// Run validation if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const validator = new DeploymentValidator();
  validator.runAllValidations().catch(console.error);
}

export default DeploymentValidator;
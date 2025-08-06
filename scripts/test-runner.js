#!/usr/bin/env node

/**
 * PRODUCT LIBRARY TEST RUNNER
 * Orchestrates all ProductLibrary tests with comprehensive reporting
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class TestRunner {
  constructor() {
    this.results = {
      unit: { passed: 0, failed: 0, duration: 0 },
      api: { passed: 0, failed: 0, duration: 0 },
      e2e: { passed: 0, failed: 0, duration: 0 },
      performance: { passed: 0, failed: 0, duration: 0 }
    };
    this.startTime = Date.now();
  }

  async runCommand(command, args, options = {}) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        stdio: 'pipe',
        shell: true,
        ...options
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
        if (options.verbose) process.stdout.write(data);
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
        if (options.verbose) process.stderr.write(data);
      });

      child.on('close', (code) => {
        resolve({ code, stdout, stderr });
      });

      child.on('error', reject);
    });
  }

  parseTestResults(output) {
    // Parse Jest/Playwright output to extract test counts
    const passedMatch = output.match(/(\d+)\s+passed/);
    const failedMatch = output.match(/(\d+)\s+failed/);
    const durationMatch = output.match(/Time:\s+(\d+\.?\d*)\s*s/);

    return {
      passed: passedMatch ? parseInt(passedMatch[1]) : 0,
      failed: failedMatch ? parseInt(failedMatch[1]) : 0,
      duration: durationMatch ? parseFloat(durationMatch[1]) : 0
    };
  }

  async runUnitTests() {
    console.log('\n🧪 Running Unit Tests...');
    console.log('='.repeat(50));

    const { code, stdout, stderr } = await this.runCommand('npm', ['run', 'test:unit'], {
      verbose: process.env.VERBOSE === 'true'
    });

    this.results.unit = this.parseTestResults(stdout);
    
    if (code === 0) {
      console.log(`✅ Unit Tests: ${this.results.unit.passed} passed`);
    } else {
      console.log(`❌ Unit Tests: ${this.results.unit.failed} failed`);
      if (!process.env.VERBOSE) {
        console.log('\nFailure Details:');
        console.log(stderr);
      }
    }

    return code === 0;
  }

  async runAPITests() {
    console.log('\n🔌 Running API Tests...');
    console.log('='.repeat(50));

    // Start test database if needed
    await this.setupTestDatabase();

    const { code, stdout, stderr } = await this.runCommand('npm', ['run', 'test:api'], {
      verbose: process.env.VERBOSE === 'true',
      env: { ...process.env, NODE_ENV: 'test' }
    });

    this.results.api = this.parseTestResults(stdout);
    
    if (code === 0) {
      console.log(`✅ API Tests: ${this.results.api.passed} passed`);
    } else {
      console.log(`❌ API Tests: ${this.results.api.failed} failed`);
      if (!process.env.VERBOSE) {
        console.log('\nFailure Details:');
        console.log(stderr);
      }
    }

    await this.teardownTestDatabase();
    return code === 0;
  }

  async runE2ETests() {
    console.log('\n🎭 Running E2E Tests...');
    console.log('='.repeat(50));

    // Start application for E2E tests
    console.log('Starting application server...');
    const serverProcess = spawn('npm', ['run', 'dev'], {
      stdio: 'pipe',
      env: { ...process.env, NODE_ENV: 'test', PORT: '3001' }
    });

    // Wait for server to start
    await this.waitForServer('http://localhost:3001');

    try {
      const { code, stdout, stderr } = await this.runCommand('npx', ['playwright', 'test', 'tests/productLibrary.spec.ts'], {
        verbose: process.env.VERBOSE === 'true'
      });

      this.results.e2e = this.parseTestResults(stdout);
      
      if (code === 0) {
        console.log(`✅ E2E Tests: ${this.results.e2e.passed} passed`);
      } else {
        console.log(`❌ E2E Tests: ${this.results.e2e.failed} failed`);
        if (!process.env.VERBOSE) {
          console.log('\nFailure Details:');
          console.log(stderr);
        }
      }

      return code === 0;
    } finally {
      // Clean up server
      serverProcess.kill();
    }
  }

  async runPerformanceTests() {
    console.log('\n⚡ Running Performance Tests...');
    console.log('='.repeat(50));

    // Check if K6 is available
    try {
      await this.runCommand('k6', ['version']);
    } catch (error) {
      console.log('⚠️  K6 not found, skipping performance tests');
      console.log('Install K6 to run performance tests: https://k6.io/docs/getting-started/installation/');
      return true;
    }

    const { code, stdout } = await this.runCommand('k6', ['run', 'tests/performance/productLibrary.js'], {
      verbose: process.env.VERBOSE === 'true'
    });

    // Parse K6 output
    const checksMatch = stdout.match(/checks\.+(\d+\.\d+)%/);
    const httpReqDurationMatch = stdout.match(/http_req_duration\.+avg=(\d+\.\d+)ms/);

    if (code === 0 && checksMatch && parseFloat(checksMatch[1]) > 95) {
      console.log(`✅ Performance Tests: ${checksMatch[1]}% checks passed`);
      if (httpReqDurationMatch) {
        console.log(`📊 Average response time: ${httpReqDurationMatch[1]}ms`);
      }
      this.results.performance.passed = 1;
    } else {
      console.log(`❌ Performance Tests: Failed or below threshold`);
      this.results.performance.failed = 1;
    }

    return code === 0;
  }

  async setupTestDatabase() {
    console.log('Setting up test database...');
    
    // Check if test database exists
    const { code } = await this.runCommand('psql', [
      process.env.TEST_DATABASE_URL || 'postgresql://localhost/threadcraft_test',
      '-c', 'SELECT 1'
    ]);

    if (code !== 0) {
      console.log('Creating test database...');
      await this.runCommand('createdb', ['threadcraft_test']);
    }

    // Run migrations
    await this.runCommand('npm', ['run', 'db:migrate:test']);
  }

  async teardownTestDatabase() {
    console.log('Cleaning up test database...');
    // Could add cleanup logic here if needed
  }

  async waitForServer(url, timeout = 30000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        const response = await fetch(`${url}/api/health`);
        if (response.ok) {
          console.log('✅ Server is ready');
          return;
        }
      } catch (error) {
        // Server not ready yet
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    throw new Error('Server failed to start within timeout');
  }

  generateReport() {
    const totalTime = (Date.now() - this.startTime) / 1000;
    const totalPassed = Object.values(this.results).reduce((sum, result) => sum + result.passed, 0);
    const totalFailed = Object.values(this.results).reduce((sum, result) => sum + result.failed, 0);
    const totalTests = totalPassed + totalFailed;

    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY REPORT');
    console.log('='.repeat(60));
    
    console.log(`\n🏁 Overall Results:`);
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   ✅ Passed: ${totalPassed}`);
    console.log(`   ❌ Failed: ${totalFailed}`);
    console.log(`   ⏱️  Total Time: ${totalTime.toFixed(2)}s`);
    console.log(`   📈 Success Rate: ${totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(1) : 0}%`);

    console.log(`\n📋 Detailed Results:`);
    Object.entries(this.results).forEach(([type, result]) => {
      const icon = result.failed === 0 ? '✅' : '❌';
      console.log(`   ${icon} ${type.toUpperCase()}: ${result.passed} passed, ${result.failed} failed (${result.duration.toFixed(2)}s)`);
    });

    // Generate JSON report
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalTests,
        totalPassed,
        totalFailed,
        successRate: totalTests > 0 ? (totalPassed / totalTests) * 100 : 0,
        duration: totalTime
      },
      results: this.results
    };

    const reportPath = path.join(__dirname, '..', 'test-reports', 'product-library-test-report.json');
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);

    // Exit with appropriate code
    process.exit(totalFailed > 0 ? 1 : 0);
  }

  async run() {
    console.log('🚀 ProductLibrary Test Suite Starting...');
    console.log(`Started at: ${new Date().toISOString()}`);
    
    const testTypes = process.env.TEST_TYPES?.split(',') || ['unit', 'api', 'e2e', 'performance'];
    let allPassed = true;

    try {
      if (testTypes.includes('unit')) {
        allPassed = await this.runUnitTests() && allPassed;
      }

      if (testTypes.includes('api')) {
        allPassed = await this.runAPITests() && allPassed;
      }

      if (testTypes.includes('e2e')) {
        allPassed = await this.runE2ETests() && allPassed;
      }

      if (testTypes.includes('performance')) {
        allPassed = await this.runPerformanceTests() && allPassed;
      }

    } catch (error) {
      console.error('❌ Test execution failed:', error.message);
      allPassed = false;
    }

    this.generateReport();
  }
}

// Run if called directly
if (require.main === module) {
  const runner = new TestRunner();
  runner.run().catch(console.error);
}

module.exports = { TestRunner };
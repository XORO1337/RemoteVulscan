#!/usr/bin/env node

/**
 * Integration test for RemoteVulscan Advanced API
 * This script tests the complete scanning workflow
 */

const fetch = require('node-fetch')

class IntegrationTest {
  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl
    this.testResults = []
  }

  async runTest(name, testFn) {
    console.log(`\n🧪 Running test: ${name}`)
    try {
      const result = await testFn()
      this.testResults.push({ name, success: true, result })
      console.log(`✅ ${name} - PASSED`)
      return result
    } catch (error) {
      this.testResults.push({ name, success: false, error: error.message })
      console.log(`❌ ${name} - FAILED: ${error.message}`)
      throw error
    }
  }

  async testSystemStatus() {
    return this.runTest('System Status Check', async () => {
      const response = await fetch(`${this.baseUrl}/api/system/status`)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${data.error || 'Unknown error'}`)
      }
      
      if (!data.scan_capabilities?.can_perform_scans) {
        throw new Error('System reports it cannot perform scans')
      }
      
      return data
    })
  }

  async testScanModes() {
    return this.runTest('Scan Modes Retrieval', async () => {
      const response = await fetch(`${this.baseUrl}/api/scans/modes`)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${data.error || 'Unknown error'}`)
      }
      
      if (!data.scanModes || data.scanModes.length === 0) {
        throw new Error('No scan modes available')
      }
      
      const advancedModes = data.scanModes.filter(mode => 
        ['FULL_SCAN', 'NETWORK_RECONNAISSANCE', 'WEB_APPLICATION_SCAN'].includes(mode.id)
      )
      
      if (advancedModes.length === 0) {
        throw new Error('No advanced scan modes found')
      }
      
      return data
    })
  }

  async testScanStats() {
    return this.runTest('Scan Statistics', async () => {
      const response = await fetch(`${this.baseUrl}/api/scans/stats`)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${data.error || 'Unknown error'}`)
      }
      
      if (!data.overview) {
        throw new Error('No overview data in statistics')
      }
      
      return data
    })
  }

  async testCreateScan() {
    return this.runTest('Create Scan (without CAPTCHA)', async () => {
      // Note: This test will fail due to CAPTCHA requirement, but we test the validation
      const response = await fetch(`${this.baseUrl}/api/scans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: 'https://httpbin.org',
          scanType: 'SSL_TLS_ANALYSIS',
          captchaToken: 'test-token'
        })
      })
      
      const data = await response.json()
      
      // We expect this to fail due to CAPTCHA, but it should fail gracefully
      if (response.status === 403 && data.error?.includes('CAPTCHA')) {
        return { message: 'CAPTCHA validation working correctly' }
      } else if (response.status === 503 && data.error?.includes('CAPTCHA not configured')) {
        return { message: 'CAPTCHA not configured - this is expected in development' }
      } else if (response.ok) {
        return data // CAPTCHA might be disabled in development
      } else {
        throw new Error(`Unexpected response: ${response.status} - ${data.error}`)
      }
    })
  }

  async testInvalidRequests() {
    return this.runTest('Invalid Request Handling', async () => {
      // Test invalid URL
      const invalidUrlResponse = await fetch(`${this.baseUrl}/api/scans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: 'not-a-url',
          scanType: 'SSL_TLS_ANALYSIS',
          captchaToken: 'test'
        })
      })
      
      if (invalidUrlResponse.status !== 400) {
        throw new Error('Should reject invalid URLs')
      }
      
      // Test invalid scan type
      const invalidScanResponse = await fetch(`${this.baseUrl}/api/scans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: 'https://example.com',
          scanType: 'INVALID_SCAN_TYPE',
          captchaToken: 'test'
        })
      })
      
      if (invalidScanResponse.status !== 400) {
        throw new Error('Should reject invalid scan types')
      }
      
      return { message: 'Input validation working correctly' }
    })
  }

  async testHealthEndpoint() {
    return this.runTest('Health Endpoint', async () => {
      const response = await fetch(`${this.baseUrl}/api/health`)
      
      if (!response.ok) {
        throw new Error(`Health endpoint failed: ${response.status}`)
      }
      
      const data = await response.json()
      return data
    })
  }

  async testWebSocketConnection() {
    return this.runTest('WebSocket Availability', async () => {
      // Test if the WebSocket endpoint is available
      const response = await fetch(`${this.baseUrl}/api/socketio`)
      
      // The response might be 404 if Socket.IO is not properly set up,
      // but we're mainly testing if the endpoint exists
      return { 
        status: response.status,
        available: response.status !== 404,
        message: response.status === 404 
          ? 'WebSocket endpoint not found - Socket.IO may not be configured'
          : 'WebSocket endpoint is available'
      }
    })
  }

  async runAllTests() {
    console.log('🚀 Starting RemoteVulscan API Integration Tests')
    console.log('=' .repeat(50))
    
    const startTime = Date.now()
    let passedTests = 0
    let totalTests = 0
    
    try {
      // Basic connectivity and health checks
      await this.testHealthEndpoint()
      await this.testSystemStatus()
      await this.testScanModes()
      await this.testScanStats()
      
      // API validation tests
      await this.testInvalidRequests()
      await this.testCreateScan()
      
      // WebSocket test (non-critical)
      try {
        await this.testWebSocketConnection()
      } catch (error) {
        console.log(`⚠️  WebSocket test failed (non-critical): ${error.message}`)
      }
      
    } catch (error) {
      console.error(`\n💥 Test suite failed: ${error.message}`)
    }
    
    // Calculate results
    totalTests = this.testResults.length
    passedTests = this.testResults.filter(r => r.success).length
    const duration = Date.now() - startTime
    
    // Print summary
    console.log('\n' + '=' .repeat(50))
    console.log('📊 Test Summary')
    console.log('=' .repeat(50))
    console.log(`Total Tests: ${totalTests}`)
    console.log(`Passed: ${passedTests}`)
    console.log(`Failed: ${totalTests - passedTests}`)
    console.log(`Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`)
    console.log(`Duration: ${duration}ms`)
    
    // Detailed results
    console.log('\n📋 Detailed Results:')
    this.testResults.forEach(test => {
      const status = test.success ? '✅' : '❌'
      console.log(`  ${status} ${test.name}`)
      if (!test.success) {
        console.log(`      Error: ${test.error}`)
      }
    })
    
    // Recommendations
    console.log('\n💡 Recommendations:')
    if (passedTests === totalTests) {
      console.log('  🎉 All tests passed! Your API is ready for use.')
      console.log('  📚 Check the API_DOCUMENTATION.md for usage examples.')
    } else {
      console.log('  🔧 Some tests failed. Please check the following:')
      console.log('     - Ensure Docker containers are running: docker-compose up -d')
      console.log('     - Check container logs: docker-compose logs')
      console.log('     - Verify tools container: docker exec vuln-scanner-tools which nmap')
      console.log('     - Run setup test: ./scripts/test-setup.sh')
    }
    
    console.log('\n🔗 Useful Commands:')
    console.log('   docker-compose up -d          # Start all containers')
    console.log('   docker-compose logs -f        # View logs')
    console.log('   ./scripts/test-setup.sh       # Run setup verification')
    console.log('   npm run test:setup            # Alternative setup test')
    
    return {
      totalTests,
      passedTests,
      successRate: Math.round((passedTests / totalTests) * 100),
      duration,
      allPassed: passedTests === totalTests
    }
  }
}

// CLI execution
if (require.main === module) {
  const baseUrl = process.argv[2] || 'http://localhost:3000'
  const test = new IntegrationTest(baseUrl)
  
  test.runAllTests()
    .then(results => {
      process.exit(results.allPassed ? 0 : 1)
    })
    .catch(error => {
      console.error('Test runner failed:', error)
      process.exit(1)
    })
}

module.exports = IntegrationTest

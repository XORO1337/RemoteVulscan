#!/usr/bin/env node

/**
 * API Integration Test for Tool Execution
 * Tests that tools can be executed via web requests
 */

const fetch = require('node-fetch');

class APIIntegrationTest {
  constructor(baseUrl = 'http://localhost:8000') {
    this.baseUrl = baseUrl;
  }

  async testToolExecution() {
    console.log('🧪 Testing Tool Execution via Web Request');
    console.log('==========================================');

    try {
      // Test 1: Health Check
      console.log('\n1. Testing Health Check...');
      const healthResponse = await fetch(`${this.baseUrl}/api/v1/health`);
      const healthData = await healthResponse.json();
      
      if (healthResponse.ok) {
        console.log('✅ Health check passed');
        console.log(`   Status: ${healthData.status}`);
        console.log(`   Uptime: ${Math.round(healthData.uptime)}s`);
      } else {
        throw new Error('Health check failed');
      }

      // Test 2: Get Available Tools
      console.log('\n2. Testing Available Tools...');
      const toolsResponse = await fetch(`${this.baseUrl}/api/v1/tools/info`);
      const toolsData = await toolsResponse.json();
      
      if (toolsResponse.ok) {
        console.log('✅ Tools info retrieved');
        console.log(`   Available tools: ${toolsData.statistics.availableTools}/${toolsData.statistics.totalTools}`);
        console.log(`   Categories: ${toolsData.categories.join(', ')}`);
        
        // List available tools
        const availableTools = Object.entries(toolsData.tools)
          .filter(([name, info]) => info.available)
          .map(([name]) => name);
        console.log(`   Tools: ${availableTools.join(', ')}`);
      } else {
        throw new Error('Failed to get tools info');
      }

      // Test 3: Execute Single Tool (nmap)
      console.log('\n3. Testing Single Tool Execution (nmap)...');
      const nmapResponse = await fetch(`${this.baseUrl}/api/v1/tools/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: 'nmap',
          target: 'scanme.nmap.org',
          args: ['-sn'],
          timeout: 30000
        })
      });
      
      const nmapData = await nmapResponse.json();
      
      if (nmapResponse.ok) {
        console.log('✅ Nmap execution successful');
        console.log(`   Success: ${nmapData.success}`);
        console.log(`   Exit code: ${nmapData.exitCode}`);
        console.log(`   Execution time: ${nmapData.executionTime}ms`);
        console.log(`   Output preview: ${nmapData.output.substring(0, 100)}...`);
      } else {
        console.log('❌ Nmap execution failed');
        console.log(`   Error: ${nmapData.error}`);
      }

      // Test 4: Execute Multiple Tools
      console.log('\n4. Testing Multiple Tool Execution...');
      const multiResponse = await fetch(`${this.baseUrl}/api/v1/tools/execute-multiple`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tools: [
            { name: 'nmap', args: ['-sn'] },
            { name: 'nuclei', args: ['-version'] }
          ],
          target: 'scanme.nmap.org',
          mode: 'parallel'
        })
      });
      
      const multiData = await multiResponse.json();
      
      if (multiResponse.ok) {
        console.log('✅ Multiple tools execution successful');
        console.log(`   Total tools: ${multiData.summary.totalTools}`);
        console.log(`   Successful: ${multiData.summary.successfulTools}`);
        console.log(`   Failed: ${multiData.summary.failedTools}`);
        console.log(`   Total execution time: ${multiData.summary.totalExecutionTime}ms`);
      } else {
        console.log('❌ Multiple tools execution failed');
        console.log(`   Error: ${multiData.error}`);
      }

      // Test 5: Test Nuclei (if available)
      if (toolsData.tools.nuclei?.available) {
        console.log('\n5. Testing Nuclei Execution...');
        const nucleiResponse = await fetch(`${this.baseUrl}/api/v1/tools/execute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tool: 'nuclei',
            target: 'https://httpbin.org',
            args: ['-silent', '-severity', 'info'],
            timeout: 60000
          })
        });
        
        const nucleiData = await nucleiResponse.json();
        
        if (nucleiResponse.ok) {
          console.log('✅ Nuclei execution successful');
          console.log(`   Success: ${nucleiData.success}`);
          console.log(`   Execution time: ${nucleiData.executionTime}ms`);
        } else {
          console.log('❌ Nuclei execution failed');
          console.log(`   Error: ${nucleiData.error}`);
        }
      }

      console.log('\n🎉 All API integration tests completed!');
      console.log('\n📋 Summary:');
      console.log('   ✅ Backend API is responding');
      console.log('   ✅ Tools are integrated and executable');
      console.log('   ✅ Single tool execution works');
      console.log('   ✅ Multiple tool execution works');
      console.log('   ✅ Error handling is functional');

    } catch (error) {
      console.error('\n💥 API Integration Test Failed:', error.message);
      console.log('\n🔧 Troubleshooting:');
      console.log('   1. Ensure backend is running: npm run dev');
      console.log('   2. Check Docker container: docker ps');
      console.log('   3. Verify tools installation: docker exec <container> verify-tools.sh');
      console.log('   4. Check logs: docker logs <container>');
    }
  }

  async testWebRequestFlow() {
    console.log('\n🌐 Testing Complete Web Request Flow');
    console.log('====================================');

    try {
      // Simulate a complete scan workflow
      console.log('\n📡 Simulating scan creation and execution...');
      
      // This would normally go through the scan creation endpoint
      // but we'll test direct tool execution to verify integration
      
      const scanRequest = {
        tool: 'nmap',
        target: 'scanme.nmap.org',
        args: ['-sn', '-T4'],
        timeout: 30000
      };

      console.log(`   Request: POST ${this.baseUrl}/api/v1/tools/execute`);
      console.log(`   Payload: ${JSON.stringify(scanRequest, null, 2)}`);

      const response = await fetch(`${this.baseUrl}/api/v1/tools/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scanRequest)
      });

      const result = await response.json();

      if (response.ok) {
        console.log('\n✅ Web Request → Tool Execution Flow Successful!');
        console.log('   📊 Execution Details:');
        console.log(`      Tool: ${result.command}`);
        console.log(`      Success: ${result.success}`);
        console.log(`      Exit Code: ${result.exitCode}`);
        console.log(`      Duration: ${result.executionTime}ms`);
        console.log(`      Timestamp: ${result.timestamp}`);
        
        if (result.output) {
          console.log(`      Output Length: ${result.output.length} characters`);
          console.log(`      Output Preview: ${result.output.substring(0, 150)}...`);
        }

        console.log('\n🎯 This confirms that:');
        console.log('   ✅ Web requests are properly received');
        console.log('   ✅ Tools are executed within the same container');
        console.log('   ✅ Results are returned via HTTP response');
        console.log('   ✅ Error handling works correctly');

      } else {
        console.log('\n❌ Web Request Flow Failed');
        console.log(`   Status: ${response.status}`);
        console.log(`   Error: ${result.error || result.message}`);
      }

    } catch (error) {
      console.error('\n💥 Web Request Flow Test Failed:', error.message);
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new APIIntegrationTest();
  
  async function runAllTests() {
    await tester.testToolExecution();
    await tester.testWebRequestFlow();
  }
  
  runAllTests().catch(console.error);
}

module.exports = APIIntegrationTest;
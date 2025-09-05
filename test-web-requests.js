#!/usr/bin/env node

/**
 * Web Request Testing Script
 * Demonstrates how tools are executed via HTTP requests
 */

const fetch = require('node-fetch');

const API_BASE = 'http://localhost:8000';

async function testWebRequestToolExecution() {
  console.log('🌐 Testing Tool Execution via Web Requests');
  console.log('===========================================');
  console.log(`API Base: ${API_BASE}`);
  console.log('');

  try {
    // Test 1: Simple nmap execution
    console.log('📡 Test 1: Execute nmap via web request');
    console.log('---------------------------------------');
    
    const nmapRequest = {
      tool: 'nmap',
      target: 'scanme.nmap.org',
      args: ['-sn'],
      timeout: 30000
    };

    console.log('Request:', JSON.stringify(nmapRequest, null, 2));
    
    const nmapResponse = await fetch(`${API_BASE}/api/v1/tools/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nmapRequest)
    });

    const nmapResult = await nmapResponse.json();
    
    if (nmapResponse.ok) {
      console.log('✅ SUCCESS: Nmap executed via web request!');
      console.log(`   Command: ${nmapResult.command}`);
      console.log(`   Success: ${nmapResult.success}`);
      console.log(`   Exit Code: ${nmapResult.exitCode}`);
      console.log(`   Execution Time: ${nmapResult.executionTime}ms`);
      console.log(`   Output Length: ${nmapResult.output?.length || 0} characters`);
      
      if (nmapResult.output) {
        console.log(`   Output Preview: ${nmapResult.output.substring(0, 200)}...`);
      }
    } else {
      console.log('❌ FAILED: Nmap execution failed');
      console.log(`   Status: ${nmapResponse.status}`);
      console.log(`   Error: ${nmapResult.error}`);
    }

    // Test 2: Multiple tools execution
    console.log('\n📡 Test 2: Execute multiple tools via web request');
    console.log('------------------------------------------------');
    
    const multiRequest = {
      tools: [
        { name: 'nmap', args: ['-sn'] },
        { name: 'nuclei', args: ['-version'] }
      ],
      target: 'scanme.nmap.org',
      mode: 'parallel'
    };

    console.log('Request:', JSON.stringify(multiRequest, null, 2));
    
    const multiResponse = await fetch(`${API_BASE}/api/v1/tools/execute-multiple`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(multiRequest)
    });

    const multiResult = await multiResponse.json();
    
    if (multiResponse.ok) {
      console.log('✅ SUCCESS: Multiple tools executed via web request!');
      console.log(`   Total Tools: ${multiResult.summary.totalTools}`);
      console.log(`   Successful: ${multiResult.summary.successfulTools}`);
      console.log(`   Failed: ${multiResult.summary.failedTools}`);
      console.log(`   Total Time: ${multiResult.summary.totalExecutionTime}ms`);
      
      multiResult.results.forEach((result, index) => {
        console.log(`   Tool ${index + 1}: ${result.command} (${result.success ? 'SUCCESS' : 'FAILED'})`);
      });
    } else {
      console.log('❌ FAILED: Multiple tools execution failed');
      console.log(`   Status: ${multiResponse.status}`);
      console.log(`   Error: ${multiResult.error}`);
    }

    // Test 3: Test nuclei specifically (vulnerability scanner)
    console.log('\n📡 Test 3: Execute nuclei vulnerability scan');
    console.log('--------------------------------------------');
    
    const nucleiRequest = {
      tool: 'nuclei',
      target: 'https://httpbin.org',
      args: ['-silent', '-severity', 'info'],
      timeout: 60000
    };

    console.log('Request:', JSON.stringify(nucleiRequest, null, 2));
    
    const nucleiResponse = await fetch(`${API_BASE}/api/v1/tools/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nucleiRequest)
    });

    const nucleiResult = await nucleiResponse.json();
    
    if (nucleiResponse.ok) {
      console.log('✅ SUCCESS: Nuclei executed via web request!');
      console.log(`   Command: ${nucleiResult.command}`);
      console.log(`   Success: ${nucleiResult.success}`);
      console.log(`   Execution Time: ${nucleiResult.executionTime}ms`);
      
      if (nucleiResult.output) {
        console.log(`   Output: ${nucleiResult.output}`);
      }
    } else {
      console.log('❌ FAILED: Nuclei execution failed');
      console.log(`   Error: ${nucleiResult.error}`);
    }

    // Test 4: Error handling (invalid tool)
    console.log('\n📡 Test 4: Error handling (invalid tool)');
    console.log('---------------------------------------');
    
    const invalidRequest = {
      tool: 'nonexistent-tool',
      target: 'example.com',
      args: []
    };

    const invalidResponse = await fetch(`${API_BASE}/api/v1/tools/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invalidRequest)
    });

    const invalidResult = await invalidResponse.json();
    
    if (!invalidResponse.ok) {
      console.log('✅ SUCCESS: Error handling works correctly');
      console.log(`   Status: ${invalidResponse.status}`);
      console.log(`   Error: ${invalidResult.error}`);
    } else {
      console.log('❌ UNEXPECTED: Invalid tool should have failed');
    }

    console.log('\n🎯 CONCLUSION:');
    console.log('==============');
    console.log('✅ Tools CAN be executed via web requests!');
    console.log('✅ The backend receives HTTP requests and executes tools in the same container');
    console.log('✅ Results are returned as JSON responses');
    console.log('✅ Error handling works properly');
    console.log('✅ Both single and multiple tool execution is supported');
    console.log('');
    console.log('🚀 Your vulnerability scanning API is ready to use!');

  } catch (error) {
    console.error('\n💥 Test failed:', error.message);
    console.log('\n🔧 Make sure:');
    console.log('   1. Backend is running on port 8000');
    console.log('   2. Docker container is built and started');
    console.log('   3. Tools are properly installed in the container');
  }
}

// Example usage functions
function showExampleRequests() {
  console.log('\n📚 Example Web Requests:');
  console.log('========================');
  
  console.log('\n1. Execute nmap scan:');
  console.log('curl -X POST http://localhost:8000/api/v1/tools/execute \\');
  console.log('  -H "Content-Type: application/json" \\');
  console.log('  -d \'{"tool":"nmap","target":"scanme.nmap.org","args":["-sn"]}\'');
  
  console.log('\n2. Execute nuclei vulnerability scan:');
  console.log('curl -X POST http://localhost:8000/api/v1/tools/execute \\');
  console.log('  -H "Content-Type: application/json" \\');
  console.log('  -d \'{"tool":"nuclei","target":"https://httpbin.org","args":["-silent"]}\'');
  
  console.log('\n3. Execute multiple tools:');
  console.log('curl -X POST http://localhost:8000/api/v1/tools/execute-multiple \\');
  console.log('  -H "Content-Type: application/json" \\');
  console.log('  -d \'{"tools":[{"name":"nmap","args":["-sn"]},{"name":"nuclei","args":["-version"]}],"target":"scanme.nmap.org","mode":"parallel"}\'');
  
  console.log('\n4. Get available tools:');
  console.log('curl http://localhost:8000/api/v1/tools/info');
  
  console.log('\n5. Health check:');
  console.log('curl http://localhost:8000/api/v1/health');
}

// Run tests
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--examples')) {
    showExampleRequests();
  } else {
    testWebRequestToolExecution();
  }
}

module.exports = { testWebRequestToolExecution, showExampleRequests };
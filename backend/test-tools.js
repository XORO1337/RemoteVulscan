#!/usr/bin/env node

/**
 * Tool Execution Test Script
 * Tests the integrated security tools functionality
 */

const { spawn } = require('child_process');

class ToolTester {
  constructor() {
    this.results = [];
  }

  async testTool(toolName, args = [], target = 'scanme.nmap.org') {
    console.log(`\n🧪 Testing ${toolName}...`);
    
    return new Promise((resolve) => {
      const startTime = Date.now();
      const process = spawn(toolName, [...args, target], {
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: 30000
      });

      let output = '';
      let error = '';

      process.stdout?.on('data', (data) => {
        output += data.toString();
      });

      process.stderr?.on('data', (data) => {
        error += data.toString();
      });

      process.on('close', (code) => {
        const executionTime = Date.now() - startTime;
        const success = code === 0;
        
        console.log(`${success ? '✅' : '❌'} ${toolName} - ${success ? 'PASSED' : 'FAILED'} (${executionTime}ms)`);
        
        if (!success && error) {
          console.log(`   Error: ${error.substring(0, 100)}...`);
        }
        
        this.results.push({
          tool: toolName,
          success,
          executionTime,
          output: output.substring(0, 200),
          error: error.substring(0, 200)
        });
        
        resolve({ success, executionTime, output, error });
      });

      process.on('error', (err) => {
        console.log(`❌ ${toolName} - ERROR: ${err.message}`);
        this.results.push({
          tool: toolName,
          success: false,
          executionTime: Date.now() - startTime,
          error: err.message
        });
        resolve({ success: false, error: err.message });
      });
    });
  }

  async runAllTests() {
    console.log('🛡️  Testing Security Tools Integration');
    console.log('=====================================');

    const tools = [
      { name: 'nmap', args: ['-sn'] },
      { name: 'nuclei', args: ['-version'] },
      { name: 'nikto', args: ['-Version'] },
      { name: 'testssl.sh', args: ['--version'] },
      { name: 'sslscan', args: ['--version'] },
      { name: 'gobuster', args: ['version'] },
      { name: 'whatweb', args: ['--version'] },
      { name: 'masscan', args: ['--version'] }
    ];

    for (const tool of tools) {
      await this.testTool(tool.name, tool.args, '');
    }

    // Test actual scanning
    console.log('\n🎯 Testing actual tool execution...');
    await this.testTool('nmap', ['-sn'], 'scanme.nmap.org');

    // Print summary
    console.log('\n📊 Test Summary');
    console.log('===============');
    
    const passed = this.results.filter(r => r.success).length;
    const total = this.results.length;
    
    console.log(`Total tests: ${total}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${total - passed}`);
    console.log(`Success rate: ${Math.round((passed / total) * 100)}%`);

    if (passed === total) {
      console.log('\n🎉 All tools are working correctly!');
      process.exit(0);
    } else {
      console.log('\n⚠️  Some tools failed. Check the installation.');
      process.exit(1);
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new ToolTester();
  tester.runAllTests().catch(console.error);
}

module.exports = ToolTester;
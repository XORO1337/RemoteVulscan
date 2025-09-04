import { spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { logger } from '@/utils/logger';

export interface ToolExecutionOptions {
  tool: string;
  args: string[];
  target: string;
  timeout?: number;
  workingDirectory?: string;
  environment?: Record<string, string>;
}

export interface ToolExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  exitCode: number;
  executionTime: number;
  timestamp: string;
  command: string;
}

export interface ToolInfo {
  name: string;
  binary: string;
  version?: string;
  available: boolean;
  category: string;
  description: string;
  defaultArgs: string[];
  timeout: number;
}

export class ToolExecutionService {
  private readonly toolsPath: string;
  private readonly maxConcurrentExecutions: number;
  private readonly activeExecutions: Map<string, ChildProcess>;
  private readonly toolConfigurations: Map<string, ToolInfo>;

  constructor() {
    this.toolsPath = process.env.TOOLS_PATH || '/usr/local/bin';
    this.maxConcurrentExecutions = parseInt(process.env.MAX_CONCURRENT_EXECUTIONS || '5');
    this.activeExecutions = new Map();
    this.toolConfigurations = new Map();
    
    this.initializeToolConfigurations();
  }

  /**
   * Initialize tool configurations with security tools available in the container
   */
  private initializeToolConfigurations(): void {
    const tools: ToolInfo[] = [
      {
        name: 'nmap',
        binary: 'nmap',
        category: 'network',
        description: 'Network discovery and security auditing',
        defaultArgs: ['-Pn', '-T4'],
        timeout: 300000, // 5 minutes
        available: false,
        version: undefined
      },
      {
        name: 'nikto',
        binary: 'nikto',
        category: 'web',
        description: 'Web server scanner',
        defaultArgs: ['-Format', 'txt'],
        timeout: 600000, // 10 minutes
        available: false,
        version: undefined
      },
      {
        name: 'nuclei',
        binary: 'nuclei',
        category: 'vulnerability',
        description: 'Fast vulnerability scanner',
        defaultArgs: ['-silent', '-json'],
        timeout: 900000, // 15 minutes
        available: false,
        version: undefined
      },
      {
        name: 'testssl',
        binary: 'testssl.sh',
        category: 'crypto',
        description: 'SSL/TLS configuration analyzer',
        defaultArgs: ['--quiet', '--jsonfile-pretty'],
        timeout: 300000, // 5 minutes
        available: false,
        version: undefined
      },
      {
        name: 'sslscan',
        binary: 'sslscan',
        category: 'crypto',
        description: 'SSL/TLS scanner',
        defaultArgs: ['--xml=-'],
        timeout: 180000, // 3 minutes
        available: false,
        version: undefined
      },
      {
        name: 'sqlmap',
        binary: 'sqlmap',
        category: 'web',
        description: 'SQL injection detection tool',
        defaultArgs: ['--batch', '--smart'],
        timeout: 1800000, // 30 minutes
        available: false,
        version: undefined
      },
      {
        name: 'gobuster',
        binary: 'gobuster',
        category: 'web',
        description: 'Directory/file brute-forcer',
        defaultArgs: ['dir', '--quiet'],
        timeout: 600000, // 10 minutes
        available: false,
        version: undefined
      },
      {
        name: 'dirsearch',
        binary: 'python3',
        category: 'web',
        description: 'Web path scanner',
        defaultArgs: ['-m', 'dirsearch', '--quiet'],
        timeout: 900000, // 15 minutes
        available: false,
        version: undefined
      },
      {
        name: 'whatweb',
        binary: 'whatweb',
        category: 'web',
        description: 'Web technology identification',
        defaultArgs: ['--quiet'],
        timeout: 180000, // 3 minutes
        available: false,
        version: undefined
      },
      {
        name: 'masscan',
        binary: 'masscan',
        category: 'network',
        description: 'High-speed port scanner',
        defaultArgs: ['--rate=1000'],
        timeout: 600000, // 10 minutes
        available: false,
        version: undefined
      }
    ];

    tools.forEach(tool => {
      this.toolConfigurations.set(tool.name, tool);
    });

    logger.info(`Initialized ${tools.length} tool configurations`);
    
    // Verify tool availability on startup
    this.verifyToolsAvailability();
  }

  /**
   * Verify all tools are available and get their versions
   */
  private async verifyToolsAvailability(): Promise<void> {
    logger.info('Verifying security tools availability...');
    
    for (const [toolName, toolConfig] of this.toolConfigurations) {
      try {
        const isAvailable = await this.checkToolAvailability(toolConfig.binary);
        const version = isAvailable ? await this.getToolVersion(toolConfig.binary) : undefined;
        
        toolConfig.available = isAvailable;
        toolConfig.version = version;
        
        if (isAvailable) {
          logger.info(`✓ ${toolName} is available (${version || 'unknown version'})`);
        } else {
          logger.warn(`✗ ${toolName} is not available`);
        }
      } catch (error) {
        logger.error(`Failed to verify ${toolName}:`, error);
        toolConfig.available = false;
      }
    }
  }

  /**
   * Check if a tool binary is available in the system
   */
  private async checkToolAvailability(binary: string): Promise<boolean> {
    return new Promise((resolve) => {
      const process = spawn('which', [binary], {
        stdio: ['ignore', 'pipe', 'pipe']
      });

      process.on('close', (code) => {
        resolve(code === 0);
      });

      process.on('error', () => {
        resolve(false);
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        process.kill();
        resolve(false);
      }, 5000);
    });
  }

  /**
   * Get tool version information
   */
  private async getToolVersion(binary: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const versionArgs = this.getVersionArgs(binary);
      const process = spawn(binary, versionArgs, {
        stdio: ['ignore', 'pipe', 'pipe']
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
        if (code === 0 || output.length > 0) {
          const version = this.extractVersion(output + error);
          resolve(version);
        } else {
          reject(new Error(`Failed to get version for ${binary}`));
        }
      });

      process.on('error', (err) => {
        reject(err);
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        process.kill();
        reject(new Error(`Version check timeout for ${binary}`));
      }, 10000);
    });
  }

  /**
   * Get appropriate version arguments for different tools
   */
  private getVersionArgs(binary: string): string[] {
    const versionArgsMap: Record<string, string[]> = {
      'nmap': ['--version'],
      'nikto': ['-Version'],
      'nuclei': ['-version'],
      'testssl.sh': ['--version'],
      'sslscan': ['--version'],
      'sqlmap': ['--version'],
      'gobuster': ['version'],
      'whatweb': ['--version'],
      'masscan': ['--version']
    };

    return versionArgsMap[binary] || ['--version'];
  }

  /**
   * Extract version from tool output
   */
  private extractVersion(output: string): string {
    const cleanOutput = output.replace(/\x1b\[[0-9;]*m/g, '').trim();
    
    // Common version patterns
    const patterns = [
      /v?(\d+\.\d+\.\d+)/,
      /version\s+v?(\d+\.\d+\.\d+)/i,
      /(\d+\.\d+\.\d+)/,
      /v(\d+\.\d+)/,
      /(\d+\.\d+)/
    ];
    
    for (const pattern of patterns) {
      const match = cleanOutput.match(pattern);
      if (match) {
        return match[1] || match[0];
      }
    }
    
    return cleanOutput.split('\n')[0] || 'unknown';
  }

  /**
   * Execute a security tool with comprehensive error handling
   */
  async executeTool(
    toolName: string,
    args: string[] = [],
    target: string,
    timeout?: number
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    const executionId = `${toolName}-${Date.now()}`;
    
    try {
      // Validate tool
      const toolConfig = this.toolConfigurations.get(toolName);
      if (!toolConfig) {
        throw new Error(`Unsupported tool: ${toolName}`);
      }

      if (!toolConfig.available) {
        throw new Error(`Tool ${toolName} is not available in the container`);
      }

      // Check concurrent execution limit
      if (this.activeExecutions.size >= this.maxConcurrentExecutions) {
        throw new Error('Maximum concurrent executions reached');
      }

      // Validate and sanitize target
      const sanitizedTarget = this.sanitizeTarget(target);
      
      // Prepare command arguments
      const commandArgs = [...toolConfig.defaultArgs, ...args];
      
      // Add target based on tool type
      this.addTargetToArgs(toolName, commandArgs, sanitizedTarget);

      // Execute the tool
      const result = await this.executeCommand(
        toolConfig.binary,
        commandArgs,
        timeout || toolConfig.timeout,
        executionId
      );

      const executionTime = Date.now() - startTime;

      logger.info(`Tool execution completed`, {
        tool: toolName,
        target: sanitizedTarget,
        success: result.exitCode === 0,
        executionTime,
        executionId
      });

      return {
        success: result.exitCode === 0,
        output: result.output,
        error: result.error,
        exitCode: result.exitCode,
        executionTime,
        timestamp: new Date().toISOString(),
        command: `${toolConfig.binary} ${commandArgs.join(' ')}`
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      logger.error(`Tool execution failed`, {
        tool: toolName,
        target,
        error: errorMessage,
        executionTime,
        executionId
      });

      return {
        success: false,
        output: '',
        error: errorMessage,
        exitCode: -1,
        executionTime,
        timestamp: new Date().toISOString(),
        command: `${toolName} (failed to execute)`
      };
    }
  }

  /**
   * Execute a command with proper process management
   */
  private async executeCommand(
    binary: string,
    args: string[],
    timeout: number,
    executionId: string
  ): Promise<{ output: string; error: string; exitCode: number }> {
    return new Promise((resolve, reject) => {
      logger.info(`Executing command: ${binary} ${args.join(' ')}`, { executionId });

      const childProcess = spawn(binary, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: {
          ...process.env,
          PATH: `${this.toolsPath}:/usr/local/bin:/usr/bin:/bin`,
          TERM: 'xterm-256color'
        },
        cwd: '/tmp',
        detached: false
      });

      let output = '';
      let error = '';

      // Store active execution
      this.activeExecutions.set(executionId, childProcess);

      // Handle stdout
      childProcess.stdout?.on('data', (data) => {
        output += data.toString();
      });

      // Handle stderr
      childProcess.stderr?.on('data', (data) => {
        error += data.toString();
      });

      // Handle process completion
      childProcess.on('close', (code) => {
        this.activeExecutions.delete(executionId);
        clearTimeout(timeoutHandler);
        
        resolve({
          output: output.trim(),
          error: error.trim(),
          exitCode: code || 0
        });
      });

      // Handle process errors
      childProcess.on('error', (err) => {
        this.activeExecutions.delete(executionId);
        clearTimeout(timeoutHandler);
        reject(new Error(`Process error: ${err.message}`));
      });

      // Set up timeout
      const timeoutHandler = setTimeout(() => {
        logger.warn(`Command timeout after ${timeout}ms`, { executionId });
        
        try {
          // Try graceful termination first
          childProcess.kill('SIGTERM');
          
          // Force kill after 5 seconds if still running
          setTimeout(() => {
            if (!childProcess.killed) {
              childProcess.kill('SIGKILL');
            }
          }, 5000);
        } catch (killError) {
          logger.error('Failed to kill process:', killError);
        }
        
        this.activeExecutions.delete(executionId);
        reject(new Error(`Command timeout after ${timeout}ms`));
      }, timeout);
    });
  }

  /**
   * Add target to command arguments based on tool type
   */
  private addTargetToArgs(toolName: string, args: string[], target: string): void {
    switch (toolName) {
      case 'nmap':
        args.push(target);
        break;
      case 'nikto':
        args.push('-h', target);
        break;
      case 'nuclei':
        args.push('-u', target);
        break;
      case 'testssl':
        args.push(target);
        break;
      case 'sslscan':
        args.push(target);
        break;
      case 'sqlmap':
        args.push('-u', target);
        break;
      case 'gobuster':
        args.push('-u', target);
        break;
      case 'dirsearch':
        args.push('-u', target);
        break;
      case 'whatweb':
        args.push(target);
        break;
      case 'masscan':
        args.push(target);
        break;
      default:
        args.push(target);
    }
  }

  /**
   * Sanitize target URL/IP to prevent command injection
   */
  private sanitizeTarget(target: string): string {
    // Remove dangerous characters and validate format
    const sanitized = target.replace(/[;&|`$(){}[\]\\]/g, '');
    
    // Validate URL or IP format
    try {
      new URL(sanitized);
      return sanitized;
    } catch {
      // Check if it's a valid IP or hostname
      const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
      const hostnameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
      
      if (ipRegex.test(sanitized) || hostnameRegex.test(sanitized)) {
        return sanitized;
      }
      
      throw new Error('Invalid target format');
    }
  }

  /**
   * Get information about all available tools
   */
  async getAvailableTools(): Promise<Map<string, ToolInfo>> {
    // Refresh availability status
    await this.verifyToolsAvailability();
    return new Map(this.toolConfigurations);
  }

  /**
   * Get information about a specific tool
   */
  getToolInfo(toolName: string): ToolInfo | undefined {
    return this.toolConfigurations.get(toolName);
  }

  /**
   * Get tools by category
   */
  getToolsByCategory(category: string): ToolInfo[] {
    return Array.from(this.toolConfigurations.values())
      .filter(tool => tool.category === category);
  }

  /**
   * Get all available categories
   */
  getCategories(): string[] {
    const categories = new Set<string>();
    this.toolConfigurations.forEach(tool => categories.add(tool.category));
    return Array.from(categories);
  }

  /**
   * Cancel a running execution
   */
  async cancelExecution(executionId: string): Promise<boolean> {
    const process = this.activeExecutions.get(executionId);
    if (!process) {
      return false;
    }

    try {
      process.kill('SIGTERM');
      this.activeExecutions.delete(executionId);
      logger.info(`Execution cancelled: ${executionId}`);
      return true;
    } catch (error) {
      logger.error(`Failed to cancel execution ${executionId}:`, error);
      return false;
    }
  }

  /**
   * Get current execution statistics
   */
  getExecutionStats(): {
    activeExecutions: number;
    maxConcurrentExecutions: number;
    availableTools: number;
    totalTools: number;
  } {
    return {
      activeExecutions: this.activeExecutions.size,
      maxConcurrentExecutions: this.maxConcurrentExecutions,
      availableTools: Array.from(this.toolConfigurations.values()).filter(t => t.available).length,
      totalTools: this.toolConfigurations.size
    };
  }

  /**
   * Shutdown service and cleanup active executions
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down tool execution service...');
    
    // Cancel all active executions
    const cancelPromises = Array.from(this.activeExecutions.keys()).map(id => 
      this.cancelExecution(id)
    );
    
    await Promise.allSettled(cancelPromises);
    
    logger.info('Tool execution service shutdown completed');
  }

  /**
   * Execute multiple tools in sequence or parallel
   */
  async executeMultipleTools(
    tools: Array<{ name: string; args?: string[] }>,
    target: string,
    mode: 'sequential' | 'parallel' = 'parallel'
  ): Promise<ToolExecutionResult[]> {
    const sanitizedTarget = this.sanitizeTarget(target);
    
    if (mode === 'sequential') {
      const results: ToolExecutionResult[] = [];
      
      for (const tool of tools) {
        try {
          const result = await this.executeTool(
            tool.name,
            tool.args || [],
            sanitizedTarget
          );
          results.push(result);
        } catch (error) {
          logger.error(`Sequential execution failed for ${tool.name}:`, error);
          results.push({
            success: false,
            output: '',
            error: error instanceof Error ? error.message : 'Unknown error',
            exitCode: -1,
            executionTime: 0,
            timestamp: new Date().toISOString(),
            command: `${tool.name} (failed)`
          });
        }
      }
      
      return results;
    } else {
      // Parallel execution
      const promises = tools.map(tool => 
        this.executeTool(tool.name, tool.args || [], sanitizedTarget)
      );
      
      const results = await Promise.allSettled(promises);
      
      return results.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          return {
            success: false,
            output: '',
            error: result.reason?.message || 'Unknown error',
            exitCode: -1,
            executionTime: 0,
            timestamp: new Date().toISOString(),
            command: `${tools[index].name} (failed)`
          };
        }
      });
    }
  }

  /**
   * Create a comprehensive scan report
   */
  async generateScanReport(results: ToolExecutionResult[]): Promise<{
    summary: {
      totalTools: number;
      successfulTools: number;
      failedTools: number;
      totalExecutionTime: number;
    };
    results: ToolExecutionResult[];
    vulnerabilities: any[];
  }> {
    const summary = {
      totalTools: results.length,
      successfulTools: results.filter(r => r.success).length,
      failedTools: results.filter(r => !r.success).length,
      totalExecutionTime: results.reduce((sum, r) => sum + r.executionTime, 0)
    };

    // Parse vulnerabilities from tool outputs
    const vulnerabilities: any[] = [];
    
    for (const result of results) {
      if (result.success && result.output) {
        const parsed = this.parseToolOutput(result.command.split(' ')[0], result.output);
        vulnerabilities.push(...parsed);
      }
    }

    return {
      summary,
      results,
      vulnerabilities
    };
  }

  /**
   * Parse tool output to extract vulnerabilities (basic implementation)
   */
  private parseToolOutput(toolName: string, output: string): any[] {
    const vulnerabilities: any[] = [];
    
    try {
      switch (toolName) {
        case 'nuclei':
          // Parse Nuclei JSON output
          const lines = output.split('\n');
          for (const line of lines) {
            if (line.trim().startsWith('{')) {
              try {
                const result = JSON.parse(line);
                if (result.info) {
                  vulnerabilities.push({
                    severity: result.info.severity?.toUpperCase() || 'INFO',
                    type: result.info.classification?.['cve-id'] || result['template-id'],
                    title: result.info.name,
                    description: result.info.description,
                    location: result.host,
                    tool: 'nuclei'
                  });
                }
              } catch (e) {
                // Skip invalid JSON lines
              }
            }
          }
          break;
          
        case 'nmap':
          // Parse Nmap output for open ports and vulnerabilities
          const nmapLines = output.split('\n');
          for (const line of nmapLines) {
            if (line.includes('/tcp') && line.includes('open')) {
              const portMatch = line.match(/(\d+)\/tcp\s+open\s+(.+)/);
              if (portMatch) {
                vulnerabilities.push({
                  severity: 'INFO',
                  type: 'Open Port',
                  title: `Open TCP Port ${portMatch[1]}`,
                  description: `Service: ${portMatch[2]}`,
                  location: `Port ${portMatch[1]}`,
                  tool: 'nmap'
                });
              }
            }
          }
          break;
          
        default:
          // Basic parsing for other tools
          if (output.toLowerCase().includes('vulnerable') || 
              output.toLowerCase().includes('security') ||
              output.toLowerCase().includes('warning')) {
            vulnerabilities.push({
              severity: 'MEDIUM',
              type: 'Security Finding',
              title: `${toolName} finding`,
              description: output.substring(0, 200) + '...',
              tool: toolName
            });
          }
      }
    } catch (error) {
      logger.warn(`Failed to parse output for ${toolName}:`, error);
    }

    return vulnerabilities;
  }
}
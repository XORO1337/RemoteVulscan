import fetch from 'node-fetch'

export interface ToolsAPIResponse {
  success: boolean
  executionId: string
  scanId: string
  tool: string
  target: string
  exitCode: number
  output: string
  error?: string
  executionTime: number
  timestamp: string
}

export interface ScanAPIResponse {
  scanId: string
  target: string
  mode: string
  totalExecutionTime: number
  results: ToolsAPIResponse[]
  summary: {
    total: number
    successful: number
    failed: number
  }
  timestamp: string
}

export interface ToolInfo {
  available: boolean
  version?: string
  category: string
  binary: string
  error?: string
}

export interface ToolsStatus {
  tools: Record<string, ToolInfo>
  categories: string[]
}

export class ToolsAPIClient {
  private baseUrl: string
  private timeout: number

  constructor(baseUrl = 'http://vuln-scanner-tools:3001', timeout = 30000) {
    this.baseUrl = baseUrl
    this.timeout = timeout
  }

    /**
   * Check if the Tools API server is healthy
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      return response.ok
    } catch (error) {
      console.error('Health check failed:', error)
      return false
    }
  }

  /**
   * Get status of all available tools
   */
  async getToolsStatus(): Promise<ToolsStatus> {
    const response = await fetch(`${this.baseUrl}/api/tools`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to get tools status: ${response.status} - ${error}`)
    }

    return response.json() as Promise<ToolsStatus>
  }

  /**
   * Execute a single tool
   */
  async executeTool(
    tool: string,
    target: string,
    args: string[] = [],
    scanId?: string,
    timeout?: number
  ): Promise<ToolsAPIResponse> {
    const response = await fetch(`${this.baseUrl}/api/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tool,
        target,
        args,
        scanId,
        timeout
      })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Tool execution failed: ${response.status} - ${error}`)
    }

    return response.json() as Promise<ToolsAPIResponse>
  }

  /**
   * Execute multiple tools in a scan
   */
  async executeScan(
    tools: Array<string | { tool: string; args?: string[] }>,
    target: string,
    options: {
      scanId?: string
      mode?: 'parallel' | 'sequential'
    } = {}
  ): Promise<ScanAPIResponse> {
    const { scanId, mode = 'parallel' } = options

    const response = await fetch(`${this.baseUrl}/api/scan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tools,
        target,
        scanId,
        mode
      })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Scan execution failed: ${response.status} - ${error}`)
    }

    return response.json() as Promise<ScanAPIResponse>
  }

  /**
   * Get scan status
   */
  async getScanStatus(scanId: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/scan/${scanId}`)

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Scan not found')
      }
      const error = await response.text()
      throw new Error(`Failed to get scan status: ${response.status} - ${error}`)
    }

    return response.json()
  }

  /**
   * Get all active scans
   */
  async getAllScans(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/scans`)

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to get scans: ${response.status} - ${error}`)
    }

    return response.json()
  }

  /**
   * Execute network reconnaissance scan
   */
  async executeNetworkRecon(target: string, scanId?: string): Promise<ScanAPIResponse> {
    const tools = [
      { tool: 'nmap', args: ['-sn'] }, // Host discovery
      { tool: 'nmap', args: ['-p-', '--top-ports', '1000'] }, // Port scan
      { tool: 'nmap', args: ['-sV', '-sC'] }, // Service detection
      { tool: 'masscan', args: ['-p1-10000', '--rate=1000'] }
    ]

    return this.executeScan(tools, target, { scanId, mode: 'sequential' })
  }

  /**
   * Execute web application scan
   */
  async executeWebAppScan(target: string, scanId?: string): Promise<ScanAPIResponse> {
    const tools = [
      'nikto',
      { tool: 'nuclei', args: ['-severity', 'critical,high,medium'] },
      'whatweb',
      { tool: 'dirsearch', args: ['--timeout', '10'] },
      { tool: 'gobuster', args: ['-w', '/usr/share/wordlists/dirb/common.txt'] }
    ]

    return this.executeScan(tools, target, { scanId, mode: 'parallel' })
  }

  /**
   * Execute SSL/TLS analysis
   */
  async executeSSLAnalysis(target: string, scanId?: string): Promise<ScanAPIResponse> {
    const tools = [
      { tool: 'testssl', args: ['--vulnerable'] },
      'sslscan',
      { tool: 'nmap', args: ['--script', 'ssl-enum-ciphers', '-p', '443'] }
    ]

    return this.executeScan(tools, target, { scanId, mode: 'parallel' })
  }

  /**
   * Execute full comprehensive scan
   */
  async executeFullScan(target: string, scanId?: string): Promise<ScanAPIResponse> {
    const tools = [
      { tool: 'nmap', args: ['-sS', '-sV', '-O', '--script', 'vuln'] },
      'nikto',
      { tool: 'nuclei', args: ['-severity', 'critical,high,medium'] },
      { tool: 'testssl', args: ['--vulnerable'] },
      'whatweb',
      'sslscan',
      { tool: 'dirsearch', args: ['--timeout', '10'] },
      { tool: 'gobuster', args: ['-w', '/usr/share/wordlists/dirb/common.txt'] },
      { tool: 'sqlmap', args: ['--smart', '--level=2'] }
    ]

    return this.executeScan(tools, target, { scanId, mode: 'sequential' })
  }

  /**
   * Execute SQL injection testing
   */
  async executeSQLInjectionTest(target: string, scanId?: string): Promise<ScanAPIResponse> {
    const tools = [
      { tool: 'sqlmap', args: ['--batch', '--smart', '--level=3'] },
      { tool: 'nuclei', args: ['-t', '/root/nuclei-templates/vulnerabilities/sqli/'] }
    ]

    return this.executeScan(tools, target, { scanId, mode: 'sequential' })
  }

  /**
   * Test connectivity to the tools API
   */
  static async testConnection(baseUrl = 'http://vuln-scanner-tools:3001'): Promise<{
    connected: boolean
    healthy: boolean
    toolsAvailable: number
    error?: string
  }> {
    try {
      const client = new ToolsAPIClient(baseUrl)
      
      // Test basic connectivity
      const healthy = await client.checkHealth()
      if (!healthy) {
        return {
          connected: true,
          healthy: false,
          toolsAvailable: 0,
          error: 'API not healthy'
        }
      }

      // Get tools status
      const toolsStatus = await client.getToolsStatus()
      const availableTools = Object.values(toolsStatus.tools).filter(t => t.available).length

      return {
        connected: true,
        healthy: true,
        toolsAvailable: availableTools
      }
    } catch (error) {
      return {
        connected: false,
        healthy: false,
        toolsAvailable: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}

// Default instance for easy importing
export const toolsAPI = new ToolsAPIClient()

// Helper function to wait for tools API to be ready
export async function waitForToolsAPI(
  maxAttempts = 30,
  interval = 2000,
  baseUrl?: string
): Promise<boolean> {
  const client = new ToolsAPIClient(baseUrl)
  
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const healthy = await client.checkHealth()
      if (healthy) {
        console.log('✅ Tools API is ready')
        return true
      }
    } catch (error) {
      // Continue trying
    }
    
    console.log(`⏳ Waiting for Tools API... (attempt ${i + 1}/${maxAttempts})`)
    await new Promise(resolve => setTimeout(resolve, interval))
  }
  
  console.log('❌ Tools API failed to become ready')
  return false
}

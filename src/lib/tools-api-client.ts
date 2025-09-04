// Use the global fetch API available in Node.js 18+
declare const fetch: typeof globalThis.fetch;

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
   * Execute full comprehensive scan
   */
  async executeFullScan(target: string, scanId?: string): Promise<ScanAPIResponse> {
    const response = await fetch(`${this.baseUrl}/api/scan/full`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        target,
        scanId
      })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Full scan failed: ${response.status} - ${error}`)
    }

    return response.json() as Promise<ScanAPIResponse>
  }

  /**
   * Get scan results by ID
   */
  async getScanResults(scanId: string): Promise<ScanAPIResponse> {
    const response = await fetch(`${this.baseUrl}/api/scan/${scanId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to get scan results: ${response.status} - ${error}`)
    }

    return response.json() as Promise<ScanAPIResponse>
  }

  /**
   * Get all scan results
   */
  async getAllScans(): Promise<ScanAPIResponse[]> {
    const response = await fetch(`${this.baseUrl}/api/scans`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to get scans: ${response.status} - ${error}`)
    }

    return response.json() as Promise<ScanAPIResponse[]>
  }

  /**
   * Delete scan results
   */
  async deleteScan(scanId: string): Promise<boolean> {
    const response = await fetch(`${this.baseUrl}/api/scan/${scanId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    return response.ok
  }

  /**
   * Get tool information
   */
  async getToolInfo(tool: string): Promise<ToolInfo> {
    const response = await fetch(`${this.baseUrl}/api/tools/${tool}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to get tool info: ${response.status} - ${error}`)
    }

    return response.json() as Promise<ToolInfo>
  }

  /**
   * Test network connectivity to the tools container
   */
  async testConnection(): Promise<boolean> {
    try {
      const startTime = Date.now()
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET'
      })
      
      const responseTime = Date.now() - startTime
      console.log(`Tools API response time: ${responseTime}ms`)
      
      return response.ok
    } catch (error) {
      console.error('Connection test failed:', error)
      return false
    }
  }

  /**
   * Get API server info
   */
  async getServerInfo(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/info`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to get server info: ${response.status} - ${error}`)
    }

    return response.json()
  }
}

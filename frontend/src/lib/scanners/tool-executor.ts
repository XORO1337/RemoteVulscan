import { ToolsAPIClient, ToolsAPIResponse, ScanAPIResponse } from '@/lib/tools-api-client'

export interface ScanMode {
  FULL_SCAN: string
  NETWORK_RECONNAISSANCE: string
  WEB_APPLICATION_SCAN: string
  SSL_TLS_ANALYSIS: string
  DIRECTORY_ENUMERATION: string
  SQL_INJECTION_TEST: string
  XSS_ANALYSIS: string
  VULNERABILITY_ASSESSMENT: string
}

export interface ToolResult {
  tool: string
  output: string
  exitCode: number
  error?: string
  vulnerabilities: ParsedVulnerability[]
  metadata: {
    executionTime: number
    timestamp: string
    command: string
  }
}

export interface ParsedVulnerability {
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO"
  type: string
  title: string
  description?: string
  solution?: string
  reference?: string
  location?: string
  port?: number
  service?: string
  cvss?: number
  cve?: string
}

export interface AggregatedScanResult {
  scanId: string
  target: string
  scanMode: string
  totalTools: number
  completedTools: number
  vulnerabilities: ParsedVulnerability[]
  toolResults: ToolResult[]
  summary: {
    critical: number
    high: number
    medium: number
    low: number
    info: number
  }
  metadata: {
    startTime: string
    endTime?: string
    duration?: number
    status: 'RUNNING' | 'COMPLETED' | 'FAILED' | 'TIMEOUT'
  }
}

export class ToolExecutor {
  private io: any
  private toolsClient: ToolsAPIClient

  constructor(io: any, toolsApiUrl?: string) {
    this.io = io
    this.toolsClient = new ToolsAPIClient(toolsApiUrl)
  }

  /**
   * Execute full scan mode - runs all major vulnerability assessment tools
   */
  async executeFullScan(scanId: string, target: string): Promise<AggregatedScanResult> {
    const result: AggregatedScanResult = {
      scanId,
      target,
      scanMode: 'FULL_SCAN',
      totalTools: 0,
      completedTools: 0,
      vulnerabilities: [],
      toolResults: [],
      summary: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
      metadata: {
        startTime: new Date().toISOString(),
        status: 'RUNNING'
      }
    }

    this.emitProgress(scanId, result, 'Starting full comprehensive scan...')

    try {
      // Use the Tools API to execute the full scan
      const scanResult = await this.toolsClient.executeFullScan(target, scanId)
      
      // Convert Tools API results to our format
      result.totalTools = scanResult.results.length
      result.completedTools = scanResult.results.filter((r: ToolsAPIResponse) => r.success).length
      
      for (const toolResult of scanResult.results) {
        const convertedResult: ToolResult = {
          tool: toolResult.tool,
          output: toolResult.output,
          exitCode: toolResult.exitCode,
          error: toolResult.error,
          vulnerabilities: this.parseToolOutput(toolResult.tool, toolResult.output),
          metadata: {
            executionTime: toolResult.executionTime,
            timestamp: toolResult.timestamp,
            command: `${toolResult.tool} ${target}`
          }
        }
        
        result.toolResults.push(convertedResult)
        result.vulnerabilities.push(...convertedResult.vulnerabilities)
      }

      return this.finalizeResult(scanId, result)
    } catch (error) {
      console.error('Full scan failed:', error)
      throw error
    }
  }

  /**
   * Execute network reconnaissance scan
   */
  async executeNetworkReconnaissance(scanId: string, target: string): Promise<AggregatedScanResult> {
    const result: AggregatedScanResult = {
      scanId,
      target,
      scanMode: 'NETWORK_RECONNAISSANCE',
      totalTools: 0,
      completedTools: 0,
      vulnerabilities: [],
      toolResults: [],
      summary: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
      metadata: {
        startTime: new Date().toISOString(),
        status: 'RUNNING'
      }
    }

    this.emitProgress(scanId, result, 'Starting network reconnaissance...')

    try {
      // Use Tools API for network reconnaissance
      const scanResult = await this.toolsClient.executeScan(['nmap', 'masscan'], target, { scanId })
      
      // Convert API results to our format
      result.totalTools = scanResult.results.length
      result.completedTools = scanResult.results.filter((r: ToolsAPIResponse) => r.success).length
      
      for (const toolResult of scanResult.results) {
        const convertedResult: ToolResult = {
          tool: toolResult.tool,
          output: toolResult.output,
          exitCode: toolResult.exitCode,
          error: toolResult.error,
          vulnerabilities: this.parseToolOutput(toolResult.tool, toolResult.output),
          metadata: {
            executionTime: toolResult.executionTime,
            timestamp: toolResult.timestamp,
            command: `${toolResult.tool} ${target}`
          }
        }
        
        result.toolResults.push(convertedResult)
        result.vulnerabilities.push(...convertedResult.vulnerabilities)
      }

      return this.finalizeResult(scanId, result)
    } catch (error) {
      console.error('Network reconnaissance failed:', error)
      throw error
    }
  }

  /**
   * Execute web application scan
   */
  async executeWebApplicationScan(scanId: string, target: string): Promise<AggregatedScanResult> {
    const result: AggregatedScanResult = {
      scanId,
      target,
      scanMode: 'WEB_APPLICATION_SCAN',
      totalTools: 0,
      completedTools: 0,
      vulnerabilities: [],
      toolResults: [],
      summary: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
      metadata: {
        startTime: new Date().toISOString(),
        status: 'RUNNING'
      }
    }

    this.emitProgress(scanId, result, 'Starting web application scan...')

    try {
      // Use Tools API for web application scanning
      const scanResult = await this.toolsClient.executeScan(['nikto', 'nuclei'], target, { scanId })
      
      // Convert API results to our format
      result.totalTools = scanResult.results.length
      result.completedTools = scanResult.results.filter((r: ToolsAPIResponse) => r.success).length
      
      for (const toolResult of scanResult.results) {
        const convertedResult: ToolResult = {
          tool: toolResult.tool,
          output: toolResult.output,
          exitCode: toolResult.exitCode,
          error: toolResult.error,
          vulnerabilities: this.parseToolOutput(toolResult.tool, toolResult.output),
          metadata: {
            executionTime: toolResult.executionTime,
            timestamp: toolResult.timestamp,
            command: `${toolResult.tool} ${target}`
          }
        }
        
        result.toolResults.push(convertedResult)
        result.vulnerabilities.push(...convertedResult.vulnerabilities)
      }

      return this.finalizeResult(scanId, result)
    } catch (error) {
      console.error('Web application scan failed:', error)
      throw error
    }
  }

  /**
   * Execute SSL/TLS analysis
   */
  async executeSSLTLSAnalysis(scanId: string, target: string): Promise<AggregatedScanResult> {
    const result: AggregatedScanResult = {
      scanId,
      target,
      scanMode: 'SSL_TLS_ANALYSIS',
      totalTools: 0,
      completedTools: 0,
      vulnerabilities: [],
      toolResults: [],
      summary: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
      metadata: {
        startTime: new Date().toISOString(),
        status: 'RUNNING'
      }
    }

    this.emitProgress(scanId, result, 'Starting SSL/TLS analysis...')

    try {
      // Use Tools API for SSL/TLS analysis
      const scanResult = await this.toolsClient.executeScan(['testssl'], target, { scanId })
      
      // Convert API results to our format
      result.totalTools = scanResult.results.length
      result.completedTools = scanResult.results.filter((r: ToolsAPIResponse) => r.success).length
      
      for (const toolResult of scanResult.results) {
        const convertedResult: ToolResult = {
          tool: toolResult.tool,
          output: toolResult.output,
          exitCode: toolResult.exitCode,
          error: toolResult.error,
          vulnerabilities: this.parseToolOutput(toolResult.tool, toolResult.output),
          metadata: {
            executionTime: toolResult.executionTime,
            timestamp: toolResult.timestamp,
            command: `${toolResult.tool} ${target}`
          }
        }
        
        result.toolResults.push(convertedResult)
        result.vulnerabilities.push(...convertedResult.vulnerabilities)
      }

      return this.finalizeResult(scanId, result)
    } catch (error) {
      console.error('SSL/TLS analysis failed:', error)
      throw error
    }
  }

  /**
   * Execute directory enumeration
   */
  async executeDirectoryEnumeration(scanId: string, target: string): Promise<AggregatedScanResult> {
    const result: AggregatedScanResult = {
      scanId,
      target,
      scanMode: 'DIRECTORY_ENUMERATION',
      totalTools: 0,
      completedTools: 0,
      vulnerabilities: [],
      toolResults: [],
      summary: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
      metadata: {
        startTime: new Date().toISOString(),
        status: 'RUNNING'
      }
    }

    this.emitProgress(scanId, result, 'Starting directory enumeration...')

    try {
      // Use Tools API for directory enumeration
      const scanResult = await this.toolsClient.executeScan(['dirsearch', 'gobuster'], target, { scanId })
      
      // Convert API results to our format
      result.totalTools = scanResult.results.length
      result.completedTools = scanResult.results.filter((r: ToolsAPIResponse) => r.success).length
      
      for (const toolResult of scanResult.results) {
        const convertedResult: ToolResult = {
          tool: toolResult.tool,
          output: toolResult.output,
          exitCode: toolResult.exitCode,
          error: toolResult.error,
          vulnerabilities: this.parseToolOutput(toolResult.tool, toolResult.output),
          metadata: {
            executionTime: toolResult.executionTime,
            timestamp: toolResult.timestamp,
            command: `${toolResult.tool} ${target}`
          }
        }
        
        result.toolResults.push(convertedResult)
        result.vulnerabilities.push(...convertedResult.vulnerabilities)
      }

      return this.finalizeResult(scanId, result)
    } catch (error) {
      console.error('Directory enumeration failed:', error)
      throw error
    }
  }

  /**
   * Execute SQL injection test
   */
  async executeSQLInjectionTest(scanId: string, target: string): Promise<AggregatedScanResult> {
    const result: AggregatedScanResult = {
      scanId,
      target,
      scanMode: 'SQL_INJECTION_TEST',
      totalTools: 0,
      completedTools: 0,
      vulnerabilities: [],
      toolResults: [],
      summary: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
      metadata: {
        startTime: new Date().toISOString(),
        status: 'RUNNING'
      }
    }

    this.emitProgress(scanId, result, 'Starting SQL injection test...')

    try {
      // Use Tools API for SQL injection testing
      const scanResult = await this.toolsClient.executeScan(['sqlmap'], target, { scanId })
      
      // Convert API results to our format
      result.totalTools = scanResult.results.length
      result.completedTools = scanResult.results.filter((r: ToolsAPIResponse) => r.success).length
      
      for (const toolResult of scanResult.results) {
        const convertedResult: ToolResult = {
          tool: toolResult.tool,
          output: toolResult.output,
          exitCode: toolResult.exitCode,
          error: toolResult.error,
          vulnerabilities: this.parseToolOutput(toolResult.tool, toolResult.output),
          metadata: {
            executionTime: toolResult.executionTime,
            timestamp: toolResult.timestamp,
            command: `${toolResult.tool} ${target}`
          }
        }
        
        result.toolResults.push(convertedResult)
        result.vulnerabilities.push(...convertedResult.vulnerabilities)
      }

      return this.finalizeResult(scanId, result)
    } catch (error) {
      console.error('SQL injection test failed:', error)
      throw error
    }
  }

  /**
   * Execute XSS analysis
   */
  async executeXSSAnalysis(scanId: string, target: string): Promise<AggregatedScanResult> {
    const result: AggregatedScanResult = {
      scanId,
      target,
      scanMode: 'XSS_ANALYSIS',
      totalTools: 0,
      completedTools: 0,
      vulnerabilities: [],
      toolResults: [],
      summary: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
      metadata: {
        startTime: new Date().toISOString(),
        status: 'RUNNING'
      }
    }

    this.emitProgress(scanId, result, 'Starting XSS analysis...')

    try {
      // Use Tools API for XSS analysis
      const scanResult = await this.toolsClient.executeScan([
        { tool: 'nuclei', args: ['-t', 'xss'] }
      ], target, { scanId })
      
      // Convert API results to our format
      result.totalTools = scanResult.results.length
      result.completedTools = scanResult.results.filter((r: ToolsAPIResponse) => r.success).length
      
      for (const toolResult of scanResult.results) {
        const convertedResult: ToolResult = {
          tool: toolResult.tool,
          output: toolResult.output,
          exitCode: toolResult.exitCode,
          error: toolResult.error,
          vulnerabilities: this.parseToolOutput(toolResult.tool, toolResult.output),
          metadata: {
            executionTime: toolResult.executionTime,
            timestamp: toolResult.timestamp,
            command: `${toolResult.tool} ${target}`
          }
        }
        
        result.toolResults.push(convertedResult)
        result.vulnerabilities.push(...convertedResult.vulnerabilities)
      }

      return this.finalizeResult(scanId, result)
    } catch (error) {
      console.error('XSS analysis failed:', error)
      throw error
    }
  }

  /**
   * Execute vulnerability assessment
   */
  async executeVulnerabilityAssessment(scanId: string, target: string): Promise<AggregatedScanResult> {
    const result: AggregatedScanResult = {
      scanId,
      target,
      scanMode: 'VULNERABILITY_ASSESSMENT',
      totalTools: 0,
      completedTools: 0,
      vulnerabilities: [],
      toolResults: [],
      summary: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
      metadata: {
        startTime: new Date().toISOString(),
        status: 'RUNNING'
      }
    }

    this.emitProgress(scanId, result, 'Starting vulnerability assessment...')

    try {
      // Use Tools API for comprehensive vulnerability assessment
      const scanResult = await this.toolsClient.executeScan(['nuclei', 'nmap'], target, { scanId })
      
      // Convert API results to our format
      result.totalTools = scanResult.results.length
      result.completedTools = scanResult.results.filter((r: ToolsAPIResponse) => r.success).length
      
      for (const toolResult of scanResult.results) {
        const convertedResult: ToolResult = {
          tool: toolResult.tool,
          output: toolResult.output,
          exitCode: toolResult.exitCode,
          error: toolResult.error,
          vulnerabilities: this.parseToolOutput(toolResult.tool, toolResult.output),
          metadata: {
            executionTime: toolResult.executionTime,
            timestamp: toolResult.timestamp,
            command: `${toolResult.tool} ${target}`
          }
        }
        
        result.toolResults.push(convertedResult)
        result.vulnerabilities.push(...convertedResult.vulnerabilities)
      }

      return this.finalizeResult(scanId, result)
    } catch (error) {
      console.error('Vulnerability assessment failed:', error)
      throw error
    }
  }

  /**
   * Emit progress update via WebSocket
   */
  private emitProgress(scanId: string, result: AggregatedScanResult, message?: string): void {
    try {
      this.io.emit('scanProgress', {
        scanId,
        target: result.target,
        progress: {
          completed: result.completedTools,
          total: result.totalTools,
          percentage: result.totalTools > 0 ? Math.round((result.completedTools / result.totalTools) * 100) : 0
        },
        vulnerabilities: result.vulnerabilities.length,
        status: result.metadata.status,
        message: message || `Scan progress: ${result.completedTools}/${result.totalTools} tools completed`
      })
    } catch (error) {
      console.error('Failed to emit progress:', error)
    }
  }

  /**
   * Finalize scan result with summary and metadata
   */
  private finalizeResult(scanId: string, result: AggregatedScanResult): AggregatedScanResult {
    // Update metadata
    result.metadata.endTime = new Date().toISOString()
    result.metadata.duration = new Date(result.metadata.endTime).getTime() - new Date(result.metadata.startTime).getTime()
    result.metadata.status = 'COMPLETED'

    // Calculate summary
    for (const vuln of result.vulnerabilities) {
      switch (vuln.severity) {
        case 'CRITICAL':
          result.summary.critical++
          break
        case 'HIGH':
          result.summary.high++
          break
        case 'MEDIUM':
          result.summary.medium++
          break
        case 'LOW':
          result.summary.low++
          break
        case 'INFO':
          result.summary.info++
          break
      }
    }

    // Emit final progress
    this.emitProgress(scanId, result, 'Scan completed successfully')

    return result
  }

  /**
   * Parse tool output to extract vulnerabilities
   */
  private parseToolOutput(tool: string, output: string): ParsedVulnerability[] {
    const vulnerabilities: ParsedVulnerability[] = []

    try {
      switch (tool.toLowerCase()) {
        case 'nmap':
          vulnerabilities.push(...this.parseNmapOutput(output))
          break
        case 'nikto':
          vulnerabilities.push(...this.parseNiktoOutput(output))
          break
        case 'nuclei':
          vulnerabilities.push(...this.parseNucleiOutput(output))
          break
        case 'testssl':
          vulnerabilities.push(...this.parseTestSSLOutput(output))
          break
        case 'dirsearch':
          vulnerabilities.push(...this.parseDirsearchOutput(output))
          break
        case 'gobuster':
          vulnerabilities.push(...this.parseGobusterOutput(output))
          break
        case 'sqlmap':
          vulnerabilities.push(...this.parseSQLMapOutput(output))
          break
        default:
          console.log(`No parser available for tool: ${tool}`)
      }
    } catch (error) {
      console.error(`Error parsing output for ${tool}:`, error)
    }

    return vulnerabilities
  }

  /**
   * Parse Nmap output for vulnerabilities
   */
  private parseNmapOutput(output: string): ParsedVulnerability[] {
    const vulnerabilities: ParsedVulnerability[] = []
    const lines = output.split('\n')

    for (const line of lines) {
      // Look for open ports
      if (line.includes('/tcp') && line.includes('open')) {
        const portMatch = line.match(/(\d+)\/tcp\s+open\s+(.+)/)
        if (portMatch) {
          vulnerabilities.push({
            severity: 'INFO',
            type: 'Open Port',
            title: `Open TCP Port ${portMatch[1]}`,
            description: `Service: ${portMatch[2]}`,
            port: parseInt(portMatch[1]),
            service: portMatch[2]
          })
        }
      }

      // Look for script results that might indicate vulnerabilities
      if (line.includes('VULNERABLE') || line.includes('CVE-')) {
        const cveMatch = line.match(/CVE-(\d{4}-\d+)/)
        vulnerabilities.push({
          severity: 'MEDIUM',
          type: 'Potential Vulnerability',
          title: cveMatch ? `CVE-${cveMatch[1]}` : 'Script Detection',
          description: line.trim(),
          cve: cveMatch ? `CVE-${cveMatch[1]}` : undefined
        })
      }
    }

    return vulnerabilities
  }

  /**
   * Parse Nikto output for vulnerabilities
   */
  private parseNiktoOutput(output: string): ParsedVulnerability[] {
    const vulnerabilities: ParsedVulnerability[] = []
    const lines = output.split('\n')

    for (const line of lines) {
      if (line.startsWith('+') && !line.includes('Target IP:') && !line.includes('Target Hostname:')) {
        const severity = this.determineSeverityFromNikto(line)
        vulnerabilities.push({
          severity,
          type: 'Web Vulnerability',
          title: 'Nikto Finding',
          description: line.substring(1).trim(),
          location: this.extractLocationFromNikto(line)
        })
      }
    }

    return vulnerabilities
  }

  /**
   * Parse Nuclei output for vulnerabilities
   */
  private parseNucleiOutput(output: string): ParsedVulnerability[] {
    const vulnerabilities: ParsedVulnerability[] = []
    const lines = output.split('\n')

    for (const line of lines) {
      try {
        // Try to parse as JSON first
        const finding = JSON.parse(line)
        if (finding['template-id'] && finding.info) {
          vulnerabilities.push({
            severity: this.mapNucleiSeverity(finding.info.severity),
            type: finding.info.tags ? finding.info.tags.join(', ') : 'Nuclei Finding',
            title: finding.info.name || finding['template-id'],
            description: finding.info.description,
            reference: finding.info.reference ? finding.info.reference.join(', ') : undefined,
            location: finding['matched-at']
          })
        }
      } catch {
        // If not JSON, try regex parsing
        if (line.includes('[') && line.includes(']')) {
          const match = line.match(/\[(.+?)\]\s+\[(.+?)\]\s+(.+)/)
          if (match) {
            vulnerabilities.push({
              severity: this.mapNucleiSeverity(match[2]),
              type: 'Nuclei Finding',
              title: match[1],
              description: match[3],
              location: match[3]
            })
          }
        }
      }
    }

    return vulnerabilities
  }

  /**
   * Parse TestSSL output for vulnerabilities
   */
  private parseTestSSLOutput(output: string): ParsedVulnerability[] {
    const vulnerabilities: ParsedVulnerability[] = []
    const lines = output.split('\n')

    for (const line of lines) {
      if (line.includes('VULNERABLE') || line.includes('WARN') || line.includes('HIGH')) {
        let severity: ParsedVulnerability['severity'] = 'LOW'
        
        if (line.includes('HIGH') || line.includes('CRITICAL')) {
          severity = 'HIGH'
        } else if (line.includes('MEDIUM') || line.includes('WARN')) {
          severity = 'MEDIUM'
        }

        vulnerabilities.push({
          severity,
          type: 'SSL/TLS Issue',
          title: 'SSL/TLS Finding',
          description: line.trim(),
          service: 'SSL/TLS'
        })
      }
    }

    return vulnerabilities
  }

  /**
   * Parse Dirsearch output for vulnerabilities
   */
  private parseDirsearchOutput(output: string): ParsedVulnerability[] {
    const vulnerabilities: ParsedVulnerability[] = []
    const lines = output.split('\n')

    for (const line of lines) {
      if (line.match(/\d{3}\s+\d+[BKM]?\s+\S+/)) {
        const parts = line.trim().split(/\s+/)
        const statusCode = parseInt(parts[0])
        const path = parts[parts.length - 1]

        if (statusCode === 200 || statusCode === 403 || statusCode === 301 || statusCode === 302) {
          let severity: ParsedVulnerability['severity'] = 'INFO'
          
          if (path.includes('admin') || path.includes('config') || path.includes('backup')) {
            severity = 'MEDIUM'
          }

          vulnerabilities.push({
            severity,
            type: 'Directory/File Discovery',
            title: `Discovered Path: ${path}`,
            description: `HTTP ${statusCode} response for ${path}`,
            location: path
          })
        }
      }
    }

    return vulnerabilities
  }

  /**
   * Parse Gobuster output for vulnerabilities
   */
  private parseGobusterOutput(output: string): ParsedVulnerability[] {
    const vulnerabilities: ParsedVulnerability[] = []
    const lines = output.split('\n')

    for (const line of lines) {
      if (line.includes('Status:') && (line.includes('200') || line.includes('403') || line.includes('301'))) {
        const pathMatch = line.match(/\/\S+/)
        const statusMatch = line.match(/Status:\s+(\d+)/)
        
        if (pathMatch && statusMatch) {
          const path = pathMatch[0]
          const status = statusMatch[1]
          
          let severity: ParsedVulnerability['severity'] = 'INFO'
          if (path.includes('admin') || path.includes('config') || path.includes('backup')) {
            severity = 'MEDIUM'
          }

          vulnerabilities.push({
            severity,
            type: 'Directory/File Discovery',
            title: `Discovered Path: ${path}`,
            description: `HTTP ${status} response for ${path}`,
            location: path
          })
        }
      }
    }

    return vulnerabilities
  }

  /**
   * Parse SQLMap output for vulnerabilities
   */
  private parseSQLMapOutput(output: string): ParsedVulnerability[] {
    const vulnerabilities: ParsedVulnerability[] = []
    const lines = output.split('\n')

    for (const line of lines) {
      if (line.includes('Parameter:') && line.includes('is vulnerable')) {
        vulnerabilities.push({
          severity: 'HIGH',
          type: 'SQL Injection',
          title: 'SQL Injection Vulnerability',
          description: line.trim(),
          solution: 'Use parameterized queries and input validation'
        })
      }
      
      if (line.includes('injection point') || line.includes('injectable')) {
        vulnerabilities.push({
          severity: 'HIGH',
          type: 'SQL Injection',
          title: 'SQL Injection Point',
          description: line.trim(),
          solution: 'Implement proper input sanitization'
        })
      }
    }

    return vulnerabilities
  }

  /**
   * Helper methods for severity mapping
   */
  private determineSeverityFromNikto(line: string): ParsedVulnerability['severity'] {
    const lowerLine = line.toLowerCase()
    if (lowerLine.includes('admin') || lowerLine.includes('password') || lowerLine.includes('backup')) {
      return 'HIGH'
    }
    if (lowerLine.includes('config') || lowerLine.includes('debug') || lowerLine.includes('test')) {
      return 'MEDIUM'
    }
    return 'LOW'
  }

  private extractLocationFromNikto(line: string): string | undefined {
    const match = line.match(/\/[^\s]+/)
    return match ? match[0] : undefined
  }

  private mapNucleiSeverity(severity: string): ParsedVulnerability['severity'] {
    switch (severity?.toLowerCase()) {
      case 'critical':
        return 'CRITICAL'
      case 'high':
        return 'HIGH'
      case 'medium':
        return 'MEDIUM'
      case 'low':
        return 'LOW'
      default:
        return 'INFO'
    }
  }
}

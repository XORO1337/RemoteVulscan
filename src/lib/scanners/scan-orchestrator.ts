import { ToolExecutor, AggregatedScanResult } from './tool-executor'
import { VulnerabilityScanner } from './vulnerability-scanner'
import { db } from '@/lib/db'

export interface ScanOrchestrationOptions {
  scanId: string
  target: string
  scanMode: string
  priority?: 'low' | 'normal' | 'high'
  timeout?: number
  enableDeepScan?: boolean
}

export interface ScanOrchestrationResult {
  scanId: string
  success: boolean
  aggregatedResult?: AggregatedScanResult
  legacyResult?: any
  error?: string
  executionTime: number
  scanMode: string
}

export class ScanOrchestrator {
  private toolExecutor: ToolExecutor
  private legacyScanner: VulnerabilityScanner
  private io: any

  constructor(io: any) {
    this.io = io
    this.toolExecutor = new ToolExecutor(io)
    this.legacyScanner = new VulnerabilityScanner(io)
  }

  /**
   * Main orchestration method that determines which scanning approach to use
   */
  async orchestrateScan(options: ScanOrchestrationOptions): Promise<ScanOrchestrationResult> {
    const startTime = Date.now()
    
    try {
      console.log(`[${options.scanId}] Starting scan orchestration for mode: ${options.scanMode}`)
      
      // Update scan status
      await this.updateScanStatus(options.scanId, 'RUNNING')
      
      // Determine scanning approach based on scan mode
      const isAdvancedScanMode = this.isAdvancedScanMode(options.scanMode)
      
      let result: ScanOrchestrationResult
      
      if (isAdvancedScanMode) {
        result = await this.executeAdvancedScan(options)
      } else {
        result = await this.executeLegacyScan(options)
      }
      
      result.executionTime = Date.now() - startTime
      result.scanMode = options.scanMode
      
      console.log(`[${options.scanId}] Scan orchestration completed in ${result.executionTime}ms`)
      
      return result
    } catch (error) {
      console.error(`[${options.scanId}] Scan orchestration failed:`, error)
      
      await this.updateScanStatus(options.scanId, 'FAILED')
      
      return {
        scanId: options.scanId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime: Date.now() - startTime,
        scanMode: options.scanMode
      }
    }
  }

  /**
   * Execute advanced multi-tool scanning
   */
  private async executeAdvancedScan(options: ScanOrchestrationOptions): Promise<ScanOrchestrationResult> {
    try {
      let aggregatedResult: AggregatedScanResult
      
      switch (options.scanMode) {
        case 'FULL_SCAN':
          aggregatedResult = await this.toolExecutor.executeFullScan(options.scanId, options.target)
          break
        case 'NETWORK_RECONNAISSANCE':
          aggregatedResult = await this.toolExecutor.executeNetworkReconnaissance(options.scanId, options.target)
          break
        case 'WEB_APPLICATION_SCAN':
          aggregatedResult = await this.toolExecutor.executeWebApplicationScan(options.scanId, options.target)
          break
        case 'SSL_TLS_ANALYSIS':
          aggregatedResult = await this.toolExecutor.executeSSLTLSAnalysis(options.scanId, options.target)
          break
        case 'DIRECTORY_ENUMERATION':
          aggregatedResult = await this.toolExecutor.executeDirectoryEnumeration(options.scanId, options.target)
          break
        case 'SQL_INJECTION_TEST':
          aggregatedResult = await this.toolExecutor.executeSQLInjectionTest(options.scanId, options.target)
          break
        case 'VULNERABILITY_ASSESSMENT':
          aggregatedResult = await this.executeVulnerabilityAssessment(options.scanId, options.target)
          break
        default:
          throw new Error(`Unsupported advanced scan mode: ${options.scanMode}`)
      }

      // Save vulnerabilities to database
      await this.saveVulnerabilities(options.scanId, aggregatedResult.vulnerabilities)
      
      // Update scan with results
      await this.updateScanWithResults(options.scanId, aggregatedResult, 'COMPLETED')

      return {
        scanId: options.scanId,
        success: true,
        aggregatedResult,
        executionTime: 0, // Will be set by caller
        scanMode: options.scanMode
      }
    } catch (error) {
      console.error(`Advanced scan failed for ${options.scanId}:`, error)
      await this.updateScanStatus(options.scanId, 'FAILED')
      throw error
    }
  }

  /**
   * Execute legacy single-tool scanning
   */
  private async executeLegacyScan(options: ScanOrchestrationOptions): Promise<ScanOrchestrationResult> {
    try {
      // Use the existing VulnerabilityScanner for legacy scan types
      await this.legacyScanner.startScan(options.scanId, options.target, options.scanMode)
      
      // The legacy scanner handles its own database updates and socket emissions
      return {
        scanId: options.scanId,
        success: true,
        executionTime: 0, // Will be set by caller
        scanMode: options.scanMode
      }
    } catch (error) {
      console.error(`Legacy scan failed for ${options.scanId}:`, error)
      await this.updateScanStatus(options.scanId, 'FAILED')
      throw error
    }
  }

  /**
   * Execute comprehensive vulnerability assessment (combines multiple advanced scans)
   */
  private async executeVulnerabilityAssessment(scanId: string, target: string): Promise<AggregatedScanResult> {
    const startTime = new Date().toISOString()
    
    // This is a comprehensive scan that combines multiple scan modes
    const scanPhases = [
      { name: 'Network Reconnaissance', weight: 20 },
      { name: 'Web Application Scan', weight: 30 },
      { name: 'SSL/TLS Analysis', weight: 15 },
      { name: 'Directory Enumeration', weight: 20 },
      { name: 'SQL Injection Testing', weight: 15 }
    ]

    const aggregatedResult: AggregatedScanResult = {
      scanId,
      target,
      scanMode: 'VULNERABILITY_ASSESSMENT',
      totalTools: 0,
      completedTools: 0,
      vulnerabilities: [],
      toolResults: [],
      summary: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
      metadata: {
        startTime,
        status: 'RUNNING'
      }
    }

    this.emitProgress(scanId, 'Starting comprehensive vulnerability assessment...', 0)

    let currentProgress = 0

    // Phase 1: Network Reconnaissance
    this.emitProgress(scanId, 'Phase 1: Network Reconnaissance', 5)
    const networkResult = await this.toolExecutor.executeNetworkReconnaissance(scanId, target)
    aggregatedResult.vulnerabilities.push(...networkResult.vulnerabilities)
    aggregatedResult.toolResults.push(...networkResult.toolResults)
    currentProgress += scanPhases[0].weight

    // Phase 2: Web Application Scan
    this.emitProgress(scanId, 'Phase 2: Web Application Security Scan', currentProgress)
    const webResult = await this.toolExecutor.executeWebApplicationScan(scanId, target)
    aggregatedResult.vulnerabilities.push(...webResult.vulnerabilities)
    aggregatedResult.toolResults.push(...webResult.toolResults)
    currentProgress += scanPhases[1].weight

    // Phase 3: SSL/TLS Analysis
    this.emitProgress(scanId, 'Phase 3: SSL/TLS Security Analysis', currentProgress)
    const sslResult = await this.toolExecutor.executeSSLTLSAnalysis(scanId, target)
    aggregatedResult.vulnerabilities.push(...sslResult.vulnerabilities)
    aggregatedResult.toolResults.push(...sslResult.toolResults)
    currentProgress += scanPhases[2].weight

    // Phase 4: Directory Enumeration
    this.emitProgress(scanId, 'Phase 4: Directory and File Enumeration', currentProgress)
    const dirResult = await this.toolExecutor.executeDirectoryEnumeration(scanId, target)
    aggregatedResult.vulnerabilities.push(...dirResult.vulnerabilities)
    aggregatedResult.toolResults.push(...dirResult.toolResults)
    currentProgress += scanPhases[3].weight

    // Phase 5: SQL Injection Testing
    this.emitProgress(scanId, 'Phase 5: SQL Injection Testing', currentProgress)
    const sqlResult = await this.toolExecutor.executeSQLInjectionTest(scanId, target)
    aggregatedResult.vulnerabilities.push(...sqlResult.vulnerabilities)
    aggregatedResult.toolResults.push(...sqlResult.toolResults)
    currentProgress += scanPhases[4].weight

    // Finalize result
    aggregatedResult.metadata.endTime = new Date().toISOString()
    aggregatedResult.metadata.duration = new Date().getTime() - new Date(startTime).getTime()
    aggregatedResult.metadata.status = 'COMPLETED'
    aggregatedResult.totalTools = aggregatedResult.toolResults.length
    aggregatedResult.completedTools = aggregatedResult.toolResults.length

    // Calculate summary
    aggregatedResult.summary = aggregatedResult.vulnerabilities.reduce(
      (acc, vuln) => {
        acc[vuln.severity.toLowerCase() as keyof typeof acc]++
        return acc
      },
      { critical: 0, high: 0, medium: 0, low: 0, info: 0 }
    )

    this.emitProgress(scanId, 'Comprehensive vulnerability assessment completed!', 100)

    return aggregatedResult
  }

  /**
   * Check if the scan mode requires advanced multi-tool execution
   */
  private isAdvancedScanMode(scanMode: string): boolean {
    const advancedModes = [
      'FULL_SCAN',
      'NETWORK_RECONNAISSANCE',
      'WEB_APPLICATION_SCAN',
      'SSL_TLS_ANALYSIS',
      'DIRECTORY_ENUMERATION',
      'SQL_INJECTION_TEST',
      'VULNERABILITY_ASSESSMENT'
    ]
    
    return advancedModes.includes(scanMode)
  }

  /**
   * Save vulnerabilities to database
   */
  private async saveVulnerabilities(scanId: string, vulnerabilities: any[]) {
    console.log(`Saving ${vulnerabilities.length} vulnerabilities for scan ${scanId}`)
    
    for (const vuln of vulnerabilities) {
      try {
        await db.vulnerability.create({
          data: {
            scanId,
            severity: vuln.severity,
            type: vuln.type,
            title: vuln.title,
            description: vuln.description || null,
            solution: vuln.solution || null,
            reference: vuln.reference || null,
            location: vuln.location || null,
          },
        })
      } catch (error) {
        console.error(`Failed to save vulnerability:`, error)
      }
    }
  }

  /**
   * Update scan status in database
   */
  private async updateScanStatus(scanId: string, status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED') {
    try {
      await db.scan.update({
        where: { id: scanId },
        data: { 
          status,
          ...(status === 'RUNNING' ? { startedAt: new Date() } : {}),
          ...(status === 'COMPLETED' || status === 'FAILED' ? { completedAt: new Date() } : {})
        },
      })
    } catch (error) {
      console.error(`Failed to update scan status:`, error)
    }
  }

  /**
   * Update scan with aggregated results
   */
  private async updateScanWithResults(scanId: string, result: AggregatedScanResult, status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED') {
    try {
      await db.scan.update({
        where: { id: scanId },
        data: {
          status,
          completedAt: new Date(),
          results: JSON.stringify({
            aggregatedResult: result,
            summary: result.summary,
            toolResults: result.toolResults.map(tr => ({
              tool: tr.tool,
              exitCode: tr.exitCode,
              vulnerabilityCount: tr.vulnerabilities.length,
              executionTime: tr.metadata.executionTime
            }))
          }),
        },
      })
    } catch (error) {
      console.error(`Failed to update scan with results:`, error)
    }
  }

  /**
   * Emit progress updates via socket
   */
  private emitProgress(scanId: string, message: string, progress: number) {
    console.log(`[${scanId}] ${message} (${progress}%)`)
    
    if (this.io?.to) {
      this.io.to(scanId).emit('scanProgress', {
        scanId,
        message,
        progress,
        timestamp: new Date().toISOString()
      })
    }
  }
}

/**
 * Factory function to create and execute a scan
 */
export async function executeScan(
  io: any,
  options: ScanOrchestrationOptions
): Promise<ScanOrchestrationResult> {
  const orchestrator = new ScanOrchestrator(io)
  return orchestrator.orchestrateScan(options)
}

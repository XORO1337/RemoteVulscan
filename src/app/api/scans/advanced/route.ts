import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ToolExecutor, AggregatedScanResult } from '@/lib/scanners/tool-executor'
import { getServer } from '@/lib/socket'

export async function POST(request: NextRequest) {
  try {
    const { scanId, scanMode } = await request.json()

    if (!scanId || !scanMode) {
      return NextResponse.json({ error: 'Scan ID and scan mode are required' }, { status: 400 })
    }

    // Get scan details
    const scan = await db.scan.findUnique({
      where: { id: scanId },
      include: {
        website: true,
      },
    })

    if (!scan) {
      return NextResponse.json({ error: 'Scan not found' }, { status: 404 })
    }

    if (scan.status !== 'PENDING') {
      return NextResponse.json({ error: 'Scan is already running or completed' }, { status: 400 })
    }

    // Update scan status to running
    await db.scan.update({
      where: { id: scanId },
      data: { 
        status: 'RUNNING', 
        startedAt: new Date(),
        scanType: scanMode // Update scan type to the requested mode
      },
    })

    // Get socket.io server instance
    const io = getServer()
    
    // Create tool executor
    const toolExecutor = new ToolExecutor(io)
    
    // Start scan in background based on scan mode
    executeAdvancedScan(toolExecutor, scanId, scan.website.url, scanMode)
      .catch(error => {
        console.error('Advanced scan failed:', error)
        // Update scan status to failed
        db.scan.update({
          where: { id: scanId },
          data: { 
            status: 'FAILED',
            completedAt: new Date(),
            results: JSON.stringify({ error: error.message })
          },
        }).catch(console.error)
      })

    return NextResponse.json({ 
      success: true, 
      message: `${scanMode} scan started successfully`,
      scanId 
    })
  } catch (error) {
    console.error('Failed to start advanced scan:', error)
    return NextResponse.json({ error: 'Failed to start scan' }, { status: 500 })
  }
}

async function executeAdvancedScan(
  toolExecutor: ToolExecutor, 
  scanId: string, 
  target: string, 
  scanMode: string
): Promise<void> {
  let result: AggregatedScanResult

  try {
    switch (scanMode) {
      case 'FULL_SCAN':
        result = await toolExecutor.executeFullScan(scanId, target)
        break
      case 'NETWORK_RECONNAISSANCE':
        result = await toolExecutor.executeNetworkReconnaissance(scanId, target)
        break
      case 'WEB_APPLICATION_SCAN':
        result = await toolExecutor.executeWebApplicationScan(scanId, target)
        break
      case 'SSL_TLS_ANALYSIS':
        result = await toolExecutor.executeSSLTLSAnalysis(scanId, target)
        break
      case 'DIRECTORY_ENUMERATION':
        result = await toolExecutor.executeDirectoryEnumeration(scanId, target)
        break
      case 'SQL_INJECTION_TEST':
        result = await toolExecutor.executeSQLInjectionTest(scanId, target)
        break
      default:
        throw new Error(`Unsupported scan mode: ${scanMode}`)
    }

    // Save vulnerabilities to database
    console.log(`Saving ${result.vulnerabilities.length} vulnerabilities for scan ${scanId}`)
    
    for (const vuln of result.vulnerabilities) {
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
    }

    // Update scan as completed with aggregated results
    await db.scan.update({
      where: { id: scanId },
      data: {
        status: 'COMPLETED',
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

    console.log(`Advanced scan completed successfully for ${scanId}`)
  } catch (error) {
    console.error(`Advanced scan failed for ${scanId}:`, error)
    
    // Update scan as failed
    await db.scan.update({
      where: { id: scanId },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
        results: JSON.stringify({ 
          error: error instanceof Error ? error.message : 'Unknown error',
          scanMode,
          target
        }),
      },
    })
    
    throw error
  }
}

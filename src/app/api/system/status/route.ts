import { NextResponse } from 'next/server'
import { dockerService } from '@/lib/docker-service'

export async function GET() {
  try {
    // Get comprehensive system information
    const systemInfo = await dockerService.getSystemInfo()
    const toolsAvailability = systemInfo.toolsAvailable 
      ? await dockerService.checkToolsAvailability()
      : null

    const response = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      docker: {
        daemon_running: systemInfo.dockerRunning,
        tools_container: systemInfo.toolsContainer,
        network_connectivity: systemInfo.networkConnectivity
      },
      tools: toolsAvailability ? {
        container_status: toolsAvailability.container.status,
        available_tools: Object.keys(toolsAvailability.tools).filter(
          tool => toolsAvailability.tools[tool].available
        ),
        unavailable_tools: Object.keys(toolsAvailability.tools).filter(
          tool => !toolsAvailability.tools[tool].available
        ),
        tool_details: toolsAvailability.tools
      } : null,
      scan_capabilities: {
        can_perform_scans: systemInfo.dockerRunning && systemInfo.toolsAvailable,
        advanced_scans_available: systemInfo.dockerRunning && systemInfo.toolsAvailable && systemInfo.networkConnectivity,
        supported_scan_modes: [
          'FULL_SCAN',
          'NETWORK_RECONNAISSANCE', 
          'WEB_APPLICATION_SCAN',
          'SSL_TLS_ANALYSIS',
          'DIRECTORY_ENUMERATION',
          'SQL_INJECTION_TEST',
          'VULNERABILITY_ASSESSMENT'
        ]
      },
      environment: {
        dockerized: process.env.DOCKERIZED === 'true',
        tools_path: process.env.TOOLS_PATH || '/tools',
        node_env: process.env.NODE_ENV || 'development'
      }
    }

    // Determine overall health status
    const overallStatus = systemInfo.dockerRunning && systemInfo.toolsAvailable 
      ? 'healthy' 
      : 'degraded'

    return NextResponse.json(response, {
      status: overallStatus === 'healthy' ? 200 : 503,
      headers: {
        'Cache-Control': 'no-cache',
        'X-System-Status': overallStatus
      }
    })
  } catch (error) {
    console.error('System status check failed:', error)
    
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      docker: {
        daemon_running: false,
        tools_container: { status: 'unknown' },
        network_connectivity: false
      },
      scan_capabilities: {
        can_perform_scans: false,
        advanced_scans_available: false,
        supported_scan_modes: []
      }
    }, { 
      status: 500,
      headers: {
        'X-System-Status': 'error'
      }
    })
  }
}

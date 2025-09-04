import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { executeScan } from '@/lib/scanners/scan-orchestrator'
import { getServer } from '@/lib/socket'

export async function POST(request: NextRequest) {
  try {
    const { scanId } = await request.json()

    if (!scanId) {
      return NextResponse.json({ error: 'Scan ID is required' }, { status: 400 })
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

    // Get socket.io server instance
    const io = getServer()
    
    // Start scan using the orchestrator (don't await - run in background)
    executeScan(io, {
      scanId,
      target: scan.website.url,
      scanMode: scan.scanType,
      priority: 'normal'
    }).catch(error => {
      console.error('Scan execution failed:', error)
    })

    return NextResponse.json({ 
      message: 'Scan started successfully', 
      scanId,
      scanType: scan.scanType,
      hasRealTime: !!io
    })
  } catch (error) {
    console.error('Failed to start scan:', error)
    return NextResponse.json({ 
      error: 'Failed to start scan',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

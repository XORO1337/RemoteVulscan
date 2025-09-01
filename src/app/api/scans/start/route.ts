import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { VulnerabilityScanner } from '@/lib/scanners/vulnerability-scanner'
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
    
    // Create a socket-like interface for the scanner
    const socketInterface = io || {
      to: (room: string) => ({
        emit: (event: string, data: any) => {
          console.log(`Socket emit: ${event} to ${room}`, data)
        }
      })
    }
    
    // Create scanner instance and start scan
    const scanner = new VulnerabilityScanner(socketInterface)
    
    // Start scan in background (don't await)
    scanner.startScan(scanId, scan.website.url, scan.scanType)
      .catch(error => {
        console.error('Background scan failed:', error)
      })

    return NextResponse.json({ 
      message: 'Scan started successfully', 
      scanId,
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

import { Server } from 'socket.io'

interface ScanUpdate {
  scanId: string
  output: string
  progress: number
  status: string
  vulnerabilities?: any[]
}

let ioInstance: Server | null = null

export const setupSocket = (io: Server) => {
  ioInstance = io
  
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id)

    // Join scan room for specific scan updates
    socket.on('joinScan', (scanId: string) => {
      socket.join(`scan-${scanId}`)
      console.log(`Client ${socket.id} joined scan room: scan-${scanId}`)
    })

    // Leave scan room
    socket.on('leaveScan', (scanId: string) => {
      socket.leave(`scan-${scanId}`)
      console.log(`Client ${socket.id} left scan room: scan-${scanId}`)
    })

    // Handle scan updates from backend
    socket.on('scanUpdate', (data: ScanUpdate) => {
      // Broadcast to all clients in the scan room
      io.to(`scan-${data.scanId}`).emit('scanUpdate', data)
      console.log(`Scan update broadcast for scan ${data.scanId}`)
    })

    // Handle scan completion
    socket.on('scanComplete', (data: { scanId: string; results: any }) => {
      io.to(`scan-${data.scanId}`).emit('scanComplete', data)
      console.log(`Scan completion broadcast for scan ${data.scanId}`)
    })

    // Handle scan errors
    socket.on('scanError', (data: { scanId: string; error: string }) => {
      io.to(`scan-${data.scanId}`).emit('scanError', data)
      console.log(`Scan error broadcast for scan ${data.scanId}`)
    })

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id)
    })

    // Send welcome message
    socket.emit('connected', {
      message: 'Connected to Vulnerability Scanner WebSocket',
      timestamp: new Date().toISOString(),
    })
  })
}

// Helper function to get server instance
export const getServer = (): Server | null => {
  return ioInstance
}

// Helper function to emit scan updates (can be used from API routes)
export const emitScanUpdate = (scanId: string, data: ScanUpdate) => {
  if (ioInstance) {
    ioInstance.to(`scan-${scanId}`).emit('scanUpdate', data)
  }
}

// Helper function to emit scan completion
export const emitScanComplete = (scanId: string, results: any) => {
  if (ioInstance) {
    ioInstance.to(`scan-${scanId}`).emit('scanComplete', { scanId, results })
  }
}

// Helper function to emit scan errors
export const emitScanError = (scanId: string, error: string) => {
  if (ioInstance) {
    ioInstance.to(`scan-${scanId}`).emit('scanError', { scanId, error })
  }
}

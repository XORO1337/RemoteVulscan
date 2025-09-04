import { Server, Socket } from 'socket.io';
import { logger } from '@/utils/logger';

export interface ScanUpdateData {
  status: string;
  progress?: any;
  result?: any;
  error?: string;
  startedAt?: string;
  queuePosition?: number;
}

export class WebSocketService {
  private io: Server;
  private connectedClients: Map<string, Socket> = new Map();

  constructor(io: Server) {
    this.io = io;
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      logger.info('Client connected', { socketId: socket.id });
      this.connectedClients.set(socket.id, socket);

      // Handle client joining scan room
      socket.on('join-scan', (scanId: string) => {
        socket.join(`scan-${scanId}`);
        logger.debug('Client joined scan room', { socketId: socket.id, scanId });
      });

      // Handle client leaving scan room
      socket.on('leave-scan', (scanId: string) => {
        socket.leave(`scan-${scanId}`);
        logger.debug('Client left scan room', { socketId: socket.id, scanId });
      });

      // Handle client subscribing to queue updates
      socket.on('subscribe-queue', () => {
        socket.join('queue-updates');
        logger.debug('Client subscribed to queue updates', { socketId: socket.id });
      });

      // Handle client unsubscribing from queue updates
      socket.on('unsubscribe-queue', () => {
        socket.leave('queue-updates');
        logger.debug('Client unsubscribed from queue updates', { socketId: socket.id });
      });

      // Handle disconnect
      socket.on('disconnect', (reason: string) => {
        logger.info('Client disconnected', { socketId: socket.id, reason });
        this.connectedClients.delete(socket.id);
      });

      // Handle errors
      socket.on('error', (error: Error) => {
        logger.error('Socket error', { socketId: socket.id, error: error.message });
      });
    });
  }

  // Emit scan update to specific scan room
  emitScanUpdate(scanId: string, data: ScanUpdateData): void {
    this.io.to(`scan-${scanId}`).emit('scan-update', {
      scanId,
      timestamp: new Date().toISOString(),
      ...data
    });

    logger.debug('Scan update emitted', { scanId, status: data.status });
  }

  // Emit scan progress update
  emitScanProgress(scanId: string, progress: any): void {
    this.io.to(`scan-${scanId}`).emit('scan-progress', {
      scanId,
      progress,
      timestamp: new Date().toISOString()
    });

    logger.debug('Scan progress emitted', { scanId, progress });
  }

  // Emit queue statistics update
  emitQueueUpdate(queueStats: any): void {
    this.io.to('queue-updates').emit('queue-update', {
      timestamp: new Date().toISOString(),
      ...queueStats
    });

    logger.debug('Queue update emitted', queueStats);
  }

  // Emit system status update
  emitSystemUpdate(systemData: any): void {
    this.io.emit('system-update', {
      timestamp: new Date().toISOString(),
      ...systemData
    });

    logger.debug('System update emitted', systemData);
  }

  // Emit tool status update
  emitToolUpdate(toolData: any): void {
    this.io.emit('tool-update', {
      timestamp: new Date().toISOString(),
      ...toolData
    });

    logger.debug('Tool update emitted', toolData);
  }

  // Send message to specific client
  sendToClient(socketId: string, event: string, data: any): boolean {
    const socket = this.connectedClients.get(socketId);
    if (socket) {
      socket.emit(event, {
        timestamp: new Date().toISOString(),
        ...data
      });
      return true;
    }
    return false;
  }

  // Broadcast message to all clients
  broadcast(event: string, data: any): void {
    this.io.emit(event, {
      timestamp: new Date().toISOString(),
      ...data
    });

    logger.debug('Broadcast emitted', { event, clientCount: this.connectedClients.size });
  }

  // Get connected clients count
  getConnectedClientsCount(): number {
    return this.connectedClients.size;
  }

  // Get clients in specific room
  getClientsInRoom(room: string): Promise<string[]> {
    return new Promise((resolve) => {
      this.io.in(room).allSockets().then(sockets => {
        resolve(Array.from(sockets));
      });
    });
  }

  // Check if client is connected
  isClientConnected(socketId: string): boolean {
    return this.connectedClients.has(socketId);
  }

  // Disconnect specific client
  disconnectClient(socketId: string, reason?: string): boolean {
    const socket = this.connectedClients.get(socketId);
    if (socket) {
      socket.disconnect();
      this.connectedClients.delete(socketId);
      logger.info('Client disconnected manually', { socketId, reason });
      return true;
    }
    return false;
  }

  // Get health status
  getHealthStatus(): any {
    return {
      connectedClients: this.connectedClients.size,
      totalRooms: this.io.sockets.adapter.rooms.size,
      status: 'healthy'
    };
  }
}

export default WebSocketService;

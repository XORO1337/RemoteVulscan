import { Request, Response } from 'express';
import { logger } from '@/utils/logger';
import { asyncHandler } from '@/middleware/errorHandler';
import { ToolsAPIClient } from '@/services/toolsApiClient';
import { ScanOrchestrator } from '@/services/scanOrchestrator';
import { WebSocketService } from '@/services/websocketService';

/**
 * @swagger
 * /api/v1/system/health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [System]
 *     responses:
 *       200:
 *         description: System health status
 */
export const healthCheck = asyncHandler(async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  // Check tool execution service health
  const toolExecutionService = req.app.locals.toolExecutionService;
  const toolStats = toolExecutionService.getExecutionStats();
  const toolsHealthy = toolStats.availableTools > 0;
  
  // Check WebSocket service
  const websocketService = req.app.locals.websocketService as WebSocketService;
  const wsHealth = websocketService.getHealthStatus();
  
  // Check scan orchestrator
  const scanOrchestrator = req.app.locals.scanOrchestrator as ScanOrchestrator;
  const queueStats = await scanOrchestrator.getQueueStats();
  
  const responseTime = Date.now() - startTime;
  
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    responseTime: `${responseTime}ms`,
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    services: {
      api: {
        status: 'healthy',
        responseTime: `${responseTime}ms`
      },
      toolExecution: {
        status: toolsHealthy ? 'healthy' : 'unhealthy',
        availableTools: toolStats.availableTools,
        totalTools: toolStats.totalTools,
        activeExecutions: toolStats.activeExecutions
      },
      websocket: {
        status: 'healthy',
        connectedClients: wsHealth.connectedClients,
        totalRooms: wsHealth.totalRooms
      },
      queue: {
        status: 'healthy',
        waiting: queueStats.waiting,
        active: queueStats.active
      },
      database: {
        status: 'healthy' // Prisma handles connection status
      }
    },
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024)
    }
  };
  
  // Determine overall status
  const isHealthy = toolsHealthy;
  health.status = isHealthy ? 'healthy' : 'degraded';
  
  res.status(isHealthy ? 200 : 503).json(health);
});

/**
 * @swagger
 * /api/v1/system/info:
 *   get:
 *     summary: Get system information
 *     tags: [System]
 *     responses:
 *       200:
 *         description: System information
 */
export const getSystemInfo = asyncHandler(async (req: Request, res: Response) => {
  const info = {
    application: {
      name: 'RemoteVulscan Backend API',
      version: process.env.npm_package_version || '1.0.0',
      description: 'Backend API service for RemoteVulscan security scanning platform',
      environment: process.env.NODE_ENV || 'development'
    },
    system: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      uptime: process.uptime(),
      pid: process.pid
    },
    features: {
      asyncScanning: true,
      realTimeUpdates: true,
      multiToolSupport: true,
      queueManagement: true,
      apiDocumentation: true
    },
    endpoints: {
      health: '/api/v1/health',
      docs: '/api/v1/docs',
      scans: '/api/v1/scans',
      websites: '/api/v1/websites',
      tools: '/api/v1/tools'
    }
  };
  
  res.json(info);
});

/**
 * @swagger
 * /api/v1/system/metrics:
 *   get:
 *     summary: Get system metrics
 *     tags: [System]
 *     responses:
 *       200:
 *         description: System performance metrics
 */
export const getSystemMetrics = asyncHandler(async (req: Request, res: Response) => {
  const metrics = {
    timestamp: new Date().toISOString(),
    process: {
      uptime: process.uptime(),
      cpu: process.cpuUsage(),
      memory: {
        heapUsed: process.memoryUsage().heapUsed,
        heapTotal: process.memoryUsage().heapTotal,
        external: process.memoryUsage().external,
        rss: process.memoryUsage().rss
      }
    },
    system: {
      loadAverage: require('os').loadavg(),
      totalMemory: require('os').totalmem(),
      freeMemory: require('os').freemem(),
      cpus: require('os').cpus().length
    }
  };
  
  res.json(metrics);
});

/**
 * @swagger
 * /api/v1/system/logs:
 *   get:
 *     summary: Get recent system logs
 *     tags: [System]
 *     parameters:
 *       - in: query
 *         name: level
 *         schema:
 *           type: string
 *           enum: [error, warn, info, debug]
 *         description: Log level filter
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Number of log entries to return
 *     responses:
 *       200:
 *         description: Recent log entries
 */
export const getSystemLogs = asyncHandler(async (req: Request, res: Response) => {
  const level = req.query.level as string || 'info';
  const limit = parseInt(req.query.limit as string) || 100;
  
  // This is a simplified implementation
  // In a real application, you would read from log files or a logging service
  res.json({
    message: 'Log retrieval not implemented in this demo',
    hint: 'In production, this would return recent log entries based on the specified level and limit',
    parameters: { level, limit }
  });
});

/**
 * @swagger
 * /api/v1/system/config:
 *   get:
 *     summary: Get system configuration (non-sensitive)
 *     tags: [System]
 *     responses:
 *       200:
 *         description: System configuration
 */
export const getSystemConfig = asyncHandler(async (req: Request, res: Response) => {
  const config = {
    api: {
      version: 'v1',
      rateLimiting: {
        enabled: true,
        generalLimit: 100, // requests per 15 minutes
        scanLimit: 10 // scans per hour
      },
      pagination: {
        defaultLimit: 20,
        maxLimit: 100
      }
    },
    scanning: {
      maxConcurrentScans: parseInt(process.env.SCAN_CONCURRENCY || '3'),
      defaultTimeout: 30000, // 30 seconds
      supportedTools: [
        'nmap', 'nikto', 'nuclei', 'testssl', 'sslscan', 
        'sqlmap', 'dirsearch', 'gobuster', 'whatweb', 'masscan'
      ],
      scanModes: [
        'full_scan', 'network_recon', 'web_scan', 'ssl_analysis',
        'directory_enum', 'sql_injection', 'vulnerability_assessment'
      ]
    },
    features: {
      realTimeUpdates: true,
      asyncProcessing: true,
      queueManagement: true,
      apiDocumentation: true,
      integratedToolExecution: true
    }
  };
  
  res.json(config);
});

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

// Import middleware
import { errorHandler } from '@/middleware/errorHandler';
import { rateLimiter } from '@/middleware/rateLimiter';
import { requestLogger } from '@/middleware/requestLogger';

// Import routes
import scansRouter from '@/routes/scans';
import websitesRouter from '@/routes/websites';
import systemRouter from '@/routes/system';
import toolsRouter from '@/routes/tools';

// Import services
import { logger } from '@/utils/logger';
import { connectDatabase } from '@/utils/database';
import { ScanOrchestrator } from '@/services/scanOrchestrator';
import { WebSocketService } from '@/services/websocketService';
import { ToolExecutionService } from '@/services/toolExecutionService';

// Load environment variables
dotenv.config();

class BackendServer {
  private app: express.Application;
  private server: any;
  private io: Server;
  private scanOrchestrator!: ScanOrchestrator;
  private websocketService!: WebSocketService;
  private toolExecutionService!: ToolExecutionService;

  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.io = new Server(this.server, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true
      }
    });
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupSwagger();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }));

    // CORS configuration
    this.app.use(cors({
      origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000', 'http://frontend:3000'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
    }));

    // Compression
    this.app.use(compression());

    // Request parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Logging
    this.app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
  // Cast to any to avoid type inference issues due to extended Request interface
  this.app.use(requestLogger as any);

    // Rate limiting
    this.app.use(rateLimiter);
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/api/v1/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.env.npm_package_version || '1.0.0'
      });
    });

    // Tool execution endpoint
    this.app.post('/api/v1/tools/execute', async (req, res) => {
      try {
        const { tool, args = [], target, timeout } = req.body;
        
        if (!tool || !target) {
          return res.status(400).json({
            error: 'Tool and target are required',
            timestamp: new Date().toISOString()
          });
        }

        const toolExecutionService = req.app.locals.toolExecutionService;
        if (!toolExecutionService) {
          return res.status(503).json({
            error: 'Tool execution service not available',
            timestamp: new Date().toISOString()
          });
        }

        const result = await toolExecutionService.executeTool(tool, args, target, timeout);
        res.json(result);
      } catch (error) {
        logger.error('Tool execution failed:', error);
        res.status(500).json({
          error: 'Tool execution failed',
          details: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        });
      }
    });

    // Multiple tools execution endpoint
    this.app.post('/api/v1/tools/execute-multiple', async (req, res) => {
      try {
        const { tools, target, mode = 'parallel' } = req.body;
        
        if (!tools || !Array.isArray(tools) || !target) {
          return res.status(400).json({
            error: 'Tools array and target are required',
            timestamp: new Date().toISOString()
          });
        }

        const toolExecutionService = req.app.locals.toolExecutionService;
        if (!toolExecutionService) {
          return res.status(503).json({
            error: 'Tool execution service not available',
            timestamp: new Date().toISOString()
          });
        }

        const results = await toolExecutionService.executeMultipleTools(tools, target, mode);
        const report = await toolExecutionService.generateScanReport(results);
        res.json(report);
      } catch (error) {
        logger.error('Multiple tools execution failed:', error);
        res.status(500).json({
          error: 'Multiple tools execution failed',
          details: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        });
      }
    });

    // Tool information endpoint
    this.app.get('/api/v1/tools/info', async (req, res) => {
      try {
        const toolExecutionService = req.app.locals.toolExecutionService;
        if (!toolExecutionService) {
          return res.status(503).json({
            error: 'Tool execution service not available',
            timestamp: new Date().toISOString()
          });
        }

        const tools = await toolExecutionService.getAvailableTools();
        const stats = toolExecutionService.getExecutionStats();
        
        res.json({
          tools: Object.fromEntries(tools),
          categories: toolExecutionService.getCategories(),
          statistics: stats,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        logger.error('Failed to get tools info:', error);
        res.status(500).json({
          error: 'Failed to get tools information',
          timestamp: new Date().toISOString()
        });
      }
    });

    // API routes
    this.app.use('/api/v1/scans', scansRouter);
    this.app.use('/api/v1/websites', websitesRouter);
    this.app.use('/api/v1/system', systemRouter);
    this.app.use('/api/v1/tools', toolsRouter);

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.originalUrl} not found`,
        timestamp: new Date().toISOString()
      });
    });
  }

  private setupSwagger(): void {
    const options = {
      definition: {
        openapi: '3.0.0',
        info: {
          title: 'RemoteVulscan API',
          version: '1.0.0',
          description: 'A comprehensive security scanning API that provides vulnerability assessment capabilities',
          contact: {
            name: 'API Support',
            email: 'support@remotevulscan.com'
          }
        },
        servers: [
          {
            url: process.env.API_BASE_URL || 'http://localhost:8000',
            description: 'Development server'
          }
        ],
        components: {
          securitySchemes: {
            ApiKeyAuth: {
              type: 'apiKey',
              in: 'header',
              name: 'X-API-Key'
            }
          }
        }
      },
      apis: ['./src/routes/*.ts', './src/controllers/*.ts']
    };

    const specs = swaggerJsdoc(options);
    this.app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(specs, {
      explorer: true,
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'RemoteVulscan API Documentation'
    }));
  }

  private setupServices(): void {
    this.websocketService = new WebSocketService(this.io);
    this.scanOrchestrator = new ScanOrchestrator(this.websocketService);
    this.toolExecutionService = new ToolExecutionService();
    
    // Make services available to routes
    this.app.locals.scanOrchestrator = this.scanOrchestrator;
    this.app.locals.websocketService = this.websocketService;
    this.app.locals.toolExecutionService = this.toolExecutionService;
  }

  private setupErrorHandling(): void {
    this.app.use(errorHandler);

    // Graceful shutdown
    process.on('SIGTERM', () => this.shutdown('SIGTERM'));
    process.on('SIGINT', () => this.shutdown('SIGINT'));
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      this.shutdown('uncaughtException');
    });
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });
  }

  public async start(): Promise<void> {
    try {
      // Connect to database
      await connectDatabase();
      
      // Initialize services after database connection
      this.setupServices();
      
      const port = process.env.PORT || 8000;
      
      this.server.listen(port, () => {
        logger.info(`🚀 Backend API server started on port ${port}`);
        logger.info(`📚 API Documentation available at http://localhost:${port}/api/v1/docs`);
        logger.info(`🔍 Health check available at http://localhost:${port}/api/v1/health`);
        logger.info(`🌐 WebSocket server ready for real-time communications`);
        logger.info(`🛠️  Tool execution service initialized`);
      });
    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  private async shutdown(signal: string): Promise<void> {
    logger.info(`Received ${signal}. Starting graceful shutdown...`);
    
    try {
      // Stop scan orchestrator
      if (this.scanOrchestrator) {
        logger.info('Shutting down scan orchestrator...');
        await this.scanOrchestrator.shutdown();
      }

      // Stop tool execution service
      if (this.toolExecutionService) {
        logger.info('Shutting down tool execution service...');
        await this.toolExecutionService.shutdown();
      }

      // Close server
      this.server.close(() => {
        logger.info('HTTP server closed');
      });

      // Close WebSocket connections
      this.io.close(() => {
        logger.info('WebSocket server closed');
      });

    } catch (error) {
      logger.error('Error during shutdown:', error);
    }

    logger.info('Graceful shutdown completed');
    process.exit(0);
  }
}

// Start server
const server = new BackendServer();
server.start().catch((error) => {
  logger.error('Failed to start application:', error);
  process.exit(1);
});

export default server;

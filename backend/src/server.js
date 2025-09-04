const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { PrismaClient } = require('@prisma/client');

const logger = require('./utils/logger');
const config = require('./config/config');
const errorHandler = require('./middleware/errorHandler');
const authMiddleware = require('./middleware/auth');

// Import routes
const healthRoutes = require('./routes/health');
const scanRoutes = require('./routes/scans');
const toolsRoutes = require('./routes/tools');
const systemRoutes = require('./routes/system');

// Import services
const ScanService = require('./services/ScanService');
const ToolService = require('./services/ToolService');
const WebSocketService = require('./services/WebSocketService');

class BackendServer {
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = socketIo(this.server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"]
      }
    });
    this.prisma = new PrismaClient();
    this.scanService = null;
    this.toolService = null;
    this.wsService = null;
  }

  async initialize() {
    try {
      // Initialize database connection
      await this.prisma.$connect();
      logger.info('Database connected successfully');

      // Initialize services
      this.scanService = new ScanService(this.prisma, this.io);
      this.toolService = new ToolService();
      this.wsService = new WebSocketService(this.io, this.scanService);

      // Setup middleware
      this.setupMiddleware();
      
      // Setup routes
      this.setupRoutes();
      
      // Setup error handling
      this.setupErrorHandling();

      logger.info('Backend server initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize backend server:', error);
      throw error;
    }
  }

  setupMiddleware() {
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
      origin: process.env.FRONTEND_URL || "http://localhost:3000",
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
    }));

    // Compression and parsing
    this.app.use(compression());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Logging
    this.app.use(morgan('combined', {
      stream: { write: message => logger.info(message.trim()) }
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: {
        error: 'Too many requests from this IP',
        retryAfter: '15 minutes'
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use('/api/', limiter);

    // API versioning
    this.app.use('/api/v1', (req, res, next) => {
      req.apiVersion = 'v1';
      next();
    });
  }

  setupRoutes() {
    // Inject services into request object
    this.app.use((req, res, next) => {
      req.services = {
        scan: this.scanService,
        tool: this.toolService,
        websocket: this.wsService
      };
      next();
    });

    // API routes
    this.app.use('/api/v1/health', healthRoutes);
    this.app.use('/api/v1/scans', scanRoutes);
    this.app.use('/api/v1/tools', toolsRoutes);
    this.app.use('/api/v1/system', systemRoutes);

    // API documentation
    const swaggerUi = require('swagger-ui-express');
    const swaggerSpec = require('./config/swagger');
    this.app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        service: 'Scanner Backend API',
        version: '1.0.0',
        status: 'operational',
        documentation: '/api/docs',
        endpoints: {
          health: '/api/v1/health',
          scans: '/api/v1/scans',
          tools: '/api/v1/tools',
          system: '/api/v1/system'
        }
      });
    });

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Endpoint not found',
        path: req.originalUrl,
        method: req.method,
        timestamp: new Date().toISOString()
      });
    });
  }

  setupErrorHandling() {
    this.app.use(errorHandler);

    // Graceful shutdown
    process.on('SIGTERM', () => this.shutdown());
    process.on('SIGINT', () => this.shutdown());
  }

  async shutdown() {
    logger.info('Shutting down backend server...');
    
    try {
      await this.prisma.$disconnect();
      this.server.close(() => {
        logger.info('Backend server shut down successfully');
        process.exit(0);
      });
    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  }

  async start() {
    await this.initialize();
    
    const port = process.env.PORT || 8000;
    this.server.listen(port, '0.0.0.0', () => {
      logger.info(`🚀 Backend API server running on port ${port}`);
      logger.info(`📚 API Documentation: http://localhost:${port}/api/docs`);
      logger.info(`🔍 Health Check: http://localhost:${port}/api/v1/health`);
    });
  }
}

// Start server
const server = new BackendServer();
server.start().catch(error => {
  logger.error('Failed to start backend server:', error);
  process.exit(1);
});

module.exports = BackendServer;
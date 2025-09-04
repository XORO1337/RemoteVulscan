const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const config = {
  // Server configuration
  port: process.env.PORT || 8000,
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // API configuration
  apiVersion: process.env.API_VERSION || 'v1',
  apiPrefix: '/api/v1',
  
  // Database configuration
  database: {
    url: process.env.DATABASE_URL || 'postgresql://scanner:scanner_password@postgres:5432/scanner'
  },
  
  // Redis configuration
  redis: {
    url: process.env.REDIS_URL || 'redis://redis:6379',
    keyPrefix: 'scanner:',
    defaultTTL: 3600 // 1 hour
  },
  
  // Security configuration
  security: {
    jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
    jwtExpiration: process.env.JWT_EXPIRATION || '24h',
    apiKeyHeader: 'X-API-Key',
    rateLimitWindow: 15 * 60 * 1000, // 15 minutes
    rateLimitMax: 100
  },
  
  // Scanning configuration
  scanning: {
    maxConcurrentScans: parseInt(process.env.MAX_CONCURRENT_SCANS) || 5,
    scanTimeout: parseInt(process.env.SCAN_TIMEOUT) || 1800000, // 30 minutes
    toolsPath: process.env.TOOLS_PATH || '/tools',
    reportsPath: process.env.REPORTS_PATH || './reports',
    allowedScanTypes: [
      'NMAP',
      'NIKTO', 
      'NUCLEI',
      'SSL_CHECK',
      'FULL_SCAN',
      'NETWORK_RECONNAISSANCE',
      'WEB_APPLICATION_SCAN',
      'SSL_TLS_ANALYSIS',
      'DIRECTORY_ENUMERATION',
      'SQL_INJECTION_TEST',
      'VULNERABILITY_ASSESSMENT'
    ]
  },
  
  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'combined',
    directory: process.env.LOG_DIRECTORY || './logs'
  },
  
  // External services
  external: {
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
    webhookUrl: process.env.WEBHOOK_URL,
    notificationEmail: process.env.NOTIFICATION_EMAIL
  },
  
  // Feature flags
  features: {
    enableWebSocket: process.env.ENABLE_WEBSOCKET !== 'false',
    enableMetrics: process.env.ENABLE_METRICS !== 'false',
    enableSwagger: process.env.ENABLE_SWAGGER !== 'false',
    enableAuth: process.env.ENABLE_AUTH === 'true'
  }
};

// Validation
const requiredEnvVars = ['DATABASE_URL'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('Missing required environment variables:', missingVars);
  process.exit(1);
}

module.exports = config;
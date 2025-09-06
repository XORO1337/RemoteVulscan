# RemoteVulscan Backend API

The backend API service for RemoteVulscan, providing a comprehensive RESTful API for security vulnerability scanning with integrated tool execution capabilities.

## 🏗️ Architecture

Built with modern Node.js technologies:
- **Express.js** - Web framework
- **TypeScript** - Type safety and developer experience
- **Prisma** - Database ORM with SQLite
- **BullMQ** - Job queuing with Redis (optional)
- **Socket.IO** - Real-time WebSocket communication
- **Winston** - Structured logging
- **Joi** - Request validation
- **Swagger/OpenAPI** - API documentation
- **Integrated Tool Execution** - Security tools run within the same container

## 📡 API Endpoints

### Core API (v1)
- `GET /api/v1/health` - Health check and system status
- `GET /api/v1/docs` - Interactive API documentation

### Scans Management
- `GET /api/v1/scans` - List scans with pagination and filtering
- `POST /api/v1/scans` - Create new vulnerability scan
- `GET /api/v1/scans/{id}` - Get detailed scan results
- `POST /api/v1/scans/{id}/cancel` - Cancel running scan
- `GET /api/v1/scans/stats` - Scan statistics and metrics
- `GET /api/v1/scans/queue` - Queue status and statistics

### Website Management
- `GET /api/v1/websites` - List target websites
- `POST /api/v1/websites` - Add new target website
- `GET /api/v1/websites/{id}` - Get website details
- `PUT /api/v1/websites/{id}` - Update website information
- `DELETE /api/v1/websites/{id}` - Remove website
- `GET /api/v1/websites/{id}/scans` - Get scans for specific website

### Tools Information
- `GET /api/v1/tools` - List available security tools
- `POST /api/v1/tools/execute` - Execute a single security tool
- `POST /api/v1/tools/execute-multiple` - Execute multiple tools
- `GET /api/v1/tools/{name}` - Get specific tool information
- `GET /api/v1/tools/categories` - Tool categories
- `GET /api/v1/tools/scan-modes` - Available scan modes
- `GET /api/v1/tools/health` - Tools service health

### System Information
- `GET /api/v1/system/info` - System information
- `GET /api/v1/system/metrics` - Performance metrics
- `GET /api/v1/system/config` - System configuration
- `GET /api/v1/system/logs` - Recent system logs

## 🔄 WebSocket Events

Real-time updates via Socket.IO:

### Client → Server
- `join-scan` - Subscribe to scan updates
- `leave-scan` - Unsubscribe from scan updates
- `subscribe-queue` - Subscribe to queue updates
- `unsubscribe-queue` - Unsubscribe from queue updates

### Server → Client
- `scan-update` - Scan status changes
- `scan-progress` - Detailed progress updates
- `queue-update` - Queue statistics
- `system-update` - System status changes
- `tool-update` - Tool availability changes

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Redis (for job queuing)
- SQLite (for database)

### Installation
```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your configuration

# Generate Prisma client
npx prisma generate

# Initialize database
npx prisma db push

# Verify security tools (if running in container)
npm run tools:verify

# Start development server
npm run dev
```

### Production Build
```bash
# Build TypeScript
npm run build

# Start production server
npm start
```

## 🐳 Docker Deployment

```bash
# Build container
docker build -t remotevulscan-backend -f backend/Dockerfile .

# Run with environment variables
docker run -d \
  -p 8000:8000 \
  -e DATABASE_URL=file:./data/db/custom.db \
  -e TOOLS_PATH=/usr/local/bin \
  -v $(pwd)/data:/app/data \
  remotevulscan-backend
```

## ⚙️ Configuration

### Environment Variables

**Required:**
- `DATABASE_URL` - SQLite database path
- `TOOLS_PATH` - Path to security tools (default: /usr/local/bin)

**Optional:**
- `PORT` - Server port (default: 8000)
- `NODE_ENV` - Environment (development/production)
- `LOG_LEVEL` - Logging level (debug/info/warn/error)
- `MAX_CONCURRENT_EXECUTIONS` - Max concurrent tool executions (default: 5)
- `JWT_SECRET` - JWT signing secret
- `FRONTEND_URL` - Frontend URL for CORS

**Rate Limiting:**
- `RATE_LIMIT_WINDOW_MS` - Rate limit window (default: 15min)
- `RATE_LIMIT_MAX_REQUESTS` - Max requests per window (default: 100)
- `SCAN_RATE_LIMIT_MAX` - Max scans per hour (default: 10)

### Database Configuration

Uses Prisma with SQLite:
```bash
# Generate client
npx prisma generate

# Push schema changes
npx prisma db push

# View data
npx prisma studio
```

### Redis Configuration

Optional for job queuing (falls back to direct execution):
```bash
# Default connection
redis://localhost:6379

# With authentication
redis://:password@localhost:6379

# Custom configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-password
```

### Security Tools

The backend now includes integrated security tools:
- **Network**: nmap, masscan
- **Web**: nikto, nuclei, gobuster, dirsearch, whatweb, sqlmap
- **Crypto**: testssl.sh, sslscan
- **Discovery**: httpx, subfinder, assetfinder

Tools are verified on startup and available via the tool execution service.

## 🔍 Security Features

### Authentication
- API key authentication via `X-API-Key` header
- JWT token support for session management
- Rate limiting per IP and API key

### Input Validation
- Joi schema validation for all requests
- URL format validation and sanitization
- Scan parameter security checking
- SQL injection prevention with Prisma

### Network Security
- CORS configuration
- Security headers with Helmet.js
- Private network scanning restrictions
- Dangerous scan argument filtering

### Error Handling
- Comprehensive error middleware
- Structured error responses
- Security-focused error messages
- Request logging and monitoring

## 🏗️ Architecture Details

### Service Layer
```typescript
// Scan orchestration with job queuing
class ScanOrchestrator {
  async queueScan(scanData: ScanJobData): Promise<string>
  async cancelScan(scanId: string): Promise<boolean>
  async getQueueStats(): Promise<QueueStats>
}

// Tool execution service (NEW)
class ToolExecutionService {
  async executeTool(tool: string, args: string[], target: string): Promise<ToolExecutionResult>
  async executeMultipleTools(tools: any[], target: string, mode: string): Promise<ToolExecutionResult[]>
  async getAvailableTools(): Promise<Map<string, ToolInfo>>
}

// WebSocket communication
class WebSocketService {
  emitScanUpdate(scanId: string, data: ScanUpdateData): void
  emitQueueUpdate(queueStats: any): void
}
```

### Database Schema
```prisma
model Scan {
  id              String      @id @default(cuid())
  websiteId       String
  status          ScanStatus  @default(PENDING)
  scanType        ScanType
  scanMode        String?
  vulnerabilities Vulnerability[]
  // ... other fields
}

model Vulnerability {
  id          String                @id @default(cuid())
  scanId      String
  severity    VulnerabilitySeverity
  type        String
  title       String
  // ... other fields
}
```

### Job Processing
```typescript
// Async scan processing with BullMQ
const scanQueue = new Queue('scan-queue', {
  connection: redisConfig,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 }
  }
});
```

## 🧪 Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage

# Integration tests
npm run test:integration

# Test tool execution
npm run tools:test

# Verify tools installation
npm run tools:verify

# API testing with curl
curl -X POST http://localhost:8000/api/v1/scans \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com","scanType":"NUCLEI"}'

# Test tool execution
curl -X POST http://localhost:8000/api/v1/tools/execute \
  -H "Content-Type: application/json" \
  -d '{"tool":"nmap","target":"scanme.nmap.org","args":["-sn"]}'
```

## 📊 Monitoring

### Health Checks
```bash
# Basic health
curl http://localhost:8000/api/v1/health

# Detailed system info
curl http://localhost:8000/api/v1/system/info

# Tools health
curl http://localhost:8000/api/v1/tools/health

# Available tools
curl http://localhost:8000/api/v1/tools

# Performance metrics
curl http://localhost:8000/api/v1/system/metrics
```

### Logging
```bash
# View logs
tail -f logs/combined.log
tail -f logs/error.log

# Filter by level
grep "ERROR" logs/combined.log
grep "WARN" logs/combined.log
```

### Queue Monitoring
```bash
# Queue statistics
curl http://localhost:8000/api/v1/scans/queue

# Redis queue inspection
redis-cli
> KEYS bull:scan-queue:*
> LLEN bull:scan-queue:waiting
```

## 🔧 Development

### Code Structure
```
src/
├── controllers/     # Request handlers
├── services/       # Business logic
├── middleware/     # Request middleware
├── routes/         # API routes
├── utils/          # Utilities
└── server.ts       # Application entry
```

### Adding New Features

1. **New API Endpoint:**
```typescript
// controllers/newController.ts
export const newEndpoint = asyncHandler(async (req, res) => {
  // Implementation
});

// routes/new.ts
router.get('/new', newEndpoint);

// server.ts
app.use('/api/v1/new', newRouter);
```

2. **New Scan Type:**
```typescript
// Update Prisma schema
enum ScanType {
  // ... existing types
  NEW_SCAN_TYPE
}

// Update scan orchestrator
const toolMap: Record<ScanType, string> = {
  // ... existing mappings
  NEW_SCAN_TYPE: 'new-tool'
}
```

### Code Style
- TypeScript strict mode
- ESLint configuration
- Prettier formatting
- Conventional commits

## 🚨 Troubleshooting

### Common Issues

**Database Connection:**
```bash
# Check database file
ls -la data/db/custom.db

# Reset database
rm data/db/custom.db
npx prisma db push
```

**Redis Connection:**
```bash
# Test Redis connectivity
redis-cli ping

# Check Redis logs
docker logs redis-container
```

**Tools API Connection:**
```bash
# Test tool execution
curl -X POST http://localhost:8000/api/v1/tools/execute \
  -H "Content-Type: application/json" \
  -d '{"tool":"nmap","target":"127.0.0.1","args":["-sn"]}'

# Verify tools
docker exec <container> verify-tools.sh
```

**Queue Issues:**
```bash
# Clear Redis queue
redis-cli FLUSHALL

# Restart worker processes
docker restart backend-container
```

### Debug Mode
```bash
# Enable debug logging
export LOG_LEVEL=debug
npm run dev

# Debug specific modules
DEBUG=prisma:* npm run dev
DEBUG=bull:* npm run dev
```

## 📄 License

MIT License - see LICENSE file for details

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/new-feature`)
3. Commit changes (`git commit -am 'Add new feature'`)
4. Push to branch (`git push origin feature/new-feature`)  
5. Create Pull Request

---

## 🔧 Recent Changes

### v2.0 - Integrated Tool Execution
- **Removed external tools container dependency**
- **Integrated security tools directly into backend container**
- **Added ToolExecutionService for direct tool execution**
- **Enhanced error handling and logging**
- **Improved Docker image with all tools pre-installed**
- **Added tool verification and health checking**
- **Simplified deployment architecture**

For more information, see the main [ARCHITECTURE.md](../ARCHITECTURE.md) documentation.
# 🏗️ RemoteVulscan Project Architecture

## 📁 Project Structure

```
RemoteVulscan/
├── 🔧 backend/                    # Backend API Service (Node.js/Express)
│   ├── src/
│   │   ├── controllers/           # API route handlers
│   │   ├── services/             # Business logic services
│   │   ├── middleware/           # Express middleware
│   │   ├── routes/               # API route definitions
│   │   ├── utils/                # Utility functions
│   │   └── types/                # TypeScript type definitions
│   ├── prisma/                   # Database schema and migrations
│   ├── Dockerfile                # Backend container configuration
│   ├── package.json              # Backend dependencies
│   ├── tsconfig.json             # TypeScript configuration
│   ├── api-spec.yaml             # OpenAPI specification
│   └── README.md                 # Backend documentation
│
├── 🎨 frontend/                   # Frontend Web Application (Next.js)
│   ├── src/
│   │   ├── app/                  # Next.js App Router pages
│   │   ├── components/           # React components
│   │   ├── hooks/                # Custom React hooks
│   │   └── lib/                  # Utilities and API client
│   ├── public/                   # Static assets
│   ├── Dockerfile                # Frontend container configuration
│   ├── package.json              # Frontend dependencies
│   ├── tsconfig.json             # TypeScript configuration
│   ├── tailwind.config.ts        # Tailwind CSS configuration
│   ├── next.config.ts            # Next.js configuration
│   └── README.md                 # Frontend documentation
│
├── 🛠️ tools/                      # Security Tools Container
│   ├── Dockerfile                # Tools container configuration
│   └── scripts/                  # Tool installation scripts
│
├── 🗄️ db/                         # Database files
│   └── custom.db                 # SQLite database
│
├── 📋 scripts/                    # Deployment and utility scripts
│   ├── deploy-microservices.sh   # Deploy separated services
│   ├── cleanup-project.sh        # Remove old monolithic files
│   └── setup-*.sh               # Various setup scripts
│
├── 🐳 docker-compose-new.yml      # Microservices orchestration
├── 📚 README.md                  # Main project documentation
└── 📄 *.md                       # Documentation files
```

### 2. Frontend Web Application (`frontend/`)
- **Purpose**: User interface for the scanning platform
- **Port**: 3000  
- **Technology**: Next.js + React + TypeScript
- **Features**:
  - Modern responsive web interface
  - Real-time scan progress via WebSocket
  - API client for backend communication
  - Static site generation for performance

### 3. Security Tools Container (`tools/`)
- **Purpose**: Container with all security scanning tools
- **Port**: 3001
- **Technology**: Alpine Linux + Node.js API
- **Features**:
  - 20+ security tools pre-installed
  - RESTful API for tool execution
  - Support for both single tool and multi-tool scans
  - Tool health monitoring and verification

### 4. Supporting Services
- **Database**: SQLite with Prisma ORM
- **Redis**: Job queuing and caching
- **Nginx**: Reverse proxy (optional)
- **Monitoring**: Prometheus + Grafana (optional)

## API Endpoints

### Core Endpoints
- `GET /api/v1/health` - Health check
- `GET /api/v1/docs` - API documentation
- `GET /api/v1/scans` - List scans with pagination
- `POST /api/v1/scans` - Create new scan
- `GET /api/v1/scans/{id}` - Get scan details
- `POST /api/v1/scans/{id}/cancel` - Cancel scan
- `GET /api/v1/websites` - Manage target websites
- `GET /api/v1/tools` - Available security tools
- `GET /api/v1/system/*` - System information

### WebSocket Events
- `scan-update` - Real-time scan progress
- `scan-progress` - Detailed progress updates
- `queue-update` - Queue statistics
- `system-update` - System status changes

## Security Features

### Authentication & Authorization
- API key authentication via `X-API-Key` header
- Rate limiting (100 requests/15min, 10 scans/hour)
- Request validation and sanitization

### Network Security
- Private network scanning restrictions
- Dangerous scan argument filtering
- CORS configuration
- Security headers with Helmet.js

### Input Validation
- Joi schema validation
- URL format validation
- Scan parameter sanitization

## Deployment Guide

### Prerequisites
- Docker & Docker Compose
- 8GB+ RAM recommended
- 20GB+ storage space

### Quick Start
```bash
# Clone and setup
git clone <repository>
cd RemoteVulscan

# Copy environment configuration
cp backend/.env.example backend/.env
# Edit backend/.env with your settings

# Start all services
docker-compose -f docker-compose-new.yml up -d

# Access the application
Frontend: http://localhost:3000
Backend API: http://localhost:8000
API Docs: http://localhost:8000/api/v1/docs
```

### Production Deployment
```bash
# Enable production profile with Nginx
docker-compose -f docker-compose-new.yml --profile production up -d

# Enable monitoring
docker-compose -f docker-compose-new.yml --profile monitoring up -d

# Enable centralized logging
docker-compose -f docker-compose-new.yml --profile logging up -d
```

## Development Guide

### Backend Development
```bash
cd backend
npm install
npm run dev  # Development server with hot reload
npm run build  # Production build
npm run lint  # Code linting
```

### Frontend Development
```bash
cd frontend  
npm install
npm run dev  # Development server
npm run build  # Production build
npm run lint  # Code linting
```

### Database Operations
```bash
cd backend
npx prisma generate  # Generate Prisma client
npx prisma db push   # Push schema changes
npx prisma studio    # Database GUI
```

## Adding New Security Tools

### 1. Update Tools Container
Edit `Dockerfile.tools`:
```dockerfile
# Add tool installation
RUN apk add --no-cache your-new-tool

# Update tool configuration in server.js
const TOOLS = {
  // ... existing tools
  newtool: {
    binary: 'newtool',
    defaultArgs: [],
    timeout: 300000,
    category: 'web'
  }
}
```

### 2. Update Backend Types
Edit `backend/src/services/scanOrchestrator.ts`:
```typescript
// Add tool to enum in Prisma schema
enum ScanType {
  // ... existing types
  NEW_TOOL
}

// Add tool mapping
const toolMap: Record<ScanType, string> = {
  // ... existing mappings
  NEW_TOOL: 'newtool'
}
```

### 3. Update Frontend
Add tool to frontend scan type options and UI components.

## Monitoring & Maintenance

### Health Checks
- Backend: `curl http://localhost:8000/api/v1/health`
- Frontend: `curl http://localhost:3000/api/health`
- Tools: `curl http://localhost:3001/health`

### Logs
```bash
# View service logs
docker-compose -f docker-compose-new.yml logs -f backend
docker-compose -f docker-compose-new.yml logs -f frontend
docker-compose -f docker-compose-new.yml logs -f tools

# Backend application logs
tail -f logs/combined.log
tail -f logs/error.log
```

### Database Backup
```bash
# SQLite backup
docker-compose -f docker-compose-new.yml exec db sqlite3 /data/db/custom.db ".backup /data/db/backup-$(date +%Y%m%d).db"
```

### Queue Management
```bash
# Check queue status
curl http://localhost:8000/api/v1/scans/queue

# Redis queue inspection
docker-compose -f docker-compose-new.yml exec redis redis-cli
> KEYS *
> LLEN bull:scan-queue:waiting
```

## Performance Tuning

### Backend Scaling
- Adjust `SCAN_CONCURRENCY` environment variable
- Scale Redis for better queue performance
- Use PostgreSQL for high-volume deployments

### Frontend Optimization
- Enable CDN for static assets
- Configure caching headers
- Implement service worker for offline capability

### Tools Container
- Allocate sufficient CPU and memory
- Monitor tool execution times
- Implement tool result caching

## Troubleshooting

### Common Issues

1. **Backend startup fails**
   - Check database connection
   - Verify Redis connectivity
   - Check port availability

2. **Tools API unreachable**
   - Verify tools container is running
   - Check network connectivity
   - Validate tool installation

3. **WebSocket connection fails**
   - Check CORS configuration
   - Verify WebSocket URL
   - Check firewall settings

4. **Scan queue stuck**
   - Restart Redis container
   - Clear queue: `docker-compose exec redis redis-cli FLUSHALL`
   - Check worker processes

### Debug Mode
```bash
# Enable debug logging
export LOG_LEVEL=debug
docker-compose -f docker-compose-new.yml up -d backend

# Check service health
docker-compose -f docker-compose-new.yml ps
```

## Migration from Monolithic Architecture

### Data Migration
1. Export existing scan data
2. Update database schema with Prisma migrations
3. Import data into new structure

### Configuration Migration
1. Split environment variables between backend/frontend
2. Update API endpoints in frontend
3. Configure new service URLs

### Testing Migration
1. Run integration tests
2. Verify all tools are accessible
3. Test scan functionality end-to-end

## License
MIT License - see LICENSE file for details

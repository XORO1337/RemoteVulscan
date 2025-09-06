# 🐳 Docker Setup Guide

This guide explains how to run RemoteVulscan using Docker containers with separate frontend and backend services.

## 📋 Prerequisites

- Docker 20.0+ installed
- Docker Compose 2.0+ installed
- 4GB+ RAM available
- 10GB+ storage space

## 🏗️ Container Architecture

```
┌─────────────────────┐    ┌─────────────────────────────────────┐
│   Frontend          │    │   Backend + Security Tools          │
│   Container         │◄──►│   Container                         │
│   (Next.js)         │    │   (Node.js + Integrated Tools)     │
│   Port 3000         │    │   Port 8000                         │
└─────────────────────┘    └─────────────────────────────────────┘
           │                                    │
           └────────── Docker Network ─────────┘
                    (app-network)
```

## 🚀 Quick Start

### 1. Clone and Setup
```bash
git clone <repository-url>
cd RemoteVulscan

# Copy environment template (optional)
cp .env.example .env
```

### 2. Deploy with Script
```bash
# Automated deployment
./scripts/deploy.sh

# Verify deployment
./scripts/test-setup.sh
```

### 3. Manual Deployment
```bash
# Build and start containers
docker-compose up -d --build

# Check container status
docker-compose ps

# View logs
docker-compose logs -f
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Backend Configuration
NODE_ENV=production
DATABASE_URL=file:./data/db/custom.db
TOOLS_PATH=/usr/local/bin
MAX_CONCURRENT_EXECUTIONS=5
PORT=8000

# CORS Configuration
FRONTEND_URL=http://frontend:3000
CORS_ORIGIN=http://localhost:3000,http://frontend:3000

# Frontend Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
NEXT_TELEMETRY_DISABLED=1
```

### Docker Compose Services

#### Backend Service
- **Container**: `remotevulscan-backend`
- **Port**: 8000
- **Features**: 
  - Integrated security tools (nmap, nuclei, nikto, etc.)
  - SQLite database
  - REST API
  - WebSocket support
- **Volumes**: 
  - `backend_data`: Persistent database storage
  - `backend_logs`: Application logs
  - `backend_reports`: Scan reports

#### Frontend Service
- **Container**: `remotevulscan-frontend`
- **Port**: 3000
- **Features**:
  - Next.js web application
  - Real-time UI updates
  - Responsive design
- **Dependencies**: Waits for backend health check

## 🛠️ Container Management

### Basic Commands
```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# Restart services
docker-compose restart

# View container status
docker-compose ps

# View logs
docker-compose logs -f
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Maintenance Commands
```bash
# Rebuild containers
docker-compose up -d --build --force-recreate

# Clean up old images
docker system prune -f

# Remove everything (including volumes)
docker-compose down -v --remove-orphans

# View resource usage
docker stats
```

## 🔍 Health Checks

### Container Health
```bash
# Check container health status
docker-compose ps

# Manual health checks
curl http://localhost:8000/api/v1/health  # Backend
curl http://localhost:3000/api/health     # Frontend
```

### Tool Verification
```bash
# Verify security tools in backend container
docker exec remotevulscan-backend verify-tools.sh

# Test tool execution
docker exec remotevulscan-backend nmap --version
```

## 🌐 Network Configuration

### Container Communication
- **Network**: `app-network` (bridge)
- **Subnet**: 172.20.0.0/16
- **Internal Communication**: 
  - Frontend → Backend: `http://backend:8000`
  - Backend → Frontend: `http://frontend:3000`

### External Access
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/api/v1/docs

## 💾 Data Persistence

### Volumes
- `backend_data`: Database and application data
- `backend_logs`: Application logs
- `backend_reports`: Scan reports and results

### Backup Data
```bash
# Backup database
docker exec remotevulscan-backend sqlite3 /app/data/db/custom.db ".backup /app/data/backup.db"

# Copy backup from container
docker cp remotevulscan-backend:/app/data/backup.db ./backup.db
```

## 🚨 Troubleshooting

### Common Issues

#### Containers Won't Start
```bash
# Check Docker daemon
docker info

# Check logs for errors
docker-compose logs

# Rebuild from scratch
docker-compose down -v
docker-compose up -d --build
```

#### API Communication Issues
```bash
# Test container networking
docker exec remotevulscan-frontend curl http://backend:8000/api/v1/health

# Check CORS configuration
docker exec remotevulscan-backend env | grep CORS
```

#### Tool Execution Problems
```bash
# Verify tools installation
docker exec remotevulscan-backend verify-tools.sh

# Check tool permissions
docker exec remotevulscan-backend ls -la /usr/local/bin/
```

#### Database Issues
```bash
# Check database file
docker exec remotevulscan-backend ls -la /app/data/db/

# Reset database
docker volume rm remotevulscan_backend_data
docker-compose up -d --force-recreate
```

### Debug Mode
```bash
# Run with debug output
docker-compose up --build

# Access container shell
docker exec -it remotevulscan-backend /bin/bash
docker exec -it remotevulscan-frontend /bin/bash
```

## 🔒 Security Considerations

### Container Security
- Non-root user execution
- Read-only filesystem where possible
- Minimal attack surface
- Regular security updates

### Network Security
- Isolated Docker network
- CORS protection
- Rate limiting
- Input validation

### Data Security
- Persistent volume encryption (optional)
- Secure tool execution
- Process isolation

## 📊 Monitoring

### Container Metrics
```bash
# Resource usage
docker stats

# Container processes
docker exec remotevulscan-backend ps aux
```

### Application Monitoring
```bash
# API health
curl http://localhost:8000/api/v1/health

# System metrics
curl http://localhost:8000/api/v1/system/metrics

# Tool statistics
curl http://localhost:8000/api/v1/tools
```

## 🚀 Production Deployment

### Optimization
```bash
# Use production environment
export NODE_ENV=production

# Optimize Docker images
docker-compose build --no-cache

# Enable log rotation
docker-compose up -d --log-opt max-size=10m --log-opt max-file=3
```

### Scaling
```bash
# Scale frontend (if needed)
docker-compose up -d --scale frontend=2

# Load balancer configuration (external)
# Configure nginx/traefik for load balancing
```

---

**For more information, see the main [README.md](README.md) documentation.**
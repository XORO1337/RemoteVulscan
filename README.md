# 🛡️ RemoteVulscan - Vulnerability Scanner

A comprehensive, self-contained vulnerability scanning platform with integrated security tools and real-time scanning capabilities.

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- 4GB+ RAM recommended
- 10GB+ storage space

### Installation
```bash
# Clone repository
git clone <repository-url>
cd RemoteVulscan

# Setup environment (optional - uses defaults if not configured)
cp .env.example .env
# Edit .env if you need custom configuration

# Deploy the application
./scripts/deploy.sh

# Or manually with Docker Compose
docker compose up -d --build

# Verify deployment
./scripts/test-setup.sh
```

### Access Points
```bash
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
# API Documentation: http://localhost:8000/api/v1/docs
# Health Check: http://localhost:8000/api/v1/health
```

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────────────────────────┐
│   Frontend      │    │   Backend + Security Tools          │
│   (Next.js)     │◄──►│   (Node.js + Integrated Tools)     │
│   Port 3000     │    │   Port 8000                         │
│                 │    │                                     │
│   - Web UI      │    │   - REST API                        │
│   - Scan Forms  │    │   - Tool Execution                  │
│   - Results     │    │   - SQLite Database                 │
│                 │    │   - 15+ Security Tools              │
└─────────────────┘    └─────────────────────────────────────┘
```

## 🛠️ Integrated Security Tools

### Network Scanning
- **Nmap** - Network discovery and port scanning
- **Masscan** - High-speed port scanner

### Web Application Testing
- **Nikto** - Web server vulnerability scanner
- **Nuclei** - Fast vulnerability scanner with templates
- **SQLMap** - SQL injection detection and exploitation
- **Gobuster** - Directory/file brute-forcing
- **Dirsearch** - Web path scanner
- **WhatWeb** - Web technology identification

### SSL/TLS Testing
- **TestSSL.sh** - SSL/TLS configuration analyzer
- **SSLScan** - SSL/TLS protocol scanner

### Discovery Tools
- **HTTPx** - HTTP toolkit and probe
- **Subfinder** - Subdomain discovery
- **Assetfinder** - Domain asset discovery
- **Gobuster** - Directory/file brute-forcing
- **Dirsearch** - Web path scanner

## 📊 Features

- ✅ **Self-contained Architecture** - All tools integrated in backend container
- ✅ **Real-time Scanning** - Live progress updates
- ✅ **Multiple Scan Types** - Network, web, SSL/TLS analysis
- ✅ **Vulnerability Database** - SQLite with persistent scan history
- ✅ **RESTful API** - Complete API for automation
- ✅ **Modern Web UI** - Responsive React interface
- ✅ **Docker Ready** - Single-command deployment
- ✅ **No External Dependencies** - Everything runs in isolated containers

## 🔧 Configuration

### Environment Variables
```env
# Database (auto-created if not exists)
DATABASE_URL="file:./data/db/custom.db"

# Server
PORT=8000
NODE_ENV=production

# Tools (pre-installed in container)
TOOLS_PATH=/usr/local/bin
MAX_CONCURRENT_EXECUTIONS=5

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## 📚 API Endpoints

### Core Endpoints
- `GET /api/v1/health` - Health check
- `GET /api/v1/scans` - List scans
- `POST /api/v1/scans` - Create scan
- `GET /api/v1/scans/{id}` - Get scan details
- `POST /api/v1/scans/{id}/cancel` - Cancel scan

### Tools Endpoints
- `GET /api/v1/tools` - Available tools
- `POST /api/v1/tools/execute` - Execute single tool directly
- `POST /api/v1/tools/execute-multiple` - Execute multiple tools

### System Endpoints
- `GET /api/v1/system/info` - System information
- `GET /api/v1/system/health` - System health

## 🧪 Testing

```bash
# Quick deployment test
./scripts/test-setup.sh

# Manual API testing
# Health check
curl http://localhost:8000/api/v1/health

# Get available tools
curl http://localhost:8000/api/v1/tools

# Execute a single tool
curl -X POST http://localhost:8000/api/v1/tools/execute \
  -H "Content-Type: application/json" \
  -d '{"tool":"nmap","target":"scanme.nmap.org","args":["-sn"]}'

# Create a vulnerability scan
curl -X POST http://localhost:8000/api/v1/scans \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com","scanType":"NUCLEI"}'

# Get scan results
curl http://localhost:8000/api/v1/scans
```

## 🔒 Security

- ✅ **Input Validation** - Joi schema validation for all requests
- ✅ **Rate Limiting** - API and scan rate limiting
- ✅ **Secure Execution** - Non-root container execution
- ✅ **Process Isolation** - Containerized tool execution
- ✅ **Network Security** - Private network scanning restrictions
- ✅ **Error Handling** - Comprehensive error handling and logging

## 📈 Monitoring

```bash
# View application logs
docker compose logs -f

# Check service status
docker compose ps

# View backend logs specifically
docker compose logs -f backend

# Monitor resources
docker stats
```

## 🛠️ Development

```bash
# Backend development (local)
cd backend
npm install
npx prisma generate
npm run dev

# Frontend development (local)
cd frontend
npm install
npm run dev

# Full development environment
docker compose -f docker-compose.yml up -d --build

# View API documentation
open http://localhost:8000/api/v1/docs
```

## 🚨 Troubleshooting

```bash
# Reset everything
docker compose down -v --remove-orphans
./scripts/deploy.sh

# Check tool availability
docker exec remotevulscan-backend verify-tools.sh

# Database issues
docker exec remotevulscan-backend sqlite3 /app/data/db/custom.db ".tables"

# View detailed logs
docker compose logs -f backend | grep ERROR
```

## 📦 Deployment Options

### Local Development
```bash
./scripts/deploy.sh
```

### Production Deployment
```bash
# Set production environment
export NODE_ENV=production

# Deploy with production settings
docker compose up -d --build

# Enable log rotation
docker compose logs --tail=1000 -f > /var/log/remotevulscan.log &
```

### Cloud Deployment
The application is containerized and can be deployed on:
- **Docker Swarm**
- **Kubernetes**
- **AWS ECS/Fargate**
- **Google Cloud Run**
- **Azure Container Instances**

## 📄 License

MIT License - see LICENSE file for details

---

**RemoteVulscan - Simplified, Secure, Self-contained Vulnerability Scanner**
# 🛡️ RemoteVulscan - Vulnerability Scanner

A comprehensive, self-contained vulnerability scanning platform with integrated security tools and real-time scanning capabilities.

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- 8GB+ RAM recommended
- 20GB+ storage space

### Installation
```bash
# Clone repository
git clone <repository-url>
cd RemoteVulscan

# Copy environment configuration
cp .env.example .env

# Start all services
docker compose up -d --build

# Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
```

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Database      │
│   (Next.js)     │◄──►│   (Node.js)     │◄──►│   (SQLite)      │
│   Port 3000     │    │   Port 8000     │    │                 │
│                 │    │                 │    │   - Scans       │
│   - Web UI      │    │   - REST API    │    │   - Websites    │
│   - Real-time   │    │   - Tool Exec   │    │   - Vulns       │
│     Updates     │    │   - WebSocket   │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
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

## 📊 Features

- ✅ **Self-contained Architecture** - All tools in one container
- ✅ **Real-time Scanning** - Live progress updates
- ✅ **Multiple Scan Types** - Network, web, SSL/TLS analysis
- ✅ **Vulnerability Database** - Persistent scan history
- ✅ **RESTful API** - Complete API for automation
- ✅ **Modern Web UI** - Responsive React interface
- ✅ **Docker Ready** - Easy deployment with Docker Compose

## 🔧 Configuration

### Environment Variables
```env
# Database
DATABASE_URL="file:./data/db/custom.db"

# Server
PORT=8000
NODE_ENV=production

# Tools
TOOLS_PATH=/usr/local/bin
MAX_CONCURRENT_EXECUTIONS=5

# Features
NEXT_PUBLIC_ENABLE_SOCKET=true
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
- `POST /api/v1/tools/execute` - Execute single tool
- `POST /api/v1/tools/execute-multiple` - Execute multiple tools

### System Endpoints
- `GET /api/v1/system/info` - System information
- `GET /api/v1/system/health` - System health

## 🧪 Testing

```bash
# Test tool execution
curl -X POST http://localhost:8000/api/v1/tools/execute \
  -H "Content-Type: application/json" \
  -d '{"tool":"nmap","target":"scanme.nmap.org","args":["-sn"]}'

# Health check
curl http://localhost:8000/api/v1/health

# System status
curl http://localhost:8000/api/v1/system/info
```

## 🔒 Security

- Input validation and sanitization
- Rate limiting on API endpoints
- Secure tool execution environment
- Non-root container execution
- Network isolation for scanning

## 📈 Monitoring

```bash
# View logs
docker compose logs -f

# Check container status
docker compose ps

# Monitor resources
docker stats
```

## 🛠️ Development

```bash
# Backend development
cd backend
npm install
npm run dev

# Frontend development
cd frontend
npm install
npm run dev
```

## 📄 License

MIT License - see LICENSE file for details

---

**Made with ❤️ by the RemoteVulscan Team**
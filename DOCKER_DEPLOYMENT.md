# 🐳 RemoteVulscan – Deployment Guide (Recreated)

Focused, task‑oriented instructions for running RemoteVulscan with Docker / Docker Compose in multiple modes (development, standard multi‑service, unified single image, and production with optional extras).

---
## 1. TL;DR Quick Start
```bash
git clone <repository-url> remotevulscan
cd remotevulscan
cp .env.example .env
docker compose up -d --build
```
App: http://localhost:3000  |  Health: /api/health

Enable realtime sockets:
```bash
echo NEXT_PUBLIC_ENABLE_SOCKET=true >> .env
docker compose up -d app
```

Switch to unified (single) Arch image (stop multi-service first):
```bash
docker compose down
docker compose --profile arch up -d arch --build
```

---
## 2. Deployment Matrix
| Mode | Command | When to Use | Pros | Trade‑offs |
|------|---------|------------|------|-----------|
| Multi-service (default) | `docker compose up -d` | Day‑to‑day & dev parity | Small app image, fast rebuilds | 2–3 containers (app, tools, db) |
| Unified Arch image | `docker compose --profile arch up -d arch` | Simple single-container demo / lab | One container to manage | Larger build time & image size |
| Production (Nginx) | `docker compose --profile production up -d` | TLS / reverse proxy / hardening base | Structured edge proxy | Extra container / config |
| + Redis | `--profile redis` | Caching / session state (future) | Extensible | More infra |
| + Logging (Fluentd) | `--profile logging` | Centralized log routing | Aggregation | Added complexity |

Combine profiles (example full stack):
```bash
docker compose --profile production --profile redis --profile logging up -d
```

---
## 3. Prerequisites
System: 64‑bit Linux (Arch recommended, any modern distro OK), ≥4GB RAM (8GB+ better), ≥10GB free disk.
Software: Docker Engine, Docker Compose plugin, Git, OpenSSL (for manual cert generation).

---
## 4. Directory Layout (at runtime)
```
data/db        # SQLite persistent files
logs           # App & (optionally) proxy / tool logs
reports        # Generated scan reports
tools          # Installed security tools (mounted RO into app)
ssl            # (Optional) TLS certs for nginx profile
```

---
## 5. Environment Variables
Core (required for production reliability):
| Var | Purpose | Typical Value | Notes |
|-----|---------|---------------|-------|
| DATABASE_URL | Prisma datasource (SQLite path) | `file:./data/db/custom.db` | Relative inside container; persisted via volume |
| TURNSTILE_SITE_KEY | Cloudflare Turnstile public key | obtained from CF | Required to accept scan submissions in hardened mode |
| TURNSTILE_SECRET_KEY | Cloudflare Turnstile secret | obtained from CF | Server verification |
| NEXT_PUBLIC_ENABLE_SOCKET | Enable realtime scan events | `true` / `false` | Public exposure; string "true" enables |
| TOOLS_PATH | Path tools mounted | `/tools` | App reads tools RO |

Optional / tuning:
| Var | Purpose | Default (implicit) | Comment |
|-----|---------|--------------------|---------|
| NODE_ENV | Runtime mode | `production` in Compose | Dev: `development` |
| MAX_CONCURRENT_SCANS | Throttle parallel scans | unset | Future extension hook |
| SCAN_TIMEOUT | Per-scan soft timeout (s) | unset | Add if you enforce limits |
| ENABLE_DEBUG_LOGGING | Verbose logging flag | unset/false | Avoid in prod |

Local Turnstile always‑pass test keys (DO NOT USE IN PROD):
```env
TURNSTILE_SITE_KEY=1x00000000000000000000AA
TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA
```

---
## 6. Services (docker-compose.yml)
| Service | Role | Depends | Health | Persisted Data |
|---------|------|---------|--------|----------------|
| app | Next.js API/UI + scan orchestration | db, tools | `/api/health` | data/, logs/, reports/ |
| tools | Security toolchain installer/runner | – | (none) | tools/ |
| db | Alpine + sqlite utilities | – | (process) | data/db |
| nginx (profile production) | TLS / reverse proxy | app | (nginx) | ssl/ (certs) |
| redis (profile redis) | Cache backbone | – | (redis) | volume redis_data |
| fluentd (profile logging) | Log aggregation | – | (fluentd) | logs/ mapping |
| arch (profile arch) | Single container (app+tools) | – | `/api/health` | data/, logs/, reports/ |

Unified `arch` container replaces `app + tools` pair. Do not run both simultaneously.

---
## 7. Initial Deployment (Multi‑Service)
```bash
cp .env.example .env
mkdir -p data/db logs reports tools
docker compose build --pull
docker compose up -d
docker compose ps
curl -fsS http://localhost:3000/api/health
```
Verify tools:
```bash
docker compose exec tools /tools/verify-tools.sh
```
Verify DB tables:
```bash
docker compose exec db sqlite3 /data/db/custom.db ".tables"
```

---
## 8. Unified Single Image Mode
```bash
docker compose down
docker compose --profile arch up -d --build arch
curl -fsS http://localhost:3000/api/health
docker compose --profile arch exec arch /tools/verify-tools.sh
```

---
## 9. Updating
Multi‑service incremental:
```bash
git pull
docker compose build app && docker compose up -d app
docker compose build tools && docker compose up -d tools
```
Unified Arch:
```bash
git pull
docker compose --profile arch build arch --no-cache
docker compose --profile arch up -d --force-recreate arch
```
Full clean rebuild (preserving volumes):
```bash
docker compose down
docker compose build --no-cache
docker compose up -d
```

---
## 10. Common Operational Commands
| Task | Command |
|------|---------|
| Logs (app live) | `docker compose logs -f app` |
| Tail tools | `docker compose logs -f tools` |
| Stats | `docker stats` |
| Enter tools shell | `docker compose exec tools bash` |
| Health check | `curl -fsS http://localhost:3000/api/health` |
| Restart app | `docker compose restart app` |
| Recreate only app | `docker compose up -d --force-recreate app` |

---
## 11. Database (SQLite) Operations
Backup:
```bash
STAMP=$(date +%Y%m%d_%H%M%S)
docker compose exec db sqlite3 /data/db/custom.db ".backup /data/db/backup-$STAMP.db"
```
List backups:
```bash
ls -1 data/db/backup-*.db 2>/dev/null || echo "No backups"
```
Restore (example):
```bash
FILE=data/db/backup-20250101_120000.db
docker compose exec db sh -c "cp $FILE /data/db/custom.db"
```
Maintenance:
```bash
docker compose exec db sqlite3 /data/db/custom.db "VACUUM; PRAGMA integrity_check;"
```

---
## 12. Security Tools Inventory
Network: Nmap, Masscan, Zmap
Web: Nikto, SQLMap, Commix, Corsy, Wfuzz, Dirb, Wapiti, Skipfish
Vuln: Nuclei, Vuls
TLS: testssl.sh, sslscan
Discovery / Recon: Amass, Subfinder, Httpx, Gobuster, FFUF

Usage examples:
```bash
docker compose exec tools nmap -Pn -F example.com
docker compose exec tools nuclei -update-templates
docker compose exec tools nuclei -u https://target --silent
```
Master verification:
```bash
docker compose exec tools /tools/verify-tools.sh
```

---
## 13. Production Hardening (Nginx Profile)
Enable:
```bash
docker compose --profile production up -d --build
```
TLS (self‑signed quick start):
```bash
mkdir -p ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ssl/key.pem -out ssl/cert.pem \
  -subj "/C=US/ST=State/L=City/O=RemoteVulscan/CN=localhost"
docker compose restart nginx
```
Let’s Encrypt (example – adapt for host firewall & DNS):
```bash
sudo certbot certonly --standalone -d your.domain
# Copy/volume certs into ssl/ then restart nginx
```
Firewall baseline (UFW example):
```bash
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https
sudo ufw enable
```

---
## 14. Scaling & Performance
Horizontal replicas (Swarm/K8s style) require externalizing SQLite (migrate to Postgres/MySQL). For single‑node: increase CPU/memory limits.
Compose resource hints (add under service):
```yaml
services:
  app:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
```
SQLite tuning (optional):
```bash
docker compose exec db sqlite3 /data/db/custom.db "PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL;"
```

---
## 15. Backups (Composite Script Example)
`scripts/backup.sh` (create it):
```bash
#!/usr/bin/env bash
set -euo pipefail
STAMP=$(date +%Y%m%d_%H%M%S)
DEST=backups/$STAMP
mkdir -p "$DEST"
docker compose exec db sqlite3 /data/db/custom.db ".backup /data/db/backup-$STAMP.db"
cp data/db/backup-$STAMP.db "$DEST/database.db"
cp -a .env docker-compose.yml "$DEST/" 2>/dev/null || true
cp -a reports "$DEST/" 2>/dev/null || true
echo "Backup at $DEST";
```
Restore snapshot:
```bash
cp backups/<STAMP>/database.db data/db/custom.db
docker compose restart app
```

---
## 16. Troubleshooting Cheat Sheet
| Symptom | Quick Check | Fix |
|---------|-------------|-----|
| 3000 in use | `lsof -i :3000` | Stop conflicting proc |
| Health failing | `docker compose logs app` | Rebuild app / check env |
| Tools missing | `logs tools` | Rebuild tools container |
| DB locked | App logs show SQLITE_BUSY | Retry / ensure single writer |
| Turnstile failing | Check env keys | Use valid (non-test) keys |

Reset environment (preserve DB):
```bash
docker compose down
docker compose up -d --build
```
Full wipe (DESTROYS data):
```bash
docker compose down -v --rmi local --remove-orphans
rm -rf data/db/*
```

---
## 17. Security Practices Summary
Container: pin base images, run non‑root (Arch / multi-service images already create app user), restrict writable volumes, keep tools updated.
Network: only expose ports 80/443 (production), internal bridge for others.
Data: periodic encrypted off‑host backups for `data/db`.
App: enable Turnstile, validate inputs, keep dependencies updated (`docker compose build --pull`).
Monitoring: watch logs & health endpoint; add external uptime check.

---
## 18. Extending / Customization Ideas
1. Swap SQLite -> Postgres (update `DATABASE_URL`, add a postgres service).
2. Centralized logging: enable `logging` profile, ship to ELK/Loki via Fluentd config.
3. Metrics: sidecar Prometheus exporter (custom profile).
4. Auth hardening: integrate upstream auth provider & secret management.

---
## 19. Support Flow
1. Run health check.
2. Inspect `docker compose ps` state.
3. Review `docker compose logs app` & `tools`.
4. Confirm `.env` vs documented variables.
5. Open issue with: commit hash, compose mode, logs excerpt, reproduction steps.

---
Document recreated for clarity and operational efficiency. Keep this file updated alongside any compose / Dockerfile changes.
# 🐳 RemoteVulscan – Updated Docker Deployment Overview (Concise)

This is a quick-reference section. The original comprehensive guide starts below.

## Quick Start
```bash
git clone <repository-url> remotevulscan
cd remotevulscan
cp .env.example .env
docker compose up -d --build
```
URL: http://localhost:3000   Health: /api/health

### Enable Realtime Sockets
```bash
echo NEXT_PUBLIC_ENABLE_SOCKET=true >> .env
docker compose up -d app
```

## Deployment Modes
| Mode | Command | Pros | Cons |
| ---- | ------- | ---- | ---- |
| Multi-service (default) | `docker compose up -d` | Smaller app image; fast rebuild | Two containers (app+tools) |
| Unified Arch image | `docker compose --profile arch up -d arch` | One container; simpler local ops | Large image; slower build |

Switch by bringing one stack down then starting the other; volumes persist.

## Key Environment Variables
| Var | Purpose | Default | Note |
| --- | ------- | ------- | ---- |
| DATABASE_URL | SQLite path | file:./data/db/custom.db | Persisted in `data/` |
| NEXT_PUBLIC_ENABLE_SOCKET | Live WebSocket updates | false | Set true for realtime |
| TURNSTILE_SITE_KEY | Turnstile site key | (empty) | Required for scans |
| TURNSTILE_SECRET_KEY | Turnstile secret | (empty) | Server verification |
| TOOLS_PATH | Tools directory | /tools | Mounted read-only in app |

Turnstile always-pass test keys (local ONLY):
```
TURNSTILE_SITE_KEY=1x00000000000000000000AA
TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA
```

## Verify Tools
Multi-service:
```bash
docker compose exec tools /tools/verify-tools.sh
```
Unified Arch:
```bash
docker compose --profile arch exec arch /tools/verify-tools.sh
```

## Update Workflow
```bash
git pull
docker compose build app && docker compose up -d app
docker compose build tools && docker compose up -d tools
```
Unified Arch:
```bash
docker compose --profile arch build arch --no-cache
docker compose --profile arch up -d --force-recreate arch
```

## SQLite Backup (Simple)
```bash
STAMP=$(date +%Y%m%d_%H%M%S)
docker compose exec db sqlite3 /data/db/custom.db ".backup /data/db/backup-$STAMP.db"
```

---

# 🐳 Vulnerability Scanner - Docker Deployment Guide

This guide provides comprehensive instructions for deploying the Vulnerability Scanner application using Docker and Docker Compose on Arch Linux.

## 📋 Prerequisites

### System Requirements
- **Operating System**: Arch Linux (recommended) or any Linux distribution
- **Architecture**: x86_64 (64-bit)
- **RAM**: Minimum 4GB, recommended 8GB+
- **Storage**: Minimum 10GB free space
- **Network**: Internet connection for downloading tools and dependencies

### Software Requirements
- Docker Engine
- Docker Compose
- Git (for cloning the repository)

## 🚀 Quick Start

### 1. Clone the Repository
\`\`\`bash
git clone <repository-url>
cd vulnerability-scanner
\`\`\`

### 2. Run the Deployment Script
\`\`\`bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
\`\`\`

### 3. Access the Application
- **Application URL**: http://localhost:3000
- **API Health Check**: http://localhost:3000/api/health

## 🔧 Manual Deployment

### Step 1: Set Up Docker
\`\`\`bash
# Run the Docker setup script
chmod +x scripts/setup-docker.sh
sudo ./scripts/setup-docker.sh

# Log out and log back in to apply group changes
# Or run: newgrp docker
\`\`\`

### Step 2: Configure Environment
\`\`\`bash
# Copy environment template
cp .env.example .env

# Edit the environment file (optional for basic setup)
nano .env
\`\`\`

### Step 3: Build and Deploy
\`\`\`bash
# Create necessary directories
mkdir -p data/db logs reports tools

# Set permissions
chmod -R 755 data logs reports tools

# Stop existing containers
docker-compose down --remove-orphans

# Build Docker images
docker-compose build tools
docker-compose build app

# Start services
docker-compose up -d

# Wait for services to start (about 30 seconds)
sleep 30

# Check status
docker-compose ps
\`\`\`

### Step 4: Verify Installation
\`\`\`bash
# Check application logs
docker-compose logs -f app

# Check tools installation
docker-compose exec tools /tools/verify-tools.sh

# Verify database
docker-compose exec db sqlite3 /data/db/custom.db ".tables"
\`\`\`

## 📁 Project Structure

\`\`\`
vulnerability-scanner/
├── Dockerfile                 # Main application Dockerfile
├── Dockerfile.tools           # Security tools Dockerfile
├── docker-compose.yml         # Main compose file
├── nginx.conf                # Nginx configuration
├── .env.example             # Environment template
├── .env.production         # Production environment
├── scripts/
│   ├── setup-docker.sh      # Docker setup script
│   ├── install-tools.sh     # Tools installation script
│   ├── deploy.sh            # Deployment script
│   └── init-db.sh          # Database initialization
├── data/                    # Persistent data
│   └── db/                 # Database files
├── logs/                    # Application logs
├── reports/                 # Generated reports
└── tools/                   # Security tools
\`\`\`

## 🛠️ Service Management

### Starting Services
\`\`\`bash
# Start all services
docker-compose up -d

# Start specific service
docker-compose up -d app
docker-compose up -d tools
docker-compose up -d db
\`\`\`

### Stopping Services
\`\`\`bash
# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v

# Stop and remove everything
docker-compose down -v --rmi all
\`\`\`

### Monitoring Services
\`\`\`bash
# View all containers
docker-compose ps

# View logs
docker-compose logs -f app
docker-compose logs -f tools
docker-compose logs -f db

# View resource usage
docker stats
\`\`\`

### Restarting Services
\`\`\`bash
# Restart all services
docker-compose restart

# Restart specific service
docker-compose restart app
docker-compose restart tools
\`\`\`

## 🔧 Configuration

### Environment Variables
Create a `.env` file based on `.env.example`:

\`\`\`bash
# Application Configuration
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1

# Database Configuration
DATABASE_URL="file:./data/db/custom.db"

# Server Configuration
PORT=3000
HOSTNAME=0.0.0.0

# Docker Configuration
DOCKERIZED=true

# Tools Configuration
TOOLS_PATH=/tools
\`\`\`

### Custom Docker Compose Profiles
The `docker-compose.yml` includes several optional profiles:

#### Production with Nginx
\`\`\`bash
docker-compose --profile production up -d
\`\`\`

#### With Redis for Caching
\`\`\`bash
docker-compose --profile redis up -d
\`\`\`

#### With Centralized Logging
\`\`\`bash
docker-compose --profile logging up -d
\`\`\`

#### All Features
\`\`\`bash
docker-compose --profile production --profile redis --profile logging up -d
\`\`\`

## 🛡️ Security Tools

### Available Tools
The following security tools are automatically installed:

#### Network Scanning
- **Nmap**: Network discovery and security auditing
- **Masscan**: Fast port scanner
- **Zmap**: Internet-wide scanning

#### Web Application Scanning
- **Nikto**: Web server scanner
- **SQLMap**: SQL injection detection
- **Commix**: Command injection detection
- **Corsy**: CORS misconfiguration detection
- **Wfuzz**: Web application fuzzer
- **Dirb**: Web content scanner

#### Vulnerability Scanning
- **Nuclei**: Fast vulnerability scanner
- **Vuls**: Linux vulnerability scanner
- **Wapiti**: Web application vulnerability scanner
- **Skipfish**: Web application security scanner

#### SSL/TLS Testing
- **TestSSL.sh**: SSL/TLS configuration analyzer
- **SSLScan**: SSL/TLS scanner

#### Information Gathering
- **Amass**: Network attack surface mapping
- **Subfinder**: Subdomain discovery
- **Httpx**: HTTP toolkit
- **Gobuster**: Directory/file brute forcing
- **FFUF**: Fast web fuzzer

### Accessing Tools
\`\`\`bash
# Access tools container
docker-compose exec tools bash

# Run specific tool
docker-compose exec tools nmap --help
docker-compose exec tools nikto -help
docker-compose exec tools nuclei -help

# Verify all tools
docker-compose exec tools /tools/verify-tools.sh
\`\`\`

## 📊 Monitoring and Logging

### Application Logs
\`\`\`bash
# View real-time logs
docker-compose logs -f app

# View specific service logs
docker-compose logs -f tools
docker-compose logs -f db

# View logs from specific time
docker-compose logs --since 1h app
\`\`\`

### Health Checks
\`\`\`bash
# Application health check
curl http://localhost:3000/api/health

# Container health status
docker-compose ps
\`\`\`

### Performance Monitoring
\`\`\`bash
# Monitor resource usage
docker stats

# Container inspection
docker inspect vuln-scanner-app
\`\`\`

## 🔄 Updates and Maintenance

### Updating the Application
\`\`\`bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose build --no-cache app
docker-compose up -d --force-recreate app
\`\`\`

### Updating Security Tools
\`\`\`bash
# Rebuild tools container
docker-compose build --no-cache tools
docker-compose up -d --force-recreate tools

# Update nuclei templates
docker-compose exec tools nuclei -update-templates
\`\`\`

### Database Maintenance
\`\`\`bash
# Backup database
docker-compose exec db sqlite3 /data/db/custom.db ".backup /data/db/backup-$(date +%Y%m%d_%H%M%S).db"

# Restore database
docker-compose exec db sh -c "sqlite3 /data/db/custom.db < /data/db/backup-file.db"

# Vacuum database
docker-compose exec db sqlite3 /data/db/custom.db "VACUUM;"
\`\`\`

### System Cleanup
\`\`\`bash
# Clean up unused Docker resources
docker system prune -f

# Clean up volumes (careful!)
docker volume prune -f

# Remove stopped containers
docker container prune -f

# Remove unused images
docker image prune -f
\`\`\`

## 🐛 Troubleshooting

### Common Issues

#### Docker Permission Issues
\`\`\`bash
# Add user to docker group
sudo usermod -aG docker $USER

# Apply group changes
newgrp docker

# Verify group membership
groups $USER
\`\`\`

#### Port Conflicts
\`\`\`bash
# Check if port is in use
netstat -tulpn | grep :3000

# Kill process using port
sudo kill -9 <pid>
\`\`\`

#### Container Won't Start
\`\`\`bash
# Check container logs
docker-compose logs app
docker-compose logs tools
docker-compose logs db

# Check container status
docker-compose ps

# Remove and recreate containers
docker-compose down -v
docker-compose up -d
\`\`\`

#### Database Issues
\`\`\`bash
# Check database file
ls -la data/db/

# Check database permissions
chmod 644 data/db/custom.db

# Reinitialize database
docker-compose exec db sh -c "rm -f /data/db/custom.db && /init-db.sh"
\`\`\`

#### Tools Installation Issues
\`\`\`bash
# Check tools container logs
docker-compose logs tools

# Rebuild tools container
docker-compose build --no-cache tools
docker-compose up -d --force-recreate tools

# Verify tools installation
docker-compose exec tools /tools/verify-tools.sh
\`\`\`

### Debug Mode
\`\`\`bash
# Run containers in foreground for debugging
docker-compose up app

# Run with shell access
docker-compose run --rm app bash
docker-compose run --rm tools bash

# Check environment variables
docker-compose exec app env
\`\`\`

## 🌐 Production Deployment

### SSL/TLS Configuration
1. **Generate SSL Certificates**:
   \`\`\`bash
   # Create SSL directory
   mkdir -p ssl
   
   # Generate self-signed certificate (for testing)
   openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
       -keyout ssl/key.pem \
       -out ssl/cert.pem \
       -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
   \`\`\`

2. **Use Let's Encrypt (for production)**:
   \`\`\`bash
   # Install certbot
   sudo pacman -S certbot
   
   # Generate certificate
   sudo certbot certonly --standalone -d your-domain.com
   \`\`\`

### Reverse Proxy Configuration
The provided `nginx.conf` includes:
- SSL/TLS termination
- Security headers
- Rate limiting
- WebSocket support
- Static file caching
- Gzip compression

### Firewall Configuration
\`\`\`bash
# Enable UFW firewall
sudo ufw enable

# Allow SSH, HTTP, HTTPS
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https

# Allow Docker ports if needed
sudo ufw allow 3000
\`\`\`

### System Hardening
\`\`\`bash
# Update system
sudo pacman -Syu

# Install security tools
sudo pacman -S fail2ban clamav rkhunter

# Enable services
sudo systemctl enable fail2ban
sudo systemctl enable clamav
sudo systemctl enable rkhunter
\`\`\`

## 📈 Scaling and Performance

### Horizontal Scaling
\`\`\`yaml
# Add to docker-compose.yml
services:
  app:
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
\`\`\`

### Database Optimization
\`\`\`bash
# Enable WAL mode for better performance
docker-compose exec db sqlite3 /data/db/custom.db "PRAGMA journal_mode=WAL;"

# Set cache size
docker-compose exec db sqlite3 /data/db/custom.db "PRAGMA cache_size=10000;"

# Enable foreign key constraints
docker-compose exec db sqlite3 /data/db/custom.db "PRAGMA foreign_keys=ON;"
\`\`\`

### Resource Limits
\`\`\`yaml
# Add to docker-compose.yml
services:
  app:
    mem_limit: 1g
    cpus: 1.0
  tools:
    mem_limit: 2g
    cpus: 2.0
\`\`\`

## 🔒 Security Considerations

### Container Security
- Run containers as non-root users
- Use specific image tags instead of 'latest'
- Regularly update base images
- Implement resource limits
- Use read-only filesystems where possible

### Network Security
- Use private networks for internal communication
- Implement proper firewall rules
- Use SSL/TLS for all external communication
- Implement rate limiting

### Data Security
- Encrypt sensitive data at rest
- Implement proper backup procedures
- Use environment variables for secrets
- Regular security audits

### Application Security
- Implement proper input validation
- Use HTTPS for all communication
- Implement proper authentication and authorization
- Regular security scanning

## 📝 Backup and Recovery

### Backup Strategy
\`\`\`bash
# Backup script
#!/bin/bash
BACKUP_DIR="./backups/$(date +%Y%m%d)"
mkdir -p "$BACKUP_DIR"

# Backup database
docker-compose exec db sqlite3 /data/db/custom_db ".backup $BACKUP_DIR/database.db"

# Backup configuration files
cp -r .env "$BACKUP_DIR/"
cp -r docker-compose.yml "$BACKUP_DIR/"

# Backup reports
cp -r reports/ "$BACKUP_DIR/"

# Backup logs
cp -r logs/ "$BACKUP_DIR/"

echo "Backup completed: $BACKUP_DIR"
\`\`\`

### Recovery Procedure
\`\`\`bash
# Stop services
docker-compose down

# Restore database
cp backups/20231201/database.db data/db/custom.db

# Restore configuration
cp backups/20231201/.env ./

# Restart services
docker-compose up -d
\`\`\`

## 🎯 Best Practices

### Development
- Use separate docker-compose files for development and production
- Implement proper volume mounting for development
- Use environment variables for configuration
- Implement proper logging

### Production
- Use specific image tags
- Implement health checks
- Use reverse proxy for SSL termination
- Implement proper monitoring and logging
- Use secrets management for sensitive data

### Maintenance
- Regular updates of base images
- Regular security scanning
- Regular backup procedures
- Monitor resource usage
- Implement proper log rotation

---

## 📞 Support

For issues and questions:
1. Check the troubleshooting section
2. Review container logs
3. Verify network connectivity
4. Check system resources
5. Consult the project documentation

For additional support, please create an issue in the project repository.

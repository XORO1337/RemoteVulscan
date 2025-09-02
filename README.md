# 🚀 RemoteVulscan – Complete Deployment Guide

A comprehensive, beginner-friendly guide to deploy RemoteVulscan vulnerability scanner with Docker. This guide covers everything from system setup to production deployment.

---

## 📋 Table of Contents
- [🎯 What You'll Get](#-what-youll-get)
- [🔧 Prerequisites](#-prerequisites)
- [🚀 Quick Start (Automated)](#-quick-start-automated)
- [📖 Manual Step-by-Step Deployment](#-manual-step-by-step-deployment)
- [🛠️ Built-in Scripts Usage](#️-built-in-scripts-usage)
- [🔄 Deployment Modes](#-deployment-modes)
- [🛡️ Security Tools Usage](#️-security-tools-usage)
- [💾 Database Management](#-database-management)
- [🚨 Troubleshooting](#-troubleshooting)
- [🌐 Production Deployment](#-production-deployment)
- [🧹 Maintenance & Updates](#-maintenance--updates)

---

## 🎯 What You'll Get

After following this guide, you'll have:
- ✅ Web interface at: **http://localhost:3000**
- ✅ REST API with health endpoint: **http://localhost:3000/api/health**
- ✅ Persistent SQLite database with scan history
- ✅ 20+ security tools (Nmap, Nuclei, Nikto, etc.)
- ✅ Real-time scan updates (optional WebSocket)
- ✅ Production-ready with SSL/TLS (optional)

---

## 🔧 Prerequisites

### System Requirements
| Component | Minimum | Recommended | Check Command |
|-----------|---------|-------------|---------------|
| **OS** | Linux/macOS/WSL2 | Ubuntu 20.04+ / Arch Linux | `uname -a` |
| **RAM** | 4GB | 8GB+ | `free -h` |
| **Disk** | 10GB free | 20GB+ | `df -h` |
| **CPU** | 2 cores | 4+ cores | `nproc` |

### Software Dependencies
| Tool | Version | Check Command | Install Guide |
|------|---------|---------------|---------------|
| **Docker** | 24.0+ | `docker --version` | [Install Docker](https://docs.docker.com/engine/install/) |
| **Docker Compose** | v2.0+ | `docker compose version` | Included with Docker Desktop |
| **Git** | Any recent | `git --version` | `sudo apt install git` or `sudo pacman -S git` |
| **Curl** | Any | `curl --version` | Usually pre-installed |

### Quick Dependency Check
```bash
# Run this to verify all dependencies
echo "=== System Check ==="
echo "OS: $(uname -s -r)"
echo "Docker: $(docker --version 2>/dev/null || echo 'NOT FOUND')"
echo "Compose: $(docker compose version 2>/dev/null || echo 'NOT FOUND')"
echo "Git: $(git --version 2>/dev/null || echo 'NOT FOUND')"
echo "Curl: $(curl --version 2>/dev/null | head -1 || echo 'NOT FOUND')"
```

---

## 🚀 Quick Start (Automated)

### Option 1: Fully Automated Setup
Use our deployment script for zero-configuration setup:

```bash
# Clone repository
git clone https://github.com/XORO1337/RemoteVulscan.git
cd RemoteVulscan

# Make scripts executable
chmod +x scripts/*.sh

# Run complete automated deployment
./scripts/deploy.sh
```

The script will:
1. ✅ Check system dependencies
2. ✅ Create required directories
3. ✅ Set up environment file
4. ✅ Build all Docker containers
5. ✅ Start all services
6. ✅ Verify deployment

**Expected output:**
```
🚀 Deploying Vulnerability Scanner with Docker Compose
========================================================
[INFO] Creating necessary directories...
[INFO] Setting up environment...
[INFO] Building Docker images...
[SUCCESS] Application deployed successfully!
[INFO] Access your application at: http://localhost:3000
[INFO] Health check: http://localhost:3000/api/health
```

### Option 2: Environment Setup Only
If you prefer manual control after environment setup:

```bash
git clone https://github.com/XORO1337/RemoteVulscan.git
cd RemoteVulscan
chmod +x scripts/*.sh
./scripts/setup-env.sh
```

---

## 📖 Manual Step-by-Step Deployment

### Step 1: Clone and Prepare
```bash
# Clone the repository
git clone https://github.com/XORO1337/RemoteVulscan.git
cd RemoteVulscan

# Make all scripts executable
chmod +x scripts/*.sh

# Verify project structure
ls -la
```

### Step 2: Configure Environment
```bash
# Copy environment template
cp .env.example .env

# Edit environment variables (optional)
nano .env  # or vim .env
```

**Key environment variables to review:**
```env
# Database (default is fine for local development)
DATABASE_URL="file:./db/custom.db"

# Turnstile CAPTCHA (get from Cloudflare)
TURNSTILE_SITE_KEY="your-site-key-here"
TURNSTILE_SECRET_KEY="your-secret-key-here"

# WebSocket real-time updates
NEXT_PUBLIC_ENABLE_SOCKET="true"

# Application environment
NODE_ENV="development"
```

**For local testing, use these test keys:**
```env
TURNSTILE_SITE_KEY=1x00000000000000000000AA
TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA
```

### Step 3: Create Data Directories
```bash
# Create persistent data directories
mkdir -p data/db logs reports tools ssl

# Set proper permissions
chmod -R 755 data logs reports tools
```

### Step 4: Build and Start Services
```bash
# Build all containers (this may take 10-15 minutes first time)
docker compose build --pull

# Start all services in background
docker compose up -d

# Check status
docker compose ps
```

### Step 5: Verify Deployment
```bash
# 1. Check container health
docker compose ps

# 2. Test API health endpoint
curl -f http://localhost:3000/api/health

# 3. View application logs
docker compose logs -f app

# 4. Verify database
ls -la data/db/

# 5. Test security tools
docker compose exec tools /tools/verify-tools.sh
```

**Expected healthy output:**
```bash
$ docker compose ps
NAME                  IMAGE               COMMAND             SERVICE   CREATED         STATUS                   PORTS
vuln-scanner-app      remotevulscan-app   "docker-entrypoint.s"   app       2 minutes ago   Up 2 minutes (healthy)   0.0.0.0:3000->3000/tcp
vuln-scanner-db       alpine:latest       "sh -c 'apk add --no"   db        2 minutes ago   Up 2 minutes
vuln-scanner-tools    remotevulscan-tools "/tools/entrypoint.sh"  tools     2 minutes ago   Up 2 minutes
```

---

## 🛠️ Built-in Scripts Usage

RemoteVulscan includes several utility scripts to automate common tasks:

### 📦 `setup-docker.sh` - Docker Installation (Linux)
**Purpose:** Installs Docker and Docker Compose on Arch Linux systems.

```bash
# Run as root/sudo for system-wide installation
sudo ./scripts/setup-docker.sh
```

**What it does:**
- Installs Docker Engine and Docker Compose
- Starts and enables Docker service
- Adds current user to docker group
- Configures Docker daemon for optimal performance
- Enables necessary kernel modules

**Example output:**
```
🐳 Setting up Docker Environment for Vulnerability Scanner
=========================================================
[INFO] Updating system...
[INFO] Installing Docker and Docker Compose...
[INFO] Starting and enabling Docker service...
[SUCCESS] Docker installation completed!
```

### 🔧 `setup-env.sh` - Environment Configuration
**Purpose:** Creates environment file and initializes database.

```bash
./scripts/setup-env.sh
```

**What it does:**
- Creates `.env` from `.env.example` if it doesn't exist
- Creates `db` directory
- Initializes Prisma database schema
- Generates database if missing

### 🚀 `deploy.sh` - Complete Deployment
**Purpose:** Full automated deployment of the entire stack.

```bash
./scripts/deploy.sh
```

**What it does:**
- Verifies Docker is running
- Creates necessary directories
- Sets up environment
- Builds Docker images
- Starts all services
- Runs health checks
- Provides access URLs

**Advanced options:**
```bash
# Deploy with specific profile
COMPOSE_PROFILES=production ./scripts/deploy.sh

# Deploy with custom environment
ENV_FILE=.env.production ./scripts/deploy.sh
```

### 🗄️ `test-database.sh` - Database Testing
**Purpose:** Tests database connectivity and schema.

```bash
./scripts/test-database.sh
```

**What it does:**
- Generates Prisma client
- Creates/resets database
- Tests database connection
- Verifies schema integrity

### 🔍 `validate-captcha.sh` - Turnstile Validation
**Purpose:** Tests Cloudflare Turnstile configuration.

```bash
./scripts/validate-captcha.sh
```

**Usage examples:**
```bash
# Test with environment variables
./scripts/validate-captcha.sh

# Test with specific token
TURNSTILE_TOKEN="your-test-token" ./scripts/validate-captcha.sh
```

### 🧹 `verify-cleanup.sh` - System Cleanup
**Purpose:** Cleans up Docker resources and temporary files.

```bash
./scripts/verify-cleanup.sh
```

**What it does:**
- Removes stopped containers
- Cleans up unused images
- Removes build cache
- Cleans temporary files

**Safety options:**
```bash
# Dry run (show what would be deleted)
DRY_RUN=1 ./scripts/verify-cleanup.sh

# Aggressive cleanup (including volumes)
AGGRESSIVE=1 ./scripts/verify-cleanup.sh
```

---

## 🔄 Deployment Modes

RemoteVulscan supports multiple deployment configurations:

### 1. Multi-Service Mode (Default)
**Best for:** Development, debugging, resource efficiency

```bash
# Start multi-service deployment
docker compose up -d

# Services: app, tools, db (3 containers)
docker compose ps
```

**Advantages:**
- ✅ Smaller app container size
- ✅ Faster rebuilds
- ✅ Independent service scaling
- ✅ Better resource isolation

### 2. Unified Single Container Mode
**Best for:** Simple deployments, demos, resource-constrained environments

```bash
# Stop multi-service mode first
docker compose down

# Start unified mode
docker compose --profile arch up -d arch

# Single container with app + tools
docker compose ps
```

**Advantages:**
- ✅ Single container to manage
- ✅ Simplified networking
- ✅ Easier troubleshooting
- ✅ Lower memory overhead

### 3. Production Mode with Nginx
**Best for:** Production deployments, SSL/TLS, reverse proxy

```bash
# Deploy with Nginx reverse proxy
docker compose --profile production up -d

# Services: app, tools, db, nginx
docker compose ps
```

**Features:**
- ✅ SSL/TLS termination
- ✅ Security headers
- ✅ Rate limiting
- ✅ Static file caching
- ✅ WebSocket support

### 4. Full Stack Mode
**Best for:** Complete feature testing, monitoring

```bash
# Deploy with all optional services
docker compose --profile production --profile redis --profile logging up -d

# Services: app, tools, db, nginx, redis, fluentd
docker compose ps
```

**Additional features:**
- ✅ Redis caching
- ✅ Centralized logging
- ✅ Session management
- ✅ Performance monitoring

### Switching Between Modes
```bash
# From multi-service to unified
docker compose down
docker compose --profile arch up -d arch

# From unified back to multi-service
docker compose down
docker compose up -d

# Data persistence is maintained across switches
ls -la data/
```

---

## 🛡️ Security Tools Usage

RemoteVulscan includes 20+ security tools pre-installed and configured:

### Tool Categories

#### 🌐 Network Scanning
- **Nmap** - Network discovery and port scanning
- **Masscan** - High-speed port scanner
- **Zmap** - Internet-wide scanning

#### 🔍 Web Application Testing
- **Nikto** - Web server vulnerability scanner
- **SQLMap** - SQL injection detection and exploitation
- **Commix** - Command injection testing
- **Wfuzz** - Web application fuzzer
- **Dirb** - Web content scanner

#### 🔒 Vulnerability Assessment
- **Nuclei** - Fast vulnerability scanner with templates
- **Wapiti** - Web application vulnerability scanner
- **Skipfish** - Web application security reconnaissance

#### 🔐 SSL/TLS Testing
- **testssl.sh** - SSL/TLS configuration analyzer
- **sslscan** - SSL/TLS protocol and cipher scanner

#### 📊 Information Gathering
- **Amass** - Network attack surface mapping
- **Subfinder** - Subdomain discovery
- **Httpx** - HTTP toolkit and probe
- **Gobuster** - Directory and file brute-forcing
- **FFUF** - Fast web fuzzer

### Accessing Tools

#### Method 1: Interactive Shell
```bash
# Enter tools container
docker compose exec tools bash

# Now you're inside the container with all tools available
root@tools:/# nmap --version
root@tools:/# nuclei -version
root@tools:/# nikto -Version
```

#### Method 2: Direct Command Execution
```bash
# Run tools directly from host
docker compose exec tools nmap -Pn -F scanme.nmap.org
docker compose exec tools nuclei -u https://example.com -silent
docker compose exec tools nikto -h https://example.com
```

### Tool Usage Examples

#### Network Reconnaissance
```bash
# Basic port scan
docker compose exec tools nmap -Pn -F target.com

# Service version detection
docker compose exec tools nmap -sV -p 80,443 target.com

# Fast TCP port scan with Masscan
docker compose exec tools masscan -p1-65535 target.com --rate=1000
```

#### Web Application Testing
```bash
# Nuclei vulnerability scan
docker compose exec tools nuclei -u https://target.com -tags cve,oast

# Update Nuclei templates
docker compose exec tools nuclei -update-templates

# Nikto web server scan
docker compose exec tools nikto -h https://target.com -ssl

# Directory brute force
docker compose exec tools gobuster dir -u https://target.com -w /usr/share/wordlists/dirb/common.txt
```

#### SSL/TLS Assessment
```bash
# Comprehensive SSL test
docker compose exec tools testssl.sh https://target.com

# Quick SSL scan
docker compose exec tools sslscan target.com:443
```

#### Subdomain Discovery
```bash
# Find subdomains
docker compose exec tools subfinder -d target.com

# HTTP probe discovered subdomains
docker compose exec tools subfinder -d target.com | docker compose exec tools httpx
```

### Tool Verification and Updates
```bash
# Verify all tools are working
docker compose exec tools /tools/verify-tools.sh

# Update tool databases
docker compose exec tools nuclei -update-templates
docker compose exec tools nmap --script-updatedb

# Check tool versions
docker compose exec tools /tools/list-versions.sh
```

### Custom Tool Scripts
Create custom scanning workflows:

```bash
# Example: Complete web assessment script
cat > custom-scan.sh << 'EOF'
#!/bin/bash
TARGET=$1

echo "Starting comprehensive scan of $TARGET"

# Subdomain discovery
echo "1. Discovering subdomains..."
subfinder -d $TARGET -o subdomains.txt

# HTTP probing
echo "2. Probing HTTP services..."
cat subdomains.txt | httpx -o http-services.txt

# Vulnerability scanning
echo "3. Running vulnerability scans..."
nuclei -l http-services.txt -tags cve -o vulnerabilities.txt

# Port scanning
echo "4. Port scanning..."
nmap -iL subdomains.txt -oN nmap-results.txt

echo "Scan complete! Check output files."
EOF

# Copy script to tools container
docker cp custom-scan.sh vuln-scanner-tools:/tools/
docker compose exec tools chmod +x /tools/custom-scan.sh

# Run custom scan
docker compose exec tools /tools/custom-scan.sh example.com
```

---

## 💾 Database Management

RemoteVulscan uses SQLite for simplicity and Prisma as the ORM.

### Database Operations

#### Backup Database
```bash
# Create timestamped backup
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
docker compose exec db sqlite3 /data/db/custom.db ".backup /data/db/backup-$TIMESTAMP.db"

# List backups
ls -la data/db/backup-*.db

# Automated backup script
cat > backup-db.sh << 'EOF'
#!/bin/bash
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="backups/$TIMESTAMP"

mkdir -p "$BACKUP_DIR"

# Database backup
docker compose exec db sqlite3 /data/db/custom.db ".backup /data/db/backup-$TIMESTAMP.db"
cp data/db/backup-$TIMESTAMP.db "$BACKUP_DIR/database.db"

# Configuration backup
cp .env "$BACKUP_DIR/"
cp docker-compose.yml "$BACKUP_DIR/"

# Reports backup
cp -r reports "$BACKUP_DIR/" 2>/dev/null || true

echo "Backup completed: $BACKUP_DIR"
EOF

chmod +x backup-db.sh
./backup-db.sh
```

#### Restore Database
```bash
# List available backups
ls -la data/db/backup-*.db

# Restore from backup
BACKUP_FILE="data/db/backup-20250101_120000.db"
cp "$BACKUP_FILE" data/db/custom.db

# Restart application
docker compose restart app
```

#### Database Maintenance
```bash
# Database integrity check
docker compose exec db sqlite3 /data/db/custom.db "PRAGMA integrity_check;"

# Vacuum database (reclaim space)
docker compose exec db sqlite3 /data/db/custom.db "VACUUM;"

# Analyze database statistics
docker compose exec db sqlite3 /data/db/custom.db "ANALYZE;"

# Check database size
docker compose exec db sqlite3 /data/db/custom.db "SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size();"
```

#### Schema Management
```bash
# Generate Prisma client
docker compose exec app npx prisma generate

# Apply schema changes
docker compose exec app npx prisma db push

# Reset database (DESTRUCTIVE)
docker compose exec app npx prisma db push --force-reset

# View database schema
docker compose exec db sqlite3 /data/db/custom.db ".schema"
```

#### Database Queries
```bash
# Connect to database
docker compose exec db sqlite3 /data/db/custom.db

# Useful queries
sqlite> .tables
sqlite> SELECT COUNT(*) FROM Website;
sqlite> SELECT * FROM Scan ORDER BY createdAt DESC LIMIT 10;
sqlite> .quit
```

---

## 🚨 Troubleshooting

### Common Issues and Solutions

#### 1. Port 3000 Already in Use
**Symptom:** `Error: bind: address already in use`

**Solution:**
```bash
# Find process using port 3000
lsof -i :3000
# or
netstat -tulpn | grep :3000

# Kill the process
sudo kill -9 <PID>

# Alternative: Use different port
echo "PORT=3001" >> .env
docker compose up -d app
```

#### 2. Docker Permission Denied
**Symptom:** `permission denied while trying to connect to Docker daemon`

**Solution:**
```bash
# Add user to docker group
sudo usermod -aG docker $USER

# Apply group changes
newgrp docker
# or logout and login again

# Verify
groups $USER
```

#### 3. Container Health Check Failing
**Symptom:** Container shows as `unhealthy`

**Solution:**
```bash
# Check container logs
docker compose logs app

# Check health endpoint manually
docker compose exec app curl -f http://localhost:3000/api/health

# Restart unhealthy container
docker compose restart app

# Rebuild if needed
docker compose build app --no-cache
docker compose up -d app
```

#### 4. Database Connection Issues
**Symptom:** `Error: Unable to open database file`

**Solution:**
```bash
# Check database file permissions
ls -la data/db/

# Fix permissions
chmod 644 data/db/custom.db
chown $USER:$USER data/db/custom.db

# Recreate database
rm data/db/custom.db
./scripts/test-database.sh
```

#### 5. Tools Container Issues
**Symptom:** Tools not found or not working

**Solution:**
```bash
# Check tools container logs
docker compose logs tools

# Rebuild tools container
docker compose build tools --no-cache
docker compose up -d tools

# Verify tools installation
docker compose exec tools /tools/verify-tools.sh

# Update tools
docker compose exec tools nuclei -update-templates
```

#### 6. Environment Variables Not Loading
**Symptom:** Application not recognizing environment changes

**Solution:**
```bash
# Verify .env file
cat .env

# Restart application to reload environment
docker compose restart app

# Or restart all services
docker compose down
docker compose up -d
```

### Debug Mode

#### Enable Verbose Logging
```bash
# Set debug environment
echo "ENABLE_DEBUG_LOGGING=true" >> .env
docker compose restart app

# View detailed logs
docker compose logs -f app
```

#### Interactive Container Access
```bash
# Access app container
docker compose exec app sh

# Access tools container
docker compose exec tools bash

# Access database container
docker compose exec db sh

# Run commands inside containers
docker compose exec app env | grep NODE_ENV
docker compose exec tools which nmap
```

#### System Resource Monitoring
```bash
# Monitor container resources
docker stats

# Check disk usage
df -h
docker system df

# Check memory usage
free -h

# Check container health
docker compose ps
```

### Advanced Debugging

#### Container Network Issues
```bash
# Check container networking
docker network ls
docker network inspect remotevulscan_vuln-scanner-network

# Test internal connectivity
docker compose exec app ping tools
docker compose exec app ping db
```

#### Volume Mount Issues
```bash
# Check volume mounts
docker compose exec app ls -la /app/data
docker compose exec tools ls -la /tools

# Verify host directories
ls -la data/ logs/ reports/ tools/
```

#### Port Conflicts Resolution
```bash
# Check all listening ports
netstat -tulpn | grep LISTEN

# Use custom ports
cat >> .env << EOF
APP_PORT=3001
NGINX_HTTP_PORT=8080
NGINX_HTTPS_PORT=8443
EOF

# Update docker-compose.yml ports accordingly
```

---

## 🌐 Production Deployment

### Production Environment Setup

#### 1. Server Preparation
```bash
# Update system
sudo apt update && sudo apt upgrade -y
# or for Arch Linux
sudo pacman -Syu

# Install required packages
sudo apt install -y curl wget git ufw fail2ban
# or for Arch Linux
sudo pacman -S curl wget git ufw fail2ban

# Create application user
sudo useradd -m -s /bin/bash remotevulscan
sudo usermod -aG docker remotevulscan
```

#### 2. Security Hardening
```bash
# Configure firewall
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https
sudo ufw enable

# Configure fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Set up automatic updates (Ubuntu)
sudo apt install unattended-upgrades
sudo dpkg-reconfigure unattended-upgrades
```

#### 3. SSL/TLS Certificates

##### Option A: Let's Encrypt (Recommended)
```bash
# Install certbot
sudo apt install certbot
# or
sudo pacman -S certbot

# Obtain certificate
sudo certbot certonly --standalone -d your-domain.com

# Copy certificates
sudo mkdir -p /opt/remotevulscan/ssl
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem /opt/remotevulscan/ssl/
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem /opt/remotevulscan/ssl/
sudo chown -R remotevulscan:remotevulscan /opt/remotevulscan/ssl
```

##### Option B: Self-Signed (Development)
```bash
# Create SSL directory
mkdir -p ssl

# Generate self-signed certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ssl/privkey.pem \
  -out ssl/fullchain.pem \
  -subj "/C=US/ST=State/L=City/O=RemoteVulscan/CN=your-domain.com"
```

#### 4. Production Environment File
```bash
# Create production environment
cat > .env.production << EOF
# Application
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1

# Database
DATABASE_URL="file:./data/db/custom.db"

# Turnstile (REQUIRED for production)
TURNSTILE_SITE_KEY="your-real-site-key"
TURNSTILE_SECRET_KEY="your-real-secret-key"

# Features
NEXT_PUBLIC_ENABLE_SOCKET="true"

# Security
DOCKERIZED=true
TOOLS_PATH=/tools

# Performance
MAX_CONCURRENT_SCANS=3
SCAN_TIMEOUT=300
EOF
```

#### 5. Production Deployment
```bash
# Deploy with production profile
COMPOSE_FILE=docker-compose.yml docker compose --profile production up -d --build

# Or use environment file
ENV_FILE=.env.production docker compose --profile production up -d --build

# Verify deployment
docker compose --profile production ps
curl -f https://your-domain.com/api/health
```

### Production Monitoring

#### Health Monitoring
```bash
# Create health check script
cat > health-check.sh << 'EOF'
#!/bin/bash

URL="https://your-domain.com/api/health"
SLACK_WEBHOOK="your-slack-webhook-url"

if ! curl -f "$URL" > /dev/null 2>&1; then
    curl -X POST -H 'Content-type: application/json' \
        --data '{"text":"🚨 RemoteVulscan health check failed"}' \
        "$SLACK_WEBHOOK"
fi
EOF

chmod +x health-check.sh

# Add to crontab (check every 5 minutes)
echo "*/5 * * * * /path/to/health-check.sh" | crontab -
```

#### Log Management
```bash
# Set up log rotation
sudo tee /etc/logrotate.d/remotevulscan << EOF
/opt/remotevulscan/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 644 remotevulscan remotevulscan
    postrotate
        docker compose restart app
    endscript
}
EOF
```

#### Resource Monitoring
```bash
# Monitor container resources
cat > monitor.sh << 'EOF'
#!/bin/bash

echo "=== Container Status ==="
docker compose ps

echo "=== Resource Usage ==="
docker stats --no-stream

echo "=== Disk Usage ==="
df -h

echo "=== Memory Usage ==="
free -h

echo "=== Database Size ==="
ls -lh data/db/custom.db
EOF

chmod +x monitor.sh
./monitor.sh
```

### Backup Strategy

#### Automated Backup Script
```bash
cat > production-backup.sh << 'EOF'
#!/bin/bash

BACKUP_ROOT="/backup/remotevulscan"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="$BACKUP_ROOT/$DATE"

mkdir -p "$BACKUP_DIR"

# Database backup
docker compose exec db sqlite3 /data/db/custom.db ".backup /data/db/backup-$DATE.db"
cp data/db/backup-$DATE.db "$BACKUP_DIR/database.db"

# Configuration backup
cp .env "$BACKUP_DIR/"
cp docker-compose.yml "$BACKUP_DIR/"
cp -r ssl "$BACKUP_DIR/" 2>/dev/null || true

# Application data
tar -czf "$BACKUP_DIR/reports.tar.gz" reports/ 2>/dev/null || true
tar -czf "$BACKUP_DIR/logs.tar.gz" logs/ 2>/dev/null || true

# Cleanup old backups (keep 30 days)
find "$BACKUP_ROOT" -type d -mtime +30 -exec rm -rf {} \; 2>/dev/null || true

# Upload to cloud storage (optional)
# aws s3 sync "$BACKUP_DIR" s3://your-backup-bucket/remotevulscan/$DATE/

echo "Backup completed: $BACKUP_DIR"
EOF

chmod +x production-backup.sh

# Schedule daily backups
echo "0 2 * * * /opt/remotevulscan/production-backup.sh" | sudo crontab -u remotevulscan -
```

---

## 🧹 Maintenance & Updates

### Regular Maintenance Tasks

#### Weekly Tasks
```bash
# Update application
git pull
docker compose build app --pull
docker compose up -d app

# Update security tools
docker compose build tools --pull
docker compose up -d tools

# Update Nuclei templates
docker compose exec tools nuclei -update-templates

# Clean up Docker resources
docker system prune -f
```

#### Monthly Tasks
```bash
# Full system update
sudo apt update && sudo apt upgrade -y
# or
sudo pacman -Syu

# Renew SSL certificates (if using Let's Encrypt)
sudo certbot renew

# Database maintenance
docker compose exec db sqlite3 /data/db/custom.db "VACUUM; ANALYZE;"

# Review logs for errors
docker compose logs --since 30d app | grep ERROR

# Security audit
docker compose exec tools nuclei -u https://your-domain.com -tags cve
```

### Update Procedures

#### Application Updates
```bash
# 1. Backup current state
./backup-db.sh

# 2. Pull latest changes
git pull

# 3. Check for breaking changes
git log --oneline HEAD~10..HEAD
cat CHANGELOG.md  # if exists

# 4. Update dependencies
docker compose build --pull

# 5. Deploy with rollback capability
docker compose up -d

# 6. Verify deployment
curl -f http://localhost:3000/api/health
./scripts/test-database.sh

# 7. Rollback if needed
# git checkout <previous-commit>
# docker compose up -d --build
```

#### Security Updates
```bash
# Update base images
docker compose build --pull --no-cache

# Update tool databases
docker compose exec tools nuclei -update-templates
docker compose exec tools nmap --script-updatedb

# Scan own application
docker compose exec tools nuclei -u http://localhost:3000 -tags cve
```

### Performance Optimization

#### Database Optimization
```bash
# Enable WAL mode for better performance
docker compose exec db sqlite3 /data/db/custom.db "PRAGMA journal_mode=WAL;"

# Optimize cache size
docker compose exec db sqlite3 /data/db/custom.db "PRAGMA cache_size=10000;"

# Enable foreign keys
docker compose exec db sqlite3 /data/db/custom.db "PRAGMA foreign_keys=ON;"
```

#### Container Resource Limits
```yaml
# Add to docker-compose.yml
services:
  app:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
        reservations:
          cpus: '1.0'
          memory: 1G
  tools:
    deploy:
      resources:
        limits:
          cpus: '4.0'
          memory: 4G
        reservations:
          cpus: '2.0'
          memory: 2G
```

### Migration to Production Database

#### PostgreSQL Migration
```bash
# 1. Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# 2. Create database and user
sudo -u postgres psql << EOF
CREATE DATABASE remotevulscan;
CREATE USER remotevulscan WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE remotevulscan TO remotevulscan;
EOF

# 3. Update environment
echo 'DATABASE_URL="postgresql://remotevulscan:secure_password@localhost:5432/remotevulscan"' >> .env

# 4. Add PostgreSQL to docker-compose.yml
cat >> docker-compose.yml << EOF
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: remotevulscan
      POSTGRES_USER: remotevulscan
      POSTGRES_PASSWORD: secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - vuln-scanner-network

volumes:
  postgres_data:
EOF

# 5. Migrate data
docker compose exec app npx prisma db push
```

---

## 📚 Additional Resources

### Documentation
- [Docker Deployment Guide](DOCKER_DEPLOYMENT.md) - Detailed Docker deployment instructions
- [Quick Start Guide](QUICK_START.md) - Fast setup for development

### Security Best Practices
- Keep all components updated
- Use strong passwords and keys
- Enable HTTPS in production
- Regular security scans
- Monitor application logs
- Implement proper backup strategy

### Community Support
- GitHub Issues: Report bugs and feature requests
- GitHub Discussions: Community support and questions
- Security Issues: Report via email for sensitive security matters

### Development
```bash
# Development mode (non-Docker)
npm install
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

---

## 🎉 Conclusion

You now have a complete, production-ready RemoteVulscan deployment! The application provides:

- ✅ **Web interface** for vulnerability scanning
- ✅ **20+ security tools** pre-configured and ready to use
- ✅ **RESTful API** for automation and integration
- ✅ **Real-time updates** via WebSockets
- ✅ **Persistent storage** with automatic backups
- ✅ **Production hardening** with SSL/TLS and security headers

**Next Steps:**
1. 🔧 Configure Turnstile CAPTCHA for production use
2. 🛡️ Set up monitoring and alerting
3. 📊 Explore the security tools and create custom workflows
4. 🚀 Scale as needed with additional containers or external databases

**Need Help?**
- Check the troubleshooting section above
- Review application logs: `docker compose logs -f app`
- Open an issue on GitHub with detailed steps and logs

Happy scanning! 🛡️🚀

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

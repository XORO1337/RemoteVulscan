# 🪟 RemoteVulscan – Windows Deployment Guide

Complete step-by-step deployment guide for Windows users to run RemoteVulscan using Docker Desktop, WSL2, or native Windows containers.

---

## 📋 Table of Contents
- [🎯 What You'll Get](#-what-youll-get)
- [🔧 Prerequisites & System Requirements](#-prerequisites--system-requirements)
- [🚀 Quick Start Options](#-quick-start-options)
- [📖 Method 1: Docker Desktop (Recommended)](#-method-1-docker-desktop-recommended)
- [🐧 Method 2: WSL2 + Docker](#-method-2-wsl2--docker)
- [⚡ Method 3: Windows Native Containers](#-method-3-windows-native-containers)
- [🛠️ Scripts Usage on Windows](#️-scripts-usage-on-windows)
- [🔄 PowerShell Alternative Commands](#-powershell-alternative-commands)
- [🚨 Windows-Specific Troubleshooting](#-windows-specific-troubleshooting)
- [🌐 Production Deployment on Windows Server](#-production-deployment-on-windows-server)
- [🧹 Maintenance & Updates](#-maintenance--updates)

---

## 🎯 What You'll Get

After following this guide, you'll have RemoteVulscan running on Windows with:
- ✅ Web interface at: **http://localhost:3000**
- ✅ REST API with health endpoint: **http://localhost:3000/api/health**
- ✅ Persistent SQLite database with scan history
- ✅ 20+ security tools (Nmap, Nuclei, Nikto, etc.)
- ✅ Real-time scan updates via WebSocket
- ✅ Full Windows integration with proper volume mounts

---

## 🔧 Prerequisites & System Requirements

### System Requirements
| Component | Minimum | Recommended | Notes |
|-----------|---------|-------------|-------|
| **Windows Version** | Windows 10 Pro/Enterprise/Education 2004+ | Windows 11 Pro | Home editions need WSL2 method |
| **RAM** | 8GB | 16GB+ | Docker Desktop needs significant memory |
| **Disk Space** | 20GB free | 50GB+ | Docker images and tools require space |
| **CPU** | 4 cores | 8+ cores | Hyper-V and containers are CPU intensive |
| **Hyper-V** | Enabled | Enabled | Required for Docker Desktop |

### Feature Requirements
```powershell
# Check Windows version
Get-ComputerInfo | Select WindowsProductName, WindowsVersion

# Check if Hyper-V is available
Get-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V-All

# Check if WSL2 is available
wsl --status
```

---

## 🚀 Quick Start Options

Choose the best method for your Windows setup:

| Method | Best For | Complexity | Performance |
|--------|----------|------------|-------------|
| **Docker Desktop** | Windows Pro/Enterprise users | ⭐⭐ Easy | ⭐⭐⭐ Excellent |
| **WSL2 + Docker** | Windows Home users, developers | ⭐⭐⭐ Moderate | ⭐⭐⭐⭐ Superior |
| **Windows Containers** | Windows Server environments | ⭐⭐⭐⭐ Complex | ⭐⭐ Good |

**Recommended:** Start with Docker Desktop for simplicity.

---

## 📖 Method 1: Docker Desktop (Recommended)

### Step 1: Install Docker Desktop

#### Download and Install
1. **Download Docker Desktop**
   - Visit: https://www.docker.com/products/docker-desktop/
   - Download "Docker Desktop for Windows"
   - File size: ~500MB

2. **Run Installation**
   ```cmd
   # Run as Administrator
   Docker Desktop Installer.exe
   ```

3. **Installation Options**
   - ✅ **Enable Hyper-V Windows Features** (if prompted)
   - ✅ **Add shortcut to desktop**
   - ✅ **Use WSL 2 instead of Hyper-V** (recommended)

4. **Restart Windows** when prompted

#### Configure Docker Desktop
1. **Start Docker Desktop** from Start Menu
2. **Sign in or skip** Docker Hub account creation
3. **Configure Resources** (Settings → Resources):
   ```
   Memory: 6GB (minimum) - 8GB+ (recommended)
   CPUs: 4 (minimum) - 6+ (recommended)
   Disk: 64GB (recommended)
   Swap: 1GB
   ```

4. **Enable WSL2 Integration** (Settings → Resources → WSL Integration):
   - ✅ Enable integration with my default WSL distro
   - ✅ Enable integration with additional distros

### Step 2: Verify Docker Installation
```powershell
# Open PowerShell as Administrator
docker --version
docker compose version

# Test Docker
docker run hello-world
```

**Expected Output:**
```
Docker version 24.0.7, build afdd53b
Docker Compose version v2.23.0-desktop.1

Hello from Docker!
This message shows that your installation appears to be working correctly.
```

### Step 3: Clone and Deploy RemoteVulscan

#### Using PowerShell
```powershell
# Clone repository
git clone https://github.com/XORO1337/RemoteVulscan.git
cd RemoteVulscan

# Create environment file
Copy-Item .env.example .env

# Create data directories
New-Item -ItemType Directory -Force -Path "data\db", "logs", "reports", "tools"

# Deploy with Docker Compose
docker compose up -d --build
```

#### Using Command Prompt
```cmd
# Clone repository
git clone https://github.com/XORO1337/RemoteVulscan.git
cd RemoteVulscan

# Create environment file
copy .env.example .env

# Create data directories
mkdir data\db logs reports tools

# Deploy with Docker Compose
docker compose up -d --build
```

### Step 4: Verify Deployment
```powershell
# Check container status
docker compose ps

# Test health endpoint
Invoke-WebRequest -Uri "http://localhost:3000/api/health" -UseBasicParsing

# View logs
docker compose logs -f app
```

---

## 🐧 Method 2: WSL2 + Docker

### Step 1: Install WSL2

#### Enable WSL2
```powershell
# Run PowerShell as Administrator

# Enable WSL feature
dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart

# Enable Virtual Machine Platform
dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart

# Restart Windows
Restart-Computer
```

#### Install WSL2 Linux Kernel Update
1. Download: https://wslstorestorage.blob.core.windows.net/wslblob/wsl_update_x64.msi
2. Run the installer
3. Set WSL2 as default:
   ```powershell
   wsl --set-default-version 2
   ```

#### Install Ubuntu Distribution
```powershell
# Install Ubuntu from Microsoft Store
# Or use command line:
wsl --install -d Ubuntu

# Set up Ubuntu user account when prompted
```

### Step 2: Install Docker in WSL2

#### Open Ubuntu WSL2 Terminal
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker dependencies
sudo apt install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# Add Docker GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Add Docker repository
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Add user to docker group
sudo usermod -aG docker $USER

# Start Docker service
sudo service docker start

# Enable Docker to start on boot
echo "sudo service docker start" >> ~/.bashrc
```

### Step 3: Deploy RemoteVulscan in WSL2
```bash
# Clone repository
git clone https://github.com/XORO1337/RemoteVulscan.git
cd RemoteVulscan

# Make scripts executable
chmod +x scripts/*.sh

# Run automated deployment
./scripts/deploy.sh

# Or manual deployment
cp .env.example .env
mkdir -p data/db logs reports tools
docker compose up -d --build
```

### Step 4: Access from Windows
The application will be accessible from Windows at:
- **Web Interface:** http://localhost:3000
- **Health Check:** http://localhost:3000/api/health

---

## ⚡ Method 3: Windows Native Containers

**Note:** This method is complex and primarily for Windows Server environments.

### Prerequisites
- Windows Server 2019/2022 or Windows 10/11 Pro with Containers feature
- PowerShell 5.1 or PowerShell 7+

### Step 1: Enable Windows Containers
```powershell
# Run as Administrator
Enable-WindowsOptionalFeature -Online -FeatureName containers -All
Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V -All

# Restart required
Restart-Computer
```

### Step 2: Install Docker
```powershell
# Install Docker using Chocolatey
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

choco install docker-desktop -y

# Or manual installation
Invoke-WebRequest -UseBasicParsing "https://raw.githubusercontent.com/microsoft/Windows-Containers/Main/helpful_tools/Install-DockerCE/install-docker-ce.ps1" -o install-docker-ce.ps1
.\install-docker-ce.ps1
```

### Step 3: Configure for Linux Containers
```powershell
# Switch to Linux containers (required for RemoteVulscan)
& "C:\Program Files\Docker\Docker\DockerCli.exe" -SwitchLinuxEngine
```

### Step 4: Deploy RemoteVulscan
Follow the same steps as Method 1 for deployment.

---

## 🛠️ Scripts Usage on Windows

### PowerShell Wrapper Scripts

Create Windows-compatible versions of the deployment scripts:

#### `deploy.ps1`
```powershell
# Create deploy.ps1
@"
# RemoteVulscan Windows Deployment Script
Write-Host "🚀 Deploying RemoteVulscan on Windows" -ForegroundColor Green

# Check Docker
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Error "Docker is not installed or not in PATH"
    exit 1
}

# Create directories
Write-Host "Creating directories..." -ForegroundColor Blue
New-Item -ItemType Directory -Force -Path "data\db", "logs", "reports", "tools" | Out-Null

# Setup environment
Write-Host "Setting up environment..." -ForegroundColor Blue
if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "✅ Created .env file" -ForegroundColor Green
}

# Deploy with Docker Compose
Write-Host "Building and starting containers..." -ForegroundColor Blue
docker compose up -d --build

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Deployment successful!" -ForegroundColor Green
    Write-Host "🌐 Access your application at: http://localhost:3000" -ForegroundColor Cyan
    Write-Host "🏥 Health check: http://localhost:3000/api/health" -ForegroundColor Cyan
} else {
    Write-Error "❌ Deployment failed!"
}
"@ | Out-File -FilePath "deploy.ps1" -Encoding UTF8
```

#### `backup.ps1`
```powershell
# Create backup.ps1
@"
# RemoteVulscan Windows Backup Script
param(
    [string]$BackupPath = "backups"
)

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupDir = "$BackupPath\$timestamp"

Write-Host "🔄 Creating backup..." -ForegroundColor Blue
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

# Backup database
Write-Host "Backing up database..." -ForegroundColor Yellow
docker compose exec db sqlite3 /data/db/custom.db ".backup /data/db/backup-$timestamp.db"
Copy-Item "data\db\backup-$timestamp.db" "$backupDir\database.db" -ErrorAction SilentlyContinue

# Backup configuration
Copy-Item ".env" "$backupDir\" -ErrorAction SilentlyContinue
Copy-Item "docker-compose.yml" "$backupDir\" -ErrorAction SilentlyContinue

# Backup reports and logs
if (Test-Path "reports") {
    Compress-Archive -Path "reports\*" -DestinationPath "$backupDir\reports.zip" -ErrorAction SilentlyContinue
}
if (Test-Path "logs") {
    Compress-Archive -Path "logs\*" -DestinationPath "$backupDir\logs.zip" -ErrorAction SilentlyContinue
}

Write-Host "✅ Backup completed: $backupDir" -ForegroundColor Green
"@ | Out-File -FilePath "backup.ps1" -Encoding UTF8
```

#### `update.ps1`
```powershell
# Create update.ps1
@"
# RemoteVulscan Windows Update Script
Write-Host "🔄 Updating RemoteVulscan..." -ForegroundColor Blue

# Pull latest changes
git pull

if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to pull latest changes"
    exit 1
}

# Backup before update
Write-Host "Creating backup..." -ForegroundColor Yellow
.\backup.ps1

# Update containers
Write-Host "Updating containers..." -ForegroundColor Blue
docker compose build --pull
docker compose up -d

# Verify update
Write-Host "Verifying update..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -UseBasicParsing -TimeoutSec 30
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Update successful!" -ForegroundColor Green
    }
} catch {
    Write-Warning "⚠️ Health check failed, but containers may still be starting..."
    Write-Host "Check status with: docker compose ps" -ForegroundColor Cyan
}
"@ | Out-File -FilePath "update.ps1" -Encoding UTF8
```

### Using the Windows Scripts
```powershell
# Make scripts executable
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Deploy
.\deploy.ps1

# Backup
.\backup.ps1

# Update
.\update.ps1
```

---

## 🔄 PowerShell Alternative Commands

### Docker Management
```powershell
# Status check
docker compose ps
Get-Process | Where-Object {$_.ProcessName -like "*docker*"}

# Logs
docker compose logs -f app
docker compose logs --tail 100 app

# Container management
docker compose restart app
docker compose up -d --force-recreate app

# Resource monitoring
docker stats --no-stream
```

### System Information
```powershell
# Check system resources
Get-ComputerInfo | Select TotalPhysicalMemory, CsProcessors
Get-PSDrive C | Select Used, Free

# Check Docker status
docker version
docker compose version
docker system df
```

### Network Testing
```powershell
# Test connectivity
Test-NetConnection -ComputerName localhost -Port 3000
Invoke-WebRequest -Uri "http://localhost:3000/api/health" -UseBasicParsing

# Network diagnostics
Get-NetTCPConnection -LocalPort 3000
netstat -an | findstr ":3000"
```

### File Management
```powershell
# Directory operations
Get-ChildItem -Path "data\db" -Recurse
Test-Path "data\db\custom.db"

# File permissions
Get-Acl "data\db"
icacls "data\db" /grant Everyone:F

# Disk cleanup
docker system prune -f
docker volume prune -f
```

---

## 🚨 Windows-Specific Troubleshooting

### Common Windows Issues

#### 1. Hyper-V Conflicts
**Symptom:** VirtualBox or VMware conflicts with Docker Desktop

**Solution:**
```powershell
# Disable Hyper-V temporarily
Disable-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V-Hypervisor

# Or use WSL2 backend instead
# Docker Desktop Settings → General → Use WSL 2 based engine
```

#### 2. Windows Defender Interference
**Symptom:** Slow builds or file access issues

**Solution:**
```powershell
# Add Docker directories to exclusions
Add-MpPreference -ExclusionPath "C:\Program Files\Docker"
Add-MpPreference -ExclusionPath "C:\ProgramData\Docker"
Add-MpPreference -ExclusionPath "\\wsl$"

# Add project directory
Add-MpPreference -ExclusionPath "C:\path\to\RemoteVulscan"
```

#### 3. Windows Path Length Limitations
**Symptom:** File path too long errors

**Solution:**
```powershell
# Enable long paths
New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force

# Or clone to shorter path
cd C:\
git clone https://github.com/XORO1337/RemoteVulscan.git rv
cd rv
```

#### 4. PowerShell Execution Policy
**Symptom:** Cannot run PowerShell scripts

**Solution:**
```powershell
# Check current policy
Get-ExecutionPolicy

# Set policy for current user
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Or bypass for single script
PowerShell -ExecutionPolicy Bypass -File .\deploy.ps1
```

#### 5. Docker Desktop Not Starting
**Symptom:** Docker Desktop fails to start

**Solution:**
```powershell
# Reset Docker Desktop
Stop-Process -Name "Docker Desktop" -Force -ErrorAction SilentlyContinue
Remove-Item "$env:APPDATA\Docker" -Recurse -Force -ErrorAction SilentlyContinue

# Restart Docker service
Restart-Service docker

# Or reinstall Docker Desktop
```

#### 6. WSL2 Integration Issues
**Symptom:** Cannot access Docker from WSL2

**Solution:**
```bash
# In WSL2 terminal
# Restart Docker daemon
sudo service docker restart

# Check Docker group
groups $USER
sudo usermod -aG docker $USER

# Restart WSL2
# In PowerShell:
wsl --shutdown
wsl
```

#### 7. Port 3000 Already in Use (Windows)
**Symptom:** Port binding errors

**Solution:**
```powershell
# Find process using port 3000
Get-NetTCPConnection -LocalPort 3000 | Select OwningProcess
Get-Process -Id <ProcessId>

# Kill the process
Stop-Process -Id <ProcessId> -Force

# Or use different port
$env:PORT = "3001"
docker compose up -d app
```

#### 8. Volume Mount Issues
**Symptom:** Data not persisting or permission errors

**Solution:**
```powershell
# Check volume mounts
docker compose config

# Fix permissions
takeown /f data /r
icacls data /grant Everyone:F /t

# Use WSL2 path instead
# Move project to WSL2 filesystem for better performance
```

### Performance Optimization for Windows

#### Docker Desktop Settings
```
Resources → Advanced:
- Memory: 8GB+ (50-75% of total RAM)
- CPUs: 6+ cores (75% of total cores)
- Swap: 2GB
- Disk image size: 64GB+

Resources → File Sharing:
- Add project directory for better performance
```

#### Windows System Optimization
```powershell
# Disable Windows Search indexing for Docker directories
# Disable real-time antivirus scanning for Docker directories
# Enable Developer Mode (Settings → Update & Security → For developers)

# Optimize virtual memory
$computerSystem = Get-WmiObject -Class Win32_ComputerSystem
$ram = [math]::Round($computerSystem.TotalPhysicalMemory / 1GB)
$pageFileSize = $ram * 1.5
# Set virtual memory to 1.5x RAM size
```

---

## 🌐 Production Deployment on Windows Server

### Windows Server 2019/2022 Setup

#### Server Preparation
```powershell
# Install required features
Install-WindowsFeature -Name Containers, Hyper-V -IncludeManagementTools -Restart

# Install Docker
Invoke-WebRequest -UseBasicParsing "https://raw.githubusercontent.com/microsoft/Windows-Containers/Main/helpful_tools/Install-DockerCE/install-docker-ce.ps1" -o install-docker-ce.ps1
.\install-docker-ce.ps1

# Configure Windows Firewall
New-NetFirewallRule -DisplayName "RemoteVulscan HTTP" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow
New-NetFirewallRule -DisplayName "RemoteVulscan HTTPS" -Direction Inbound -Protocol TCP -LocalPort 443 -Action Allow
```

#### SSL/TLS Configuration
```powershell
# Generate self-signed certificate
$cert = New-SelfSignedCertificate -DnsName "your-server.com" -CertStoreLocation "cert:\LocalMachine\My"
Export-Certificate -Cert $cert -FilePath "C:\ssl\cert.crt"
Export-PfxCertificate -Cert $cert -FilePath "C:\ssl\cert.pfx" -Password (ConvertTo-SecureString "password" -AsPlainText -Force)

# Or use Let's Encrypt with win-acme
Invoke-WebRequest -Uri "https://github.com/win-acme/win-acme/releases/latest/download/win-acme.v2.2.0.1313.x64.pluggable.zip" -OutFile "win-acme.zip"
Expand-Archive win-acme.zip -DestinationPath "C:\win-acme"
```

#### Production Environment Setup
```powershell
# Create production environment file
@"
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
DATABASE_URL="file:./data/db/custom.db"
TURNSTILE_SITE_KEY="your-production-site-key"
TURNSTILE_SECRET_KEY="your-production-secret-key"
NEXT_PUBLIC_ENABLE_SOCKET="true"
DOCKERIZED=true
TOOLS_PATH=/tools
"@ | Out-File -FilePath ".env.production" -Encoding UTF8

# Deploy with production profile
$env:COMPOSE_FILE = "docker-compose.yml"
docker compose --profile production up -d --build
```

#### Windows Service Setup
```powershell
# Create Windows service to auto-start RemoteVulscan
$serviceName = "RemoteVulscan"
$serviceScript = @"
Set-Location "C:\RemoteVulscan"
docker compose up -d
"@

$serviceScript | Out-File -FilePath "C:\RemoteVulscan\start-service.ps1"

# Install service using NSSM (Non-Sucking Service Manager)
Invoke-WebRequest -Uri "https://nssm.cc/release/nssm-2.24.zip" -OutFile "nssm.zip"
Expand-Archive nssm.zip
.\nssm\win64\nssm.exe install $serviceName PowerShell.exe -ArgumentList "-ExecutionPolicy Bypass -File C:\RemoteVulscan\start-service.ps1"
Start-Service $serviceName
```

---

## 🧹 Maintenance & Updates

### Windows Maintenance Scripts

#### `maintenance.ps1`
```powershell
@"
# RemoteVulscan Windows Maintenance Script
param(
    [switch]$CleanDocker,
    [switch]$UpdateSystem,
    [switch]$CheckHealth
)

Write-Host "🔧 RemoteVulscan Maintenance" -ForegroundColor Green

if ($CheckHealth) {
    Write-Host "Checking application health..." -ForegroundColor Blue
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -UseBasicParsing -TimeoutSec 10
        Write-Host "✅ Application is healthy" -ForegroundColor Green
    } catch {
        Write-Warning "⚠️ Application health check failed"
        docker compose ps
    }
}

if ($CleanDocker) {
    Write-Host "Cleaning Docker resources..." -ForegroundColor Blue
    docker system prune -f
    docker volume prune -f
    Write-Host "✅ Docker cleanup completed" -ForegroundColor Green
}

if ($UpdateSystem) {
    Write-Host "Updating containers..." -ForegroundColor Blue
    docker compose pull
    docker compose up -d
    Write-Host "✅ Update completed" -ForegroundColor Green
}

Write-Host "Maintenance completed!" -ForegroundColor Green
"@ | Out-File -FilePath "maintenance.ps1" -Encoding UTF8
```

#### Scheduled Tasks
```powershell
# Create scheduled task for daily maintenance
$action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-ExecutionPolicy Bypass -File C:\RemoteVulscan\maintenance.ps1 -CheckHealth -CleanDocker"
$trigger = New-ScheduledTaskTrigger -Daily -At 2:00AM
$settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit (New-TimeSpan -Hours 1)

Register-ScheduledTask -TaskName "RemoteVulscan Maintenance" -Action $action -Trigger $trigger -Settings $settings -RunLevel Highest
```

### Windows Update Procedures
```powershell
# Before updating
.\backup.ps1

# Update application
git pull
docker compose build --pull
docker compose up -d

# Verify update
Start-Sleep -Seconds 30
Invoke-WebRequest -Uri "http://localhost:3000/api/health" -UseBasicParsing
```

---

## 📚 Additional Windows Resources

### Useful Tools
- **Docker Desktop** - Main container platform
- **WSL2** - Linux compatibility layer
- **Windows Terminal** - Modern terminal experience
- **PowerShell 7** - Latest PowerShell version
- **Visual Studio Code** - Code editor with Docker extensions
- **Portainer** - Docker management UI

### Performance Monitoring
```powershell
# System monitoring script
while ($true) {
    Clear-Host
    Write-Host "=== RemoteVulscan Windows Monitor ===" -ForegroundColor Cyan
    
    # Container status
    docker compose ps
    
    # Resource usage
    docker stats --no-stream
    
    # System resources
    Get-Counter '\Memory\Available MBytes','\Processor(_Total)\% Processor Time' -SampleInterval 1 -MaxSamples 1
    
    Start-Sleep -Seconds 5
}
```

### Windows-Specific Tips
1. **Use WSL2** for better Linux container compatibility
2. **Allocate sufficient memory** to Docker Desktop (8GB+)
3. **Add exclusions** to Windows Defender for Docker directories
4. **Use shorter paths** to avoid Windows path length limitations
5. **Enable Developer Mode** for better file system performance
6. **Consider using Windows Terminal** for better PowerShell experience

---

## 🎉 Conclusion

You now have RemoteVulscan running on Windows! Choose the deployment method that best fits your Windows environment:

- **🐳 Docker Desktop:** Best for most Windows users
- **🐧 WSL2 + Docker:** Best performance and Linux compatibility
- **⚡ Windows Containers:** For Windows Server environments

**Next Steps:**
1. 🔧 Configure Turnstile CAPTCHA keys
2. 🛡️ Set up monitoring and maintenance scripts
3. 📊 Explore security tools via PowerShell
4. 🚀 Consider Windows Server deployment for production

**Need Help?**
- Check Windows-specific troubleshooting section
- Use PowerShell commands for diagnostics
- Enable detailed Docker Desktop logging
- Review Windows Event Logs for system issues

Happy scanning on Windows! 🪟🛡️🚀

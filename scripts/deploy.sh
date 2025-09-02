#!/bin/bash

# Complete Deployment Script for Vulnerability Scanner
# This script builds and deploys the entire application using Docker Compose

set -e

echo "🚀 Deploying Vulnerability Scanner with Docker Compose"
echo " Made with ❤️ by Hardik (@XORO1337) "
echo "========================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker service."
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose >/dev/null 2>&1; then
    print_error "Docker Compose is not installed. Please run setup-docker.sh first."
    exit 1
fi

# Create necessary directories
print_status "Creating necessary directories..."
mkdir -p data/db
mkdir -p logs
mkdir -p reports
mkdir -p tools

# Set permissions
chmod -R 755 data logs reports tools

# Stop existing containers if any
print_status "Stopping existing containers..."
docker-compose down --remove-orphans 2>/dev/null || true

# Build Docker images
print_status "Building Docker images..."
print_status "Building tools image (this may take a while)..."
docker-compose build tools

print_status "Building application image..."
docker-compose build app

# Start services
print_status "Starting services..."
docker-compose up -d

# Wait for services to be ready
print_status "Waiting for services to be ready..."
sleep 30

# Check service status
print_status "Checking service status..."
docker-compose ps

# Verify services are running
print_status "Verifying services are running..."
if docker-compose ps | grep -q "Up"; then
    print_success "Services are running successfully!"
else
    print_warning "Some services may not be running properly. Check logs with: docker-compose logs"
fi

# Run tools verification
print_status "Verifying security tools installation..."
docker-compose exec tools /tools/verify-tools.sh

# Print access information
print_success "Deployment completed successfully!"
echo ""
echo "🎉 Vulnerability Scanner has been deployed successfully!"
echo ""
echo "📋 Access Information:"
echo "   • Application URL: http://localhost:3000"
echo "   • API Health Check: http://localhost:3000/api/health"
echo "   • Tools Container: docker-compose exec tools bash"
echo ""
echo "🔧 Management Commands:"
echo "   • View logs: docker-compose logs -f"
echo "   • Stop services: docker-compose down"
echo "   • Restart services: docker-compose restart"
echo "   • View status: docker-compose ps"
echo "   • Access tools: docker-compose exec tools bash"
echo ""
echo "📁 Data Directories:"
echo "   • Database: ./data/db/"
echo "   • Logs: ./logs/"
echo "   • Reports: ./reports/"
echo "   • Tools: ./tools/"
echo ""
echo "🛡️  Security Tools Available:"
echo "   • Nmap - Network scanning"
echo "   • Nikto - Web server scanning"
echo "   • SQLMap - SQL injection detection"
echo "   • Commix - Command injection detection"
echo "   • Corsy - CORS misconfiguration detection"
echo "   • Nettacker - Network penetration testing"
echo "   • Nuclei - Vulnerability scanning"
echo "   • And many more..."
echo ""
echo "📊 Monitoring:"
echo "   • Application logs: docker-compose logs -f app"
echo "   • Tools logs: docker-compose logs -f tools"
echo "   • Database logs: docker-compose logs -f db"
echo ""
echo "🔄 Maintenance:"
echo "   • Update tools: docker-compose build --no-cache tools"
echo "   • Update app: docker-compose build --no-cache app"
echo "   • Clean up: docker system prune"
echo ""
echo "⚠️  First Run Notes:"
echo "   • The application may take a few minutes to fully start"
echo "   • Security tools are being installed in the background"
echo "   • You can monitor the installation progress with: docker-compose logs -f tools"
echo "   • Once tools are installed, you can start scanning immediately"
echo ""
echo "🎯 Next Steps:"
echo "   1. Open http://localhost:3000 in your browser"
echo "   2. Enter a URL to scan"
echo "   3. Select scan type and start scanning"
echo "   4. View live results in the Live Results tab"
echo "   5. Download HTML reports when scans complete"
echo ""
echo "Enjoy you Journey ❤️ "

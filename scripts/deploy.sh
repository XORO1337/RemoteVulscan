#!/bin/bash

# RemoteVulscan Deployment Script
# Containerized deployment with Docker Compose

set -e

echo "🚀 Deploying RemoteVulscan"
echo "=========================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# Check Docker
if ! docker info >/dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker service."
    exit 1
fi

# Check Docker Compose
if ! command -v docker-compose >/dev/null 2>&1; then
    print_error "Docker Compose is not installed."
    exit 1
fi

# Setup environment
if [ ! -f ".env" ]; then
    print_status "Creating environment file..."
    cp .env.example .env
    print_success "Environment file created"
else
    print_status "Environment file already exists"
fi

# Stop existing containers
print_status "Stopping existing containers..."
docker-compose down --remove-orphans 2>/dev/null || true

# Clean up old images (optional)
print_status "Cleaning up old Docker images..."
docker system prune -f || true

# Build and start services
print_status "Building and starting services..."
docker-compose up -d --build --force-recreate

# Wait for services
print_status "Waiting for backend to be ready..."
timeout=60
counter=0
while [ $counter -lt $timeout ]; do
    if curl -f http://localhost:8000/api/v1/health >/dev/null 2>&1; then
        break
    fi
    sleep 2
    counter=$((counter + 2))
done

print_status "Waiting for frontend to be ready..."
counter=0
while [ $counter -lt $timeout ]; do
    if curl -f http://localhost:3000/api/health >/dev/null 2>&1; then
        break
    fi
    sleep 2
    counter=$((counter + 2))
done

# Check service status
print_status "Checking service status..."
if docker-compose ps --services --filter "status=running" | grep -q "backend\|frontend"; then
    print_success "Services are running successfully!"
else
    print_warning "Some services may not be ready yet. Check logs with: docker-compose logs"
fi

# Test API
print_status "Testing API endpoints..."
if curl -f http://localhost:8000/api/v1/health >/dev/null 2>&1; then
    print_success "Backend API is responding"
else
    print_warning "Backend API may not be ready yet"
fi

if curl -f http://localhost:3000 >/dev/null 2>&1; then
    print_success "Frontend is responding"
else
    print_warning "Frontend may not be ready yet"
fi

# Verify tools in backend container
print_status "Verifying security tools..."
if docker exec remotevulscan-backend verify-tools.sh >/dev/null 2>&1; then
    print_success "Security tools are available"
else
    print_warning "Some security tools may not be available"
fi

print_success "Deployment completed!"
echo ""
echo "🎉 RemoteVulscan is now running!"
echo ""
echo "📋 Access Information:"
echo "   • Frontend: http://localhost:3000"
echo "   • Backend API: http://localhost:8000"
echo "   • Health Check: http://localhost:8000/api/v1/health"
echo "   • API Documentation: http://localhost:8000/api/v1/docs"
echo ""
echo "🔧 Management Commands:"
echo "   • View logs: docker-compose logs -f"
echo "   • View backend logs: docker-compose logs -f backend"
echo "   • View frontend logs: docker-compose logs -f frontend"
echo "   • Stop services: docker-compose down"
echo "   • Restart: docker-compose restart"
echo "   • Rebuild: docker-compose up -d --build"
echo ""
echo "🛡️ Available Tools:"
echo "   • Network: nmap, masscan"
echo "   • Web: nikto, nuclei, sqlmap, gobuster"
echo "   • SSL: testssl.sh, sslscan"
echo "   • Discovery: httpx, subfinder"
echo ""
echo "🐳 Container Status:"
docker-compose ps
echo ""
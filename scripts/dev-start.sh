#!/bin/bash

echo "🚀 RemoteVulscan - Quick Development Setup"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
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
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi

print_status "Starting RemoteVulscan in development mode..."

# Build and start development environment
print_status "Building development containers..."
docker-compose -f docker-compose.dev.yml build

if [ $? -eq 0 ]; then
    print_success "Development containers built successfully!"
else
    print_error "Failed to build development containers"
    exit 1
fi

print_status "Starting development services..."
docker-compose -f docker-compose.dev.yml up -d

if [ $? -eq 0 ]; then
    print_success "Development services started successfully!"
    echo ""
    echo "🌐 Services available at:"
    echo "   Frontend:  http://localhost:3000"
    echo "   Backend:   http://localhost:8000"
    echo "   API Docs:  http://localhost:8000/api/v1/docs"
    echo ""
    echo "📊 To view logs:"
    echo "   docker-compose -f docker-compose.dev.yml logs -f"
    echo ""
    echo "⏹️  To stop services:"
    echo "   docker-compose -f docker-compose.dev.yml down"
    echo ""
    print_status "Services will auto-reload when you modify source code!"
else
    print_error "Failed to start development services"
    exit 1
fi

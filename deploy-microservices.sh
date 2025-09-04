#!/bin/bash

# RemoteVulscan Microservices Deployment Script
# This script sets up the complete microservices architecture

set -e

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

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    # Check available disk space (minimum 10GB)
    available_space=$(df / | awk 'NR==2 {print $4}')
    min_space=10485760 # 10GB in KB
    
    if [ "$available_space" -lt "$min_space" ]; then
        print_warning "Low disk space detected. At least 10GB recommended."
    fi
    
    print_success "Prerequisites check completed"
}

# Create required directories
create_directories() {
    print_status "Creating required directories..."
    
    directories=(
        "data/db"
        "data/logs"
        "data/reports"
        "logs"
        "reports"
        "tools"
        "ssl"
        "monitoring"
        "fluentd/conf"
    )
    
    for dir in "${directories[@]}"; do
        mkdir -p "$dir"
        print_status "Created directory: $dir"
    done
    
    print_success "Directory structure created"
}

# Setup environment configuration
setup_environment() {
    print_status "Setting up environment configuration..."
    
    # Backend environment
    if [ ! -f "backend/.env" ]; then
        cp backend/.env.example backend/.env
        print_status "Created backend/.env from example"
        print_warning "Please edit backend/.env with your configuration"
    fi
    
    # Generate secure secrets
    if command -v openssl &> /dev/null; then
        jwt_secret=$(openssl rand -hex 32)
        api_salt=$(openssl rand -hex 16)
        
        # Update .env with generated secrets
        sed -i "s/your-jwt-secret-key-here/$jwt_secret/" backend/.env 2>/dev/null || true
        sed -i "s/your-api-key-salt-here/$api_salt/" backend/.env 2>/dev/null || true
        
        print_success "Generated secure secrets"
    fi
    
    print_success "Environment configuration completed"
}

# Initialize database
init_database() {
    print_status "Initializing database..."
    
    # Create database initialization script if it doesn't exist
    if [ ! -f "scripts/init-db.sh" ]; then
        mkdir -p scripts
        cat > scripts/init-db.sh << 'EOF'
#!/bin/bash
set -e

DB_PATH="/data/db/custom.db"
mkdir -p "$(dirname "$DB_PATH")"

if [ ! -f "$DB_PATH" ]; then
    echo "Creating SQLite database..."
    sqlite3 "$DB_PATH" "CREATE TABLE IF NOT EXISTS _init (id INTEGER PRIMARY KEY);"
    echo "Database created at $DB_PATH"
else
    echo "Database already exists at $DB_PATH"
fi

# Set permissions
chmod 664 "$DB_PATH" 2>/dev/null || true
chown 1001:1001 "$DB_PATH" 2>/dev/null || true

echo "Database initialization completed"
EOF
        chmod +x scripts/init-db.sh
    fi
    
    print_success "Database initialization script ready"
}

# Build and start services
deploy_services() {
    print_status "Building and deploying services..."
    
    # Stop any existing services
    docker-compose -f docker-compose-new.yml down 2>/dev/null || true
    
    # Pull latest base images
    docker-compose -f docker-compose-new.yml pull db redis 2>/dev/null || true
    
    # Build custom images
    print_status "Building backend service..."
    docker-compose -f docker-compose-new.yml build backend
    
    print_status "Building frontend service..."
    docker-compose -f docker-compose-new.yml build frontend
    
    print_status "Building tools service..."
    docker-compose -f docker-compose-new.yml build tools
    
    # Start core services
    print_status "Starting database and Redis..."
    docker-compose -f docker-compose-new.yml up -d db redis
    
    # Wait for Redis to be ready
    print_status "Waiting for Redis to be ready..."
    timeout=30
    while ! docker-compose -f docker-compose-new.yml exec -T redis redis-cli ping &>/dev/null; do
        sleep 1
        timeout=$((timeout - 1))
        if [ $timeout -eq 0 ]; then
            print_error "Redis startup timeout"
            exit 1
        fi
    done
    print_success "Redis is ready"
    
    # Start tools service
    print_status "Starting tools service..."
    docker-compose -f docker-compose-new.yml up -d tools
    
    # Wait for tools API to be ready
    print_status "Waiting for tools API to be ready..."
    timeout=60
    while ! curl -sf http://localhost:3001/health &>/dev/null; do
        sleep 2
        timeout=$((timeout - 2))
        if [ $timeout -le 0 ]; then
            print_error "Tools API startup timeout"
            exit 1
        fi
    done
    print_success "Tools API is ready"
    
    # Start backend service
    print_status "Starting backend service..."
    docker-compose -f docker-compose-new.yml up -d backend
    
    # Wait for backend API to be ready
    print_status "Waiting for backend API to be ready..."
    timeout=60
    while ! curl -sf http://localhost:8000/api/v1/health &>/dev/null; do
        sleep 2
        timeout=$((timeout - 2))
        if [ $timeout -le 0 ]; then
            print_error "Backend API startup timeout"
            exit 1
        fi
    done
    print_success "Backend API is ready"
    
    # Run database migrations
    print_status "Running database migrations..."
    docker-compose -f docker-compose-new.yml exec -T backend npx prisma db push --accept-data-loss || true
    
    # Start frontend service
    print_status "Starting frontend service..."
    docker-compose -f docker-compose-new.yml up -d frontend
    
    # Wait for frontend to be ready
    print_status "Waiting for frontend to be ready..."
    timeout=60
    while ! curl -sf http://localhost:3000 &>/dev/null; do
        sleep 2
        timeout=$((timeout - 2))
        if [ $timeout -le 0 ]; then
            print_error "Frontend startup timeout"
            exit 1
        fi
    done
    print_success "Frontend is ready"
    
    print_success "All services deployed successfully"
}

# Verify deployment
verify_deployment() {
    print_status "Verifying deployment..."
    
    # Check service status
    services=("backend" "frontend" "tools" "db" "redis")
    for service in "${services[@]}"; do
        if docker-compose -f docker-compose-new.yml ps "$service" | grep -q "Up"; then
            print_success "$service is running"
        else
            print_error "$service is not running"
            return 1
        fi
    done
    
    # Check API endpoints
    endpoints=(
        "http://localhost:8000/api/v1/health|Backend API"
        "http://localhost:3001/health|Tools API"
        "http://localhost:3000|Frontend"
    )
    
    for endpoint in "${endpoints[@]}"; do
        url=$(echo "$endpoint" | cut -d'|' -f1)
        name=$(echo "$endpoint" | cut -d'|' -f2)
        
        if curl -sf "$url" &>/dev/null; then
            print_success "$name is accessible"
        else
            print_error "$name is not accessible"
            return 1
        fi
    done
    
    # Verify tools
    print_status "Verifying security tools..."
    if docker-compose -f docker-compose-new.yml exec -T tools /tools/verify-tools.sh &>/dev/null; then
        print_success "Security tools verified"
    else
        print_warning "Some security tools may not be available"
    fi
    
    print_success "Deployment verification completed"
}

# Display access information
show_access_info() {
    print_success "🎉 RemoteVulscan deployment completed successfully!"
    echo
    echo "==================================="
    echo "         ACCESS INFORMATION        "
    echo "==================================="
    echo
    echo "Frontend Application:"
    echo "  URL: http://localhost:3000"
    echo "  Description: Web interface for vulnerability scanning"
    echo
    echo "Backend API:"
    echo "  URL: http://localhost:8000"
    echo "  Health: http://localhost:8000/api/v1/health"
    echo "  Documentation: http://localhost:8000/api/v1/docs"
    echo
    echo "Tools API:"
    echo "  URL: http://localhost:3001"
    echo "  Health: http://localhost:3001/health"
    echo "  Available Tools: http://localhost:3001/api/tools"
    echo
    echo "==================================="
    echo "         USEFUL COMMANDS           "
    echo "==================================="
    echo
    echo "View logs:"
    echo "  docker-compose -f docker-compose-new.yml logs -f [service]"
    echo
    echo "Check status:"
    echo "  docker-compose -f docker-compose-new.yml ps"
    echo
    echo "Stop services:"
    echo "  docker-compose -f docker-compose-new.yml down"
    echo
    echo "Restart services:"
    echo "  docker-compose -f docker-compose-new.yml restart [service]"
    echo
    echo "Update services:"
    echo "  docker-compose -f docker-compose-new.yml build [service] && docker-compose -f docker-compose-new.yml up -d [service]"
    echo
    print_warning "Remember to configure your .env files for production use!"
}

# Main deployment function
main() {
    echo "========================================"
    echo "   RemoteVulscan Microservices Setup   "
    echo "========================================"
    echo
    
    check_prerequisites
    create_directories
    setup_environment
    init_database
    deploy_services
    verify_deployment
    show_access_info
}

# Handle script interruption
cleanup() {
    print_warning "Deployment interrupted. Cleaning up..."
    docker-compose -f docker-compose-new.yml down 2>/dev/null || true
    exit 1
}

trap cleanup INT TERM

# Run with error handling
if main; then
    exit 0
else
    print_error "Deployment failed. Check the logs above for details."
    exit 1
fi

#!/bin/bash

# Backend Application Startup Script
# This script initializes the backend with proper tool verification

set -e

echo "🚀 Starting RemoteVulscan Backend API"
echo "====================================="

# Function to print colored output
print_status() {
    echo -e "\033[0;34m[INFO]\033[0m $1"
}

print_success() {
    echo -e "\033[0;32m[SUCCESS]\033[0m $1"
}

print_error() {
    echo -e "\033[0;31m[ERROR]\033[0m $1"
}

# Create necessary directories
print_status "Creating application directories..."
mkdir -p /app/data/db /app/logs /app/reports /tmp/scans
chmod 755 /app/data /app/logs /app/reports /tmp/scans

# Verify security tools installation
print_status "Verifying security tools installation..."
if command -v verify-tools.sh >/dev/null 2>&1; then
    if verify-tools.sh; then
        print_success "Security tools verification completed"
    else
        print_error "Some security tools are missing"
        echo "Continuing startup anyway..."
    fi
else
    print_error "Tools verification script not found"
fi

# Initialize database if needed
print_status "Initializing database..."
if [ ! -f "/app/data/db/custom.db" ]; then
    print_status "Creating new database..."
    npx prisma db push --accept-data-loss || {
        print_error "Database initialization failed"
        exit 1
    }
    print_success "Database initialized"
else
    print_status "Database already exists"
fi

# Update Nuclei templates if available
print_status "Updating Nuclei templates..."
if command -v nuclei >/dev/null 2>&1; then
    nuclei -update-templates -silent || {
        print_error "Failed to update Nuclei templates"
        echo "Continuing without template update..."
    }
    print_success "Nuclei templates updated"
fi

# Set proper file permissions
chmod 664 /app/data/db/custom.db 2>/dev/null || true

# Display system information
print_status "System Information:"
echo "  Node.js version: $(node --version)"
echo "  NPM version: $(npm --version)"
echo "  Database: ${DATABASE_URL:-file:./data/db/custom.db}"
echo "  Tools path: ${TOOLS_PATH:-/usr/local/bin}"
echo "  Max concurrent executions: ${MAX_CONCURRENT_EXECUTIONS:-5}"
echo "  Environment: ${NODE_ENV:-production}"

# Start the application
print_status "Starting backend API server..."
exec node dist/server.js
#!/bin/bash

# Test script for RemoteVulscan setup verification

set -e

echo "🔍 RemoteVulscan Setup Verification"
echo "==================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    local status=$1
    local message=$2
    case $status in
        "SUCCESS") echo -e "${GREEN}✓${NC} $message" ;;
        "ERROR") echo -e "${RED}✗${NC} $message" ;;
        "WARNING") echo -e "${YELLOW}⚠${NC} $message" ;;
        "INFO") echo -e "${BLUE}ℹ${NC} $message" ;;
    esac
}

# Test 1: Check Docker
echo "1. Checking Docker daemon..."
if docker ps >/dev/null 2>&1; then
    print_status "SUCCESS" "Docker daemon is running"
else
    print_status "ERROR" "Docker daemon is not running"
    exit 1
fi

# Test 2: Check containers
echo
echo "2. Checking containers..."
CONTAINERS=("remotevulscan-backend" "remotevulscan-frontend" "remotevulscan-db")

for container in "${CONTAINERS[@]}"; do
    if docker ps --format "table {{.Names}}" | grep -q "^$container$"; then
        STATUS=$(docker inspect --format="{{.State.Status}}" "$container" 2>/dev/null || echo "not_found")
        if [ "$STATUS" = "running" ]; then
            print_status "SUCCESS" "Container $container is running"
        else
            print_status "WARNING" "Container $container status: $STATUS"
        fi
    else
        print_status "ERROR" "Container $container does not exist"
    fi
done

# Test 3: Check API endpoints
echo
echo "3. Testing API endpoints..."
if curl -sf http://localhost:8000/api/v1/health >/dev/null 2>&1; then
    print_status "SUCCESS" "Backend API is responding"
else
    print_status "ERROR" "Backend API is not responding"
fi

if curl -sf http://localhost:3000 >/dev/null 2>&1; then
    print_status "SUCCESS" "Frontend is responding"
else
    print_status "ERROR" "Frontend is not responding"
fi

# Test 4: Check tools availability
echo
echo "4. Testing security tools..."
if docker exec remotevulscan-backend verify-tools.sh >/dev/null 2>&1; then
    print_status "SUCCESS" "Security tools are available"
else
    print_status "WARNING" "Some security tools may not be available"
fi

# Test 5: Test tool execution
echo
echo "5. Testing tool execution..."
if docker exec remotevulscan-backend nmap --version >/dev/null 2>&1; then
    print_status "SUCCESS" "Tool execution is working"
else
    print_status "ERROR" "Tool execution failed"
fi

echo
echo "🏁 Setup verification completed!"
echo
echo "If all tests show SUCCESS, your RemoteVulscan installation is ready!"
echo "If you see ERRORs, please run: docker-compose up -d --build"
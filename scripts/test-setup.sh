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

# Test 2.5: Check container health
echo
echo "2.5. Checking container health..."
for container in "${CONTAINERS[@]}"; do
    if docker ps --format "table {{.Names}}" | grep -q "^$container$"; then
        HEALTH=$(docker inspect --format="{{.State.Health.Status}}" "$container" 2>/dev/null || echo "no_health_check")
        if [ "$HEALTH" = "healthy" ]; then
            print_status "SUCCESS" "Container $container is healthy"
        elif [ "$HEALTH" = "no_health_check" ]; then
            print_status "INFO" "Container $container has no health check"
        else
            print_status "WARNING" "Container $container health: $HEALTH"
        fi
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

if curl -sf http://localhost:3000/api/health >/dev/null 2>&1; then
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

# Test 6: Test container communication
echo
echo "6. Testing container communication..."
if docker exec remotevulscan-frontend curl -sf http://backend:8000/api/v1/health >/dev/null 2>&1; then
    print_status "SUCCESS" "Frontend can communicate with backend"
else
    print_status "WARNING" "Frontend-backend communication may have issues"
fi

# Test 7: Check volumes and data persistence
echo
echo "7. Checking data persistence..."
if docker volume ls | grep -q "remotevulscan.*backend_data"; then
    print_status "SUCCESS" "Backend data volume exists"
else
    print_status "WARNING" "Backend data volume not found"
fi

# Test 8: Test API functionality
echo
echo "8. Testing API functionality..."
API_RESPONSE=$(curl -s http://localhost:8000/api/v1/tools 2>/dev/null || echo "")
if echo "$API_RESPONSE" | grep -q "tools"; then
    print_status "SUCCESS" "API endpoints are functional"
else
    print_status "WARNING" "API endpoints may not be fully functional"
fi

echo
echo "🏁 Setup verification completed!"
echo
echo "📊 Container Status:"
docker-compose ps
echo
echo "💾 Volume Status:"
docker volume ls | grep remotevulscan || echo "No RemoteVulscan volumes found"
echo
echo "🌐 Network Status:"
docker network ls | grep remotevulscan || echo "No RemoteVulscan networks found"
echo
echo "If all tests show SUCCESS, your RemoteVulscan installation is ready!"
echo "If you see ERRORs, please run: ./scripts/deploy.sh"
echo ""
echo "🔗 Access URLs:"
echo "   • Frontend: http://localhost:3000"
echo "   • Backend API: http://localhost:8000"
echo "   • API Docs: http://localhost:8000/api/v1/docs"
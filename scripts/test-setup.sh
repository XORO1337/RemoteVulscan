#!/bin/bash

# Test script for the RemoteVulscan tool execution system
# This script verifies that the Docker containers and tools are properly set up

set -e

echo "🔍 RemoteVulscan Tool Execution Test"
echo "===================================="
echo

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
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

# Test 1: Check if Docker is running
echo "1. Checking Docker daemon..."
if docker ps >/dev/null 2>&1; then
    print_status "SUCCESS" "Docker daemon is running"
else
    print_status "ERROR" "Docker daemon is not running or not accessible"
    exit 1
fi

# Test 2: Check if containers exist
echo
echo "2. Checking Docker containers..."
CONTAINERS=("vuln-scanner-app" "vuln-scanner-tools" "vuln-scanner-db")

for container in "${CONTAINERS[@]}"; do
    if docker ps -a --format "table {{.Names}}" | grep -q "^$container$"; then
        STATUS=$(docker inspect --format="{{.State.Status}}" "$container" 2>/dev/null || echo "not_found")
        if [ "$STATUS" = "running" ]; then
            print_status "SUCCESS" "Container $container is running"
        elif [ "$STATUS" = "exited" ]; then
            print_status "WARNING" "Container $container exists but is stopped"
            echo "  Attempting to start $container..."
            if docker start "$container" >/dev/null 2>&1; then
                print_status "SUCCESS" "Started $container"
            else
                print_status "ERROR" "Failed to start $container"
            fi
        else
            print_status "WARNING" "Container $container status: $STATUS"
        fi
    else
        print_status "ERROR" "Container $container does not exist"
        if [ "$container" = "vuln-scanner-tools" ]; then
            echo "  Run: docker-compose up -d to create containers"
        fi
    fi
done

# Test 3: Check if tools container has security tools installed
echo
echo "3. Checking security tools availability..."
TOOLS=("nmap" "nikto" "nuclei" "testssl.sh" "sslscan" "sqlmap" "gobuster")

if docker ps --format "table {{.Names}}" | grep -q "vuln-scanner-tools"; then
    for tool in "${TOOLS[@]}"; do
        if docker exec vuln-scanner-tools which "$tool" >/dev/null 2>&1; then
            VERSION=$(docker exec vuln-scanner-tools bash -c "$tool --version 2>&1 | head -n 1" 2>/dev/null || echo "unknown")
            print_status "SUCCESS" "$tool is available (${VERSION})"
        else
            print_status "ERROR" "$tool is not available"
        fi
    done
else
    print_status "ERROR" "Cannot check tools - vuln-scanner-tools container is not running"
fi

# Test 4: Test network connectivity from tools container
echo
echo "4. Testing network connectivity..."
if docker ps --format "table {{.Names}}" | grep -q "vuln-scanner-tools"; then
    if docker exec vuln-scanner-tools curl -s --connect-timeout 5 google.com >/dev/null 2>&1; then
        print_status "SUCCESS" "Network connectivity from tools container is working"
    else
        print_status "WARNING" "Network connectivity from tools container may be limited"
    fi
else
    print_status "ERROR" "Cannot test connectivity - tools container not running"
fi

# Test 5: Check application container
echo
echo "5. Testing application container..."
if docker ps --format "table {{.Names}}" | grep -q "vuln-scanner-app"; then
    if curl -s http://localhost:3000/api/health >/dev/null 2>&1; then
        print_status "SUCCESS" "Application is responding on port 3000"
    else
        print_status "WARNING" "Application may not be ready yet (check docker logs vuln-scanner-app)"
    fi
else
    print_status "ERROR" "Application container is not running"
fi

# Test 6: Test a simple scan command
echo
echo "6. Testing scan execution..."
if docker ps --format "table {{.Names}}" | grep -q "vuln-scanner-tools"; then
    echo "  Testing nmap scan on scanme.nmap.org..."
    if timeout 30 docker exec vuln-scanner-tools nmap -sn scanme.nmap.org >/dev/null 2>&1; then
        print_status "SUCCESS" "Sample scan execution works"
    else
        print_status "WARNING" "Sample scan failed or timed out"
    fi
else
    print_status "ERROR" "Cannot test scan - tools container not running"
fi

# Test 7: Check database
echo
echo "7. Checking database..."
if docker ps --format "table {{.Names}}" | grep -q "vuln-scanner-db"; then
    print_status "SUCCESS" "Database container is running"
else
    print_status "WARNING" "Database container is not running (SQLite may still work)"
fi

echo
echo "🏁 Test completed!"
echo
echo "Summary:"
echo "- If all tests show SUCCESS, your setup is ready for vulnerability scanning"
echo "- If you see ERRORs, please run: docker-compose up -d"
echo "- If you see WARNINGs, the system should still work but may have limitations"
echo
echo "To start the application:"
echo "  docker-compose up -d"
echo
echo "To access the application:"
echo "  http://localhost:3000"
echo
echo "API endpoints:"
echo "  http://localhost:3000/api/system/status"
echo "  http://localhost:3000/api/scans/modes"
echo "  http://localhost:3000/api/scans/stats"

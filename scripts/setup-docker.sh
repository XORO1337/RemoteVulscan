#!/bin/bash

# Docker Setup Script for Vulnerability Scanner
# This script sets up Docker and Docker Compose on Arch Linux

set -e

echo "🐳 Setting up Docker Environment for Vulnerability Scanner"
echo "========================================================="

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

# Check if running as root
if [[ $EUID -ne 0 ]]; then
    print_error "This script must be run as root"
    exit 1
fi

# Update system
print_status "Updating system..."
pacman -Syu --noconfirm

# Install Docker and Docker Compose
print_status "Installing Docker and Docker Compose..."
pacman -S --noconfirm docker docker-compose

# Start and enable Docker service
print_status "Starting and enabling Docker service..."
systemctl start docker
systemctl enable docker

# Add current user to docker group
print_status "Adding user to docker group..."
usermod -aG docker $SUDO_USER

# Install Docker Compose V2 (optional, for better compatibility)
print_status "Installing Docker Compose V2..."
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Verify Docker installation
print_status "Verifying Docker installation..."
docker --version
docker-compose --version

# Create docker group if it doesn't exist
print_status "Ensuring docker group exists..."
getent group docker || groupadd docker

# Set up Docker daemon configuration for better performance
print_status "Configuring Docker daemon..."
mkdir -p /etc/docker
cat > /etc/docker/daemon.json << EOF
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "storage-driver": "overlay2",
  "dns": ["8.8.8.8", "8.8.4.4"]
}
EOF

# Restart Docker service
print_status "Restarting Docker service..."
systemctl restart docker

# Enable IPv4 forwarding
print_status "Enabling IPv4 forwarding..."
sysctl -w net.ipv4.ip_forward=1
echo "net.ipv4.ip_forward=1" >> /etc/sysctl.conf

# Enable br_netfilter kernel module
print_status "Enabling br_netfilter kernel module..."
modprobe br_netfilter
echo "br_netfilter" > /etc/modules-load.d/br_netfilter.conf

# Install useful Docker utilities
print_status "Installing Docker utilities..."
pacman -S --noconfirm \
    docker-buildx \
    docker-compose-plugin

# Create Docker network for the application
print_status "Creating Docker network..."
docker network create vuln-scanner-network 2>/dev/null || true

# Print success message
print_success "Docker setup completed successfully!"
echo ""
echo "🎉 Docker and Docker Compose have been installed successfully!"
echo ""
echo "📋 Next Steps:"
echo "   1. Log out and log back in to apply group changes"
echo "   2. Verify Docker installation: docker --version"
echo "   3. Verify Docker Compose: docker-compose --version"
echo "   4. Run the deployment: docker-compose up -d"
echo ""
echo "🔧 Useful Commands:"
echo "   • docker-compose up -d          # Start services"
echo "   • docker-compose down           # Stop services"
echo "   • docker-compose logs -f        # View logs"
echo "   • docker-compose ps             # Check status"
echo "   • docker system prune          # Clean up unused resources"
echo ""
echo "⚠️  Important:"
echo "   • You may need to log out and log back in for group changes to take effect"
echo "   • If you encounter permission issues, run: newgrp docker"
echo "   • Make sure your user is in the docker group: groups \$USER"
echo ""

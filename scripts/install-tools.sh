#!/bin/bash

# Security Tools Installation Script for Arch Linux
# This script installs all required security tools for the vulnerability scanner

set -e

echo "🛡️  Installing Security Tools for Vulnerability Scanner"
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

# Update system and install basic dependencies
print_status "Updating system and installing basic dependencies..."
pacman -Syu --noconfirm
pacman -S --noconfirm \
    base-devel \
    git \
    curl \
    wget \
    sudo \
    python \
    python-pip \
    python-setuptools \
    ruby \
    go \
    golang \
    rust \
    cargo \
    nmap \
    openssl \
    sqlite \
    which \
    gawk \
    grep \
    sed \
    coreutils \
    findutils \
    procps \
    masscan \
    wfuzz \
    whatweb \
    dirb \
    dirbuster \
    skipfish \
    wapiti \
    testssl.sh \
    sslscan

print_success "Basic dependencies installed successfully"

# Install Python dependencies
print_status "Installing Python dependencies..."
pip install --upgrade pip
pip install \
    requests \
    beautifulsoup4 \
    lxml \
    pyyaml \
    python-whois \
    cryptography \
    paramiko \
    scapy \
    dirsearch \
    subfinder \
    httpx \
    waybackurls \
    gau \
    gf \
    subjack \
    subzy \
    assetfinder \
    findomain \
    amass \
    aquatone \
    eyewitness \
    theHarvester \
    photon \
    linkfinder \
    jsbeautifier \
    pyjsparser

print_success "Python dependencies installed successfully"

# Set up Go environment
print_status "Setting up Go environment..."
export GOPATH=/go
export PATH=$PATH:$GOPATH/bin
mkdir -p /go/src /go/bin

# Install Go tools
print_status "Installing Go-based security tools..."
go install github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest
go install github.com/OJ/gobuster/v3@latest
go install github.com/tomnomnom/httprobe@latest
go install github.com/tomnomnom/ffuf@latest
go install github.com/OWASP/Amass/v3/...@master
go install github.com/zmap/zmap@latest
go install github.com/ffuf/ffuf@latest
go install github.com/projectdiscovery/httpx/cmd/httpx@latest
go install github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest
go install github.com/projectdiscovery/naabu/v2/cmd/naabu@latest
go install github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest
go install github.com/tomnomnom/assetfinder@latest
go install github.com/lc/gau@latest
go install github.com/tomnomnom/waybackurls@latest
go install github.com/tomnomnom/hacks@latest
go install github.com/1ndianl33t/glide@latest
go install github.com/s0md3v/Arjun@latest
go install github.com/s0md3v/Smap@latest
go install github.com/s0md3v/XSStrike@latest
go install github.com/ethicalhackingplayground/CorsMe@latest
go install github.com/edoardottt/litarella@latest
go install github.com/k6x6n/crlfuzz@latest
go install github.com/dwisiswant0/crlfuzz@latest
go install github.com/hakluke/hakrawler@latest
go install github.com/hakluke/hakrevdns@latest
go install github.com/hakluke/hakoriginfinder@latest
go install github.com/hakluke/hakcheckurl@latest
go install github.com/hakluke/haklist@latest
go install github.com/hakluke/hakip2host@latest
go install github.com/hakluke/haksubfinder@latest

print_success "Go tools installed successfully"

# Install Nikto
print_status "Installing Nikto..."
git clone --depth 1 https://github.com/sullo/nikto.git /opt/nikto
cd /opt/nikto
perl -MCPAN -e 'install JSON::PP'
chmod +x nikto.pl
ln -s /opt/nikto/nikto.pl /usr/local/bin/nikto
cd /

print_success "Nikto installed successfully"

# Install SQLMap
print_status "Installing SQLMap..."
git clone --depth 1 https://github.com/sqlmapproject/sqlmap.git /opt/sqlmap
chmod +x /opt/sqlmap/sqlmap.py
ln -s /opt/sqlmap/sqlmap.py /usr/local/bin/sqlmap

print_success "SQLMap installed successfully"

# Install Commix
print_status "Installing Commix..."
git clone --depth 1 https://github.com/commixproject/commix.git /opt/commix
chmod +x /opt/commix/commix.py
ln -s /opt/commix/commix.py /usr/local/bin/commix

print_success "Commix installed successfully"

# Install Corsy
print_status "Installing Corsy..."
git clone --depth 1 https://github.com/s0md3v/Corsy.git /opt/corsy
cd /opt/corsy
pip install -r requirements.txt
chmod +x corsy.py
ln -s /opt/corsy/corsy.py /usr/local/bin/corsy
cd /

print_success "Corsy installed successfully"

# Install Nettacker
print_status "Installing Nettacker..."
git clone --depth 1 https://github.com/OsandaMalith/Nettacker.git /opt/nettacker
cd /opt/nettacker
pip install -r requirements.txt
chmod +x nettacker.py
ln -s /opt/nettacker/nettacker.py /usr/local/bin/nettacker
cd /

print_success "Nettacker installed successfully"

# Install Vuls
print_status "Installing Vuls..."
pacman -S --noconfirm go gcc git wget sqlite
export GOPATH=/go
export PATH=$PATH:$GOPATH/bin
mkdir -p /go/src/github.com/future-architect
cd /go/src/github.com/future-architect
git clone https://github.com/future-architect/vuls.git
cd vuls
make install
cd /

print_success "Vuls installed successfully"

# Install Ruby tools
print_status "Installing Ruby tools..."
gem install wpscan nikto dirb

print_success "Ruby tools installed successfully"

# Update nuclei templates
print_status "Updating Nuclei templates..."
nuclei -update-templates

print_success "Nuclei templates updated successfully"

# Create tools directory
print_status "Creating tools directory..."
mkdir -p /tools
cp -r /opt/* /tools/ 2>/dev/null || true
cp -r /go/bin/* /tools/ 2>/dev/null || true

# Create verification script
print_status "Creating verification script..."
cat > /tools/verify-tools.sh << 'EOF'
#!/bin/bash

echo "🛡️  Verifying Security Tools Installation"
echo "============================================="

tools=("nmap" "nikto" "sqlmap" "commix" "corsy" "nettacker" "nuclei" "masscan" "testssl.sh" "sslscan" "gobuster" "ffuf" "subfinder" "httpx" "amass" "wpscan")

for tool in "${tools[@]}"; do
    if command -v "$tool" >/dev/null 2>&1; then
        echo "✓ $tool is installed"
    else
        echo "✗ $tool is not installed"
    fi
done

echo ""
echo "Go tools in /tools directory:"
ls -la /tools/ | grep -E "(nuclei|gobuster|ffuf|subfinder|httpx|amass)" || echo "No Go tools found"

echo ""
echo "Python tools in /tools directory:"
ls -la /tools/ | grep -E "\.py$" || echo "No Python tools found"

echo ""
echo "Perl tools in /tools directory:"
ls -la /tools/ | grep -E "\.pl$" || echo "No Perl tools found"
EOF

chmod +x /tools/verify-tools.sh

# Set proper permissions
print_status "Setting proper permissions..."
chmod -R 755 /tools
chmod -R +x /tools/*.py 2>/dev/null || true
chmod -R +x /tools/*.pl 2>/dev/null || true

# Create entrypoint script
print_status "Creating entrypoint script..."
cat > /tools/entrypoint.sh << 'EOF'
#!/bin/bash

echo "🛡️  Security Tools Container"
echo "============================="
echo "Available tools in /tools directory"
echo "Run '/tools/verify-tools.sh' to verify installation"
echo ""
exec "$@"
EOF

chmod +x /tools/entrypoint.sh

print_success "Installation completed successfully!"
echo ""
echo "🎉 All security tools have been installed successfully!"
echo ""
echo "📋 Quick Start:"
echo "   1. Run '/tools/verify-tools.sh' to verify installation"
echo "   2. Tools are available in /tools directory"
echo "   3. Most tools are also available in /usr/local/bin"
echo ""
echo "🛡️  Available Tools:"
echo "   • Nmap - Network scanning"
echo "   • Nikto - Web server scanning"
echo "   • SQLMap - SQL injection detection"
echo "   • Commix - Command injection detection"
echo "   • Corsy - CORS misconfiguration detection"
echo "   • Nettacker - Network penetration testing"
echo "   • Nuclei - Vulnerability scanning"
echo "   • Masscan - Fast port scanning"
echo "   • TestSSL.sh - SSL/TLS testing"
echo "   • And many more..."
echo ""
echo "🔧 Verification:"
echo "   /tools/verify-tools.sh"

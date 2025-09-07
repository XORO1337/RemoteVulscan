# syntax=docker/dockerfile:1

# Multi-stage Dockerfile for RemoteVulscan Backend with Security Tools
# This Dockerfile creates a self-contained backend that includes all security tools

# -----------------------
# Base image with system dependencies
# -----------------------
FROM node:20-alpine AS base

# Install system dependencies and security tools
RUN apk add --no-cache \
    # Basic system tools
    bash \
    curl \
    wget \
    git \
    ca-certificates \
    openssl \
    sqlite \
    # Build dependencies
    build-base \
    linux-headers \
    python3 \
    python3-dev \
    py3-pip \
    # Network tools
    nmap \
    nmap-scripts \
    masscan \
    # SSL/TLS tools
    openssl \
    # Additional utilities
    bind-tools \
    netcat-openbsd \
    tcpdump \
    # Perl for some security tools
    perl \
    perl-dev \
    # Ruby for some tools
    ruby \
    ruby-dev \
    # Go for building tools
    go \
    # Text processing tools
    jq \
    xmlstarlet \
    # Archive tools
    unzip \
    tar \
    gzip

# Set environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV TOOLS_PATH=/usr/local/bin
ENV PATH="/usr/local/bin:/usr/bin:/bin:/sbin:/usr/sbin:/go/bin:${PATH}"
ENV GOPATH=/go
ENV GOCACHE=/tmp/go-cache

# Create tools directory
RUN mkdir -p /tools /go/bin /go/src

# -----------------------
# Security Tools Installation Stage
# -----------------------
FROM base AS tools-installer

# Install Python security tools
RUN pip3 install --no-cache-dir --break-system-packages \
    requests \
    beautifulsoup4 \
    lxml \
    pyyaml \
    cryptography \
    paramiko \
    scapy \
    dirsearch \
    httpx \
    # Additional Python tools
    wapiti3 \
    sqlmap \
    commix

# Install Go-based security tools
RUN go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest && \
    go install -v github.com/OJ/gobuster/v3@latest && \
    go install -v github.com/ffuf/ffuf@latest && \
    go install -v github.com/projectdiscovery/httpx/cmd/httpx@latest && \
    go install -v github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest && \
    go install -v github.com/projectdiscovery/naabu/v2/cmd/naabu@latest && \
    go install -v github.com/tomnomnom/assetfinder@latest && \
    go install -v github.com/lc/gau/v2/cmd/gau@latest && \
    go install -v github.com/tomnomnom/waybackurls@latest

# Install Nikto web scanner
RUN git clone --depth 1 https://github.com/sullo/nikto.git /opt/nikto && \
    cd /opt/nikto && \
    chmod +x nikto.pl && \
    ln -sf /opt/nikto/nikto.pl /usr/local/bin/nikto

# Install TestSSL.sh
RUN git clone --depth 1 https://github.com/drwetter/testssl.sh.git /opt/testssl && \
    chmod +x /opt/testssl/testssl.sh && \
    ln -sf /opt/testssl/testssl.sh /usr/local/bin/testssl.sh

# Install SSLScan
RUN git clone --depth 1 https://github.com/rbsec/sslscan.git /opt/sslscan && \
    cd /opt/sslscan && \
    make static && \
    cp sslscan /usr/local/bin/

# Install WhatWeb
RUN git clone --depth 1 https://github.com/urbanadventurer/WhatWeb.git /opt/whatweb && \
    chmod +x /opt/whatweb/whatweb && \
    ln -sf /opt/whatweb/whatweb /usr/local/bin/whatweb

# Install additional Ruby tools
RUN gem install wpscan --no-document

# Update Nuclei templates
RUN nuclei -update-templates -silent || true

# Create tools verification script
RUN cat > /usr/local/bin/verify-tools.sh << 'EOF'
#!/bin/bash
echo "🛡️  Verifying Security Tools Installation"
echo "=========================================="

tools=("nmap" "nikto" "nuclei" "testssl.sh" "sslscan" "sqlmap" "gobuster" "ffuf" "whatweb" "masscan" "httpx" "subfinder" "dirsearch")

available=0
total=${#tools[@]}

for tool in "${tools[@]}"; do
    if command -v "$tool" >/dev/null 2>&1; then
        version=$($tool --version 2>&1 | head -n 1 | grep -oE '[0-9]+\.[0-9]+(\.[0-9]+)?' | head -n 1 || echo "unknown")
        echo "✓ $tool is available (version: $version)"
        ((available++))
    else
        echo "✗ $tool is not available"
    fi
done

echo ""
echo "Summary: $available/$total tools available"

if [ $available -eq $total ]; then
    echo "🎉 All security tools are properly installed!"
    exit 0
else
    echo "⚠️  Some tools are missing. Check installation."
    exit 1
fi
EOF

RUN chmod +x /usr/local/bin/verify-tools.sh

# -----------------------
# Node.js Dependencies Stage
# -----------------------
FROM base AS deps

WORKDIR /app

# Copy package files
COPY backend/package*.json backend/package-lock.json ./

# Install Node.js dependencies
RUN npm ci --omit=dev && \
    npm cache clean --force

# -----------------------
# Application Build Stage
# -----------------------
FROM base AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY backend/ ./

# Generate Prisma client
RUN npx prisma generate

# Build TypeScript application
RUN npm run build

# -----------------------
# Final Runtime Stage
# -----------------------
FROM base AS runtime

# Copy security tools from tools-installer stage
COPY --from=tools-installer /usr/local/bin/ /usr/local/bin/
COPY --from=tools-installer /opt/ /opt/
COPY --from=tools-installer /go/bin/ /usr/local/bin/
COPY --from=tools-installer /usr/lib/python3.11/site-packages/ /usr/lib/python3.11/site-packages/

# Create application user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S backend -u 1001 -G nodejs && \
    # Create necessary directories
    mkdir -p /app/data /app/logs /app/reports /tmp/scans && \
    # Set permissions
    chown -R backend:nodejs /app /tmp/scans && \
    chmod -R 755 /app /tmp/scans

WORKDIR /app

# Copy built application
COPY --from=builder --chown=backend:nodejs /app/dist ./dist
COPY --from=builder --chown=backend:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=backend:nodejs /app/package*.json ./
COPY --from=builder --chown=backend:nodejs /app/prisma ./prisma

# Copy startup script
COPY --chown=backend:nodejs backend/scripts/start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Switch to non-root user
USER backend

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8000/api/v1/health || exit 1

# Environment variables (can be overridden at runtime)
ENV DATABASE_URL="file:./data/db/custom.db"
ENV PORT=8000
ENV NODE_ENV=production
ENV TOOLS_PATH=/usr/local/bin
ENV MAX_CONCURRENT_EXECUTIONS=5

# Start the application
CMD ["/app/start.sh"]
# Backend API + Security Tools Container
FROM node:20-alpine AS base

# Install system dependencies and security tools
RUN apk add --no-cache \
    bash \
    curl \
    wget \
    git \
    python3 \
    py3-pip \
    nmap \
    openssl \
    sqlite \
    build-base \
    linux-headers \
    ca-certificates

# Set working directory
WORKDIR /app

# Install Node.js dependencies
COPY backend/package*.json ./
RUN npm ci --only=production

# Install security tools
RUN mkdir -p /tools && \
    # Install Nuclei
    wget -O /tmp/nuclei.zip https://github.com/projectdiscovery/nuclei/releases/latest/download/nuclei_3.1.0_linux_amd64.zip && \
    unzip /tmp/nuclei.zip -d /tools && \
    chmod +x /tools/nuclei && \
    # Install additional Python tools
    pip3 install --break-system-packages requests beautifulsoup4 && \
    # Create tools verification script
    echo '#!/bin/bash\necho "Verifying tools..."\nwhich nmap && which openssl && ls -la /tools/nuclei' > /tools/verify.sh && \
    chmod +x /tools/verify.sh

# Copy application code
COPY backend/src ./src
COPY backend/prisma ./prisma

# Generate Prisma client
RUN npx prisma generate

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S backend -u 1001 -G nodejs

# Set permissions
RUN chown -R backend:nodejs /app /tools
USER backend

# Expose API port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/api/v1/health || exit 1

# Start the backend API server
CMD ["npm", "start"]

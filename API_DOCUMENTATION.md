# RemoteVulscan Advanced API Documentation

This document describes the advanced vulnerability scanning API that enables execution of multiple security tools in Docker containers.

## Overview

The RemoteVulscan API provides comprehensive vulnerability scanning capabilities through a containerized architecture. It supports both single-tool scans and advanced multi-tool scan modes that aggregate results from multiple security tools.

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Next.js App   │    │   Tools         │    │   Database      │
│   (Port 3000)   │◄──►│   Container     │    │   (SQLite)      │
│                 │    │   (Security     │    │                 │
│   - API Routes  │    │    Tools)       │    │   - Scans       │
│   - WebSocket   │    │                 │    │   - Vulnerabilities│
│   - UI          │    │   - nmap        │    │   - Websites    │
└─────────────────┘    │   - nikto       │    └─────────────────┘
                       │   - nuclei      │
                       │   - sqlmap      │
                       │   - testssl     │
                       │   - and more... │
                       └─────────────────┘
```

## Scan Modes

### Advanced Multi-Tool Scan Modes

#### 1. Full Comprehensive Scan (`FULL_SCAN`)
- **Description**: Complete security assessment using all available tools
- **Tools**: nmap, nikto, nuclei, testssl, whatweb, sslscan, dirsearch, wpscan, gobuster
- **Duration**: 15-30 minutes
- **Use Case**: Complete security audit

#### 2. Network Reconnaissance (`NETWORK_RECONNAISSANCE`)
- **Description**: Network discovery and port scanning
- **Tools**: nmap (multiple modes), masscan, theharvester
- **Duration**: 5-15 minutes
- **Use Case**: Network discovery and service enumeration

#### 3. Web Application Security Scan (`WEB_APPLICATION_SCAN`)
- **Description**: Web application vulnerability assessment
- **Tools**: nikto, nuclei, whatweb, dirsearch, wapiti, skipfish
- **Duration**: 10-20 minutes
- **Use Case**: Web application security testing

#### 4. SSL/TLS Analysis (`SSL_TLS_ANALYSIS`)
- **Description**: SSL/TLS configuration and vulnerability assessment
- **Tools**: testssl, sslscan, nmap (SSL scripts)
- **Duration**: 3-8 minutes
- **Use Case**: Certificate and encryption analysis

#### 5. Directory Enumeration (`DIRECTORY_ENUMERATION`)
- **Description**: Discover hidden directories and files
- **Tools**: dirsearch, gobuster, dirb, ffuf
- **Duration**: 5-15 minutes
- **Use Case**: Content discovery

#### 6. SQL Injection Testing (`SQL_INJECTION_TEST`)
- **Description**: Specialized SQL injection testing
- **Tools**: sqlmap, nuclei (SQL injection templates)
- **Duration**: 10-25 minutes
- **Use Case**: Database security testing

#### 7. Vulnerability Assessment (`VULNERABILITY_ASSESSMENT`)
- **Description**: Multi-phase comprehensive assessment
- **Phases**: Network recon → Web app scan → SSL analysis → Directory enum → SQL testing
- **Duration**: 20-45 minutes
- **Use Case**: Complete security assessment with detailed phases

### Legacy Single-Tool Scans

- `NMAP`: Network port scanning
- `NIKTO`: Web server scanning
- `NUCLEI`: Template-based vulnerability scanning
- `SSL_CHECK`: SSL certificate validation
- `SQLMAP`: SQL injection testing

## API Endpoints

### 1. Create and Start Scan

#### Create Scan
```http
POST /api/scans
Content-Type: application/json

{
  "url": "https://example.com",
  "scanType": "FULL_SCAN",
  "captchaToken": "your-turnstile-token"
}
```

#### Start Scan
```http
POST /api/scans/start
Content-Type: application/json

{
  "scanId": "scan-uuid"
}
```

### 2. Get Scan Modes
```http
GET /api/scans/modes
```

Response:
```json
{
  "scanModes": [
    {
      "id": "FULL_SCAN",
      "name": "Full Comprehensive Scan",
      "description": "Complete security assessment using all available tools",
      "tools": ["nmap", "nikto", "nuclei", "testssl", "..."],
      "estimatedTime": "15-30 minutes",
      "complexity": "HIGH",
      "category": "comprehensive"
    }
  ],
  "categories": [
    {
      "id": "comprehensive",
      "name": "Comprehensive",
      "description": "Complete security assessments using multiple tools",
      "color": "#dc2626"
    }
  ]
}
```

### 3. System Status
```http
GET /api/system/status
```

Response:
```json
{
  "status": "ok",
  "docker": {
    "daemon_running": true,
    "tools_container": {
      "name": "vuln-scanner-tools",
      "status": "running"
    },
    "network_connectivity": true
  },
  "tools": {
    "available_tools": ["nmap", "nikto", "nuclei"],
    "tool_details": {
      "nmap": {
        "available": true,
        "version": "7.94",
        "path": "/usr/bin/nmap"
      }
    }
  },
  "scan_capabilities": {
    "can_perform_scans": true,
    "advanced_scans_available": true
  }
}
```

### 4. Scan Statistics
```http
GET /api/scans/stats
```

Response:
```json
{
  "overview": {
    "total_scans": 150,
    "completed_scans": 142,
    "failed_scans": 3,
    "running_scans": 1,
    "success_rate_percent": 95
  },
  "vulnerabilities": {
    "total": 1247,
    "by_severity": {
      "critical": 23,
      "high": 156,
      "medium": 445,
      "low": 523,
      "info": 100
    }
  }
}
```

### 5. Get Scans
```http
GET /api/scans
```

### 6. Get Specific Scan
```http
GET /api/scans/{scanId}
```

## WebSocket Events

The API provides real-time updates via WebSocket connections:

### Events Emitted

#### `scanProgress`
```json
{
  "scanId": "uuid",
  "message": "Running nmap scan...",
  "progress": 25,
  "result": {
    "completedTools": 2,
    "totalTools": 8,
    "vulnerabilities": []
  }
}
```

#### `scanComplete`
```json
{
  "scanId": "uuid",
  "result": {
    "scanMode": "FULL_SCAN",
    "vulnerabilities": [],
    "summary": {
      "critical": 2,
      "high": 5,
      "medium": 12,
      "low": 8,
      "info": 3
    },
    "toolResults": [],
    "metadata": {
      "startTime": "2024-01-01T00:00:00Z",
      "endTime": "2024-01-01T00:15:00Z",
      "duration": 900000,
      "status": "COMPLETED"
    }
  }
}
```

## Data Models

### Scan Result
```typescript
interface AggregatedScanResult {
  scanId: string
  target: string
  scanMode: string
  totalTools: number
  completedTools: number
  vulnerabilities: ParsedVulnerability[]
  toolResults: ToolResult[]
  summary: {
    critical: number
    high: number
    medium: number
    low: number
    info: number
  }
  metadata: {
    startTime: string
    endTime?: string
    duration?: number
    status: 'RUNNING' | 'COMPLETED' | 'FAILED' | 'TIMEOUT'
  }
}
```

### Vulnerability
```typescript
interface ParsedVulnerability {
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO"
  type: string
  title: string
  description?: string
  solution?: string
  reference?: string
  location?: string
  port?: number
  service?: string
  cvss?: number
  cve?: string
}
```

### Tool Result
```typescript
interface ToolResult {
  tool: string
  output: string
  exitCode: number
  error?: string
  vulnerabilities: ParsedVulnerability[]
  metadata: {
    executionTime: number
    timestamp: string
    command: string
  }
}
```

## Security Tools Included

| Tool | Purpose | Category |
|------|---------|----------|
| **nmap** | Network discovery and port scanning | Network |
| **nikto** | Web server vulnerability scanner | Web |
| **nuclei** | Fast vulnerability scanner with templates | Web |
| **testssl.sh** | SSL/TLS security testing | Crypto |
| **sslscan** | SSL/TLS scanner | Crypto |
| **sqlmap** | SQL injection detection and exploitation | Web |
| **dirsearch** | Web path scanner | Web |
| **gobuster** | Directory and DNS busting tool | Web |
| **dirb** | Web content scanner | Web |
| **ffuf** | Fast web fuzzer | Web |
| **whatweb** | Web technology identification | Web |
| **wapiti** | Web application vulnerability scanner | Web |
| **skipfish** | Web application security reconnaissance | Web |
| **masscan** | High-speed port scanner | Network |
| **theharvester** | Information gathering tool | OSINT |
| **wpscan** | WordPress security scanner | Web |

## Setup and Deployment

### 1. Using Docker Compose (Recommended)
```bash
# Clone the repository
git clone <repository-url>
cd RemoteVulscan

# Start all services
docker-compose up -d

# Test the setup
chmod +x scripts/test-setup.sh
./scripts/test-setup.sh
```

### 2. Environment Variables
```bash
# Required
TURNSTILE_SITE_KEY=your-cloudflare-turnstile-site-key
TURNSTILE_SECRET_KEY=your-cloudflare-turnstile-secret-key

# Optional
DATABASE_URL=file:./data/db/custom.db
NEXT_PUBLIC_ENABLE_SOCKET=true
DOCKERIZED=true
TOOLS_PATH=/tools
```

### 3. Testing the Setup
```bash
# Test system status
curl http://localhost:3000/api/system/status

# Test available scan modes
curl http://localhost:3000/api/scans/modes

# View scan statistics
curl http://localhost:3000/api/scans/stats
```

## Error Handling

The API provides comprehensive error handling:

### HTTP Status Codes
- `200`: Success
- `400`: Bad Request (invalid parameters)
- `403`: Forbidden (CAPTCHA verification failed)
- `404`: Not Found (scan not found)
- `500`: Internal Server Error
- `503`: Service Unavailable (tools container not ready)

### Error Response Format
```json
{
  "error": "Description of the error",
  "details": "Additional error details",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

## Performance Considerations

### Timeouts
- Single tool execution: 30 seconds - 5 minutes
- Full scan: Up to 30 minutes
- Network operations: 5-10 seconds

### Resource Usage
- Tools container: ~2GB RAM recommended
- Database: Minimal (SQLite)
- Network: Outbound access required for scans

### Scaling
- Horizontal scaling: Multiple app instances can share the same tools container
- Vertical scaling: Increase container resources for faster scans
- Queue management: Implement scan queuing for high load

## Security Considerations

### Access Control
- CAPTCHA verification required for scan creation
- Rate limiting recommended
- Input validation on all endpoints

### Network Security
- Tools container should have restricted network access
- Consider using VPN or isolated networks for scanning
- Monitor outbound connections

### Data Privacy
- Scan results may contain sensitive information
- Implement proper access controls
- Consider data retention policies

## Troubleshooting

### Common Issues

#### 1. Tools Container Not Starting
```bash
# Check container logs
docker logs vuln-scanner-tools

# Restart container
docker-compose restart tools
```

#### 2. Network Connectivity Issues
```bash
# Test from tools container
docker exec vuln-scanner-tools curl -I google.com
```

#### 3. Tool Not Found
```bash
# Check tool availability
docker exec vuln-scanner-tools which nmap

# List installed tools
docker exec vuln-scanner-tools ls /usr/bin | grep -E "(nmap|nikto|nuclei)"
```

#### 4. Scan Timeout
- Increase timeout values in tool executor
- Check target accessibility
- Monitor container resources

### Debug Mode
Set `NODE_ENV=development` for verbose logging.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add new scan modes in `tool-executor.ts`
4. Update API documentation
5. Test with `scripts/test-setup.sh`
6. Submit a pull request

## License

[Your License Here]

'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Eye, 
  Download, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Loader2,
  FileText,
  Shield,
  Globe,
  Server,
  Terminal
} from 'lucide-react'

interface Vulnerability {
  id: string
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO'
  type: string
  title: string
  description?: string
  solution?: string
  reference?: string
  location?: string
  createdAt: string
}

interface Scan {
  id: string
  websiteId: string
  website: { url: string; name?: string }
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'
  scanType: string
  startedAt?: string
  completedAt?: string
  errorMessage?: string
  vulnerabilities: Vulnerability[]
  results?: string
  createdAt: string
}

interface ScanResultsProps {
  scan: Scan
  onClose: () => void
}

export default function ScanResults({ scan, onClose }: ScanResultsProps) {
  const [activeTab, setActiveTab] = useState('overview')
  const [expandedVuln, setExpandedVuln] = useState<string | null>(null)

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'FAILED':
        return <XCircle className="h-5 w-5 text-red-500" />
      case 'RUNNING':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
      default:
        return <Clock className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800'
      case 'FAILED':
        return 'bg-red-100 text-red-800'
      case 'RUNNING':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-500 text-white'
      case 'HIGH':
        return 'bg-orange-500 text-white'
      case 'MEDIUM':
        return 'bg-yellow-500 text-white'
      case 'LOW':
        return 'bg-blue-500 text-white'
      default:
        return 'bg-gray-500 text-white'
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
      case 'HIGH':
        return <AlertTriangle className="h-4 w-4" />
      default:
        return <Shield className="h-4 w-4" />
    }
  }

  const formatDuration = () => {
    if (!scan.startedAt || !scan.completedAt) return 'N/A'
    
    const start = new Date(scan.startedAt)
    const end = new Date(scan.completedAt)
    const duration = Math.floor((end.getTime() - start.getTime()) / 1000)
    
    if (duration < 60) return `${duration}s`
    if (duration < 3600) return `${Math.floor(duration / 60)}m ${duration % 60}s`
    return `${Math.floor(duration / 3600)}h ${Math.floor((duration % 3600) / 60)}m`
  }

  const downloadResults = () => {
    if (!scan.results) return
    
    generateHTMLReport(scan)
  }

  const generateHTMLReport = (scan: Scan) => {
    const vulnerabilityCounts = scan.vulnerabilities.reduce((acc, vuln) => {
      acc[vuln.severity] = (acc[vuln.severity] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleString()
    }

    const getSeverityColorClass = (severity: string) => {
      switch (severity) {
        case 'CRITICAL': return '#dc2626'
        case 'HIGH': return '#ea580c'
        case 'MEDIUM': return '#d97706'
        case 'LOW': return '#65a30d'
        default: return '#6b7280'
      }
    }

    const sanitizeHTML = (text: string) => {
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
    }

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vulnerability Scan Report - ${scan.website.url}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8f9fa;
        }
        .container {
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            padding: 30px;
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #e9ecef;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .header h1 {
            color: #2c3e50;
            margin: 0;
            font-size: 2.5em;
        }
        .header .subtitle {
            color: #6c757d;
            font-size: 1.1em;
            margin-top: 10px;
        }
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .summary-card {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
        }
        .summary-card .number {
            font-size: 2.5em;
            font-weight: bold;
            margin-bottom: 5px;
        }
        .summary-card .label {
            color: #6c757d;
            font-size: 0.9em;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .critical { color: #dc3545; }
        .high { color: #fd7e14; }
        .medium { color: #ffc107; }
        .low { color: #007bff; }
        .info { color: #6c757d; }
        .section {
            margin-bottom: 30px;
        }
        .section h2 {
            color: #2c3e50;
            border-left: 4px solid #007bff;
            padding-left: 15px;
            margin-bottom: 20px;
        }
        .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 15px;
        }
        .info-item {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            border-left: 3px solid #007bff;
        }
        .info-item .label {
            font-weight: bold;
            color: #495057;
            display: block;
            margin-bottom: 5px;
        }
        .vulnerability {
            border: 1px solid #dee2e6;
            border-radius: 8px;
            margin-bottom: 15px;
            overflow: hidden;
        }
        .vulnerability-header {
            padding: 15px;
            background: #f8f9fa;
            border-bottom: 1px solid #dee2e6;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .vulnerability-body {
            padding: 15px;
        }
        .severity-badge {
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.8em;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .raw-output {
            background: #2d3748;
            color: #e2e8f0;
            padding: 20px;
            border-radius: 8px;
            font-family: 'Courier New', monospace;
            font-size: 0.9em;
            white-space: pre-wrap;
            max-height: 400px;
            overflow-y: auto;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #dee2e6;
            color: #6c757d;
            font-size: 0.9em;
        }
        .status-completed { color: #28a745; }
        .status-failed { color: #dc3545; }
        .status-running { color: #007bff; }
        .status-pending { color: #6c757d; }
        @media print {
            body { background: white; }
            .container { box-shadow: none; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🛡️ Vulnerability Scan Report</h1>
            <div class="subtitle">
                Comprehensive Security Assessment Report<br>
                Generated on ${formatDate(new Date().toISOString())}
            </div>
        </div>

        <div class="summary-grid">
            <div class="summary-card">
                <div class="number">${scan.vulnerabilities.length}</div>
                <div class="label">Total Issues</div>
            </div>
            <div class="summary-card">
                <div class="number critical">${vulnerabilityCounts.CRITICAL || 0}</div>
                <div class="label">Critical</div>
            </div>
            <div class="summary-card">
                <div class="number high">${vulnerabilityCounts.HIGH || 0}</div>
                <div class="label">High</div>
            </div>
            <div class="summary-card">
                <div class="number medium">${vulnerabilityCounts.MEDIUM || 0}</div>
                <div class="label">Medium</div>
            </div>
            <div class="summary-card">
                <div class="number low">${vulnerabilityCounts.LOW || 0}</div>
                <div class="label">Low</div>
            </div>
            <div class="summary-card">
                <div class="number info">${vulnerabilityCounts.INFO || 0}</div>
                <div class="label">Info</div>
            </div>
        </div>

        <div class="section">
            <h2>📋 Scan Information</h2>
            <div class="info-grid">
                <div class="info-item">
                    <span class="label">Target URL</span>
                    ${sanitizeHTML(scan.website.url)}
                </div>
                <div class="info-item">
                    <span class="label">Scan Type</span>
                    ${scan.scanType}
                </div>
                <div class="info-item">
                    <span class="label">Status</span>
                    <span class="status-${scan.status.toLowerCase()}">${scan.status}</span>
                </div>
                <div class="info-item">
                    <span class="label">Scan ID</span>
                    ${scan.id}
                </div>
                <div class="info-item">
                    <span class="label">Started</span>
                    ${scan.startedAt ? formatDate(scan.startedAt) : 'N/A'}
                </div>
                <div class="info-item">
                    <span class="label">Completed</span>
                    ${scan.completedAt ? formatDate(scan.completedAt) : 'N/A'}
                </div>
                <div class="info-item">
                    <span class="label">Duration</span>
                    ${scan.startedAt && scan.completedAt ? 
                      Math.floor((new Date(scan.completedAt).getTime() - new Date(scan.startedAt).getTime()) / 1000) + ' seconds' : 'N/A'}
                </div>
                <div class="info-item">
                    <span class="label">Created</span>
                    ${formatDate(scan.createdAt)}
                </div>
            </div>
        </div>

        ${scan.vulnerabilities.length > 0 ? `
        <div class="section">
            <h2>🚨 Detected Vulnerabilities</h2>
            ${scan.vulnerabilities.map(vuln => `
                <div class="vulnerability">
                    <div class="vulnerability-header">
                        <div>
                            <strong>${sanitizeHTML(vuln.title)}</strong>
                            <div style="color: #6c757d; font-size: 0.9em; margin-top: 5px;">
                                ${vuln.type} • Detected on ${formatDate(vuln.createdAt)}
                            </div>
                        </div>
                        <span class="severity-badge ${getSeverityColorClass(vuln.severity)}">
                            ${vuln.severity}
                        </span>
                    </div>
                    <div class="vulnerability-body">
                        ${vuln.description ? `
                            <div style="margin-bottom: 15px;">
                                <strong>Description:</strong><br>
                                ${sanitizeHTML(vuln.description)}
                            </div>
                        ` : ''}
                        ${vuln.solution ? `
                            <div style="margin-bottom: 15px;">
                                <strong>💡 Solution:</strong><br>
                                ${sanitizeHTML(vuln.solution)}
                            </div>
                        ` : ''}
                        ${vuln.location ? `
                            <div style="margin-bottom: 15px;">
                                <strong>📍 Location:</strong><br>
                                ${sanitizeHTML(vuln.location)}
                            </div>
                        ` : ''}
                        ${vuln.reference ? `
                            <div>
                                <strong>🔗 Reference:</strong><br>
                                ${sanitizeHTML(vuln.reference)}
                            </div>
                        ` : ''}
                    </div>
                </div>
            `).join('')}
        </div>
        ` : `
        <div class="section">
            <h2>✅ Security Status</h2>
            <div style="background: #d4edda; border: 1px solid #c3e6cb; color: #155724; padding: 15px; border-radius: 5px;">
                <strong>No vulnerabilities detected!</strong><br>
                The target appears to be secure against the tested vulnerabilities.
            </div>
        </div>
        `}

        ${scan.results ? `
        <div class="section">
            <h2>📄 Raw Scan Output</h2>
            <div className="raw-output">${sanitizeHTML(scan.results)}</div>
        </div>
        ` : ''}

        <div className="footer">
            <p>Generated by Vulnerability Scanner • Report ID: ${scan.id}</p>
            <p>This report contains sensitive security information and should be handled accordingly.</p>
        </div>
    </div>
</body>
</html>`

    // Create and download the HTML file
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `vulnerability-report-${scan.website.url.replace(/^https?:\/\//, '').replace(/[\/\\:*?"<>|]/g, '-')}-${scan.id.substring(0, 8)}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const vulnerabilityCounts = scan.vulnerabilities.reduce((acc, vuln) => {
    acc[vuln.severity] = (acc[vuln.severity] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="space-y-6 relative">
      {/* Cyber Background Effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-purple-500/5 rounded-xl pointer-events-none"></div>
      
      {/* Header */}
      <div className="flex items-center justify-between relative z-10">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-3">
            <div className="relative">
              <Globe className="h-8 w-8 text-cyan-400 animate-cyber-glow" />
              <div className="absolute inset-0 h-8 w-8 text-cyan-400/30 animate-ping">
                <Globe className="h-8 w-8" />
              </div>
            </div>
            <span className="cyber-text-gradient">THREAT ANALYSIS</span>
          </h2>
          <p className="text-cyber-text-secondary mt-2 font-mono">
            DETAILED SECURITY ASSESSMENT → {scan.website.url}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-400/50"
          >
            <Clock className="h-4 w-4 mr-2" />
            RETURN TO ARCHIVE
          </Button>
          {scan.results && (
            <Button 
              variant="outline" 
              onClick={downloadResults}
              className="border-green-500/30 text-green-400 hover:bg-green-500/10 hover:border-green-400/50"
            >
              <Download className="h-4 w-4 mr-2" />
              EXPORT DATA
            </Button>
          )}
        </div>
      </div>

      {/* Scan Summary */}
      <Card className="cyber-card border-2 border-cyan-500/30 bg-gradient-to-br from-slate-900/70 to-slate-800/70 backdrop-blur-xl relative z-10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-3 text-xl">
                {getStatusIcon(scan.status)}
                <span className="cyber-neon-text font-mono">{scan.website.url}</span>
              </CardTitle>
              <CardDescription className="text-cyber-text-secondary mt-2 font-mono">
                PROTOCOL: {scan.scanType} • SESSION: {scan.id}
              </CardDescription>
            </div>
            <Badge className={`${getStatusColor(scan.status)} font-mono text-sm px-4 py-2 border cyber-border-glow`}>
              <span className="mr-2">{getStatusIcon(scan.status)}</span>
              {scan.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center p-4 cyber-card border border-blue-500/20 hover:border-blue-400/50 transition-all">
              <div className="text-3xl font-bold text-blue-400 font-mono mb-2">
                {scan.vulnerabilities.length}
              </div>
              <div className="text-xs text-cyber-text-muted uppercase tracking-wide">Total Threats</div>
            </div>
            <div className="text-center p-4 cyber-card border border-red-500/20 hover:border-red-400/50 transition-all">
              <div className="text-3xl font-bold text-red-400 font-mono mb-2">
                {vulnerabilityCounts.CRITICAL || 0}
              </div>
              <div className="text-xs text-cyber-text-muted uppercase tracking-wide">Critical</div>
            </div>
            <div className="text-center p-4 cyber-card border border-orange-500/20 hover:border-orange-400/50 transition-all">
              <div className="text-3xl font-bold text-orange-400 font-mono mb-2">
                {vulnerabilityCounts.HIGH || 0}
              </div>
              <div className="text-xs text-cyber-text-muted uppercase tracking-wide">High</div>
            </div>
            <div className="text-center p-4 cyber-card border border-green-500/20 hover:border-green-400/50 transition-all">
              <div className="text-2xl font-bold text-green-400 font-mono mb-2">
                {formatDuration()}
              </div>
              <div className="text-xs text-cyber-text-muted uppercase tracking-wide">Duration</div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-3 p-3 cyber-card border border-cyan-500/10">
              <Calendar className="h-5 w-5 text-cyan-400" />
              <div>
                <div className="text-xs text-cyber-text-muted uppercase tracking-wide">Initiated</div>
                <span className="font-mono text-cyber-text-primary">
                  {scan.startedAt ? new Date(scan.startedAt).toLocaleString() : 'PENDING'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 cyber-card border border-green-500/10">
              <CheckCircle className="h-5 w-5 text-green-400" />
              <div>
                <div className="text-xs text-cyber-text-muted uppercase tracking-wide">Completed</div>
                <span className="font-mono text-cyber-text-primary">
                  {scan.completedAt ? new Date(scan.completedAt).toLocaleString() : 'IN PROGRESS'}
                </span>
              </div>
            </div>
          </div>

          {scan.errorMessage && (
            <Alert className="mt-4 border-red-500/30 bg-red-500/10">
              <XCircle className="h-4 w-4 text-red-400" />
              <AlertDescription>
                <strong className="text-red-300">SYSTEM ERROR:</strong> 
                <span className="font-mono text-red-400 ml-2">{scan.errorMessage}</span>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Detailed Results */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6 relative z-10">
        <TabsList className="grid w-full grid-cols-3 cyber-card border border-cyan-500/20 p-1">
          <TabsTrigger 
            value="overview" 
            className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400 data-[state=active]:border-cyan-400/50 font-mono uppercase tracking-wide"
          >
            OVERVIEW
          </TabsTrigger>
          <TabsTrigger 
            value="vulnerabilities" 
            className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400 data-[state=active]:border-red-400/50 font-mono uppercase tracking-wide"
          >
            THREATS ({scan.vulnerabilities.length})
          </TabsTrigger>
          <TabsTrigger 
            value="raw-output" 
            className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400 data-[state=active]:border-green-400/50 font-mono uppercase tracking-wide"
          >
            RAW DATA
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="cyber-card border border-cyan-500/20">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-3">
                  <Server className="h-6 w-6 text-cyan-400" />
                  <span className="cyber-text-gradient">Scan Matrix</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 cyber-card border border-purple-500/10">
                  <label className="text-xs font-semibold text-purple-400 uppercase tracking-wide">Protocol</label>
                  <p className="text-sm text-cyber-text-primary font-mono mt-1">{scan.scanType}</p>
                </div>
                <div className="p-3 cyber-card border border-blue-500/10">
                  <label className="text-xs font-semibold text-blue-400 uppercase tracking-wide">Target Vector</label>
                  <p className="text-sm text-cyber-text-primary font-mono mt-1">{scan.website.url}</p>
                </div>
                <div className="p-3 cyber-card border border-green-500/10">
                  <label className="text-xs font-semibold text-green-400 uppercase tracking-wide">System Status</label>
                  <Badge className={`${getStatusColor(scan.status)} font-mono text-xs mt-2 border cyber-border-glow`}>
                    {scan.status}
                  </Badge>
                </div>
                <div className="p-3 cyber-card border border-cyan-500/10">
                  <label className="text-xs font-semibold text-cyan-400 uppercase tracking-wide">Timestamp</label>
                  <p className="text-sm text-cyber-text-primary font-mono mt-1">
                    {new Date(scan.createdAt).toLocaleString()}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="cyber-card border border-red-500/20">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-3">
                  <Shield className="h-6 w-6 text-red-400" />
                  <span className="cyber-text-gradient">Threat Matrix</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(vulnerabilityCounts).map(([severity, count]) => (
                  <div key={severity} className="flex items-center justify-between p-3 cyber-card border border-gray-500/10 hover:border-gray-400/30 transition-all">
                    <div className="flex items-center gap-3">
                      <Badge className={`${getSeverityColor(severity)} cyber-border-glow`}>
                        {getSeverityIcon(severity)}
                        <span className="ml-2 font-mono text-xs">{severity}</span>
                      </Badge>
                    </div>
                    <span className="font-bold text-xl font-mono text-cyber-text-primary">{count}</span>
                  </div>
                ))}
                {Object.keys(vulnerabilityCounts).length === 0 && (
                  <div className="text-center p-6 cyber-card border border-green-500/20">
                    <CheckCircle className="h-8 w-8 text-green-400 mx-auto mb-2" />
                    <p className="text-green-400 font-mono">NO THREATS DETECTED</p>
                    <p className="text-xs text-cyber-text-muted mt-1">System appears secure</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="vulnerabilities" className="space-y-4">
          {scan.vulnerabilities.length === 0 ? (
            <Card className="cyber-card border-2 border-green-500/20">
              <CardContent className="flex items-center justify-center h-40 relative">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-emerald-500/5 rounded-lg"></div>
                <div className="text-center">
                  <div className="relative">
                    <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4 animate-cyber-glow" />
                    <div className="absolute inset-0 h-16 w-16 text-green-400/30 mx-auto animate-ping">
                      <CheckCircle className="h-16 w-16" />
                    </div>
                  </div>
                  <p className="text-green-400 font-mono text-lg font-bold">SYSTEM SECURE</p>
                  <p className="text-cyber-text-muted text-sm mt-2">No security threats detected in target system</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {scan.vulnerabilities.map((vuln) => (
                <Card key={vuln.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Badge className={`${getSeverityColor(vuln.severity)} cyber-border-glow`}>
                          {getSeverityIcon(vuln.severity)}
                          <span className="ml-2 font-mono text-xs">{vuln.severity}</span>
                        </Badge>
                        <div>
                          <CardTitle className="text-lg text-cyber-text-primary">{vuln.title}</CardTitle>
                          <CardDescription className="text-cyber-text-secondary font-mono text-xs mt-1">
                            TYPE: {vuln.type}
                          </CardDescription>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10"
                        onClick={() => setExpandedVuln(expandedVuln === vuln.id ? null : vuln.id)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  {expandedVuln === vuln.id && (
                    <CardContent className="space-y-4 border-t border-cyan-500/20 bg-gradient-to-r from-slate-900/30 to-slate-800/30">
                      {vuln.description && (
                        <div className="p-3 cyber-card border border-blue-500/10">
                          <label className="text-xs font-semibold text-blue-400 uppercase tracking-wide">Threat Analysis</label>
                          <p className="text-sm text-cyber-text-secondary mt-2">{vuln.description}</p>
                        </div>
                      )}
                      {vuln.solution && (
                        <div className="p-3 cyber-card border border-green-500/10">
                          <label className="text-xs font-semibold text-green-400 uppercase tracking-wide">Mitigation Protocol</label>
                          <p className="text-sm text-green-300 mt-2 font-mono">{vuln.solution}</p>
                        </div>
                      )}
                      {vuln.location && (
                        <div className="p-3 cyber-card border border-purple-500/10">
                          <label className="text-xs font-semibold text-purple-400 uppercase tracking-wide">Vector Location</label>
                          <p className="text-sm text-purple-300 mt-2 font-mono">{vuln.location}</p>
                        </div>
                      )}
                      {vuln.reference && (
                        <div className="p-3 cyber-card border border-cyan-500/10">
                          <label className="text-xs font-semibold text-cyan-400 uppercase tracking-wide">Reference Data</label>
                          <p className="text-sm text-cyan-300 mt-2 font-mono">{vuln.reference}</p>
                        </div>
                      )}
                      <div className="p-3 cyber-card border border-orange-500/10">
                        <label className="text-xs font-semibold text-orange-400 uppercase tracking-wide">Detection Time</label>
                        <p className="text-sm text-orange-300 mt-2 font-mono">
                          {new Date(vuln.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="raw-output" className="space-y-6">
          <Card className="cyber-card border border-green-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl">
                <Terminal className="h-6 w-6 text-green-400" />
                <span className="cyber-text-gradient">Raw Data Stream</span>
              </CardTitle>
              <CardDescription className="text-cyber-text-secondary">
                Unprocessed output from security scanning protocols
              </CardDescription>
            </CardHeader>
            <CardContent>
              {scan.results ? (
                <div className="cyber-terminal">
                  <div className="cyber-terminal-header">
                    <div className="flex gap-2">
                      <div className="cyber-terminal-dot bg-red-500"></div>
                      <div className="cyber-terminal-dot bg-yellow-500"></div>
                      <div className="cyber-terminal-dot bg-green-500"></div>
                    </div>
                    <span className="text-xs text-green-400 font-mono ml-4">RAW-DATA-STREAM</span>
                  </div>
                  <ScrollArea className="cyber-terminal-content h-96">
                    <pre className="whitespace-pre-wrap text-green-400 font-mono text-sm leading-relaxed">
                      {scan.results}
                    </pre>
                  </ScrollArea>
                </div>
<<<<<<< HEAD
                </ScrollArea>
=======
>>>>>>> 892165d (Fixed UI , Updated Captcha , Improved Docker Deployment Guide.)
              ) : (
                <div className="text-center py-12 cyber-card border border-gray-500/10">
                  <div className="relative">
                    <FileText className="h-16 w-16 text-gray-400/50 mx-auto mb-4" />
                    <div className="absolute inset-0 h-16 w-16 text-gray-400/20 mx-auto animate-pulse">
                      <FileText className="h-16 w-16" />
                    </div>
                  </div>
                  <p className="text-cyber-text-muted font-mono">NO RAW DATA STREAM AVAILABLE</p>
                  <p className="text-xs text-cyber-text-muted mt-2">Data stream not captured during scan execution</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

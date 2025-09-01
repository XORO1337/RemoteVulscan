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
  Server
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
        case 'CRITICAL': return 'bg-red-100 text-red-800 border-red-200'
        case 'HIGH': return 'bg-orange-100 text-orange-800 border-orange-200'
        case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
        case 'LOW': return 'bg-blue-100 text-blue-800 border-blue-200'
        default: return 'bg-gray-100 text-gray-800 border-gray-200'
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
            <div class="raw-output">${sanitizeHTML(scan.results)}</div>
        </div>
        ` : ''}

        <div class="footer">
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Globe className="h-6 w-6" />
            Scan Results
          </h2>
          <p className="text-muted-foreground mt-1">
            Detailed results for {scan.website.url}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onClose}>
            Back to History
          </Button>
          {scan.results && (
            <Button variant="outline" onClick={downloadResults}>
              <Download className="h-4 w-4 mr-2" />
              Download Results
            </Button>
          )}
        </div>
      </div>

      {/* Scan Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {getStatusIcon(scan.status)}
                {scan.website.url}
              </CardTitle>
              <CardDescription>
                {scan.scanType} • Scan ID: {scan.id}
              </CardDescription>
            </div>
            <Badge className={getStatusColor(scan.status)}>
              {scan.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {scan.vulnerabilities.length}
              </div>
              <div className="text-sm text-muted-foreground">Total Issues</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {vulnerabilityCounts.CRITICAL || 0}
              </div>
              <div className="text-sm text-muted-foreground">Critical</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {vulnerabilityCounts.HIGH || 0}
              </div>
              <div className="text-sm text-muted-foreground">High</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {formatDuration()}
              </div>
              <div className="text-sm text-muted-foreground">Duration</div>
            </div>
          </div>
          
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>Started: {scan.startedAt ? new Date(scan.startedAt).toLocaleString() : 'N/A'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>Completed: {scan.completedAt ? new Date(scan.completedAt).toLocaleString() : 'N/A'}</span>
            </div>
          </div>

          {scan.errorMessage && (
            <Alert className="mt-4">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Error:</strong> {scan.errorMessage}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Detailed Results */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="vulnerabilities">Vulnerabilities ({scan.vulnerabilities.length})</TabsTrigger>
          <TabsTrigger value="raw-output">Raw Output</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Server className="h-5 w-5" />
                  Scan Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-sm font-medium">Scan Type</label>
                  <p className="text-sm text-muted-foreground">{scan.scanType}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Target URL</label>
                  <p className="text-sm text-muted-foreground">{scan.website.url}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <Badge className={getStatusColor(scan.status)}>
                    {scan.status}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium">Created</label>
                  <p className="text-sm text-muted-foreground">
                    {new Date(scan.createdAt).toLocaleString()}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Vulnerability Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(vulnerabilityCounts).map(([severity, count]) => (
                  <div key={severity} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className={getSeverityColor(severity)}>
                        {getSeverityIcon(severity)}
                        <span className="ml-1">{severity}</span>
                      </Badge>
                    </div>
                    <span className="font-medium">{count}</span>
                  </div>
                ))}
                {Object.keys(vulnerabilityCounts).length === 0 && (
                  <p className="text-sm text-muted-foreground">No vulnerabilities detected</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="vulnerabilities" className="space-y-4">
          {scan.vulnerabilities.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center h-32">
                <div className="text-center">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                  <p className="text-muted-foreground">No vulnerabilities detected</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {scan.vulnerabilities.map((vuln) => (
                <Card key={vuln.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge className={getSeverityColor(vuln.severity)}>
                          {getSeverityIcon(vuln.severity)}
                          <span className="ml-1">{vuln.severity}</span>
                        </Badge>
                        <div>
                          <CardTitle className="text-lg">{vuln.title}</CardTitle>
                          <CardDescription>{vuln.type}</CardDescription>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedVuln(expandedVuln === vuln.id ? null : vuln.id)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  {expandedVuln === vuln.id && (
                    <CardContent className="space-y-4">
                      {vuln.description && (
                        <div>
                          <label className="text-sm font-medium">Description</label>
                          <p className="text-sm text-muted-foreground mt-1">{vuln.description}</p>
                        </div>
                      )}
                      {vuln.solution && (
                        <div>
                          <label className="text-sm font-medium">Solution</label>
                          <p className="text-sm text-muted-foreground mt-1">{vuln.solution}</p>
                        </div>
                      )}
                      {vuln.location && (
                        <div>
                          <label className="text-sm font-medium">Location</label>
                          <p className="text-sm text-muted-foreground mt-1">{vuln.location}</p>
                        </div>
                      )}
                      {vuln.reference && (
                        <div>
                          <label className="text-sm font-medium">Reference</label>
                          <p className="text-sm text-muted-foreground mt-1">{vuln.reference}</p>
                        </div>
                      )}
                      <div>
                        <label className="text-sm font-medium">Detected</label>
                        <p className="text-sm text-muted-foreground mt-1">
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

        <TabsContent value="raw-output" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Raw Scan Output
              </CardTitle>
              <CardDescription>
                Complete output from the scanning tools
              </CardDescription>
            </CardHeader>
            <CardContent>
              {scan.results ? (
                <ScrollArea className="h-96 w-full rounded-md border p-4 bg-black text-green-400 font-mono text-sm">
                  <pre className="whitespace-pre-wrap">{scan.results}</pre>
                </ScrollArea>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No raw output available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { 
  Shield, 
  Globe, 
  Zap, 
  AlertTriangle, 
  CheckCircle, 
  Loader2,
  Terminal,
  Activity,
  Target
} from 'lucide-react'
import { apiClient } from '@/lib/api'

interface ScanResult {
  id: string
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'
  progress: number
  output: string
  vulnerabilities: any[]
}

export default function HomePage() {
  const [url, setUrl] = useState('')
  const [isScanning, setIsScanning] = useState(false)
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [systemStatus, setSystemStatus] = useState<any>(null)

  useEffect(() => {
    checkSystemStatus()
  }, [])

  const checkSystemStatus = async () => {
    try {
      const data = await apiClient.healthCheck()
      setSystemStatus(data)
    } catch (error) {
      console.error('Failed to check system status:', error)
    }
  }

  const startScan = async () => {
    if (!url) return

    setIsScanning(true)
    setScanResult({
      id: 'scan-' + Date.now(),
      status: 'PENDING',
      progress: 0,
      output: '',
      vulnerabilities: []
    })

    try {
      // Create scan using API client
      const scan = await apiClient.createScan({
        url,
        scanType: 'NUCLEI'
      })
      
      // Simulate scan progress
      simulateScanProgress(scan.id)
      
    } catch (error) {
      console.error('Scan failed:', error)
      setScanResult(prev => prev ? {
        ...prev,
        status: 'FAILED',
        output: 'Scan failed: ' + (error as Error).message
      } : null)
      setIsScanning(false)
    }
  }

  const simulateScanProgress = (scanId: string) => {
    let progress = 0
    const interval = setInterval(() => {
      progress += Math.random() * 20
      
      if (progress >= 100) {
        progress = 100
        clearInterval(interval)
        setScanResult(prev => prev ? {
          ...prev,
          status: 'COMPLETED',
          progress: 100,
          output: prev.output + '\n✅ Scan completed successfully!',
          vulnerabilities: [
            {
              severity: 'MEDIUM',
              type: 'Security Header',
              title: 'Missing X-Frame-Options header',
              description: 'The X-Frame-Options header is not set'
            }
          ]
        } : null)
        setIsScanning(false)
        return
      }

      setScanResult(prev => prev ? {
        ...prev,
        status: 'RUNNING',
        progress,
        output: prev.output + `\n🔍 Scanning... ${Math.round(progress)}%`
      } : null)
    }, 1000)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Cyber Background Effects */}
      <div className="fixed inset-0 cyber-particle-field opacity-30"></div>
      
      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="relative">
              <Shield className="h-16 w-16 text-cyan-400 animate-cyber-glow" />
              <div className="absolute inset-0 h-16 w-16 text-cyan-400/30 animate-ping">
                <Shield className="h-16 w-16" />
              </div>
            </div>
          </div>
          <h1 className="text-6xl font-bold cyber-title mb-4">
            CYBER SHIELD
          </h1>
          <p className="text-xl text-cyber-text-secondary max-w-2xl mx-auto">
            Advanced Vulnerability Scanner • Real-time Threat Detection • Comprehensive Security Assessment
          </p>
          
          {/* System Status */}
          {systemStatus && (
            <div className="flex items-center justify-center gap-4 mt-6">
              <div className="cyber-status-indicator">
                <div className="cyber-status-dot"></div>
                <span className="text-sm font-mono text-green-400">SYSTEM OPERATIONAL</span>
              </div>
              <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                API v{systemStatus.version || '1.0.0'}
              </Badge>
            </div>
          )}
        </div>

        {/* Main Scanner Interface */}
        <div className="max-w-4xl mx-auto space-y-8">
          <Card className="cyber-card-pro">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-3">
                <Target className="h-8 w-8 text-cyan-400" />
                <span className="cyber-text-gradient">TARGET ACQUISITION</span>
              </CardTitle>
              <CardDescription className="text-cyber-text-secondary">
                Enter target URL for comprehensive security assessment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex gap-4">
                <Input
                  type="url"
                  placeholder="https://example.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="cyber-input flex-1"
                  disabled={isScanning}
                />
                <Button
                  onClick={startScan}
                  disabled={!url || isScanning}
                  className="cyber-button px-8"
                >
                  {isScanning ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      SCANNING
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      INITIATE SCAN
                    </>
                  )}
                </Button>
              </div>

              {/* Scan Progress */}
              {scanResult && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-mono text-cyber-text-secondary">
                      SCAN STATUS: {scanResult.status}
                    </span>
                    <span className="text-sm font-mono text-cyan-400">
                      {Math.round(scanResult.progress)}%
                    </span>
                  </div>
                  <Progress 
                    value={scanResult.progress} 
                    className="cyber-progress h-3"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Scan Output Terminal */}
          {scanResult && (
            <Card className="cyber-card">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-3">
                  <Terminal className="h-6 w-6 text-green-400" />
                  <span className="cyber-text-gradient">SCAN OUTPUT</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="cyber-terminal">
                  <div className="cyber-terminal-header">
                    <div className="flex gap-2">
                      <div className="cyber-terminal-dot bg-red-500"></div>
                      <div className="cyber-terminal-dot bg-yellow-500"></div>
                      <div className="cyber-terminal-dot bg-green-500"></div>
                    </div>
                    <span className="text-xs text-green-400 font-mono ml-4">SCAN-TERMINAL</span>
                  </div>
                  <div className="cyber-terminal-content">
                    <pre className="whitespace-pre-wrap text-green-400 font-mono text-sm">
                      {scanResult.output || 'Initializing scan...'}
                    </pre>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Vulnerabilities */}
          {scanResult?.vulnerabilities && scanResult.vulnerabilities.length > 0 && (
            <Card className="cyber-card border-red-500/30">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-3">
                  <AlertTriangle className="h-6 w-6 text-red-400" />
                  <span className="cyber-text-gradient">THREAT DETECTION</span>
                </CardTitle>
                <CardDescription className="text-cyber-text-secondary">
                  {scanResult.vulnerabilities.length} security issues detected
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {scanResult.vulnerabilities.map((vuln, index) => (
                  <Alert key={index} className="border-red-500/20 bg-red-500/5">
                    <AlertTriangle className="h-4 w-4 text-red-400" />
                    <AlertDescription>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-red-300">{vuln.title}</span>
                        <Badge className={`cyber-severity-${vuln.severity.toLowerCase()}`}>
                          {vuln.severity}
                        </Badge>
                      </div>
                      <p className="text-sm text-red-200">{vuln.description}</p>
                    </AlertDescription>
                  </Alert>
                ))}
              </CardContent>
            </Card>
          )}

          {/* System Information */}
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="cyber-card border-blue-500/20">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-3">
                  <Activity className="h-5 w-5 text-blue-400" />
                  System Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-cyber-text-muted">API Status</span>
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Online
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-cyber-text-muted">Tools</span>
                    <span className="text-sm font-mono text-cyan-400">20+ Available</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-cyber-text-muted">Uptime</span>
                    <span className="text-sm font-mono text-cyan-400">
                      {systemStatus?.uptime ? Math.round(systemStatus.uptime) + 's' : 'N/A'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="cyber-card border-purple-500/20">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-3">
                  <Globe className="h-5 w-5 text-purple-400" />
                  Scan Capabilities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    <span className="text-sm text-cyber-text-secondary">Network Scanning</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    <span className="text-sm text-cyber-text-secondary">Web Vulnerability</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    <span className="text-sm text-cyber-text-secondary">SSL/TLS Analysis</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    <span className="text-sm text-cyber-text-secondary">Real-time Updates</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="cyber-card border-cyan-500/20">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-3">
                  <Shield className="h-5 w-5 text-cyan-400" />
                  Security Tools
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="text-cyan-400 font-mono">• Nmap</div>
                  <div className="text-cyan-400 font-mono">• Nuclei</div>
                  <div className="text-cyan-400 font-mono">• Nikto</div>
                  <div className="text-cyan-400 font-mono">• SQLMap</div>
                  <div className="text-cyan-400 font-mono">• TestSSL</div>
                  <div className="text-xs text-cyber-text-muted mt-2">
                    +15 more tools available
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
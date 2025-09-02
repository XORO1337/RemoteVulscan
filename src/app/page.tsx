"use client"

import { useState, useEffect, useRef } from "react"
import { io, type Socket } from "socket.io-client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ScrollArea } from "@/components/ui/scroll-area"
import TurnstileWidget from "@/components/turnstile-widget"
import ScanResults from "@/components/scan-results"
import {
  Loader2,
  Globe,
  Terminal,
  Activity,
  Clock,
  Cpu,
  Lock,
  AlertTriangle,
  Search,
  FileText,
  CheckCircle,
  XCircle,
  Eye,
  Zap,
  Network,
  Code,
  Database,
  Wifi,
} from "lucide-react"

// ---------------- Types -------------------------------------------------------
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
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED"
  scanType: string
  startedAt?: string
  completedAt?: string
  errorMessage?: string
  vulnerabilities: Vulnerability[]
  results?: string
  createdAt: string
}

interface ScanUpdateEvent {
  scanId: string
  progress?: number
  status?: Scan["status"]
  message?: string
  resultsChunk?: string
}

// ---------------- Component ---------------------------------------------------
export default function HomePage() {
  // Form / config
  const [url, setUrl] = useState("")
  const [scanType, setScanType] = useState("FULL_SCAN")
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [turnstileSiteKey, setTurnstileSiteKey] = useState<string | null>(null)
  const [enableSocket, setEnableSocket] = useState(false)

  // Scan state
  const [scans, setScans] = useState<Scan[]>([])
  const [currentScan, setCurrentScan] = useState<Scan | null>(null)
  const [selectedScan, setSelectedScan] = useState<Scan | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [scanOutput, setScanOutput] = useState<{ progress: number; log: string[] }>({ progress: 0, log: [] })
  const pollRef = useRef<NodeJS.Timeout | null>(null)
  const socketRef = useRef<Socket | null>(null)
  const [activeTab, setActiveTab] = useState<"scanner" | "results" | "history">("scanner")

  // ---------------- Effects --------------------------------------------------
  useEffect(() => {
    // fetch public config
    fetch("/api/public-config")
      .then((r) => r.json())
      .then((cfg) => {
        if (cfg.turnstileSiteKey) setTurnstileSiteKey(cfg.turnstileSiteKey)
        setEnableSocket(Boolean(cfg.enableSocket))
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetchScans()
  }, [])

  useEffect(() => {
    if (!enableSocket) return
    if (socketRef.current) return
    const s = io({ path: "/api/socketio" })
    socketRef.current = s
    s.on("connect", () => {
      // no-op
    })
    s.on("scanUpdate", (data: ScanUpdateEvent) => {
      if (!currentScan || currentScan.id !== data.scanId) return
      if (data.status && currentScan.status !== data.status) {
        setCurrentScan((prev) => (prev ? { ...prev, status: data.status! } : prev))
      }
      if (data.resultsChunk) {
        setScanOutput((prev) => ({
          progress: data.progress ?? prev.progress,
          log: [...prev.log, data.resultsChunk!],
        }))
      } else if (typeof data.progress === "number") {
        setScanOutput((prev) => ({ ...prev, progress: data.progress! }))
      }
    })
    s.on("scanComplete", (scan: Scan) => {
      setCurrentScan(scan)
      setScanOutput((prev) => ({ ...prev, progress: 100 }))
      fetchScans()
    })
    s.on("scanError", (payload: { scanId: string; error: string }) => {
      if (currentScan && payload.scanId === currentScan.id) {
        setCurrentScan((prev) => (prev ? { ...prev, status: "FAILED", errorMessage: payload.error } : prev))
      }
    })
    return () => {
      s.disconnect()
      socketRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enableSocket, currentScan?.id])

  // ---------------- Network helpers -----------------------------------------
  async function fetchScans() {
    try {
      const res = await fetch("/api/scans")
      const data: Scan[] = await res.json()
      setScans(data)
      if (currentScan) {
        const updated = data.find((s) => s.id === currentScan.id)
        if (updated) setCurrentScan(updated)
      }
    } catch {}
  }

  async function fetchScanDetails(id: string) {
    const res = await fetch(`/api/scans/${id}`)
    if (!res.ok) return
    const data: Scan = await res.json()
    setSelectedScan(data)
  }

  async function startScan() {
    if (!url || !captchaToken) return
    setIsScanning(true)
    setActiveTab("results")
    try {
      const res = await fetch("/api/scans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, scanType, captchaToken }),
      })
      if (!res.ok) throw new Error("Failed to start scan")
      const scan: Scan = await res.json()
      setCurrentScan(scan)
      setScanOutput({ progress: 0, log: ["Scan initiated"] })
      // begin polling if socket disabled
      if (!enableSocket) startPolling(scan.id)
    } catch (e: any) {
      alert(e.message || "Failed to start scan")
    } finally {
      setIsScanning(false)
    }
  }

  function startPolling(id: string) {
    stopPolling()
    pollRef.current = setInterval(async () => {
      const res = await fetch(`/api/scans/${id}`)
      if (!res.ok) return
      const scan: Scan = await res.json()
      setCurrentScan(scan)
      if (scan.status === "COMPLETED" || scan.status === "FAILED") {
        stopPolling()
        fetchScans()
        setScanOutput((prev) => ({ ...prev, progress: 100 }))
      }
    }, 3000)
  }

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }

  // ---------------- Helpers --------------------------------------------------
  function getStatusIcon(status: Scan["status"]) {
    switch (status) {
      case "COMPLETED":
        return <CheckCircle className="h-4 w-4" />
      case "FAILED":
        return <XCircle className="h-4 w-4" />
      case "RUNNING":
        return <Loader2 className="h-4 w-4 animate-spin" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  function getStatusColor(status: Scan["status"]) {
    switch (status) {
      case "COMPLETED":
        return "bg-green-500/20 text-green-400 border-green-500/30"
      case "FAILED":
        return "bg-red-500/20 text-red-400 border-red-500/30"
      case "RUNNING":
        return "bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
      default:
        return "bg-gray-500/20 text-gray-300 border-gray-500/30"
    }
  }

  function formatDate(dateString?: string) {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleString()
  }

  function getSeverityColorClass(severity: string) {
    switch (severity) {
      case "CRITICAL":
        return "critical"
      case "HIGH":
        return "high"
      case "MEDIUM":
        return "medium"
      case "LOW":
        return "low"
      default:
        return "info"
    }
  }

  function generateHTMLReport(scan: Scan) {
    const vulnerabilityCounts = scan.vulnerabilities.reduce((acc, v) => {
      acc[v.severity] = (acc[v.severity] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const sanitizeHTML = (text: string) => {
      return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;")
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
                    ${scan.startedAt ? formatDate(scan.startedAt) : "N/A"}
                </div>
                <div class="info-item">
                    <span class="label">Completed</span>
                    ${scan.completedAt ? formatDate(scan.completedAt) : "N/A"}
                </div>
                <div class="info-item">
                    <span class="label">Duration</span>
                    ${
                      scan.startedAt && scan.completedAt
                        ? Math.floor(
                            (new Date(scan.completedAt).getTime() - new Date(scan.startedAt).getTime()) / 1000,
                          ) + " seconds"
                        : "N/A"
                    }
                </div>
                <div class="info-item">
                    <span class="label">Created</span>
                    ${formatDate(scan.createdAt)}
                </div>
            </div>
        </div>

        ${
          scan.vulnerabilities.length > 0
            ? `
        <div class="section">
            <h2>🚨 Detected Vulnerabilities</h2>
            ${scan.vulnerabilities
              .map(
                (vuln) => `
                <div class="vulnerability">
                    <div class="vulnerability-header">
                        <div>
                            <strong>${sanitizeHTML(vuln.title)}</strong>
                            <div style="color: #6c757d; font-size: 0.9em; margin-top: 5px;">
                                ${vuln.type} • Detected on ${formatDate(vuln.createdAt || new Date().toISOString())}
                            </div>
                        </div>
                        <span class="severity-badge ${getSeverityColorClass(vuln.severity)}">
                            ${vuln.severity}
                        </span>
                    </div>
                    <div class="vulnerability-body">
                        ${
                          vuln.description
                            ? `
                            <div style="margin-bottom: 15px;">
                                <strong>Description:</strong><br>
                                ${sanitizeHTML(vuln.description)}
                            </div>
                        `
                            : ""
                        }
                        ${
                          vuln.solution
                            ? `
                            <div style="margin-bottom: 15px;">
                                <strong>💡 Solution:</strong><br>
                                ${sanitizeHTML(vuln.solution)}
                            </div>
                        `
                            : ""
                        }
                        ${
                          vuln.location
                            ? `
                            <div style="margin-bottom: 15px;">
                                <strong>📍 Location:</strong><br>
                                ${sanitizeHTML(vuln.location)}
                            </div>
                        `
                            : ""
                        }
                        ${
                          vuln.reference
                            ? `
                            <div>
                                <strong>🔗 Reference:</strong><br>
                                ${sanitizeHTML(vuln.reference)}
                            </div>
                        `
                            : ""
                        }
                    </div>
                </div>
            `,
              )
              .join("")}
        </div>
        `
            : `
        <div class="section">
            <h2>✅ Security Status</h2>
            <div style="background: #d4edda; border: 1px solid #c3e6cb; color: #155724; padding: 15px; border-radius: 5px;">
                <strong>No vulnerabilities detected!</strong><br>
                The target appears to be secure against the tested vulnerabilities.
            </div>
        </div>
        `
        }

        ${
          scan.results
            ? `
        <div class="section">
            <h2>📄 Raw Scan Output</h2>
            <div class="raw-output">${sanitizeHTML(scan.results)}</div>
        </div>
        `
            : ""
        }

        <div class="footer">
            <p>Generated by Vulnerability Scanner • Report ID: ${scan.id}</p>
            <p>This report contains sensitive security information and should be handled accordingly.</p>
        </div>
    </div>
</body>
</html>`

    const blob = new Blob([html], { type: "text/html" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `vulnerability-report-${scan.website.url.replace(/^https?:\/\//, "").replace(/[/\\:*?"<>|]/g, "-")}-${scan.id.substring(0, 8)}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Reusable Tab Button (kept lightweight to avoid separate file)
  function TabButton({
    tab,
    label,
    Icon,
    disabled = false,
  }: { tab: "scanner" | "results" | "history"; label: string; Icon?: any; disabled?: boolean }) {
    const isActive = activeTab === tab
    return (
      <Button
        role="tab"
        aria-selected={isActive}
        aria-controls={`panel-${tab}`}
        tabIndex={isActive ? 0 : -1}
        disabled={disabled}
        onClick={() => !disabled && setActiveTab(tab)}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !disabled) {
            e.preventDefault()
            setActiveTab(tab)
          }
        }}
        className={`px-6 py-3 font-mono font-bold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70 focus-visible:ring-offset-0 rounded-md relative ${
          isActive
            ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-cyan-500/25 shadow-lg"
            : "bg-transparent text-cyber-text-secondary hover:text-cyan-400 hover:bg-cyan-500/10"
        } ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
      >
        {Icon && <Icon className="h-4 w-4 mr-2" />}
        {label}
      </Button>
    )
  }

  return (
    <div className="min-h-screen bg-cyber-bg-primary relative overflow-hidden">
      {/* Enhanced Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="cyber-particle-field"></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-radial from-cyan-500/20 via-cyan-500/10 to-transparent rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-radial from-purple-500/20 via-purple-500/10 to-transparent rounded-full blur-3xl animate-float-delayed"></div>
        <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-gradient-radial from-blue-500/20 via-blue-500/10 to-transparent rounded-full blur-2xl animate-pulse-slow"></div>
      </div>

      {/* Professional Header */}
      <header className="cyber-header relative z-50">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="cyber-logo">
                <Terminal className="h-8 w-8 text-cyan-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold cyber-text-gradient">VULNERABILITY SCANNER</h1>
                <p className="text-sm text-cyber-text-secondary">Advanced Security Assessment Platform</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Badge className="cyber-badge bg-green-500/20 text-green-400 border-green-500/30">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
                OPERATIONAL
              </Badge>
              Made with ❤️ by Hardik
            </div>
          </div>
        </div>
      </header>

      {/* Cyber Border Effects */}
      <div className="fixed inset-0 pointer-events-none z-10">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent animate-scan-horizontal"></div>
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent animate-scan-horizontal-reverse"></div>
        <div className="absolute top-0 left-0 w-px h-full bg-gradient-to-b from-transparent via-cyan-500/50 to-transparent animate-scan-vertical"></div>
        <div className="absolute top-0 right-0 w-px h-full bg-gradient-to-b from-transparent via-cyan-500/50 to-transparent animate-scan-vertical-reverse"></div>
      </div>
      
      <div className="relative z-20 max-w-7xl mx-auto p-6 space-y-8">
        {/* Enhanced Hero Section */}
        <div className="cyber-hero">
          <h1 className="cyber-hero-title cyber-title">
            VULNERABILITY SCANNER
          </h1>
          <p className="cyber-hero-description">
            Next-generation cybersecurity platform powered by cutting-edge security tools.
            Comprehensive vulnerability assessment and real-time threat detection.
          </p>
          <div className="cyber-feature-grid">
            <div className="cyber-feature-item">
              <Terminal className="h-6 w-6 text-cyan-400" />
              <span>Advanced Scanning</span>
            </div>
            <div className="cyber-feature-item">
              <Activity className="h-6 w-6 text-green-400" />
              <span>Real-time Monitoring</span>
            </div>
            <div className="cyber-feature-item">
              <Lock className="h-6 w-6 text-purple-400" />
              <span>Enterprise Security</span>
            </div>
          </div>
        </div>

        {/* Enhanced Tab Navigation */}
        <div className="relative">
          <div className="flex items-center justify-center mb-8">
            <div className="cyber-card-pro p-2 inline-flex gap-1" role="tablist" aria-label="Scanner navigation tabs">
              <TabButton tab="scanner" label="SCANNER" Icon={Terminal} />
              <TabButton
                tab="results"
                label="LIVE RESULTS"
                Icon={Activity}
                disabled={!currentScan}
              />
              <TabButton tab="history" label="HISTORY" Icon={Clock} />
            </div>
            {!currentScan && activeTab === "results" && (
              <div className="absolute top-full mt-2 text-sm text-cyber-text-muted font-mono">
                ► No active scan session
              </div>
            )}
          </div>

          {/* Scanner Tab */}
          {activeTab === "scanner" && (
            <div className="space-y-8">
              <Card className="cyber-card-pro">
                <CardHeader className="pb-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Terminal className="h-6 w-6 text-cyan-400" />
                    <CardTitle className="text-2xl cyber-text-gradient">INITIATE SECURITY SCAN</CardTitle>
                  </div>
                  <CardDescription className="text-lg text-cyber-text-secondary">
                    Deploy advanced vulnerability assessment protocols against target infrastructure
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <Label htmlFor="url" className="text-cyber-text-secondary font-semibold flex items-center gap-2">
                      <Globe className="h-4 w-4 text-cyan-400" />
                      TARGET URL
                    </Label>
                    <div className="flex gap-3">
                      <Input
                        id="url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://example.com"
                        className="cyber-input flex-1 font-mono"
                      />
                      <Button 
                        onClick={startScan} 
                        disabled={isScanning || !url || !captchaToken}
                        className="cyber-button bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 border-cyan-400 px-8"
                      >
                        {isScanning ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            SCANNING
                          </>
                        ) : (
                          <>
                            <Search className="mr-2 h-4 w-4" />
                            INITIATE SCAN
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {turnstileSiteKey ? (
                    <div className="space-y-3">
                      <Label className="text-cyber-text-secondary font-semibold flex items-center gap-2">
                        <Lock className="h-4 w-4 text-purple-400" />
                        SECURITY VERIFICATION
                      </Label>
                      <TurnstileWidget
                        siteKey={turnstileSiteKey}
                        onVerify={(token: string) => setCaptchaToken(token)}
                        className="cyber-border-glow rounded-lg p-3"
                      />
                      {!captchaToken ? (
                        <p className="text-xs text-cyber-text-muted font-mono">► Complete security verification to enable scanning protocols</p>
                      ) : (
                        <p className="text-xs text-green-400 font-mono animate-pulse">✓ SECURITY VERIFICATION AUTHENTICATED</p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <Alert className="border-red-500/30 bg-red-500/10 cyber-card">
                        <AlertTriangle className="h-4 w-4 text-red-400" />
                        <AlertDescription className="text-red-400 font-mono">
                          SECURITY VERIFICATION MODULE OFFLINE - Contact system administrator
                        </AlertDescription>
                      </Alert>
                    </div>
                  )}

                  <div className="space-y-3">
                    <Label htmlFor="scanType" className="text-cyber-text-secondary font-semibold flex items-center gap-2">
                      <Cpu className="h-4 w-4 text-purple-400" />
                      SCAN PROTOCOL
                    </Label>
                    <Select value={scanType} onValueChange={setScanType}>
                      <SelectTrigger className="cyber-input h-14 text-left">
                        <SelectValue placeholder="▶ SELECT ATTACK VECTOR" />
                      </SelectTrigger>
                      <SelectContent className="cyber-card border-cyan-500/30 bg-cyber-surface/95 backdrop-blur-xl">
                        <SelectItem value="FULL_SCAN" className="cyber-select-item">🔥 FULL SPECTRUM SCAN</SelectItem>
                        <SelectItem value="NMAP" className="cyber-select-item">🌐 NETWORK RECONNAISSANCE</SelectItem>
                        <SelectItem value="NIKTO" className="cyber-select-item">⚡ WEB SERVER ANALYSIS</SelectItem>
                        <SelectItem value="NUCLEI" className="cyber-select-item">🎯 VULNERABILITY DETECTION</SelectItem>
                        <SelectItem value="SQLMAP" className="cyber-select-item">💉 SQL INJECTION PROBE</SelectItem>
                        <SelectItem value="VULS" className="cyber-select-item">🛡️ SYSTEM VULNERABILITY SCAN</SelectItem>
                        <SelectItem value="COMMIX" className="cyber-select-item">⚙️ COMMAND INJECTION TEST</SelectItem>
                        <SelectItem value="NETTACKER" className="cyber-select-item">🔍 NETWORK ATTACK SIMULATION</SelectItem>
                        <SelectItem value="CORSY" className="cyber-select-item">🔗 CORS SECURITY AUDIT</SelectItem>
                        <SelectItem value="SSL_CHECK" className="cyber-select-item">🔐 SSL/TLS CRYPTOGRAPHIC ANALYSIS</SelectItem>
                        <SelectItem value="HEADER_ANALYSIS" className="cyber-select-item">📋 SECURITY HEADERS EVALUATION</SelectItem>
                        <SelectItem value="CSP_EVAL" className="cyber-select-item">🛡️ CSP POLICY ANALYSIS</SelectItem>
                        <SelectItem value="OPEN_REDIRECT_CHECK" className="cyber-select-item">🔄 REDIRECT VULNERABILITY SCAN</SelectItem>
                        <SelectItem value="EXPOSED_FILES" className="cyber-select-item">📁 EXPOSED DATA DETECTION</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Enhanced Attack Vector Info Grid */}
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                <Card className="cyber-card hover:border-cyan-400/50 transition-all duration-300 group">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-3 text-cyan-400 group-hover:text-cyan-300">
                      <Zap className="h-6 w-6" />
                      FULL SPECTRUM
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-cyber-text-secondary leading-relaxed">
                      Complete multi-vector assault simulation deploying advanced reconnaissance, vulnerability detection, 
                      and exploitation frameworks in coordinated sequence.
                    </p>
                  </CardContent>
                </Card>

                <Card className="cyber-card hover:border-blue-400/50 transition-all duration-300 group">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-3 text-blue-400 group-hover:text-blue-300">
                      <Network className="h-6 w-6" />
                      NETWORK RECON
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-cyber-text-secondary leading-relaxed">
                      Deep packet analysis and service fingerprinting using advanced port scanning algorithms 
                      to map network topology and identify attack surfaces.
                    </p>
                  </CardContent>
                </Card>

                <Card className="cyber-card hover:border-purple-400/50 transition-all duration-300 group">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-3 text-purple-400 group-hover:text-purple-300">
                      <Code className="h-6 w-6" />
                      NUCLEI ENGINE
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-cyber-text-secondary leading-relaxed">
                      High-velocity template-based vulnerability scanner utilizing community-driven threat intelligence 
                      for rapid zero-day detection.
                    </p>
                  </CardContent>
                </Card>

                <Card className="cyber-card hover:border-red-400/50 transition-all duration-300 group">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-3 text-red-400 group-hover:text-red-300">
                      <Database className="h-6 w-6" />
                      SQL INJECTION
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-cyber-text-secondary leading-relaxed">
                      Automated database exploitation framework with advanced blind injection techniques 
                      and payload optimization algorithms.
                    </p>
                  </CardContent>
                </Card>

                <Card className="cyber-card hover:border-green-400/50 transition-all duration-300 group">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-3 text-green-400 group-hover:text-green-300">
                      <Lock className="h-6 w-6" />
                      SYSTEM AUDIT
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-cyber-text-secondary leading-relaxed">
                      Comprehensive CVE database correlation with real-time patch status analysis 
                      for enterprise vulnerability management.
                    </p>
                  </CardContent>
                </Card>

                <Card className="cyber-card hover:border-orange-400/50 transition-all duration-300 group">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-3 text-orange-400 group-hover:text-orange-300">
                      <Terminal className="h-6 w-6" />
                      CMD INJECTION
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-cyber-text-secondary leading-relaxed">
                      Advanced command injection detection engine with blind execution analysis 
                      and system compromise verification protocols.
                    </p>
                  </CardContent>
                </Card>

                <Card className="cyber-card hover:border-pink-400/50 transition-all duration-300 group">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-3 text-pink-400 group-hover:text-pink-300">
                      <Wifi className="h-6 w-6" />
                      ATTACK SIM
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-cyber-text-secondary leading-relaxed">
                      Multi-vector penetration testing framework with automated exploitation chains 
                      and lateral movement simulation capabilities.
                    </p>
                  </CardContent>
                </Card>

                <Card className="cyber-card hover:border-indigo-400/50 transition-all duration-300 group">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-3 text-indigo-400 group-hover:text-indigo-300">
                      <Globe className="h-6 w-6" />
                      CORS AUDIT
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-cyber-text-secondary leading-relaxed">
                      Cross-origin resource sharing policy analyzer with bypass technique validation 
                      and domain trust verification systems.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Live Results Tab */}
          {activeTab === "results" && (
            <div className="space-y-6">
              {currentScan ? (
                <Card className="cyber-card border-2 border-cyan-500/30 bg-gradient-to-br from-slate-900/70 to-slate-800/70 backdrop-blur-xl relative overflow-hidden">
                  {/* Scanning Animation Overlay */}
                  {currentScan.status === "RUNNING" && (
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse"></div>
                  )}
                  
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-3 text-xl">
                          <Activity className="h-5 w-5 text-cyan-400" />
                          ACTIVE SCAN SESSION
                        </CardTitle>
                        <CardDescription className="text-cyber-text-secondary mt-2 flex items-center gap-2">
                          <Cpu className="h-4 w-4 text-purple-400" />
                          {currentScan.scanType} • Target: {currentScan.website.url}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={`${getStatusColor(currentScan.status)} font-mono text-xs px-3 py-1 border cyber-border-glow`}>
                          {getStatusIcon(currentScan.status)}
                          <span className="ml-2">{currentScan.status}</span>
                        </Badge>
                        {currentScan.status === "RUNNING" && (
                          <div className="text-xs text-cyan-400 font-mono animate-pulse">
                            {currentScan.status === "RUNNING" && "● ACTIVE"}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div className="cyber-terminal">
                        <div className="cyber-terminal-header">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-red-500"></div>
                            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                          </div>
                          <div className="text-xs font-mono text-center text-cyber-text-secondary">
                            SCANNER TERMINAL v2.1
                            {currentScan.status === "RUNNING" && "● ACTIVE"}
                          </div>
                        </div>
                        <ScrollArea className="cyber-terminal-content">
                          {!scanOutput ? (
                            <div className="space-y-2">
                              <div className="animate-pulse text-cyan-400">
                                ► Initializing modules...
                              </div>
                              <div className="animate-pulse text-cyan-400">
                                ► Establishing secure control channel...
                              </div>
                              <div className="animate-pulse text-cyan-400">
                                ► Loading reconnaissance profiles...
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <div className="text-cyan-400 font-bold">
                                ► run --target {currentScan.website.url} --protocol {currentScan.scanType}
                              </div>
                              <div className="whitespace-pre-wrap text-green-400">{scanOutput.log.join('\n')}</div>
                              {currentScan.status === "COMPLETED" && (
                                <div className="text-green-400 font-bold animate-pulse">[SUCCESS] Scan completed</div>
                              )}
                              {currentScan.status === "FAILED" && (
                                <div className="text-red-400 font-bold animate-pulse">[ERROR] {currentScan.errorMessage}</div>
                              )}
                            </div>
                          )}
                        </ScrollArea>
                      </div>
                    </div>

                    {currentScan.vulnerabilities.length > 0 && (
                      <div className="space-y-3">
                        <Label className="text-cyber-text-secondary font-semibold flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-red-400" /> Detected Threats
                        </Label>
                        <div className="space-y-3 max-h-64 overflow-y-auto">
                          {currentScan.vulnerabilities.map((vuln, i) => (
                            <div key={vuln.id || i} className="cyber-card p-4 border-l-4 border-red-500">
                              <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                  <h4 className="font-semibold text-red-400">{vuln.title}</h4>
                                  <p className="text-sm text-cyber-text-secondary">{vuln.description}</p>
                                </div>
                                <Badge className={`text-xs ${getSeverityColorClass(vuln.severity)}`}>
                                  {vuln.severity}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      {currentScan.status === "COMPLETED" && (
                        <Button
                          onClick={() => generateHTMLReport(currentScan)}
                          className="cyber-button bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 border-green-400"
                        >
                          <FileText className="h-4 w-4 mr-2" /> EXPORT REPORT
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        onClick={() => setActiveTab("history")}
                        className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-400/50"
                      >
                        <Clock className="h-4 w-4 mr-2" /> SCAN HISTORY
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="cyber-card-pro border-2 border-dashed border-cyan-500/20">
                  <CardContent className="flex items-center justify-center h-80 relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-purple-500/5 rounded-lg" />
                    <div className="text-center space-y-6 relative z-10">
                      <div className="cyber-icon-lg">
                        <Activity className="h-16 w-16 text-cyan-400/50" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-cyber-text-secondary mb-2">No Active Scan</h3>
                        <p className="text-cyber-text-muted">
                          Initialize a security scan from the Scanner tab to view live results
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* History Tab */}
          {activeTab === "history" && (
            <section id="panel-history" role="tabpanel" aria-labelledby="history" className="space-y-6">
              {selectedScan ? (
                <ScanResults scan={selectedScan} onClose={() => setSelectedScan(null)} />
              ) : (
                <Card className="cyber-card border-2 border-cyan-500/20 bg-gradient-to-br from-slate-900/50 to-slate-800/50 backdrop-blur-xl">
                  <CardHeader>
                    <CardTitle className="text-2xl flex items-center gap-3">
                      <Clock className="h-6 w-6 text-cyan-400" />
                      SCAN HISTORY
                    </CardTitle>
                    <CardDescription className="text-cyber-text-secondary">
                      View previous scans. Click any record for detailed results.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {scans.length === 0 ? (
                        <div className="text-center py-12">
                          <Clock className="h-12 w-12 text-cyber-text-muted mx-auto mb-4" />
                          <p className="text-cyber-text-muted">No scan history available</p>
                        </div>
                      ) : (
                        scans.map((scan) => (
                          <div
                            key={scan.id}
                            onClick={() => fetchScanDetails(scan.id)}
                            className="cyber-card p-4 cursor-pointer hover:border-cyan-400/50 transition-all duration-300"
                          >
                            <div className="flex items-center justify-between">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-semibold text-cyber-text-primary">{scan.website.url}</h4>
                                  <Badge className={`text-xs ${getStatusColor(scan.status)}`}>
                                    {scan.status}
                                  </Badge>
                                </div>
                                <p className="text-sm text-cyber-text-secondary">
                                  {scan.scanType} • {formatDate(scan.createdAt)}
                                </p>
                                {scan.vulnerabilities.length > 0 && (
                                  <p className="text-sm text-red-400">
                                    {scan.vulnerabilities.length} vulnerabilities found
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <Eye className="h-4 w-4 text-cyan-400" />
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  )
}

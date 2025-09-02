"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Loader2, 
  Shield, 
  Globe, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Eye, 
  FileText,
  Zap,
  Terminal,
  Activity,
  Cpu,
  Network,
  Lock,
  AlertTriangle,
  Search,
  Database,
  Code,
  Wifi
} from "lucide-react"
import { io, type Socket } from "socket.io-client"
import ScanResults from "@/components/scan-results"
import TurnstileWidget from "@/components/turnstile-widget"

interface Scan {
  id: string
  websiteId: string
  website: { url: string; name?: string }
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED"
  scanType: string
  startedAt?: string
  completedAt?: string
  errorMessage?: string
  vulnerabilities: any[]
  createdAt: string
  results?: string
}

interface ScanResult {
  scanId: string
  output: string
  progress: number
  status: string
  vulnerabilities?: any[]
}

// Note: Global window.turnstile type declared in Turnstile widget - avoid re-declaration here

const SOCKET_ENABLED = typeof window !== "undefined"

export default function Home() {
  const [url, setUrl] = useState("")
  const [scanType, setScanType] = useState("FULL_SCAN")
  const [isScanning, setIsScanning] = useState(false)
  const [scans, setScans] = useState<Scan[]>([])
  const [currentScan, setCurrentScan] = useState<Scan | null>(null)
  const [scanOutput, setScanOutput] = useState<ScanResult | null>(null)
  const [socket, setSocket] = useState<Socket | null>(null)
  const [selectedScan, setSelectedScan] = useState<Scan | null>(null)
  // UI tab state (scanner | results | history)
  const [activeTab, setActiveTab] = useState<"scanner" | "results" | "history">("scanner")
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [turnstileSiteKey, setTurnstileSiteKey] = useState<string>("") // fetched from server
  const [enableSocket, setEnableSocket] = useState<boolean>(false)

  function startPolling(scanId: string) {
    if (pollIntervalRef.current) return
    pollIntervalRef.current = setInterval(() => {
      fetchScanDetails(scanId)
    }, 2000)
  }

  function stopPolling() {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
  }

  useEffect(() => {
    fetch("/api/public-config")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((cfg) => {
        if (cfg?.turnstileSiteKey) setTurnstileSiteKey(cfg.turnstileSiteKey as string)
        if (typeof cfg?.enableSocket === "boolean") setEnableSocket(Boolean(cfg.enableSocket))
      })
      .catch(() => {
        // If config fetch fails, keep enableSocket false to avoid client socket errors
        setEnableSocket(false)
      })
  }, [])

  useEffect(() => {
    // Do not attempt to connect sockets unless explicitly enabled by server config
    if (!enableSocket) {
      // ensure any existing socket is cleaned up
      if (socket) {
        try {
          socket.disconnect()
        } catch {}
        setSocket(null)
      }
      return
    }

    let newSocket: any = null
    let reconnectAttempts = 0
    const maxReconnectAttempts = 2

    const connectSocket = () => {
      try {
        newSocket = io({
          path: "/api/socketio",
          reconnection: true,
          reconnectionAttempts: maxReconnectAttempts,
          reconnectionDelay: 1000,
          timeout: 5000,
          withCredentials: false,
        })

        newSocket.on("connect", () => {
          setSocket(newSocket)
        })

        newSocket.on("connect_error", (error: any) => {
          reconnectAttempts++
          if (reconnectAttempts >= maxReconnectAttempts) {
            try {
              newSocket.disconnect()
            } catch {}
            setSocket(null)
          }
        })

        newSocket.on("disconnect", (_reason: string) => {
          setSocket(null)
        })

        newSocket.on("scanUpdate", (data: ScanResult) => {
          setScanOutput(data)
          if (Array.isArray(data.vulnerabilities) && data.vulnerabilities.length > 0) {
            setCurrentScan((prev) => {
              if (!prev) return prev
              return {
                ...prev,
                vulnerabilities: data.vulnerabilities || prev.vulnerabilities,
                status: data.status as any,
              }
            })
          }
        })

        newSocket.on("scanComplete", (data: { scanId: string; results: any }) => {
          stopPolling()
          fetchScanDetails(data.scanId)
        })

        newSocket.on("scanError", (data: { scanId: string; error: string }) => {
          stopPolling()
          setCurrentScan((prev) => {
            if (!prev || prev.id !== data.scanId) return prev
            return {
              ...prev,
              status: "FAILED",
              errorMessage: data.error,
            }
          })
        })

        newSocket.on("connected", (_data: any) => {})
      } catch {
        setSocket(null)
      }
    }

    connectSocket()
    return () => {
      try {
        newSocket?.disconnect?.()
      } catch {}
      setSocket(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enableSocket])

  useEffect(() => {
    fetchScans()
  }, [])

  const fetchScans = async () => {
    try {
      const response = await fetch("/api/scans")
      if (response.ok) {
        const data = await response.json()
        setScans(data)
      }
    } catch (error) {
      console.error("Failed to fetch scans:", error)
    }
  }

  const fetchScanDetails = async (scanId: string) => {
    try {
      const response = await fetch(`/api/scans/${scanId}`)
      if (response.ok) {
        const scan = await response.json()
        setSelectedScan(scan)
      }
    } catch (error) {
      console.error("Failed to fetch scan details:", error)
    }
  }

  const startScan = async () => {
    if (!url || !scanType) {
      alert("Please enter a URL and select a scan type")
      return
    }
    if (!turnstileSiteKey) {
      alert("CAPTCHA not configured. Ask the admin to set TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY.")
      return
    }
    if (!captchaToken) {
      alert("Please complete the CAPTCHA before starting the scan.")
      return
    }

    try {
      new URL(url)
    } catch {
      alert("Please enter a valid URL (e.g., https://example.com)")
      return
    }

    setIsScanning(true)
    try {
      const response = await fetch("/api/scans", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url, scanType, captchaToken }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to create scan")
      }

      const scan = await response.json()
      setCurrentScan(scan)
      setScans((prev) => [scan, ...prev])
      setScanOutput(null)
      setActiveTab("results")

      if (socket && socket.connected) {
        socket.emit("joinScan", scan.id)
      } else {
        startPolling(scan.id)
      }

      const startResponse = await fetch("/api/scans/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ scanId: scan.id }),
      })

      if (!startResponse.ok) {
        const errorData = await startResponse.json()
        throw new Error(errorData.error || "Failed to start scanning process")
      }
    } catch (error) {
      console.error("Failed to start scan:", error)
      alert(error instanceof Error ? error.message : "Failed to start scan")
    } finally {
      setIsScanning(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "FAILED":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "RUNNING":
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "bg-green-100 text-green-800"
      case "FAILED":
        return "bg-red-100 text-red-800"
      case "RUNNING":
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "CRITICAL":
        return "bg-red-100 text-red-800 border-red-200"
      case "HIGH":
        return "bg-orange-100 text-orange-800 border-orange-200"
      case "MEDIUM":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "LOW":
        return "bg-blue-100 text-blue-800 border-blue-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const generateHTMLReport = (scan: Scan) => {
    const vulnerabilityCounts = scan.vulnerabilities.reduce(
      (acc, vuln) => {
        acc[vuln.severity] = (acc[vuln.severity] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleString()
    }

    const getSeverityColorClass = (severity: string) => {
      switch (severity) {
        case "CRITICAL":
          return "bg-red-100 text-red-800 border-red-200"
        case "HIGH":
          return "bg-orange-100 text-orange-800 border-orange-200"
        case "MEDIUM":
          return "bg-yellow-100 text-yellow-800 border-yellow-200"
        case "LOW":
          return "bg-blue-100 text-blue-800 border-blue-200"
        default:
          return "bg-gray-100 text-gray-800 border-gray-200"
      }
    }

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
                                ${vuln.type} • Detected on ${formatDate(vuln.createdAt)}
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
<<<<<<< HEAD
    <div className="min-h-screen bg-background p-4 relative">
      {/* Cyber Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"></div>
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"></div>
        <div className="absolute top-0 left-0 w-px h-full bg-gradient-to-b from-transparent via-cyan-500/50 to-transparent"></div>
        <div className="absolute top-0 right-0 w-px h-full bg-gradient-to-b from-transparent via-cyan-500/50 to-transparent"></div>
      </div>
      
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4 py-8">
          <div className="flex items-center justify-center gap-3">
            <div className="relative">
              <Shield className="h-12 w-12 text-cyan-400 animate-cyber-glow" />
              <div className="absolute inset-0 h-12 w-12 text-cyan-400 animate-pulse opacity-50">
                <Shield className="h-12 w-12" />
              </div>
            </div>
            <h1 className="text-5xl font-bold cyber-text-gradient tracking-tight">
              CYBER SHIELD
            </h1>
            <div className="relative">
              <Zap className="h-12 w-12 text-purple-400 animate-cyber-glow" />
              <div className="absolute inset-0 h-12 w-12 text-purple-400 animate-pulse opacity-50">
                <Zap className="h-12 w-12" />
              </div>
            </div>
          </div>
          <p className="text-xl text-cyber-text-secondary max-w-2xl mx-auto">
            Advanced vulnerability detection system powered by cutting-edge security tools
          </p>
          <div className="flex items-center justify-center gap-6 text-sm text-cyber-text-muted">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-green-400" />
              <span>Real-time Analysis</span>
            </div>
            <div className="flex items-center gap-2">
              <Network className="h-4 w-4 text-blue-400" />
              <span>Network Scanning</span>
            </div>
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-purple-400" />
              <span>Security Assessment</span>
            </div>
=======
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
              <div>
                <h1 className="cyber-title text-3xl">CYBER SHIELD</h1>
                <p className="cyber-subtitle text-sm">Advanced Vulnerability Scanner</p>
              </div>
            <div className="flex items-center space-x-6">
              <div className="cyber-status-indicator">
                <div className="cyber-status-dot"></div>
                <span className="text-sm font-mono text-green-400">OPERATIONAL</span>
              </div>
              <div className="text-sm text-cyber-text-secondary">
                <span className="font-mono">UPTIME:</span>
                <span className="ml-2 text-cyan-400 font-mono">99.9%</span>
              </div>
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
>>>>>>> 892165d (Fixed UI , Updated Captcha , Improved Docker Deployment Guide.)
          </p>
          <div className="cyber-feature-grid">
            <div className="cyber-feature-item">
              <span className="text-sm font-medium">Real-time Analysis</span>
            </div>
            <div className="cyber-feature-item">
              <span className="text-sm font-medium">Network Scanning</span>
            </div>
            <div className="cyber-feature-item">
              <span className="text-sm font-medium">Security Assessment</span>
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
              <p className="text-center text-xs mt-2 text-cyber-text-muted font-mono">No active scan. Start one in the Scanner tab.</p>
            )}
          </div>
        </div>

        <div className="space-y-8">
          {/* Scanner Tab */}
<<<<<<< HEAD
          <div className="space-y-6">
            <Card className="cyber-card border-2 border-cyan-500/20 bg-gradient-to-br from-slate-900/50 to-slate-800/50 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-3">
                  <Terminal className="h-6 w-6 text-cyan-400" />
                  <span className="cyber-text-gradient">Initialize Security Scan</span>
                </CardTitle>
                <CardDescription className="text-cyber-text-secondary">
                  Enter a website URL and select the type of vulnerability scan to perform
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="url" className="text-cyber-text-secondary font-semibold flex items-center gap-2">
                    <Globe className="h-4 w-4 text-cyan-400" />
                    Target URL
=======
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
>>>>>>> 892165d (Fixed UI , Updated Captcha , Improved Docker Deployment Guide.)
                  </Label>
                  <div className="flex gap-3">
                    <Input
                      id="url"
                      placeholder="https://target-domain.com"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
<<<<<<< HEAD
                      className="flex-1 cyber-input font-mono text-cyan-100 placeholder:text-gray-500"
=======
                      className="cyber-input flex-1 font-mono"
>>>>>>> 892165d (Fixed UI , Updated Captcha , Improved Docker Deployment Guide.)
                    />
                    <Button 
                      onClick={startScan} 
                      disabled={isScanning || !url || !captchaToken}
<<<<<<< HEAD
                      className="cyber-button px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 border-cyan-400 shadow-lg shadow-cyan-500/25"
                    >
                      {isScanning ? (
                        <>
                          <div className="cyber-spinner mr-3 w-5 h-5"></div>
=======
                      className="cyber-button bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 border-cyan-400 px-8"
                    >
                      {isScanning ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
>>>>>>> 892165d (Fixed UI , Updated Captcha , Improved Docker Deployment Guide.)
                          SCANNING...
                        </>
                      ) : (
                        <>
<<<<<<< HEAD
                          <Search className="mr-2 h-5 w-5" />
=======
                          <Search className="mr-2 h-4 w-4" />
>>>>>>> 892165d (Fixed UI , Updated Captcha , Improved Docker Deployment Guide.)
                          INITIATE SCAN
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Security Verification */}
                {turnstileSiteKey ? (
<<<<<<< HEAD
                  <div className="space-y-2">
                    <Label className="text-cyber-text-secondary font-semibold flex items-center gap-2">
                      <Lock className="h-4 w-4 text-purple-400" />
                      Security Verification
=======
                  <div className="space-y-3">
                    <Label className="text-cyber-text-secondary font-semibold flex items-center gap-2">
                      <Lock className="h-4 w-4 text-purple-400" />
                      SECURITY VERIFICATION
>>>>>>> 892165d (Fixed UI , Updated Captcha , Improved Docker Deployment Guide.)
                    </Label>
                    <TurnstileWidget
                      siteKey={turnstileSiteKey}
                      onVerify={(token) => setCaptchaToken(token)}
                      onExpire={() => setCaptchaToken(null)}
<<<<<<< HEAD
                      className="mt-1 cyber-border-glow rounded-lg p-2"
                    />
                    {!captchaToken ? (
                      <p className="text-xs text-cyber-text-muted">Complete security verification to enable scanning.</p>
                    ) : (
                      <p className="text-xs text-green-400">✓ Security verification completed.</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Alert className="border-red-500/30 bg-red-500/10">
                      <AlertTriangle className="h-4 w-4 text-red-400" />
                      <AlertDescription>
                        Security verification not configured. Contact administrator to enable scanning capabilities.
=======
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
>>>>>>> 892165d (Fixed UI , Updated Captcha , Improved Docker Deployment Guide.)
                      </AlertDescription>
                    </Alert>
                  </div>
                )}

<<<<<<< HEAD
                <div className="space-y-2">
                  <Label htmlFor="scanType" className="text-cyber-text-secondary font-semibold flex items-center gap-2">
                    <Cpu className="h-4 w-4 text-purple-400" />
                    Scan Protocol
                  </Label>
                  <Select value={scanType} onValueChange={setScanType}>
                    <SelectTrigger className="cyber-input">
                      <SelectValue placeholder="Select scan type" />
                    </SelectTrigger>
                    <SelectContent className="cyber-card border-cyan-500/30">
                      {/* existing */}
                      <SelectItem value="FULL_SCAN">🔥 FULL SPECTRUM SCAN</SelectItem>
                      <SelectItem value="NMAP">🌐 NETWORK RECONNAISSANCE</SelectItem>
                      <SelectItem value="NIKTO">⚡ WEB SERVER ANALYSIS</SelectItem>
                      <SelectItem value="NUCLEI">🎯 VULNERABILITY DETECTION</SelectItem>
                      <SelectItem value="SQLMAP">💉 SQL INJECTION PROBE</SelectItem>
                      <SelectItem value="VULS">🛡️ SYSTEM VULNERABILITY SCAN</SelectItem>
                      <SelectItem value="COMMIX">⚙️ COMMAND INJECTION TEST</SelectItem>
                      <SelectItem value="NETTACKER">🔍 NETWORK ATTACK SIMULATION</SelectItem>
                      <SelectItem value="CORSY">🔗 CORS SECURITY AUDIT</SelectItem>
                      <SelectItem value="SSL_CHECK">🔐 SSL/TLS CRYPTOGRAPHIC ANALYSIS</SelectItem>
                      <SelectItem value="HEADER_ANALYSIS">📋 SECURITY HEADERS EVALUATION</SelectItem>
                      {/* new passive tools */}
                      <SelectItem value="CSP_EVAL">🛡️ CSP POLICY ANALYSIS</SelectItem>
                      <SelectItem value="OPEN_REDIRECT_CHECK">🔄 REDIRECT VULNERABILITY SCAN</SelectItem>
                      <SelectItem value="EXPOSED_FILES">📁 EXPOSED DATA DETECTION</SelectItem>
=======
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
>>>>>>> 892165d (Fixed UI , Updated Captcha , Improved Docker Deployment Guide.)
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

<<<<<<< HEAD
            {/* Scan Types Info */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              <Card className="cyber-card hover:border-cyan-400/50 transition-all duration-300 group">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2 text-cyan-400 group-hover:text-cyan-300">
                    <Zap className="h-5 w-5" />
                    Full Spectrum
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-cyber-text-secondary">
                    Comprehensive security assessment using multiple tools including Nmap, Nuclei, SQLMap, SSL analysis,
                    and more.
=======
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
>>>>>>> 892165d (Fixed UI , Updated Captcha , Improved Docker Deployment Guide.)
                  </p>
                </CardContent>
              </Card>

              <Card className="cyber-card hover:border-blue-400/50 transition-all duration-300 group">
                <CardHeader>
<<<<<<< HEAD
                  <CardTitle className="text-lg flex items-center gap-2 text-blue-400 group-hover:text-blue-300">
                    <Network className="h-5 w-5" />
                    Network Recon
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-cyber-text-secondary">
                    Port scanning and service detection using Nmap to identify open ports and running services.
=======
                  <CardTitle className="text-lg flex items-center gap-3 text-blue-400 group-hover:text-blue-300">
                    <Network className="h-6 w-6" />
                    NETWORK RECON
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-cyber-text-secondary leading-relaxed">
                    Deep packet analysis and service fingerprinting using advanced port scanning algorithms 
                    to map network topology and identify attack surfaces.
>>>>>>> 892165d (Fixed UI , Updated Captcha , Improved Docker Deployment Guide.)
                  </p>
                </CardContent>
              </Card>

              <Card className="cyber-card hover:border-purple-400/50 transition-all duration-300 group">
                <CardHeader>
<<<<<<< HEAD
                  <CardTitle className="text-lg flex items-center gap-2 text-purple-400 group-hover:text-purple-300">
                    <Search className="h-5 w-5" />
                    Nuclei Engine
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-cyber-text-secondary">
                    Fast vulnerability scanner using templates to detect known vulnerabilities across various
                    technologies.
=======
                  <CardTitle className="text-lg flex items-center gap-3 text-purple-400 group-hover:text-purple-300">
                    <Code className="h-6 w-6" />
                    NUCLEI ENGINE
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-cyber-text-secondary leading-relaxed">
                    High-velocity template-based vulnerability scanner utilizing community-driven threat intelligence 
                    for rapid zero-day detection.
>>>>>>> 892165d (Fixed UI , Updated Captcha , Improved Docker Deployment Guide.)
                  </p>
                </CardContent>
              </Card>

<<<<<<< HEAD
              <Card className="cyber-card hover:border-green-400/50 transition-all duration-300 group">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2 text-green-400 group-hover:text-green-300">
                    <Database className="h-5 w-5" />
                    SQL Injection
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-cyber-text-secondary">
                    Automated SQL injection detection and exploitation tool to find database vulnerabilities.
=======
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
>>>>>>> 892165d (Fixed UI , Updated Captcha , Improved Docker Deployment Guide.)
                  </p>
                </CardContent>
              </Card>

<<<<<<< HEAD
              <Card className="cyber-card hover:border-orange-400/50 transition-all duration-300 group">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2 text-orange-400 group-hover:text-orange-300">
                    <Shield className="h-5 w-5" />
                    System Audit
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-cyber-text-secondary">
                    Linux vulnerability scanner that detects CVE vulnerabilities and provides patch information.
=======
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
>>>>>>> 892165d (Fixed UI , Updated Captcha , Improved Docker Deployment Guide.)
                  </p>
                </CardContent>
              </Card>

<<<<<<< HEAD
              <Card className="cyber-card hover:border-red-400/50 transition-all duration-300 group">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2 text-red-400 group-hover:text-red-300">
                    <Terminal className="h-5 w-5" />
                    Command Injection
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-cyber-text-secondary">
                    Command injection vulnerability scanner to detect OS command injection flaws.
=======
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
>>>>>>> 892165d (Fixed UI , Updated Captcha , Improved Docker Deployment Guide.)
                  </p>
                </CardContent>
              </Card>

              <Card className="cyber-card hover:border-pink-400/50 transition-all duration-300 group">
                <CardHeader>
<<<<<<< HEAD
                  <CardTitle className="text-lg flex items-center gap-2 text-pink-400 group-hover:text-pink-300">
                    <Wifi className="h-5 w-5" />
                    Network Attack
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-cyber-text-secondary">
                    Network penetration testing framework with multiple modules for comprehensive security assessment.
=======
                  <CardTitle className="text-lg flex items-center gap-3 text-pink-400 group-hover:text-pink-300">
                    <Wifi className="h-6 w-6" />
                    ATTACK SIM
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-cyber-text-secondary leading-relaxed">
                    Multi-vector penetration testing framework with automated exploitation chains 
                    and lateral movement simulation capabilities.
>>>>>>> 892165d (Fixed UI , Updated Captcha , Improved Docker Deployment Guide.)
                  </p>
                </CardContent>
              </Card>

<<<<<<< HEAD
              <Card className="cyber-card hover:border-yellow-400/50 transition-all duration-300 group">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2 text-yellow-400 group-hover:text-yellow-300">
                    <Code className="h-5 w-5" />
                    CORS Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-cyber-text-secondary">
                    CORS misconfiguration scanner to detect insecure cross-origin resource sharing policies.
                  </p>
                </CardContent>
              </Card>

              <Card className="cyber-card hover:border-indigo-400/50 transition-all duration-300 group">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2 text-indigo-400 group-hover:text-indigo-300">
                    <Globe className="h-5 w-5" />
                    Web Server
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-cyber-text-secondary">
                    Web application vulnerability scanning using Nikto to detect known vulnerabilities.
                  </p>
                </CardContent>
              </Card>

              <Card className="cyber-card hover:border-emerald-400/50 transition-all duration-300 group">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2 text-emerald-400 group-hover:text-emerald-300">
                    <Lock className="h-5 w-5" />
                    Crypto Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-cyber-text-secondary">
                    SSL/TLS certificate validation and security configuration analysis.
                  </p>
                </CardContent>
              </Card>

              <Card className="cyber-card hover:border-teal-400/50 transition-all duration-300 group">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2 text-teal-400 group-hover:text-teal-300">
                    <FileText className="h-5 w-5" />
                    Header Audit
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-cyber-text-secondary">
                    Security headers analysis to detect missing or misconfigured HTTP security headers.
                  </p>
                </CardContent>
              </Card>

              <Card className="cyber-card hover:border-violet-400/50 transition-all duration-300 group">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2 text-violet-400 group-hover:text-violet-300">
                    <Shield className="h-5 w-5" />
                    CSP Evaluation
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-cyber-text-secondary">
                    Evaluate Content Security Policy (CSP) settings for potential security issues.
                  </p>
                </CardContent>
              </Card>

              <Card className="cyber-card hover:border-rose-400/50 transition-all duration-300 group">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2 text-rose-400 group-hover:text-rose-300">
                    <AlertTriangle className="h-5 w-5" />
                    Redirect Scan
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-cyber-text-secondary">
                    Detect open redirect vulnerabilities that could be exploited for phishing attacks.
                  </p>
                </CardContent>
              </Card>

              <Card className="cyber-card hover:border-amber-400/50 transition-all duration-300 group">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2 text-amber-400 group-hover:text-amber-300">
                    <FileText className="h-5 w-5" />
                    Data Exposure
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-cyber-text-secondary">
                    Identify exposed files that could contain sensitive information.
=======
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
>>>>>>> 892165d (Fixed UI , Updated Captcha , Improved Docker Deployment Guide.)
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
                        <div className="relative">
                          <Globe className="h-6 w-6 text-cyan-400" />
                          {currentScan.status === "RUNNING" && (
                            <div className="absolute inset-0 h-6 w-6 text-cyan-400 animate-ping opacity-75">
                              <Globe className="h-6 w-6" />
                            </div>
                          )}
                        </div>
                        <span className="cyber-neon-text font-mono">{currentScan.website.url}</span>
                      </CardTitle>
                      <CardDescription className="text-cyber-text-secondary mt-2 flex items-center gap-2">
                        <Cpu className="h-4 w-4 text-purple-400" />
                        <span className="font-mono">{currentScan.scanType}</span>
                        <span className="text-cyber-text-muted">•</span>
                        <span className={`font-semibold ${
                          currentScan.status === "RUNNING" ? "text-cyan-400 animate-pulse" :
                          currentScan.status === "COMPLETED" ? "text-green-400" :
                          currentScan.status === "FAILED" ? "text-red-400" :
                          "text-gray-400"
                        }`}>
                          {currentScan.status}
                        </span>
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={`${getStatusColor(currentScan.status)} font-mono text-xs px-3 py-1 border cyber-border-glow`}>
                        {getStatusIcon(currentScan.status)}
                        <span className="ml-2">{currentScan.status}</span>
                      </Badge>
                      {currentScan.status === "RUNNING" && (
                        <div className="flex items-center gap-2 px-3 py-1 bg-cyan-500/10 border border-cyan-500/30 rounded-full">
                          <div className="h-2 w-2 bg-cyan-400 rounded-full animate-ping"></div>
                          <span className="text-xs text-cyan-400 font-mono uppercase tracking-wide">LIVE</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Progress Bar */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-cyber-text-secondary font-semibold flex items-center gap-2">
                        <Activity className="h-4 w-4 text-cyan-400" />
                        Scan Progress
                      </Label>
                      <span className="text-sm font-mono text-cyan-400 bg-cyan-500/10 px-2 py-1 rounded border border-cyan-500/30">
                        {scanOutput?.progress || 0}%
                      </span>
                    </div>
                    <div className="cyber-progress h-3 relative">
                      <div 
                        className="cyber-progress-fill h-full transition-all duration-500 ease-out"
                        style={{ width: `${scanOutput?.progress || 0}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Terminal-style Output */}
                  <div className="space-y-3">
                    <Label className="text-cyber-text-secondary font-semibold flex items-center gap-2">
                      <Terminal className="h-4 w-4 text-green-400" />
                      Live Terminal Output
                    </Label>
                    <div className="relative">
                      <div className="cyber-terminal">
                        <div className="cyber-terminal-header">
                          <div className="flex gap-2">
                            <div className="cyber-terminal-dot bg-red-500"></div>
                            <div className="cyber-terminal-dot bg-yellow-500"></div>
                            <div className="cyber-terminal-dot bg-green-500"></div>
                          </div>
                          <span className="text-xs text-green-400 font-mono ml-4">CYBER-SHIELD-TERMINAL v2.1.0</span>
                          <div className="ml-auto text-xs text-green-400 font-mono">
                            {currentScan.status === "RUNNING" && "● ACTIVE"}
                          </div>
                        </div>
                        <ScrollArea className="cyber-terminal-content">
                          {!scanOutput ? (
                            <div className="space-y-2">
                              <div className="animate-pulse text-cyan-400">
                                <span className="text-green-400">cyber@shield:~$</span> Initializing quantum scan protocols...
                              </div>
                              <div className="animate-pulse text-cyan-400">
                                <span className="text-green-400">cyber@shield:~$</span> Establishing secure connection to scan matrix...
                              </div>
                              <div className="animate-pulse text-cyan-400">
                                <span className="text-green-400">cyber@shield:~$</span> Loading neural network modules...
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <div className="text-cyan-400 font-bold">
                                <span className="text-green-400">cyber@shield:~$</span> cyber-scanner --target {currentScan.website.url} --protocol{" "}
                                {currentScan.scanType.toLowerCase()}
                              </div>
                              <div className="text-yellow-400 font-semibold">
                                [INIT] Quantum scan matrix initialized at {new Date().toLocaleTimeString()}
                              </div>
                              <div className="text-blue-400">[TARGET] {currentScan.website.url}</div>
                              <div className="text-blue-400">[PROTOCOL] {currentScan.scanType}</div>
                              <div className="text-blue-400">[SESSION] {currentScan.id}</div>
                              <div className="text-yellow-400 font-semibold">[EXEC] Deploying security probes...</div>
                              <div className="whitespace-pre-wrap text-green-400">{scanOutput.output}</div>
                              {currentScan.status === "COMPLETED" && (
                                <div className="text-green-400 font-bold animate-pulse">
                                  [SUCCESS] ✓ Quantum scan matrix completed at {new Date().toLocaleTimeString()}
                                </div>
                              )}
                              {currentScan.status === "FAILED" && (
                                <div className="text-red-400 font-bold animate-pulse">
                                  [ERROR] ✗ Scan matrix failure: {currentScan.errorMessage}
                                </div>
                              )}
                            </div>
                          )}
                        </ScrollArea>
                      </div>
                    </div>
                  </div>

                  {/* Quick Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 cyber-card border border-cyan-500/20 hover:border-cyan-400/50 transition-all">
                      <div className="text-2xl font-bold text-cyan-400 font-mono">{scanOutput?.progress || 0}%</div>
                      <div className="text-xs text-cyber-text-muted uppercase tracking-wide">Progress</div>
                    </div>
                    <div className="text-center p-4 cyber-card border border-red-500/20 hover:border-red-400/50 transition-all">
                      <div className="text-2xl font-bold text-red-400 font-mono">{currentScan.vulnerabilities.length}</div>
                      <div className="text-xs text-cyber-text-muted uppercase tracking-wide">Threats</div>
                    </div>
                    <div className="text-center p-4 cyber-card border border-purple-500/20 hover:border-purple-400/50 transition-all">
                      <div className="text-lg font-bold text-purple-400 font-mono text-xs">{currentScan.scanType}</div>
                      <div className="text-xs text-cyber-text-muted uppercase tracking-wide">Protocol</div>
                    </div>
                    <div className="text-center p-4 cyber-card border border-green-500/20 hover:border-green-400/50 transition-all">
                      <div className={`text-lg font-bold font-mono ${
                        currentScan.status === "RUNNING" ? "text-cyan-400 animate-pulse" :
                        currentScan.status === "COMPLETED" ? "text-green-400" :
                        currentScan.status === "FAILED" ? "text-red-400" :
                        "text-gray-400"
                      }`}>
                        {currentScan.status}
                      </div>
                      <div className="text-xs text-cyber-text-muted uppercase tracking-wide">Status</div>
                    </div>
                  </div>

                  {/* Detected Vulnerabilities */}
                  {currentScan.vulnerabilities.length > 0 && (
                    <div className="space-y-3">
                      <Label className="text-cyber-text-secondary font-semibold flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-400" />
                        Detected Threats
                      </Label>
                      <div className="space-y-3 max-h-64 overflow-y-auto">
                        {currentScan.vulnerabilities.map((vuln, index) => (
                          <div key={index} className="cyber-card border border-red-500/20 hover:border-red-400/50 transition-all p-4">
                            <div className="flex items-center gap-3 mb-2">
                              <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide cyber-severity-${vuln.severity.toLowerCase()}`}>
                                {vuln.severity}
                              </div>
                              <span className="font-semibold text-cyber-text-primary">{vuln.title}</span>
                            </div>
                            <p className="text-sm text-cyber-text-secondary mb-2">{vuln.description}</p>
                            {vuln.solution && (
                              <p className="text-sm text-green-400 mt-2 font-mono">
                                <strong className="text-green-300">SOLUTION:</strong> {vuln.solution}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    {currentScan.status === "COMPLETED" && (
                      <Button 
                        onClick={() => generateHTMLReport(currentScan)}
                        className="cyber-button bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 border-green-400"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        EXPORT REPORT
                      </Button>
                    )}
                    <Button 
                      variant="outline" 
                      onClick={() => setActiveTab("history")}
                      className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-400/50"
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      SCAN HISTORY
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
<<<<<<< HEAD
              <Card className="cyber-card border-2 border-dashed border-cyan-500/20">
                <CardContent className="flex items-center justify-center h-64 relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-purple-500/5 rounded-lg"></div>
                  <div className="text-center space-y-2">
                    <div className="relative">
                      <Shield className="h-16 w-16 text-cyan-400/50 mx-auto animate-pulse" />
                      <div className="absolute inset-0 h-16 w-16 text-cyan-400/20 mx-auto animate-ping">
                        <Shield className="h-16 w-16" />
                      </div>
                    </div>
                    <p className="text-cyber-text-muted text-lg">Initialize a security scan to view live analysis</p>
                    <Button 
                      onClick={() => setActiveTab("scanner")}
                      className="cyber-button bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 border-cyan-400"
                    >
                      <Terminal className="h-4 w-4 mr-2" />
                      ACCESS SCANNER
=======
              <Card className="cyber-card-pro border-2 border-dashed border-cyan-500/20">
                <CardContent className="flex items-center justify-center h-80 relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-purple-500/5 rounded-lg"></div>
                  <div className="text-center space-y-6 relative z-10">
                    <div className="relative">
                      <Shield className="h-20 w-20 text-cyan-400/50 mx-auto animate-pulse" />
                      <div className="absolute inset-0 h-20 w-20 text-cyan-400/20 mx-auto animate-ping">
                        <Shield className="h-20 w-20" />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <p className="text-cyber-text-primary text-xl font-mono font-bold">AWAITING SCAN INITIATION</p>
                      <p className="text-cyber-text-muted text-sm font-mono">
                        No active security scan detected. Initialize vulnerability assessment protocols.
                      </p>
                    </div>
                    <Button 
                      onClick={() => setActiveTab("scanner")}
                      className="cyber-button bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 border-cyan-400 px-8 py-4 text-lg"
                    >
                      <Terminal className="h-5 w-5 mr-3" />
                      ACCESS SCANNER INTERFACE
>>>>>>> 892165d (Fixed UI , Updated Captcha , Improved Docker Deployment Guide.)
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
          )}

          {/* History Tab */}
          {activeTab === "history" && (
          <div className="space-y-6">
            {selectedScan ? (
              <ScanResults scan={selectedScan} onClose={() => setSelectedScan(null)} />
            ) : (
              <Card className="cyber-card border-2 border-cyan-500/20 bg-gradient-to-br from-slate-900/50 to-slate-800/50 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-2xl flex items-center gap-3">
                    <Clock className="h-6 w-6 text-cyan-400" />
                    <span className="cyber-text-gradient">Scan Archive</span>
                  </CardTitle>
                  <CardDescription className="text-cyber-text-secondary">
                    View all previous vulnerability scans and their results. Click on any scan to view detailed results.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {scans.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="relative">
                          <Database className="h-16 w-16 text-cyan-400/30 mx-auto mb-4" />
                          <div className="absolute inset-0 h-16 w-16 text-cyan-400/10 mx-auto animate-ping">
                            <Database className="h-16 w-16" />
                          </div>
                        </div>
                        <p className="text-cyber-text-muted text-lg">No scan records in archive</p>
                        <p className="text-cyber-text-muted text-sm mt-2">Execute your first security scan to populate the database</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {scans.map((scan) => (
                          <Card
                            key={scan.id}
                            className="cyber-card border border-cyan-500/10 hover:border-cyan-400/30 transition-all cursor-pointer p-4 cyber-hover-glow group"
                            onClick={() => fetchScanDetails(scan.id)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4 flex-1">
                                {getStatusIcon(scan.status)}
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <p className="font-medium text-cyber-text-primary font-mono group-hover:text-cyan-400 transition-colors">
                                      {scan.website.url}
                                    </p>
                                    <Badge variant="outline" className="text-xs border-purple-500/30 text-purple-400 bg-purple-500/10">
                                      {scan.scanType}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-cyber-text-muted font-mono">
                                    EXECUTED: {new Date(scan.createdAt).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <Badge className={`${getStatusColor(scan.status)} font-mono text-xs border cyber-border-glow`}>
                                  {scan.status}
                                </Badge>
                                {scan.vulnerabilities.length > 0 && (
                                  <Badge className="bg-red-500/20 text-red-400 border-red-500/30 font-mono text-xs">
                                    {scan.vulnerabilities.length} THREATS
                                  </Badge>
                                )}
                                <Button variant="ghost" size="sm" className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
          )}
        </div>
      </div>
    </div>
  )
}

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
import { Loader2, Shield, Globe, CheckCircle, XCircle, Clock, Eye, FileText } from "lucide-react"
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
}

interface ScanResult {
  scanId: string
  output: string
  progress: number
  status: string
}

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: any) => any
      reset?: (widgetId: any) => void
    }
  }
}

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
  const [activeTab, setActiveTab] = useState("scanner")
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
          if (data.vulnerabilities && data.vulnerabilities.length > 0) {
            setCurrentScan((prev) => {
              if (!prev) return prev
              return {
                ...prev,
                vulnerabilities: data.vulnerabilities,
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

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Vulnerability Scanner</h1>
          </div>
          <p className="text-muted-foreground">
            Scan websites for security vulnerabilities using industry-standard tools
          </p>
        </div>

        <div className="space-y-6">
          {/* Scanner Tab */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Start New Scan</CardTitle>
                <CardDescription>
                  Enter a website URL and select the type of vulnerability scan to perform
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="url">Website URL</Label>
                  <div className="flex gap-2">
                    <Input
                      id="url"
                      placeholder="https://example.com"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      className="flex-1"
                    />
                    <Button onClick={startScan} disabled={isScanning || !url || !captchaToken}>
                      {isScanning ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Scanning...
                        </>
                      ) : (
                        "Start Scan"
                      )}
                    </Button>
                  </div>
                </div>

                {/* CAPTCHA */}
                {turnstileSiteKey ? (
                  <div className="space-y-2">
                    <Label>Verification</Label>
                    <TurnstileWidget
                      siteKey={turnstileSiteKey}
                      onVerify={(token) => setCaptchaToken(token)}
                      onExpire={() => setCaptchaToken(null)}
                      className="mt-1"
                    />
                    {!captchaToken ? (
                      <p className="text-xs text-muted-foreground">Complete the CAPTCHA to enable scanning.</p>
                    ) : (
                      <p className="text-xs text-muted-foreground">CAPTCHA verified.</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Alert>
                      <AlertDescription>
                        CAPTCHA is not configured. Set TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY to enable scanning.
                      </AlertDescription>
                    </Alert>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="scanType">Scan Type</Label>
                  <Select value={scanType} onValueChange={setScanType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select scan type" />
                    </SelectTrigger>
                    <SelectContent>
                      {/* existing */}
                      <SelectItem value="FULL_SCAN">Full Comprehensive Scan</SelectItem>
                      <SelectItem value="NMAP">Network Scan (Nmap)</SelectItem>
                      <SelectItem value="NIKTO">Web Server Scan (Nikto)</SelectItem>
                      <SelectItem value="NUCLEI">Vulnerability Scan (Nuclei)</SelectItem>
                      <SelectItem value="SQLMAP">SQL Injection Scan (SQLMap)</SelectItem>
                      <SelectItem value="VULS">System Vulnerability Scan (Vuls)</SelectItem>
                      <SelectItem value="COMMIX">Command Injection Scan (Commix)</SelectItem>
                      <SelectItem value="NETTACKER">Network Attack Scan (Nettacker)</SelectItem>
                      <SelectItem value="CORSY">CORS Misconfiguration Scan (Corsy)</SelectItem>
                      <SelectItem value="SSL_CHECK">SSL/TLS Security Check</SelectItem>
                      <SelectItem value="HEADER_ANALYSIS">Security Headers Analysis</SelectItem>
                      {/* new passive tools */}
                      <SelectItem value="CSP_EVAL">CSP Evaluation</SelectItem>
                      <SelectItem value="OPEN_REDIRECT_CHECK">Open Redirect Check</SelectItem>
                      <SelectItem value="EXPOSED_FILES">Exposed Files Check</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Scan Types Info */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Full Scan</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Comprehensive security assessment using multiple tools including Nmap, Nuclei, SQLMap, SSL analysis,
                    and more.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Network Scan</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Port scanning and service detection using Nmap to identify open ports and running services.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Nuclei Scan</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Fast vulnerability scanner using templates to detect known vulnerabilities across various
                    technologies.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">SQLMap Scan</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Automated SQL injection detection and exploitation tool to find database vulnerabilities.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Vuls Scan</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Linux vulnerability scanner that detects CVE vulnerabilities and provides patch information.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Commix Scan</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Command injection vulnerability scanner to detect OS command injection flaws.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Nettacker Scan</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Network penetration testing framework with multiple modules for comprehensive security assessment.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Corsy Scan</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    CORS misconfiguration scanner to detect insecure cross-origin resource sharing policies.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Web Server Scan</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Web application vulnerability scanning using Nikto to detect known vulnerabilities.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">SSL/TLS Check</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    SSL/TLS certificate validation and security configuration analysis.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Header Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Security headers analysis to detect missing or misconfigured HTTP security headers.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">CSP Evaluation</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Evaluate Content Security Policy (CSP) settings for potential security issues.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Open Redirect Check</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Detect open redirect vulnerabilities that could be exploited for phishing attacks.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Exposed Files Check</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Identify exposed files that could contain sensitive information.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Live Results Tab */}
          <div className="space-y-6">
            {currentScan ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Globe className="h-5 w-5" />
                        {currentScan.website.url}
                      </CardTitle>
                      <CardDescription>
                        {currentScan.scanType} • {currentScan.status}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(currentScan.status)}>{currentScan.status}</Badge>
                      {currentScan.status === "RUNNING" && (
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                          <span className="text-sm text-muted-foreground">Live</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Scan Progress</Label>
                      <span className="text-sm text-muted-foreground">{scanOutput?.progress || 0}%</span>
                    </div>
                    <Progress value={scanOutput?.progress || 0} className="w-full" />
                  </div>

                  {/* Terminal-style Output */}
                  <div className="space-y-2">
                    <Label>Live Terminal Output</Label>
                    <div className="relative">
                      <div className="absolute top-2 left-2 z-10">
                        <div className="flex gap-1">
                          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        </div>
                      </div>
                      <ScrollArea className="h-96 w-full rounded-md border border-gray-300 bg-black p-4 font-mono text-sm">
                        <div className="text-green-400">
                          {!scanOutput ? (
                            <div className="space-y-1">
                              <div className="animate-pulse">$ Initializing scan...</div>
                              <div className="animate-pulse">$ Connecting to scan server...</div>
                              <div className="animate-pulse">$ Preparing scan environment...</div>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <div className="text-cyan-400">
                                $ vuln-scanner --target {currentScan.website.url} --mode{" "}
                                {currentScan.scanType.toLowerCase()}
                              </div>
                              <div className="text-yellow-400">
                                [+] Scan initialized at {new Date().toLocaleTimeString()}
                              </div>
                              <div className="text-blue-400">[+] Target: {currentScan.website.url}</div>
                              <div className="text-blue-400">[+] Scan Type: {currentScan.scanType}</div>
                              <div className="text-blue-400">[+] Scan ID: {currentScan.id}</div>
                              <div className="text-yellow-400">[+] Starting scan...</div>
                              <div className="whitespace-pre-wrap">{scanOutput.output}</div>
                              {currentScan.status === "COMPLETED" && (
                                <div className="text-green-400 font-bold">
                                  [✓] Scan completed successfully at {new Date().toLocaleTimeString()}
                                </div>
                              )}
                              {currentScan.status === "FAILED" && (
                                <div className="text-red-400 font-bold">
                                  [✗] Scan failed: {currentScan.errorMessage}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    </div>
                  </div>

                  {/* Quick Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-lg font-bold text-blue-600">{scanOutput?.progress || 0}%</div>
                      <div className="text-xs text-muted-foreground">Progress</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-lg font-bold text-green-600">{currentScan.vulnerabilities.length}</div>
                      <div className="text-xs text-muted-foreground">Issues Found</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-lg font-bold text-purple-600">{currentScan.scanType}</div>
                      <div className="text-xs text-muted-foreground">Scan Type</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-lg font-bold text-orange-600">{currentScan.status}</div>
                      <div className="text-xs text-muted-foreground">Status</div>
                    </div>
                  </div>

                  {/* Detected Vulnerabilities */}
                  {currentScan.vulnerabilities.length > 0 && (
                    <div className="space-y-2">
                      <Label>Detected Vulnerabilities</Label>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {currentScan.vulnerabilities.map((vuln, index) => (
                          <div key={index} className="p-4 bg-white rounded-lg shadow-md">
                            <div className="flex items-center gap-2 mb-1">
                              <div
                                className="p-2 rounded-full"
                                style={{ backgroundColor: getSeverityColor(vuln.severity) }}
                              >
                                <span className="text-white font-medium">{vuln.severity}</span>
                              </div>
                              <span className="font-medium">{vuln.title}</span>
                            </div>
                            <p className="text-sm">{vuln.description}</p>
                            {vuln.solution && (
                              <p className="text-sm text-muted-foreground mt-1">
                                <strong>Solution:</strong> {vuln.solution}
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
                      <Button onClick={() => generateHTMLReport(currentScan)}>
                        <FileText className="h-4 w-4 mr-2" />
                        Download HTML Report
                      </Button>
                    )}
                    <Button variant="outline" onClick={() => setActiveTab("history")}>
                      View History
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="flex items-center justify-center h-64">
                  <div className="text-center space-y-2">
                    <Shield className="h-12 w-12 text-muted-foreground mx-auto" />
                    <p className="text-muted-foreground">Start a scan to see live results here</p>
                    <Button onClick={() => setActiveTab("scanner")}>Go to Scanner</Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* History Tab */}
          <div className="space-y-6">
            {selectedScan ? (
              <ScanResults scan={selectedScan} onClose={() => setSelectedScan(null)} />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Scan History</CardTitle>
                  <CardDescription>
                    View all previous vulnerability scans and their results. Click on any scan to view detailed results.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {scans.length === 0 ? (
                      <div className="text-center py-8">
                        <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">No scans performed yet</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {scans.map((scan) => (
                          <Card
                            key={scan.id}
                            className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                            onClick={() => fetchScanDetails(scan.id)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3 flex-1">
                                {getStatusIcon(scan.status)}
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <p className="font-medium">{scan.website.url}</p>
                                    <Badge variant="outline" className="text-xs">
                                      {scan.scanType}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    {new Date(scan.createdAt).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge className={getStatusColor(scan.status)}>{scan.status}</Badge>
                                {scan.vulnerabilities.length > 0 && (
                                  <Badge variant="destructive">{scan.vulnerabilities.length} vulnerabilities</Badge>
                                )}
                                <Button variant="ghost" size="sm">
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
        </div>
      </div>
    </div>
  )
}

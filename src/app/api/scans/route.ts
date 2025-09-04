import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { verifyTurnstileToken } from "@/lib/turnstile"

export async function GET() {
  try {
    const scans = await db.scan.findMany({
      include: {
        website: true,
        vulnerabilities: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(scans)
  } catch (error) {
    console.error("Failed to fetch scans:", error)
    return NextResponse.json({ error: "Failed to fetch scans" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { url, scanType, captchaToken } = await request.json()

    if (!url || !scanType) {
      return NextResponse.json({ error: "URL and scan type are required" }, { status: 400 })
    }

    // Validate scan type
    const validScanTypes = [
      'NMAP', 'NIKTO', 'SSL_CHECK', 'HEADER_ANALYSIS', 'NUCLEI', 'SQLMAP', 
      'VULS', 'COMMIX', 'NETTACKER', 'CORSY', 'CSP_EVAL', 'OPEN_REDIRECT_CHECK', 
      'EXPOSED_FILES', 'FULL_SCAN',
      // New advanced scan modes
      'NETWORK_RECONNAISSANCE', 'WEB_APPLICATION_SCAN', 'SSL_TLS_ANALYSIS',
      'DIRECTORY_ENUMERATION', 'SQL_INJECTION_TEST', 'VULNERABILITY_ASSESSMENT'
    ]

    if (!validScanTypes.includes(scanType)) {
      return NextResponse.json({ error: "Invalid scan type" }, { status: 400 })
    }

    if (!process.env.TURNSTILE_SECRET_KEY) {
      return NextResponse.json(
        { error: "CAPTCHA not configured on server. Set TURNSTILE_SECRET_KEY." },
        { status: 503 },
      )
    }

    const result = await verifyTurnstileToken(captchaToken)
    if (!result.ok) {
      return NextResponse.json({ error: "CAPTCHA verification failed", details: result.errors || [] }, { status: 403 })
    }

    // Validate URL format
    try {
      new URL(url)
    } catch {
      return NextResponse.json({ error: "Invalid URL format" }, { status: 400 })
    }

    // Find or create website
    let website = await db.website.findUnique({
      where: { url },
    })

    if (!website) {
      website = await db.website.create({
        data: {
          url,
          name: new URL(url).hostname,
        },
      })
    }

    // Create scan
    const scan = await db.scan.create({
      data: {
        websiteId: website.id,
        scanType,
        status: "PENDING",
      },
      include: {
        website: true,
        vulnerabilities: true,
      },
    })

    return NextResponse.json(scan)
  } catch (error) {
    console.error("Failed to create scan:", error)
    return NextResponse.json({ error: "Failed to create scan" }, { status: 500 })
  }
}

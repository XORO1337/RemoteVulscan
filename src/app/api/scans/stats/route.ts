import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    // Get scan statistics
    const [
      totalScans,
      completedScans, 
      failedScans,
      runningScans,
      recentScans,
      vulnerabilityStats,
      scanTypeStats
    ] = await Promise.all([
      // Total scans
      db.scan.count(),
      
      // Completed scans
      db.scan.count({ where: { status: 'COMPLETED' } }),
      
      // Failed scans
      db.scan.count({ where: { status: 'FAILED' } }),
      
      // Running scans
      db.scan.count({ where: { status: 'RUNNING' } }),
      
      // Recent scans (last 24 hours)
      db.scan.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      }),
      
      // Vulnerability statistics
      db.vulnerability.groupBy({
        by: ['severity'],
        _count: {
          severity: true
        }
      }),
      
      // Scan type statistics
      db.scan.groupBy({
        by: ['scanType'],
        _count: {
          scanType: true
        }
      })
    ])

    // Get vulnerability count by severity
    const vulnerabilitySummary = vulnerabilityStats.reduce((acc, item) => {
      const severity = item.severity.toLowerCase() as keyof typeof acc
      if (severity in acc) {
        acc[severity] = item._count.severity
      }
      return acc
    }, { critical: 0, high: 0, medium: 0, low: 0, info: 0 })

    // Get most popular scan types
    const popularScanTypes = scanTypeStats
      .sort((a, b) => b._count.scanType - a._count.scanType)
      .slice(0, 5)
      .map(item => ({
        scanType: item.scanType,
        count: item._count.scanType
      }))

    // Calculate success rate
    const successRate = totalScans > 0 
      ? Math.round((completedScans / totalScans) * 100) 
      : 0

    // Get recent scan activity (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const recentActivity = await db.scan.findMany({
      where: {
        createdAt: { gte: sevenDaysAgo }
      },
      select: {
        createdAt: true,
        status: true,
        scanType: true
      },
      orderBy: { createdAt: 'desc' }
    })

    // Group activity by day
    const activityByDay = recentActivity.reduce((acc, scan) => {
      const day = scan.createdAt.toISOString().split('T')[0]
      if (!acc[day]) {
        acc[day] = { total: 0, completed: 0, failed: 0 }
      }
      acc[day].total++
      if (scan.status === 'COMPLETED') acc[day].completed++
      if (scan.status === 'FAILED') acc[day].failed++
      return acc
    }, {} as Record<string, { total: number, completed: number, failed: number }>)

    // Get average scan duration for completed scans
    const completedScansWithDuration = await db.scan.findMany({
      where: {
        status: 'COMPLETED',
        startedAt: { not: null },
        completedAt: { not: null }
      },
      select: {
        startedAt: true,
        completedAt: true,
        scanType: true
      }
    })

    const averageDurations = completedScansWithDuration.reduce((acc, scan) => {
      if (scan.startedAt && scan.completedAt) {
        const duration = scan.completedAt.getTime() - scan.startedAt.getTime()
        if (!acc[scan.scanType]) {
          acc[scan.scanType] = { total: 0, count: 0 }
        }
        acc[scan.scanType].total += duration
        acc[scan.scanType].count++
      }
      return acc
    }, {} as Record<string, { total: number, count: number }>)

    const scanDurations = Object.entries(averageDurations).map(([scanType, data]) => ({
      scanType,
      averageDuration: Math.round(data.total / data.count / 1000), // Convert to seconds
      sampleSize: data.count
    }))

    const response = {
      timestamp: new Date().toISOString(),
      overview: {
        total_scans: totalScans,
        completed_scans: completedScans,
        failed_scans: failedScans,
        running_scans: runningScans,
        recent_scans_24h: recentScans,
        success_rate_percent: successRate
      },
      vulnerabilities: {
        total: Object.values(vulnerabilitySummary).reduce((a, b) => a + b, 0),
        by_severity: vulnerabilitySummary
      },
      scan_types: {
        popular: popularScanTypes,
        average_durations: scanDurations
      },
      activity: {
        last_7_days: activityByDay,
        total_days_with_activity: Object.keys(activityByDay).length
      },
      performance: {
        scans_per_day_avg: Math.round(totalScans / Math.max(1, Object.keys(activityByDay).length)),
        vulnerabilities_per_scan_avg: totalScans > 0 
          ? Math.round(Object.values(vulnerabilitySummary).reduce((a, b) => a + b, 0) / totalScans)
          : 0
      }
    }

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
      }
    })
  } catch (error) {
    console.error('Failed to get scan statistics:', error)
    
    return NextResponse.json({
      error: 'Failed to retrieve scan statistics',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

import { Request, Response } from 'express';
import { getDatabase } from '@/utils/database';
import { logger } from '@/utils/logger';
import { ApiError, asyncHandler } from '@/middleware/errorHandler';
import { ScanOrchestrator } from '@/services/scanOrchestrator';
// Prisma enums replaced with string fields (SQLite doesn't support enums)
// Define local constants for allowed values
export const ScanStatus = {
  PENDING: 'PENDING',
  QUEUED: 'QUEUED',
  RUNNING: 'RUNNING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED'
} as const;

export const ScanType = {
  NMAP: 'NMAP',
  NIKTO: 'NIKTO',
  NUCLEI: 'NUCLEI',
  TESTSSL: 'TESTSSL',
  FULL_SCAN: 'FULL_SCAN'
  // Add more as needed
} as const;

export type ScanStatusType = (typeof ScanStatus)[keyof typeof ScanStatus];
export type ScanTypeType = (typeof ScanType)[keyof typeof ScanType];
// (uuid import removed – not used)

/**
 * @swagger
 * /api/v1/scans:
 *   get:
 *     summary: Get all scans with pagination
 *     tags: [Scans]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, RUNNING, COMPLETED, FAILED]
 *         description: Filter by scan status
 *     responses:
 *       200:
 *         description: List of scans
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 scans:
 *                   type: array
 *                 pagination:
 *                   type: object
 */
export const getAllScans = asyncHandler(async (req: any, res: any) => {
  const db = getDatabase();
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const status = req.query.status as ScanStatusType;
  
  const skip = (page - 1) * limit;

  const whereClause = status ? { status } : {};

  const [scans, total] = await Promise.all([
  db.scan.findMany({
      where: whereClause,
      include: {
        website: true,
        vulnerabilities: true,
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
  db.scan.count({ where: whereClause })
  ]);

  const totalPages = Math.ceil(total / limit);

  res.json({
    scans,
    pagination: {
      currentPage: page,
      totalPages,
      totalItems: total,
      itemsPerPage: limit,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    }
  });
});

/**
 * @swagger
 * /api/v1/scans/{id}:
 *   get:
 *     summary: Get scan by ID
 *     tags: [Scans]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Scan ID
 *     responses:
 *       200:
 *         description: Scan details
 *       404:
 *         description: Scan not found
 */
export const getScanById = asyncHandler(async (req: any, res: any) => {
  const db = getDatabase();
  const { id } = req.params;

  const scan = await db.scan.findUnique({
    where: { id },
    include: {
      website: true,
      vulnerabilities: {
        orderBy: { severity: 'desc' }
      }
    }
  });

  if (!scan) {
    throw new ApiError('Scan not found', 404);
  }

  // Parse results if they exist
  let parsedResults = null;
  if (scan.results) {
    try {
      parsedResults = JSON.parse(scan.results);
    } catch (error) {
      logger.warn('Failed to parse scan results:', error);
    }
  }

  res.json({
    ...scan,
    results: parsedResults
  });
});

/**
 * @swagger
 * /api/v1/scans:
 *   post:
 *     summary: Create a new scan
 *     tags: [Scans]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - url
 *               - scanType
 *             properties:
 *               url:
 *                 type: string
 *                 description: Target URL to scan
 *               scanType:
 *                 type: string
 *                 enum: [NMAP, NIKTO, NUCLEI, TESTSSL, SSLSCAN, SQLMAP, FULL_SCAN]
 *               scanMode:
 *                 type: string
 *                 description: Advanced scan mode for multi-tool scans
 *               options:
 *                 type: object
 *                 description: Additional scan options
 *     responses:
 *       201:
 *         description: Scan created successfully
 *       400:
 *         description: Invalid input
 */
export const createScan = asyncHandler(async (req: any, res: any) => {
  const db = getDatabase();
  const { url, scanType, scanMode, options } = req.body;

  // Validate required fields
  if (!url || !scanType) {
    throw new ApiError('URL and scanType are required', 400);
  }

  // Validate URL format
  try {
    new URL(url);
  } catch (error) {
    throw new ApiError('Invalid URL format', 400);
  }

  // Validate scan type
  if (!Object.values(ScanType).includes(scanType)) {
    throw new ApiError('Invalid scan type', 400);
  }

  const scanOrchestrator = req.app.locals.scanOrchestrator as ScanOrchestrator;

  try {
    // Find or create website
  const website = await db.website.upsert({
      where: { url },
      update: { updatedAt: new Date() },
      create: { url, name: new URL(url).hostname }
    });

    // Create scan record
  const scan = await db.scan.create({
      data: {
        websiteId: website.id,
        scanType,
        scanMode,
        status: ScanStatus.PENDING,
      },
      include: {
        website: true
      }
    });

    // Queue the scan
    const jobId = await scanOrchestrator.queueScan({
      scanId: scan.id,
      websiteId: website.id,
      url,
      scanType,
      scanMode,
      options
    });

    logger.info('Scan created and queued', { 
      scanId: scan.id, 
      url, 
      scanType, 
      jobId 
    });

    res.status(201).json({
      scan,
      jobId,
      message: 'Scan created and queued successfully'
    });
  } catch (error) {
    logger.error('Failed to create scan:', error);
    throw new ApiError('Failed to create scan', 500);
  }
});

/**
 * @swagger
 * /api/v1/scans/{id}/cancel:
 *   post:
 *     summary: Cancel a scan
 *     tags: [Scans]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Scan ID
 *     responses:
 *       200:
 *         description: Scan cancelled successfully
 *       404:
 *         description: Scan not found
 *       400:
 *         description: Scan cannot be cancelled
 */
export const cancelScan = asyncHandler(async (req: any, res: any) => {
  const db = getDatabase();
  const { id } = req.params;

  const scan = await db.scan.findUnique({
    where: { id }
  });

  if (!scan) {
    throw new ApiError('Scan not found', 404);
  }

  if (scan.status === ScanStatus.COMPLETED || scan.status === ScanStatus.FAILED) {
    throw new ApiError('Cannot cancel completed or failed scan', 400);
  }

  const scanOrchestrator = req.app.locals.scanOrchestrator as ScanOrchestrator;
  const cancelled = await scanOrchestrator.cancelScan(id);

  if (!cancelled) {
    throw new ApiError('Failed to cancel scan', 500);
  }

  res.json({
    message: 'Scan cancelled successfully',
    scanId: id
  });
});

/**
 * @swagger
 * /api/v1/scans/stats:
 *   get:
 *     summary: Get scan statistics
 *     tags: [Scans]
 *     responses:
 *       200:
 *         description: Scan statistics
 */
export const getScanStats = asyncHandler(async (req: any, res: any) => {
  const db = getDatabase();
  const [totalScans, completedScans, failedScans, runningScans, pendingScans] = await Promise.all([
    db.scan.count(),
    db.scan.count({ where: { status: ScanStatus.COMPLETED } }),
    db.scan.count({ where: { status: ScanStatus.FAILED } }),
    db.scan.count({ where: { status: ScanStatus.RUNNING } }),
    db.scan.count({ where: { status: ScanStatus.PENDING } })
  ]);

  const totalVulnerabilities = await db.vulnerability.count();
  const criticalVulns = await db.vulnerability.count({ 
    where: { severity: 'CRITICAL' } 
  });
  const highVulns = await db.vulnerability.count({ 
    where: { severity: 'HIGH' } 
  });

  const scanOrchestrator = req.app.locals.scanOrchestrator as ScanOrchestrator;
  const queueStats = await scanOrchestrator.getQueueStats();

  res.json({
    scans: {
      total: totalScans,
      completed: completedScans,
      failed: failedScans,
      running: runningScans,
      pending: pendingScans,
      successRate: totalScans > 0 ? (completedScans / totalScans) * 100 : 0
    },
    vulnerabilities: {
      total: totalVulnerabilities,
      critical: criticalVulns,
      high: highVulns
    },
    queue: queueStats
  });
});

/**
 * @swagger
 * /api/v1/scans/queue:
 *   get:
 *     summary: Get queue status
 *     tags: [Scans]
 *     responses:
 *       200:
 *         description: Queue status and statistics
 */
export const getQueueStatus = asyncHandler(async (req: any, res: any) => {
  const scanOrchestrator = req.app.locals.scanOrchestrator as ScanOrchestrator;
  const queueStats = await scanOrchestrator.getQueueStats();

  res.json({
    timestamp: new Date().toISOString(),
    ...queueStats
  });
});

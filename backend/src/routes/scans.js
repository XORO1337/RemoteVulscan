const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

const router = express.Router();

// Rate limiting for scan creation
const scanCreateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // limit each IP to 10 scan requests per 5 minutes
  message: {
    error: 'Too many scan requests. Please wait before creating new scans.',
    retryAfter: '5 minutes'
  }
});

/**
 * @swagger
 * /api/v1/scans:
 *   post:
 *     summary: Create a new security scan
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
 *                 format: uri
 *                 example: "https://example.com"
 *               scanType:
 *                 type: string
 *                 enum: [NMAP, NIKTO, NUCLEI, SSL_CHECK, FULL_SCAN, NETWORK_RECONNAISSANCE, WEB_APPLICATION_SCAN, SSL_TLS_ANALYSIS, DIRECTORY_ENUMERATION, SQL_INJECTION_TEST, VULNERABILITY_ASSESSMENT]
 *                 example: "FULL_SCAN"
 *               priority:
 *                 type: string
 *                 enum: [low, normal, high]
 *                 default: normal
 *               options:
 *                 type: object
 *                 properties:
 *                   timeout:
 *                     type: integer
 *                     minimum: 30000
 *                     maximum: 3600000
 *                   deepScan:
 *                     type: boolean
 *                     default: false
 *     responses:
 *       201:
 *         description: Scan created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Scan'
 *       400:
 *         description: Invalid request parameters
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: Internal server error
 */
router.post('/', 
  scanCreateLimiter,
  [
    body('url')
      .isURL({ protocols: ['http', 'https'], require_protocol: true })
      .withMessage('Valid URL is required'),
    body('scanType')
      .isIn(['NMAP', 'NIKTO', 'NUCLEI', 'SSL_CHECK', 'FULL_SCAN', 'NETWORK_RECONNAISSANCE', 'WEB_APPLICATION_SCAN', 'SSL_TLS_ANALYSIS', 'DIRECTORY_ENUMERATION', 'SQL_INJECTION_TEST', 'VULNERABILITY_ASSESSMENT'])
      .withMessage('Invalid scan type'),
    body('priority')
      .optional()
      .isIn(['low', 'normal', 'high'])
      .withMessage('Priority must be low, normal, or high'),
    body('options.timeout')
      .optional()
      .isInt({ min: 30000, max: 3600000 })
      .withMessage('Timeout must be between 30 seconds and 1 hour'),
    body('options.deepScan')
      .optional()
      .isBoolean()
      .withMessage('deepScan must be a boolean')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array(),
          timestamp: new Date().toISOString()
        });
      }

      const { url, scanType, priority = 'normal', options = {} } = req.body;
      
      logger.info(`Creating new scan: ${scanType} for ${url}`);
      
      const scan = await req.services.scan.createScan({
        url,
        scanType,
        priority,
        options
      });

      res.status(201).json({
        success: true,
        data: scan,
        message: 'Scan created successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

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
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, RUNNING, COMPLETED, FAILED]
 *       - in: query
 *         name: scanType
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of scans
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Scan'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 */
router.get('/',
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('status').optional().isIn(['PENDING', 'RUNNING', 'COMPLETED', 'FAILED']),
    query('scanType').optional().isString()
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { page = 1, limit = 20, status, scanType } = req.query;
      
      const result = await req.services.scan.getScans({
        page: parseInt(page),
        limit: parseInt(limit),
        filters: { status, scanType }
      });

      res.json({
        success: true,
        data: result.scans,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/scans/{scanId}:
 *   get:
 *     summary: Get scan details by ID
 *     tags: [Scans]
 *     parameters:
 *       - in: path
 *         name: scanId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Scan details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/ScanDetails'
 *       404:
 *         description: Scan not found
 */
router.get('/:scanId',
  [
    param('scanId').isUUID().withMessage('Valid scan ID is required')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { scanId } = req.params;
      
      const scan = await req.services.scan.getScanById(scanId);
      
      if (!scan) {
        return res.status(404).json({
          error: 'Scan not found',
          scanId,
          timestamp: new Date().toISOString()
        });
      }

      res.json({
        success: true,
        data: scan
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/scans/{scanId}/start:
 *   post:
 *     summary: Start a pending scan
 *     tags: [Scans]
 *     parameters:
 *       - in: path
 *         name: scanId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Scan started successfully
 *       404:
 *         description: Scan not found
 *       409:
 *         description: Scan already running or completed
 */
router.post('/:scanId/start',
  [
    param('scanId').isUUID().withMessage('Valid scan ID is required')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { scanId } = req.params;
      
      const result = await req.services.scan.startScan(scanId);
      
      res.json({
        success: true,
        data: result,
        message: 'Scan started successfully'
      });
    } catch (error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({
          error: 'Scan not found',
          scanId: req.params.scanId
        });
      }
      if (error.message.includes('already')) {
        return res.status(409).json({
          error: error.message,
          scanId: req.params.scanId
        });
      }
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/scans/{scanId}/stop:
 *   post:
 *     summary: Stop a running scan
 *     tags: [Scans]
 *     parameters:
 *       - in: path
 *         name: scanId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Scan stopped successfully
 *       404:
 *         description: Scan not found
 *       409:
 *         description: Scan not running
 */
router.post('/:scanId/stop',
  [
    param('scanId').isUUID().withMessage('Valid scan ID is required')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { scanId } = req.params;
      
      const result = await req.services.scan.stopScan(scanId);
      
      res.json({
        success: true,
        data: result,
        message: 'Scan stopped successfully'
      });
    } catch (error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({
          error: 'Scan not found',
          scanId: req.params.scanId
        });
      }
      if (error.message.includes('not running')) {
        return res.status(409).json({
          error: 'Scan is not currently running',
          scanId: req.params.scanId
        });
      }
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/scans/{scanId}/results:
 *   get:
 *     summary: Get scan results and vulnerabilities
 *     tags: [Scans]
 *     parameters:
 *       - in: path
 *         name: scanId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, html, pdf]
 *           default: json
 *     responses:
 *       200:
 *         description: Scan results
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ScanResults'
 *           text/html:
 *             schema:
 *               type: string
 *       404:
 *         description: Scan not found
 */
router.get('/:scanId/results',
  [
    param('scanId').isUUID().withMessage('Valid scan ID is required'),
    query('format').optional().isIn(['json', 'html', 'pdf']).withMessage('Format must be json, html, or pdf')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { scanId } = req.params;
      const { format = 'json' } = req.query;
      
      const results = await req.services.scan.getScanResults(scanId, format);
      
      if (!results) {
        return res.status(404).json({
          error: 'Scan results not found',
          scanId
        });
      }

      if (format === 'html') {
        res.setHeader('Content-Type', 'text/html');
        res.send(results);
      } else if (format === 'pdf') {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="scan-${scanId}.pdf"`);
        res.send(results);
      } else {
        res.json({
          success: true,
          data: results
        });
      }
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/scans/{scanId}:
 *   delete:
 *     summary: Delete a scan and its results
 *     tags: [Scans]
 *     parameters:
 *       - in: path
 *         name: scanId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Scan deleted successfully
 *       404:
 *         description: Scan not found
 *       409:
 *         description: Cannot delete running scan
 */
router.delete('/:scanId',
  [
    param('scanId').isUUID().withMessage('Valid scan ID is required')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { scanId } = req.params;
      
      await req.services.scan.deleteScan(scanId);
      
      res.json({
        success: true,
        message: 'Scan deleted successfully',
        scanId
      });
    } catch (error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({
          error: 'Scan not found',
          scanId: req.params.scanId
        });
      }
      if (error.message.includes('running')) {
        return res.status(409).json({
          error: 'Cannot delete running scan',
          scanId: req.params.scanId
        });
      }
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/scans/stats:
 *   get:
 *     summary: Get scanning statistics
 *     tags: [Scans]
 *     responses:
 *       200:
 *         description: Scanning statistics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ScanStats'
 */
router.get('/stats', async (req, res, next) => {
  try {
    const stats = await req.services.scan.getStatistics();
    
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
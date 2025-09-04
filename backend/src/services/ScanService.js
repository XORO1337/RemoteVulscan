const { v4: uuidv4 } = require('uuid');
const Bull = require('bull');
const logger = require('../utils/logger');
const ToolExecutor = require('./ToolExecutor');
const ReportGenerator = require('./ReportGenerator');

class ScanService {
  constructor(prisma, io) {
    this.prisma = prisma;
    this.io = io;
    this.toolExecutor = new ToolExecutor();
    this.reportGenerator = new ReportGenerator();
    
    // Initialize job queue
    this.scanQueue = new Bull('scan queue', {
      redis: {
        host: process.env.REDIS_HOST || 'redis',
        port: process.env.REDIS_PORT || 6379
      },
      defaultJobOptions: {
        removeOnComplete: 50,
        removeOnFail: 100,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000
        }
      }
    });

    this.setupQueueProcessors();
  }

  setupQueueProcessors() {
    // Process scan jobs
    this.scanQueue.process('execute-scan', 5, async (job) => {
      const { scanId, url, scanType, options } = job.data;
      
      try {
        logger.info(`Processing scan job: ${scanId}`);
        
        // Update scan status to running
        await this.updateScanStatus(scanId, 'RUNNING');
        
        // Execute the scan
        const result = await this.toolExecutor.executeScan({
          scanId,
          url,
          scanType,
          options,
          onProgress: (progress) => {
            this.emitScanProgress(scanId, progress);
            job.progress(progress.percentage);
          }
        });

        // Save results to database
        await this.saveScanResults(scanId, result);
        
        // Update scan status to completed
        await this.updateScanStatus(scanId, 'COMPLETED');
        
        // Emit completion event
        this.emitScanComplete(scanId, result);
        
        logger.info(`Scan completed successfully: ${scanId}`);
        return result;
        
      } catch (error) {
        logger.error(`Scan failed: ${scanId}`, error);
        
        // Update scan status to failed
        await this.updateScanStatus(scanId, 'FAILED', error.message);
        
        // Emit error event
        this.emitScanError(scanId, error);
        
        throw error;
      }
    });

    // Queue event handlers
    this.scanQueue.on('completed', (job, result) => {
      logger.info(`Scan job completed: ${job.id}`);
    });

    this.scanQueue.on('failed', (job, err) => {
      logger.error(`Scan job failed: ${job.id}`, err);
    });

    this.scanQueue.on('stalled', (job) => {
      logger.warn(`Scan job stalled: ${job.id}`);
    });
  }

  async createScan({ url, scanType, priority = 'normal', options = {} }) {
    try {
      // Validate URL
      new URL(url);
      
      // Create website record if not exists
      let website = await this.prisma.website.findUnique({
        where: { url }
      });

      if (!website) {
        website = await this.prisma.website.create({
          data: {
            url,
            name: new URL(url).hostname
          }
        });
      }

      // Create scan record
      const scan = await this.prisma.scan.create({
        data: {
          websiteId: website.id,
          scanType,
          status: 'PENDING',
          priority,
          options: JSON.stringify(options)
        },
        include: {
          website: true
        }
      });

      // Add to job queue
      await this.scanQueue.add('execute-scan', {
        scanId: scan.id,
        url,
        scanType,
        options
      }, {
        priority: this.getPriorityValue(priority),
        delay: 0
      });

      logger.info(`Scan created and queued: ${scan.id}`);
      
      return scan;
    } catch (error) {
      logger.error('Failed to create scan:', error);
      throw error;
    }
  }

  async getScans({ page = 1, limit = 20, filters = {} }) {
    try {
      const skip = (page - 1) * limit;
      
      const where = {};
      if (filters.status) where.status = filters.status;
      if (filters.scanType) where.scanType = filters.scanType;

      const [scans, total] = await Promise.all([
        this.prisma.scan.findMany({
          where,
          include: {
            website: true,
            vulnerabilities: {
              select: {
                severity: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        this.prisma.scan.count({ where })
      ]);

      // Add vulnerability summary to each scan
      const scansWithSummary = scans.map(scan => ({
        ...scan,
        vulnerabilitySummary: this.calculateVulnerabilitySummary(scan.vulnerabilities)
      }));

      return {
        scans: scansWithSummary,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      };
    } catch (error) {
      logger.error('Failed to get scans:', error);
      throw error;
    }
  }

  async getScanById(scanId) {
    try {
      const scan = await this.prisma.scan.findUnique({
        where: { id: scanId },
        include: {
          website: true,
          vulnerabilities: {
            orderBy: { severity: 'desc' }
          }
        }
      });

      if (!scan) return null;

      // Add additional metadata
      return {
        ...scan,
        vulnerabilitySummary: this.calculateVulnerabilitySummary(scan.vulnerabilities),
        duration: this.calculateScanDuration(scan),
        queuePosition: await this.getQueuePosition(scanId)
      };
    } catch (error) {
      logger.error('Failed to get scan by ID:', error);
      throw error;
    }
  }

  async startScan(scanId) {
    try {
      const scan = await this.prisma.scan.findUnique({
        where: { id: scanId },
        include: { website: true }
      });

      if (!scan) {
        throw new Error('Scan not found');
      }

      if (scan.status !== 'PENDING') {
        throw new Error('Scan is already running or completed');
      }

      // Add to queue if not already there
      const job = await this.scanQueue.add('execute-scan', {
        scanId: scan.id,
        url: scan.website.url,
        scanType: scan.scanType,
        options: JSON.parse(scan.options || '{}')
      }, {
        priority: this.getPriorityValue(scan.priority || 'normal')
      });

      logger.info(`Scan started: ${scanId}, Job ID: ${job.id}`);
      
      return {
        scanId,
        jobId: job.id,
        status: 'QUEUED',
        queuePosition: await this.getQueuePosition(scanId)
      };
    } catch (error) {
      logger.error('Failed to start scan:', error);
      throw error;
    }
  }

  async stopScan(scanId) {
    try {
      const scan = await this.prisma.scan.findUnique({
        where: { id: scanId }
      });

      if (!scan) {
        throw new Error('Scan not found');
      }

      if (scan.status !== 'RUNNING') {
        throw new Error('Scan is not currently running');
      }

      // Find and remove job from queue
      const jobs = await this.scanQueue.getJobs(['active', 'waiting', 'delayed']);
      const job = jobs.find(j => j.data.scanId === scanId);
      
      if (job) {
        await job.remove();
        logger.info(`Scan job removed from queue: ${scanId}`);
      }

      // Update scan status
      await this.updateScanStatus(scanId, 'FAILED', 'Scan stopped by user');
      
      // Emit stop event
      this.emitScanStopped(scanId);
      
      return {
        scanId,
        status: 'STOPPED',
        message: 'Scan stopped successfully'
      };
    } catch (error) {
      logger.error('Failed to stop scan:', error);
      throw error;
    }
  }

  async getScanResults(scanId, format = 'json') {
    try {
      const scan = await this.prisma.scan.findUnique({
        where: { id: scanId },
        include: {
          website: true,
          vulnerabilities: true
        }
      });

      if (!scan) return null;

      switch (format) {
        case 'html':
          return this.reportGenerator.generateHTMLReport(scan);
        case 'pdf':
          return this.reportGenerator.generatePDFReport(scan);
        default:
          return {
            scan,
            vulnerabilities: scan.vulnerabilities,
            summary: this.calculateVulnerabilitySummary(scan.vulnerabilities),
            metadata: {
              generatedAt: new Date().toISOString(),
              format,
              version: '1.0'
            }
          };
      }
    } catch (error) {
      logger.error('Failed to get scan results:', error);
      throw error;
    }
  }

  async deleteScan(scanId) {
    try {
      const scan = await this.prisma.scan.findUnique({
        where: { id: scanId }
      });

      if (!scan) {
        throw new Error('Scan not found');
      }

      if (scan.status === 'RUNNING') {
        throw new Error('Cannot delete running scan');
      }

      // Delete scan and related data (cascade)
      await this.prisma.scan.delete({
        where: { id: scanId }
      });

      logger.info(`Scan deleted: ${scanId}`);
      
      return { scanId, deleted: true };
    } catch (error) {
      logger.error('Failed to delete scan:', error);
      throw error;
    }
  }

  async getStatistics() {
    try {
      const [
        totalScans,
        completedScans,
        failedScans,
        runningScans,
        vulnerabilityStats,
        recentActivity
      ] = await Promise.all([
        this.prisma.scan.count(),
        this.prisma.scan.count({ where: { status: 'COMPLETED' } }),
        this.prisma.scan.count({ where: { status: 'FAILED' } }),
        this.prisma.scan.count({ where: { status: 'RUNNING' } }),
        this.prisma.vulnerability.groupBy({
          by: ['severity'],
          _count: { severity: true }
        }),
        this.prisma.scan.findMany({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
            }
          },
          select: {
            createdAt: true,
            status: true,
            scanType: true
          }
        })
      ]);

      const vulnerabilitySummary = vulnerabilityStats.reduce((acc, item) => {
        acc[item.severity.toLowerCase()] = item._count.severity;
        return acc;
      }, { critical: 0, high: 0, medium: 0, low: 0, info: 0 });

      return {
        overview: {
          totalScans,
          completedScans,
          failedScans,
          runningScans,
          successRate: totalScans > 0 ? Math.round((completedScans / totalScans) * 100) : 0
        },
        vulnerabilities: {
          total: Object.values(vulnerabilitySummary).reduce((a, b) => a + b, 0),
          bySeverity: vulnerabilitySummary
        },
        activity: {
          last24Hours: recentActivity.length,
          byStatus: recentActivity.reduce((acc, scan) => {
            acc[scan.status] = (acc[scan.status] || 0) + 1;
            return acc;
          }, {})
        },
        queue: {
          waiting: await this.scanQueue.getWaiting().then(jobs => jobs.length),
          active: await this.scanQueue.getActive().then(jobs => jobs.length),
          completed: await this.scanQueue.getCompleted().then(jobs => jobs.length),
          failed: await this.scanQueue.getFailed().then(jobs => jobs.length)
        }
      };
    } catch (error) {
      logger.error('Failed to get statistics:', error);
      throw error;
    }
  }

  // Helper methods
  async updateScanStatus(scanId, status, errorMessage = null) {
    const updateData = { 
      status,
      ...(status === 'RUNNING' && { startedAt: new Date() }),
      ...(status === 'COMPLETED' && { completedAt: new Date() }),
      ...(status === 'FAILED' && { 
        completedAt: new Date(),
        errorMessage 
      })
    };

    return this.prisma.scan.update({
      where: { id: scanId },
      data: updateData
    });
  }

  async saveScanResults(scanId, results) {
    // Save vulnerabilities
    if (results.vulnerabilities && results.vulnerabilities.length > 0) {
      await this.prisma.vulnerability.createMany({
        data: results.vulnerabilities.map(vuln => ({
          scanId,
          severity: vuln.severity,
          type: vuln.type,
          title: vuln.title,
          description: vuln.description,
          solution: vuln.solution,
          reference: vuln.reference,
          location: vuln.location
        }))
      });
    }

    // Update scan with results
    await this.prisma.scan.update({
      where: { id: scanId },
      data: {
        results: JSON.stringify(results)
      }
    });
  }

  calculateVulnerabilitySummary(vulnerabilities) {
    return vulnerabilities.reduce((acc, vuln) => {
      const severity = vuln.severity.toLowerCase();
      acc[severity] = (acc[severity] || 0) + 1;
      return acc;
    }, { critical: 0, high: 0, medium: 0, low: 0, info: 0 });
  }

  calculateScanDuration(scan) {
    if (!scan.startedAt || !scan.completedAt) return null;
    
    return {
      milliseconds: new Date(scan.completedAt) - new Date(scan.startedAt),
      formatted: this.formatDuration(new Date(scan.completedAt) - new Date(scan.startedAt))
    };
  }

  formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  getPriorityValue(priority) {
    const priorities = { high: 1, normal: 2, low: 3 };
    return priorities[priority] || 2;
  }

  async getQueuePosition(scanId) {
    try {
      const waitingJobs = await this.scanQueue.getWaiting();
      const position = waitingJobs.findIndex(job => job.data.scanId === scanId);
      return position >= 0 ? position + 1 : null;
    } catch (error) {
      logger.error('Failed to get queue position:', error);
      return null;
    }
  }

  // WebSocket event emitters
  emitScanProgress(scanId, progress) {
    this.io.to(`scan-${scanId}`).emit('scanProgress', {
      scanId,
      ...progress,
      timestamp: new Date().toISOString()
    });
  }

  emitScanComplete(scanId, results) {
    this.io.to(`scan-${scanId}`).emit('scanComplete', {
      scanId,
      results,
      timestamp: new Date().toISOString()
    });
  }

  emitScanError(scanId, error) {
    this.io.to(`scan-${scanId}`).emit('scanError', {
      scanId,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }

  emitScanStopped(scanId) {
    this.io.to(`scan-${scanId}`).emit('scanStopped', {
      scanId,
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = ScanService;
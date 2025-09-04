import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { getDatabase } from '@/utils/database';
import { logger } from '@/utils/logger';
import { WebSocketService } from './websocketService';
import { ToolExecutionService } from './toolExecutionService';
// Prisma enums replaced with strings (SQLite). Define local constants.
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
  SSLSCAN: 'SSLSCAN',
  SQLMAP: 'SQLMAP'
} as const;

export type ScanStatusType = (typeof ScanStatus)[keyof typeof ScanStatus];
export type ScanTypeType = (typeof ScanType)[keyof typeof ScanType];

export interface ScanJobData {
  scanId: string;
  websiteId: string;
  url: string;
  scanType: ScanTypeType;
  scanMode?: string;
  options?: Record<string, any>;
}

export interface ScanResult {
  scanId: string;
  success: boolean;
  vulnerabilities: any[];
  toolResults: any[];
  metadata: Record<string, any>;
  error?: string;
}

export class ScanOrchestrator {
  private scanQueue: Queue | null = null;
  private scanWorker: Worker | null = null;
  private websocketService: WebSocketService;
  private toolExecutionService: ToolExecutionService;
  private db: ReturnType<typeof getDatabase>;
  private redisEnabled: boolean;
  private redisCheckCompleted = false;

  constructor(websocketService: WebSocketService) {
    this.websocketService = websocketService;
    this.db = getDatabase();
    this.toolExecutionService = new ToolExecutionService();
    this.redisEnabled = (process.env.REDIS_ENABLED ?? 'true').toLowerCase() !== 'false';

    if (!this.redisEnabled) {
      logger.info('Redis disabled (REDIS_ENABLED=false). Using in-process scan execution.');
      return;
    }

    // Probe Redis availability first to avoid noisy repeated connection errors
    this.initializeRedisQueue().catch(err => {
      logger.warn('Redis unavailable, falling back to direct mode. Set REDIS_ENABLED=false to suppress probe. Reason:', err instanceof Error ? err.message : err);
      this.fallbackToDirectMode();
    });
  }

  /**
   * Attempt to initialize Redis-backed queue. If the ping fails within timeout, reject.
   */
  private async initializeRedisQueue(): Promise<void> {
    if (this.redisCheckCompleted) return; // idempotent
    this.redisCheckCompleted = true;

    const host = process.env.REDIS_HOST || 'localhost';
    const port = parseInt(process.env.REDIS_PORT || '6379');
    const password = process.env.REDIS_PASSWORD;
    const timeoutMs = parseInt(process.env.REDIS_CONNECT_TIMEOUT_MS || '3000');

    const probe = new IORedis({ host, port, password, lazyConnect: true, maxRetriesPerRequest: 1, connectTimeout: timeoutMs });

    const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`Redis ping timeout after ${timeoutMs}ms`)), timeoutMs));
    try {
      await Promise.race([
        (async () => {
          await probe.connect();
          const pong = await probe.ping();
          if (!pong) throw new Error('Empty PING response');
        })(),
        timeout
      ]);
    } catch (e) {
      try { probe.disconnect(); } catch { /* ignore */ }
      throw e;
    }
    try { probe.disconnect(); } catch { /* ignore */ }

    // Only set up BullMQ if probe succeeded
    const redisConfig = { host, port, password } as const;

    this.scanQueue = new Queue('scan-queue', {
      connection: redisConfig,
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 }
      }
    });

    this.scanWorker = new Worker('scan-queue', this.processScan.bind(this), {
      connection: redisConfig,
      concurrency: parseInt(process.env.SCAN_CONCURRENCY || '3')
    });

    this.setupWorkerEvents();
    this.attachRedisErrorHandlers();
    logger.info('Scan queue initialized with Redis');
  }

  private attachRedisErrorHandlers(): void {
    const degrade = (err: any) => {
      if (!err) return;
      const msg = typeof err === 'string' ? err : err.message;
      if (msg && /ECONNREFUSED|ENOTFOUND|EAI_AGAIN|READONLY/i.test(msg)) {
        logger.warn('Redis connection error detected, switching to direct mode:', msg);
        this.fallbackToDirectMode();
      }
    };
    this.scanQueue?.on('error', degrade as any);
    this.scanWorker?.on('error', degrade as any);
  }

  private async fallbackToDirectMode(): Promise<void> {
    if (!this.redisEnabled) return; // already disabled
    this.redisEnabled = false;
    try { await this.scanWorker?.close(); } catch { /* ignore */ }
    try { await this.scanQueue?.close(); } catch { /* ignore */ }
    this.scanWorker = null;
    this.scanQueue = null;
    logger.info('Operating in direct in-process scan mode.');
  }

  private setupWorkerEvents(): void {
  if (!this.scanWorker) return; // Should not happen when redis disabled
  this.scanWorker.on('completed', (job: Job, result: ScanResult) => {
      logger.info(`Scan completed: ${job.id}`, { scanId: result.scanId });
      this.websocketService.emitScanUpdate(result.scanId, {
        status: 'completed',
        result: result
      });
    });

  this.scanWorker.on('failed', (job: Job | undefined, error: Error) => {
      if (job) {
        logger.error(`Scan failed: ${job.id}`, { error: error.message });
        const scanId = (job.data as ScanJobData).scanId;
        this.websocketService.emitScanUpdate(scanId, {
          status: 'failed',
          error: error.message
        });
      }
    });

  this.scanWorker.on('progress', (job: Job, progress: any) => {
      const scanId = (job.data as ScanJobData).scanId;
      this.websocketService.emitScanUpdate(scanId, {
        status: 'running',
        progress: progress
      });
    });
  }

  async queueScan(scanData: ScanJobData): Promise<string> {
    // In-memory / immediate execution mode
    if (!this.redisEnabled || !this.scanQueue) {
      try {
        await this.db.scan.update({
          where: { id: scanData.scanId },
          data: { status: ScanStatus.RUNNING, startedAt: new Date() }
        });

        // Execute directly
        const fakeJob: Partial<Job<ScanJobData>> = {
          data: scanData,
          id: `direct-${scanData.scanId}`,
          updateProgress: async () => {}
        };
        const result = await this.processScan(fakeJob as Job<ScanJobData>);

        // Emit update
        this.websocketService.emitScanUpdate(scanData.scanId, {
          status: 'completed',
          result
        });
        return fakeJob.id!;
      } catch (error) {
        logger.error('Failed direct scan execution:', error);
        await this.db.scan.update({
          where: { id: scanData.scanId },
          data: {
            status: ScanStatus.FAILED,
            errorMessage: error instanceof Error ? error.message : 'Unknown error'
          }
        });
        throw error;
      }
    }

    try {
      // Update scan status to queued
      await this.db.scan.update({
        where: { id: scanData.scanId },
        data: { status: ScanStatus.QUEUED }
      });

      // Add to queue
  const job = await this.scanQueue!.add(
        `scan-${scanData.scanId}`,
        scanData,
        {
          priority: this.getScanPriority(scanData.scanType),
          delay: 0,
        }
      );

      logger.info(`Scan queued: ${scanData.scanId}`, { jobId: job.id });
      
      // Emit queue update
      this.websocketService.emitScanUpdate(scanData.scanId, {
        status: 'queued',
        queuePosition: await this.getQueuePosition(job.id!)
      });

      return job.id!;
    } catch (error) {
      logger.error('Failed to queue scan:', error);
      
      // Update scan status to failed
      await this.db.scan.update({
        where: { id: scanData.scanId },
        data: { 
          status: ScanStatus.FAILED,
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        }
      });

      throw error;
    }
  }

  private async processScan(job: Job<ScanJobData>): Promise<ScanResult> {
    const { scanId, url, scanType, scanMode, options } = job.data;
    
    try {
      logger.info(`Starting scan processing: ${scanId}`, { url, scanType, scanMode });

      // Update scan status to running
      await this.db.scan.update({
        where: { id: scanId },
        data: { 
          status: ScanStatus.RUNNING,
          startedAt: new Date()
        }
      });

      // Emit scan started event
      this.websocketService.emitScanUpdate(scanId, {
        status: 'running',
        startedAt: new Date().toISOString()
      });

      let result: ScanResult;

      if (scanMode && scanMode !== 'single') {
        // Advanced multi-tool scan
        result = await this.executeAdvancedScan(job, url, scanMode, options);
      } else {
        // Single tool scan
        result = await this.executeSingleScan(job, url, scanType, options);
      }

      // Update scan in database
      await this.db.scan.update({
        where: { id: scanId },
        data: {
          status: ScanStatus.COMPLETED,
          completedAt: new Date(),
          results: JSON.stringify(result.toolResults),
          metadata: JSON.stringify(result.metadata)
        }
      });

      // Store vulnerabilities
      if (result.vulnerabilities.length > 0) {
        await this.storeVulnerabilities(scanId, result.vulnerabilities);
      }

      return result;
    } catch (error) {
      logger.error(`Scan processing failed: ${scanId}`, error);

      // Update scan status to failed
      await this.db.scan.update({
        where: { id: scanId },
        data: {
          status: ScanStatus.FAILED,
          completedAt: new Date(),
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        }
      });

      throw error;
    }
  }

  private async executeSingleScan(job: Job<ScanJobData>, url: string, scanType: ScanTypeType, options?: Record<string, any>): Promise<ScanResult> {
    const { scanId } = job.data;
    
    // Map scan type to tool
  const toolMap: Record<ScanTypeType, string> = {
      NMAP: 'nmap',
      NIKTO: 'nikto',
      NUCLEI: 'nuclei',
      TESTSSL: 'testssl',
      SSLSCAN: 'sslscan',
      SQLMAP: 'sqlmap',
      // Add other mappings
    } as any;

    const tool = toolMap[scanType];
    if (!tool) {
      throw new Error(`Unsupported scan type: ${scanType}`);
    }

    // Execute tool
    const toolResult = await this.toolExecutionService.executeTool(
      tool,
      options?.args || [],
      url,
      options?.timeout
    );

    // Parse vulnerabilities
    const vulnerabilities = this.parseVulnerabilities(tool, toolResult.output || '');

    return {
      scanId,
      success: toolResult.success,
      vulnerabilities,
      toolResults: [toolResult],
      metadata: {
        tool,
        executionTime: toolResult.executionTime,
        timestamp: new Date().toISOString()
      }
    };
  }

  private async executeAdvancedScan(job: Job<ScanJobData>, url: string, scanMode: string, options?: Record<string, any>): Promise<ScanResult> {
    const { scanId } = job.data;
    
    // Get tools for scan mode
    const tools = this.getToolsForScanMode(scanMode);
    
    // Update progress
    await job.updateProgress({ stage: 'preparation', tools: tools.length });

    // Execute scan
    const toolsToExecute = tools.map(tool => ({ name: tool, args: options?.args || [] }));
    const scanResults = await this.toolExecutionService.executeMultipleTools(
      toolsToExecute,
      url,
      'parallel'
    );

    // Update progress
    await job.updateProgress({ stage: 'completed', completedTools: scanResults.length });

    // Parse all vulnerabilities
    const allVulnerabilities: any[] = [];
    for (const result of scanResults) {
      if (result.success) {
        const toolName = result.command.split(' ')[0];
        const vulns = this.parseVulnerabilities(toolName, result.output || '');
        allVulnerabilities.push(...vulns);
      }
    }

    return {
      scanId,
      success: scanResults.some(r => r.success),
      vulnerabilities: allVulnerabilities,
      toolResults: scanResults,
      metadata: {
        scanMode,
        totalTools: scanResults.length,
        successfulTools: scanResults.filter(r => r.success).length,
        executionTime: scanResults.reduce((sum, r) => sum + r.executionTime, 0),
        timestamp: new Date().toISOString()
      }
    };
  }

  private getToolsForScanMode(scanMode: string): string[] {
    const scanModes: Record<string, string[]> = {
      'full_scan': ['nmap', 'nikto', 'nuclei', 'testssl'],
      'network_recon': ['nmap', 'masscan'],
      'web_scan': ['nikto', 'nuclei', 'whatweb'],
      'ssl_analysis': ['testssl', 'sslscan'],
      'directory_enum': ['gobuster', 'dirsearch'],
      'sql_injection': ['sqlmap'],
      'vulnerability_assessment': ['nuclei', 'nikto']
    };

    return scanModes[scanMode] || ['nuclei'];
  }

  private parseVulnerabilities(tool: string, output: string): any[] {
    // Implement tool-specific vulnerability parsing logic
    const vulnerabilities: any[] = [];
    
    try {
      // This is a simplified example - implement proper parsing for each tool
      if (tool === 'nuclei' && output.includes('[')) {
        // Parse nuclei JSON output
        const lines = output.split('\n');
        for (const line of lines) {
          if (line.trim().startsWith('{')) {
            try {
              const result = JSON.parse(line);
              if (result.info) {
                vulnerabilities.push({
                  severity: result.info.severity?.toUpperCase() || 'INFO',
                  type: result.info.classification?.['cve-id'] || result['template-id'],
                  title: result.info.name,
                  description: result.info.description,
                  location: result.host,
                  tool: 'nuclei',
                  reference: result.info.reference
                });
              }
            } catch (e) {
              // Skip invalid JSON lines
            }
          }
        }
      }
      // Add parsing for other tools (nmap, nikto, etc.)
    } catch (error) {
      logger.warn(`Failed to parse vulnerabilities for ${tool}:`, error);
    }

    return vulnerabilities;
  }

  private async storeVulnerabilities(scanId: string, vulnerabilities: any[]): Promise<void> {
    try {
      await this.db.vulnerability.createMany({
        data: vulnerabilities.map(vuln => ({
          scanId,
          severity: vuln.severity,
          type: vuln.type,
          title: vuln.title,
          description: vuln.description,
          solution: vuln.solution,
          reference: vuln.reference,
          location: vuln.location,
          port: vuln.port,
          service: vuln.service,
          cvss: vuln.cvss,
          cve: vuln.cve,
          tool: vuln.tool
        }))
      });
    } catch (error) {
      logger.error('Failed to store vulnerabilities:', error);
    }
  }

  private getScanPriority(scanType: ScanTypeType): number {
    const priorities: Record<ScanTypeType, number> = {
      FULL_SCAN: 1, // Highest priority
      VULNERABILITY_ASSESSMENT: 2,
      WEB_APPLICATION_SCAN: 3,
      NETWORK_RECONNAISSANCE: 4,
      SSL_TLS_ANALYSIS: 5,
      // Add other priorities
    } as any;

    return priorities[scanType] || 10;
  }

  private async getQueuePosition(jobId: string): Promise<number> {
    if (!this.scanQueue) return 0;
    const waitingJobs = await this.scanQueue.getWaiting();
    return waitingJobs.findIndex(job => job.id === jobId) + 1;
  }

  async getQueueStats(): Promise<any> {
    if (!this.scanQueue) {
      return { waiting: 0, active: 0, completed: 0, failed: 0, mode: 'direct' };
    }
    return {
      waiting: await this.scanQueue.getWaiting().then(jobs => jobs.length),
      active: await this.scanQueue.getActive().then(jobs => jobs.length),
      completed: await this.scanQueue.getCompleted().then(jobs => jobs.length),
      failed: await this.scanQueue.getFailed().then(jobs => jobs.length),
      mode: 'redis'
    };
  }

  async cancelScan(scanId: string): Promise<boolean> {
    if (!this.scanQueue) {
      // Nothing to cancel in direct mode yet
      return false;
    }
    try {
      const jobs = await this.scanQueue.getJobs(['waiting', 'active']);
      const job = jobs.find(j => (j.data as ScanJobData).scanId === scanId);
      
      if (job) {
        await job.remove();
        
        // Update scan status
        await this.db.scan.update({
          where: { id: scanId },
          data: { 
            status: ScanStatus.CANCELLED,
            completedAt: new Date()
          }
        });

        this.websocketService.emitScanUpdate(scanId, {
          status: 'cancelled'
        });

        return true;
      }

      return false;
    } catch (error) {
      logger.error('Failed to cancel scan:', error);
      return false;
    }
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down scan orchestrator...');
    
  if (this.scanWorker) await this.scanWorker.close();
  if (this.scanQueue) await this.scanQueue.close();
    
    logger.info('Scan orchestrator shutdown complete');
  }
}

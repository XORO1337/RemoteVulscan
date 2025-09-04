import fetch from 'node-fetch';
import { logger } from '@/utils/logger';

export interface ToolExecuteRequest {
  tool: string;
  target: string;
  args?: string[];
  timeout?: number;
  scanId?: string;
}

export interface ToolExecuteResponse {
  executionId: string;
  scanId: string;
  tool: string;
  target: string;
  success: boolean;
  exitCode: number;
  output: string;
  error?: string;
  executionTime: number;
  timestamp: string;
}

export interface ScanRequest {
  tools: Array<{ tool: string; args?: string[] }>;
  target: string;
  mode: 'parallel' | 'sequential';
  scanId?: string;
}

export interface ScanResponse {
  scanId: string;
  target: string;
  mode: string;
  totalExecutionTime: number;
  results: ToolExecuteResponse[];
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
  timestamp: string;
}

export interface ToolInfo {
  available: boolean;
  version?: string;
  category: string;
  binary: string;
  error?: string;
}

export interface ToolsListResponse {
  tools: Record<string, ToolInfo>;
  categories: string[];
}

export class ToolsAPIClient {
  private baseURL: string;
  private timeout: number;

  constructor(baseURL?: string, timeout: number = 30000) {
    this.baseURL = baseURL || process.env.TOOLS_API_URL || 'http://localhost:3001';
    this.timeout = timeout;
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.makeRequest('/health', {
        method: 'GET',
        timeout: 5000
      });
      return response.ok;
  } catch (error: any) {
      logger.warn('Tools API health check failed:', error);
      return false;
    }
  }

  async getAvailableTools(): Promise<ToolsListResponse> {
    try {
      const response = await this.makeRequest('/api/tools');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json() as ToolsListResponse;
    } catch (error) {
      logger.error('Failed to get available tools:', error);
      throw new Error(`Failed to get available tools: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async executeTool(request: ToolExecuteRequest): Promise<ToolExecuteResponse> {
    try {
      logger.info('Executing tool', { tool: request.tool, target: request.target });

      const response = await this.makeRequest('/api/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request),
        timeout: request.timeout || this.timeout
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(`HTTP ${response.status}: ${errorData.error || response.statusText}`);
      }

      const result = await response.json() as ToolExecuteResponse;
      
      logger.info('Tool execution completed', { 
        tool: request.tool, 
        success: result.success,
        executionTime: result.executionTime 
      });

      return result;
    } catch (error) {
      logger.error('Tool execution failed:', error);
      throw new Error(`Tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async executeScan(request: ScanRequest): Promise<ScanResponse> {
    try {
      logger.info('Executing scan', { 
        target: request.target, 
        mode: request.mode,
        tools: request.tools.length 
      });

      const response = await this.makeRequest('/api/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request),
        timeout: 600000 // 10 minutes for scans
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(`HTTP ${response.status}: ${errorData.error || response.statusText}`);
      }

      const result = await response.json() as ScanResponse;
      
      logger.info('Scan execution completed', { 
        scanId: result.scanId,
        successful: result.summary.successful,
        total: result.summary.total,
        executionTime: result.totalExecutionTime 
      });

      return result;
    } catch (error) {
      logger.error('Scan execution failed:', error);
      throw new Error(`Scan execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getScanStatus(scanId: string): Promise<any> {
    try {
      const response = await this.makeRequest(`/api/scan/${scanId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Scan not found');
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      logger.error('Failed to get scan status:', error);
      throw new Error(`Failed to get scan status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getAllScans(): Promise<any> {
    try {
      const response = await this.makeRequest('/api/scans');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      logger.error('Failed to get all scans:', error);
      throw new Error(`Failed to get all scans: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async makeRequest(endpoint: string, options: any = {}): Promise<any> {
    const url = `${this.baseURL}${endpoint}`;
    const timeout = options.timeout || this.timeout;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return response;
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error?.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeout}ms`);
      }
      
      throw error;
    }
  }

  // Update base URL (useful for service discovery)
  updateBaseURL(newBaseURL: string): void {
    this.baseURL = newBaseURL;
    logger.info('Tools API base URL updated', { baseURL: newBaseURL });
  }

  // Get current configuration
  getConfig(): { baseURL: string; timeout: number } {
    return {
      baseURL: this.baseURL,
      timeout: this.timeout
    };
  }
}

export default ToolsAPIClient;

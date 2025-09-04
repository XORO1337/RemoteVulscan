/**
 * API Client for RemoteVulscan Frontend
 * Handles all communication with the backend API
 */

import { getBackendApiBase, buildApiUrl } from '@/lib/backend-api';
const API_ROOT = getBackendApiBase();
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';

export interface Website {
  id: string;
  url: string;
  name?: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Scan {
  id: string;
  websiteId: string;
  website?: Website;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  scanType: 'NUCLEI' | 'NIKTO' | 'NMAP' | 'TESTSSL' | 'FULL';
  startedAt?: string;
  completedAt?: string;
  errorMessage?: string;
  results?: string;
  vulnerabilities: Vulnerability[];
  createdAt: string;
  updatedAt: string;
}

export interface Vulnerability {
  id: string;
  scanId: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  type: string;
  title: string;
  description?: string;
  solution?: string;
  reference?: string;
  location?: string;
  createdAt: string;
}

export interface CreateScanRequest {
  websiteId: string;
  scanType: 'NUCLEI' | 'NIKTO' | 'NMAP' | 'TESTSSL' | 'FULL';
  options?: Record<string, any>;
}

export interface CreateWebsiteRequest {
  url: string;
  name?: string;
  description?: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_ROOT) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
  const url = buildApiUrl(endpoint);
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return this.request('/health');
  }

  // Website management
  async getWebsites(): Promise<Website[]> {
    return this.request('/websites');
  }

  async getWebsite(id: string): Promise<Website> {
    return this.request(`/websites/${id}`);
  }

  async createWebsite(data: CreateWebsiteRequest): Promise<Website> {
    return this.request('/websites', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateWebsite(id: string, data: Partial<CreateWebsiteRequest>): Promise<Website> {
    return this.request(`/websites/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteWebsite(id: string): Promise<void> {
    return this.request(`/websites/${id}`, {
      method: 'DELETE',
    });
  }

  // Scan management
  async getScans(websiteId?: string): Promise<Scan[]> {
    const params = websiteId ? `?websiteId=${websiteId}` : '';
    return this.request(`/scans${params}`);
  }

  async getScan(id: string): Promise<Scan> {
    return this.request(`/scans/${id}`);
  }

  async createScan(data: CreateScanRequest): Promise<Scan> {
    return this.request('/scans', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async cancelScan(id: string): Promise<void> {
    return this.request(`/scans/${id}/cancel`, {
      method: 'POST',
    });
  }

  async retryFailedScan(id: string): Promise<Scan> {
    return this.request(`/scans/${id}/retry`, {
      method: 'POST',
    });
  }

  async downloadScanReport(id: string, format: 'json' | 'csv' | 'pdf' = 'json'): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/api/v1/scans/${id}/report?format=${format}`);
    
    if (!response.ok) {
      throw new Error(`Failed to download report: ${response.statusText}`);
    }

    return response.blob();
  }

  // Vulnerability management
  async getVulnerabilities(scanId?: string): Promise<Vulnerability[]> {
    const params = scanId ? `?scanId=${scanId}` : '';
    return this.request(`/vulnerabilities${params}`);
  }

  async getVulnerability(id: string): Promise<Vulnerability> {
    return this.request(`/vulnerabilities/${id}`);
  }

  // System information
  async getSystemInfo(): Promise<any> {
    return this.request('/system/info');
  }

  async getSystemHealth(): Promise<any> {
    return this.request('/system/health');
  }

  async getToolsStatus(): Promise<any> {
    return this.request('/system/tools');
  }

  // Statistics
  async getStatistics(): Promise<any> {
    return this.request('/statistics');
  }

  // Public configuration
  async getPublicConfig(): Promise<any> {
    return this.request('/public-config');
  }
}

// Create and export the default API client instance
export const apiClient = new ApiClient();

// WebSocket client for real-time updates
export class WebSocketClient {
  private socket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  connect(): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      try {
        this.socket = new WebSocket(WS_URL);

        this.socket.onopen = () => {
          console.log('WebSocket connected');
          this.reconnectAttempts = 0;
          resolve(this.socket!);
        };

        this.socket.onclose = () => {
          console.log('WebSocket disconnected');
          this.handleReconnect();
        };

        this.socket.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.connect().catch(console.error);
      }, this.reconnectDelay * this.reconnectAttempts);
    }
  }

  joinScan(scanId: string) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
        type: 'join-scan',
        scanId
      }));
    }
  }

  leaveScan(scanId: string) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
        type: 'leave-scan',
        scanId
      }));
    }
  }

  onMessage(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          callback(data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }
}

// Create and export the default WebSocket client instance
export const wsClient = new WebSocketClient();

// Utility functions for API responses
export const downloadFile = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};

export const formatSeverity = (severity: string): string => {
  return severity.charAt(0) + severity.slice(1).toLowerCase();
};

export const getSeverityColor = (severity: string): string => {
  switch (severity.toUpperCase()) {
    case 'CRITICAL':
      return 'destructive';
    case 'HIGH':
      return 'destructive';
    case 'MEDIUM':
      return 'orange';
    case 'LOW':
      return 'yellow';
    case 'INFO':
      return 'secondary';
    default:
      return 'secondary';
  }
};

export default apiClient;

/**
 * Simplified API Client for RemoteVulscan Frontend
 */

const API_BASE_URL = typeof window !== 'undefined' 
  ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000')
  : 'http://backend:8000'

export interface Website {
  id: string
  url: string
  name?: string
  createdAt: string
  updatedAt: string
}

export interface Scan {
  id: string
  websiteId: string
  website?: Website
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'
  scanType: string
  startedAt?: string
  completedAt?: string
  errorMessage?: string
  results?: string
  vulnerabilities: Vulnerability[]
  createdAt: string
  updatedAt: string
}

export interface Vulnerability {
  id: string
  scanId: string
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO'
  type: string
  title: string
  description?: string
  solution?: string
  reference?: string
  location?: string
  createdAt: string
}

class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}/api/v1${endpoint}`
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    }

    try {
      const response = await fetch(url, config)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error)
      throw error
    }
  }

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return this.request('/health')
  }

  // Scan management
  async getScans(): Promise<Scan[]> {
    return this.request('/scans')
  }

  async getScan(id: string): Promise<Scan> {
    return this.request(`/scans/${id}`)
  }

  async createScan(data: { url: string; scanType: string }): Promise<Scan> {
    return this.request('/scans', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async cancelScan(id: string): Promise<void> {
    return this.request(`/scans/${id}/cancel`, {
      method: 'POST',
    })
  }

  // System information
  async getSystemInfo(): Promise<any> {
    return this.request('/system/info')
  }

  async getSystemHealth(): Promise<any> {
    return this.request('/system/health')
  }

  // Tools
  async getAvailableTools(): Promise<any> {
    return this.request('/tools')
  }

  async executeTool(data: { tool: string; target: string; args?: string[] }): Promise<any> {
    return this.request('/tools/execute', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }
}

export const apiClient = new ApiClient()
export default apiClient
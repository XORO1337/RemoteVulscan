/**
 * Example client for RemoteVulscan Advanced API
 * This demonstrates how to interact with the vulnerability scanning API
 */

class RemoteVulscanClient {
  constructor(baseUrl = 'http://localhost:3000', turnstileToken = null) {
    this.baseUrl = baseUrl
    this.turnstileToken = turnstileToken
  }

  /**
   * Get system status and tool availability
   */
  async getSystemStatus() {
    const response = await fetch(`${this.baseUrl}/api/system/status`)
    return response.json()
  }

  /**
   * Get available scan modes
   */
  async getScanModes() {
    const response = await fetch(`${this.baseUrl}/api/scans/modes`)
    return response.json()
  }

  /**
   * Get scan statistics
   */
  async getScanStats() {
    const response = await fetch(`${this.baseUrl}/api/scans/stats`)
    return response.json()
  }

  /**
   * Create a new scan
   */
  async createScan(url, scanType) {
    const response = await fetch(`${this.baseUrl}/api/scans`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        scanType,
        captchaToken: this.turnstileToken
      })
    })
    return response.json()
  }

  /**
   * Start a scan
   */
  async startScan(scanId) {
    const response = await fetch(`${this.baseUrl}/api/scans/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ scanId })
    })
    return response.json()
  }

  /**
   * Get all scans
   */
  async getScans() {
    const response = await fetch(`${this.baseUrl}/api/scans`)
    return response.json()
  }

  /**
   * Get specific scan by ID
   */
  async getScan(scanId) {
    const response = await fetch(`${this.baseUrl}/api/scans/${scanId}`)
    return response.json()
  }

  /**
   * Perform a complete scan workflow
   */
  async performScan(url, scanType, onProgress = null, onComplete = null) {
    try {
      console.log(`Starting ${scanType} scan for ${url}`)
      
      // Create scan
      const createResult = await this.createScan(url, scanType)
      if (createResult.error) {
        throw new Error(`Failed to create scan: ${createResult.error}`)
      }
      
      const scanId = createResult.id
      console.log(`Scan created with ID: ${scanId}`)
      
      // Set up WebSocket for real-time updates (if available)
      if (typeof window !== 'undefined' && window.io) {
        const socket = window.io()
        
        socket.on('scanProgress', (data) => {
          if (data.scanId === scanId && onProgress) {
            onProgress(data)
          }
        })
        
        socket.on('scanComplete', (data) => {
          if (data.scanId === scanId && onComplete) {
            onComplete(data)
          }
        })
      }
      
      // Start scan
      const startResult = await this.startScan(scanId)
      if (startResult.error) {
        throw new Error(`Failed to start scan: ${startResult.error}`)
      }
      
      console.log('Scan started successfully')
      return { scanId, success: true }
      
    } catch (error) {
      console.error('Scan workflow failed:', error)
      return { error: error.message, success: false }
    }
  }
}

// Example usage
async function exampleUsage() {
  const client = new RemoteVulscanClient()
  
  try {
    // Check system status
    console.log('Checking system status...')
    const status = await client.getSystemStatus()
    console.log('System Status:', status)
    
    if (!status.scan_capabilities?.can_perform_scans) {
      console.error('System is not ready for scanning')
      return
    }
    
    // Get available scan modes
    console.log('Getting scan modes...')
    const modes = await client.getScanModes()
    console.log('Available scan modes:', modes.scanModes.map(m => m.id))
    
    // Example: Perform a quick SSL analysis
    console.log('Starting SSL analysis...')
    const scanResult = await client.performScan(
      'https://badssl.com',
      'SSL_TLS_ANALYSIS',
      (progress) => {
        console.log(`Progress: ${progress.progress}% - ${progress.message}`)
      },
      (result) => {
        console.log('Scan completed!')
        console.log(`Found ${result.result.vulnerabilities?.length || 0} vulnerabilities`)
        console.log('Summary:', result.result.summary)
      }
    )
    
    if (scanResult.success) {
      console.log(`Scan initiated successfully. ID: ${scanResult.scanId}`)
      
      // Poll for results if WebSocket is not available
      let attempts = 0
      const maxAttempts = 60 // 5 minutes with 5-second intervals
      
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 5000)) // Wait 5 seconds
        
        const scan = await client.getScan(scanResult.scanId)
        console.log(`Scan status: ${scan.status}`)
        
        if (scan.status === 'COMPLETED') {
          console.log('Scan completed!')
          console.log(`Found ${scan.vulnerabilities?.length || 0} vulnerabilities`)
          break
        } else if (scan.status === 'FAILED') {
          console.error('Scan failed')
          break
        }
        
        attempts++
      }
    } else {
      console.error('Failed to initiate scan:', scanResult.error)
    }
    
  } catch (error) {
    console.error('Example usage failed:', error)
  }
}

// Node.js usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { RemoteVulscanClient, exampleUsage }
}

// Browser usage
if (typeof window !== 'undefined') {
  window.RemoteVulscanClient = RemoteVulscanClient
  window.exampleUsage = exampleUsage
}

// CLI usage example
if (typeof process !== 'undefined' && process.argv && process.argv[2] === 'run-example') {
  exampleUsage().then(() => {
    console.log('Example completed')
  }).catch(error => {
    console.error('Example failed:', error)
    process.exit(1)
  })
}

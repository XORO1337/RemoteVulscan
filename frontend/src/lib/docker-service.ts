import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export interface ContainerInfo {
  name: string
  status: 'running' | 'stopped' | 'not_found'
  image: string
  created: string
  ports: string[]
}

export interface ToolsAvailability {
  container: ContainerInfo
  tools: {
    [key: string]: {
      available: boolean
      version?: string
      path?: string
      error?: string
    }
  }
}

export class DockerContainerService {
  private toolsContainerName: string
  private appContainerName: string

  constructor(
    toolsContainerName = 'vuln-scanner-tools',
    appContainerName = 'vuln-scanner-app'
  ) {
    this.toolsContainerName = toolsContainerName
    this.appContainerName = appContainerName
  }

  /**
   * Check if the tools container is running and accessible
   */
  async checkToolsContainer(): Promise<ContainerInfo> {
    try {
      const { stdout } = await execAsync(
        `docker inspect ${this.toolsContainerName} --format="{{.State.Status}},{{.Config.Image}},{{.Created}},{{range .NetworkSettings.Ports}}{{.}}{{end}}"`
      )

      const [status, image, created, ports] = stdout.trim().split(',')
      
      return {
        name: this.toolsContainerName,
        status: status as 'running' | 'stopped',
        image,
        created,
        ports: ports ? ports.split(' ') : []
      }
    } catch (error) {
      return {
        name: this.toolsContainerName,
        status: 'not_found',
        image: '',
        created: '',
        ports: []
      }
    }
  }

  /**
   * Check availability of security tools in the container
   */
  async checkToolsAvailability(): Promise<ToolsAvailability> {
    const containerInfo = await this.checkToolsContainer()
    
    const tools: { [key: string]: any } = {}
    
    if (containerInfo.status !== 'running') {
      return {
        container: containerInfo,
        tools: {}
      }
    }

    const toolsToCheck = [
      'nmap',
      'nikto',
      'nuclei',
      'testssl.sh',
      'sslscan',
      'sqlmap',
      'dirsearch',
      'gobuster',
      'dirb',
      'ffuf',
      'whatweb',
      'wapiti',
      'skipfish',
      'masscan',
      'theharvester',
      'wpscan'
    ]

    for (const tool of toolsToCheck) {
      try {
        const versionCommand = this.getVersionCommand(tool)
        const { stdout, stderr } = await execAsync(
          `docker exec ${this.toolsContainerName} bash -c "${versionCommand}"`
        )
        
        tools[tool] = {
          available: true,
          version: this.extractVersion(tool, stdout + stderr),
          path: await this.getToolPath(tool)
        }
      } catch (error: any) {
        tools[tool] = {
          available: false,
          error: error.message || 'Tool not found'
        }
      }
    }

    return {
      container: containerInfo,
      tools
    }
  }

  /**
   * Get the appropriate version command for each tool
   */
  private getVersionCommand(tool: string): string {
    const versionCommands: { [key: string]: string } = {
      'nmap': 'nmap --version | head -n 1',
      'nikto': 'nikto -Version 2>&1 | head -n 1',
      'nuclei': 'nuclei -version 2>&1',
      'testssl.sh': 'testssl.sh --version 2>&1 | head -n 1',
      'sslscan': 'sslscan --version 2>&1',
      'sqlmap': 'sqlmap --version 2>&1',
      'dirsearch': 'python3 -m dirsearch --version 2>&1',
      'gobuster': 'gobuster version 2>&1',
      'dirb': 'dirb 2>&1 | head -n 3',
      'ffuf': 'ffuf -V 2>&1',
      'whatweb': 'whatweb --version 2>&1',
      'wapiti': 'wapiti --version 2>&1',
      'skipfish': 'skipfish -v 2>&1 | head -n 1',
      'masscan': 'masscan --version 2>&1',
      'theharvester': 'theHarvester --version 2>&1',
      'wpscan': 'wpscan --version 2>&1'
    }
    
    return versionCommands[tool] || `which ${tool} && ${tool} --version 2>&1 | head -n 1`
  }

  /**
   * Extract version information from tool output
   */
  private extractVersion(tool: string, output: string): string {
    // Clean up the output and extract version info
    const cleanOutput = output.replace(/\x1b\[[0-9;]*m/g, '').trim()
    
    // Common version patterns
    const versionPatterns = [
      /v?(\d+\.\d+\.\d+)/,
      /version\s+v?(\d+\.\d+\.\d+)/i,
      /(\d+\.\d+\.\d+)/,
      /v(\d+\.\d+)/,
      /(\d+\.\d+)/
    ]
    
    for (const pattern of versionPatterns) {
      const match = cleanOutput.match(pattern)
      if (match) {
        return match[1] || match[0]
      }
    }
    
    // Return first line if no version pattern found
    return cleanOutput.split('\n')[0] || 'unknown'
  }

  /**
   * Get the path of a tool in the container
   */
  private async getToolPath(tool: string): Promise<string> {
    try {
      const { stdout } = await execAsync(
        `docker exec ${this.toolsContainerName} which ${tool}`
      )
      return stdout.trim()
    } catch {
      return 'unknown'
    }
  }

  /**
   * Start the tools container if it's not running
   */
  async startToolsContainer(): Promise<boolean> {
    try {
      const containerInfo = await this.checkToolsContainer()
      
      if (containerInfo.status === 'not_found') {
        console.error('Tools container not found. Please run docker-compose up first.')
        return false
      }
      
      if (containerInfo.status === 'stopped') {
        await execAsync(`docker start ${this.toolsContainerName}`)
        console.log('Tools container started successfully')
        return true
      }
      
      return true // Already running
    } catch (error) {
      console.error('Failed to start tools container:', error)
      return false
    }
  }

  /**
   * Execute a command in the tools container with proper error handling
   */
  async executeCommand(command: string, timeout = 30000): Promise<{
    success: boolean
    stdout: string
    stderr: string
    exitCode: number
    executionTime: number
  }> {
    const startTime = Date.now()
    
    try {
      // Ensure tools container is running
      const isRunning = await this.startToolsContainer()
      if (!isRunning) {
        throw new Error('Tools container is not available')
      }

      const containerCommand = `docker exec ${this.toolsContainerName} bash -c "${command}"`
      console.log(`Executing: ${containerCommand}`)
      
      const { stdout, stderr } = await execAsync(containerCommand, {
        timeout,
        maxBuffer: 1024 * 1024 * 10 // 10MB buffer
      })
      
      return {
        success: true,
        stdout,
        stderr,
        exitCode: 0,
        executionTime: Date.now() - startTime
      }
    } catch (error: any) {
      return {
        success: false,
        stdout: error.stdout || '',
        stderr: error.stderr || error.message,
        exitCode: error.code || 1,
        executionTime: Date.now() - startTime
      }
    }
  }

  /**
   * Get container logs
   */
  async getContainerLogs(lines = 100): Promise<string> {
    try {
      const { stdout } = await execAsync(`docker logs --tail ${lines} ${this.toolsContainerName}`)
      return stdout
    } catch (error: any) {
      return `Error getting logs: ${error.message}`
    }
  }

  /**
   * Check if Docker daemon is running
   */
  async checkDockerDaemon(): Promise<boolean> {
    try {
      await execAsync('docker ps', { timeout: 5000 })
      return true
    } catch {
      return false
    }
  }

  /**
   * Get system information
   */
  async getSystemInfo(): Promise<{
    dockerRunning: boolean
    toolsContainer: ContainerInfo
    toolsAvailable: boolean
    networkConnectivity: boolean
  }> {
    const dockerRunning = await this.checkDockerDaemon()
    const toolsContainer = await this.checkToolsContainer()
    const toolsAvailable = toolsContainer.status === 'running'
    
    // Test network connectivity from tools container
    let networkConnectivity = false
    if (toolsAvailable) {
      try {
        await this.executeCommand('curl -s --connect-timeout 5 google.com > /dev/null', 10000)
        networkConnectivity = true
      } catch {
        networkConnectivity = false
      }
    }

    return {
      dockerRunning,
      toolsContainer,
      toolsAvailable,
      networkConnectivity
    }
  }
}

// Singleton instance
export const dockerService = new DockerContainerService()

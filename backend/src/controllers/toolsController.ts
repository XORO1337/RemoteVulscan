import { Request, Response } from 'express';
import { logger } from '@/utils/logger';
import { asyncHandler, ApiError } from '@/middleware/errorHandler';
import { ToolsAPIClient } from '@/services/toolsApiClient';

/**
 * @swagger
 * /api/v1/tools:
 *   get:
 *     summary: Get available security tools
 *     tags: [Tools]
 *     responses:
 *       200:
 *         description: List of available security tools
 */
export const getAvailableTools = asyncHandler(async (req: Request, res: Response) => {
  const toolExecutionService = req.app.locals.toolExecutionService;
  
  try {
    const tools = await toolExecutionService.getAvailableTools();
    const stats = toolExecutionService.getExecutionStats();
    
    res.json({
      tools: Object.fromEntries(tools),
      categories: toolExecutionService.getCategories(),
      statistics: stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to get available tools:', error);
    throw new ApiError('Failed to retrieve available tools', 503);
  }
});

/**
 * @swagger
 * /api/v1/tools/health:
 *   get:
 *     summary: Check tools service health
 *     tags: [Tools]
 *     responses:
 *       200:
 *         description: Tools service health status
 */
export const getToolsHealth = asyncHandler(async (req: Request, res: Response) => {
  const toolExecutionService = req.app.locals.toolExecutionService;
  
  const stats = toolExecutionService.getExecutionStats();
  const isHealthy = stats.availableTools > 0;
  
  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    availableTools: stats.availableTools,
    totalTools: stats.totalTools,
    activeExecutions: stats.activeExecutions
  });
});

/**
 * @swagger
 * /api/v1/tools/categories:
 *   get:
 *     summary: Get tool categories
 *     tags: [Tools]
 *     responses:
 *       200:
 *         description: Available tool categories
 */
export const getToolCategories = asyncHandler(async (req: Request, res: Response) => {
  const categories = [
    {
      name: 'network',
      description: 'Network scanning and discovery tools',
      tools: ['nmap', 'masscan', 'zmap']
    },
    {
      name: 'web',
      description: 'Web application security testing tools',
      tools: ['nikto', 'nuclei', 'sqlmap', 'dirsearch', 'gobuster', 'whatweb']
    },
    {
      name: 'crypto',
      description: 'SSL/TLS and cryptographic analysis tools',
      tools: ['testssl', 'sslscan']
    },
    {
      name: 'vulnerability',
      description: 'General vulnerability assessment tools',
      tools: ['nuclei', 'vuls']
    }
  ];
  
  res.json({
    categories,
    timestamp: new Date().toISOString()
  });
});

/**
 * @swagger
 * /api/v1/tools/{toolName}:
 *   get:
 *     summary: Get information about a specific tool
 *     tags: [Tools]
 *     parameters:
 *       - in: path
 *         name: toolName
 *         required: true
 *         schema:
 *           type: string
 *         description: Name of the tool
 *     responses:
 *       200:
 *         description: Tool information
 *       404:
 *         description: Tool not found
 */
export const getToolInfo = asyncHandler(async (req: Request, res: Response) => {
  const { toolName } = req.params;
  const toolExecutionService = req.app.locals.toolExecutionService;
  
  try {
    const tool = toolExecutionService.getToolInfo(toolName);
    
    if (!tool) {
      throw new ApiError(`Tool '${toolName}' not found`, 404);
    }
    
    // Enhanced tool information
    const toolInfo = {
      name: toolName,
      ...tool,
      documentation: getToolDocumentation(toolName),
      usageExamples: getToolUsageExamples(toolName)
    };
    
    res.json(toolInfo);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Failed to get tool info:', error);
    throw new ApiError('Failed to retrieve tool information', 503);
  }
});

/**
 * @swagger
 * /api/v1/tools/scan-modes:
 *   get:
 *     summary: Get available scan modes
 *     tags: [Tools]
 *     responses:
 *       200:
 *         description: Available scan modes and their tool configurations
 */
export const getScanModes = asyncHandler(async (req: Request, res: Response) => {
  const scanModes = [
    {
      name: 'full_scan',
      description: 'Comprehensive security assessment using multiple tools',
      tools: ['nmap', 'nikto', 'nuclei', 'testssl'],
      estimatedTime: '15-30 minutes',
      coverage: ['network', 'web', 'ssl', 'vulnerabilities']
    },
    {
      name: 'network_recon',
      description: 'Network discovery and port scanning',
      tools: ['nmap', 'masscan'],
      estimatedTime: '2-5 minutes',
      coverage: ['network', 'ports', 'services']
    },
    {
      name: 'web_scan',
      description: 'Web application security testing',
      tools: ['nikto', 'nuclei', 'whatweb'],
      estimatedTime: '5-15 minutes',
      coverage: ['web', 'vulnerabilities', 'technologies']
    },
    {
      name: 'ssl_analysis',
      description: 'SSL/TLS configuration analysis',
      tools: ['testssl', 'sslscan'],
      estimatedTime: '1-3 minutes',
      coverage: ['ssl', 'tls', 'certificates']
    },
    {
      name: 'directory_enum',
      description: 'Directory and file enumeration',
      tools: ['gobuster', 'dirsearch'],
      estimatedTime: '5-10 minutes',
      coverage: ['directories', 'files', 'endpoints']
    },
    {
      name: 'sql_injection',
      description: 'SQL injection vulnerability testing',
      tools: ['sqlmap'],
      estimatedTime: '10-20 minutes',
      coverage: ['sql_injection', 'database']
    },
    {
      name: 'vulnerability_assessment',
      description: 'General vulnerability scanning',
      tools: ['nuclei', 'nikto'],
      estimatedTime: '5-15 minutes',
      coverage: ['vulnerabilities', 'cve', 'exploits']
    }
  ];
  
  res.json({
    scanModes,
    timestamp: new Date().toISOString()
  });
});

// Helper functions
function getToolDocumentation(toolName: string): any {
  const docs: Record<string, any> = {
    nmap: {
      description: 'Network Mapper - Network discovery and security auditing',
      website: 'https://nmap.org',
      commonArgs: ['-sS', '-sV', '-O', '-A'],
      outputFormats: ['normal', 'xml', 'json']
    },
    nikto: {
      description: 'Web server scanner for security vulnerabilities',
      website: 'https://cirt.net/Nikto2',
      commonArgs: ['-h', '-ssl', '-Format'],
      outputFormats: ['txt', 'xml', 'csv']
    },
    nuclei: {
      description: 'Fast vulnerability scanner based on templates',
      website: 'https://nuclei.projectdiscovery.io',
      commonArgs: ['-u', '-t', '-severity'],
      outputFormats: ['json', 'jsonl']
    },
    testssl: {
      description: 'SSL/TLS configuration analyzer',
      website: 'https://testssl.sh',
      commonArgs: ['--fast', '--severity', '--jsonfile'],
      outputFormats: ['txt', 'json', 'csv']
    },
    sqlmap: {
      description: 'Automatic SQL injection and database takeover tool',
      website: 'https://sqlmap.org',
      commonArgs: ['-u', '--batch', '--risk', '--level'],
      outputFormats: ['txt']
    }
  };
  
  return docs[toolName] || {
    description: 'Security testing tool',
    website: null,
    commonArgs: [],
    outputFormats: ['txt']
  };
}

function getToolUsageExamples(toolName: string): string[] {
  const examples: Record<string, string[]> = {
    nmap: [
      'nmap -sS example.com',
      'nmap -sV -O example.com',
      'nmap -A -T4 example.com'
    ],
    nikto: [
      'nikto -h example.com',
      'nikto -h https://example.com -ssl',
      'nikto -h example.com -Format json'
    ],
    nuclei: [
      'nuclei -u https://example.com',
      'nuclei -u https://example.com -severity critical,high',
      'nuclei -u https://example.com -t cves/'
    ],
    testssl: [
      'testssl.sh example.com',
      'testssl.sh --fast example.com',
      'testssl.sh --severity HIGH example.com'
    ],
    sqlmap: [
      'sqlmap -u "https://example.com/page?id=1" --batch',
      'sqlmap -u "https://example.com/page?id=1" --risk 3 --level 5',
      'sqlmap -r request.txt --batch'
    ]
  };
  
  return examples[toolName] || [`${toolName} [options] target`];
}

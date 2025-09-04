import { NextResponse } from 'next/server'

export async function GET() {
  const scanModes = [
    {
      id: 'FULL_SCAN',
      name: 'Full Comprehensive Scan',
      description: 'Complete security assessment using all available tools including Nmap, Nikto, Nuclei, SSL analysis, and more',
      tools: ['nmap', 'nikto', 'nuclei', 'testssl', 'whatweb', 'sslscan', 'dirsearch', 'wpscan', 'gobuster'],
      estimatedTime: '15-30 minutes',
      complexity: 'HIGH',
      category: 'comprehensive'
    },
    {
      id: 'NETWORK_RECONNAISSANCE',
      name: 'Network Reconnaissance',
      description: 'Comprehensive network discovery and port scanning to identify services and potential attack vectors',
      tools: ['nmap', 'masscan', 'theharvester'],
      estimatedTime: '5-15 minutes',
      complexity: 'MEDIUM',
      category: 'network'
    },
    {
      id: 'WEB_APPLICATION_SCAN',
      name: 'Web Application Security Scan',
      description: 'Focused web application vulnerability assessment including common web vulnerabilities',
      tools: ['nikto', 'nuclei', 'whatweb', 'dirsearch', 'wapiti', 'skipfish'],
      estimatedTime: '10-20 minutes',
      complexity: 'MEDIUM',
      category: 'web'
    },
    {
      id: 'SSL_TLS_ANALYSIS',
      name: 'SSL/TLS Security Analysis',
      description: 'Comprehensive SSL/TLS configuration analysis and vulnerability assessment',
      tools: ['testssl', 'sslscan', 'nmap'],
      estimatedTime: '3-8 minutes',
      complexity: 'LOW',
      category: 'crypto'
    },
    {
      id: 'DIRECTORY_ENUMERATION',
      name: 'Directory & File Enumeration',
      description: 'Discover hidden directories, files, and sensitive content on web servers',
      tools: ['dirsearch', 'gobuster', 'dirb', 'ffuf'],
      estimatedTime: '5-15 minutes',
      complexity: 'LOW',
      category: 'web'
    },
    {
      id: 'SQL_INJECTION_TEST',
      name: 'SQL Injection Testing',
      description: 'Specialized testing for SQL injection vulnerabilities',
      tools: ['sqlmap', 'nuclei'],
      estimatedTime: '10-25 minutes',
      complexity: 'MEDIUM',
      category: 'web'
    },
    {
      id: 'VULNERABILITY_ASSESSMENT',
      name: 'Multi-Phase Vulnerability Assessment',
      description: 'Comprehensive security assessment combining network recon, web app testing, SSL analysis, and injection testing',
      tools: ['all_tools'],
      estimatedTime: '20-45 minutes',
      complexity: 'HIGH',
      category: 'comprehensive'
    },
    // Legacy single-tool scans
    {
      id: 'NMAP',
      name: 'Nmap Port Scan',
      description: 'Network port scanning and service detection',
      tools: ['nmap'],
      estimatedTime: '2-5 minutes',
      complexity: 'LOW',
      category: 'network'
    },
    {
      id: 'NIKTO',
      name: 'Nikto Web Scan',
      description: 'Web server vulnerability scanner',
      tools: ['nikto'],
      estimatedTime: '3-8 minutes',
      complexity: 'LOW',
      category: 'web'
    },
    {
      id: 'NUCLEI',
      name: 'Nuclei Template Scan',
      description: 'Fast and customizable vulnerability scanner based on YAML templates',
      tools: ['nuclei'],
      estimatedTime: '5-12 minutes',
      complexity: 'LOW',
      category: 'web'
    },
    {
      id: 'SSL_CHECK',
      name: 'SSL Certificate Check',
      description: 'SSL/TLS certificate validation and security check',
      tools: ['testssl'],
      estimatedTime: '2-5 minutes',
      complexity: 'LOW',
      category: 'crypto'
    },
    {
      id: 'SQLMAP',
      name: 'SQLMap Injection Test',
      description: 'Automated SQL injection detection and exploitation',
      tools: ['sqlmap'],
      estimatedTime: '8-20 minutes',
      complexity: 'MEDIUM',
      category: 'web'
    }
  ]

  const categories = [
    {
      id: 'comprehensive',
      name: 'Comprehensive',
      description: 'Complete security assessments using multiple tools',
      color: '#dc2626' // red
    },
    {
      id: 'network',
      name: 'Network',
      description: 'Network-level security testing and reconnaissance',
      color: '#2563eb' // blue
    },
    {
      id: 'web',
      name: 'Web Application',
      description: 'Web application security testing',
      color: '#059669' // green
    },
    {
      id: 'crypto',
      name: 'Cryptography',
      description: 'SSL/TLS and cryptographic security analysis',
      color: '#7c3aed' // purple
    }
  ]

  return NextResponse.json({
    scanModes,
    categories,
    metadata: {
      totalModes: scanModes.length,
      categories: categories.length,
      toolsAvailable: [
        'nmap', 'nikto', 'nuclei', 'testssl', 'sslscan', 'sqlmap',
        'dirsearch', 'gobuster', 'dirb', 'ffuf', 'whatweb', 'wapiti',
        'skipfish', 'masscan', 'theharvester', 'wpscan'
      ],
      lastUpdated: new Date().toISOString()
    }
  })
}

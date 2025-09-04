import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ApiError } from '@/middleware/errorHandler';
// Prisma enums removed; define allowed scan types locally
const ScanType = {
  NMAP: 'NMAP',
  NIKTO: 'NIKTO',
  NUCLEI: 'NUCLEI',
  TESTSSL: 'TESTSSL',
  SSLSCAN: 'SSLSCAN',
  SQLMAP: 'SQLMAP'
} as const;

// Validation schemas
const scanRequestSchema = Joi.object({
  url: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .required()
    .messages({
      'string.uri': 'URL must be a valid HTTP or HTTPS URL',
      'any.required': 'URL is required'
    }),
  
  scanType: Joi.string()
    .valid(...Object.values(ScanType))
    .required()
    .messages({
      'any.only': `Scan type must be one of: ${Object.values(ScanType).join(', ')}`,
      'any.required': 'Scan type is required'
    }),
  
  scanMode: Joi.string()
    .valid(
      'full_scan',
      'network_recon', 
      'web_scan',
      'ssl_analysis',
      'directory_enum',
      'sql_injection',
      'vulnerability_assessment'
    )
    .optional(),
  
  options: Joi.object({
    args: Joi.array().items(Joi.string()).optional(),
    timeout: Joi.number().integer().min(1000).max(3600000).optional(), // 1 second to 1 hour
    priority: Joi.number().integer().min(1).max(10).optional()
  }).optional()
});

const websiteRequestSchema = Joi.object({
  url: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .required(),
  
  name: Joi.string()
    .min(1)
    .max(255)
    .optional()
});

const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sortBy: Joi.string().valid('createdAt', 'updatedAt', 'status').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
});

// Validation middleware factory
const validateRequest = (schema: Joi.ObjectSchema, property: 'body' | 'query' | 'params' = 'body') => {
  return (req: any, res: any, next: NextFunction) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });

    if (error) {
      const errorMessage = error.details
        .map(detail => detail.message)
        .join(', ');
      
      throw new ApiError(`Validation error: ${errorMessage}`, 400);
    }

    // Replace the request property with validated and converted value
    req[property] = value;
    next();
  };
};

// URL validation helper
export const validateUrl = (url: string): boolean => {
  try {
    const urlObj = new URL(url);
    return ['http:', 'https:'].includes(urlObj.protocol);
  } catch {
    return false;
  }
};

// Sanitize URL helper
export const sanitizeUrl = (url: string): string => {
  try {
    const urlObj = new URL(url);
    // Remove fragments and potentially dangerous parameters
    urlObj.hash = '';
    return urlObj.toString();
  } catch {
    throw new ApiError('Invalid URL format', 400);
  }
};

// Security validation for scan parameters
export const validateScanSecurity = (req: any, res: any, next: NextFunction) => {
  const { url, options } = req.body;
  
  try {
    const urlObj = new URL(url);
    
    // Block private/internal networks
    const hostname = urlObj.hostname.toLowerCase();
    const privateNetworks = [
      'localhost',
      '127.0.0.1',
      '10.',
      '172.16.',
      '172.17.',
      '172.18.',
      '172.19.',
      '172.20.',
      '172.21.',
      '172.22.',
      '172.23.',
      '172.24.',
      '172.25.',
      '172.26.',
      '172.27.',
      '172.28.',
      '172.29.',
      '172.30.',
      '172.31.',
      '192.168.',
      '::1'
    ];

    const isPrivate = privateNetworks.some(network => 
      hostname.startsWith(network) || hostname === network.replace('.', '')
    );

    if (isPrivate && process.env.NODE_ENV === 'production') {
      throw new ApiError('Scanning private networks is not allowed', 403);
    }

    // Validate scan arguments for security
    if (options?.args && Array.isArray(options.args)) {
      const dangerousArgs = [
        '--script',
        '-sC',
        '--script-args',
        '-A',
        '--osscan-guess',
        '-O',
        '--version-all'
      ];

      const hasDangerousArgs = options.args.some((arg: string) => 
        dangerousArgs.some(dangerous => arg.includes(dangerous))
      );

      if (hasDangerousArgs) {
        throw new ApiError('Dangerous scan arguments detected', 400);
      }
    }

    next();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Invalid URL format', 400);
  }
};

// Rate limiting validation
export const validateRateLimit = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'] as string;
  
  // If API key is provided, validate it and set higher limits
  if (apiKey) {
    // This would typically check against a database
    // For now, just validate format
    if (!/^[a-zA-Z0-9]{32,64}$/.test(apiKey)) {
      throw new ApiError('Invalid API key format', 401);
    }
  }
  
  next();
};

// Content validation
export const validateContentType = (req: Request, res: Response, next: NextFunction) => {
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    const contentType = req.headers['content-type'];
    if (!contentType || !contentType.includes('application/json')) {
      throw new ApiError('Content-Type must be application/json', 400);
    }
  }
  next();
};

// Exported validation middleware
export const validateScanRequest = [
  validateContentType,
  validateRequest(scanRequestSchema, 'body'),
  validateScanSecurity
];

export const validateWebsiteRequest = [
  validateContentType,
  validateRequest(websiteRequestSchema, 'body')
];

export const validatePagination = validateRequest(paginationSchema, 'query');

export default {
  validateScanRequest,
  validateWebsiteRequest,
  validatePagination,
  validateRateLimit,
  validateUrl,
  sanitizeUrl
};

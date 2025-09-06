import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ApiError } from '@/middleware/errorHandler';

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
  
  options: Joi.object({
    args: Joi.array().items(Joi.string()).optional(),
    timeout: Joi.number().integer().min(1000).max(3600000).optional(),
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

    req[property] = value;
    next();
  };
};

// Security validation for scan parameters
export const validateScanSecurity = (req: any, res: any, next: NextFunction) => {
  const { url, options } = req.body;
  
  try {
    const urlObj = new URL(url);
    
    // Block private/internal networks in production
    const hostname = urlObj.hostname.toLowerCase();
    const privateNetworks = [
      'localhost', '127.0.0.1', '10.', '172.16.', '172.17.', '172.18.',
      '172.19.', '172.20.', '172.21.', '172.22.', '172.23.', '172.24.',
      '172.25.', '172.26.', '172.27.', '172.28.', '172.29.', '172.30.',
      '172.31.', '192.168.', '::1'
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
        '--script', '-sC', '--script-args', '-A', '--osscan-guess', '-O'
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

// Exported validation middleware
export const validateScanRequest = [
  validateRequest(scanRequestSchema, 'body'),
  validateScanSecurity
];

export const validateWebsiteRequest = validateRequest(websiteRequestSchema, 'body');
export const validatePagination = validateRequest(paginationSchema, 'query');

export default {
  validateScanRequest,
  validateWebsiteRequest,
  validatePagination
};
import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

// General rate limiter
export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests',
    message: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req: any, res: any) => {
    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.',
  retryAfter: 900,
      timestamp: new Date().toISOString()
    });
  }
});

// Strict rate limiter for scan endpoints
export const scanRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 scan requests per hour
  message: {
    error: 'Scan rate limit exceeded',
    message: 'Too many scan requests from this IP, please try again later.',
    retryAfter: '1 hour'
  },
  handler: (req: any, res: any) => {
    res.status(429).json({
      error: 'Scan Rate Limit Exceeded',
      message: 'Too many scan requests. Please wait before initiating another scan.',
  retryAfter: 3600,
      timestamp: new Date().toISOString()
    });
  }
});

// API key rate limiter (more generous for authenticated requests)
export const apiKeyRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1000, // Limit each API key to 1000 requests per hour
  keyGenerator: (req: any): string => {
    return (req.headers['x-api-key'] as string) || (req as any).ip;
  },
  message: {
    error: 'API rate limit exceeded',
    message: 'API rate limit exceeded for this key.',
    retryAfter: '1 hour'
  }
});

export default rateLimiter;

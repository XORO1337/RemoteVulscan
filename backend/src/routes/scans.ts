import { Router } from 'express';
import { 
  getAllScans, 
  getScanById, 
  createScan, 
  cancelScan, 
  getScanStats,
  getQueueStatus
} from '@/controllers/scansController';
import { scanRateLimiter } from '@/middleware/rateLimiter';
import { verifyCaptcha } from '@/middleware/captcha';
import { validateScanRequest } from '@/middleware/validation';

const router = Router();

// GET /api/v1/scans - Get all scans with pagination
router.get('/', getAllScans);

// GET /api/v1/scans/stats - Get scan statistics  
router.get('/stats', getScanStats);

// GET /api/v1/scans/queue - Get queue status
router.get('/queue', getQueueStatus);

// GET /api/v1/scans/:id - Get scan by ID
router.get('/:id', getScanById);

// POST /api/v1/scans - Create new scan (with rate limiting + captcha if enabled)
router.post('/', scanRateLimiter, verifyCaptcha, validateScanRequest, createScan);

// POST /api/v1/scans/:id/cancel - Cancel scan
router.post('/:id/cancel', cancelScan);

export default router;

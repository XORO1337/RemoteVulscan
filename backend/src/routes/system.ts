import { Router } from 'express';
import { 
  healthCheck, 
  getSystemInfo, 
  getSystemMetrics, 
  getSystemLogs,
  getSystemConfig
} from '@/controllers/systemController';

const router = Router();

// GET /api/v1/system/health - Health check
router.get('/health', healthCheck);

// GET /api/v1/system/info - System information  
router.get('/info', getSystemInfo);

// GET /api/v1/system/metrics - System metrics
router.get('/metrics', getSystemMetrics);

// GET /api/v1/system/logs - System logs
router.get('/logs', getSystemLogs);

// GET /api/v1/system/config - System configuration
router.get('/config', getSystemConfig);

export default router;

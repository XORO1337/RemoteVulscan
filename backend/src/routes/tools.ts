import { Router } from 'express';
import { 
  getAvailableTools, 
  getToolsHealth, 
  getToolCategories,
  getToolInfo,
  getScanModes
} from '@/controllers/toolsController';

const router = Router();

// GET /api/v1/tools - Get available tools
router.get('/', getAvailableTools);

// GET /api/v1/tools/health - Tools service health
router.get('/health', getToolsHealth);

// GET /api/v1/tools/categories - Tool categories
router.get('/categories', getToolCategories);

// GET /api/v1/tools/scan-modes - Available scan modes
router.get('/scan-modes', getScanModes);

// GET /api/v1/tools/:toolName - Get specific tool info
router.get('/:toolName', getToolInfo);

export default router;

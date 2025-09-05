import { Router } from 'express';
import { 
  getAvailableTools, 
  getToolsHealth, 
  getToolCategories,
  getToolInfo,
  getScanModes
} from '@/controllers/toolsController';
import { asyncHandler } from '@/middleware/errorHandler';

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

// POST /api/v1/tools/execute - Execute a single tool
router.post('/execute', asyncHandler(async (req: any, res: any) => {
  const { tool, args = [], target, timeout } = req.body;
  
  if (!tool || !target) {
    return res.status(400).json({
      error: 'Tool and target are required',
      example: {
        tool: 'nmap',
        target: 'scanme.nmap.org',
        args: ['-sn'],
        timeout: 30000
      },
      timestamp: new Date().toISOString()
    });
  }

  const toolExecutionService = req.app.locals.toolExecutionService;
  if (!toolExecutionService) {
    return res.status(503).json({
      error: 'Tool execution service not initialized',
      message: 'The backend is still starting up. Please try again in a few seconds.',
      timestamp: new Date().toISOString()
    });
  }

  const result = await toolExecutionService.executeTool(tool, args, target, timeout);
  
  res.json(result);
}));

// POST /api/v1/tools/execute-multiple - Execute multiple tools
router.post('/execute-multiple', asyncHandler(async (req: any, res: any) => {
  const { tools, target, mode = 'parallel' } = req.body;
  
  if (!tools || !Array.isArray(tools) || !target) {
    return res.status(400).json({
      error: 'Tools array and target are required',
      example: {
        tools: [
          { name: 'nmap', args: ['-sn'] },
          { name: 'nuclei', args: ['-version'] }
        ],
        target: 'scanme.nmap.org',
        mode: 'parallel'
      },
      timestamp: new Date().toISOString()
    });
  }

  const toolExecutionService = req.app.locals.toolExecutionService;
  if (!toolExecutionService) {
    return res.status(503).json({
      error: 'Tool execution service not initialized',
      message: 'The backend is still starting up. Please try again in a few seconds.',
      timestamp: new Date().toISOString()
    });
  }

  const results = await toolExecutionService.executeMultipleTools(tools, target, mode);
  const report = await toolExecutionService.generateScanReport(results);
  
  res.json(report);
}));

export default router;

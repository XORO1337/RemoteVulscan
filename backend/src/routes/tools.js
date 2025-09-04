const express = require('express');
const { query, validationResult } = require('express-validator');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * @swagger
 * /api/v1/tools:
 *   get:
 *     summary: Get available security tools
 *     tags: [Tools]
 *     responses:
 *       200:
 *         description: List of available tools
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     tools:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Tool'
 *                     categories:
 *                       type: array
 *                       items:
 *                         type: string
 */
router.get('/', async (req, res, next) => {
  try {
    const tools = await req.services.tool.getAvailableTools();
    
    res.json({
      success: true,
      data: {
        tools,
        categories: req.services.tool.getToolCategories(),
        totalTools: tools.length,
        availableTools: tools.filter(t => t.available).length
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/v1/tools/{toolName}:
 *   get:
 *     summary: Get specific tool information
 *     tags: [Tools]
 *     parameters:
 *       - in: path
 *         name: toolName
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Tool information
 *       404:
 *         description: Tool not found
 */
router.get('/:toolName', async (req, res, next) => {
  try {
    const { toolName } = req.params;
    
    const tool = await req.services.tool.getToolInfo(toolName);
    
    if (!tool) {
      return res.status(404).json({
        error: 'Tool not found',
        toolName
      });
    }

    res.json({
      success: true,
      data: tool
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/v1/tools/verify:
 *   post:
 *     summary: Verify all tools installation
 *     tags: [Tools]
 *     responses:
 *       200:
 *         description: Tool verification results
 */
router.post('/verify', async (req, res, next) => {
  try {
    const verification = await req.services.tool.verifyAllTools();
    
    res.json({
      success: true,
      data: verification,
      summary: {
        total: verification.length,
        available: verification.filter(t => t.available).length,
        unavailable: verification.filter(t => !t.available).length
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
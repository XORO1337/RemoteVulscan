import { Request, Response } from 'express';
import { getDatabase } from '@/utils/database';
import { logger } from '@/utils/logger';
import { ApiError, asyncHandler } from '@/middleware/errorHandler';

// Removed module-level database initialization. Each handler now fetches the DB lazily
// to avoid calling getDatabase() before connectDatabase() has run.

/**
 * @swagger
 * /api/v1/websites:
 *   get:
 *     summary: Get all websites with pagination
 *     tags: [Websites]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: List of websites
 */
export const getAllWebsites = asyncHandler(async (req: any, res: any) => {
  const db = getDatabase();
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  const [websites, total] = await Promise.all([
    db.website.findMany({
      include: {
        scans: {
          select: {
            id: true,
            status: true,
            scanType: true,
            createdAt: true,
            completedAt: true
          },
          orderBy: { createdAt: 'desc' },
          take: 5 // Latest 5 scans per website
        },
        _count: {
          select: {
            scans: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' },
      skip,
      take: limit,
    }),
    db.website.count()
  ]);

  const totalPages = Math.ceil(total / limit);

  res.json({
    websites,
    pagination: {
      currentPage: page,
      totalPages,
      totalItems: total,
      itemsPerPage: limit,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    }
  });
});

/**
 * @swagger
 * /api/v1/websites/{id}:
 *   get:
 *     summary: Get website by ID
 *     tags: [Websites]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Website details
 *       404:
 *         description: Website not found
 */
export const getWebsiteById = asyncHandler(async (req: any, res: any) => {
  const db = getDatabase();
  const { id } = req.params;

  const website = await db.website.findUnique({
    where: { id },
    include: {
      scans: {
        include: {
          vulnerabilities: true
        },
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  if (!website) {
    throw new ApiError('Website not found', 404);
  }

  res.json(website);
});

/**
 * @swagger
 * /api/v1/websites:
 *   post:
 *     summary: Add a new website
 *     tags: [Websites]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - url
 *             properties:
 *               url:
 *                 type: string
 *                 description: Website URL
 *               name:
 *                 type: string
 *                 description: Website name
 *     responses:
 *       201:
 *         description: Website created
 *       400:
 *         description: Invalid input
 *       409:
 *         description: Website already exists
 */
export const createWebsite = asyncHandler(async (req: any, res: any) => {
  const db = getDatabase();
  const { url, name } = req.body;

  try {
    // Extract hostname for default name
    const hostname = new URL(url).hostname;
    
    const website = await db.website.create({
      data: {
        url,
        name: name || hostname
      }
    });

    logger.info('Website created', { websiteId: website.id, url });

    res.status(201).json(website);
  } catch (error: any) {
    if (error.code === 'P2002') {
      throw new ApiError('Website with this URL already exists', 409);
    }
    throw new ApiError('Failed to create website', 500);
  }
});

/**
 * @swagger
 * /api/v1/websites/{id}:
 *   put:
 *     summary: Update website
 *     tags: [Websites]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               url:
 *                 type: string
 *               name:
 *                 type: string
 *     responses:
 *       200:
 *         description: Website updated
 *       404:
 *         description: Website not found
 */
export const updateWebsite = asyncHandler(async (req: any, res: any) => {
  const db = getDatabase();
  const { id } = req.params;
  const { url, name } = req.body;

  const website = await db.website.findUnique({
    where: { id }
  });

  if (!website) {
    throw new ApiError('Website not found', 404);
  }

  try {
    const updatedWebsite = await db.website.update({
      where: { id },
      data: {
        ...(url && { url }),
        ...(name && { name }),
        updatedAt: new Date()
      }
    });

    logger.info('Website updated', { websiteId: id });

    res.json(updatedWebsite);
  } catch (error: any) {
    if (error.code === 'P2002') {
      throw new ApiError('Website with this URL already exists', 409);
    }
    throw new ApiError('Failed to update website', 500);
  }
});

/**
 * @swagger
 * /api/v1/websites/{id}:
 *   delete:
 *     summary: Delete website
 *     tags: [Websites]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Website deleted
 *       404:
 *         description: Website not found
 */
export const deleteWebsite = asyncHandler(async (req: any, res: any) => {
  const db = getDatabase();
  const { id } = req.params;

  const website = await db.website.findUnique({
    where: { id },
    include: {
      _count: {
        select: { scans: true }
      }
    }
  });

  if (!website) {
    throw new ApiError('Website not found', 404);
  }

  // Delete website and all associated scans (cascade)
  await db.website.delete({
    where: { id }
  });

  logger.info('Website deleted', { 
    websiteId: id, 
    url: website.url,
    scanCount: website._count.scans 
  });

  res.json({
    message: 'Website deleted successfully',
    deletedScans: website._count.scans
  });
});

/**
 * @swagger
 * /api/v1/websites/{id}/scans:
 *   get:
 *     summary: Get scans for a website
 *     tags: [Websites]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Website scans
 *       404:
 *         description: Website not found
 */
export const getWebsiteScans = asyncHandler(async (req: any, res: any) => {
  const db = getDatabase();
  const { id } = req.params;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  const website = await db.website.findUnique({
    where: { id }
  });

  if (!website) {
    throw new ApiError('Website not found', 404);
  }

  const [scans, total] = await Promise.all([
    db.scan.findMany({
      where: { websiteId: id },
      include: {
        vulnerabilities: true
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    db.scan.count({ where: { websiteId: id } })
  ]);

  const totalPages = Math.ceil(total / limit);

  res.json({
    website: {
      id: website.id,
      url: website.url,
      name: website.name
    },
    scans,
    pagination: {
      currentPage: page,
      totalPages,
      totalItems: total,
      itemsPerPage: limit,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    }
  });
});

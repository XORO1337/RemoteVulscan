import { Router } from 'express';
import { 
  getAllWebsites, 
  getWebsiteById, 
  createWebsite, 
  updateWebsite, 
  deleteWebsite,
  getWebsiteScans
} from '@/controllers/websitesController';
import { validateWebsiteRequest, validatePagination } from '@/middleware/validation';

const router = Router();

// GET /api/v1/websites - Get all websites
router.get('/', validatePagination, getAllWebsites);

// GET /api/v1/websites/:id - Get website by ID
router.get('/:id', getWebsiteById);

// POST /api/v1/websites - Create new website
router.post('/', validateWebsiteRequest, createWebsite);

// PUT /api/v1/websites/:id - Update website
router.put('/:id', validateWebsiteRequest, updateWebsite);

// DELETE /api/v1/websites/:id - Delete website
router.delete('/:id', deleteWebsite);

// GET /api/v1/websites/:id/scans - Get website scans
router.get('/:id/scans', validatePagination, getWebsiteScans);

export default router;

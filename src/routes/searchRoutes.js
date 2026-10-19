import { Router } from 'express';
import { searchContent, searchQuerySchema } from '../controllers/searchController.js';
import { validateQuery } from '../middleware/validateRequest.js';

const router = Router();

router.get('/', validateQuery(searchQuerySchema), searchContent);

export default router;

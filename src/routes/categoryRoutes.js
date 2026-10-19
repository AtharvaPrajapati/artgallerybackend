import { Router } from 'express';
import {
  listCategories,
  getCategoryBySlug,
  categorySlugSchema,
} from '../controllers/categoryController.js';
import { validateParams } from '../middleware/validateRequest.js';

const router = Router();

router.get('/', listCategories);
router.get('/:slug', validateParams(categorySlugSchema), getCategoryBySlug);

export default router;

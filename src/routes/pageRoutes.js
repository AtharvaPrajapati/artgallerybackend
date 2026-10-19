import { Router } from 'express';
import { listPages, getPageBySlug, pageSlugSchema } from '../controllers/pageController.js';
import { validateParams } from '../middleware/validateRequest.js';

const router = Router();

router.get('/', listPages);
router.get('/:slug', validateParams(pageSlugSchema), getPageBySlug);

export default router;

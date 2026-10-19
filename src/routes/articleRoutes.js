import { Router } from 'express';
import {
  listArticles,
  getArticleBySlug,
  getRelatedArticles,
  listArticlesQuerySchema,
  slugParamSchema,
} from '../controllers/articleController.js';
import { validateQuery, validateParams } from '../middleware/validateRequest.js';

const router = Router();

router.get('/', validateQuery(listArticlesQuerySchema), listArticles);
router.get('/:slug', validateParams(slugParamSchema), getArticleBySlug);
router.get('/:slug/related', validateParams(slugParamSchema), getRelatedArticles);

export default router;

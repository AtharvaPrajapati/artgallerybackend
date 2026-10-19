import { z } from 'zod';
import { Article } from '../models/Article.js';
import { Page } from '../models/Page.js';
import { normalizeArticle, normalizePage } from '../contracts/contentContract.js';
import { parsePagination, paginationMeta } from '../utils/pagination.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export const searchQuerySchema = z.object({
  q: z.string().min(1, 'Search query is required'),
  page: z.string().optional(),
  perPage: z.string().optional(),
  per_page: z.string().optional(),
});

export const searchContent = asyncHandler(async (req, res) => {
  const q = req.validatedQuery.q.trim();
  const { page, perPage, skip } = parsePagination(req.validatedQuery);

  const articleFilter = {
    status: 'publish',
    $text: { $search: q },
  };

  const [articles, articleTotal, pages] = await Promise.all([
    Article.find(articleFilter, { score: { $meta: 'textScore' } })
      .sort({ score: { $meta: 'textScore' }, publishedAt: -1 })
      .skip(skip)
      .limit(perPage)
      .populate('author categories tags')
      .lean(),
    Article.countDocuments(articleFilter),
    Page.find({
      status: 'publish',
      $or: [
        { title: { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } },
        { excerpt: { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } },
      ],
    })
      .limit(5)
      .lean(),
  ]);

  res.json({
    success: true,
    data: {
      query: q,
      articles: articles.map(normalizeArticle),
      pages: pages.map(normalizePage),
    },
    meta: paginationMeta({ page, perPage, total: articleTotal }),
  });
});

import { z } from 'zod';
import { Article } from '../models/Article.js';
import { Category } from '../models/Category.js';
import { normalizeArticle } from '../contracts/contentContract.js';
import { parsePagination, paginationMeta } from '../utils/pagination.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export const listArticlesQuerySchema = z.object({
  page: z.string().optional(),
  perPage: z.string().optional(),
  per_page: z.string().optional(),
  category: z.string().optional(),
  author: z.string().optional(),
  search: z.string().optional(),
  exclude: z.string().optional(),
});

export const slugParamSchema = z.object({
  slug: z.string().min(1),
});

export const listArticles = asyncHandler(async (req, res) => {
  const { page, perPage, skip } = parsePagination(req.validatedQuery || req.query);
  const filter = { status: 'publish' };

  if (req.validatedQuery?.category) {
    const category = await Category.findOne({ slug: req.validatedQuery.category });
    if (!category) {
      return res.json({
        success: true,
        data: [],
        meta: paginationMeta({ page, perPage, total: 0 }),
      });
    }
    filter.categories = category._id;
  }

  if (req.validatedQuery?.search) {
    filter.$text = { $search: req.validatedQuery.search };
  }

  if (req.validatedQuery?.exclude) {
    filter.slug = { $ne: req.validatedQuery.exclude };
  }

  const [items, total] = await Promise.all([
    Article.find(filter)
      .sort({ publishedAt: -1 })
      .skip(skip)
      .limit(perPage)
      .populate('author categories tags')
      .lean(),
    Article.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: items.map(normalizeArticle),
    meta: paginationMeta({ page, perPage, total }),
  });
});

export const getArticleBySlug = asyncHandler(async (req, res) => {
  const article = await Article.findOne({
    slug: req.validatedParams.slug,
    status: 'publish',
  })
    .populate('author categories tags')
    .lean();

  if (!article) {
    return res.status(404).json({
      success: false,
      error: { code: 'ARTICLE_NOT_FOUND', message: 'Article not found' },
    });
  }

  res.json({ success: true, data: normalizeArticle(article) });
});

export const getRelatedArticles = asyncHandler(async (req, res) => {
  const article = await Article.findOne({
    slug: req.validatedParams.slug,
    status: 'publish',
  }).lean();

  if (!article) {
    return res.status(404).json({
      success: false,
      error: { code: 'ARTICLE_NOT_FOUND', message: 'Article not found' },
    });
  }

  const related = await Article.find({
    status: 'publish',
    _id: { $ne: article._id },
    categories: { $in: article.categories || [] },
  })
    .sort({ publishedAt: -1 })
    .limit(4)
    .populate('author categories tags')
    .lean();

  res.json({
    success: true,
    data: related.map(normalizeArticle),
  });
});

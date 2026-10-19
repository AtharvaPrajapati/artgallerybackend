import { z } from 'zod';
import { Category } from '../models/Category.js';
import { Article } from '../models/Article.js';
import { normalizeCategory, normalizeArticle } from '../contracts/contentContract.js';
import { parsePagination, paginationMeta } from '../utils/pagination.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export const categorySlugSchema = z.object({
  slug: z.string().min(1),
});

export const listCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find({}).sort({ name: 1 }).lean();
  res.json({
    success: true,
    data: categories.map(normalizeCategory),
  });
});

export const getCategoryBySlug = asyncHandler(async (req, res) => {
  const category = await Category.findOne({ slug: req.validatedParams.slug }).lean();
  if (!category) {
    return res.status(404).json({
      success: false,
      error: { code: 'CATEGORY_NOT_FOUND', message: 'Category not found' },
    });
  }

  const { page, perPage, skip } = parsePagination(req.query);
  const filter = { status: 'publish', categories: category._id };
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
    data: {
      category: normalizeCategory(category),
      articles: items.map(normalizeArticle),
    },
    meta: paginationMeta({ page, perPage, total }),
  });
});

import { z } from 'zod';
import { Page } from '../models/Page.js';
import { normalizePage } from '../contracts/contentContract.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export const pageSlugSchema = z.object({
  slug: z.string().min(1),
});

export const listPages = asyncHandler(async (req, res) => {
  const pages = await Page.find({ status: 'publish' }).sort({ title: 1 }).lean();
  res.json({
    success: true,
    data: pages.map(normalizePage),
  });
});

export const getPageBySlug = asyncHandler(async (req, res) => {
  const page = await Page.findOne({
    slug: req.validatedParams.slug,
    status: 'publish',
  }).lean();

  if (!page) {
    return res.status(404).json({
      success: false,
      error: { code: 'PAGE_NOT_FOUND', message: 'Page not found' },
    });
  }

  res.json({ success: true, data: normalizePage(page) });
});

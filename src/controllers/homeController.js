import { Article } from '../models/Article.js';
import { Category } from '../models/Category.js';
import { normalizeArticle, normalizeCategory } from '../contracts/contentContract.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const SECTION_SLUGS = [
  { key: 'visualArt', slug: 'visual-art', title: 'Visual Art' },
  { key: 'performingArt', slug: 'performing-art', title: 'Performing Art' },
  { key: 'festivals', slug: 'festivals', title: 'Festivals' },
  { key: 'heritage', slug: 'heritage-culture', title: 'Heritage & Culture' },
  { key: 'interviews', slug: 'interviews', title: 'Interviews' },
  { key: 'museums', slug: 'museums', title: 'Museums' },
  { key: 'editorsPick', slug: 'editors-pick-art-culture-festival', title: "Editor's Pick" },
];

async function articlesForCategorySlug(slug, limit = 4) {
  const category = await Category.findOne({ slug }).lean();
  if (!category) return { category: null, articles: [] };

  const articles = await Article.find({
    status: 'publish',
    categories: category._id,
  })
    .sort({ publishedAt: -1 })
    .limit(limit)
    .populate('author categories tags')
    .lean();

  return {
    category: normalizeCategory(category),
    articles: articles.map(normalizeArticle),
  };
}

export const getHomepage = asyncHandler(async (req, res) => {
  const latest = await Article.find({ status: 'publish' })
    .sort({ publishedAt: -1 })
    .limit(12)
    .populate('author categories tags')
    .lean();

  const featured = latest.slice(0, 1).map(normalizeArticle);
  const featuredStories = latest.slice(1, 5).map(normalizeArticle);
  const latestArticles = latest.map(normalizeArticle);

  const sectionResults = await Promise.all(
    SECTION_SLUGS.map(async (section) => {
      const data = await articlesForCategorySlug(section.slug, 4);
      return [
        section.key,
        {
          title: section.title,
          slug: section.slug,
          ...data,
        },
      ];
    })
  );
  const sections = Object.fromEntries(sectionResults);

  const navigationCategories = await Category.find({
    slug: {
      $in: [
        'interviews',
        'visual-art',
        'performing-art',
        'festivals',
        'museums',
        'design',
        'editors-pick-art-culture-festival',
      ],
    },
  })
    .sort({ name: 1 })
    .lean();

  res.json({
    success: true,
    data: {
      hero: featured[0] || null,
      featuredStories,
      latestArticles,
      sections,
      navigation: navigationCategories.map(normalizeCategory),
      site: {
        name: 'Art Culture Festival',
        tagline: 'The Magazine for Art and Culture',
        description:
          'An initiative of Good Cause, covering Indian art, culture, lifestyle, and travel with depth and contemporary relevance.',
      },
    },
  });
});

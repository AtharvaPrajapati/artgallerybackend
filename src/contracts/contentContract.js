/**
 * CMS-independent content contract.
 * Express/Mongo and WordPress REST adapters must normalize to these shapes
 * so React components never depend on a specific CMS response format.
 */

export function normalizeArticle(doc) {
  if (!doc) return null;

  const author = doc.author
    ? {
        id: String(doc.author.wpId || doc.author._id || doc.author.id || ''),
        name: doc.author.name || 'Art Culture Festival',
        slug: doc.author.slug || '',
        bio: doc.author.bio || '',
        avatarUrl: doc.author.avatarUrl || '',
      }
    : { id: '', name: 'Art Culture Festival', slug: '', bio: '', avatarUrl: '' };

  const categories = (doc.categories || []).map((c) => ({
    id: String(c.wpId || c._id || c.id || ''),
    name: c.name,
    slug: c.slug,
  }));

  const tags = (doc.tags || []).map((t) => ({
    id: String(t.wpId || t._id || t.id || ''),
    name: t.name,
    slug: t.slug,
  }));

  const featuredImage = doc.featuredImage
    ? {
        id: String(doc.featuredImage.wpId || doc.featuredImage._id || doc.featuredImage.id || ''),
        url: doc.featuredImage.url || '',
        alt: doc.featuredImage.alt || doc.title || '',
        caption: doc.featuredImage.caption || '',
        credit: doc.featuredImage.credit || '',
        width: doc.featuredImage.width || null,
        height: doc.featuredImage.height || null,
      }
    : null;

  return {
    id: String(doc.sourceId || doc.wpId || doc._id || doc.id),
    sourceId: String(doc.sourceId || doc.wpId || ''),
    wpId: doc.wpId || null,
    slug: doc.slug,
    title: decodeEntities(doc.title || ''),
    excerpt: stripTags(doc.excerpt || ''),
    content: doc.content || '',
    publishedAt: toIso(doc.publishedAt || doc.date),
    modifiedAt: toIso(doc.modifiedAt || doc.modified),
    status: doc.status || 'publish',
    author,
    categories,
    tags,
    featuredImage,
    seo: {
      title: doc.seo?.title || doc.title || '',
      description: doc.seo?.description || stripTags(doc.excerpt || ''),
      canonicalUrl:
        doc.seo?.canonicalUrl ||
        doc.canonicalUrl ||
        doc.originalUrl ||
        '',
    },
    originalUrl: doc.originalUrl || '',
    canonicalUrl: doc.seo?.canonicalUrl || doc.canonicalUrl || doc.originalUrl || '',
  };
}

export function normalizeCategory(doc) {
  if (!doc) return null;
  return {
    id: String(doc.sourceId || doc.wpId || doc._id || doc.id),
    sourceId: String(doc.sourceId || doc.wpId || ''),
    wpId: doc.wpId || null,
    name: decodeEntities(doc.name || ''),
    slug: doc.slug,
    description: doc.description || '',
    parentSlug: doc.parentSlug || null,
    count: doc.count || 0,
    originalUrl: doc.originalUrl || '',
  };
}

export function normalizePage(doc) {
  if (!doc) return null;
  return {
    id: String(doc.sourceId || doc.wpId || doc._id || doc.id),
    sourceId: String(doc.sourceId || doc.wpId || ''),
    wpId: doc.wpId || null,
    slug: doc.slug,
    title: decodeEntities(doc.title || ''),
    content: doc.content || '',
    excerpt: stripTags(doc.excerpt || ''),
    publishedAt: toIso(doc.publishedAt || doc.date),
    modifiedAt: toIso(doc.modifiedAt || doc.modified),
    status: doc.status || 'publish',
    featuredImage: doc.featuredImage
      ? {
          url: doc.featuredImage.url || '',
          alt: doc.featuredImage.alt || '',
          caption: doc.featuredImage.caption || '',
        }
      : null,
    seo: {
      title: doc.seo?.title || doc.title || '',
      description: doc.seo?.description || stripTags(doc.excerpt || ''),
      canonicalUrl: doc.seo?.canonicalUrl || doc.canonicalUrl || doc.originalUrl || '',
    },
    originalUrl: doc.originalUrl || '',
    canonicalUrl: doc.seo?.canonicalUrl || doc.canonicalUrl || doc.originalUrl || '',
  };
}

export function normalizeAuthor(doc) {
  if (!doc) return null;
  return {
    id: String(doc.sourceId || doc.wpId || doc._id || doc.id),
    name: doc.name || '',
    slug: doc.slug || '',
    bio: doc.bio || '',
    avatarUrl: doc.avatarUrl || '',
  };
}

function toIso(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function stripTags(html = '') {
  return decodeEntities(String(html).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim());
}

function decodeEntities(text = '') {
  return String(text)
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#8217;/g, "'")
    .replace(/&#8216;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#038;/g, '&')
    .replace(/&nbsp;/g, ' ');
}

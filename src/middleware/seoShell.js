import fs from 'fs';
import path from 'path';
import { Article } from '../models/Article.js';
import { Page } from '../models/Page.js';
import { Category } from '../models/Category.js';
import { normalizeArticle, normalizePage, normalizeCategory } from '../contracts/contentContract.js';

/**
 * Injects title/description/canonical/JSON-LD into the built index.html
 * for article, page, and category routes so crawlers receive SEO metadata
 * without requiring a full React SSR rewrite.
 */
export function seoShellMiddleware(clientDist) {
  return async function seoShell(req, res, next) {
    if (req.method !== 'GET') return next();
    if (req.path.startsWith('/api') || req.path.includes('.')) return next();

    const indexPath = path.join(clientDist, 'index.html');
    if (!fs.existsSync(indexPath)) {
      return res.status(503).send(
        'Frontend build not found. Run `npm run build -w client` or use the Vite dev server.'
      );
    }

    try {
      let html = fs.readFileSync(indexPath, 'utf8');
      const meta = await resolveMeta(req.path);
      if (meta) {
        html = injectMeta(html, meta);
      }
      res.status(meta?.status || 200).type('html').send(html);
    } catch (err) {
      next(err);
    }
  };
}

async function resolveMeta(pathname) {
  const siteName = 'Art Culture Festival';
  const siteUrl = (process.env.SITE_URL || 'http://localhost:5173').replace(/\/$/, '');
  const clean = pathname.replace(/\/+$/, '') || '/';

  if (clean === '/') {
    return {
      title: `${siteName} | Indian Art & Culture Magazine`,
      description:
        'Art Culture Festival is an Indian art and culture magazine covering contemporary art, exhibitions, festivals, museums, artists, design and cultural stories.',
      canonical: `${siteUrl}/`,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: siteName,
        url: siteUrl,
        potentialAction: {
          '@type': 'SearchAction',
          target: `${siteUrl}/search?q={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      },
    };
  }

  if (clean.startsWith('/category/')) {
    const slug = clean.replace('/category/', '');
    const category = await Category.findOne({ slug }).lean();
    if (!category) return { status: 404, title: `Not Found | ${siteName}`, description: '', canonical: `${siteUrl}${clean}/` };
    const c = normalizeCategory(category);
    return {
      title: `${c.name} | ${siteName}`,
      description: c.description || `Stories in ${c.name} from Art Culture Festival.`,
      canonical: `${siteUrl}/category/${c.slug}/`,
    };
  }

  if (clean === '/search') {
    return {
      title: `Search | ${siteName}`,
      description: 'Search Art Culture Festival articles and pages.',
      canonical: `${siteUrl}/search`,
    };
  }

  const slug = clean.replace(/^\//, '');
  const article = await Article.findOne({ slug, status: 'publish' })
    .populate('author categories')
    .lean();
  if (article) {
    const a = normalizeArticle(article);
    return {
      title: a.seo.title || `${a.title} | ${siteName}`,
      description: a.seo.description || a.excerpt,
      canonical: a.canonicalUrl || `${siteUrl}/${a.slug}/`,
      image: a.featuredImage?.url,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: a.title,
        datePublished: a.publishedAt,
        dateModified: a.modifiedAt,
        author: { '@type': 'Person', name: a.author?.name },
        image: a.featuredImage?.url ? [a.featuredImage.url] : undefined,
        mainEntityOfPage: a.canonicalUrl || `${siteUrl}/${a.slug}/`,
      },
    };
  }

  const page = await Page.findOne({ slug, status: 'publish' }).lean();
  if (page) {
    const p = normalizePage(page);
    return {
      title: p.seo.title || `${p.title} | ${siteName}`,
      description: p.seo.description || p.excerpt,
      canonical: p.canonicalUrl || `${siteUrl}/${p.slug}/`,
    };
  }

  return {
    status: 404,
    title: `Not Found | ${siteName}`,
    description: 'The requested page could not be found.',
    canonical: `${siteUrl}${clean}`,
  };
}

function injectMeta(html, meta) {
  const escape = (s = '') =>
    String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const tags = [
    `<title>${escape(meta.title)}</title>`,
    `<meta name="description" content="${escape(meta.description || '')}" />`,
    `<link rel="canonical" href="${escape(meta.canonical || '')}" />`,
    `<meta property="og:title" content="${escape(meta.title)}" />`,
    `<meta property="og:description" content="${escape(meta.description || '')}" />`,
    `<meta property="og:url" content="${escape(meta.canonical || '')}" />`,
    `<meta property="og:type" content="article" />`,
  ];

  if (meta.image) {
    tags.push(`<meta property="og:image" content="${escape(meta.image)}" />`);
  }
  if (meta.jsonLd) {
    tags.push(
      `<script type="application/ld+json">${JSON.stringify(meta.jsonLd).replace(/</g, '\\u003c')}</script>`
    );
  }

  if (html.includes('</head>')) {
    return html.replace('</head>', `${tags.join('\n')}\n</head>`);
  }
  return `${tags.join('\n')}\n${html}`;
}

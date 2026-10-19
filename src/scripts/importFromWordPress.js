/**
 * Idempotent WordPress → MongoDB importer.
 * Re-running updates existing records by sourceId / wpId and does not create duplicates.
 * Never writes to the live WordPress site.
 */
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';
import axios from 'axios';
import crypto from 'crypto';
import { connectDatabase } from '../config/database.js';
import { Author } from '../models/Author.js';
import { Category } from '../models/Category.js';
import { Tag } from '../models/Tag.js';
import { Media } from '../models/Media.js';
import { Article } from '../models/Article.js';
import { Page } from '../models/Page.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const WP_API_BASE = process.env.WP_API_BASE || 'https://www.artculturefestival.in/wp-json/wp/v2';
const ORIGINAL_SITE = (process.env.ORIGINAL_SITE_URL || 'https://www.artculturefestival.in').replace(/\/$/, '');
const report = {
  startedAt: new Date().toISOString(),
  categories: { upserted: 0 },
  tags: { upserted: 0 },
  authors: { upserted: 0 },
  media: { upserted: 0 },
  articles: { upserted: 0, skipped: 0, failed: [] },
  pages: { upserted: 0, failed: [] },
  limitations: [],
};

const client = axios.create({
  baseURL: WP_API_BASE,
  timeout: 60000,
  headers: {
    'User-Agent': 'ACF-MERN-Importer/1.0 (+local development migration)',
    Accept: 'application/json',
  },
});

async function fetchAll(endpoint, params = {}) {
  const items = [];
  let page = 1;
  let totalPages = 1;

  do {
    const response = await client.get(endpoint, {
      params: { per_page: 100, page, _embed: 1, ...params },
      validateStatus: (s) => s < 500,
    });

    if (response.status === 401 || response.status === 403) {
      report.limitations.push(`${endpoint} returned ${response.status}; partial import only.`);
      break;
    }
    if (response.status >= 400) {
      throw new Error(`Failed fetching ${endpoint} page ${page}: HTTP ${response.status}`);
    }

    const batch = Array.isArray(response.data) ? response.data : [];
    items.push(...batch);
    totalPages = Number(response.headers['x-wp-totalpages'] || 1);
    page += 1;
  } while (page <= totalPages);

  return items;
}

function stripHtml(html = '') {
  return String(html).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function contentHash(content = '') {
  return crypto.createHash('sha256').update(String(content)).digest('hex');
}

function featuredFromEmbed(item) {
  const media = item?._embedded?.['wp:featuredmedia']?.[0];
  if (!media) return null;
  return {
    wpId: media.id,
    url: media.source_url,
    alt: media.alt_text || '',
    caption: stripHtml(media.caption?.rendered || ''),
    credit: '',
    width: media.media_details?.width || null,
    height: media.media_details?.height || null,
  };
}

async function upsertCategories(categories) {
  const byWpId = new Map();
  for (const cat of categories) {
    const doc = await Category.findOneAndUpdate(
      { sourceId: `wp-category-${cat.id}` },
      {
        sourceId: `wp-category-${cat.id}`,
        wpId: cat.id,
        name: stripHtml(cat.name),
        slug: cat.slug,
        description: stripHtml(cat.description || ''),
        parentWpId: cat.parent || 0,
        count: cat.count || 0,
        originalUrl: cat.link || `${ORIGINAL_SITE}/category/${cat.slug}/`,
        migration: {
          importedAt: new Date(),
          lastSyncedAt: new Date(),
          source: 'wordpress',
        },
      },
      { upsert: true, new: true }
    );
    byWpId.set(cat.id, doc);
    report.categories.upserted += 1;
  }

  for (const cat of categories) {
    if (cat.parent) {
      const parent = byWpId.get(cat.parent);
      if (parent) {
        await Category.updateOne({ _id: byWpId.get(cat.id)._id }, { parentSlug: parent.slug });
      }
    }
  }

  return byWpId;
}

async function upsertTags(tags) {
  const byWpId = new Map();
  for (const tag of tags) {
    const doc = await Tag.findOneAndUpdate(
      { sourceId: `wp-tag-${tag.id}` },
      {
        sourceId: `wp-tag-${tag.id}`,
        wpId: tag.id,
        name: stripHtml(tag.name),
        slug: tag.slug,
        description: stripHtml(tag.description || ''),
        count: tag.count || 0,
        originalUrl: tag.link || `${ORIGINAL_SITE}/tag/${tag.slug}/`,
        migration: {
          importedAt: new Date(),
          lastSyncedAt: new Date(),
          source: 'wordpress',
        },
      },
      { upsert: true, new: true }
    );
    byWpId.set(tag.id, doc);
    report.tags.upserted += 1;
  }
  return byWpId;
}

async function upsertAuthor(authorEmbed) {
  if (!authorEmbed?.id) return null;
  const doc = await Author.findOneAndUpdate(
    { sourceId: `wp-author-${authorEmbed.id}` },
    {
      sourceId: `wp-author-${authorEmbed.id}`,
      wpId: authorEmbed.id,
      name: authorEmbed.name || 'Art Culture Festival',
      slug: authorEmbed.slug || `author-${authorEmbed.id}`,
      bio: stripHtml(authorEmbed.description || ''),
      avatarUrl: authorEmbed.avatar_urls?.['96'] || '',
      originalUrl: authorEmbed.link || '',
      migration: {
        importedAt: new Date(),
        lastSyncedAt: new Date(),
        source: 'wordpress',
      },
    },
    { upsert: true, new: true }
  );
  report.authors.upserted += 1;
  return doc;
}

async function upsertMedia(featured) {
  if (!featured?.wpId || !featured.url) return null;
  const doc = await Media.findOneAndUpdate(
    { sourceId: `wp-media-${featured.wpId}` },
    {
      sourceId: `wp-media-${featured.wpId}`,
      wpId: featured.wpId,
      url: featured.url,
      alt: featured.alt || '',
      caption: featured.caption || '',
      credit: featured.credit || '',
      width: featured.width,
      height: featured.height,
      originalUrl: featured.url,
      migration: {
        importedAt: new Date(),
        lastSyncedAt: new Date(),
        source: 'wordpress',
      },
    },
    { upsert: true, new: true }
  );
  report.media.upserted += 1;
  return doc;
}

async function importArticles(posts, categoryMap, tagMap) {
  for (const post of posts) {
    try {
      if (post.status !== 'publish') {
        report.articles.skipped += 1;
        continue;
      }

      const author = await upsertAuthor(post._embedded?.author?.[0]);
      const featured = featuredFromEmbed(post);
      await upsertMedia(featured);

      const categoryIds = (post.categories || [])
        .map((id) => categoryMap.get(id)?._id)
        .filter(Boolean);
      const tagIds = (post.tags || []).map((id) => tagMap.get(id)?._id).filter(Boolean);

      const title = stripHtml(post.title?.rendered || '');
      const content = post.content?.rendered || '';
      const excerpt = post.excerpt?.rendered || '';
      const seoTitle = post.yoast_head_json?.title || post.rank_math?.title || title;
      const seoDescription =
        post.yoast_head_json?.description ||
        post.rank_math?.description ||
        stripHtml(excerpt);
      const canonical =
        post.yoast_head_json?.canonical ||
        post.link ||
        `${ORIGINAL_SITE}/${post.slug}/`;

      await Article.findOneAndUpdate(
        { sourceId: `wp-post-${post.id}` },
        {
          sourceId: `wp-post-${post.id}`,
          wpId: post.id,
          slug: post.slug,
          title,
          excerpt,
          content,
          status: 'publish',
          publishedAt: post.date ? new Date(post.date) : null,
          modifiedAt: post.modified ? new Date(post.modified) : null,
          author: author?._id,
          categories: categoryIds,
          tags: tagIds,
          featuredImage: featured,
          seo: {
            title: seoTitle,
            description: seoDescription,
            canonicalUrl: canonical,
          },
          originalUrl: post.link,
          canonicalUrl: canonical,
          migration: {
            importedAt: new Date(),
            lastSyncedAt: new Date(),
            source: 'wordpress',
            contentHash: contentHash(content),
          },
        },
        { upsert: true, new: true }
      );
      report.articles.upserted += 1;
    } catch (err) {
      report.articles.failed.push({ id: post.id, slug: post.slug, error: err.message });
    }
  }
}

async function importPages(pages) {
  for (const page of pages) {
    try {
      if (page.status !== 'publish') continue;
      const featured = featuredFromEmbed(page);
      await upsertMedia(featured);

      const title = stripHtml(page.title?.rendered || '');
      const content = page.content?.rendered || '';
      const excerpt = page.excerpt?.rendered || '';
      const canonical = page.yoast_head_json?.canonical || page.link;

      await Page.findOneAndUpdate(
        { sourceId: `wp-page-${page.id}` },
        {
          sourceId: `wp-page-${page.id}`,
          wpId: page.id,
          slug: page.slug,
          title,
          excerpt,
          content,
          status: 'publish',
          publishedAt: page.date ? new Date(page.date) : null,
          modifiedAt: page.modified ? new Date(page.modified) : null,
          featuredImage: featured,
          seo: {
            title: page.yoast_head_json?.title || title,
            description: page.yoast_head_json?.description || stripHtml(excerpt),
            canonicalUrl: canonical,
          },
          originalUrl: page.link,
          canonicalUrl: canonical,
          migration: {
            importedAt: new Date(),
            lastSyncedAt: new Date(),
            source: 'wordpress',
          },
        },
        { upsert: true, new: true }
      );
      report.pages.upserted += 1;
    } catch (err) {
      report.pages.failed.push({ id: page.id, slug: page.slug, error: err.message });
    }
  }
}

export async function runWordPressImport() {
  // Reset counters for in-process re-runs
  report.startedAt = new Date().toISOString();
  report.categories.upserted = 0;
  report.tags.upserted = 0;
  report.authors.upserted = 0;
  report.media.upserted = 0;
  report.articles.upserted = 0;
  report.articles.skipped = 0;
  report.articles.failed = [];
  report.pages.upserted = 0;
  report.pages.failed = [];
  report.limitations = [];

  console.log('Fetching WordPress content (read-only)...');

  const [categories, tags, posts, pages] = await Promise.all([
    fetchAll('/categories'),
    fetchAll('/tags'),
    fetchAll('/posts'),
    fetchAll('/pages'),
  ]);

  console.log(
    `Fetched categories=${categories.length} tags=${tags.length} posts=${posts.length} pages=${pages.length}`
  );

  const categoryMap = await upsertCategories(categories);
  const tagMap = await upsertTags(tags);
  await importArticles(posts, categoryMap, tagMap);
  await importPages(pages);

  report.finishedAt = new Date().toISOString();
  report.totals = {
    articlesInDb: await Article.countDocuments({ status: 'publish' }),
    pagesInDb: await Page.countDocuments({ status: 'publish' }),
    categoriesInDb: await Category.countDocuments(),
  };

  const reportDir = path.resolve(__dirname, '../../../docs');
  fs.mkdirSync(reportDir, { recursive: true });
  const reportPath = path.join(reportDir, 'content-migration-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log('Import complete.');
  console.log(JSON.stringify(report, null, 2));
  console.log(`Report written to ${reportPath}`);
  return report;
}

async function main() {
  console.log('Connecting to MongoDB...');
  await connectDatabase(process.env.MONGODB_URI);
  await runWordPressImport();
  process.exit(0);
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  main().catch((err) => {
    console.error('Import failed:', err.message);
    process.exit(1);
  });
}
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import articleRoutes from './routes/articleRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import pageRoutes from './routes/pageRoutes.js';
import searchRoutes from './routes/searchRoutes.js';
import homeRoutes from './routes/homeRoutes.js';
import { seoShellMiddleware } from './middleware/seoShell.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
  app.use(compression());
  app.use(
    cors({
      origin: process.env.CLIENT_ORIGIN?.split(',').map((s) => s.trim()) || true,
      credentials: true,
    })
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

  app.use(
    rateLimit({
      windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 900000),
      max: Number(process.env.RATE_LIMIT_MAX || 300),
      standardHeaders: true,
      legacyHeaders: false,
    })
  );

  app.get('/api/health', (req, res) => {
    res.json({
      success: true,
      data: {
        status: 'ok',
        service: 'art-culture-festival-api',
        contentSource: process.env.CONTENT_SOURCE || 'mongo',
        timestamp: new Date().toISOString(),
      },
    });
  });

  app.get('/robots.txt', (req, res) => {
    const siteUrl = process.env.SITE_URL || 'http://localhost:5173';
    res.type('text/plain').send(
      `User-agent: *\nAllow: /\nSitemap: ${siteUrl}/sitemap.xml\n`
    );
  });

  app.get('/sitemap.xml', async (req, res, next) => {
    try {
      const { Article } = await import('./models/Article.js');
      const { Page } = await import('./models/Page.js');
      const { Category } = await import('./models/Category.js');
      const siteUrl = (process.env.SITE_URL || 'http://localhost:5173').replace(/\/$/, '');

      const [articles, pages, categories] = await Promise.all([
        Article.find({ status: 'publish' }).select('slug modifiedAt publishedAt').lean(),
        Page.find({ status: 'publish' }).select('slug modifiedAt').lean(),
        Category.find({}).select('slug').lean(),
      ]);

      const urls = [
        `${siteUrl}/`,
        ...articles.map((a) => `${siteUrl}/${a.slug}/`),
        ...pages.map((p) => `${siteUrl}/${p.slug}/`),
        ...categories.map((c) => `${siteUrl}/category/${c.slug}/`),
      ];

      const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
        .map((loc) => `  <url><loc>${loc}</loc></url>`)
        .join('\n')}\n</urlset>`;

      res.type('application/xml').send(body);
    } catch (err) {
      next(err);
    }
  });

  app.use('/api/home', homeRoutes);
  app.use('/api/articles', articleRoutes);
  app.use('/api/categories', categoryRoutes);
  app.use('/api/pages', pageRoutes);
  app.use('/api/search', searchRoutes);

  const clientDist = path.resolve(__dirname, '../../client/dist');
  app.use(express.static(clientDist));
  app.use(seoShellMiddleware(clientDist));

  app.use('/api', notFoundHandler);
  app.use(errorHandler);

  return app;
}

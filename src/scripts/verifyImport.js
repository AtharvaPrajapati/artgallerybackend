import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { connectDatabase } from '../config/database.js';
import { Article } from '../models/Article.js';
import { Page } from '../models/Page.js';
import { Category } from '../models/Category.js';
import { Author } from '../models/Author.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

async function main() {
  await connectDatabase(process.env.MONGODB_URI);
  const [articles, pages, categories, authors, sample] = await Promise.all([
    Article.countDocuments({ status: 'publish' }),
    Page.countDocuments({ status: 'publish' }),
    Category.countDocuments(),
    Author.countDocuments(),
    Article.find({ status: 'publish' })
      .sort({ publishedAt: -1 })
      .limit(5)
      .select('slug title originalUrl publishedAt')
      .lean(),
  ]);

  console.log(
    JSON.stringify(
      {
        articles,
        pages,
        categories,
        authors,
        sample: sample.map((a) => ({
          slug: a.slug,
          title: a.title,
          originalUrl: a.originalUrl,
          publishedAt: a.publishedAt,
        })),
      },
      null,
      2
    )
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

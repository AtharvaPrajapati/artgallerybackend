import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createApp } from './app.js';
import { connectDatabase } from './config/database.js';
import { ensureContentLoaded } from './scripts/ensureContent.js';
import { runWordPressImport } from './scripts/importFromWordPress.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const port = Number(process.env.PORT || 5000);

async function start() {
  await connectDatabase(process.env.MONGODB_URI);
  console.log('MongoDB connected');

  await ensureContentLoaded(runWordPressImport);

  const app = createApp();
  app.listen(port, () => {
    console.log(`ACF API listening on http://localhost:${port}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});

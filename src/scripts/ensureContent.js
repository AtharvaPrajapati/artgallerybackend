import { Article } from '../models/Article.js';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * If the database has no published articles, run the WordPress importer once.
 * Works with persistent Mongo and with MONGODB_URI=memory in the same process
 * only if import is invoked in-process — see importInProcess below.
 */
export async function ensureContentLoaded(importInProcess) {
  const count = await Article.countDocuments({ status: 'publish' });
  if (count > 0) {
    console.log(`Content ready: ${count} published articles`);
    return { imported: false, count };
  }

  console.log('No articles found — importing from WordPress REST API (read-only)...');
  if (typeof importInProcess === 'function') {
    await importInProcess();
  } else {
    await runImportChild();
  }

  const after = await Article.countDocuments({ status: 'publish' });
  console.log(`Import finished: ${after} published articles`);
  return { imported: true, count: after };
}

function runImportChild() {
  return new Promise((resolve, reject) => {
    const script = path.join(__dirname, 'importFromWordPress.js');
    const child = spawn(process.execPath, [script], {
      stdio: 'inherit',
      env: process.env,
    });
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Import script exited with code ${code}`));
    });
  });
}

import { mkdir, readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'content', 'teas');

const files = await readdir(root);
const teas = new Map();

for (const file of files) {
  if (!file.endsWith('.json')) continue;
  const id = file.replace(/\.json$/, '');
  const data = JSON.parse(await readFile(join(root, file), 'utf8'));
  teas.set(id, data);
}

let failed = false;
for (const [id, data] of teas) {
  for (const slug of data.similarTo ?? []) {
    if (!teas.has(slug)) {
      console.error(`similarTo miss: ${id} → ${slug}`);
      failed = true;
    }
  }
}

if (failed) {
  process.exit(1);
}

console.log(`Checked ${teas.size} teas; all similarTo slugs resolve.`);

import { readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getRegionGeo, buildRegionMap, buildOverviewMaps } from '../src/lib/geo.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'content', 'regions');
const files = (await readdir(root)).filter((f) => f.endsWith('.md'));

let failed = false;
for (const file of files) {
  const id = file.replace(/\.md$/, '');
  const geo = getRegionGeo(id);
  if (!geo?.geometry) {
    console.error(`Missing geo for region ${id}`);
    failed = true;
    continue;
  }
  const detail = buildRegionMap(id, { mode: 'detail' });
  const card = buildRegionMap(id, { mode: 'card' });
  if (!detail?.highlight || !card?.land) {
    console.error(`Map model failed for ${id}`);
    failed = true;
  }
}

const overview = buildOverviewMaps();
if (overview.length !== 3 || overview.some((m) => !m.land || !m.regions.length)) {
  console.error('Overview maps missing country panels');
  failed = true;
}

if (failed) process.exit(1);
console.log(`Checked ${files.length} region geo records; OSM/Natural Earth maps resolve.`);

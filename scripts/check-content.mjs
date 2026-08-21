import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const teaDir = join(root, 'src/content/teas');
const regionDir = join(root, 'src/content/regions');
const glossaryDir = join(root, 'src/content/glossary');

const teaFiles = (await readdir(teaDir)).filter((f) => f.endsWith('.json'));
const regionFiles = (await readdir(regionDir)).filter((f) => f.endsWith('.md'));
const glossaryFiles = (await readdir(glossaryDir)).filter((f) => f.endsWith('.json'));

const teas = new Map();
for (const file of teaFiles) {
  const id = file.replace(/\.json$/, '');
  teas.set(id, JSON.parse(await readFile(join(teaDir, file), 'utf8')));
}

const regionIds = new Set(regionFiles.map((f) => f.replace(/\.md$/, '')));
const regionMeta = new Map();
for (const file of regionFiles) {
  const id = file.replace(/\.md$/, '');
  const raw = await readFile(join(regionDir, file), 'utf8');
  const orphan = /^orphan:\s*true\s*$/m.test(raw);
  regionMeta.set(id, { orphan });
}

const glossaryIds = new Set(glossaryFiles.map((f) => f.replace(/\.json$/, '')));

const rinseWord = /\b(rinse|rinses|wash)\b/i;
let failed = false;
const err = (msg) => {
  console.error(msg);
  failed = true;
};

const counts = {};
for (const [id, data] of teas) {
  counts[data.category] = (counts[data.category] || 0) + 1;

  if (!data.origin?.regions) {
    err(`${id}: missing origin.regions`);
    continue;
  }
  if (data.origin.regions.length === 0 && !data.origin.regionNote) {
    err(`${id}: empty regions without regionNote`);
  }
  for (const rid of data.origin.regions) {
    if (!regionIds.has(rid)) err(`${id}: unknown region ${rid}`);
  }

  if (data.transformation?.kind === 'microbial' && !data.transformation.note) {
    err(`${id}: microbial transformation needs a note`);
  }

  if (data.brewing?.kind === 'suspension') {
    if (data.brewing.gongfu?.infusions) err(`${id}: suspension tea still has gongfu infusions`);
    if (!data.brewing.variants?.length) err(`${id}: suspension tea has no variants`);
  }

  if (data.brewing?.kind === 'infusion') {
    const g = data.brewing.gongfu;
    for (const inf of g.infusions || []) {
      if (inf.notes && rinseWord.test(inf.notes)) {
        err(`${id}: infusion ${inf.n} notes still mention a rinse`);
      }
    }
    const secs = (g.infusions || []).map((i) => i.seconds);
    if (secs.length >= 2) {
      const dip12 = secs[1] < secs[0];
      let laterDip = false;
      for (let i = 2; i < secs.length; i += 1) {
        if (secs[i] < secs[i - 1]) laterDip = true;
      }
      if (laterDip && !g.curveException) {
        err(`${id}: non-monotonic after steep 2 without curveException (${secs.join(',')})`);
      }
      if (dip12 && laterDip && !g.curveException) {
        err(`${id}: long-short-long (or worse) needs curveException`);
      }
    }
  }

  for (const slug of data.similarTo ?? []) {
    if (!teas.has(slug)) err(`similarTo miss: ${id} → ${slug}`);
  }
  for (const row of data.compare ?? []) {
    if (!teas.has(row.teaId)) err(`compare miss: ${id} → ${row.teaId}`);
  }
  for (const ref of data.glossaryRefs ?? []) {
    if (!glossaryIds.has(ref)) err(`${id}: unknown glossaryRefs ${ref}`);
  }
}

const categorySum = Object.values(counts).reduce((a, b) => a + b, 0);
if (categorySum !== teas.size) err(`category counts ${categorySum} !== teas ${teas.size}`);

for (const [id, meta] of regionMeta) {
  const n = [...teas.values()].filter((t) => t.origin.regions.includes(id)).length;
  if (n === 0 && !meta.orphan) err(`region ${id} has 0 teas and is not marked orphan`);
  if (n > 0 && meta.orphan) err(`region ${id} is orphan but has ${n} teas`);
}

if (failed) process.exit(1);
console.log(`Checked ${teas.size} teas, ${regionIds.size} regions, ${glossaryIds.size} glossary terms.`);

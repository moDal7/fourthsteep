/**
 * Download Wikimedia Commons thumbs into src/assets/teas/ and stamp photo
 * metadata onto each tea JSON. Not part of npm run build — run by hand.
 *
 *   node scripts/fetch-tea-photos.mjs
 */
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = join(root, 'src/data/tea-photos.json');
const teaDir = join(root, 'src/content/teas');
const assetDir = join(root, 'src/assets/teas');
const UA = 'fourthsteep/0.1 (https://www.topeki.com/fourthsteep/; tea atlas photo fetch)';
const WIDTH = 1600;

const licenseMap = [
  [/CC0/i, 'CC0', 'https://creativecommons.org/publicdomain/zero/1.0/'],
  [/Public domain/i, 'Public Domain', 'https://creativecommons.org/publicdomain/mark/1.0/'],
  [/PD[- ]/i, 'Public Domain', 'https://creativecommons.org/publicdomain/mark/1.0/'],
  [/CC BY-SA 2\.0 [Ff]r/, 'CC BY-SA 2.0 fr', 'https://creativecommons.org/licenses/by-sa/2.0/fr/'],
  [/CC BY-SA 4\.0/, 'CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0/'],
  [/CC BY-SA 3\.0/, 'CC BY-SA 3.0', 'https://creativecommons.org/licenses/by-sa/3.0/'],
  [/CC BY-SA 2\.0/, 'CC BY-SA 2.0', 'https://creativecommons.org/licenses/by-sa/2.0/'],
  [/CC BY 2\.1 [Jj]p/, 'CC BY 2.1 jp', 'https://creativecommons.org/licenses/by/2.1/jp/'],
  [/CC BY 4\.0/, 'CC BY 4.0', 'https://creativecommons.org/licenses/by/4.0/'],
  [/CC BY 3\.0/, 'CC BY 3.0', 'https://creativecommons.org/licenses/by/3.0/'],
  [/CC BY 2\.0/, 'CC BY 2.0', 'https://creativecommons.org/licenses/by/2.0/'],
];

const stripHtml = (s = '') =>
  s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const cleanAuthor = (artist, user) => {
  let a = stripHtml(artist);
  a = a.replace(/^Uploaded by\s+/i, '');
  a = a.replace(/\s+Uploaded by\s+.+$/i, '');
  a = a.replace(/\s*Transferred from .*$/i, '');
  a = a.replace(/^User:/, '');
  a = a.replace(/\s+at (English |Japanese )?Wikipedia$/i, '');
  a = a.replace(/^No machine-readable author provided\.\s*/i, '');
  a = a.replace(/\s*assumed \(based on copyright claims\)\.?$/i, '');
  a = a.replace(/\s*\(talk\).*$/i, '');
  a = a.trim();
  if (!a || a === 'no') {
    if (user) return user;
  }
  if (a === 'no' && user) return `${user} / フォト蔵`;
  return a || user || 'Wikimedia Commons';
};

const normalizeLicense = (shortName, licenseUrl) => {
  const raw = stripHtml(shortName) || '';
  for (const [re, label, fallbackUrl] of licenseMap) {
    if (re.test(raw)) {
      const url = licenseUrl && /^https?:\/\//.test(licenseUrl) ? licenseUrl.replace(/\/deed\.\w+$/, '') : fallbackUrl;
      return { license: label, licenseUrl: url };
    }
  }
  throw new Error(`Unmapped license: ${raw || '(empty)'}`);
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function commonsInfo(filename) {
  const params = new URLSearchParams({
    action: 'query',
    titles: `File:${filename}`,
    prop: 'imageinfo',
    iiprop: 'url|extmetadata|size|mime|user',
    iiurlwidth: String(WIDTH),
    format: 'json',
  });
  const res = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, {
    headers: { 'User-Agent': UA, Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`Commons API ${res.status} for ${filename}`);
  const data = await res.json();
  const page = Object.values(data.query?.pages || {})[0];
  if (!page || page.missing != null) throw new Error(`Missing on Commons: ${filename}`);
  const ii = page.imageinfo?.[0];
  if (!ii) throw new Error(`No imageinfo for ${filename}`);
  const meta = ii.extmetadata || {};
  const g = (k) => meta[k]?.value || '';
  const { license, licenseUrl } = normalizeLicense(g('LicenseShortName') || g('UsageTerms'), g('LicenseUrl'));
  const author = cleanAuthor(g('Artist') || g('Attribution') || g('Credit'), ii.user);
  const downloadUrl = ii.thumburl || ii.url;
  const sourceUrl =
    ii.descriptionurl || `https://commons.wikimedia.org/wiki/File:${filename.replace(/ /g, '_')}`;
  return { author, license, licenseUrl, downloadUrl, sourceUrl, mime: ii.mime, width: ii.thumbwidth || ii.width };
}

async function download(url, dest) {
  const clean = url.replace(/\?.*$/, '');
  let lastErr;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const res = await fetch(clean, { headers: { 'User-Agent': UA, Accept: 'image/*' } });
    if (res.status === 429 || res.status === 503) {
      const wait = 4000 * 2 ** attempt;
      console.warn(`  rate-limited ${res.status}, wait ${wait}ms`);
      await sleep(wait);
      lastErr = new Error(`Download ${res.status} ${clean}`);
      continue;
    }
    if (!res.ok) throw new Error(`Download ${res.status} ${clean}`);
    const buf = Buffer.from(await res.arrayBuffer());
    await writeFile(dest, buf);
    return buf.length;
  }
  throw lastErr;
}

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
await mkdir(assetDir, { recursive: true });

const slugs = Object.keys(manifest).sort();
let failed = 0;
for (const slug of slugs) {
  const entry = manifest[slug];
  const teaPath = join(teaDir, `${slug}.json`);
  try {
    const dest = join(assetDir, `${slug}.jpg`);
    let haveFile = false;
    try {
      await access(dest);
      haveFile = true;
    } catch {
      haveFile = false;
    }
    const info = await commonsInfo(entry.commonsFile);
    const bytes = haveFile ? 0 : await download(info.downloadUrl, dest);
    const tea = JSON.parse(await readFile(teaPath, 'utf8'));
    tea.photo = {
      src: `../../assets/teas/${slug}.jpg`,
      alt: entry.alt,
      caption: entry.caption,
      subject: entry.subject,
      author: info.author,
      license: info.license,
      licenseUrl: info.licenseUrl,
      sourceUrl: info.sourceUrl,
    };
    await writeFile(teaPath, `${JSON.stringify(tea, null, 2)}\n`);
    console.log(`ok  ${slug}  ${info.license}  ${haveFile ? 'cached' : `${bytes}B`}  ${info.author}`);
  } catch (err) {
    failed += 1;
    console.error(`ERR ${slug}: ${err.message}`);
    await sleep(3000);
  }
  await sleep(800);
}

if (failed) {
  console.error(`Failed ${failed} of ${slugs.length}`);
  process.exit(1);
}
console.log(`Fetched ${slugs.length} photos.`);

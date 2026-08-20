/**
 * Rebuild src/data/geo from public datasets.
 *
 * Sources (retrieved at runtime; committed output is what the site uses):
 * - OpenStreetMap administrative polygons via Nominatim lookup
 * - Natural Earth 10m admin-1 (provinces / prefectures / counties)
 * - Natural Earth 50m admin-0 countries (locator insets)
 * - Copernicus DEM elevation via Open-Meteo
 *
 * Nominatim policy: 1 req/s and a valid User-Agent.
 *
 *   node scripts/fetch-geo.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'src/data/geo');
const CACHE = '/tmp/geo-src';
const UA = 'fourthsteep-atlas/0.1 (https://www.topeki.com/fourthsteep/; geo rebuild)';
const RETRIEVED = new Date().toISOString().slice(0, 10);

const NE_ADMIN0 = join(CACHE, 'ne_50m_admin_0_countries.geojson');
const NE_ADMIN1 = join(CACHE, 'ne_10m_admin_1.geojson');

/** Tea-region catalogue: OSM highlight where the place is finer than admin-1. */
const REGIONS = [
  {
    id: 'xi-hu',
    country: 'China',
    admin: 'Xihu District, Hangzhou, Zhejiang',
    adminLevel: 'district',
    osm: ['R4591410'],
    focus: { name: 'Longjing village', lat: 30.2218656, lng: 120.098065 },
  },
  {
    id: 'anxi',
    country: 'China',
    admin: 'Anxi County, Quanzhou, Fujian',
    adminLevel: 'county',
    osm: ['R2666979'],
    focus: { name: 'Anxi (inner-Anxi hills)', lat: 25.1424227, lng: 117.905457 },
  },
  {
    id: 'wuyi',
    country: 'China',
    admin: 'Wuyishan, Nanping, Fujian',
    adminLevel: 'county-level city',
    osm: ['R3206298'],
    focus: { name: 'Wuyishan', lat: 27.7590448, lng: 118.0297688 },
  },
  {
    id: 'phoenix-mountain',
    country: 'China',
    admin: "Fenghuang Town, Chao'an, Chaozhou, Guangdong",
    adminLevel: 'town',
    osm: ['R12284895'],
    focus: { name: 'Phoenix Mountain', lat: 23.9062104, lng: 116.6984239 },
  },
  {
    id: 'yunnan',
    country: 'China',
    admin: 'Yunnan Province',
    adminLevel: 'province',
    admin1: 'Yunnan',
    osm: ['R913094'],
    focus: { name: "Pu'er (Simao)", lat: 22.777, lng: 100.972 },
  },
  {
    id: 'fujian',
    country: 'China',
    admin: 'Fujian Province',
    adminLevel: 'province',
    admin1: 'Fujian',
    osm: ['R553303'],
    focus: { name: 'Fuding (white-tea coast)', lat: 27.3279195, lng: 120.2125652 },
  },
  {
    id: 'huangshan',
    country: 'China',
    admin: 'Huangshan, Anhui',
    adminLevel: 'prefecture-level city',
    osm: ['R2992498'],
    focus: { name: 'Huangshan (Yellow Mountain)', lat: 30.14, lng: 118.167 },
  },
  {
    id: 'uji',
    country: 'Japan',
    admin: 'Uji, Kyoto Prefecture',
    adminLevel: 'city',
    osm: ['R358602'],
    focus: { name: 'Uji', lat: 34.885124, lng: 135.7995651 },
  },
  {
    id: 'shizuoka',
    country: 'Japan',
    admin: 'Shizuoka Prefecture',
    adminLevel: 'prefecture',
    admin1: 'Shizuoka',
    osm: ['R3793581'],
    focus: { name: 'Makinohara plateau', lat: 34.748, lng: 138.187 },
  },
  {
    id: 'kagoshima',
    country: 'Japan',
    admin: 'Kagoshima Prefecture',
    adminLevel: 'prefecture',
    admin1: 'Kagoshima',
    osm: ['R1842186'],
    focus: { name: 'Chiran', lat: 31.378, lng: 130.441 },
  },
  {
    id: 'yame',
    country: 'Japan',
    admin: 'Yame, Fukuoka Prefecture',
    adminLevel: 'city',
    osm: ['R4008438'],
    focus: { name: 'Yame', lat: 33.2116721, lng: 130.5579706 },
  },
  {
    id: 'sayama',
    country: 'Japan',
    admin: 'Iruma and Sayama, Saitama Prefecture',
    adminLevel: 'cities',
    osm: ['R1768272', 'R1768277'],
    focus: { name: 'Iruma (Sayama-cha)', lat: 35.8358142, lng: 139.3909293 },
  },
  {
    id: 'nantou',
    country: 'Taiwan',
    admin: 'Nantou County',
    adminLevel: 'county',
    admin1: 'Nantou',
    osm: ['R2497975'],
    focus: { name: 'Lugu (Dong Ding)', lat: 23.74585, lng: 120.7535833 },
  },
  {
    id: 'alishan',
    country: 'Taiwan',
    admin: 'Alishan Township, Chiayi County',
    adminLevel: 'township',
    osm: ['R2790541'],
    focus: { name: 'Alishan', lat: 23.5150347, lng: 120.8097545 },
  },
  {
    id: 'li-shan',
    country: 'Taiwan',
    admin: 'Lishan Village, Heping District, Taichung',
    adminLevel: 'village',
    osm: ['R3373167'],
    focus: { name: 'Lishan', lat: 24.255, lng: 121.251 },
  },
  {
    id: 'wenshan',
    country: 'Taiwan',
    admin: 'Pinglin District, New Taipei',
    adminLevel: 'district',
    osm: ['R2922120'],
    focus: { name: 'Pinglin', lat: 24.937388, lng: 121.711185 },
  },
];

const ADM0 = { China: 'CHN', Japan: 'JPN', Taiwan: 'TWN' };

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchJson(url, { retries = 5 } = {}) {
  let last;
  for (let i = 0; i < retries; i += 1) {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
    if (res.ok) return res.json();
    last = new Error(`${res.status} ${res.statusText} for ${url}`);
    if (res.status !== 429 && res.status < 500) throw last;
    await sleep(1000 * 2 ** i);
  }
  throw last;
}

function ringBBox(ring, bbox = [Infinity, Infinity, -Infinity, -Infinity]) {
  for (const [x, y] of ring) {
    if (x < bbox[0]) bbox[0] = x;
    if (y < bbox[1]) bbox[1] = y;
    if (x > bbox[2]) bbox[2] = x;
    if (y > bbox[3]) bbox[3] = y;
  }
  return bbox;
}

function geomBBox(geom, bbox = [Infinity, Infinity, -Infinity, -Infinity]) {
  if (!geom) return bbox;
  if (geom.type === 'Polygon') {
    for (const ring of geom.coordinates) ringBBox(ring, bbox);
  } else if (geom.type === 'MultiPolygon') {
    for (const poly of geom.coordinates) for (const ring of poly) ringBBox(ring, bbox);
  }
  return bbox;
}

function dist(a, b) {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  return Math.hypot(dx, dy);
}

function perpendicularDistance(p, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return dist(p, a);
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2));
  return dist(p, [a[0] + t * dx, a[1] + t * dy]);
}

function rdp(points, epsilon) {
  if (points.length <= 2) return points;
  let maxD = 0;
  let idx = 0;
  const end = points.length - 1;
  for (let i = 1; i < end; i += 1) {
    const d = perpendicularDistance(points[i], points[0], points[end]);
    if (d > maxD) {
      maxD = d;
      idx = i;
    }
  }
  if (maxD > epsilon) {
    const left = rdp(points.slice(0, idx + 1), epsilon);
    const right = rdp(points.slice(idx), epsilon);
    return left.slice(0, -1).concat(right);
  }
  return [points[0], points[end]];
}

function simplifyRing(ring, epsilon) {
  if (ring.length < 4) return ring;
  const closed =
    ring.length > 1 && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1];
  const open = closed ? ring.slice(0, -1) : ring.slice();
  const simple = rdp(open, epsilon);
  if (simple.length < 3) return ring;
  if (closed) simple.push(simple[0]);
  return simple;
}

function ringArea(ring) {
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    a += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
  }
  return a / 2;
}

function simplifyGeom(geom, epsilon) {
  if (!geom) return geom;
  const minHole = epsilon * epsilon * 40;
  if (geom.type === 'Polygon') {
    const rings = geom.coordinates
      .map((ring, i) => simplifyRing(ring, epsilon))
      .filter((ring, i) => i === 0 || Math.abs(ringArea(ring)) > minHole);
    return { type: 'Polygon', coordinates: rings };
  }
  if (geom.type === 'MultiPolygon') {
    const polys = geom.coordinates
      .map((poly) =>
        poly
          .map((ring, i) => simplifyRing(ring, epsilon))
          .filter((ring, i) => i === 0 || Math.abs(ringArea(ring)) > minHole),
      )
      .filter((poly) => poly[0] && poly[0].length >= 4);
    if (polys.length === 1) return { type: 'Polygon', coordinates: polys[0] };
    return { type: 'MultiPolygon', coordinates: polys };
  }
  return geom;
}

function roundGeom(geom, places = 5) {
  const r = (n) => Number(n.toFixed(places));
  const mapRing = (ring) => ring.map(([x, y]) => [r(x), r(y)]);
  if (geom.type === 'Polygon') return { type: 'Polygon', coordinates: geom.coordinates.map(mapRing) };
  if (geom.type === 'MultiPolygon') {
    return { type: 'MultiPolygon', coordinates: geom.coordinates.map((p) => p.map(mapRing)) };
  }
  return geom;
}

function mergeGeoms(geoms) {
  const polys = [];
  for (const g of geoms) {
    if (!g) continue;
    if (g.type === 'Polygon') polys.push(g.coordinates);
    else if (g.type === 'MultiPolygon') polys.push(...g.coordinates);
  }
  if (polys.length === 1) return { type: 'Polygon', coordinates: polys[0] };
  return { type: 'MultiPolygon', coordinates: polys };
}

function pointInRing(lng, lat, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const intersect = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi + 0.0) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function pointInGeom(lng, lat, geom) {
  const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;
  for (const poly of polys) {
    if (!pointInRing(lng, lat, poly[0])) continue;
    let hole = false;
    for (let i = 1; i < poly.length; i += 1) {
      if (pointInRing(lng, lat, poly[i])) hole = true;
    }
    if (!hole) return true;
  }
  return false;
}

function vertexCount(geom) {
  if (!geom) return 0;
  if (geom.type === 'Polygon') return geom.coordinates.reduce((n, r) => n + r.length, 0);
  if (geom.type === 'MultiPolygon') return geom.coordinates.reduce((n, p) => n + p.reduce((m, r) => m + r.length, 0), 0);
  return 0;
}

function adaptiveSimplify(geom, { minEpsilon = 0.0004, maxEpsilon = 0.02, target = 1800 }) {
  if (vertexCount(geom) <= target) return simplifyGeom(geom, minEpsilon);
  let lo = minEpsilon;
  let hi = maxEpsilon;
  let best = simplifyGeom(geom, hi);
  for (let i = 0; i < 8; i += 1) {
    const mid = (lo + hi) / 2;
    const next = simplifyGeom(geom, mid);
    if (vertexCount(next) > target) lo = mid;
    else {
      hi = mid;
      best = next;
    }
  }
  return best;
}

async function lookupOsm(osmIds) {
  const cachePath = join(CACHE, `osm-${osmIds.join('_')}.json`);
  try {
    const cached = JSON.parse(readFileSync(cachePath, 'utf8'));
    if (cached?.type) return cached;
  } catch {
    // network
  }
  const url = new URL('https://nominatim.openstreetmap.org/lookup');
  url.searchParams.set('osm_ids', osmIds.join(','));
  url.searchParams.set('format', 'geojson');
  url.searchParams.set('polygon_geojson', '1');
  const gj = await fetchJson(url);
  const geoms = (gj.features || []).map((f) => f.geometry).filter(Boolean);
  if (!geoms.length) throw new Error(`No geometry for ${osmIds.join(',')}`);
  const merged = mergeGeoms(geoms);
  mkdirSync(CACHE, { recursive: true });
  writeFileSync(cachePath, JSON.stringify(merged));
  return merged;
}

async function elevationRange(geom, focus) {
  const bbox = geomBBox(geom);
  const span = Math.max(bbox[2] - bbox[0], bbox[3] - bbox[1]);
  // Large prefectures (Kagoshima’s islands, Yunnan) would otherwise report
  // ocean or Himalayan outliers. Sample the tea-side neighbourhood instead.
  const half = span > 1.5 ? Math.min(0.7, span / 6) : span;
  const window = [
    Math.max(bbox[0], focus.lng - half),
    Math.max(bbox[1], focus.lat - half),
    Math.min(bbox[2], focus.lng + half),
    Math.min(bbox[3], focus.lat + half),
  ];
  const lats = [focus.lat];
  const lngs = [focus.lng];
  const steps = 10;
  for (let i = 0; i <= steps; i += 1) {
    for (let j = 0; j <= steps; j += 1) {
      const lng = window[0] + ((window[2] - window[0]) * i) / steps;
      const lat = window[1] + ((window[3] - window[1]) * j) / steps;
      if (!pointInGeom(lng, lat, geom)) continue;
      lats.push(Number(lat.toFixed(5)));
      lngs.push(Number(lng.toFixed(5)));
    }
  }
  const max = 80;
  const slats = lats.slice(0, max);
  const slngs = lngs.slice(0, max);
  const url = `https://api.open-meteo.com/v1/elevation?latitude=${slats.join(',')}&longitude=${slngs.join(',')}`;
  const data = await fetchJson(url);
  const elev = (data.elevation || []).filter((n) => Number.isFinite(n));
  if (!elev.length) return { focusM: null, minM: null, maxM: null, source: 'Copernicus DEM via Open-Meteo' };
  const interior = elev.slice(1);
  const range = interior.length ? [...interior, elev[0]] : elev;
  return {
    focusM: Math.round(elev[0]),
    minM: Math.round(Math.min(...range)),
    maxM: Math.round(Math.max(...range)),
    source: 'Copernicus DEM via Open-Meteo',
  };
}

const countriesGj = JSON.parse(readFileSync(NE_ADMIN0, 'utf8'));
const admin1Gj = JSON.parse(readFileSync(NE_ADMIN1, 'utf8'));

const countries = {
  type: 'FeatureCollection',
  attribution: 'Made with Natural Earth. Free vector and raster map data @ naturalearthdata.com.',
  retrieved: RETRIEVED,
  features: countriesGj.features
    .filter((f) => ['CHN', 'JPN', 'TWN'].includes(f.properties.ADM0_A3))
    .map((f) => ({
      type: 'Feature',
      properties: { id: f.properties.ADM0_A3, name: f.properties.NAME },
      geometry: roundGeom(adaptiveSimplify(f.geometry, { minEpsilon: 0.008, maxEpsilon: 0.04, target: 2500 }), 4),
    })),
};

const admin1 = {
  type: 'FeatureCollection',
  attribution: 'Made with Natural Earth. Free vector and raster map data @ naturalearthdata.com.',
  retrieved: RETRIEVED,
  features: admin1Gj.features
    .filter((f) => ['CHN', 'JPN', 'TWN'].includes(f.properties.adm0_a3) && f.properties.name !== 'Paracel Islands')
    .map((f) => ({
      type: 'Feature',
      properties: {
        name: f.properties.name,
        nameEn: f.properties.name_en || f.properties.name,
        adm0: f.properties.adm0_a3,
      },
      geometry: roundGeom(adaptiveSimplify(f.geometry, { minEpsilon: 0.004, maxEpsilon: 0.03, target: 900 }), 4),
    })),
};

function admin1Geom(adm0, name) {
  const f = admin1.features.find((feat) => feat.properties.adm0 === adm0 && feat.properties.name === name);
  if (!f) throw new Error(`Missing admin-1 ${adm0} ${name}`);
  return f.geometry;
}

const regions = {};

console.log('Fetching OSM polygons and elevation…');
for (const spec of REGIONS) {
  const adm0 = ADM0[spec.country];
  let geometry;
  let source;
  if (spec.osm) {
    console.log('  OSM', spec.id, spec.osm.join(','));
    const cachePath = join(CACHE, `osm-${spec.osm.join('_')}.json`);
    let cached = false;
    try {
      readFileSync(cachePath);
      cached = true;
    } catch {
      cached = false;
    }
    geometry = await lookupOsm(spec.osm);
    geometry = roundGeom(adaptiveSimplify(geometry, { minEpsilon: 0.00025, maxEpsilon: 0.01, target: 1600 }), 5);
    source = {
      name: 'OpenStreetMap',
      osm: spec.osm,
    };
    if (!cached) await sleep(1100);
  } else {
    console.log('  NE admin-1', spec.id, spec.admin1);
    geometry = admin1Geom(adm0, spec.admin1);
    source = { name: 'Natural Earth 10m admin-1', admin1: spec.admin1 };
  }

  const elev = await elevationRange(geometry, spec.focus);
  await sleep(800);

  const bbox = geomBBox(geometry).map((n) => Number(n.toFixed(5)));
  regions[spec.id] = {
    id: spec.id,
    country: spec.country,
    adm0,
    admin: spec.admin,
    adminLevel: spec.adminLevel,
    admin1: spec.admin1 ?? null,
    focus: spec.focus,
    bbox,
    elevation: elev,
    source,
    geometry,
  };
  console.log(
    `    ${spec.id}: ${vertexCount(geometry)} verts, elev ${elev.minM}–${elev.maxM} m (focus ${elev.focusM} m)`,
  );
}

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'countries.json'), JSON.stringify(countries));
writeFileSync(join(OUT, 'admin1.json'), JSON.stringify(admin1));
writeFileSync(
  join(OUT, 'regions.json'),
  JSON.stringify({
    attribution:
      'Highlighted tea-region boundaries from OpenStreetMap (ODbL). Provincial context and country silhouettes from Natural Earth (public domain). Elevation from Copernicus DEM via Open-Meteo.',
    retrieved: RETRIEVED,
    regions,
  }),
);

const size = (name) => (readFileSync(join(OUT, name)).length / 1024).toFixed(1);
console.log('Wrote', OUT);
console.log('  countries.json', size('countries.json'), 'KB');
console.log('  admin1.json', size('admin1.json'), 'KB');
console.log('  regions.json', size('regions.json'), 'KB');

/**
 * Fetch OSM + elevation for region ids missing from src/data/geo/regions.json.
 * Does not rebuild Natural Earth silhouettes.
 *
 *   node scripts/append-region-geo.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'src/data/geo/regions.json');
const CACHE = '/tmp/geo-src';
const UA = 'fourthsteep-atlas/0.1 (https://www.topeki.com/fourthsteep/; geo append)';

const NEW_REGIONS = [
  {
    id: 'dongting',
    country: 'China',
    admin: 'Dongshan Town, Wuzhong, Suzhou, Jiangsu',
    adminLevel: 'town',
    osm: ['R7760656'],
    focus: { name: 'Dongshan (Taihu)', lat: 31.087112, lng: 120.4017347 },
  },
  {
    id: 'junshan',
    country: 'China',
    admin: 'Junshan District, Yueyang, Hunan',
    adminLevel: 'district',
    osm: ['R4483938'],
    focus: { name: 'Junshan Island', lat: 29.431, lng: 113.006 },
  },
  {
    id: 'qimen',
    country: 'China',
    admin: 'Qimen County, Huangshan, Anhui',
    adminLevel: 'county',
    osm: ['R2992493'],
    focus: { name: 'Qimen', lat: 29.8573141, lng: 117.710248 },
  },
  {
    id: 'mengding',
    country: 'China',
    admin: 'Mingshan District, Ya’an, Sichuan',
    adminLevel: 'district',
    osm: ['R2789726'],
    focus: { name: 'Mengding Mountain', lat: 30.0839973, lng: 103.0459664 },
  },
  {
    id: 'wuzhou',
    country: 'China',
    admin: 'Wuzhou, Guangxi',
    adminLevel: 'prefecture-level city',
    osm: ['R2044154'],
    focus: { name: 'Wuzhou', lat: 23.478767, lng: 111.277099 },
  },
  {
    id: 'anhua',
    country: 'China',
    admin: 'Anhua County, Yiyang, Hunan',
    adminLevel: 'county',
    osm: ['R3202587'],
    focus: { name: 'Anhua', lat: 28.3031394, lng: 111.402883 },
  },
  {
    id: 'anji',
    country: 'China',
    admin: 'Anji County, Huzhou, Zhejiang',
    adminLevel: 'county',
    osm: ['R3149729'],
    focus: { name: 'Anji', lat: 30.6383107, lng: 119.6755006 },
  },
  {
    id: 'luan',
    country: 'China',
    admin: 'Lu’an, Anhui',
    adminLevel: 'prefecture-level city',
    osm: ['R3243393'],
    focus: { name: 'Lu’an', lat: 31.7383487, lng: 116.5142252 },
  },
  {
    id: 'enshi',
    country: 'China',
    admin: 'Enshi Tujia and Miao Autonomous Prefecture, Hubei',
    adminLevel: 'prefecture',
    osm: ['R2984075'],
    focus: { name: 'Enshi', lat: 30.2722, lng: 109.4882 },
  },
  {
    id: 'huoshan',
    country: 'China',
    admin: 'Huoshan County, Lu’an, Anhui',
    adminLevel: 'county',
    osm: ['R3243387'],
    focus: { name: 'Huoshan', lat: 31.3928, lng: 116.3329 },
  },
  {
    id: 'tokushima',
    country: 'Japan',
    admin: 'Tokushima Prefecture',
    adminLevel: 'prefecture',
    admin1: 'Tokushima',
    osm: ['R3795000'],
    focus: { name: 'Kamikatsu (Awa bancha)', lat: 33.889, lng: 134.402 },
  },
  {
    id: 'zhangping',
    country: 'China',
    admin: 'Zhangping, Longyan, Fujian',
    adminLevel: 'county-level city',
    osm: ['R3144723'],
    focus: { name: 'Zhangping', lat: 25.2916, lng: 117.4199 },
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
  if (geom.type === 'Polygon') for (const ring of geom.coordinates) ringBBox(ring, bbox);
  else if (geom.type === 'MultiPolygon') for (const poly of geom.coordinates) for (const ring of poly) ringBBox(ring, bbox);
  return bbox;
}

function dist(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
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
  const closed = ring.length > 1 && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1];
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
        poly.map((ring, i) => simplifyRing(ring, epsilon)).filter((ring, i) => i === 0 || Math.abs(ringArea(ring)) > minHole),
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

const bundle = JSON.parse(readFileSync(OUT, 'utf8'));
mkdirSync(CACHE, { recursive: true });

for (const spec of NEW_REGIONS) {
  if (bundle.regions[spec.id]) {
    console.log('skip existing', spec.id);
    continue;
  }
  console.log('OSM', spec.id, spec.osm.join(','));
  let geometry = await lookupOsm(spec.osm);
  geometry = roundGeom(adaptiveSimplify(geometry, { minEpsilon: 0.00025, maxEpsilon: 0.01, target: 1600 }), 5);
  await sleep(1100);
  const elev = await elevationRange(geometry, spec.focus);
  await sleep(800);
  const bbox = geomBBox(geometry).map((n) => Number(n.toFixed(5)));
  bundle.regions[spec.id] = {
    id: spec.id,
    country: spec.country,
    adm0: ADM0[spec.country],
    admin: spec.admin,
    adminLevel: spec.adminLevel,
    admin1: spec.admin1 ?? null,
    focus: spec.focus,
    bbox,
    elevation: elev,
    source: { name: 'OpenStreetMap', osm: spec.osm },
    geometry,
  };
  console.log(`  ${spec.id}: ${vertexCount(geometry)} verts, elev ${elev.minM}–${elev.maxM} m`);
}

writeFileSync(OUT, JSON.stringify(bundle));
console.log('Wrote', OUT, (readFileSync(OUT).length / 1024).toFixed(1), 'KB');

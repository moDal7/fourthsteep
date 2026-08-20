import regionsData from '../data/geo/regions.json' with { type: 'json' };
import admin1Data from '../data/geo/admin1.json' with { type: 'json' };
import countriesData from '../data/geo/countries.json' with { type: 'json' };

export const geoAttribution = regionsData.attribution;

const MAX_LAT = 85.05112878;

export function getRegionGeo(id) {
  return regionsData.regions[id] ?? null;
}

export function allRegionGeo() {
  return Object.values(regionsData.regions);
}

function mercator(lng, lat) {
  const λ = (lng * Math.PI) / 180;
  const φ = (Math.max(-MAX_LAT, Math.min(MAX_LAT, lat)) * Math.PI) / 180;
  return [λ, Math.log(Math.tan(Math.PI / 4 + φ / 2))];
}

function geomBBox(geom, bbox = [Infinity, Infinity, -Infinity, -Infinity]) {
  const visit = (ring) => {
    for (const [x, y] of ring) {
      if (x < bbox[0]) bbox[0] = x;
      if (y < bbox[1]) bbox[1] = y;
      if (x > bbox[2]) bbox[2] = x;
      if (y > bbox[3]) bbox[3] = y;
    }
  };
  if (geom.type === 'Polygon') geom.coordinates.forEach(visit);
  else if (geom.type === 'MultiPolygon') geom.coordinates.forEach((p) => p.forEach(visit));
  return bbox;
}

function featureBBox(feature) {
  return geomBBox(feature.geometry);
}

function bboxesOverlap(a, b) {
  return a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1];
}

function expandBbox(bbox, { minSpan = 1.15, padRatio = 0.32 } = {}) {
  let [w, s, e, n] = bbox;
  const lngPad = Math.max((e - w) * padRatio, (minSpan - (e - w)) / 2);
  const latPad = Math.max((n - s) * padRatio, (minSpan - (n - s)) / 2);
  return [w - lngPad, s - latPad, e + lngPad, n + latPad];
}

function mercatorBBox(bbox) {
  const corners = [
    mercator(bbox[0], bbox[1]),
    mercator(bbox[0], bbox[3]),
    mercator(bbox[2], bbox[1]),
    mercator(bbox[2], bbox[3]),
  ];
  return [
    Math.min(...corners.map((p) => p[0])),
    Math.min(...corners.map((p) => p[1])),
    Math.max(...corners.map((p) => p[0])),
    Math.max(...corners.map((p) => p[1])),
  ];
}

function makeProjector(geoBbox, width, height, padding) {
  const [x0, y0, x1, y1] = mercatorBBox(geoBbox);
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;
  const scale = Math.min(innerW / Math.max(x1 - x0, 1e-9), innerH / Math.max(y1 - y0, 1e-9));
  const ox = padding + (innerW - (x1 - x0) * scale) / 2;
  const oy = padding + (innerH - (y1 - y0) * scale) / 2;
  return (lng, lat) => {
    const [x, y] = mercator(lng, lat);
    return [ox + (x - x0) * scale, oy + (y1 - y) * scale];
  };
}

function ringPath(ring, project) {
  if (!ring || ring.length < 2) return '';
  let d = '';
  for (let i = 0; i < ring.length; i += 1) {
    const [x, y] = project(ring[i][0], ring[i][1]);
    d += `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return `${d}Z`;
}

export function geomToPath(geom, project) {
  if (!geom) return '';
  const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;
  return polys.map((poly) => poly.map((ring) => ringPath(ring, project)).join('')).join('');
}

function countryFeature(adm0) {
  return countriesData.features.find((f) => f.properties.id === adm0);
}

function admin1InView(adm0, view) {
  return admin1Data.features.filter((f) => f.properties.adm0 === adm0 && bboxesOverlap(featureBBox(f), view));
}

const SCALE_STEPS = [5, 10, 20, 25, 50, 100, 200, 250, 500, 1000];

function scaleBar(view, project, height) {
  const midLat = (view[1] + view[3]) / 2;
  const kmPerDeg = 111.32 * Math.cos((midLat * Math.PI) / 180);
  const kmWidth = Math.max((view[2] - view[0]) * kmPerDeg, 1);
  const target = kmWidth * 0.2;
  const km = SCALE_STEPS.reduce((best, n) => (Math.abs(n - target) < Math.abs(best - target) ? n : best));
  const lat = (view[1] + view[3]) / 2;
  const lng0 = (view[0] + view[2]) / 2;
  const dLng = km / kmPerDeg;
  const a = project(lng0, lat);
  const b = project(lng0 + dLng, lat);
  return {
    x: 22,
    y: height - 24,
    width: Math.max(Math.abs(b[0] - a[0]), 8),
    label: km >= 1000 ? `${km / 1000} km` : `${km} km`,
  };
}

function insetRect(view, project) {
  const corners = [
    project(view[0], view[1]),
    project(view[0], view[3]),
    project(view[2], view[1]),
    project(view[2], view[3]),
  ];
  const xs = corners.map((p) => p[0]);
  const ys = corners.map((p) => p[1]);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}

export function formatCoords(lat, lng) {
  const ns = lat >= 0 ? 'N' : 'S';
  const ew = lng >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(4)}°${ns} ${Math.abs(lng).toFixed(4)}°${ew}`;
}

export function formatElevation(elevation) {
  if (!elevation || elevation.focusM == null) return null;
  const { focusM, minM, maxM } = elevation;
  if (minM == null || maxM == null || minM === maxM) return `${focusM} m`;
  if (maxM - minM < 40) return `${focusM} m`;
  return `${focusM} m · ${minM}–${maxM} m in the mapped area`;
}

export function osmUrl(source) {
  const id = source?.osm?.[0];
  if (!id) return null;
  const type = id.startsWith('R') ? 'relation' : id.startsWith('W') ? 'way' : 'node';
  return `https://www.openstreetmap.org/${type}/${id.slice(1)}`;
}

/**
 * Build a render model for one tea region. SVG paths are computed at build
 * time from WGS84 polygons (Web Mercator), so the page ships no map library.
 */
export function buildRegionMap(regionId, { mode = 'detail', width, height } = {}) {
  const region = getRegionGeo(regionId);
  if (!region) return null;
  const country = countryFeature(region.adm0);
  const countryBbox = geomBBox(country.geometry);

  if (mode === 'card') {
    const w = width ?? 320;
    const h = height ?? 200;
    const project = makeProjector(countryBbox, w, h, 10);
    const highlight = geomToPath(region.geometry, project);
    const [mx, my] = project(region.focus.lng, region.focus.lat);
    return {
      mode,
      width: w,
      height: h,
      land: geomToPath(country.geometry, project),
      highlight,
      marker: { x: mx, y: my },
      label: region.focus.name,
    };
  }

  const w = width ?? 840;
  const h = height ?? 520;
  const view = expandBbox(region.bbox, {
    minSpan: mode === 'detail' ? 1.2 : 1.05,
    padRatio: 0.34,
  });
  const project = makeProjector(view, w, h, 18);
  const land = admin1InView(region.adm0, view).map((f) => ({
    name: f.properties.name,
    d: geomToPath(f.geometry, project),
  }));
  const [mx, my] = project(region.focus.lng, region.focus.lat);

  const inset = {
    width: 148,
    height: 112,
    x: w - 148 - 16,
    y: 16,
  };
  const insetProject = makeProjector(countryBbox, inset.width, inset.height, 8);
  const locator = insetRect(view, insetProject);

  return {
    mode,
    width: w,
    height: h,
    view,
    land,
    country: geomToPath(country.geometry, project),
    highlight: geomToPath(region.geometry, project),
    marker: { x: mx, y: my, name: region.focus.name },
    scale: scaleBar(view, project, h),
    inset: {
      ...inset,
      land: geomToPath(country.geometry, insetProject),
      locator,
      mark: (() => {
        const p = insetProject(region.focus.lng, region.focus.lat);
        return { x: p[0], y: p[1] };
      })(),
    },
    facts: {
      focus: region.focus.name,
      coords: formatCoords(region.focus.lat, region.focus.lng),
      lat: region.focus.lat,
      lng: region.focus.lng,
      admin: region.admin,
      adminLevel: region.adminLevel,
      elevation: formatElevation(region.elevation),
      elevationRaw: region.elevation,
      osm: osmUrl(region.source),
      source: region.source.name,
    },
  };
}

export function buildOverviewMaps({ width = 340, height = 280 } = {}) {
  const byCountry = { China: 'CHN', Taiwan: 'TWN', Japan: 'JPN' };
  return Object.entries(byCountry).map(([country, adm0]) => {
    const land = countryFeature(adm0);
    const bbox = geomBBox(land.geometry);
    const project = makeProjector(bbox, width, height, 12);
    const regions = allRegionGeo()
      .filter((r) => r.adm0 === adm0)
      .map((r) => {
        const [x, y] = project(r.focus.lng, r.focus.lat);
        return {
          id: r.id,
          name: r.focus.name,
          admin: r.admin,
          highlight: geomToPath(r.geometry, project),
          marker: { x, y },
        };
      });
    return {
      country,
      width,
      height,
      land: geomToPath(land.geometry, project),
      regions,
    };
  });
}

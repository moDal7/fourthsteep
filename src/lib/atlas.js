export function parseRatio(ratio) {
  const m = String(ratio).trim().match(/^1\s*:\s*(\d+(?:\.\d+)?)$/);
  if (m) return Number(m[1]);
  const n = Number(ratio);
  return Number.isFinite(n) && n > 0 ? n : 20;
}

export const roastRank = {
  none: 0,
  light: 1,
  medium: 2,
  heavy: 3,
  charcoal: 4,
};

export const CATEGORY_ORDER = ['green', 'white', 'yellow', 'oolong', 'black', 'dark', 'scented'];

export function categoryLabel(cat) {
  const labels = {
    green: 'Green',
    white: 'White',
    yellow: 'Yellow',
    oolong: 'Oolong',
    black: 'Black',
    dark: 'Dark',
    scented: 'Scented',
  };
  return labels[cat] ?? cat;
}

export const processingVerbs = {
  pluck: { native: '采摘', romanization: 'cǎizhāi', label: 'Pluck' },
  shade: { native: '覆い', romanization: 'ōi', label: 'Shade' },
  wither: { native: '萎凋', romanization: 'wěidiāo', label: 'Wither' },
  shake: { native: '摇青 / 浪青', romanization: 'yáoqīng / làngqīng', label: 'Shake' },
  'kill-green': { native: '杀青', romanization: 'shāqīng', label: 'Kill-green' },
  roll: { native: '揉捻', romanization: 'róuniǎn', label: 'Roll' },
  yellow: { native: '闷黄', romanization: 'mènhuáng', label: 'Yellow' },
  oxidise: { native: '发酵', romanization: 'fājiào', label: 'Oxidise' },
  'pile-ferment': { native: '渥堆', romanization: 'wòduī', label: 'Pile-ferment' },
  dry: { native: '干燥 / 晒青', romanization: 'gānzào / shàiqīng', label: 'Dry' },
  roast: { native: '焙火', romanization: 'bèihuǒ', label: 'Roast' },
  press: { native: '压制', romanization: 'yāzhì', label: 'Press' },
  scent: { native: '窨制', romanization: 'xūnzhì', label: 'Scent' },
  refine: { native: '精制 / 仕上げ', romanization: 'jīngzhì / shiage', label: 'Refine' },
  mill: { native: '碾', romanization: 'niǎn', label: 'Mill' },
  other: { native: '', romanization: '', label: 'Other' },
};

const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
const round = (n, places = 3) => Number(n.toFixed(places));

// Nudges applied after the oxidation curve, because two teas can share an
// oxidation number and still pour a different cup: puer is muddier than its
// oxidation suggests, white is paler and greyer than its.
const categoryShift = {
  green: { l: 0.015, c: 0, h: 5 },
  white: { l: 0.04, c: -0.022, h: -7 },
  yellow: { l: 0.005, c: 0.012, h: -5 },
  oolong: { l: 0, c: 0.012, h: 0 },
  black: { l: -0.035, c: 0.018, h: -5 },
  dark: { l: -0.14, c: -0.012, h: -11 },
  scented: { l: 0.02, c: 0.016, h: 7 },
};

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

/**
 * The colour of the brewed cup, in OKLCH components.
 *
 * Returned as three raw numbers rather than a colour string so the stylesheet
 * can derive the whole ramp (wash, deep, ink) from them and re-derive it per
 * theme — a dark page needs a lighter ink than a light page from the same cup.
 */
export function liquorPalette(tea = {}) {
  const { oxidation = 0, roast = 'none', category = 'oolong', id } = tea;
  const ox = clamp(Number(oxidation) || 0, 0, 100) / 100;
  const rank = roastRank[roast] ?? 0;
  const shift = categoryShift[category] ?? categoryShift.oolong;
  const country = tea.origin?.country ?? tea.country;

  let h = 120 - ox * 82;
  let l = 0.9 - ox * 0.34;
  let c = 0.068 + 0.085 * (1 - Math.abs(ox - 0.6) / 0.6);

  l -= rank * 0.052;
  h -= rank * 3.5;
  c *= 1 - rank * 0.05;

  l += shift.l;
  c += shift.c;
  h += shift.h;

  if (category === 'green' || category === 'scented') {
    if (country === 'Japan') {
      h += 17;
      c += 0.035;
    } else {
      h -= 13;
      c -= 0.004;
    }
  }

  if (id) {
    const n = hash(id);
    l += (n - 0.5) * 0.05;
    c += (n - 0.5) * 0.018;
    h += (n - 0.5) * 9;
  }

  return {
    l: round(clamp(l, 0.22, 0.94)),
    c: round(clamp(c, 0.02, 0.19)),
    h: round(((h % 360) + 360) % 360, 1),
  };
}

export function liquorStyle(tea) {
  const { l, c, h } = liquorPalette(tea);
  return `--lq-l: ${l}; --lq-c: ${c}; --lq-h: ${h}`;
}

export function teasForRegion(teas, regionId) {
  return teas.filter((t) => t.data.origin.regions.includes(regionId));
}

export function primaryRegionId(origin) {
  return origin.regions[0] ?? null;
}

export function originLabel(origin, regionById = new Map()) {
  const names = origin.regions.map((id) => regionById.get(id)?.data?.name ?? id);
  const joined = names.filter(Boolean).join(' · ');
  if (!joined) return origin.regionNote || '';
  if (origin.regionNote) return `${joined} · ${origin.regionNote}`;
  return joined;
}

export function regionMapFromCollection(regions) {
  return new Map(regions.map((r) => [r.id, r]));
}

export function isInfusion(brewing) {
  return brewing?.kind === 'infusion';
}

export function isSuspension(brewing) {
  return brewing?.kind === 'suspension';
}

/** Rinses first (unnumbered), then drinking infusions. Shared by table and timer. */
export function brewingSteps(gongfu) {
  const rinses = (gongfu.rinses ?? []).map((r) => ({
    kind: 'rinse',
    seconds: r.seconds,
    notes: r.notes,
  }));
  const infusions = (gongfu.infusions ?? []).map((inf) => ({
    kind: 'steep',
    n: inf.n,
    seconds: inf.seconds,
    notes: inf.notes,
  }));
  return [...rinses, ...infusions];
}

export function firstDrinkingSteep(gongfu) {
  return gongfu?.infusions?.[0] ?? null;
}

export function transformationIndex(tea) {
  return tea.transformation?.index ?? tea.oxidation ?? 0;
}

export function transformationKind(tea) {
  return tea.transformation?.kind ?? 'enzymatic';
}

export function atlasRecord(entry) {
  const { id, data } = entry;
  return {
    id,
    name: data.name,
    nameNative: data.nameNative,
    romanization: data.romanization,
    translation: data.translation,
    country: data.origin.country,
    regions: data.origin.regions,
    regionNote: data.origin.regionNote ?? null,
    category: data.category,
    oxidation: data.oxidation,
    transformation: data.transformation,
    roast: data.roast,
    summary: data.summary,
    subtype: data.subtype ?? null,
  };
}

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

// Stable small integer from a slug, so the jitter below is the same on every
// build and every page a tea appears on.
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
  // Accepts both the full entry (origin.country) and the flattened card props.
  const country = tea.origin?.country ?? tea.country;

  // Hue walks pale green-gold to red-brown as the leaf oxidises.
  let h = 120 - ox * 82;
  let l = 0.9 - ox * 0.34;
  // Chroma peaks in the oolong middle, where the cup is most saturated amber;
  // both the palest greens and the darkest blacks read closer to neutral.
  let c = 0.068 + 0.085 * (1 - Math.abs(ox - 0.6) / 0.6);

  // Fire darkens and reddens the cup, and charcoal mutes it.
  l -= rank * 0.052;
  h -= rank * 3.5;
  c *= 1 - rank * 0.05;

  l += shift.l;
  c += shift.c;
  h += shift.h;

  // Nineteen teas here sit at oxidation 0, but they do not pour the same cup:
  // Japanese steaming keeps the liquor vividly green, while Chinese pan-firing
  // sends it gold. Without this the whole green end of the atlas is one colour.
  if (category === 'green' || category === 'scented') {
    if (country === 'Japan') {
      h += 17;
      c += 0.035;
    } else {
      h -= 13;
      c -= 0.004;
    }
  }

  // A hair of deterministic variance keyed on the slug, so that teas which
  // genuinely do share every input still read as separate cups in the grid.
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

/** The palette as an inline `style` value; the stylesheet does the rest. */
export function liquorStyle(tea) {
  const { l, c, h } = liquorPalette(tea);
  return `--lq-l: ${l}; --lq-c: ${c}; --lq-h: ${h}`;
}

export const regionGroups = [
  {
    id: 'xi-hu',
    names: ['Xi Hu', 'Dongting', 'Anji', 'Hangzhou'],
  },
  {
    id: 'anxi',
    names: ['Anxi'],
  },
  {
    id: 'wuyi',
    names: ['Wuyi'],
  },
  {
    id: 'phoenix-mountain',
    names: ['Phoenix Mountain'],
  },
  {
    id: 'yunnan',
    names: ['Yunnan'],
  },
  {
    id: 'fujian',
    names: ['Fuding', 'Fujian', 'Fuzhou / Guangxi base'],
  },
  {
    id: 'uji',
    names: ['Uji', 'Uji / nationwide', 'Kyoto / nationwide'],
  },
  {
    id: 'shizuoka',
    names: ['Shizuoka'],
  },
  {
    id: 'kagoshima',
    names: ['Kagoshima / Shizuoka', 'Kagoshima'],
  },
  {
    id: 'yame',
    names: ['Yame', 'Yame / Mie / Shizuoka'],
  },
  {
    id: 'sayama',
    names: ['Sayama'],
  },
  {
    id: 'nantou',
    names: ['Nantou'],
  },
  {
    id: 'alishan',
    names: ['Alishan'],
  },
  {
    id: 'li-shan',
    names: ['Li Shan'],
  },
  {
    id: 'wenshan',
    names: ['Wenshan', 'Hsinchu / Miaoli'],
  },
  {
    id: 'huangshan',
    names: ['Huangshan', "Lu'an"],
  },
];

export function teasForRegion(teas, regionId) {
  const group = regionGroups.find((g) => g.id === regionId);
  if (!group) return [];
  return teas.filter((t) => group.names.some((n) => t.data.origin.region === n || t.data.origin.region.includes(n)));
}

/** Map a tea's origin.region string to a terroir page id, or null. */
export function regionIdForOrigin(regionName) {
  const name = String(regionName || '');
  const exact = regionGroups.find((g) => g.names.includes(name));
  if (exact) return exact.id;
  return (
    regionGroups.find((g) =>
      g.names.some((n) => name.startsWith(`${n} /`) || name.endsWith(` / ${n}`) || name.includes(` / ${n} /`)),
    )?.id ?? null
  );
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
    region: data.origin.region,
    category: data.category,
    oxidation: data.oxidation,
    roast: data.roast,
    summary: data.summary,
    japaneseType: data.japaneseType ?? null,
  };
}

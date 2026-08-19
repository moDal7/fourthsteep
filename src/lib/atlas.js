export function parseRatio(ratio) {
  const m = String(ratio).trim().match(/^1\s*:\s*(\d+(?:\.\d+)?)$/);
  if (m) return Number(m[1]);
  const n = Number(ratio);
  return Number.isFinite(n) && n > 0 ? n : 20;
}

export function oxidationTone(oxidation) {
  const hue = 85 - (oxidation / 100) * 70;
  return `hsl(${hue} 48% 38%)`;
}

export const roastRank = {
  none: 0,
  light: 1,
  medium: 2,
  heavy: 3,
  charcoal: 4,
};

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

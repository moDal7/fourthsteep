/**
 * One-shot schema migration. JSON under src/content/teas is the source of
 * truth after this runs — do not re-run generate-teas*.mjs.
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'content', 'teas');

const REGION = {
  'Xi Hu': { regions: ['xi-hu'] },
  Dongting: { regions: ['dongting'] },
  'Dongting Lake': { regions: ['junshan'] },
  Anji: { regions: ['anji'] },
  Hangzhou: { regions: ['xi-hu'] },
  Anxi: { regions: ['anxi'] },
  Wuyi: { regions: ['wuyi'] },
  'Phoenix Mountain': { regions: ['phoenix-mountain'] },
  Yunnan: { regions: ['yunnan'] },
  Fuding: { regions: ['fujian'] },
  Fujian: { regions: ['fujian'] },
  'Fuzhou / Guangxi base': { regions: ['fujian'], regionNote: 'Fuzhou scenting; Guangxi jasmine base' },
  Uji: { regions: ['uji'] },
  'Uji / nationwide': { regions: ['uji'], regionNote: 'nationwide packing from Uji lots and others' },
  'Kyoto / nationwide': { regions: ['uji'], regionNote: 'often packed nationwide from bancha or sencha' },
  Shizuoka: { regions: ['shizuoka'] },
  'Kagoshima / Shizuoka': { regions: ['kagoshima', 'shizuoka'] },
  Kagoshima: { regions: ['kagoshima'] },
  Yame: { regions: ['yame'] },
  'Yame / Mie / Shizuoka': { regions: ['yame', 'shizuoka'], regionNote: 'also Mie' },
  Sayama: { regions: ['sayama'] },
  Nantou: { regions: ['nantou'] },
  Alishan: { regions: ['alishan'] },
  'Li Shan': { regions: ['li-shan'] },
  Wenshan: { regions: ['wenshan'] },
  'Hsinchu / Miaoli': { regions: ['wenshan'], regionNote: 'Beipu and the Hsinchu–Miaoli hills' },
  Huangshan: { regions: ['huangshan'] },
  "Lu'an": { regions: ['luan'] },
  Qimen: { regions: ['qimen'] },
  Mengding: { regions: ['mengding'] },
  Wuzhou: { regions: ['wuzhou'] },
  'Hunan / Shaanxi': { regions: ['anhua'], regionNote: 'Anhua bricks; Jingyang (Shaanxi) is a sibling tradition' },
  nationwide: { regions: [], regionNote: 'nationwide — a style, not a garden' },
  Kyushu: { regions: ['kagoshima'], regionNote: 'Kyushu (Saga, Nagasaki, Kumamoto, Miyazaki as well as Kagoshima)' },
};

/** Infusion 1 is the rinse (discard), not a drinking steep. */
const RINSE_IS_N1 = {
  'da-hong-pao': { seconds: 10, notes: 'quick rinse; charcoal wakes on the first drinking steep' },
  'rou-gui': { seconds: 10, notes: 'quick rinse; yancha wants the charcoal wet before the first cup' },
  'shui-xian': { seconds: 12, notes: 'quick rinse to open the twist' },
  'sheng-puer-young': { seconds: 10, notes: 'quick rinse to wake the cake' },
  'sheng-puer-aged': { seconds: 15, notes: 'quick rinse; aged cakes still want a wash' },
  'shou-puer': { seconds: 10, notes: 'rinse is almost mandatory on young shou' },
  'liu-bao': { seconds: 15, notes: 'rinse the basket-aged leaf' },
};

/** Rinse duration lives in the old note; infusion 1 seconds stay as the first drink. */
const RINSE_IN_NOTE = {
  'long-jing': { seconds: 3, notes: 'optional 3s rinse' },
  'tie-guan-yin': { seconds: 5, notes: '5s rinse to open the beads' },
  'dong-ding': { seconds: 5, notes: 'rinse to open the ball' },
  'fu-zhuan': { seconds: 8, notes: 'rinse the brick; golden flowers do not need a long wash' },
};

const JAPANESE_CURVE =
  'Japanese greens go long–short–long: the first cool steep needs time, the second is quick because the leaf is open, the third lengthens again.';

const CURVE_EXCEPTION = {
  gyokuro: JAPANESE_CURVE,
  kabusecha: JAPANESE_CURVE,
  'sencha-asamushi': JAPANESE_CURVE,
  'sencha-fukamushi': JAPANESE_CURVE,
  shincha: JAPANESE_CURVE,
  tamaryokucha: JAPANESE_CURVE,
  kamairicha: JAPANESE_CURVE,
  tencha: JAPANESE_CURVE,
  hojicha: JAPANESE_CURVE,
  genmaicha: JAPANESE_CURVE,
  bancha: JAPANESE_CURVE,
  kukicha: JAPANESE_CURVE,
};

const ASSAMICA = new Set(['dian-hong', 'sheng-puer-young', 'sheng-puer-aged', 'shou-puer']);

function inferVerb(step, description) {
  const s = `${step} ${description}`.toLowerCase();
  if (/wo dui|渥堆|pile-ferment|golden flower|eurotium/.test(s)) return 'pile-ferment';
  if (/stone mill|碾|milled/.test(s)) return 'mill';
  if (/\bscent|jasmine|窨|osmanthus/.test(s)) return 'scent';
  if (/闷黄|yellowing|wrapped and held|men huang/.test(s)) return 'yellow';
  if (/shade|tana|jikagise|covered/.test(s) && !/mill/.test(s)) return 'shade';
  if (/pluck|harvest|bud only/.test(s) && /pluck|bud|pick/.test(step.toLowerCase())) return 'pluck';
  if (/^pluck/i.test(step)) return 'pluck';
  if (/wither/.test(s)) return 'wither';
  if (/shake|toss|lang qing|浪青|yaoqing|摇青/.test(s)) return 'shake';
  if (/kill-green|sha qing|杀青|steam and knead|pan-fir|wok sha/.test(s)) return 'kill-green';
  if (/^kill-green/i.test(step) || /^steam/i.test(step)) return 'kill-green';
  if (/\boxidis/.test(s) || /^oxid/i.test(step)) return 'oxidise';
  if (/sun dry|晒青|final dry|dried/.test(s) && !/roast|smoke/.test(s)) return 'dry';
  if (/^final dry/i.test(step) || /^sun dry/i.test(step) || /^dry/i.test(step)) return 'dry';
  if (/press|cake|brick|tuo|压制/.test(s) || /^press/i.test(step) || /steam and press/i.test(step)) return 'press';
  if (/roast|charcoal|pine smoke|焙火|hiire|fire-finish/.test(s) || /^roast/i.test(step)) return 'roast';
  if (/roll|knead|shap|flatten|bead|ball|twist|揉捻|sword/.test(s) || /^shap/i.test(step) || /^roll/i.test(step)) {
    return 'roll';
  }
  if (/refine|shiage|sort|cut|仕上げ/.test(s)) return 'refine';
  if (/storage|time:|age/.test(s)) return 'other';
  if (/base tea|maocha|same make|green base|optional brew/.test(s)) return 'other';
  return 'other';
}

function stripRinsePhrase(notes) {
  if (!notes) return undefined;
  const cleaned = notes
    .replace(/optional \d+s rinse;?\s*/i, '')
    .replace(/\d+s rinse to open beads;?\s*/i, '')
    .replace(/rinse to open the ball;?\s*/i, '')
    .replace(/quick rinse;?\s*/i, '')
    .replace(/quick rinse to wake the cake;?\s*/i, '')
    .replace(/rinse is almost mandatory on young shou;?\s*/i, '')
    .replace(/;\s*$/, '')
    .trim();
  return cleaned || undefined;
}

function renumber(infusions) {
  return infusions.map((inf, i) => ({
    n: i + 1,
    seconds: inf.seconds,
    ...(inf.notes ? { notes: inf.notes } : {}),
  }));
}

function migrateGongfu(id, gongfu) {
  let rinses;
  let infusions = gongfu.infusions.map((inf) => ({ ...inf }));

  if (RINSE_IS_N1[id] && infusions.length > 1) {
    rinses = [RINSE_IS_N1[id]];
    infusions = infusions.slice(1).map((inf) => ({
      ...inf,
      notes: stripRinsePhrase(inf.notes),
    }));
  } else if (RINSE_IN_NOTE[id]) {
    rinses = [RINSE_IN_NOTE[id]];
    infusions = infusions.map((inf, i) => ({
      ...inf,
      notes: i === 0 ? stripRinsePhrase(inf.notes) : inf.notes,
    }));
  }

  const next = {
    vessel: gongfu.vessel,
    ratio: gongfu.ratio,
    waterTemp: gongfu.waterTemp,
    ...(rinses ? { rinses } : {}),
    infusions: renumber(infusions),
  };
  if (CURVE_EXCEPTION[id]) next.curveException = CURVE_EXCEPTION[id];
  return next;
}

function ppmFor(tea, id) {
  if (id === 'long-jing') return [30, 80];
  if (tea.category === 'green' && tea.origin.country === 'Japan') return [30, 80];
  if (tea.category === 'green' || tea.category === 'scented' || tea.category === 'yellow') return [30, 80];
  if (tea.category === 'white') return [30, 100];
  if (tea.category === 'oolong' && (tea.roast === 'none' || tea.roast === 'light')) return [30, 90];
  if (tea.category === 'oolong') return [50, 150];
  if (tea.category === 'black') return [40, 150];
  if (tea.category === 'dark') return [50, 200];
  return [30, 80];
}

function tempCFor(tea) {
  if (tea.brewing?.gongfu?.waterTemp) return tea.brewing.gongfu.waterTemp;
  return 85;
}

function transformationFor(id, tea) {
  if (id === 'hojicha') {
    return {
      kind: 'roast',
      index: 55,
      note: 'Hojicha is a green tea that is brown. The cup is fire, not enzymatic oxidation.',
    };
  }
  if (id === 'genmaicha') {
    return {
      kind: 'roast',
      index: 35,
      note: 'The leaf is still a green tea; toasted rice and a medium fire colour the cup.',
    };
  }
  if (id === 'sheng-puer-young') {
    return {
      kind: 'none',
      index: 5,
      note: 'Kill-green then sun-dry. Not 渥堆. The dark class here is a filing, not a pile.',
    };
  }
  if (id === 'sheng-puer-aged') {
    return {
      kind: 'microbial',
      index: 55,
      note: 'Fifteen years of slow change after sha qing. Enzymatic oxidation is not the main part of it.',
    };
  }
  if (id === 'shou-puer') {
    return {
      kind: 'microbial',
      index: 85,
      note: '渥堆 — a wet microbial pile. One of the most transformed teas in the atlas, whatever the oxidation scalar says.',
    };
  }
  if (id === 'liu-bao') {
    return {
      kind: 'microbial',
      index: 70,
      note: 'Basket-aged Guangxi dark tea. Microbial, not a light oolong that happens to sit at 18.',
    };
  }
  if (id === 'fu-zhuan') {
    return {
      kind: 'microbial',
      index: 75,
      note: 'Golden flowers (Eurotium) on a dark-tea brick. The number on the old chart was not oxidation.',
    };
  }
  if (tea.oxidation === 0) return { kind: 'none', index: 0 };
  return { kind: 'enzymatic', index: tea.oxidation };
}

function shelfLifeFor(id, tea) {
  if (id === 'matcha' || id === 'tencha') {
    return { kind: 'drink-fresh', window: 'weeks once opened', note: 'Warm the sealed packet to room temperature before opening.' };
  }
  if (tea.origin.country === 'Japan' && tea.category === 'green' && id !== 'hojicha' && id !== 'bancha' && id !== 'genmaicha') {
    return { kind: 'drink-fresh', window: 'within months of harvest', note: 'Sealed, freezer then fridge, small portions.' };
  }
  if (id === 'hojicha' || id === 'bancha' || id === 'genmaicha') {
    return { kind: 'stable', window: 'within a year of roast or packing' };
  }
  if (tea.category === 'green' || tea.category === 'scented') {
    return { kind: 'drink-fresh', window: 'within 9 months of harvest' };
  }
  if (tea.category === 'oolong' && (tea.roast === 'none' || tea.roast === 'light') && tea.oxidation < 25) {
    return { kind: 'drink-fresh', window: 'within a year', note: 'Jade oolong is food. Refrigerate sealed.' };
  }
  if (tea.category === 'oolong') {
    return { kind: 'stable', window: 'improves for a while after roast', note: 'Some are deliberately re-roasted every few years.' };
  }
  if (tea.category === 'white') {
    return {
      kind: id === 'shou-mei' ? 'improves' : 'stable',
      window: id === 'bai-hao-yin-zhen' ? 'young for florals; years for honey' : 'cakes breathe if ageing is the point',
      note: 'Sealed if drinking fresh, breathable if ageing. Both are legitimate and they are different intentions.',
    };
  }
  if (tea.category === 'black') return { kind: 'stable', window: 'years in an airtight tin', note: 'Stable, not a project.' };
  if (tea.category === 'dark') {
    return {
      kind: 'improves',
      window: id === 'sheng-puer-young' ? 'a decade or more if the storage is honest' : 'continues to change',
      note: 'Most teas are food. A few teas are projects.',
    };
  }
  if (tea.category === 'yellow') return { kind: 'drink-fresh', window: 'within the harvest year' };
  return { kind: 'stable' };
}

function decoctionFor(id) {
  const dark = {
    when: 'after the gongfu session, or as a separate pot',
    minutes: [8, 20],
    notes: '煮茶 — simmer the spent leaf. Dark teas can take a boil; this is the extra cup the name 第四泡 points at.',
  };
  const roastGreen = {
    when: 'a kettle on the table, not a timed steep',
    minutes: [3, 8],
    notes: '煮茶 — hojicha and bancha are often simmered. The roast already did the work; heat just lifts it.',
  };
  if (['sheng-puer-aged', 'shou-puer', 'liu-bao', 'fu-zhuan'].includes(id)) return dark;
  if (id === 'hojicha' || id === 'bancha') return roastGreen;
  return undefined;
}

const KORIDASHI = {
  grams: 10,
  volume: 500,
  hours: 6,
  notes: '氷出し / kōridashi — ice on the leaf, melt, no kettle. A canonical Japanese cold brew, not a leftover trick.',
};

function coldBrewFor(id, existing) {
  if (existing) return existing;
  if (['gyokuro', 'kabusecha', 'sencha-fukamushi', 'shincha', 'tencha'].includes(id)) return KORIDASHI;
  if (id === 'sheng-puer-young') {
    return { grams: 8, volume: 500, hours: 8, notes: 'Young sheng goes surprisingly floral cold; bitterness drops.' };
  }
  return undefined;
}

function categoryExtras(id, tea) {
  if (tea.category === 'scented') {
    return {
      baseCategory: 'green',
      categoryNote: '花茶 is a treatment applied to a base tea. Jasmine pearls are a green tea that was scented — scented is not one of the six classes.',
    };
  }
  if (tea.category === 'black') {
    return {
      categoryNote: 'English black tea is 红茶, named for the liquor. Chinese 黑茶 is the post-fermented class this atlas files as dark.',
      glossaryRefs: ['hong-cha-hei-cha', 'oxidation'],
    };
  }
  if (tea.category === 'dark') {
    return {
      categoryNote: 'Chinese 黑茶, “black tea”, is not English black tea (红茶). Puer’s relationship to the dark class is contested; this atlas files it here by process.',
      glossaryRefs: ['hong-cha-hei-cha', 'oxidation', 'wo-dui'],
    };
  }
  return {};
}

const files = (await readdir(dir)).filter((f) => f.endsWith('.json')).sort();

for (const file of files) {
  const id = file.replace(/\.json$/, '');
  const tea = JSON.parse(await readFile(join(dir, file), 'utf8'));
  const originMap = REGION[tea.origin.region];
  if (!originMap) throw new Error(`${id}: unmapped region ${tea.origin.region}`);

  const extras = categoryExtras(id, tea);
  const trans = transformationFor(id, tea);

  let brewing;
  if (id === 'matcha') {
    brewing = {
      kind: 'suspension',
      variants: [
        {
          label: 'Usucha',
          nameNative: '薄茶',
          romanization: 'usucha',
          grams: 2,
          ml: 70,
          tempC: 75,
          method: 'whisk into foam',
        },
        {
          label: 'Koicha',
          nameNative: '濃茶',
          romanization: 'koicha',
          grams: 4,
          ml: 30,
          tempC: 70,
          method: 'knead slowly, no foam',
        },
      ],
    };
  } else {
    const decoction = decoctionFor(id);
    const coldBrew = coldBrewFor(id, tea.brewing.coldBrew);
    brewing = {
      kind: 'infusion',
      gongfu: migrateGongfu(id, tea.brewing.gongfu),
      western: tea.brewing.western,
      ...(coldBrew ? { coldBrew } : {}),
      ...(decoction ? { decoction } : {}),
    };
  }

  const out = {
    name: tea.name,
    nameNative: tea.nameNative,
    romanization: tea.romanization,
    translation: tea.translation,
    origin: {
      country: tea.origin.country,
      regions: originMap.regions,
      ...(originMap.regionNote ? { regionNote: originMap.regionNote } : {}),
      ...(tea.origin.subregion ? { subregion: tea.origin.subregion } : {}),
    },
    category: tea.category,
    ...(extras.baseCategory ? { baseCategory: extras.baseCategory } : {}),
    ...(extras.categoryNote ? { categoryNote: extras.categoryNote } : {}),
    ...(tea.japaneseType ? { subtype: tea.japaneseType } : {}),
    variety: ASSAMICA.has(id) ? 'assamica' : 'sinensis',
    cultivar: tea.cultivar,
    harvest: {
      window: tea.harvest.season,
    },
    pluckStandard: tea.harvest.pluckingStage,
    oxidation: tea.oxidation,
    roast: tea.roast,
    transformation: trans,
    processing: tea.processing.map((step) => ({
      verb: inferVerb(step.step, step.description),
      step: step.step,
      description: step.description,
    })),
    profile: tea.profile,
    brewing,
    water: {
      tdsPpm: ppmFor(tea, id),
      tempC: tempCFor(tea),
      note: typeof tea.water === 'string' ? tea.water : tea.water.note,
    },
    storage: tea.storage,
    shelfLife: shelfLifeFor(id, tea),
    qualityMarkers: tea.qualityMarkers.map((claim) => ({ claim })),
    commonFaults: tea.commonFaults.map((name) => ({ name })),
    similarTo: tea.similarTo,
    ...(extras.glossaryRefs ? { glossaryRefs: extras.glossaryRefs } : {}),
    summary: tea.summary,
  };

  await writeFile(join(dir, file), `${JSON.stringify(out, null, 2)}\n`);
}

console.log(`Migrated ${files.length} teas.`);

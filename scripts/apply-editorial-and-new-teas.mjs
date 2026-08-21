/**
 * HISTORICAL one-shot. Already applied on the content-honesty branch.
 * Do not re-run against a dirty teas directory — it would overwrite later edits.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const teaDir = join(root, 'src/content/teas');

function load(id) {
  return JSON.parse(readFileSync(join(teaDir, `${id}.json`), 'utf8'));
}

function save(id, data) {
  writeFileSync(join(teaDir, `${id}.json`), `${JSON.stringify(data, null, 2)}\n`);
}

function addRefs(data, ...ids) {
  data.glossaryRefs = [...new Set([...(data.glossaryRefs ?? []), ...ids])];
}

function addMarker(data, marker) {
  if (!data.qualityMarkers.some((m) => m.claim === marker.claim)) {
    data.qualityMarkers.unshift(marker);
  }
}

function swapSimilar(data, from, to) {
  data.similarTo = data.similarTo.map((id) => (id === from ? to : id));
}

const steep = (n, seconds, notes) => (notes ? { n, seconds, notes } : { n, seconds });
const western = (grams, volume, waterTemp, s1, s2) => ({
  grams,
  volume,
  waterTemp,
  infusions: s2 ? [steep(1, s1), steep(2, s2)] : [steep(1, s1)],
});

const FALSE_FRIEND =
  'English black tea is 红茶, named for the liquor. Chinese 黑茶 is the post-fermented class this atlas files as dark.';
const DARK_NOTE =
  'Chinese 黑茶, “black tea”, is not English black tea (红茶). Puer’s relationship to the dark class is contested; this atlas files it here by process.';
const WITHER_NOTE = 'White tea is withered and dried. Withering is the process — there is no kill-green.';
const ORTHODOX = {
  claim: 'orthodox leaf, not CTC',
  test: 'whole twisted leaf you can unfurl; grains from a cutter are a different tea',
};
const FOOD = 'Most teas are food. A few teas are projects.';

const jpCurve =
  'Japanese greens go long–short–long: the first cool steep needs time, the second is quick because the leaf is open, the third lengthens again.';

// --- existing teas -------------------------------------------------------

{
  const d = load('bai-hao-yin-zhen');
  d.processing = [
    { verb: 'pluck', step: 'Pluck', description: 'Only the fat, down-covered bud. No open leaf.' },
    {
      verb: 'wither',
      step: 'Wither',
      description: 'Long indoor/outdoor wither; the defining process of white tea, not a prelude to a wok.',
    },
    { verb: 'dry', step: 'Dry', description: 'Sun or low bake. No roll, no kill-green.' },
  ];
  d.categoryNote = WITHER_NOTE;
  addRefs(d, 'ye-di');
  save('bai-hao-yin-zhen', d);
}

{
  const d = load('bai-mu-dan');
  d.categoryNote = WITHER_NOTE;
  save('bai-mu-dan', d);
}

{
  const d = load('shou-mei');
  d.categoryNote = WITHER_NOTE;
  d.similarTo = ['gong-mei', 'shou-mei-aged', 'bai-mu-dan'];
  save('shou-mei', d);
}

{
  const d = load('bancha');
  d.processing = [
    {
      verb: 'kill-green',
      step: 'Steam',
      description: 'Steamed like sencha, often lighter rolling; some regional banchas are roasted or lactic-fermented and live on their own pages.',
    },
    { verb: 'roll', step: 'Roll and dry', description: 'Coarser leaf and stems; everyday Japanese green, not a failed sencha.' },
  ];
  save('bancha', d);
}

{
  const d = load('kukicha');
  d.processing = [
    {
      verb: 'refine',
      step: 'Sort',
      description: 'Stems sieved out during 仕上げ. Karigane is the shaded, sweeter subset. Not a shade step of its own.',
    },
  ];
  save('kukicha', d);
}

{
  const d = load('gyokuro');
  d.processing = [
    {
      verb: 'shade',
      step: 'Shade',
      description: 'Tana or jikagise covers starve the leaf of light; theanine stays, catechins drop.',
    },
    {
      verb: 'kill-green',
      step: 'Steam',
      description: '蒸青 — the same halt as sencha, finer and cooler.',
    },
    {
      verb: 'roll',
      step: 'Knead',
      description: '揉捻 into needles. This is the fork with tencha and matcha, which are never rolled.',
    },
  ];
  addRefs(d, 'ichibancha', 'mushi');
  save('gyokuro', d);
}

{
  const d = load('matcha');
  d.pluckStandard = 'same shaded leaf as gyokuro, destemmed and deveined';
  d.processing = [
    {
      verb: 'shade',
      step: 'Shade and steam',
      description: 'Like gyokuro, then dried without rolling — that unswept leaf is tencha.',
    },
    {
      verb: 'kill-green',
      step: 'Steam',
      description: '蒸青, then the leaf is dried as flakes. No 揉捻.',
    },
    {
      verb: 'mill',
      step: 'Stone mill',
      description:
        'Tencha ground to matcha. The term “ceremonial grade” has no legal or industry definition in Japan or anywhere else — it is export marketing. Leaf grade and mill freshness are what you can actually check.',
    },
  ];
  save('matcha', d);
}

{
  const d = load('tencha');
  d.processing = [
    {
      verb: 'shade',
      step: 'Shade',
      description: 'Same covers as gyokuro. The leaf is destined for flakes, not needles.',
    },
    {
      verb: 'kill-green',
      step: 'Steam',
      description: '蒸青, then destemmed and deveined. That missing 揉捻 is why tencha is not gyokuro.',
    },
    {
      verb: 'dry',
      step: 'Dry as flakes',
      description:
        'Unrolled leaf. Most of it is milled to matcha. If you brew the flakes, treat them like gyokuro — not as a second timer mode.',
    },
  ];
  save('tencha', d);
}

{
  const d = load('sheng-puer-young');
  d.processing = [
    {
      verb: 'kill-green',
      step: 'Kill-green',
      description: 'Wok sha qing, often a little greener than eastern greens so the leaf can age.',
    },
    {
      verb: 'dry',
      step: 'Sun dry',
      description: 'Maocha dried in the sun — 晒青, the signature that lets microbes and slow change work later.',
    },
    {
      verb: 'press',
      step: 'Steam and press',
      description: 'Cakes, bricks, or tuo. Young sheng is drunk as a bitter-floral tea or stored. Not 渥堆.',
    },
  ];
  d.compare = [
    {
      teaId: 'shou-puer',
      differentiator: 'Identical until 渥堆. Shou took the wet pile; sheng did not.',
    },
    {
      teaId: 'sheng-puer-aged',
      differentiator: 'Same make until time. Aged sheng is the project; young sheng is the bitter-floral tea you can drink now.',
    },
  ];
  addRefs(d, 'shai-qing', 'maocha');
  save('sheng-puer-young', d);
}

{
  const d = load('shou-puer');
  d.processing = [
    {
      verb: 'kill-green',
      step: 'Kill-green',
      description: 'Same sha qing as sheng. The fork has not happened yet.',
    },
    {
      verb: 'dry',
      step: 'Sun dry',
      description: 'Maocha, 晒青, as for sheng.',
    },
    {
      verb: 'pile-ferment',
      step: 'Wo dui',
      description: 'Piled, watered, and turned for weeks — accelerated fermentation invented in the 1970s. This is the hatch on the chart.',
    },
    {
      verb: 'press',
      step: 'Press',
      description: 'Cakes or loose ripe puer.',
    },
  ];
  d.compare = [
    {
      teaId: 'sheng-puer-young',
      differentiator: 'Same sun-dried leaf until 渥堆. Sheng skipped the pile.',
    },
  ];
  addRefs(d, 'shai-qing', 'maocha');
  save('shou-puer', d);
}

{
  const d = load('hojicha');
  d.processing = [
    {
      verb: 'kill-green',
      step: 'Steam',
      description: 'The base is sencha or bancha — already a green tea.',
    },
    {
      verb: 'roll',
      step: 'Roll and dry',
      description: 'Ordinary Japanese rolling. Oxidation is still 0.',
    },
    {
      verb: 'roast',
      step: 'Roast',
      description: '焙火 at high heat develops pyrazines. The brown cup is fire, not enzymatic oxidation.',
    },
  ];
  d.compare = [
    {
      teaId: 'sencha-asamushi',
      differentiator: 'Hojicha is sencha (or bancha) taken to the roaster. The class does not change.',
    },
  ];
  save('hojicha', d);
}

{
  const d = load('sencha-asamushi');
  d.processing = [
    {
      verb: 'kill-green',
      step: 'Steam',
      description: 'Short mushi (~30 s) preserves needle shape and a clearer, more vegetal liquor.',
    },
    {
      verb: 'roll',
      step: 'Roll',
      description: 'Standard sencha 揉捻 into needles.',
    },
    {
      verb: 'refine',
      step: 'Shiage',
      description: 'Aracha refined; finishing fire is gentler than Sayama’s.',
    },
  ];
  d.compare = [
    {
      teaId: 'hojicha',
      differentiator: 'Same steam-and-roll green until 焙火. Hojicha is this tea, roasted.',
    },
  ];
  addRefs(d, 'ichibancha', 'mushi', 'aracha');
  d.similarTo = ['sencha-fukamushi', 'shincha', 'sayama-cha'];
  save('sencha-asamushi', d);
}

{
  const d = load('sencha-fukamushi');
  d.processing = [
    {
      verb: 'kill-green',
      step: 'Deep steam',
      description: 'Longer mushi (60–120 s) for thicker, sunnier leaves; particles become small and the liquor opaque.',
    },
    {
      verb: 'roll',
      step: 'Roll and dry',
      description: 'Same rolling line as asamushi, but the cup is a different tea.',
    },
  ];
  addRefs(d, 'ichibancha', 'mushi');
  save('sencha-fukamushi', d);
}

{
  const d = load('shincha');
  d.processing = [
    {
      verb: 'kill-green',
      step: 'Steam',
      description: 'Usually light-steamed first-flush sencha. Shincha is a season, not a separate process.',
    },
    {
      verb: 'roll',
      step: 'Roll',
      description: 'Needles, as for sencha.',
    },
    {
      verb: 'refine',
      step: 'Rush shiage',
      description: 'Minimal resting; shincha is sencha sold as the year’s first news from the field.',
    },
  ];
  addRefs(d, 'ichibancha');
  save('shincha', d);
}

{
  const d = load('bi-luo-chun');
  d.processing = [
    {
      verb: 'pluck',
      step: 'Pluck',
      description: 'Minute buds picked around orchards of peach, plum and loquat.',
    },
    {
      verb: 'wither',
      step: 'Wither',
      description: 'Brief indoor wither before the wok, as with Long Jing.',
    },
    {
      verb: 'kill-green',
      step: 'Kill-green',
      description: 'Gentle pan-fire; fruit-blossom aromatics from neighbouring trees cling to the downy buds.',
    },
    {
      verb: 'roll',
      step: 'Rolling',
      description: 'Rolled into tight spirals — the “green snails”. The fork with Long Jing is this shape, not the fire.',
    },
    {
      verb: 'dry',
      step: 'Dry',
      description: 'Finished at low heat so the white pekoe remains visible.',
    },
  ];
  d.compare = [
    {
      teaId: 'long-jing',
      differentiator: 'Same pan-fire class; Long Jing is flattened in the wok, not spiralled, and grows at Xi Hu, not Taihu.',
    },
  ];
  save('bi-luo-chun', d);
}

{
  const d = load('an-ji-bai-cha');
  d.categoryNote =
    'A green tea. “White” is the Bai Ye cultivar’s pale leaf, not the white class. Kill-green is pan-fire; there is no long wither.';
  save('an-ji-bai-cha', d);
}

{
  const d = load('long-jing');
  d.processing[2].description =
    'Pan-fired in a large wok (杀青) to halt oxidation and set the chestnut aroma. That halt is why this is a green tea.';
  save('long-jing', d);
}

for (const id of ['qimen', 'dian-hong', 'jin-jun-mei', 'zheng-shan-xiao-zhong']) {
  const d = load(id);
  addMarker(d, ORTHODOX);
  addRefs(d, 'hong-cha-hei-cha', 'oxidation');
  save(id, d);
}

{
  const d = load('qimen');
  d.similarTo = ['dian-hong', 'ruby-18', 'zheng-shan-xiao-zhong'];
  save('qimen', d);
}

{
  const d = load('dian-hong');
  d.similarTo = ['qimen', 'ruby-18', 'jin-jun-mei'];
  save('dian-hong', d);
}

{
  const d = load('jin-jun-mei');
  d.processing = [
    { verb: 'pluck', step: 'Bud pluck', description: 'A 21st-century Tongmu style using only buds, not smoked like traditional Xiao Zhong.' },
    { verb: 'wither', step: 'Wither', description: 'Orthodox wither on buds.' },
    { verb: 'oxidise', step: 'Oxidise and dry', description: 'Honey-gold buds, light drying, no pine smoke.' },
  ];
  save('jin-jun-mei', d);
}

for (const id of ['jun-shan-yin-zhen', 'meng-ding-huang-ya']) {
  const d = load(id);
  addRefs(d, 'men-huang');
  const yellow = d.processing.find((s) => s.verb === 'yellow');
  if (yellow && !/闷黄/.test(yellow.description)) {
    yellow.description += ' 闷黄 is the whole of the yellow class: wrap, warmth, time.';
  }
  save(id, d);
}

{
  const d = load('meng-ding-huang-ya');
  d.similarTo = ['jun-shan-yin-zhen', 'huo-shan-huang-ya', 'long-jing'];
  save('meng-ding-huang-ya', d);
}

{
  const d = load('jun-shan-yin-zhen');
  d.similarTo = ['meng-ding-huang-ya', 'huo-shan-huang-ya', 'bai-hao-yin-zhen'];
  save('jun-shan-yin-zhen', d);
}

{
  const d = load('da-hong-pao');
  d.processing = [
    { verb: 'wither', step: 'Wither', description: 'Sun and indoor wither on rock-garden leaf.' },
    { verb: 'shake', step: 'Shake', description: '摇青 bruises the edges; oxidation starts at the margin. Oolong is this verb plus a roast, not a number.' },
    { verb: 'kill-green', step: 'Kill-green and roll', description: 'Long, twisted strips, not beads.' },
    { verb: 'roast', step: 'Charcoal roast', description: 'Repeated roasting over months; the yan yun comes from rock and fire.' },
  ];
  addRefs(d, 'yao-qing', 'yan-yun', 'zheng-yan', 'hong-bei');
  save('da-hong-pao', d);
}

{
  const d = load('dong-ding');
  d.processing = [
    { verb: 'wither', step: 'Wither', description: 'Taiwanese oolong oxidation, traditionally deeper than jade TGY.' },
    { verb: 'shake', step: 'Toss', description: '浪青 / 摇青 — the oolong craft before the ball.' },
    { verb: 'roll', step: 'Ball roll', description: 'Repeated cloth-ball rolling.' },
    { verb: 'roast', step: 'Roast', description: 'Charcoal or electric roast; traditional Dong Ding is brown-toasty, not jade-green.' },
  ];
  addRefs(d, 'yao-qing', 'lang-qing', 'hong-bei');
  save('dong-ding', d);
}

{
  const d = load('tie-guan-yin');
  addRefs(d, 'yao-qing', 'lang-qing', 'hong-bei');
  save('tie-guan-yin', d);
}

{
  const d = load('alishan');
  d.processing = [
    { verb: 'wither', step: 'High-elevation wither', description: 'Cool nights concentrate amino acids and floral oils.' },
    { verb: 'shake', step: 'Light shake', description: 'Greener than Dong Ding, still an oolong because of 摇青, not because of a percentage.' },
    { verb: 'roll', step: 'Ball roll', description: 'Tight jade beads.' },
    { verb: 'roast', step: 'Light roast', description: 'A drying roast, not Dong Ding charcoal.' },
  ];
  addRefs(d, 'gao-shan', 'yao-qing', 'qing-xin');
  save('alishan', d);
}

{
  const d = load('fu-zhuan');
  d.similarTo = ['qian-liang', 'liu-bao', 'shou-puer'];
  save('fu-zhuan', d);
}

{
  const d = load('liu-bao');
  d.similarTo = ['fu-zhuan', 'qian-liang', 'shou-puer'];
  save('liu-bao', d);
}

{
  const d = load('shui-xian');
  d.similarTo = ['rou-gui', 'da-hong-pao', 'zhang-ping-shui-xian'];
  save('shui-xian', d);
}

{
  const d = load('kamairicha');
  d.similarTo = ['tamaryokucha', 'long-jing', 'en-shi-yu-lu'];
  save('kamairicha', d);
}

// --- new teas ------------------------------------------------------------

const newTeas = {
  'ruby-18': {
    name: 'Ruby 18',
    nameNative: '紅玉',
    romanization: 'Hóngyù',
    translation: 'Red jade',
    origin: {
      country: 'Taiwan',
      regions: ['nantou'],
      regionNote: 'Yuchi / Sun Moon Lake is the classic garden; the cultivar travels',
      subregion: 'Yuchi, Nantou',
    },
    category: 'black',
    categoryNote: FALSE_FRIEND,
    variety: 'mixed',
    cultivar: ['TTES No. 18'],
    harvest: {
      window: 'summer',
      note: 'Summer leaf is often the loud mint-cinnamon lot. This is not the high-mountain oolong calendar.',
    },
    pluckStandard: 'one bud and two leaves, orthodox strip',
    oxidation: 100,
    roast: 'none',
    transformation: { kind: 'enzymatic', index: 100 },
    processing: [
      {
        verb: 'pluck',
        step: 'Pluck',
        description:
          'TTES No. 18 — 紅玉. The tea experiment station’s published parentage is Burma large-leaf B-729 × Taiwan wild B-607, named in 1999. English write-ups disagree on how long the trials ran; this atlas keeps the station’s parentage and the naming year, and does not freeze a folklore chronology.',
      },
      { verb: 'wither', step: 'Wither and roll', description: 'Orthodox black-tea make on a large-leaf hybrid.' },
      {
        verb: 'oxidise',
        step: 'Oxidise and dry',
        description: 'Full oxidation. The mint-cinnamon (wintergreen) note is the cultivar, not a flavouring.',
      },
    ],
    profile: {
      aroma: ['wintergreen', 'cinnamon', 'camphor-mint', 'brown sugar'],
      taste: ['mint-sweet malt', 'spice', 'clean tannin'],
      mouthfeel: 'round, medium-full, less punchy than Assam',
      finish: 'cooling mint after the malt',
    },
    brewing: {
      kind: 'infusion',
      gongfu: {
        vessel: 'gaiwan or pot',
        ratio: '1:18',
        waterTemp: 95,
        infusions: [steep(1, 15), steep(2, 12), steep(3, 20), steep(4, 30), steep(5, 45)],
      },
      western: western(3, 250, 95, 180, 240),
    },
    water: {
      tdsPpm: [40, 150],
      tempC: 95,
      note: 'Near boiling, medium mineral. The mint reads more clearly if you do not stew it.',
    },
    storage: 'Airtight, opaque. Orthodox blacks last 18–24 months well.',
    shelfLife: { kind: 'stable', window: 'years in an airtight tin', note: 'Stable, not a project.' },
    qualityMarkers: [
      ORTHODOX,
      { claim: 'mint-cinnamon from the leaf', test: 'if it tastes of added flavouring oil, it is not this cultivar doing the work' },
      { claim: 'TTES No. 18 / 紅玉 named on the bag' },
    ],
    commonFaults: [
      { name: 'generic Taiwanese black sold as Ruby', cause: 'other cultivars', tell: 'malt without mint' },
      { name: 'overstewed bitterness' },
    ],
    similarTo: ['dian-hong', 'dong-fang-mei-ren', 'wakoucha'],
    compare: [
      {
        teaId: 'dian-hong',
        differentiator: 'Both large-leaf orthodox blacks. Ruby’s mint-cinnamon is a Taiwanese hybrid; Dian Hong is Yunnan daye malt and sweet potato.',
      },
    ],
    glossaryRefs: ['hong-cha-hei-cha', 'oxidation'],
    summary:
      'Taiwan’s named black: TTES No. 18 from Yuchi, orthodox, with a mint-cinnamon register no mainland black shares.',
  },

  'en-shi-yu-lu': {
    name: 'En Shi Yu Lu',
    nameNative: '恩施玉露',
    romanization: 'Ēnshī Yùlù',
    translation: 'Enshi jade dew',
    origin: {
      country: 'China',
      regions: ['enshi'],
      subregion: 'Enshi, Hubei',
    },
    category: 'green',
    variety: 'sinensis',
    cultivar: ['Enshi local'],
    harvest: { window: 'early spring', flush: 'Ming Qian lots exist' },
    pluckStandard: 'one bud and one leaf, steamed into needles',
    oxidation: 0,
    roast: 'none',
    transformation: { kind: 'none', index: 0 },
    processing: [
      { verb: 'pluck', step: 'Pluck', description: 'Hubei highland spring; a tribute-style steamed green, not a pan-fire Zhejiang tea.' },
      {
        verb: 'kill-green',
        step: 'Steam',
        description:
          '蒸青 — one of the few surviving steamed Chinese greens. The halt is steam, as in sencha, not a wok. That is the comparison, and also the limit of it: the rolling culture and the water are Chinese.',
      },
      { verb: 'roll', step: 'Roll', description: 'Needles, tighter and drier than fukamushi; liquor stays clear.' },
      { verb: 'dry', step: 'Dry', description: 'Low fire to lock a jade colour and a chestnut-seaweed sweetness.' },
    ],
    profile: {
      aroma: ['chestnut', 'nori edge', 'fresh soybean'],
      taste: ['sweet green', 'light umami', 'clean mineral'],
      mouthfeel: 'silky, lighter than gyokuro, more body than Long Jing',
      finish: 'lingering bean-sweet',
    },
    brewing: {
      kind: 'infusion',
      gongfu: {
        vessel: 'gaiwan or glass',
        ratio: '1:20',
        waterTemp: 80,
        infusions: [steep(1, 20, 'Chinese green schedule, not a kyūsu curve'), steep(2, 15), steep(3, 25), steep(4, 40), steep(5, 60)],
      },
      western: western(3, 250, 80, 90, 120),
      coldBrew: { grams: 8, volume: 500, hours: 6, notes: 'Sweet, low bitterness — honest for a steamed green.' },
    },
    water: {
      tdsPpm: [30, 80],
      tempC: 80,
      note: 'Soft water, 30–80 ppm as a working range. Hard tap greys the needle liquor.',
    },
    storage: 'Airtight, cool, away from spice. Drink within the harvest year.',
    shelfLife: { kind: 'drink-fresh', window: 'within 9 months of harvest' },
    qualityMarkers: [
      { claim: 'even jade needles', test: 'broken dust is a lower lot' },
      { claim: 'steam, not wok smoke' },
      { claim: 'Enshi origin' },
    ],
    commonFaults: [
      { name: 'pan-fired “Yu Lu” with wok smoke' },
      { name: 'sencha relabelled as Enshi' },
      { name: 'yellowed older leaf' },
    ],
    similarTo: ['sencha-asamushi', 'gyokuro', 'long-jing'],
    compare: [
      {
        teaId: 'sencha-asamushi',
        differentiator: 'Both steamed. En Shi Yu Lu is a Chinese gaiwan green; sencha is a kyūsu tea with a long–short–long curve.',
      },
    ],
    glossaryRefs: ['sha-qing', 'mushi', 'ming-qian'],
    summary: 'Hubei steamed green: jade needles, chestnut-nori, the Chinese cousin of sencha that still wants a gaiwan.',
  },

  'gong-mei': {
    name: 'Gong Mei',
    nameNative: '贡眉',
    romanization: 'Gòngméi',
    translation: 'Tribute eyebrow',
    origin: {
      country: 'China',
      regions: ['fujian'],
      regionNote: 'Fuding and Zhenghe; traditionally 菜茶 / small-leaf, not Da Bai',
      subregion: 'Fuding / Zhenghe',
    },
    category: 'white',
    categoryNote: WITHER_NOTE,
    variety: 'sinensis',
    cultivar: ['Cai Cha', 'Xiao Bai'],
    harvest: { window: 'spring, later than Yin Zhen' },
    pluckStandard: 'bud and leaf from small-leaf bushes; not the Da Bai ladder',
    oxidation: 14,
    roast: 'none',
    transformation: { kind: 'enzymatic', index: 14 },
    processing: [
      {
        verb: 'pluck',
        step: 'Pluck',
        description:
          'Traditionally 菜茶 / 小白, not Fuding Da Bai. The market often files Gong Mei as a prettier name for Shou Mei; the older distinction is the bush.',
      },
      { verb: 'wither', step: 'Wither', description: 'The white-tea process: long wither, weather-dependent, no kill-green.' },
      { verb: 'dry', step: 'Dry', description: 'Sun and/or indoor dry. May be packed loose or pressed.' },
    ],
    profile: {
      aroma: ['dried herb', 'hay', 'light jujube', 'white flower'],
      taste: ['mild date', 'husky tea', 'soft tannin'],
      mouthfeel: 'between Bai Mu Dan’s silk and Shou Mei’s rusticity',
      finish: 'warming, clean',
    },
    brewing: {
      kind: 'infusion',
      gongfu: {
        vessel: 'gaiwan or pot',
        ratio: '1:16',
        waterTemp: 90,
        infusions: [steep(1, 25), steep(2, 20), steep(3, 30), steep(4, 45), steep(5, 70)],
      },
      western: western(3, 250, 90, 180, 240),
      coldBrew: { grams: 10, volume: 500, hours: 8 },
    },
    water: {
      tdsPpm: [30, 100],
      tempC: 90,
      note: 'Medium-soft. Can take a little more heat than Yin Zhen.',
    },
    storage: 'Dry and odour-free. Ages, but less often pressed than Shou Mei.',
    shelfLife: {
      kind: 'stable',
      window: 'cakes breathe if ageing is the point',
      note: 'Sealed if drinking fresh, breathable if ageing. Both are legitimate and they are different intentions.',
    },
    qualityMarkers: [
      { claim: 'small-leaf / 菜茶 named, not just “white tea grade 3”' },
      { claim: 'herb-hay, not compost' },
      { claim: 'Fuding or Zhenghe' },
    ],
    commonFaults: [
      { name: 'Da Bai Shou Mei relabelled Gong Mei', cause: 'market conflation', tell: 'fat Da Bai buds and a Shou Mei price' },
      { name: 'wet-stored sourness' },
    ],
    similarTo: ['shou-mei', 'bai-mu-dan', 'bai-hao-yin-zhen'],
    compare: [
      {
        teaId: 'shou-mei',
        differentiator: 'Shou Mei is later Da Bai leaf. Gong Mei, in the older sense, is a different bush. Bags that use the names interchangeably are telling you the market, not the garden.',
      },
    ],
    glossaryRefs: ['qunti-zhong', 'ye-di'],
    summary: 'The white-tea eyebrow that is supposed to be small-leaf 菜茶, sitting between White Peony and Shou Mei — when the name is honest.',
  },

  'qian-liang': {
    name: 'Qian Liang',
    nameNative: '千两茶',
    romanization: 'Qiānliǎng chá',
    translation: 'Thousand-tael tea',
    origin: {
      country: 'China',
      regions: ['anhua'],
      subregion: 'Anhua, Hunan',
    },
    category: 'dark',
    categoryNote: DARK_NOTE,
    variety: 'sinensis',
    cultivar: ['Hunan dark-tea cultivars'],
    harvest: { window: 'summer mature leaf' },
    pluckStandard: 'coarse leaf steamed and packed into a bamboo log',
    oxidation: 18,
    roast: 'none',
    transformation: {
      kind: 'microbial',
      index: 72,
      note: 'Anhua hei cha compressed as a 花卷 log. Microbial change in the column, not a light oolong at oxidation 18, and not 渥堆 in the puer sense.',
    },
    processing: [
      { verb: 'kill-green', step: 'Kill-green', description: 'Dark-tea sha qing on Hunan leaf; this is 黑茶 as a class, not a translation problem.' },
      { verb: 'roll', step: 'Roll', description: 'Maocha rolled, then gathered for the log.' },
      {
        verb: 'press',
        step: 'Hua juan',
        description: 'Steamed and packed into bamboo and palm-leaf as 花卷. The “thousand taels” is a traditional size of that column, not a tasting note.',
      },
      {
        verb: 'pile-ferment',
        step: 'Age in the log',
        description: 'Slow microbial change inside the wrapped column. Related to Anhua hei cha and Fu brick, not a shortcut wo dui.',
      },
    ],
    profile: {
      aroma: ['bamboo', 'dried jujube', 'pinewood', 'clean cellar'],
      taste: ['mellow dark', 'grain-sweet', 'gentle camphor'],
      mouthfeel: 'thick, low bitterness, built for a long session or a boil',
      finish: 'sweet wood',
    },
    brewing: {
      kind: 'infusion',
      gongfu: {
        vessel: 'pot or gaiwan',
        ratio: '1:12',
        waterTemp: 100,
        rinses: [{ seconds: 10, notes: 'rinse the broken log; the first water is not a cup' }],
        infusions: [steep(1, 20), steep(2, 15), steep(3, 25), steep(4, 40), steep(5, 60), steep(6, 90)],
      },
      western: western(5, 400, 100, 240),
      decoction: {
        when: 'after the gongfu session, or as a separate pot',
        minutes: [10, 25],
        notes: '煮茶 — simmer the spent log. Dark teas can take a boil; this is the extra cup the name 第四泡 points at.',
      },
    },
    water: {
      tdsPpm: [50, 200],
      tempC: 100,
      note: 'Boiling, mineral water is comfortable. A frontier tea built for frontier water.',
    },
    storage: 'Dry, whole logs or well-wrapped chunks. Damp storage is mould, not “camphor”.',
    shelfLife: { kind: 'improves', window: 'continues to change', note: FOOD },
    qualityMarkers: [
      { claim: 'bamboo-wrapped log or a clearly cut slice' },
      { claim: 'sweet grain, not sour' },
      { claim: 'Anhua pedigree' },
    ],
    commonFaults: [
      { name: 'wet-stored sourness' },
      { name: 'dust sold as “huajuan crumbs”' },
      { name: 'confused with Fu brick golden flowers' },
    ],
    similarTo: ['fu-zhuan', 'liu-bao', 'shou-puer'],
    compare: [
      {
        teaId: 'fu-zhuan',
        differentiator: 'Same Anhua dark-tea family. Fu brick is flowered; Qian Liang is the bamboo log. Neither is puer.',
      },
    ],
    glossaryRefs: ['hong-cha-hei-cha', 'oxidation', 'wo-dui'],
    summary: 'Anhua’s bamboo-log dark tea: thousand-tael 花卷, grain-jujube depth, a boil at the end of the session.',
  },

  wakoucha: {
    name: 'Wakoucha',
    nameNative: '和紅茶',
    romanization: 'Wakōcha',
    translation: 'Japanese black tea',
    origin: {
      country: 'Japan',
      regions: ['shizuoka'],
      regionNote: 'a national style — Kagoshima, Sayama, and others pack it too',
      subregion: 'often Shizuoka or Kagoshima gardens',
    },
    category: 'black',
    categoryNote: FALSE_FRIEND,
    variety: 'sinensis',
    cultivar: ['Benifuuki', 'Benihomare', 'Benihikari', 'others'],
    harvest: { window: 'first and second flush' },
    pluckStandard: 'one bud and two leaves, orthodox',
    oxidation: 100,
    roast: 'none',
    transformation: { kind: 'enzymatic', index: 100 },
    processing: [
      {
        verb: 'wither',
        step: 'Wither',
        description: 'Japanese black tea as an orthodox make — wither, roll, oxidise, dry. Not CTC, not a smoked Tongmu tea.',
      },
      { verb: 'roll', step: 'Roll', description: 'Orthodox roll on small-leaf sinensis, often Benifuuki and its relatives.' },
      {
        verb: 'oxidise',
        step: 'Oxidise and dry',
        description: 'Full enzymatic oxidation. The cup is 紅茶 in the Chinese sense: red liquor, black class in English.',
      },
    ],
    profile: {
      aroma: ['malt', 'sweet potato', 'light floral', 'cedar'],
      taste: ['gentle malt', 'honey', 'soft tannin'],
      mouthfeel: 'lighter than Dian Hong, cleaner than cheap Assam',
      finish: 'sweet, short-to-medium',
    },
    brewing: {
      kind: 'infusion',
      gongfu: {
        vessel: 'kyusu or pot',
        ratio: '1:18',
        waterTemp: 90,
        infusions: [steep(1, 20), steep(2, 15), steep(3, 25), steep(4, 40)],
      },
      western: western(3, 250, 90, 150, 210),
    },
    water: {
      tdsPpm: [40, 150],
      tempC: 90,
      note: 'Just off the boil. A kyūsu is allowed; this is still a black tea.',
    },
    storage: 'Airtight, away from sencha. Stable pantry tea.',
    shelfLife: { kind: 'stable', window: 'years in an airtight tin', note: 'Stable, not a project.' },
    qualityMarkers: [
      ORTHODOX,
      { claim: 'named Japanese cultivar (Benifuuki and kin)' },
      { claim: 'malt-floral, not stew' },
    ],
    commonFaults: [
      { name: 'imported Assam packed as wakoucha' },
      { name: 'overstewed bitterness' },
      { name: 'stale cardboard' },
    ],
    similarTo: ['ruby-18', 'qimen', 'dian-hong'],
    compare: [
      {
        teaId: 'ruby-18',
        differentiator: 'Two island blacks. Ruby 18 is a Taiwanese hybrid with mint-cinnamon; wakoucha is Japanese sinensis, milder malt.',
      },
    ],
    glossaryRefs: ['hong-cha-hei-cha', 'oxidation'],
    summary: 'Japanese orthodox black tea: 和紅茶, malt and honey from Benifuuki and its kin, a kyūsu that is allowed to pour red.',
  },

  'awa-bancha': {
    name: 'Awa Bancha',
    nameNative: '阿波晩茶',
    romanization: 'Awa bancha',
    translation: 'Awa late tea',
    origin: {
      country: 'Japan',
      regions: ['tokushima'],
      subregion: 'Kamikatsu and Naka, Tokushima',
    },
    category: 'dark',
    categoryNote:
      'A lactic-fermented Japanese tea filed with the dark class by process. Not 渥堆, not English black tea, not a failed sencha.',
    variety: 'sinensis',
    cultivar: ['local Tokushima'],
    harvest: {
      window: 'late summer',
      note: 'Bancha as in late leaf — the calendar is the name. This is not first-flush sencha.',
    },
    pluckStandard: 'mature summer leaf, boiled then lactic-fermented',
    oxidation: 8,
    roast: 'none',
    transformation: {
      kind: 'microbial',
      index: 60,
      note: 'Anaerobic lactic fermentation after a boil, then sun-dry. Microbial, not enzymatic oxidation, and not puer-style 渥堆.',
    },
    processing: [
      { verb: 'pluck', step: 'Late pluck', description: 'Summer mature leaf in Tokushima. The 晩 is the point.' },
      { verb: 'kill-green', step: 'Boil', description: 'Leaf is boiled, not steamed as sencha and not wok-fired as a Chinese green.' },
      {
        verb: 'pile-ferment',
        step: 'Lactic ferment',
        description: 'Packed anaerobic until lactic acid bacteria sour the leaf. Related in spirit to goishicha; not a wet pile in the Yunnan sense.',
      },
      { verb: 'dry', step: 'Sun dry', description: 'Unpacked and dried. The sour-pickle register is the process, not a fault.' },
    ],
    profile: {
      aroma: ['pickle', 'hay', 'sour plum', 'wood'],
      taste: ['lactic sour', 'light umami', 'clean bitterness'],
      mouthfeel: 'thin-to-medium, quenching, not creamy',
      finish: 'sour-sweet, short',
    },
    brewing: {
      kind: 'infusion',
      gongfu: {
        vessel: 'kyusu or pot',
        ratio: '1:16',
        waterTemp: 90,
        infusions: [steep(1, 45, 'longer first steep; this leaf does not open like sencha'), steep(2, 30), steep(3, 45)],
        curveException: 'Awa bancha is not a Japanese needle green. The first steep is long because the leaf is boiled-and-dried, not rolled-open.',
      },
      western: western(5, 400, 90, 180),
      decoction: {
        when: 'a kettle on the table, as the villages often drink it',
        minutes: [5, 15],
        notes: '煮茶 — simmering is ordinary here. The sour is already in the leaf; heat just lifts it.',
      },
    },
    water: {
      tdsPpm: [30, 120],
      tempC: 90,
      note: 'Near boiling is fine. Soft water keeps the sour clean rather than metallic.',
    },
    storage: 'Airtight. The pickle aroma will scent nearby sencha. Stable compared with ichibancha.',
    shelfLife: { kind: 'stable', window: 'a year or more in a tin', note: FOOD },
    qualityMarkers: [
      { claim: 'Tokushima / Awa named' },
      { claim: 'clean lactic sour, not dirty compost' },
      { claim: 'late-summer harvest' },
    ],
    commonFaults: [
      { name: 'ordinary bancha sold as Awa' },
      { name: 'rot rather than pickle' },
      { name: 'confused with hojicha because both are “brown”' },
    ],
    similarTo: ['bancha', 'liu-bao', 'fu-zhuan'],
    compare: [
      {
        teaId: 'bancha',
        differentiator: 'Everyday bancha is steamed green. Awa bancha is boiled and lactic-fermented — a different class, same late-leaf calendar.',
      },
    ],
    glossaryRefs: ['hong-cha-hei-cha', 'oxidation'],
    summary: 'Tokushima’s lactic late tea: boiled, pickled, sun-dried. A dark tea that tastes of sour plum, not of 渥堆.',
  },

  'zhang-ping-shui-xian': {
    name: 'Zhangping Shui Xian',
    nameNative: '漳平水仙',
    romanization: 'Zhāngpíng Shuǐxiān',
    translation: 'Zhangping narcissus',
    origin: {
      country: 'China',
      regions: ['zhangping'],
      subregion: 'Zhangping, Longyan, Fujian',
    },
    category: 'oolong',
    variety: 'sinensis',
    cultivar: ['Shui Xian'],
    harvest: { window: 'spring and autumn' },
    pluckStandard: 'open leaf, pressed into a small square',
    oxidation: 35,
    roast: 'medium',
    transformation: { kind: 'enzymatic', index: 35 },
    processing: [
      { verb: 'wither', step: 'Wither', description: 'Fujian inland oolong wither on Shui Xian leaf — the same cultivar as Wuyi, a different shape.' },
      { verb: 'shake', step: 'Shake', description: '摇青 starts oxidation at the margin. Oolong is this verb, then a roast.' },
      { verb: 'kill-green', step: 'Kill-green', description: 'Fired when the floral peak is in.' },
      { verb: 'roll', step: 'Roll', description: 'Not a Wuyi strip and not an Anxi bead — prepared for the square.' },
      {
        verb: 'press',
        step: 'Square press',
        description: 'Pressed into a small paper-wrapped square. Unique among oolongs in this atlas; the press is the tell on the table.',
      },
      { verb: 'roast', step: 'Roast', description: 'Medium roast; orchid and water-lily over charcoal sweetness.' },
    ],
    profile: {
      aroma: ['narcissus', 'orchid', 'baked sugar', 'orchid water'],
      taste: ['floral', 'light mineral', 'toasted grain'],
      mouthfeel: 'thicker than jade TGY, less rock than Wuyi Shui Xian',
      finish: 'orchid return',
    },
    brewing: {
      kind: 'infusion',
      gongfu: {
        vessel: 'gaiwan',
        ratio: '1:18',
        waterTemp: 98,
        rinses: [{ seconds: 8, notes: 'rinse to open the square; the first drinking steep is still ahead' }],
        infusions: [steep(1, 20), steep(2, 15), steep(3, 25), steep(4, 35), steep(5, 50), steep(6, 75)],
      },
      western: western(4, 250, 95, 150, 210),
    },
    water: {
      tdsPpm: [40, 120],
      tempC: 98,
      note: 'Near boiling, moderate minerals. Ultra-soft water makes the square taste thin.',
    },
    storage: 'Airtight after roast has settled. The squares keep if dry.',
    shelfLife: { kind: 'stable', window: 'improves for a while after roast' },
    qualityMarkers: [
      { claim: 'intact paper-wrapped square' },
      { claim: 'Zhangping, not a Wuyi strip in a box' },
      { claim: 'orchid, not ash' },
    ],
    commonFaults: [
      { name: 'Wuyi Shui Xian crumbs pressed and relabelled' },
      { name: 'over-roast bitterness' },
      { name: 'stale paper taint' },
    ],
    similarTo: ['shui-xian', 'tie-guan-yin', 'dong-ding'],
    compare: [
      {
        teaId: 'shui-xian',
        differentiator: 'Same cultivar name. Wuyi Shui Xian is a rock strip; Zhangping is a pressed square from inland Fujian. The mountain is the argument.',
      },
    ],
    glossaryRefs: ['yao-qing', 'hong-bei'],
    summary: 'The square oolong: Zhangping Shui Xian, paper-wrapped, orchid over a medium roast, not a Wuyi strip.',
  },

  'huo-shan-huang-ya': {
    name: 'Huo Shan Huang Ya',
    nameNative: '霍山黄芽',
    romanization: 'Huòshān Huángyá',
    translation: 'Huoshan yellow bud',
    origin: {
      country: 'China',
      regions: ['huoshan'],
      subregion: 'Huoshan, Anhui',
    },
    category: 'yellow',
    variety: 'sinensis',
    cultivar: ['Huoshan local'],
    harvest: { window: 'early spring', flush: 'Ming Qian prized' },
    pluckStandard: 'one bud and one leaf, yellowed',
    oxidation: 10,
    roast: 'none',
    transformation: { kind: 'enzymatic', index: 10 },
    processing: [
      { verb: 'pluck', step: 'Pluck', description: 'Dabie Mountain spring buds; a historic Anhui yellow, not a rebranded green.' },
      { verb: 'kill-green', step: 'Kill-green', description: 'Pan-fire, as a green would be — then the class-defining wrap.' },
      {
        verb: 'yellow',
        step: 'Men Huang',
        description: '闷黄 — wrapped and held warm so chlorophyll transforms without full oxidation. That wrap is why this is not Huo Shan green tea.',
      },
      { verb: 'dry', step: 'Dry', description: 'Low bake; buds should show a yellow-olive, not a raw green.' },
    ],
    profile: {
      aroma: ['baked corn', 'chestnut', 'hay', 'light floral'],
      taste: ['mellow sweet', 'yellow bean', 'soft mineral'],
      mouthfeel: 'soft, less piercing than a same-garden green',
      finish: 'gentle and long',
    },
    brewing: {
      kind: 'infusion',
      gongfu: {
        vessel: 'gaiwan',
        ratio: '1:20',
        waterTemp: 85,
        infusions: [steep(1, 25), steep(2, 20), steep(3, 30), steep(4, 45), steep(5, 70)],
      },
      western: western(3, 250, 85, 120, 180),
    },
    water: {
      tdsPpm: [30, 80],
      tempC: 85,
      note: 'Soft to medium. Heat around 85 °C keeps the yellowing sweetness.',
    },
    storage: 'Airtight, away from spice. Best in the harvest year.',
    shelfLife: { kind: 'drink-fresh', window: 'within the harvest year' },
    qualityMarkers: [
      { claim: 'even yellow-olive buds' },
      { claim: 'no green rawness — the wrap happened' },
      { claim: 'Huoshan, Anhui' },
    ],
    commonFaults: [
      { name: 'unfinished yellowing (still a green)' },
      { name: 'over-baked dullness' },
      { name: 'Meng Ding or Junshan sold under this name' },
    ],
    similarTo: ['meng-ding-huang-ya', 'jun-shan-yin-zhen', 'long-jing'],
    compare: [
      {
        teaId: 'meng-ding-huang-ya',
        differentiator: 'Both yellow buds via 闷黄. Meng Ding is Sichuan highland squash-osmanthus; Huo Shan is Anhui corn-chestnut.',
      },
    ],
    glossaryRefs: ['men-huang', 'ming-qian', 'sha-qing'],
    summary: 'Anhui yellow bud from Huoshan: 闷黄 wrap, corn-chestnut sweetness, a green tea plus time in a cloth.',
  },

  'sayama-cha': {
    name: 'Sayama-cha',
    nameNative: '狭山茶',
    romanization: 'Sayama-cha',
    translation: 'Sayama tea',
    origin: {
      country: 'Japan',
      regions: ['sayama'],
      subregion: 'Iruma and Sayama, Saitama',
    },
    category: 'green',
    subtype: 'sencha',
    variety: 'sinensis',
    cultivar: ['Yabukita', 'Sayamakaori', 'Fukumidori'],
    harvest: { window: 'ichibancha, then later flushes for everyday lots' },
    pluckStandard: 'sencha needles with a heavy finishing fire',
    oxidation: 0,
    roast: 'light',
    transformation: { kind: 'none', index: 0, note: 'Still a steamed green. 狭山火入れ is a finishing fire, not hojicha-level 焙火.' },
    processing: [
      { verb: 'kill-green', step: 'Steam', description: 'Ordinary Japanese mushi. Sayama is not a different class; it is a different finishing fire.' },
      { verb: 'roll', step: 'Roll', description: 'Needles, as for sencha.' },
      {
        verb: 'refine',
        step: 'Sayama hiire',
        description: '狭山火入れ — a heavier final firing than Uji or Shizuoka typically apply. The cup is thicker and toastier; oxidation stays 0.',
      },
    ],
    profile: {
      aroma: ['toasted nori', 'roasted bean', 'warm grass'],
      taste: ['savoury-sweet', 'light toast', 'umami'],
      mouthfeel: 'thicker than Shizuoka asamushi, not opaque like fukamushi',
      finish: 'warm, short-to-medium',
    },
    brewing: {
      kind: 'infusion',
      gongfu: {
        vessel: 'kyusu',
        ratio: '1:15',
        waterTemp: 80,
        infusions: [steep(1, 60, 'a few degrees hotter than Uji sencha; the fire can take it'), steep(2, 20), steep(3, 45)],
        curveException: jpCurve,
      },
      western: western(4, 180, 80, 60, 30),
      coldBrew: { grams: 10, volume: 500, hours: 4, notes: 'Mizudashi still works; the toast is quieter cold.' },
    },
    water: {
      tdsPpm: [30, 80],
      tempC: 80,
      note: 'Soft water, 75–85 °C. The finishing fire is not a licence for a rolling boil.',
    },
    storage: 'Refrigerate sealed after opening; finish the bag in weeks. Keep away from hojicha so the fires do not blur.',
    shelfLife: { kind: 'drink-fresh', window: 'within months of harvest', note: 'Sealed, freezer then fridge, small portions.' },
    qualityMarkers: [
      { claim: 'Saitama / Iruma / Sayama named' },
      { claim: 'toast from 火入れ, not from a hojicha drum' },
      { claim: 'ichi-bancha date' },
    ],
    commonFaults: [
      { name: 'Shizuoka sencha in a Sayama tin' },
      { name: 'scorched hiire' },
      { name: 'stale fishy nori' },
    ],
    similarTo: ['sencha-asamushi', 'hojicha', 'kamairicha'],
    compare: [
      {
        teaId: 'sencha-asamushi',
        differentiator: 'Same steam-and-roll green. Sayama’s distinction is the heavy finishing fire, not a different kill-green.',
      },
    ],
    glossaryRefs: ['ichibancha', 'mushi', 'aracha'],
    summary: 'Kantō sencha with 狭山火入れ: thicker, toastier needles from Saitama, still a steamed green.',
  },

  'shou-mei-aged': {
    name: 'Aged Shou Mei',
    nameNative: '老寿眉',
    romanization: 'Lǎo shòuméi',
    translation: 'Aged longevity eyebrow',
    origin: {
      country: 'China',
      regions: ['fujian'],
      subregion: 'Fuding leaf, stored dry',
    },
    category: 'white',
    categoryNote: `${WITHER_NOTE} Ageing is time on that withered leaf, not a pile.`,
    variety: 'sinensis',
    cultivar: ['Da Bai', 'Qunti'],
    harvest: { window: 'originally late spring or autumn leaf, then years' },
    pluckStandard: 'later leaf, usually pressed, then stored dry for years',
    oxidation: 28,
    roast: 'none',
    transformation: {
      kind: 'enzymatic',
      index: 40,
      note: 'Slow change in a dry cake. Not 渥堆. The darker cup is time on a white tea, which is why this bar is taller than young Shou Mei and not hatched as microbial.',
    },
    processing: [
      { verb: 'pluck', step: 'Same make as Shou Mei', description: 'Later leaf, long wither, dry. The extra process is storage.' },
      { verb: 'wither', step: 'Wither and dry', description: 'White-tea path; often pressed so the cake can be kept as a project.' },
      {
        verb: 'other',
        step: 'Dry storage',
        description: 'Years in a dry cabinet. Damp cupboards are mould. The storage guide’s line applies: most teas are food; this one is a project.',
      },
    ],
    profile: {
      aroma: ['jujube', 'herb medicine cabinet', 'dried longan', 'paper'],
      taste: ['date', 'gentle spice', 'husky sweetness'],
      mouthfeel: 'thicker, red-amber, low bitterness if stored dry',
      finish: 'warming, long',
    },
    brewing: {
      kind: 'infusion',
      gongfu: {
        vessel: 'clay pot or gaiwan',
        ratio: '1:14',
        waterTemp: 100,
        rinses: [{ seconds: 8, notes: 'optional rinse on a pressed cake; the drinking curve starts after' }],
        infusions: [steep(1, 25), steep(2, 20), steep(3, 30), steep(4, 45), steep(5, 70), steep(6, 100)],
      },
      western: western(4, 300, 100, 240, 300),
      decoction: {
        when: 'after the session, or as a separate pot of the last leaves',
        minutes: [8, 20],
        notes: '煮茶 — aged white will take a simmer. Young Yin Zhen will not thank you for this.',
      },
    },
    water: {
      tdsPpm: [40, 150],
      tempC: 100,
      note: 'Boiling, with some mineral. The cake has already done the delicate years.',
    },
    storage: 'Keep dry. This is already the project; wet-stored sourness is not “aged character”.',
    shelfLife: { kind: 'improves', window: 'continues to change if actually dry', note: FOOD },
    qualityMarkers: [
      { claim: 'red-amber liquor, not black soup' },
      { claim: 'jujube-sweet, not compost' },
      { claim: 'harvest year and storage story that match' },
    ],
    commonFaults: [
      { name: 'wet-stored sourness sold as age' },
      { name: 'young Shou Mei at aged prices' },
      { name: 'smoke from careless drying' },
    ],
    similarTo: ['shou-mei', 'sheng-puer-aged', 'liu-bao'],
    compare: [
      {
        teaId: 'shou-mei',
        differentiator: 'Same wither-only make. Age is the second process. Young Shou Mei is herb-hay; this is date and amber.',
      },
    ],
    glossaryRefs: ['ye-di', 'hui-gan'],
    summary: 'Shou Mei after the years: a dry-stored white cake that drinks as dates and amber, still not a pile-fermented dark tea.',
  },
};

for (const [id, data] of Object.entries(newTeas)) {
  save(id, data);
  console.log('wrote', id);
}

console.log('editorial + new teas done');

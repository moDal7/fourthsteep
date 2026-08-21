/**
 * HISTORICAL. Glossary JSON under src/content/glossary is the source of truth.
 * Do not re-run this script — it would clobber later terms.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'content', 'glossary');

const terms = [
  { id: 'sha-qing', term: 'Kill-green', native: '杀青', romanization: 'shāqīng', language: 'zh', definition: 'Heating the leaf (wok, steam, or drum) to halt enzymatic oxidation. Greens, yellows, and most oolongs are defined by when this happens.' },
  { id: 'hong-bei', term: 'Roast / bake', native: '焙火', romanization: 'bèihuǒ', language: 'zh', definition: 'Charcoal or electric roasting after the leaf is already an oolong or dark tea. Builds caramel, spice, and storage stability; not the same as oxidation.' },
  { id: 'mushi', term: 'Steaming', native: '蒸し', romanization: 'mushi', language: 'ja', definition: 'Japanese kill-green with steam. Asamushi is short; fukamushi is long enough to break the leaf and cloud the liquor.' },
  { id: 'aracha', term: 'Crude tea', native: '荒茶', romanization: 'aracha', language: 'ja', definition: 'Unrefined Japanese tea after the factory line, before shiage (cutting, sorting, firing). Most bags you buy are already finished.' },
  { id: 'lang-qing', term: 'Shaking / tossing', native: '浪青', romanization: 'làngqīng', language: 'zh', definition: 'Bruising oolong leaf edges to start oxidation while the centre stays greener. The craft behind floral vs roasty oolong.' },
  { id: 'men-huang', term: 'Yellowing', native: '闷黄', romanization: 'mènhuáng', language: 'zh', definition: 'Wrapping and holding warm leaf after kill-green so yellow teas mellow without becoming black tea.' },
  { id: 'wo-dui', term: 'Pile fermentation', native: '渥堆', romanization: 'wòduī', language: 'zh', definition: 'The wet pile that turns sun-dried maocha into shou puer. Time, heat, and turning — not the same as aging a sheng cake.' },
  { id: 'yan-yun', term: 'Rock rhyme', native: '岩韵', romanization: 'yányùn', language: 'zh', definition: 'The mineral, cooling aftertaste associated with true-cliff Wuyi oolong. Roast alone cannot fake it.' },
  { id: 'hui-gan', term: 'Returning sweetness', native: '回甘', romanization: 'huígān', language: 'zh', definition: 'Bitterness or astringency that turns sweet in the throat after swallowing. A quality marker on young sheng and some greens.' },
  { id: 'gongfu', term: 'Gongfu cha', native: '工夫茶', romanization: 'gōngfū chá', language: 'zh', definition: 'Many short infusions, high leaf, small vessel. Chaozhou and Wuyi versions differ in pot and timing, but the data model is the same: an infusion schedule.' },
  { id: 'grandpa', term: 'Grandpa style', native: '闷泡', romanization: 'mēnpào', language: 'zh', definition: 'Leaf left in a glass or mug, topped up rather than decanted. Forgiving with greens and whites; a poor fit for dan cong.' },
  { id: 'kyusu', term: 'Kyusu', native: '急須', romanization: 'kyūsu', language: 'ja', definition: 'Side-handled Japanese teapot, usually with a built-in strainer. The default vessel for sencha.' },
  { id: 'shiboridashi', term: 'Shiboridashi', native: '絞り出し', romanization: 'shiboridashi', language: 'ja', definition: 'Handle-less pourer for gyokuro and other high-grade greens; you pinch-pour through the lip.' },
  { id: 'tencha', term: 'Tencha', native: '碾茶', romanization: 'tencha', language: 'ja', definition: 'Shaded, steamed, unrolled leaf destined for the stone mill. Matcha is tencha after grinding.' },
  { id: 'maocha', term: 'Maocha', native: '毛茶', romanization: 'máochá', language: 'zh', definition: 'Unpressed, unfinished tea — especially sun-dried Yunnan leaf before it becomes a puer cake.' },
  { id: 'zheng-yan', term: 'True cliff', native: '正岩', romanization: 'zhèngyán', language: 'zh', definition: 'Wuyi gardens on the core rocky scenic area, as opposed to ban yan (half-cliff) or wai shan (off-mountain).' },
  { id: 'qing-xin', term: 'Qing Xin', native: '青心', romanization: 'Qīng xīn', language: 'zh', definition: 'The cultivar behind much of Taiwan’s high-mountain oolong and traditional Dong Ding. Not a place name.' },
  { id: 'yabukita', term: 'Yabukita', native: 'やぶきた', romanization: 'Yabukita', language: 'ja', definition: 'Japan’s dominant sencha cultivar since the mid-20th century. Reliable, grassy-umami, everywhere.' },
  { id: 'oxidation', term: 'Oxidation', native: '氧化 / 発酵', romanization: 'yǎnghuà / hakkō', language: 'en', definition: 'Enzymatic browning of the leaf after bruising, distinct from microbial fermentation (wo dui, golden flowers) and from roast. This atlas stores it as 0–100%.' },
  { id: 'dan-cong', term: 'Dan cong', native: '单丛', romanization: 'dāncóng', language: 'zh', definition: 'Phoenix Mountain “single bush” oolong: named aroma selections, wiry leaf, flash gongfu.' },
];

await mkdir(outDir, { recursive: true });
for (const t of terms) {
  const { id, ...data } = t;
  await writeFile(join(outDir, `${id}.json`), JSON.stringify(data, null, 2) + '\n');
}
console.log(`Wrote ${terms.length} glossary terms`);

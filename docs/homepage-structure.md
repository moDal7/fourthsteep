# Tea Atlas — current structure & homepage impact brief

Copy this whole file into another model as the brief. It describes the site **as built today**, the homepage’s section-by-section anatomy, the rules that must not be broken, and ranked opportunities to make the landing page land harder.

Live site: https://www.topeki.com/fourthsteep/  
Repo: static Astro 7 encyclopaedia. `npm run build` emits HTML into `dist/`. Base path is `/fourthsteep`. There is no backend and no database.

---

## 1. What this site is

Tea Atlas is a typed encyclopaedia of **45 Chinese, Taiwanese, and Japanese teas**. Every tea is a JSON record: terroir, processing chain, flavour, quality markers, and a brewing schedule. The same infusion array drives the HTML table **and** the brew timer, so they cannot disagree. Every tea also mixes its own liquor colour from oxidation, firing, category, and origin — the page is dyed by that cup, not by a palette of hand-picked hex values.

The homepage’s job is to make that thesis visible in one scroll: the collection exists, it is coloured by the cup, and you can enter it.

Brand line in the header: **Tea Atlas / leaves, water, time**.  
Hero headline today: **Leaves, water, and a clock you can trust.**

---

## 2. Stack and invariants

| Piece | Fact |
| --- | --- |
| Runtime | Node 22, npm |
| Framework | Astro 7, static output, `@astrojs/mdx` |
| CSS | Hand-written in `src/styles/global.css`. No Tailwind, no UI kit. |
| JS islands | Vanilla modules in `src/scripts/`. No React/Vue/Svelte. |
| Fonts | Fraunces (variable: opsz, wght, SOFT, WONK) from Google Fonts. CJK via system serif stack. |
| Deploy | GitHub Pages via `.github/workflows/deploy.yml`. `astro.config.mjs`: `site: https://www.topeki.com`, `base: /fourthsteep`. |
| Path helper | **Every in-app `href` must go through `withBase()`** from `src/lib/paths.js`. Raw `/atlas` breaks on Pages. |

Scripts:

```bash
npm install
npm run dev
npm run build    # also runs scripts/check-similar-to.mjs
npm run preview
npm run check
```

---

## 3. File map

```
src/
  content.config.ts          Zod schemas for teas, regions, guides, glossary
  content/teas/*.json        45 tea records (one file per tea; filename = slug)
  content/regions/*.md       16 terroir pages (frontmatter + prose)
  content/guides/*.mdx       8 brewing/knowledge guides
  content/glossary/*.json    20 bilingual terms
  layouts/Base.astro         html/head/header/footer, theme boot, morph + theme scripts
  pages/
    index.astro              HOME — this brief’s subject
    atlas.astro              Filterable card grid + text search
    atlas.json.js            Build-time search index (GET → JSON)
    tea/[slug].astro         Profile: scales, flavour, processing, timer, tables
    regions/index.astro      Region cards grouped by country
    regions/[slug].astro     Terroir page + teas filed there
    brewing/index.astro      Guides split into method / knowledge
    brewing/[slug].astro     MDX guide + prev/next pager
    glossary.astro           A–Z bilingual terms
  components/
    TeaCard.astro            Atlas card (swatch + meters). Morph source.
    Spectrum.astro           Homepage oxidation strip
    SteepMark.astro          Homepage hero SVG (leaf draws, steeps, steams)
    Scale.astro              Tea-page oxidation/firing bars
    BrewTimer.astro          Gongfu timer (Web Audio chime)
    RatioCalculator.astro    Leaf:water calculator
    InfusionTable.astro      Schedule table from the same infusion array
  lib/
    atlas.js                 liquorPalette(), liquorStyle(), regionGroups, atlasRecord()
    paths.js                 withBase()
  scripts/
    theme.js                 Light/dark toggle + view-transition swap
    morph.js                 Tags clicked tea-card swatch as view-transition target
    atlas-filter.js          Client filters + FLIP reflow on /atlas
    brew-timer.js            Timer island
    ratio-calc.js            Calculator island
  styles/global.css          Tokens, ramp, all layout, motion
scripts/
  check-similar-to.mjs       Build-time slug integrity
  generate-teas*.mjs         Rebuild JSON from authored source in those scripts
  generate-glossary.mjs
public/favicon.svg
```

Do **not** invent a CSS framework, a component library, or image assets. The site is designed to ship **no photographs** — colour is the illustration.

---

## 4. Content model (what a tea is)

Schema lives in `src/content.config.ts`. One JSON file per tea under `src/content/teas/`. Slug = filename without `.json`. `similarTo` must be real slugs (enforced by `scripts/check-similar-to.mjs`).

Current counts (do not hardcode if the page can compute them):

| Collection | Count | Notes |
| --- | --- | --- |
| teas | 45 | China 27, Japan 13, Taiwan 5 |
| categories | 7 | green 19, oolong 11, dark 5, black 4, white 3, yellow 2, scented 1 |
| regions | 16 | Mapped via `regionGroups` in `src/lib/atlas.js` |
| guides | 8 | `group: method` (orders 1–4) then `knowledge` (5–8) |
| glossary | 20 | `language: zh \| ja \| en` |

Tea record (fields the homepage already uses are marked ★):

- ★ `name`, `nameNative`, `romanization`, `translation`
- ★ `origin.country` (`China` \| `Taiwan` \| `Japan`), `origin.region`, optional `subregion`
- ★ `category` (`green` \| `white` \| `yellow` \| `oolong` \| `black` \| `dark` \| `scented`)
- `japaneseType?`, `cultivar[]`, `harvest.{season, pluckingStage}`
- ★ `oxidation` 0–100 (printed as a number wherever it is shown as a bar)
- ★ `roast` (`none` \| `light` \| `medium` \| `heavy` \| `charcoal`)
- `processing[]` `{step, description}`
- `profile.{aroma[], taste[], mouthfeel, finish}`
- `brewing.gongfu` `{vessel, ratio, waterTemp, infusions[]}` — infusions: `{n, seconds, notes?}`
- `brewing.western` `{grams, volume, waterTemp, infusions[]}`
- `brewing.coldBrew?` `{grams, volume, hours, notes?}`
- `water`, `storage`, `qualityMarkers[]`, `commonFaults[]`, `similarTo[]`
- ★ `summary`

Guides: `{title, description, order, group}`. Regions: `{name, nameNative, country, summary, climate, knownFor[]}`. Glossary: `{term, native, romanization, language, definition}`.

Region pages do **not** use `origin.region` string-equality alone. `teasForRegion()` in `src/lib/atlas.js` maps each region id to one or more origin-region name strings (e.g. `fujian` matches Fuding, Fujian, Fuzhou / Guangxi base). If you add a tea, check that mapping.

---

## 5. Colour system — do not break this

Every tea carries three numbers, the OKLCH of the cup it pours, computed by `liquorPalette()` in `src/lib/atlas.js`:

```
--lq-l  --lq-c  --lq-h
```

Set them with `liquorStyle({ ...tea.data, id: tea.id })` as an inline `style`. The stylesheet derives the rest. **Pass `id`** so the deterministic jitter is stable across pages.

| Token | Use |
| --- | --- |
| `--liquor` | Swatches, bars, ring fill |
| `--liquor-deep` / `--liquor-pale` | Gradient ends |
| `--liquor-wash` / `--liquor-veil` | Page ambience, hover floods |
| `--liquor-ink` | Text and rules, clamped for contrast per theme |

Two rules that already bit people:

1. The ramp is declared on `*`, **not** `:root`. A custom property’s `var()` is substituted where the property is **declared**. A ramp on `:root` would resolve against the root’s `--lq-*` once and ignore every per-tea value below it. Every atlas swatch would become the same colour.
2. Theme differences are numeric knobs (`--ink-shift`, `--wash-a`, `--veil-a`, `--ink-floor`, `--ink-ceil`), not a second copy of the ramp.

Pages about one tea pass `liquor={liquorStyle(...)}` into `<Base>`, which puts it on `<html>`. The homepage currently does **not** — it sits on the default cup `--lq-l: 0.78; --lq-c: 0.1; --lq-h: 78` (warm gold). Body washes, links, brand-mark fill, and button pours are therefore generic, not collection-coloured.

Oxidation and firing are **never colour-only**: print the number beside the bar (`Scale`, `TeaCard` mini-meters, spectrum readout).

Light/dark: `data-theme` on `<html>`, stored as `tea-atlas-theme` in localStorage. Inline boot script in `Base.astro` before paint. Toggle is a cup SVG that fills in dark mode.

---

## 6. Motion rules — do not break this

- Animate **transform, opacity, and registered custom properties** only.
- Anything that would otherwise leave content invisible lives inside `@media (prefers-reduced-motion: no-preference)`.
- A global `reduce` block at the bottom of `global.css` cuts remaining durations to `0.01ms`. The **settled state must be the meaningful one**.
- Easing tokens: `--ease-steep` (settle), `--ease-pour` (fill from an edge). Durations `--dur-1`…`--dur-4` (140 / 260 / 480 / 900ms).
- Header condenses on `animation-timeline: scroll()`. Atlas grid reflows with FLIP in `atlas-filter.js`. Navigation uses CSS cross-document view transitions; `morph.js` tags **only the clicked** `[data-tea-card] [data-morph]` swatch as `active-tea`. The tea page’s `.morph-target` (the cup disc) is the destination.
- Do not add scroll listeners, layout-thrashing hover JS, or opacity-0 content that reduced-motion users never see.

Homepage motion today:

- `.reveal-word > span` — per-word rise, delay `calc(var(--i) * 90ms)`
- `.steep-mark` — blade draws (`stroke-dasharray: 1` + `pathLength="1"`), floods fill, steam loops
- `.spectrum-strip a` — bars grow from the bottom, delay `calc(var(--i) * 18ms)`

---

## 7. Shared chrome (`Base.astro`)

Present on every page, including home:

- Skip link → `#main`
- Sticky header: brand (cup mark + “Tea Atlas” + small “leaves, water, time”) · nav Atlas / Regions / Brewing / Glossary · theme toggle
- `<main id="main"><slot /></main>`
- Footer: “Static site — typed content collections compiled to HTML. No backend, no database.” · “Tea Atlas · {year}”
- Default meta description: *A static atlas of Chinese, Taiwanese, and Japanese teas — terroir, processing, and brewing as data.* Homepage currently uses this default (no custom `description` prop).

Nav current-page: `aria-current="page"` via path match against `BASE_URL`.

---

## 8. Homepage as built (`src/pages/index.astro`)

Wrapper: `<Base title="Tea Atlas">` then `<div class="wrap">`. No `liquor` prop. No `description` prop.

Layout width: `.wrap` is `min(1140px, calc(100% - 2.5rem))`. There is a `.wrap-wide` (1400px) used nowhere on home.

### Section A — Hero (`.hero.hero-split`)

Two columns from 900px: copy left, `SteepMark` right (SVG 220×220, sized `clamp(160px, 24vw, 280px)`). Below 900px they stack; the leaf sits under the copy, centred.

```
kicker:  "A static atlas"
h1:      Leaves, / water, / and / a / clock / you / can / trust.
         (each word wrapped in .reveal-word with --i)
lede:    `{teas.length}` teas from China, Taiwan, and Japan. Every entry is a typed
         record of terroir, processing, and a brewing schedule that drives the
         table and the timer from the same numbers — and mixes its own colour
         from its own oxidation, firing, and origin.
CTAs:    .btn → /atlas  “Browse the atlas →”
         .btn.secondary → /brewing  “Brewing guides”
```

`SteepMark.astro` is decorative (`role="img"`). It does not link, does not take a tea’s liquor (it inherits the page default), and does not preview the timer.

Headline `h1` is capped at `max-width: 15ch`, so it breaks into a short stacked poem. That is intentional typesetting, not a bug.

### Section B — Spectrum (`Spectrum.astro`)

The strongest visual on the page. All teas as a flex strip of bars, sorted by transformation index then name. Bar height follows `transformation.index`. Colour is that tea’s liquor. Each bar is a link to `/tea/{id}`.

Hover/focus: the bar scales, and a `.spectrum-read` nameplate (English + native + country · oxidation) fades in **over the axis line**. All nameplates are stacked in one slot; only the hovered one is visible. Pure CSS, no JS.

Axis: `0 — unoxidised` · `Hover a bar for the tea` · `100 — fully oxidised`. The axis itself fades out while a bar is hovered (`.spectrum:has(...)`). On viewports ≤640px the middle hint is hidden; hover still does not exist on touch.

Screen-reader: tea name is in `.sr-only` inside the link. The visible readout is `aria-hidden`.

This component is **not reused** anywhere else.

### Section C — Enter by origin

`.section-head`: “Enter by origin” / `{teas.length} entries across {regions.length} mapped regions`

Three `.row` links (China, Taiwan, Japan), each tinted by the **median-oxidation tea** of that country (`liquorStyle` on the `<a>`). Click goes to `/atlas?country=…` (atlas-filter.js reads query params on load).

Each row:

| Cell | Content |
| --- | --- |
| `.row__n` | Zero-padded count (`27`, `05`, `13`) |
| `.row__body` | Country name + `{n} regions · {categories joined}` |
| `.row__dots` | One 9px liquor-coloured `.dot` per tea (hidden ≤700px) |
| `.arrow` | → |

Hover pours a liquor wash from the left (`::before` scaleX). Taiwan’s padded `05` reads as a smaller collection next to China’s `27` — accurate, but the row has almost no visual weight because Taiwan is oolong-only (five similar ambers).

There is **no category entrance** on the homepage, despite seven categories and a liquor system that is literally an oxidation/category curve.

### Section D — Method guides

`.section-head`: “Method guides” / “Long-form, in reading order”

An `<ol class="rows numbered">` of **all 8 guides**, including knowledge essays. Each row: index, title, description, `.chip` with `method` or `knowledge`, arrow. This is a near-duplicate of `/brewing`, except brewing splits the two groups into separate lists and omits the chip.

Eight similar rows after three origin rows is a lot of list. The unique claim of the site (the clock, the cup colour) is not in this block.

### Section E — Also here

`.section-head`: “Also here” (no meta)

Three `.card` links in `.grid.card-grid`:

1. **Regions** — kicker Terroir. Copy mentions 16 places. Good secondary destination.
2. **Glossary** — kicker Language. Shows the live term count and four native examples (杀青, 焙火, 蒸し, 荒茶). This is the only native-script moment on the homepage besides spectrum hover.
3. **atlas.json** — kicker Data. Links to the raw JSON index. Honest, on-brand for “typed collections”, dead as a visitor CTA. Equal visual weight with Regions.

Cards use the default page liquor, so hover-wash is the generic gold, not a place or a tea.

No `<TeaCard>` appears on the homepage. The morph transition from swatch → tea-page cup therefore cannot start from home — only from `/atlas` or a region page.

---

## 9. Inner pages the homepage should funnel into

Use these as the “after” of any new homepage module. Do not rebuild them unless a homepage change requires a small hook (e.g. `data-tea-card` on a featured card so morph works).

**Atlas (`/atlas`)** — search + country/category/roast/oxidation/region `<select>`s. Cards are `TeaCard` with `data-*` attributes. Filters are client-side over the rendered DOM plus `/atlas.json`. Query string `?country=China` is already what origin rows deep-link to.

**Tea (`/tea/[slug]`)** — this is where the design peaks. Native-script watermark, liquor-dyed `<html>`, cup disc (`.morph-target`), chips, oxidation/firing scales, flavour dl, processing timeline, sticky `BrewTimer` + `RatioCalculator`, gongfu/western tables, water/storage/quality/faults, similar teas as liquor-tinted rows. The homepage currently promises this page without showing a fragment of it.

**Regions** — country-grouped cards with liquor dots of teas filed there. Detail pages reuse `.tea-hero` with a native watermark.

**Brewing** — method then knowledge. Detail is MDX `.prose` plus prev/next.

**Glossary** — A–Z jump index.

---

## 10. CSS class map (homepage)

| Class | Role |
| --- | --- |
| `.wrap` | Page measure |
| `.hero` / `.hero-split` | Hero padding + 2-col from 900px |
| `.kicker` | Small caps + liquor dash |
| `.reveal-word` | Clipped per-word rise |
| `.lede` | 66ch muted intro |
| `.cluster` | Flex wrap for buttons/chips |
| `.btn` / `.btn.secondary` | Pill; `::before` pours liquor up |
| `.steep-mark` + `__blade` `__vein` `__ribs` `__steam` | Hero SVG parts |
| `.spectrum` `.spectrum-strip` `.spectrum-tick` `.spectrum-read` `.spectrum-axis` | Oxidation strip |
| `.section-head` | H2 + meta, ruled |
| `.rows` `.row` `.row__n` `.row__body` `.row__dots` `.dot` `.arrow` | Link lists |
| `.chip` | Small pill (guide group) |
| `.grid.card-grid` `.card` | Also-here tiles |
| `.sr-only` | Accessible name for spectrum bars |

Tokens you will need if you add modules: `--paper`, `--paper-raised`, `--ink`, `--ink-muted`, `--line`, `--line-soft`, `--radius`, `--shadow-flat`, `--shadow-lift`, `--serif`, `--sans`, `--cjk`, `--measure`. Prefer existing patterns (`.row`, `.card`, `.tea-card`, `.section-head`) over new primitives.

---

## 11. What is already excellent — keep it

- Spectrum as a single picture of the whole atlas. Do not replace it with a generic hero image.
- Origin rows tinted by a real tea from that country, not a flag colour.
- No stock photography; liquor is the illustration.
- Filters, timer, and tables bound to the same records.
- Reduced-motion and contrast-as-number discipline.
- Cross-document morph on tea cards (once a card exists on home, wire it the same way: `a.card.tea-card[data-tea-card]` + `[data-morph]` on the swatch).

---

## 12. Homepage problems (impact and effect)

Ranked. Higher = more likely to change how the first screen *feels*. Each item is a direction, not a spec — implement with the design system above.

### P1 — The hero explains the architecture instead of showing the cup

**Now:** Kicker “A static atlas”. Lede is one sentence about typed records, schedules, and colour mixing. The decorative leaf uses the **default gold**, so the unique idea (every tea mixes its own colour) is not visible until the spectrum. The promised “clock you can trust” is not on this page at all — timer lives only on tea profiles.

**Effect:** A visitor who already drinks tea learns that this is a well-made static site. They do not yet *see* a tea, a liquor, or a steep they can trust. Tea pages (watermark + cup disc + dyed chrome) are dramatically more confident than home. Home should feel like those pages, not like a README.

**Levers (pick a coherent subset, do not do all of them at once):**

- Dye the homepage. Options: (a) pass a featured tea’s `liquorStyle` into `<Base>` so washes, links, brand-mark, and button pours are a real cup; (b) keep html default but put a featured tea’s `--lq-*` on `.hero` so only the first screen is dyed; (c) a composite wash from the three country-median teas. (a) is the strongest and matches tea pages.
- Let `SteepMark` inherit that featured liquor, or replace/augment it with the existing `.tea-hero__cup` language (radial liquor disc) so the hero contains a cup, not only a leaf.
- Rewrite kicker + lede in drinker language first, craft second. Keep one concrete proof (“the table and the timer share a schedule”) but do not lead with “typed record”.
- Compute “forty-five” from `teas.length`. The lede hardcodes it; the origin meta already uses the collection length. Drift is guaranteed.

**Copy direction (illustrative, not mandatory):**

- Kicker: something like “China · Taiwan · Japan” or a native-inclusive line, not “A static atlas”.
- Lede: name what you can *do* (open a tea, see the liquor, steep to a clock) before how it is built.
- Headline can stay. It is the best line on the page. The supporting type is what undercuts it.

**Files:** `src/pages/index.astro`, maybe `src/layouts/Base.astro` (description), `src/components/SteepMark.astro`, `src/styles/global.css` (hero only).

### P2 — After the spectrum, the page is only lists

**Now:** Spectrum (visual) → 3 origin rows → 8 guide rows → 3 cards. One pictorial idea, then eleven rows of chrome. Mobile loses the origin dots (≤700px) and the spectrum names (no hover), so below the hero it becomes almost entirely text lists.

**Effect:** The first 20% of the page is distinctive; the rest could be any docs index. Energy dies before “Also here”.

**Levers:**

- Put **faces of tea** on the homepage: 3 featured `TeaCard`s (one per country, or a curated “start here”: e.g. Long Jing, Tie Guan Yin / Alishan, Gyokuro / Sencha). Reuse `TeaCard.astro` so morph, meters, and liquor just work. This is the single highest-leverage visual addition — it is the product.
- Add a **category entrance** as a second visual band: seven short liquor-tinted links (counts + one swatch or a mini strip), routing to `/atlas?category=oolong`. Categories *are* the colour story; origins are geography. Home currently tells geography twice (origin rows + Regions card) and colour once (spectrum, hover-only).
- Cut or compress guides on home. Show the four **method** guides, or a 2×2 of methods with one line each, and one link “All guides, in reading order → /brewing”. Knowledge essays (water, ware, storage, tasting) do not need equal billing on the first page.
- Demote `atlas.json` out of the three-up. Footer or atlas page already points at it. Replace that card with a real destination: a featured region, a “open a timer” tea, or the glossary kept and Regions kept as the pair.

**Files:** `src/pages/index.astro`, `src/components/TeaCard.astro` (likely unchanged), `src/styles/global.css` if a category strip needs a new layout. Prefer composing `.card` / `.row` / `.tea-card` over new objects.

### P3 — Spectrum is mute on touch and unnamed at rest

**Now:** 45 unnamed bars. Identity is hover/focus only. Hint says “Hover a bar”. On a phone the hint is hidden and there is no hover. Keyboard users can tab (good). Touch users get a pretty stripe and accidental taps.

**Effect:** The best picture on the site does not teach. People who would be delighted by “this green is Gyokuro, this amber is Da Hong Pao” never get the names unless they happen to hover.

**Levers (keep the strip; make it speak):**

- At rest, label a few anchors along the axis (e.g. Long Jing / Tie Guan Yin / Dian Hong / Shou Puer) without covering 45 names.
- On coarse pointers (`pointer: coarse`) or ≤640px: selected-bar pattern (tap toggles `.is-active` nameplate, or first/middle/last always labelled). A few lines of JS in a tiny island is acceptable; do not rebuild Spectrum as a framework component.
- Do not rely on hover for the only identification. `prefers-reduced-motion` must still show names for the selected/focused bar.
- Optional: a “featured” bar that starts selected, tying P1’s dyed hero to one tick in the strip.

**Files:** `src/components/Spectrum.astro`, `src/styles/global.css` (spectrum block ~1420–1527). New script only if tap-to-select is needed; keep it local.

### P4 — The clock is a headline with no object

**Now:** H1 mentions a clock. No timer, no infusion table, no ratio on home. The leaf SVG is the only kinetic object, and it is not a clock.

**Effect:** The brand promise is unverifiable on the page that makes it.

**Levers:**

- A “Brew one” module: pick one tea, show 4–6 lines of its gongfu caption (vessel · ratio · temp) plus `BrewTimer` **or** a static first-infusion preview that links into `/tea/{slug}` where the real timer is. Reusing `BrewTimer.astro` is tempting; it is an island with Web Audio — only do this if it stays obviously optional and does not autoplay sound.
- Softer: a single steep bar (the `.steep-bar` language already used on tea pages) for infusion 1 of the featured tea, as a still, linking through.
- Do not put the full tea-page aside (timer + calculator + two tables) on home. That is the profile. Home needs a *glimpse*.

### P5 — Native script and bilingual identity are almost absent

**Now:** Tea pages open with a huge `nameNative` watermark. Home is English until you hover a spectrum bar or read the glossary card. The collection’s languages are the point of the glossary and half the pleasure of the cards.

**Effect:** The site feels more “design essay in English” than “atlas of 龙井 / 玉露 / 高山茶”.

**Levers:** Put `nameNative` on featured cards (TeaCard already does). Consider a quiet watermark in the hero from the featured tea. Origin rows could show a native country name once (中国 / 台灣 / 日本) as `.native`, not as decoration spam.

### P6 — Secondary CTAs compete and the close is weak

**Now:** Primary CTA Atlas, secondary Brewing — good. Then origin (also Atlas with a filter), then eight brewing links, then Regions / Glossary / JSON. Three ways to reach brewing, two ways to reach atlas, and the last beat is a JSON file.

**Effect:** No memorable last action. Scroll-end should feel like opening a door, not like a sitemap.

**Levers:** End on one decisive band: featured teas **or** “Browse the atlas” repeated as a full-width row after a short Regions+Glossary pair. JSON belongs in the footer (the footer already talks about typed collections) or on `/atlas` (already linked from the result bar).

### P7 — Smaller cuts (do if you are already touching the file)

- Homepage `<Base>` should pass a real `description` for social/SEO; the default is fine but home can be more specific.
- Taiwan `05` zero-padding next to `27` looks like a ranking. Padding is typographic; consider unpadded counts, or lead with the name and put the count in meta.
- Origin category lists are long for China (`green, white, oolong, black, dark, yellow, scented`). That is the whole taxonomy in one meta line. Prefer “7 categories · 16 regions” or a few named teas.
- Guide chips say `method` / `knowledge` in raw enum. Fine on `/brewing`; noisy on home if you keep the full list.
- `.hero` padding is large (`clamp(3rem, 9vw, 6.5rem) 0 3rem`). Combined with the sticky header, the spectrum — the actual hook — can sit below the fold on short laptop viewports. Tighten hero *or* pull spectrum up, especially if the leaf remains.
- Hardcoded title word array is cute for `--i` delays; keep it if the headline stays, don’t use the pattern for body copy.

---

## 13. Suggested first pass (if the next model should just ship)

Do a **single coherent homepage revision**, not a grab-bag:

1. **Featured tea dyes the hero** (P1). One tea, documented in `index.astro` as a chosen slug (not random per build — colour flashing on every deploy is worse than gold). Leaf / cup / buttons / brand-adjacent hero wash all follow it.
2. **Rewrite kicker + lede**; `teas.length` in copy (P1, P7).
3. **Three `TeaCard`s** under the spectrum, one per country, linking to profiles, morph-ready (P2, P5).
4. **Keep origin rows**, maybe shorten China meta (P7). Keep spectrum; add rest-state or coarse-pointer labels (P3) if time.
5. **Guides: methods only** (4 rows) + link to `/brewing` (P2).
6. **Also here: Regions + Glossary only**; move atlas.json to footer or drop from home (P6).

Out of scope for a homepage pass unless asked: new teas, changing `liquorPalette` math, replacing Fraunces, adding images, adding a framework, rebuilding `/atlas` or tea pages.

---

## 14. Acceptance checks

- `npm run check` and `npm run build` succeed (`similarTo` still resolves).
- All new links use `withBase()`.
- No ramp moved onto `:root`. Per-tea `--lq-*` still unique in the spectrum and on cards.
- Oxidation still printed as a number on any new meter.
- `prefers-reduced-motion: reduce` shows the settled hero, spectrum, and cards with no stuck opacity-0 text.
- Theme toggle still paints the new modules; dark ink contrast still holds on pale greens (spectrum already uses an inset stroke for that).
- Touch: a tea in the spectrum can be identified without hover.
- Featured / origin / category links that claim to filter the atlas actually do (`?country=` / `?category=` already supported).
- Morph: clicking a homepage `TeaCard` still morphs the swatch into the tea-page cup in supporting browsers.

---

## 15. Copy-paste prompt for the next model

Paste everything above, then:

> Revise the Tea Atlas homepage (`src/pages/index.astro` and, only as needed, `Spectrum.astro`, `SteepMark.astro`, `global.css`, `Base.astro`) for stronger first-screen impact, following §12–§14. Prefer the suggested first pass in §13. Reuse `TeaCard`, `liquorStyle`, `withBase`, and existing CSS objects. Do not add a framework, photographs, or a second colour system. Keep the oxidation spectrum; make it speak without hover. Show real teas and a real cup colour before you explain that the site is static. Match the tea-page’s confidence, not the README’s.

---

## Appendix A — Guide order (for compressing the list)

| order | id | group | title |
| --- | --- | --- | --- |
| 1 | gongfu-cha | method | Gongfu cha |
| 2 | western-grandpa | method | Western and grandpa style |
| 3 | japanese-kyusu | method | Kyusu, shiboridashi, and gyokuro heat |
| 4 | matcha | method | Matcha — usucha and koicha |
| 5 | water | knowledge | Water chemistry |
| 6 | teaware | knowledge | Teaware |
| 7 | storage | knowledge | Storage and aging |
| 8 | tasting | knowledge | Tasting and evaluation |

## Appendix B — Sensible featured slugs (if you need names)

Not a mandate — choose for liquor contrast and recognisability:

| Role | Slug | Why |
| --- | --- | --- |
| China / pale green | `long-jing` | Pan-fired gold-green; the default “Chinese green” in the public mind |
| China / roasted oolong | `da-hong-pao` or `tie-guan-yin` | Dark vs floral; both photograph in liquor |
| Taiwan | `alishan` or `dong-ding` | High-mountain vs roasted; Taiwan only has oolongs in this atlas |
| Japan | `gyokuro` or `sencha-fukamushi` | Vivid steamed green — `liquorPalette` already shifts Japan greens toward real green |
| Dark end | `shou-puer` | Proves the strip is not only greens |

Hero dye: pick **one**. Cards: pick **three** that do not share a colour (green / oolong amber / dark).

## Appendix C — Default liquor (homepage today)

Until a tea is passed to `<html>` or `.hero`:

```
--lq-l: 0.78;
--lq-c: 0.1;
--lq-h: 78;
```

That is a generic amber cup, close to mid-oxidation oolong, not any particular entry. The spectrum immediately below is more honest than the hero. Align them.

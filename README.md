# fourthsteep

A static encyclopaedia of Chinese, Taiwanese, and Japanese teas. Typed content collections, hand-written CSS, and a handful of vanilla-JS islands. There is no backend and no database: `npm run build` emits HTML into `dist/`.

**Live site (GitHub Pages):** [https://www.topeki.com/fourthsteep/](https://www.topeki.com/fourthsteep/)

## Why this repo

The original project lived in a Cursor cloud workspace with no GitHub remote — only a plan. This repository is that plan built out: Astro 7, MDX guides, and brewing schedules stored as data so the tables and the brew timer cannot disagree.

## Stack

- Node 22, npm
- Astro 7 (static output) + `@astrojs/mdx`
- Content collections in `src/content.config.ts` (Zod schemas for teas, regions, guides, glossary)
- Design tokens in `src/styles/global.css` — no CSS framework
- Islands: brew timer (Web Audio chime) and leaf-ratio calculator

## The liquor colour

Every tea carries three numbers — the OKLCH components of the cup it pours — computed by `liquorPalette()` in `src/lib/atlas.js` from its oxidation, firing, category, and origin. They ship as `--lq-l`, `--lq-c`, and `--lq-h` on the element, and `global.css` derives the rest of the ramp from them:

| Token | Used for |
| --- | --- |
| `--liquor` | swatches, bars, ring fill |
| `--liquor-deep` / `--liquor-pale` | gradient ends |
| `--liquor-wash` / `--liquor-veil` | page ambience, hover floods |
| `--liquor-ink` | text and rules, clamped for contrast per theme |

Two rules keep this working:

- The ramp is declared on `*`, not `:root`. A custom property's `var()` references are substituted where the property is **declared**, so a ramp on `:root` resolves against the root's `--lq-*` once and ignores every per-tea value below it.
- Per-theme differences are numeric knobs (`--ink-shift`, `--wash-a`, …) rather than a second copy of the ramp, so one derivation serves both themes.

Colour is never the only channel: oxidation and firing are printed as numbers beside their bars.

## Motion

Animation is transform, opacity, and custom properties only. Anything that would otherwise leave content invisible lives inside `@media (prefers-reduced-motion: no-preference)`, and a global `reduce` block cuts every remaining duration — the settled state is always the meaningful one. The header condenses on a `scroll()` timeline and the atlas grid reflows with a FLIP in `src/scripts/atlas-filter.js`; navigation uses CSS cross-document view transitions, with `src/scripts/morph.js` tagging only the clicked card.

## Scripts

```bash
npm install
npm run dev
npm run build   # also verifies similarTo slugs
npm run preview
```

## Homepage brief

`docs/homepage-structure.md` is a copy-pastable structure document for another model: current homepage anatomy, design-system invariants, and ranked impact work. Live site: [topeki.com/fourthsteep](https://www.topeki.com/fourthsteep/).

## Routes

| Path | Purpose |
| --- | --- |
| `/` | Landing |
| `/atlas` | Filterable grid + text search |
| `/atlas.json` | Build-time search index |
| `/tea/[slug]` | Profile, scales, tables, timer, calculator |
| `/regions`, `/regions/[slug]` | Terroir pages |
| `/brewing`, `/brewing/[slug]` | MDX method and knowledge guides |
| `/glossary` | Bilingual terminology |

## Content rules

- `src/content/teas/*.json` — one file per tea; `similarTo` must be real slugs (`scripts/check-similar-to.mjs`).
- Generators under `scripts/generate-*.mjs` rebuild JSON from the authored source in those scripts.
- Oxidation is a number 0–100 and is also printed so scales are not colour-only.
- Infusion arrays on each tea feed both the HTML table and the timer.

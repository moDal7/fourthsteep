# Tea Atlas

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

## Scripts

```bash
npm install
npm run dev
npm run build   # also verifies similarTo slugs
npm run preview
```

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

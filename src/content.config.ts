import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const infusion = z.object({
  n: z.number().int().positive(),
  seconds: z.number().nonnegative(),
  notes: z.string().optional(),
});

const origin = z.object({
  country: z.enum(['China', 'Taiwan', 'Japan']),
  region: z.string(),
  subregion: z.string().optional(),
});

const teas = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/teas' }),
  schema: z.object({
    name: z.string(),
    nameNative: z.string(),
    romanization: z.string(),
    translation: z.string(),
    origin,
    category: z.enum(['green', 'white', 'yellow', 'oolong', 'black', 'dark', 'scented']),
    japaneseType: z.string().optional(),
    cultivar: z.array(z.string()),
    harvest: z.object({
      season: z.string(),
      pluckingStage: z.string(),
    }),
    oxidation: z.number().min(0).max(100),
    roast: z.enum(['none', 'light', 'medium', 'heavy', 'charcoal']),
    processing: z.array(
      z.object({
        step: z.string(),
        description: z.string(),
      }),
    ),
    profile: z.object({
      aroma: z.array(z.string()),
      taste: z.array(z.string()),
      mouthfeel: z.string(),
      finish: z.string(),
    }),
    brewing: z.object({
      gongfu: z.object({
        vessel: z.string(),
        ratio: z.string(),
        waterTemp: z.number(),
        infusions: z.array(infusion).min(1),
      }),
      western: z.object({
        grams: z.number(),
        volume: z.number(),
        waterTemp: z.number(),
        infusions: z.array(infusion).min(1),
      }),
      coldBrew: z
        .object({
          grams: z.number(),
          volume: z.number(),
          hours: z.number(),
          notes: z.string().optional(),
        })
        .optional(),
    }),
    water: z.string(),
    storage: z.string(),
    qualityMarkers: z.array(z.string()),
    commonFaults: z.array(z.string()),
    similarTo: z.array(z.string()),
    summary: z.string(),
  }),
});

const regions = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/regions' }),
  schema: z.object({
    name: z.string(),
    nameNative: z.string(),
    country: z.enum(['China', 'Taiwan', 'Japan']),
    summary: z.string(),
    climate: z.string(),
    knownFor: z.array(z.string()),
  }),
});

const guides = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/guides' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    order: z.number().int(),
    group: z.enum(['method', 'knowledge']),
  }),
});

const glossary = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/glossary' }),
  schema: z.object({
    term: z.string(),
    native: z.string(),
    romanization: z.string(),
    language: z.enum(['zh', 'ja', 'en']),
    definition: z.string(),
  }),
});

export const collections = { teas, regions, guides, glossary };

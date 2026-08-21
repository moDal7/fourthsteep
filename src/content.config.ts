import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const category = z.enum(['green', 'white', 'yellow', 'oolong', 'black', 'dark', 'scented']);

const infusion = z.object({
  n: z.number().int().positive(),
  seconds: z.number().nonnegative(),
  notes: z.string().optional(),
});

const rinse = z.object({
  seconds: z.number().nonnegative(),
  notes: z.string(),
});

const coldBrew = z.object({
  grams: z.number(),
  volume: z.number(),
  hours: z.number(),
  notes: z.string().optional(),
});

const decoction = z.object({
  when: z.string(),
  minutes: z.tuple([z.number(), z.number()]),
  notes: z.string(),
});

const gongfu = z.object({
  vessel: z.string(),
  ratio: z.string(),
  waterTemp: z.number(),
  rinses: z.array(rinse).optional(),
  infusions: z.array(infusion).min(1),
  curveException: z.string().optional(),
});

const western = z.object({
  grams: z.number(),
  volume: z.number(),
  waterTemp: z.number(),
  infusions: z.array(infusion).min(1),
});

const infusionBrewing = z.object({
  kind: z.literal('infusion'),
  gongfu,
  western,
  coldBrew: coldBrew.optional(),
  decoction: decoction.optional(),
});

const suspensionVariant = z.object({
  label: z.string(),
  nameNative: z.string(),
  romanization: z.string(),
  grams: z.number(),
  ml: z.number(),
  tempC: z.number(),
  method: z.string(),
});

const suspensionBrewing = z.object({
  kind: z.literal('suspension'),
  variants: z.array(suspensionVariant).min(1),
  coldBrew: coldBrew.optional(),
});

const brewing = z.discriminatedUnion('kind', [infusionBrewing, suspensionBrewing]);

export const processingVerbs = [
  'pluck',
  'shade',
  'wither',
  'shake',
  'kill-green',
  'roll',
  'yellow',
  'oxidise',
  'pile-ferment',
  'dry',
  'roast',
  'press',
  'scent',
  'refine',
  'mill',
  'other',
] as const;

const processingStep = z.object({
  verb: z.enum(processingVerbs),
  step: z.string(),
  description: z.string(),
});

const origin = z
  .object({
    country: z.enum(['China', 'Taiwan', 'Japan']),
    regions: z.array(z.string()),
    regionNote: z.string().optional(),
    subregion: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.regions.length === 0 && !val.regionNote) {
      ctx.addIssue({
        code: 'custom',
        message: 'origin.regions may be empty only when regionNote explains why (e.g. nationwide).',
      });
    }
  });

const styleVariant = z.object({
  label: z.string(),
  nameNative: z.string().optional(),
  romanization: z.string().optional(),
  differentiator: z.string(),
  waterTemp: z.number().optional(),
  notes: z.string().optional(),
});

const qualityMarker = z.object({
  claim: z.string(),
  test: z.string().optional(),
});

const fault = z.object({
  name: z.string(),
  cause: z.string().optional(),
  tell: z.string().optional(),
});

const teas = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/teas' }),
  schema: z.object({
    name: z.string(),
    nameNative: z.string(),
    romanization: z.string(),
    translation: z.string(),
    origin,
    category,
    baseCategory: category.optional(),
    categoryNote: z.string().optional(),
    subtype: z.string().optional(),
    variety: z.enum(['sinensis', 'assamica', 'mixed']).optional(),
    cultivar: z.array(z.string()),
    harvest: z.object({
      window: z.string(),
      flush: z.string().optional(),
      note: z.string().optional(),
    }),
    pluckStandard: z.string(),
    oxidation: z.number().min(0).max(100),
    roast: z.enum(['none', 'light', 'medium', 'heavy', 'charcoal']),
    transformation: z.object({
      kind: z.enum(['none', 'enzymatic', 'microbial', 'roast']),
      index: z.number().min(0).max(100),
      note: z.string().optional(),
    }),
    processing: z.array(processingStep).min(1),
    profile: z.object({
      aroma: z.array(z.string()),
      taste: z.array(z.string()),
      mouthfeel: z.string(),
      finish: z.string(),
    }),
    brewing,
    variants: z.array(styleVariant).optional(),
    water: z.object({
      tdsPpm: z.tuple([z.number(), z.number()]).optional(),
      tempC: z.number(),
      note: z.string(),
    }),
    storage: z.string(),
    shelfLife: z
      .object({
        kind: z.enum(['drink-fresh', 'stable', 'improves']),
        window: z.string().optional(),
        note: z.string().optional(),
      })
      .optional(),
    qualityMarkers: z.array(qualityMarker),
    commonFaults: z.array(fault),
    similarTo: z.array(z.string()),
    compare: z
      .array(
        z.object({
          teaId: z.string(),
          differentiator: z.string(),
        }),
      )
      .optional(),
    glossaryRefs: z.array(z.string()).optional(),
    summary: z.string(),
  }),
});

const regions = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/regions' }),
  schema: z.object({
    name: z.string(),
    nameNative: z.string(),
    romanization: z.string().optional(),
    country: z.enum(['China', 'Taiwan', 'Japan']),
    summary: z.string(),
    climate: z.string(),
    knownFor: z.array(z.string()),
    orphan: z.boolean().optional(),
  }),
});

const guides = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/guides' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    order: z.number().int(),
    group: z.enum(['method', 'knowledge', 'leaf']),
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

import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const posts = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "src/content/posts" }),
  schema: z.object({
    title: z.string(),
    published: z.coerce.date(),
    description: z.string().optional(),
    /** capa SVG 1600×800 em /public/covers — ver "Regra das capas" no CLAUDE.md */
    cover: z.string().optional(),
    tags: z.array(z.string()).default([]),
    category: z.string().optional(),
    /** chave de uma série de src/data/series.ts — posts de série não usam category */
    series: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { posts };

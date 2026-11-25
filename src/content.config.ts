import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    kind: z.string(),
    order: z.number(),
    summary: z.string(),
    outcome: z.string(),
    home: z.boolean().default(true),
    name: z.string().optional(),
    short: z.string().optional(),
    icon: z.string().optional(),
    stack: z.array(z.string()).default([]),
    codeUrl: z.string().optional(),
    demoUrl: z.string().optional(),
    demoVideo: z.string().optional(),
    demoPoster: z.string().optional(),
    art: z.enum(['spice', 'hermes', 'video', 'dashboard']).optional(),
    note: z.string().optional(),
  }),
});

export const collections = { projects };

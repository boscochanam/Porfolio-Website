import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// One Markdown file per project. Everything rendered comes from frontmatter;
// the Markdown body is free for longer notes / a future project page.
const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    kind: z.string(), // label above the title, e.g. "Research", "Personal · daily use"
    featured: z.boolean().default(false),
    order: z.number(),
    summary: z.string(), // one line: what it is / does
    outcome: z.string(), // one line: result or status (**bold** allowed)
    stack: z.array(z.string()).default([]),
    codeUrl: z.string().optional(), // TODO per project
    demoUrl: z.string().optional(), // TODO per project
    demoVideo: z.string().optional(), // short muted MP4 under /public, e.g. /media/hermes.mp4
    demoPoster: z.string().optional(),
    // Featured card only
    problem: z.string().optional(),
    owned: z.string().optional(),
    note: z.string().optional(),
  }),
});

export const collections = { projects };

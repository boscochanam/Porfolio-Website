import { defineConfig } from 'astro/config';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, posix } from 'node:path';

function preloadSharedChunks() {
  return {
    name: 'preload-shared-chunks',
    hooks: {
      'astro:build:done': ({ dir }) => {
        const root = fileURLToPath(dir);
        const deps = (src, seen) => {
          const code = readFileSync(join(root, src), 'utf8');
          for (const [, rel] of code.matchAll(/(?:\bfrom|\bimport)\s*["'](\.{1,2}\/[^"']+\.js)["']/g)) {
            const dep = posix.join(posix.dirname(src), rel);
            if (!seen.has(dep)) { seen.add(dep); deps(dep, seen); }
          }
          return seen;
        };
        const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) =>
          e.isDirectory() ? walk(join(d, e.name)) : e.name.endsWith('.html') ? [join(d, e.name)] : []);
        for (const file of walk(root)) {
          const html = readFileSync(file, 'utf8');
          const entries = [...html.matchAll(/<script type="module" src="(\/_astro\/[^"]+)"/g)].map((m) => m[1]);
          const seen = new Set();
          for (const e of entries) deps(e, seen);
          const links = [...seen].filter((s) => !entries.includes(s)).map((s) => `<link rel="modulepreload" href="${s}">`);
          if (links.length) writeFileSync(file, html.replace('</head>', `${links.join('')}</head>`));
        }
      },
    },
  };
}

export default defineConfig({
  site: 'https://example.com',
  build: { inlineStylesheets: 'always' },
  integrations: [preloadSharedChunks()],
});

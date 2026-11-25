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

function sitemap(site) {
  return {
    name: 'sitemap',
    hooks: {
      'astro:build:done': ({ pages, dir }) => {
        const urls = pages.map((p) => p.pathname).filter((p) => p !== '404/' && p !== '404')
          .map((p) => `<url><loc>${new URL(p, site)}</loc></url>`).sort();
        writeFileSync(join(fileURLToPath(dir), 'sitemap.xml'),
          `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}</urlset>\n`);
      },
    },
  };
}

const site = 'https://boscochanam.com';

export default defineConfig({
  site,
  build: { inlineStylesheets: 'always' },
  integrations: [preloadSharedChunks(), sitemap(site)],
});

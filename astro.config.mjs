// @ts-check
import { defineConfig } from 'astro/config';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, posix } from 'node:path';

/**
 * Astro ships each page script as its own module, so a chunk two scripts share (ascii.js, ruler.js) is only
 * found after the script importing it arrives: a second round trip. After the build, add a modulepreload
 * for every module a page's scripts import, so the browser fetches them all straight from the HTML.
 * @returns {import('astro').AstroIntegration}
 */
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
  // TODO: replace with the real domain once deployed (used for canonical OG/Twitter image URLs).
  site: 'https://example.com',
  // Inline the small stylesheet so the first paint never waits on a CSS round trip.
  build: { inlineStylesheets: 'always' },
  integrations: [preloadSharedChunks()],
});

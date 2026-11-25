// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  // TODO: replace with the real domain once deployed (used for canonical OG/Twitter image URLs).
  site: 'https://example.com',
  // Inline the small stylesheet so the first paint never waits on a CSS round trip.
  build: { inlineStylesheets: 'always' },
});

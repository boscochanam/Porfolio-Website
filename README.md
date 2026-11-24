# Bosco Chanam — portfolio

Static Astro site (Astro 7.3.5, pinned). Home page plus project pages; no UI framework, a few KB of JS.

```sh
npm install
npm run dev       # http://localhost:4321
npm run build     # → dist/
npm run preview   # serve dist/
```

## Where to edit

| What | File |
| --- | --- |
| Name, positioning line, proof line, Now list, links, background, About | `src/data/site.ts` |
| Selected work cards (one file each; `featured: true` = the big card, `order` = position) | `src/content/projects/*.md` |
| Gallery entries (one object per project page; the browser controls appear automatically at 2+) | `src/data/project-pages.ts` |
| Cubing sheet prose and sections | `src/data/cubing.ts` |
| Cubing algorithms, setups, recognition notes and diagrams | `src/data/cubing-cases.json` |
| Cubing page route | `src/pages/projects/cubing/index.astro` |
| Cubing page styles | `src/styles/cubing.css` |
| Demo clip for a card | put an MP4 in `public/media/`, set `demoVideo: /media/x.mp4` (+ optional `demoPoster`) in the project's frontmatter |
| Featured architecture diagram | `src/components/ArchDiagram.astro` |
| Styles | `src/styles/global.css` (page + gallery), `src/styles/ruler.css` (gutter ruler + slider), `src/styles/cubing.css` (project pages) |
| Gutter ruler / slider / nav behaviour | `src/scripts/ruler.ts`, `slider.ts`, `nav.ts` |
| Gallery browser behaviour | `src/scripts/gallery.ts` |
| Cubing copy, checklist and contents rail | `src/scripts/cubing.ts` |
| Share card | `design/og-card.html` → render to `public/og.png` (1200×630) |

Strings in `site.ts` and project frontmatter may use `**bold**`.

### Adding a project page

1. Add a route under `src/pages/projects/<slug>/`.
2. Add an object to `src/data/project-pages.ts` with its `href`, `category`, summary and metadata.
3. If it needs a new gallery plate, extend the `art` union and add a plate component (see `src/components/CubingPlate.astro`).

With one entry the gallery index is a direct link and no arrows are shown; add a second and the index becomes a browser.

### Ruler labels

The gutter ruler reads section heads marked with `data-ruler="Label"` and `data-nav="hash"` (comma-separated for a shared label such as About/Contact). Add a new home section with those attributes and it appears in the ruler without touching the script.

## Still to fill in (search for `TODO` / `DRAFT`)

- CV PDF URL (`links.cv`)
- Real domain in `astro.config.mjs` (`site`) — canonical/OG/Twitter URLs are built from it
- `codeUrl` / `demoUrl` / `demoVideo` per selected-work card (cards link to `#` until set)
- DRAFT copy: positioning line (`site.lede`), featured `problem`, About paragraphs, share-card tagline
- Decide: keep "Work project · details under NDA" (`note` in `sop-monitoring.md`)?
- Optional: hide the Now aside on mobile so projects start sooner

## Deploy

Static output — any static host works.

- **Vercel:** import the repo, framework preset *Astro*, build command `npm run build`, output dir `dist`.
- **Cloudflare (Workers, Git-connected):** build command `npm run build`, deploy command `npx wrangler deploy`. `wrangler.jsonc` serves `dist/` as static assets, so no adapter is needed. Without that file, Cloudflare's auto-setup runs `astro add cloudflare`, which fails because the latest `@astrojs/cloudflare` needs `astro ^7.4`.
- **Cloudflare Pages (classic):** build command `npm run build`, build output directory `dist`. Pages ignores `wrangler.jsonc` (it has no `pages_build_output_dir`).
- Node 22.12+ is required (Astro 7). `.node-version` pins it for Cloudflare's build image.

After the first deploy, set `site` in `astro.config.mjs` to the real URL and redeploy so canonical and share-card URLs resolve.

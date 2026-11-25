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
| Project-page entries for the Projects grid (one object per page) | `src/data/project-pages.ts` |
| Projects index page (selected work + project pages, linked entries first) | `src/pages/projects/index.astro` |
| Projects grid tiles | `src/components/ProjectsGrid.astro` |
| Compact projects link on the home page | `src/components/ProjectsTeaser.astro` |
| Cubing sheet prose and sections | `src/data/cubing.ts` |
| Cubing algorithms, setups, recognition notes and diagrams | `src/data/cubing-cases.json` |
| Cubing page route | `src/pages/projects/cubing/index.astro` |
| Cubing page styles | `src/styles/cubing.css` |
| Demo clip for a card | put an MP4 in `public/media/`, set `demoVideo: /media/x.mp4` (+ optional `demoPoster`) in the project's frontmatter |
| Featured architecture diagram | `src/components/ArchDiagram.astro` |
| Glyph field behind the featured diagram | `src/scripts/field.ts` |
| Night-sky scene and look used by the site | `src/data/site.ts` (`sky`) |
| Sky looks (colour ramps per scene) | `src/scripts/sky/palettes.ts` |
| Sky scenes (Earth, ringed planet, Sun, Death Star II) | `src/scripts/sky/scenes/*.ts` |
| Sky engine, drawing kit, text calm zones | `src/scripts/sky/index.ts`, `src/scripts/sky/kit.ts`, `src/components/Sky.astro` |
| 404 page | `src/pages/404.astro` |
| Styles | `src/styles/global.css` (night theme tokens, page, projects grid, sky picker, 404), `src/styles/ruler.css` (gutter ruler + slider), `src/styles/cubing.css` (project pages) |
| Gutter ruler / slider / nav behaviour | `src/scripts/ruler.ts`, `slider.ts`, `nav.ts` |
| Cubing copy, checklist and contents rail | `src/scripts/cubing.ts` |
| Share card | `design/og-card.html` → render to `public/og.png` (1200×630) |

Strings in `site.ts` and project frontmatter may use `**bold**`.

### Adding a project page

1. Add a route under `src/pages/projects/<slug>/`.
2. Add an object to `src/data/project-pages.ts` with its `href`, `category`, summary and metadata.
3. If it needs a new plate visual, extend the `art` union and add a plate component (see `src/components/CubingPlate.astro`).

The `/projects/` page shows every selected-work project plus every project page at once. Entries with a `codeUrl` or `demoUrl` are listed first; entries without a public link stay at the end. Add a project-page object and it appears automatically. The home page keeps only a slim link to the grid.

### Night sky

Every page sits on a fixed canvas (`Sky.astro`) that draws one scene in lit tiles and glyphs. The scene and its look come from `sky` in `src/data/site.ts`.

- **Preview looks:** open any page with `?scenes` to get a picker of the current scene's looks. The choice is kept for the browser session. `?scene=earth|saturn|sun|deathstar` and `?palette=<look>` override the config for one page load.
- **Add a look:** add an entry under the scene in `palettes.ts`. Each key is a colour ramp (stops from shadow to highlight) or a single colour. The first entry is the scene's default.
- **Add a scene:** write a `Scene` in `src/scripts/sky/scenes/` using the drawing kit (`kit.ts`), register it in `SCENES` in `src/scripts/sky/index.ts`, and give it palettes.
- **Legibility:** the sky holds still at one strength on every page. On phones and tablets Earth is fixed dead centre behind the copy; on desktop it keeps the right-of-centre spot beside the hero. Text that sits straight on the sky dims it locally via the selectors in `CALM` in `Sky.astro` (the Now panel included). The small Sun gives way once you scroll past the hero (`?sun=` previews its other styles in `suns.ts`).
- **Motion:** every scene animates at 25 fps, with Earth's globe turning in place. It keeps one fixed spot in the viewport, so scrolling never moves it. `prefers-reduced-motion` makes every scene still; the sky then repaints only when the page moves or resizes.
- **Earth map:** `land.ts` is a 256×128 land bitmap rasterised from Natural Earth 110m land (public domain).

### Ruler labels

The gutter ruler reads section heads marked with `data-ruler="Label"` and `data-nav="hash"` (comma-separated for a shared label such as About/Contact). Add a new home section with those attributes and it appears in the ruler without touching the script.

## Still to fill in (search for `TODO` / `DRAFT`)

- CV PDF URL (`links.cv`)
- Real domain in `astro.config.mjs` (`site`) — canonical/OG/Twitter URLs are built from it
- `codeUrl` / `demoUrl` / `demoVideo` per selected-work card (links are hidden until set)
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

# Bosco Chanam — portfolio

Static Astro site (Astro 7.3.5, pinned). One page, no UI framework, ~4 KB of JS.

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
| Projects (one file each; `featured: true` = the big card, `order` = position) | `src/content/projects/*.md` |
| Demo clip for a card | put an MP4 in `public/media/`, set `demoVideo: /media/x.mp4` (+ optional `demoPoster`) in the project's frontmatter |
| Featured architecture diagram | `src/components/ArchDiagram.astro` |
| Styles | `src/styles/global.css` (page), `src/styles/ruler.css` (gutter ruler + slider) |
| Gutter ruler / slider / nav behaviour | `src/scripts/ruler.ts`, `slider.ts`, `nav.ts` |
| Share card | `design/og-card.html` → render to `public/og.png` (1200×630) |

Strings in `site.ts` and project frontmatter may use `**bold**`.

## Still to fill in (search for `TODO` / `DRAFT`)

- CV PDF URL (`links.cv`)
- Real domain in `astro.config.mjs` (`site`) — OG/Twitter image URLs are built from it
- `codeUrl` / `demoUrl` / `demoVideo` per project (cards link to `#` until set)
- DRAFT copy: positioning line (`site.lede`), featured `problem`, About paragraphs, share-card tagline
- Decide: keep "Work project · details under NDA" (`note` in `sop-monitoring.md`)?
- Optional: hide the Now aside on mobile so projects start sooner

## Deploy

Static output — any static host works.

- **Vercel:** import the repo, framework preset *Astro*, build command `npm run build`, output dir `dist`.
- **Cloudflare Pages:** build command `npm run build`, build output directory `dist`, set `NODE_VERSION` to 22 or newer.

After the first deploy, set `site` in `astro.config.mjs` to the real URL and redeploy so the share card resolves.

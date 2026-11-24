// Full-page night sky drawn as glyphs and lit tiles on a fixed canvas behind the page (Sky.astro).
// One composed scene at a time (scenes/), coloured by a named look (palettes.ts). The scene holds still at one
// strength on every page; text boxes matched by `calmSel` dim the sky behind them. Cells snap to a grid, so motion steps like a terminal.
import { REDUCE } from '../ascii';
import { lut, SKY } from './color';
import { clamp } from './math';
import { PALETTES } from './palettes';
import { createKit, type Scene } from './kit';
import { saturn } from './scenes/saturn';
import { sun } from './scenes/sun';
import { earth } from './scenes/earth';
import { deathstar } from './scenes/deathstar';

const SCENES: Record<string, Scene> = { saturn, sun, earth, deathstar };
const FRAME_MS = 40; // 25 fps

export function startSky(cv: HTMLCanvasElement, first: string, calmSel: string, firstPalette?: string) {
  const ctx = cv.getContext('2d')!;
  const k = createKit(ctx);
  const home = !!document.querySelector('.hero');
  const calmEls = [...document.querySelectorAll(calmSel)];
  const bandEl = document.querySelector<HTMLElement>('.sky-window');
  let cur = SCENES[first] ? first : 'earth', palName = '';

  /** Activate a look by name (falls back to the scene's first); ramps become lookup tables. */
  function usePalette(name?: string) {
    const set = PALETTES[cur];
    palName = name && set[name] ? name : Object.keys(set)[0];
    k.P = {};
    for (const [key, v] of Object.entries(set[palName])) k.P[key] = typeof v === 'string' ? v : lut(v);
  }

  function layout() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    k.W = innerWidth; k.H = innerHeight; k.phone = k.W <= 760; k.C = k.phone ? 10 : 12;
    cv.width = Math.round(k.W * dpr); cv.height = Math.round(k.H * dpr);
    k.gap = 1;
    k.bandRect = bandEl ? bandEl.getBoundingClientRect() : null;
    SCENES[cur].layout(k);
    k.makeStars();
  }

  // The scene holds still at one strength on every page; only `p` (how far past the hero) is tracked, so a scene
  // can let small details give way to content. Inner pages count as past the hero.
  function recede() {
    k.p = home ? clamp(scrollY / (k.H * 0.9)) : 1;
  }

  function frame() {
    k.rects = [];
    for (const e of calmEls) { const r = e.getBoundingClientRect(); if (r.width && r.bottom > -40 && r.top < k.H + 40) k.rects.push(r); }
    k.bandRect = bandEl ? bandEl.getBoundingClientRect() : null; // it scrolls with the page, so refresh it every frame
    recede();
    const dpr = cv.width / k.W;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = 1;
    ctx.fillStyle = SKY[0]; ctx.fillRect(0, 0, k.W, k.H);
    ctx.translate(0, k.oy);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    SCENES[cur].draw(k);
    ctx.globalAlpha = 1;
  }

  usePalette(firstPalette);
  layout();
  const T0 = performance.now();
  k.T = 40;
  frame();
  let last = 0, queued = false;
  if (!REDUCE) {
    const loop = (now: number) => {
      if (now - last >= FRAME_MS) { last = now; k.T = (now - T0) / 1000 + 40; frame(); }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
  // With motion reduced the sky is a still frame; redraw only when the page moves under it.
  const redraw = () => { if (REDUCE && !queued) { queued = true; requestAnimationFrame(() => { queued = false; frame(); }); } };
  addEventListener('scroll', () => { recede(); redraw(); }, { passive: true });
  addEventListener('resize', () => { layout(); frame(); });
  addEventListener('pointermove', (e) => { k.mouse = [e.clientX, e.clientY]; redraw(); }, { passive: true });
  document.addEventListener('pointerleave', () => { k.mouse = null; });

  return {
    setPalette(name: string) { usePalette(name); frame(); },
    get scene() { return cur; },
    get palette() { return palName; },
    get palettes() { return Object.keys(PALETTES[cur]); },
  };
}

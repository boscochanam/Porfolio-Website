import { REDUCE } from './glyph';
import { lut, SKY } from './color';
import { clamp } from './math';
import { PALETTES } from './palettes';
import { createKit, type Scene } from './kit';
import { saturn } from './scenes/saturn';
import { sun } from './scenes/sun';
import { earth } from './scenes/earth';
import { deathstar } from './scenes/deathstar';

const SCENES: Record<string, Scene> = { saturn, sun, earth, deathstar };
const FRAME_MS = 40;

export function startSky(cv: HTMLCanvasElement, first: string, calmSel: string, firstPalette?: string) {
  const ctx = cv.getContext('2d', { alpha: false })!;
  const k = createKit(ctx);
  const home = !!document.querySelector('.intro');
  const calmEls = [...document.querySelectorAll(calmSel)];
  let cur = SCENES[first] ? first : 'earth', palName = '', boxesDirty = true;

  function measure() {
    k.rects = [];
    for (const e of calmEls) { const r = e.getBoundingClientRect(); if (r.width && r.bottom > -40 && r.top < k.H + 40) k.rects.push(r); }
    k.calmReset();
    boxesDirty = false;
  }

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
    SCENES[cur].layout(k);
    k.makeStars();
  }

  function recede() {
    k.p = home ? clamp(scrollY / (k.H * 0.9)) : 1;
  }

  function frame() {
    if (boxesDirty) measure();
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

  if (!REDUCE) {
    let last = 0;
    const loop = (now: number) => {
      if (now - last >= FRAME_MS) { last = now; k.T = (now - T0) / 1000 + 40; frame(); }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    addEventListener('pointermove', (e) => { k.mouse = [e.clientX, e.clientY]; }, { passive: true });
    document.addEventListener('pointerleave', () => { k.mouse = null; });
  } else {
    addEventListener('load', () => { boxesDirty = true; frame(); }, { once: true });
  }
  const remeasure = () => { boxesDirty = true; if (REDUCE) frame(); };
  document.fonts?.ready.then(remeasure);
  document.fonts?.addEventListener?.('loadingdone', remeasure);
  let settle = 0;
  addEventListener('scroll', () => {
    boxesDirty = true;
    recede();
    if (!REDUCE) return;
    clearTimeout(settle);
    settle = window.setTimeout(frame, 120);
  }, { passive: true });
  let rz = 0;
  addEventListener('resize', () => {
    clearTimeout(rz);
    rz = window.setTimeout(() => {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      if (innerWidth === k.W && innerHeight === k.H && dpr === cv.width / k.W) return;
      layout(); boxesDirty = true; frame();
    }, 120);
  });

  return {
    setPalette(name: string) { usePalette(name); frame(); },
    get scene() { return cur; },
    get palette() { return palName; },
    get palettes() { return Object.keys(PALETTES[cur]); },
  };
}

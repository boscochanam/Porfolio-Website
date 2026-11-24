// Full-page night sky drawn as glyphs and lit tiles on a fixed canvas behind the page.
// One composed scene at a time (see SCENES); site.ts picks it, `?scene=` overrides it.
// Cells snap to a grid, so motion steps like a terminal. Text areas listed in `calm` dim the sky behind them.
import { LAND, LAND_W, LAND_H } from './land';
import { MONO, RAMP, REDUCE, hash } from './ascii';

export const SCENES: Record<string, string> = {
  saturn: 'Ringed planet',
  sun: 'The Sun',
  earth: 'Earth and Moon',
};

// ── palette ─────────────────────────────────────────
type RGB = [number, number, number];
const rgb = (h: string): RGB => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
/** Colour ramp from stops, sampled into a lookup table. */
function lut(stops: [number, string][], n = 40): string[] {
  const s = stops.map(([p, h]) => [p, rgb(h)] as [number, RGB]), out: string[] = [];
  for (let i = 0; i < n; i++) {
    const v = i / (n - 1);
    let k = 0;
    while (k < s.length - 2 && v > s[k + 1][0]) k++;
    const [p0, c0] = s[k], [p1, c1] = s[k + 1], f = Math.min(1, Math.max(0, (v - p0) / (p1 - p0 || 1)));
    out.push(`rgb(${c0.map((c, j) => Math.round(c + (c1[j] - c) * f)).join(',')})`);
  }
  return out;
}
const at = (l: string[], v: number) => l[Math.max(0, Math.min(l.length - 1, Math.round(v * (l.length - 1))))];

const SKY = ['#0d0e12', '#121115', '#111110'];
const STAR = '#f3f1ec', WARM = '#e6bf73', COOL = '#a9bcd9', LINE = 'rgba(207,202,192,';
const GRAT = 'rgba(207,202,192,.045)', GRAT_LAB = 'rgba(207,202,192,.22)';
const ON_LIGHT = 'rgba(17,17,16,.42)', ON_DARK = 'rgba(243,241,236,.30)';
const RED = '#d01b0b';

// ── palettes ────────────────────────────────────────
// Each scene has named palettes. Ramps are colour stops from shadow to highlight; strings are single colours;
// `glow`/`halo` are "r,g,b" for soft gradients. The first palette of a scene is its default.
type Stops = [number, string][];
type PalDef = Record<string, Stops | string>;
const MOON_S: Stops = [[0, '#1a1a18'], [0.2, '#33322e'], [0.4, '#55524b'], [0.6, '#8f8a80'], [0.8, '#cfcac0'], [1, '#f3f1ec']];
const MARS_S: Stops = [[0, '#2a0a05'], [0.25, '#5a1208'], [0.5, '#9a170b'], [0.75, '#d01b0b'], [1, '#ef5a3c']];
export const PALETTES: Record<string, Record<string, PalDef>> = {
  saturn: {
    Gold: {
      zone: [[0, '#2a1d10'], [0.4, '#8a6534'], [0.7, '#d9ad62'], [1, '#f6e2ac']], belt: [[0, '#22150c'], [0.4, '#6e4524'], [0.7, '#b07a3c'], [1, '#dcae6a']],
      pole: [[0, '#1c2026'], [0.5, '#5d6a76'], [1, '#a9b6c0']], ring: [[0, '#1d1a16'], [0.45, '#7d7262'], [0.8, '#c9bc9c'], [1, '#efe6cc']],
      storm: MARS_S, redmoon: MARS_S, moon: MOON_S, haze: '#e6bf73',
    },
    Cassini: {
      zone: [[0, '#2a2418'], [0.4, '#8c7a58'], [0.7, '#d8c69c'], [1, '#f8eed2']], belt: [[0, '#221c12'], [0.4, '#6e5c3e'], [0.7, '#b49c6e'], [1, '#e2d0a4']],
      pole: [[0, '#1a2228'], [0.5, '#5c7684'], [1, '#a8c4d0']], ring: [[0, '#1a1814'], [0.45, '#77705f'], [0.8, '#c8bea4'], [1, '#f2ead6']],
      storm: [[0, '#2a1c10'], [0.5, '#a87a48'], [1, '#f0d0a0']], redmoon: [[0, '#2a1608'], [0.5, '#b0703a'], [1, '#f0b070']], moon: MOON_S, haze: '#f2e6c4',
    },
    Ember: {
      zone: [[0, '#1a0c08'], [0.4, '#6a2414'], [0.7, '#c0442a'], [1, '#f2a080']], belt: [[0, '#120806'], [0.4, '#3e140c'], [0.7, '#7a2618'], [1, '#b8503a']],
      pole: [[0, '#141012'], [0.5, '#4a3a40'], [1, '#8a7a80']], ring: [[0, '#141010'], [0.45, '#5e4a44'], [0.8, '#a8908a'], [1, '#e0ccc4']],
      storm: [[0, '#2a2018'], [0.5, '#d8b080'], [1, '#fff0d0']], redmoon: [[0, '#2a2018'], [0.5, '#d8b080'], [1, '#fff0d0']], moon: MOON_S, haze: '#f08060',
    },
    Mono: {
      zone: [[0, '#141414'], [0.5, '#808080'], [1, '#f0f0f0']], belt: [[0, '#0c0c0c'], [0.5, '#5a5a5a'], [1, '#c0c0c0']],
      pole: [[0, '#101010'], [0.5, '#4a4a4a'], [1, '#9a9a9a']], ring: [[0, '#121212'], [0.5, '#707070'], [1, '#e8e8e8']],
      storm: MARS_S, redmoon: MARS_S, moon: MOON_S, haze: '#e0e0e0',
    },
    'Ice giant': {
      zone: [[0, '#06142a'], [0.4, '#1a4a8a'], [0.7, '#3c84d0'], [1, '#a8d8ff']], belt: [[0, '#040e20'], [0.4, '#123a72'], [0.7, '#2a6ab0'], [1, '#80b8f0']],
      pole: [[0, '#0a1830'], [0.5, '#3a6aa0'], [1, '#b0d0f0']], ring: [[0, '#141820'], [0.45, '#5a6878'], [0.8, '#a8b8c8'], [1, '#e8f0f8']],
      storm: [[0, '#06102a'], [0.5, '#14306a'], [1, '#6080c0']], redmoon: MARS_S, moon: MOON_S, haze: '#9fdcff',
    },
  },
  sun: {
    Classic: { sun: [[0, '#4a1004'], [0.2, '#8f240a'], [0.4, '#c2410f'], [0.58, '#e2691b'], [0.74, '#f2932c'], [0.86, '#f9bd52'], [0.95, '#fde39a'], [1, '#fff6d8']], prom: [[0, '#5a1208'], [0.5, RED], [1, '#f2a03a']], corona: '#f2b45a', glow: '255,170,90' },
    Ember: { sun: [[0, '#2a0402'], [0.3, '#6a0c04'], [0.55, '#b01c08'], [0.8, '#e8501a'], [1, '#ffb070']], prom: [[0, '#3a0804'], [0.5, RED], [1, '#ff8a50']], corona: '#e8603a', glow: '220,60,30' },
    White: { sun: [[0, '#6a5a40'], [0.3, '#c8b088'], [0.6, '#f0e2c0'], [0.85, '#fff8e8'], [1, '#ffffff']], prom: [[0, '#5a1208'], [0.5, RED], [1, '#ffb080']], corona: '#f3f1ec', glow: '255,240,210' },
    'H-alpha': { sun: [[0, '#1a0202'], [0.25, '#5a0806'], [0.5, '#a01410'], [0.75, '#e04020'], [0.92, '#ff8a40'], [1, '#ffd090']], prom: [[0, '#6a0a06'], [0.5, '#ff3a1a'], [1, '#ffc080']], corona: '#ff6a3a', glow: '255,60,20' },
    Gold: { sun: [[0, '#3a2408'], [0.3, '#8a5a18'], [0.6, '#d09a3a'], [0.85, '#f6d68a'], [1, '#fff4d0']], prom: [[0, '#5a3a10'], [0.5, '#d09a3a'], [1, '#fff0b0']], corona: '#e6bf73', glow: '230,191,115' },
  },
  earth: {
    'Blue Marble': {
      ocean: [[0, '#03122e'], [0.3, '#0a3170'], [0.55, '#1252a8'], [0.75, '#1f74cf'], [0.9, '#3d9be6'], [1, '#8fd0ff']], shallow: [[0, '#062a3a'], [0.5, '#0f6f8c'], [0.8, '#21a7b8'], [1, '#7fe0e0']],
      green: [[0, '#0c1a08'], [0.35, '#1f4a17'], [0.6, '#3c7a25'], [0.8, '#6a9f3a'], [1, '#a8c46a']], desert: [[0, '#2a1a0a'], [0.4, '#8a5a2a'], [0.7, '#d09a55'], [0.9, '#ecc48a'], [1, '#f8e2b8']],
      tundra: [[0, '#1c1a16'], [0.5, '#6b6650'], [1, '#b8b49a']], ice: [[0, '#2c3a4a'], [0.5, '#b8c8d8'], [1, '#ffffff']],
      cloud: [[0, '#2a3038'], [0.4, '#a8b2bd'], [0.75, '#eef2f6'], [1, '#ffffff']], dusk: [[0, '#2a1410'], [0.5, '#a8583a'], [1, '#f2a06a']],
      atmo: [[0, '#123a6e'], [0.6, '#4aa6e8'], [1, '#bfe8ff']], moon: MOON_S, city: '#e6bf73', halo: '90,170,255', rim1: '#9fdcff', rim2: '#3d8fe0',
    },
    'Gold & ink': {
      ocean: [[0, '#07090d'], [0.4, '#141a24'], [0.7, '#26303d'], [1, '#4a5666']], shallow: [[0, '#0b1014'], [0.6, '#2a3a40'], [1, '#5b7378']],
      green: [[0, '#1a1208'], [0.4, '#6b4a1f'], [0.7, '#c08a3e'], [1, '#f0cf8a']], desert: [[0, '#1f160a'], [0.5, '#8f6a35'], [1, '#f6dca0']],
      tundra: [[0, '#16140f'], [0.5, '#5e584a'], [1, '#a8a290']], ice: [[0, '#2a2926'], [0.5, '#cfcac0'], [1, '#f3f1ec']],
      cloud: [[0, '#24221e'], [0.5, '#9a958b'], [1, '#f3f1ec']], dusk: [[0, '#2a0a05'], [0.5, '#9a170b'], [1, '#ef5a3c']],
      atmo: [[0, '#2a2418'], [0.6, '#8a7a55'], [1, '#e6d3a0']], moon: MOON_S, city: RED, halo: '230,191,115', rim1: '#f3dca0', rim2: '#a87436',
    },
    'Mono + red': {
      ocean: [[0, '#060607'], [0.5, '#1e1f22'], [1, '#4a4c50']], shallow: [[0, '#0a0a0b'], [0.6, '#34363a'], [1, '#6a6d72']],
      green: [[0, '#121212'], [0.5, '#6a6a6a'], [1, '#c8c8c8']], desert: [[0, '#161616'], [0.5, '#8a8a8a'], [1, '#e6e6e6']],
      tundra: [[0, '#141414'], [0.5, '#5a5a5a'], [1, '#b0b0b0']], ice: [[0, '#2a2a2a'], [1, '#ffffff']],
      cloud: [[0, '#222222'], [0.6, '#bbbbbb'], [1, '#ffffff']], dusk: [[0, '#2a0a05'], [0.5, '#9a170b'], [1, '#ef5a3c']],
      atmo: [[0, '#1a1a1c'], [0.6, '#77797e'], [1, '#d8dadf']], moon: MOON_S, city: RED, halo: '200,200,210', rim1: '#e8e8ec', rim2: '#777a80',
    },
    Sunset: {
      ocean: [[0, '#0c0620'], [0.35, '#2a1460'], [0.65, '#5a2a8c'], [0.85, '#a04aa8'], [1, '#f08ab8']], shallow: [[0, '#160a24'], [0.6, '#8a3a7a'], [1, '#f2a0b0']],
      green: [[0, '#1a0c06'], [0.4, '#7a3a14'], [0.7, '#d0702a'], [1, '#ffc070']], desert: [[0, '#200e06'], [0.5, '#c06a2a'], [1, '#ffe0a0']],
      tundra: [[0, '#1a1014'], [0.5, '#7a5a64'], [1, '#d8b8c0']], ice: [[0, '#2a2030'], [0.5, '#e0c8e0'], [1, '#fff4fa']],
      cloud: [[0, '#2a1a24'], [0.5, '#e8b8b0'], [1, '#fff0e8']], dusk: [[0, '#2a0a05'], [0.5, RED], [1, '#ffb060']],
      atmo: [[0, '#2a1050'], [0.6, '#c060c0'], [1, '#ffd0f0']], moon: MOON_S, city: '#ffd070', halo: '220,110,200', rim1: '#ffc0f0', rim2: '#a040a0',
    },
    Arctic: {
      ocean: [[0, '#02101a'], [0.4, '#063a52'], [0.7, '#0e6e8a'], [1, '#6fd0e0']], shallow: [[0, '#03202a'], [0.6, '#2aa0b0'], [1, '#b0f0f0']],
      green: [[0, '#0e1a1a'], [0.5, '#5a7a78'], [1, '#c8dcd8']], desert: [[0, '#1a1a18'], [0.5, '#a09a88'], [1, '#f0ece0']],
      tundra: [[0, '#141a1e'], [0.5, '#7890a0'], [1, '#dce8f0']], ice: [[0, '#203040'], [0.5, '#d8ecff'], [1, '#ffffff']],
      cloud: [[0, '#22303a'], [0.5, '#c8dce8'], [1, '#ffffff']], dusk: [[0, '#101a2a'], [0.5, '#6080c0'], [1, '#c0d8ff']],
      atmo: [[0, '#0a2a40'], [0.6, '#5ac8f0'], [1, '#e0f8ff']], moon: MOON_S, city: '#bfe8ff', halo: '120,220,255', rim1: '#c8f4ff', rim2: '#2a9ad0',
    },
  },
};

// ── math ─────────────────────────────────────────────
const norm = (v: number[]) => { const l = Math.hypot(...v); return v.map((x) => x / l); };
const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const smooth = (e0: number, e1: number, x: number) => { const t = clamp((x - e0) / (e1 - e0)); return t * t * (3 - 2 * t); };
const TAU = Math.PI * 2;
const wrap = (a: number) => ((a % TAU) + TAU) % TAU;
function vn(x: number, y: number) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi, 17), b = hash(xi + 1, yi, 17), c = hash(xi, yi + 1, 17), d = hash(xi + 1, yi + 1, 17);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x: number, y: number) { let s = 0, a = 0.5, f = 1; for (let i = 0; i < 4; i++) { s += a * vn(x * f, y * f); f *= 2.03; a *= 0.5; } return s / 0.9375; }
const LIGHT = norm([-0.6, -0.45, 0.66]);
/** Moon surface lit from `light`: grey regolith, darker maria, a soft terminator. */
const lunar = (light: number[]) => (dx: number, dy: number, nz: number) => {
  const lit = dx * light[0] + dy * light[1] + nz * light[2];
  if (lit < 0) return { v: 0.03 };
  const mare = fbm(dx * 2.2 + 7, dy * 2.2 + 3) > 0.56 ? 0.68 : 1;
  return { v: (0.12 + 0.88 * smooth(-0.05, 0.6, lit)) * mare * (0.9 + 0.1 * fbm(dx * 9, dy * 9)) };
};

const landBits = Uint8Array.from(atob(LAND), (c) => c.charCodeAt(0));
function isLand(lon: number, lat: number) {
  const u = Math.floor((wrap(lon) / TAU) * LAND_W) % LAND_W;
  const v = clamp(Math.floor((0.5 - lat / Math.PI) * LAND_H), 0, LAND_H - 1);
  const i = v * LAND_W + u;
  return (landBits[i >> 3] >> (7 - (i & 7))) & 1;
}
const slope = (dx: number, dy: number) => Math.abs(dx) > 2 * Math.abs(dy) ? '-' : Math.abs(dy) > 2 * Math.abs(dx) ? '|' : dx * dy > 0 ? '\\' : '/';

type ShadeFn = (dx: number, dy: number, nz: number, v: number) => { v: number; ramp?: string[] };

export function startSky(cv: HTMLCanvasElement, first: string, calmSel: string, firstPalette?: string) {
  let P: Record<string, any> = {}, palName = '';
  /** Activate a palette by name (falls back to the scene's first); ramps become lookup tables. */
  const usePalette = (scene: string, name?: string) => {
    const set = PALETTES[scene];
    palName = name && set[name] ? name : Object.keys(set)[0];
    P = {};
    for (const [k, v] of Object.entries(set[palName])) P[k] = typeof v === 'string' ? v : lut(v);
  };
  const ctx = cv.getContext('2d')!;
  let W = 0, H = 0, C = 12, phone = false, mouse: [number, number] | null = null, oy = 0;
  const home = !!document.querySelector('.hero');
  let calmEls: Element[] = [], rects: DOMRect[] = [];
  let pivot = { x: 0, y: 0 }, starDensity = 5200;
  let stars: { a: number; d: number; b: number; tw: number; ph: number; tint: number }[] = [];
  const L: Record<string, any> = {};

  // ── calm zones ──
  const measure = () => {
    rects = [];
    for (const e of calmEls) { const r = e.getBoundingClientRect(); if (r.width && r.bottom > -40 && r.top < H + 40) rects.push(r); }
  };
  const calmAt = (X: number, y: number) => {
    let f = 1;
    const Y = y + oy;
    for (const r of rects) {
      const dx = Math.max(r.left - 16 - X, 0, X - r.right - 16), dy = Math.max(r.top - 16 - Y, 0, Y - r.bottom - 16);
      const k = 0.18 + Math.hypot(dx, dy) / 70;
      if (k < f) f = k;
    }
    return f;
  };

  // ── cells ──
  const snap = (v: number) => Math.floor(v / C);
  const tileFont = () => { ctx.font = `600 ${Math.round(C * 0.56)}px ${MONO}`; };
  const glyphFont = (k = 0.8) => { ctx.font = `600 ${Math.round(C * k)}px ${MONO}`; };
  function tile(X: number, Y: number, col: string, v: number, a: number, s = C) {
    if (X < -s || Y + oy < -s || X > W || Y + oy > H) return;
    ctx.globalAlpha = a;
    ctx.fillStyle = col;
    if (s < 10) { ctx.fillRect(X + 0.5, Y + 0.5, s - 1, s - 1); return; } // too small for a glyph
    ctx.beginPath(); ctx.roundRect(X + 0.75, Y + 0.75, s - 1.5, s - 1.5, 2); ctx.fill();
    ctx.fillStyle = v > 0.55 ? ON_LIGHT : ON_DARK;
    ctx.fillText(RAMP[Math.max(1, Math.min(9, Math.round(v * 9)))], X + s / 2, Y + s / 2 + 1);
  }
  function glyph(X: number, Y: number, g: string, col: string, a: number) {
    if (X < -C || Y + oy < -C || X > W || Y + oy > H || a < 0.02) return;
    ctx.globalAlpha = a; ctx.fillStyle = col; ctx.fillText(g, X + C / 2, Y + C / 2 + 1);
  }
  /** Sphere drawn cell by cell. `fn` adjusts brightness or swaps the ramp; `skip` hides occluded cells. */
  function sphere(cx: number, cy: number, R: number, ramp: string[], light: number[], fn?: ShadeFn, skip?: (x: number, y: number) => boolean, s = C) {
    tileFont();
    const sn = (v: number) => Math.floor(v / s);
    for (let gy = sn(cy - R); gy <= sn(cy + R); gy++) for (let gx = sn(cx - R); gx <= sn(cx + R); gx++) {
      const x = (gx + 0.5) * s, y = (gy + 0.5) * s, dx = (x - cx) / R, dy = (y - cy) / R, d2 = dx * dx + dy * dy;
      if (d2 > 1 || (skip && skip(x, y))) continue;
      const nz = Math.sqrt(1 - d2);
      let v = 0.06 + 0.94 * Math.max(0, dx * light[0] + dy * light[1] + nz * light[2]), r = ramp;
      if (fn) { const o = fn(dx, dy, nz, v); v = o.v; if (o.ramp) r = o.ramp; }
      tile(gx * s, gy * s, at(r, v), v, calmAt(x, y), s);
    }
  }
  // ── shared backdrop ──
  function makeStars() {
    stars = [];
    const span = Math.hypot(W, H) * 1.6, n = Math.round((Math.PI * span * span) / (phone ? starDensity * 1.35 : starDensity));
    for (let i = 0; i < n; i++) stars.push({ a: hash(i, 1, 3) * TAU, d: Math.sqrt(hash(i, 2, 5)) * span, b: Math.pow(hash(i, 3, 7), 2.2), tw: 0.6 + hash(i, 4, 9) * 2.2, ph: hash(i, 5, 1) * 6, tint: hash(i, 6, 2) });
  }
  function backdrop(haze: string[] = []) {
    ctx.globalAlpha = 1;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, SKY[0]); g.addColorStop(0.6, SKY[1]); g.addColorStop(1, SKY[2]);
    ctx.fillStyle = g; ctx.fillRect(0, -oy, W, H);
    haze.forEach((c, i) => {
      const x = W * (0.62 + 0.25 * Math.sin(T * 0.02 + i * 2.2)), y = H * (0.4 + 0.3 * Math.cos(T * 0.017 + i * 1.4)), r = Math.max(W, H) * (0.42 - 0.06 * i);
      const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
      rg.addColorStop(0, c); rg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
    });
  }
  const rot = () => T * 0.006;
  const skyXY = (a: number, d: number) => [pivot.x + Math.cos(a + rot()) * d, pivot.y + Math.sin(a + rot()) * d];
  function drawStars(veil?: (x: number, y: number) => number) {
    glyphFont(0.78);
    for (const s of stars) {
      const [x, y] = skyXY(s.a, s.d);
      if (x < -C || y + oy < -C || x > W || y + oy > H) continue;
      let b = s.b * (0.65 + 0.35 * Math.sin(T * s.tw + s.ph));
      if (mouse) { const d = Math.hypot(x - mouse[0], y + oy - mouse[1]); if (d < 140) b = Math.min(1, b + 0.5 * (1 - d / 140)); }
      if (veil) b *= veil(x, y);
      if (b < 0.04) continue;
      glyph(snap(x) * C, snap(y) * C, b > 0.75 ? '✦' : b > 0.45 ? '*' : b > 0.22 ? '+' : '·', s.tint > 0.9 ? WARM : s.tint > 0.8 ? COOL : STAR, Math.min(1, 0.25 + b) * calmAt(x, y));
    }
  }
  function graticule() {
    ctx.globalAlpha = 1; ctx.strokeStyle = GRAT; ctx.lineWidth = 1;
    const maxR = Math.hypot(W + Math.abs(pivot.x), H + Math.abs(pivot.y)), r0 = rot();
    for (let r = C * 8; r < maxR; r += C * 8) { ctx.beginPath(); ctx.arc(pivot.x, pivot.y, r, 0, TAU); ctx.stroke(); }
    for (let k = 0; k < 24; k++) { const a = (k * Math.PI) / 12 + r0; ctx.beginPath(); ctx.moveTo(pivot.x, pivot.y); ctx.lineTo(pivot.x + Math.cos(a) * maxR, pivot.y + Math.sin(a) * maxR); ctx.stroke(); }
    glyphFont(0.62);
    for (let k = 0; k < 24; k += 2) {
      const a = (k * Math.PI) / 12 + r0, x = pivot.x + Math.cos(a) * C * 32, y = pivot.y + Math.sin(a) * C * 32;
      if (x > 0 && x < W && y > 0 && y < H) glyph(x - C / 2, y - C / 2, `${k}h`, GRAT_LAB, calmAt(x, y));
    }
  }

  let T = 0;

  // ── scenes ──
  const CONST = [
    { at: [0.5, 0.14], pts: [[0, 0], [4, 3], [7, 0], [11, 3], [14, -1]], ln: [[0, 1], [1, 2], [2, 3], [3, 4]] },
    { at: [0.06, 0.66], pts: [[0, 0], [8, 1], [3, 6], [4.5, 6.6], [6, 7.2], [1, 13], [9, 12]], ln: [[0, 2], [1, 4], [2, 3], [3, 4], [2, 5], [4, 6]] },
    { at: [0.38, 0.84], pts: [[0, 0], [4, 1], [7, 2], [10, 4], [11, 8], [16, 8], [17, 4]], ln: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 3]] },
  ];
  function constellations() {
    const r0 = rot(), cs = Math.cos(r0), sn = Math.sin(r0);
    for (const k of CONST) {
      const bx = W * k.at[0] - pivot.x, by = H * k.at[1] - pivot.y, a = Math.atan2(by, bx) + r0, d = Math.hypot(bx, by);
      const pts = k.pts.map(([u, v]) => { const ox = u * C * 1.25, oy = v * C * 1.25; return [pivot.x + Math.cos(a) * d + ox * cs - oy * sn, pivot.y + Math.sin(a) * d + ox * sn + oy * cs]; });
      let lit = 0.32;
      if (mouse) { const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length, cy = pts.reduce((s, p) => s + p[1], 0) / pts.length, dd = Math.hypot(cx - mouse[0], cy - mouse[1]); if (dd < 260) lit += 0.45 * (1 - dd / 260); }
      glyphFont(0.7);
      for (const [i, j] of k.ln) {
        const x0 = snap(pts[i][0]), y0 = snap(pts[i][1]), x1 = snap(pts[j][0]), y1 = snap(pts[j][1]);
        const dx = x1 - x0, dy = y1 - y0, n = Math.max(Math.abs(dx), Math.abs(dy)), g = slope(dx, dy);
        for (let s = 1; s < n; s++) { const gx = Math.round(x0 + (dx * s) / n), gy = Math.round(y0 + (dy * s) / n); glyph(gx * C, gy * C, g, LINE + '1)', lit * calmAt(gx * C, gy * C)); }
      }
      glyphFont(0.9);
      for (const [x, y] of pts) glyph(snap(x) * C, snap(y) * C, '✦', STAR, Math.min(1, lit * 2.6) * calmAt(x, y));
    }
  }
  function comet(period = 18) {
    const cp = (T % period) / 6;
    if (cp >= 1) return;
    const sx = W * 1.05, sy = H * 0.04, ex = W * 0.48, ey = H * 0.4, hx = sx + (ex - sx) * cp, hy = sy + (ey - sy) * cp;
    const ux = sx - ex, uy = sy - ey, ul = Math.hypot(ux, uy), tail = '@*=-~-·  ·';
    glyphFont(0.8);
    for (let i = tail.length - 1; i >= 0; i--) {
      if (tail[i] === ' ') continue;
      const x = hx + (ux / ul) * i * C * 1.1, y = hy + (uy / ul) * i * C * 1.1;
      glyph(snap(x) * C, snap(y) * C, tail[i], '#dce6f5', (1 - i / tail.length) * calmAt(x, y) * Math.min(1, (1 - cp) * 4));
    }
  }
  /** Small body on a tilted orbit; returns whether it is behind the primary. */
  function orbiter(cx: number, cy: number, R: number, radius: number, speed: number, tilt: number, k: number, size: number, ramp: string[], light: number[], back: boolean, occl: (x: number, y: number) => boolean, fn?: ShadeFn, s = C) {
    const oa = T * speed, ou = Math.cos(oa) * radius, ow = Math.sin(oa) * radius * k;
    const x = cx + ou * Math.cos(tilt) - ow * Math.sin(tilt), y = cy + ou * Math.sin(tilt) + ow * Math.cos(tilt);
    const behind = Math.sin(oa) < 0;
    if (behind === back) sphere(x, y, size, ramp, light, fn, behind ? occl : undefined, s);
  }

  type Scene = { layout(): void; draw(): void; density?: number };
  const scenes: Record<string, Scene> = {
    saturn: {
      layout() {
        L.p = phone ? { x: W * 0.66, y: H * 0.8, r: Math.min(W * 0.2, 110) } : { x: W * 0.77, y: H * 0.56, r: Math.min(H * 0.24, W * 0.14) };
        L.m = phone ? { x: W * 0.86, y: H * 0.56, r: C * 3 } : { x: W * 0.92, y: H * 0.2, r: Math.max(C * 4, H * 0.08) };
        pivot = phone ? { x: W * 0.2, y: -H * 0.4 } : { x: W * 0.42, y: -H * 0.9 };
      },
      draw() {
        backdrop(['rgba(52,70,112,.20)', 'rgba(96,62,104,.14)', 'rgba(150,110,60,.08)']);
        graticule(); drawStars(); constellations(); comet();
        const { x: px, y: py, r: R } = L.p, fine = phone ? 5 : 6, sn = (v: number) => Math.floor(v / fine);
        // Ring plane: tilted on screen, foreshortened to k; n is its normal in view space (y down, z toward the viewer).
        const tilt = -0.24, k = 0.3, ct = Math.cos(tilt), st = Math.sin(tilt), q = Math.sqrt(1 - k * k), n = norm([st * q, -ct * q, k]);
        const dotL = (a: number[]) => a[0] * LIGHT[0] + a[1] * LIGHT[1] + a[2] * LIGHT[2];
        // Radial profile in planet radii: C ring, B ring, Cassini Division, A ring with the Encke Gap.
        const ringI = (r: number) =>
          r < 1.24 || r > 2.27 ? 0
          : r < 1.53 ? 0.26 + 0.06 * Math.sin(r * 90)
          : r < 1.95 ? 0.82 + 0.1 * Math.sin(r * 140) + 0.06 * Math.sin(r * 53)
          : r < 2.03 ? 0.03
          : r > 2.2 && r < 2.214 ? 0.05
          : 0.62 + 0.08 * Math.sin(r * 120);
        const ring3 = (x: number, y: number) => { const dx = (x - px) / R, dy = (y - py) / R; return [dx, dy, -(dx * n[0] + dy * n[1]) / n[2]]; };
        const ringPass = (front: boolean) => {
          const e = R * 2.32;
          for (let gy = sn(py - e * 0.75); gy <= sn(py + e * 0.75); gy++) for (let gx = sn(px - e); gx <= sn(px + e); gx++) {
            const x = (gx + 0.5) * fine, y = (gy + 0.5) * fine, Q = ring3(x, y), r = Math.hypot(Q[0], Q[1], Q[2]), I = ringI(r);
            if (I <= 0 || Q[2] > 0 !== front || (!front && Q[0] * Q[0] + Q[1] * Q[1] < 1)) continue;
            // planet's shadow on the rings: does the ray toward the Sun hit the globe?
            const b = dotL(Q), shadow = b * b - (r * r - 1) > 0 && b < 0 ? 0.2 : 1;
            const v = clamp((0.35 + 0.65 * I) * shadow * (0.86 + 0.14 * Math.sin(r * 31)));
            tile(gx * fine, gy * fine, at(P.ring, v), v, (0.3 + 0.65 * I) * calmAt(x, y), fine);
          }
        };
        const occl = (x: number, y: number) => { const Q = ring3(x, y); return (x - px) ** 2 + (y - py) ** 2 < R * R || (Q[2] > 0 && ringI(Math.hypot(Q[0], Q[1], Q[2])) > 0.3); };
        const mr = Math.max(fine * 3, R * 0.17), moonFn = lunar(LIGHT);
        const redMoon: ShadeFn = (dx, dy, nz) => ({ v: 0.1 + 0.9 * smooth(-0.05, 0.6, dx * LIGHT[0] + dy * LIGHT[1] + nz * LIGHT[2]) * (0.85 + 0.15 * fbm(dx * 5, dy * 5)) });
        orbiter(px, py, R, 2.75 * R, 0.22, tilt, k, mr, P.redmoon, LIGHT, true, occl, redMoon, fine);
        ringPass(false);
        sphere(px, py, R, P.zone, LIGHT, (dx, dy, nz) => {
          const day = smooth(-0.05, 0.35, dotL([dx, dy, nz]));
          let shade = 0.06 + 0.94 * day * (0.5 + 0.5 * nz);
          // the rings' shadow on the globe: follow the ray toward the Sun to the ring plane
          const s0 = -(dx * n[0] + dy * n[1] + nz * n[2]) / dotL(n);
          if (s0 > 0) { const I = ringI(Math.hypot(dx + s0 * LIGHT[0], dy + s0 * LIGHT[1], nz + s0 * LIGHT[2])); if (I > 0) shade *= 1 - 0.72 * I; }
          // bands run parallel to the rings
          const yb = -dx * st + dy * ct, lat = Math.asin(clamp(-yb, -1, 1)), lon = Math.atan2(dx * ct + dy * st, nz) - T * 0.08;
          if (Math.abs(lat) > 1.12) return { v: shade, ramp: P.pole };
          const dl = wrap(lon + Math.PI) - Math.PI, sd = Math.hypot(dl * 1.6, (lat - 0.42) * 5);
          if (sd < 0.38 && nz > 0.15) return { v: clamp(shade * (0.78 + 0.22 * Math.sin(sd * 22 - T * 2))), ramp: P.storm };
          const turb = 0.35 * fbm(lon * 2.5 + 3, lat * 9 + T * 0.02);
          const band = Math.sin(lat * 13 + turb * 3) + 0.4 * Math.sin(lat * 37 + turb);
          return { v: clamp(shade * (0.9 + 0.1 * Math.sin(lat * 61))), ramp: band > 0.2 ? P.zone : P.belt };
        }, undefined, fine);
        // golden haze along the lit limb
        for (let a = 0; a < TAU; a += fine / (R * 1.02)) {
          const lit = clamp(Math.cos(a) * LIGHT[0] + Math.sin(a) * LIGHT[1] + 0.45);
          if (lit < 0.05) continue;
          const x = px + Math.cos(a) * R * 1.015, y = py + Math.sin(a) * R * 1.015, Q = ring3(x, y);
          if (Q[2] > 0 && ringI(Math.hypot(Q[0], Q[1], Q[2])) > 0.3) continue;
          tile(sn(x) * fine, sn(y) * fine, P.haze, 0.5, lit * 0.55 * calmAt(x, y), fine);
        }
        ringPass(true);
        orbiter(px, py, R, 2.75 * R, 0.22, tilt, k, mr, P.redmoon, LIGHT, false, occl, redMoon, fine);
        const ph = T * 0.05, mL = norm([Math.sin(ph), -0.15, Math.cos(ph)]);
        sphere(L.m.x, L.m.y, L.m.r, P.moon, mL, lunar(mL), undefined, fine);
      },
    },

    sun: {
      layout() {
        L.s = phone ? { x: W * 0.8, y: H * 0.86, r: W * 0.46 } : { x: W * 0.9, y: H * 0.52, r: Math.min(H * 0.44, W * 0.3) };
        pivot = { x: W * 0.3, y: -H };
      },
      draw() {
        const { x: cx, y: cy, r: R } = L.s;
        backdrop(['rgba(150,60,20,.10)']);
        drawStars((x, y) => clamp((Math.hypot(x - cx, y - cy) / R - 1.3) / 1.2));
        ctx.globalAlpha = 1;
        const g = ctx.createRadialGradient(cx, cy, R * 0.9, cx, cy, R * 2.4);
        g.addColorStop(0, `rgba(${P.glow},.24)`); g.addColorStop(1, `rgba(${P.glow},0)`);
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        // corona: radial glyph rays of varying length
        glyphFont(0.75);
        for (let k = 0; k < 90; k++) {
          const a = (k / 90) * TAU, n = fbm(k * 0.37, T * 0.08), len = R * (1.12 + 0.7 * n * n), ca = Math.cos(a), sa = Math.sin(a), gch = slope(ca, sa);
          for (let s = R * 1.04; s < len; s += C) {
            const x = cx + ca * s, y = cy + sa * s, f = 1 - (s - R) / (len - R);
            glyph(snap(x) * C, snap(y) * C, f > 0.55 ? gch : '·', P.corona, 0.55 * f * calmAt(x, y));
          }
        }
        // prominences: arcs of tiles standing on the limb
        tileFont();
        [[Math.PI * 0.84, 0.16], [Math.PI * 1.1, 0.11], [Math.PI * 1.36, 0.14]].forEach(([a0, span], i) => {
          const h = R * (0.1 + 0.03 * Math.sin(T * 0.4 + i * 2)), steps = Math.ceil((span * R) / C) * 2;
          for (let s = 0; s <= steps; s++) {
            const f = s / steps, ang = a0 - span / 2 + span * f, rr = R + h * Math.sin(Math.PI * f);
            for (let q = 0; q < 2; q++) {
              const x = cx + Math.cos(ang) * (rr - q * C * 0.8), y = cy + Math.sin(ang) * (rr - q * C * 0.8);
              const v = clamp(0.45 + 0.45 * Math.sin(Math.PI * f) + 0.1 * Math.sin(T * 3 + s));
              tile(snap(x) * C, snap(y) * C, at(P.prom, v), v, calmAt(x, y));
            }
          }
        });
        // disc: limb darkening, granulation, sunspots that turn with the Sun
        const spots = [[0.4, 0.22, 0.09], [1.3, -0.18, 0.07], [2.6, 0.3, 0.11], [4.1, -0.25, 0.08], [5.2, 0.12, 0.06]];
        sphere(cx, cy, R, P.sun, [0, 0, 1], (dx, dy, nz) => {
          let b = (0.28 + 0.72 * Math.pow(nz, 0.42)) * (0.86 + 0.16 * fbm(dx * 9 + T * 0.03, dy * 9));
          const lon = Math.atan2(dx, nz) + T * 0.02, lat = Math.asin(clamp(-dy, -1, 1));
          for (const [l0, la, sz] of spots) {
            const dl = wrap(lon - l0 + Math.PI) - Math.PI, d = Math.hypot(dl * Math.cos(lat), lat - la);
            if (d < sz) b *= d < sz * 0.45 ? 0.16 : 0.55;
          }
          return { v: clamp(b) };
        });
        // transit of Mercury every 46 s
        const p = (T % 46) / 46;
        if (p < 0.6) {
          const cw = Math.sqrt(1 - 0.09) * R, mx = cx - cw + 2 * cw * (p / 0.6), my = cy - R * 0.3;
          sphere(mx, my, C * 1.3, ['#0b0b0d', '#121214'], [0, 0, 1]);
        }
      },
    },

    earth: {
      layout() {
        L.e = phone ? { x: W * 0.7, y: H * 0.8, r: W * 0.34 } : { x: W * 0.76, y: H * 0.54, r: Math.min(H * 0.31, W * 0.17) };
        pivot = phone ? { x: W * 0.2, y: -H * 0.4 } : { x: W * 0.42, y: -H * 0.9 };
      },
      draw() {
        const { x: cx, y: cy, r: R } = L.e, light = norm([-0.78, -0.22, 0.58]), half = norm([light[0], light[1], light[2] + 1]);
        const tl = 0.41, ct = Math.cos(tl), st = Math.sin(tl), fine = phone ? 5 : 6;
        backdrop(['rgba(40,70,130,.16)', 'rgba(30,40,80,.10)']);
        drawStars((x, y) => clamp((Math.hypot(x - cx, y - cy) / R - 1) / 0.5));
        ctx.globalAlpha = 1;
        const g = ctx.createRadialGradient(cx, cy, R * 0.98, cx, cy, R * 1.3);
        g.addColorStop(0, `rgba(${P.halo},.36)`); g.addColorStop(1, `rgba(${P.halo},0)`);
        ctx.fillStyle = g; ctx.fillRect(0, cy - R * 1.4 + oy * 0, W, R * 2.8);
        const occl = (x: number, y: number) => (x - cx) ** 2 + (y - cy) ** 2 < R * R;
        const moonFn = lunar(light);
        orbiter(cx, cy, R, 2.5 * R, 0.09, -0.2, 0.28, R * 0.27, P.moon, light, true, occl, moonFn, fine);
        sphere(cx, cy, R, P.ocean, light, (dx, dy, nz) => {
          const x = dx * ct - dy * st, y = dx * st + dy * ct, lat = Math.asin(clamp(-y, -1, 1)), lon = wrap(Math.atan2(x, nz) + T * 0.05), al = Math.abs(lat);
          const lit = dx * light[0] + dy * light[1] + nz * light[2], day = smooth(-0.06, 0.32, lit);
          const land = isLand(lon, lat);
          // Night side: dark globe, city lights on land
          if (day < 0.08) {
            if (land && al < 1.15 && hash(Math.floor(lon * 90), Math.floor(lat * 90), 3) > 0.83) return { v: 0.8, ramp: [P.city] };
            return { v: land ? 0.1 : 0.04, ramp: land ? P.green : P.ocean };
          }
          const shade = 0.12 + 0.88 * day * (0.72 + 0.28 * nz);
          // Sunlit limb: the atmosphere scatters blue over whatever is below
          if (nz < 0.22 && day > 0.3) return { v: clamp(shade * (0.55 + 0.45 * (1 - nz / 0.22))), ramp: P.atmo };
          // Clouds: domain-warped noise, drifting slower than the surface turns
          const w = fbm(lon * 3 + 4, lat * 3);
          const cl = fbm(lon * 1.8 + 0.9 * w + T * 0.012, lat * 4.2 + 0.6 * w);
          // Clouds turn orange where they cross into dusk
          if (cl > 0.64) return { v: clamp(shade * (0.65 + 0.45 * smooth(0.64, 0.74, cl))), ramp: day < 0.45 ? P.dusk : P.cloud };
          if (al > 1.15 || (land && al > 1.02)) return { v: shade, ramp: P.ice };
          if (land) return { v: shade, ramp: al > 0.9 ? P.tundra : al > 0.26 && al < 0.62 && fbm(lon * 2, lat * 2) > 0.5 ? P.desert : P.green };
          // Ocean: turquoise shallows next to land, a sun glint on open water
          const e = 0.045, coast = isLand(lon + e, lat) || isLand(lon - e, lat) || isLand(lon, lat + e) || isLand(lon, lat - e);
          const spec = Math.pow(Math.max(0, dx * half[0] + dy * half[1] + nz * half[2]), 60);
          return { v: clamp(shade * 0.9 + spec * 0.9), ramp: coast && al < 1 ? P.shallow : P.ocean };
        }, undefined, fine);
        // Atmosphere: a thin lit rim that fades toward the night side
        for (let a = 0; a < TAU; a += fine / (R * 1.02)) {
          const lit = clamp(Math.cos(a) * light[0] + Math.sin(a) * light[1] + 0.45);
          if (lit < 0.05) continue;
          for (const k of [1.012, 1.03]) {
            const x = cx + Math.cos(a) * R * k, y = cy + Math.sin(a) * R * k;
            tile(Math.floor(x / fine) * fine, Math.floor(y / fine) * fine, k < 1.02 ? P.rim1 : P.rim2, 0.5, lit * (k < 1.02 ? 0.95 : 0.55) * calmAt(x, y), fine);
          }
        }
        orbiter(cx, cy, R, 2.5 * R, 0.09, -0.2, 0.28, R * 0.27, P.moon, light, false, occl, moonFn, fine);
      },
    },
  };

  let cur = scenes[first] ? first : 'saturn';
  usePalette(cur, firstPalette);
  function layout() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight; phone = W < 760; C = phone ? 10 : 12;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    scenes[cur].layout();
    makeStars();
  }
  // Home: full strength over the hero, then the scene lifts and dims as content arrives.
  // Inner pages start receded, since their content begins at the top.
  function recede() {
    const p = home ? clamp(scrollY / (H * 0.9)) : 1;
    oy = -p * H * 0.22;
    cv.style.opacity = String(1 - 0.58 * p);
  }
  function frame() {
    measure();
    recede();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    const dpr = cv.width / W;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = SKY[0]; ctx.fillRect(0, 0, W, H);
    ctx.translate(0, oy);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    scenes[cur].draw();
    ctx.globalAlpha = 1;
  }

  calmEls = [...document.querySelectorAll(calmSel)];
  layout();
  const T0 = performance.now();
  T = 40;
  frame();
  let last = 0, queued = false;
  if (!REDUCE) {
    const loop = (now: number) => {
      if (now - last >= 40) { last = now; T = (now - T0) / 1000 + 40; frame(); }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
  // With motion reduced the sky is a still frame; redraw only when the page moves under it.
  const redraw = () => { if (REDUCE && !queued) { queued = true; requestAnimationFrame(() => { queued = false; frame(); }); } };
  addEventListener('scroll', () => { recede(); redraw(); }, { passive: true });
  addEventListener('resize', () => { layout(); frame(); });
  addEventListener('pointermove', (e) => { mouse = [e.clientX, e.clientY]; redraw(); }, { passive: true });
  document.addEventListener('pointerleave', () => { mouse = null; });

  return {
    set(name: string, palette?: string) { if (!scenes[name]) return; cur = name; usePalette(cur, palette); layout(); frame(); },
    setPalette(name: string) { usePalette(cur, name); frame(); },
    get scene() { return cur; },
    get palette() { return palName; },
    get palettes() { return Object.keys(PALETTES[cur]); },
  };
}

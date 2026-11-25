// Shared glyph renderer: draw any canvas scene, read it back on a coarse grid, redraw it as glyphs.
// Used by the featured diagram field and the 404 page. The sky (sky.ts) draws cells directly.

export const MONO = 'ui-monospace,"SF Mono",Menlo,Consolas,"DejaVu Sans Mono",monospace';
export const RAMP = ' .:-=+*#%@';
export const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;

export function hash(a: number, b: number, c: number) {
  let h = (a * 374761393 + b * 668265263 + c * 982451653) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function scene(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

/** Size a canvas to its CSS box at the device pixel ratio (max 2) and return [ctx, cssW, cssH]. */
export function fit(cv: HTMLCanvasElement): [CanvasRenderingContext2D, number, number] {
  const dpr = Math.min(devicePixelRatio || 1, 2), w = cv.clientWidth, h = cv.clientHeight;
  const W = Math.round(w * dpr), H = Math.round(h * dpr);
  if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
  const c = cv.getContext('2d')!;
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  return [c, w, h];
}

export function glow(x: CanvasRenderingContext2D, cx: number, cy: number, r: number, a: number) {
  const g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
  g.addColorStop(0, `rgba(255,255,255,${a})`);
  g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g;
  x.fillRect(cx - r, cy - r, r * 2, r * 2);
}

const t1 = document.createElement('canvas'), t2 = document.createElement('canvas');
const ctx2 = new WeakMap<HTMLCanvasElement, CanvasRenderingContext2D>();
const ctx = (c: HTMLCanvasElement) => {
  let x = ctx2.get(c);
  if (!x) { x = c.getContext('2d', { willReadFrequently: true })!; ctx2.set(c, x); }
  return x;
};
/** Resize only when the box changed: assigning width/height reallocates the bitmap even at the same size. */
const size = (c: HTMLCanvasElement, w: number, h: number) => { if (c.width !== w || c.height !== h) { c.width = w; c.height = h; } };

function sample(src: HTMLCanvasElement, cols: number, rows: number) {
  // Halve in steps so thin lines average instead of aliasing away.
  let w = src.width, h = src.height, cur: HTMLCanvasElement = src, flip = false;
  while (w / 2 > cols * 2) {
    const nx = flip ? t1 : t2;
    w = Math.ceil(w / 2); h = Math.ceil(h / 2);
    size(nx, w, h);
    ctx(nx).drawImage(cur, 0, 0, w, h);
    cur = nx; flip = !flip;
  }
  const out = flip ? t1 : t2;
  size(out, cols, rows);
  const c = ctx(out);
  c.imageSmoothingQuality = 'high';
  c.drawImage(cur, 0, 0, cols, rows);
  return c.getImageData(0, 0, cols, rows).data;
}

export interface AsciiOpts { cell?: number; fg?: string; amax?: number; gamma?: number; shimmer?: number }

/** Redraw `src` into `cv` as glyphs. Saturated source colours are kept as accents. */
export function ascii(cv: HTMLCanvasElement, src: HTMLCanvasElement, o: AsciiOpts = {}) {
  const [c, w, h] = fit(cv);
  c.clearRect(0, 0, w, h);
  const cw = o.cell ?? 7, ch = cw * 1.5;
  const cols = Math.max(1, Math.floor(w / cw)), rows = Math.max(1, Math.floor(h / ch));
  const ox = (w - cols * cw) / 2, oy = (h - rows * ch) / 2;
  const d = sample(src, cols, rows), fg = o.fg ?? '#f3f1ec', amax = o.amax ?? 1, gamma = o.gamma ?? 1;
  c.font = `600 ${ch * 0.92}px ${MONO}`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const k = (j * cols + i) * 4;
    let r = d[k], g = d[k + 1], b = d[k + 2];
    let L = Math.pow((0.2126 * r + 0.7152 * g + 0.0722 * b) / 255, gamma);
    const mx = Math.max(r, g, b), colored = mx - Math.min(r, g, b) > 70;
    if (colored) { const s = 225 / mx; r = Math.min(255, (r * s) | 0); g = Math.min(255, (g * s) | 0); b = Math.min(255, (b * s) | 0); L = Math.max(L, 0.6); }
    if (L < 0.035) continue;
    let idx = Math.round(L * (RAMP.length - 1));
    if (o.shimmer && hash(i, j, o.shimmer) < 0.05) idx = Math.max(1, idx - 1);
    if (idx < 1) continue;
    c.fillStyle = colored ? `rgb(${r},${g},${b})` : fg;
    c.globalAlpha = (colored ? 1 : 0.3 + 0.7 * L) * amax;
    c.fillText(RAMP[Math.min(idx, RAMP.length - 1)], ox + i * cw + cw / 2, oy + j * ch + ch / 2);
  }
  c.globalAlpha = 1;
}

const CUBE_SHADE = (hex: string, f: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${((n >> 16) & 255) * f | 0},${((n >> 8) & 255) * f | 0},${(n & 255) * f | 0})`;
};

/** Isometric 3x3 cube; each face is 9 hex colours, row by row. */
export function isoCube(x: CanvasRenderingContext2D, cx: number, cy: number, s: number, top: string[], left: string[], right: string[]) {
  const k = 0.866, T = [0, -s], R = [k * s, -s / 2], Lf = [-k * s, -s / 2], C0 = [0, 0];
  const face = (O: number[], A: number[], B: number[], cols: string[], f: number) => {
    for (let v = 0; v < 3; v++) for (let u = 0; u < 3; u++) {
      const P = (a: number, b: number): [number, number] => [cx + O[0] + A[0] * a + B[0] * b, cy + O[1] + A[1] * a + B[1] * b];
      const e = 0.07;
      const q = [P((u + e) / 3, (v + e) / 3), P((u + 1 - e) / 3, (v + e) / 3), P((u + 1 - e) / 3, (v + 1 - e) / 3), P((u + e) / 3, (v + 1 - e) / 3)];
      x.fillStyle = CUBE_SHADE(cols[v * 3 + u], f);
      x.beginPath();
      q.forEach((p, i) => (i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])));
      x.closePath();
      x.fill();
    }
  };
  face(T, [R[0] - T[0], R[1] - T[1]], [Lf[0] - T[0], Lf[1] - T[1]], top, 1);
  face(Lf, [C0[0] - Lf[0], C0[1] - Lf[1]], [0, s], left, 0.82);
  face(C0, [R[0], R[1]], [0, s], right, 0.62);
}

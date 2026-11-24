// Drawing kit shared by the scenes: frame state (size, time, palette, scroll lift) and the cell-level
// primitives (glyphs, lit tiles, spheres, orbits) plus the shared backdrop (stars, graticule, constellations, comet).
// Coordinates are CSS pixels in scene space; the engine shifts scene space up by `oy` as the page scrolls.
import { MONO, RAMP, hash } from '../ascii';
import { at, SKY, STAR, WARM, COOL, LINE, GRAT, GRAT_LAB, ON_LIGHT, ON_DARK } from './color';
import { TAU, slope } from './math';

/** Adjust a sphere cell: gets the surface normal (dx, dy, nz) and Lambert brightness v; may swap the ramp. */
export type ShadeFn = (dx: number, dy: number, nz: number, v: number) => { v: number; ramp?: string[] };
/** True where a point is hidden behind something nearer. */
export type Occluder = (x: number, y: number) => boolean;

export interface Scene {
  label: string;
  /** Place the scene's bodies for the current viewport (store them in k.L) and set k.pivot for the stars. */
  layout(k: Kit): void;
  draw(k: Kit): void;
}

const CONSTELLATIONS = [
  { at: [0.5, 0.14], pts: [[0, 0], [4, 3], [7, 0], [11, 3], [14, -1]], ln: [[0, 1], [1, 2], [2, 3], [3, 4]] }, // Cassiopeia
  { at: [0.06, 0.66], pts: [[0, 0], [8, 1], [3, 6], [4.5, 6.6], [6, 7.2], [1, 13], [9, 12]], ln: [[0, 2], [1, 4], [2, 3], [3, 4], [2, 5], [4, 6]] }, // Orion
  { at: [0.38, 0.84], pts: [[0, 0], [4, 1], [7, 2], [10, 4], [11, 8], [16, 8], [17, 4]], ln: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 3]] }, // Ursa Major
];
const STAR_DENSITY = 5200; // px² of sky per star

export function createKit(ctx: CanvasRenderingContext2D) {
  let stars: { a: number; d: number; b: number; tw: number; ph: number; tint: number }[] = [];

  const k = {
    ctx,
    W: 0, H: 0,
    /** Grid cell size in px. */
    C: 12,
    phone: false,
    /** Seconds since start (offset so the first frame is mid-motion). */
    T: 0,
    /** Vertical lift of scene space, set by the engine as the page scrolls. */
    oy: 0,
    mouse: null as [number, number] | null,
    /** Active look: ramps as lookup tables, single colours as strings. */
    P: {} as Record<string, any>,
    /** Scene layout, filled by Scene.layout. */
    L: {} as Record<string, any>,
    /** Centre the star field turns around. */
    pivot: { x: 0, y: 0 },
    /** Text boxes (viewport coords) the sky dims behind. */
    rects: [] as DOMRect[],
    snap, tileFont, glyphFont, calmAt, tile, glyph, sphere, orbiter,
    makeStars, backdrop, drawStars, graticule, constellations, comet,
  };

  function snap(v: number) { return Math.floor(v / k.C); }
  function tileFont() { ctx.font = `600 ${Math.round(k.C * 0.56)}px ${MONO}`; }
  function glyphFont(s = 0.8) { ctx.font = `600 ${Math.round(k.C * s)}px ${MONO}`; }

  /** 1 in open sky, down to 0.18 right behind a text box. */
  function calmAt(X: number, y: number) {
    let f = 1;
    const Y = y + k.oy;
    for (const r of k.rects) {
      const dx = Math.max(r.left - 16 - X, 0, X - r.right - 16), dy = Math.max(r.top - 16 - Y, 0, Y - r.bottom - 16);
      const c = 0.18 + Math.hypot(dx, dy) / 70;
      if (c < f) f = c;
    }
    return f;
  }

  /** A lit square cell; cells 10px and up carry a brightness glyph. */
  function tile(X: number, Y: number, col: string, v: number, a: number, s = k.C) {
    if (X < -s || Y + k.oy < -s || X > k.W || Y + k.oy > k.H) return;
    ctx.globalAlpha = a;
    ctx.fillStyle = col;
    if (s < 10) { ctx.fillRect(X + 0.5, Y + 0.5, s - 1, s - 1); return; } // too small for a glyph
    ctx.beginPath(); ctx.roundRect(X + 0.75, Y + 0.75, s - 1.5, s - 1.5, 2); ctx.fill();
    ctx.fillStyle = v > 0.55 ? ON_LIGHT : ON_DARK;
    ctx.fillText(RAMP[Math.max(1, Math.min(9, Math.round(v * 9)))], X + s / 2, Y + s / 2 + 1);
  }

  function glyph(X: number, Y: number, g: string, col: string, a: number) {
    const C = k.C;
    if (X < -C || Y + k.oy < -C || X > k.W || Y + k.oy > k.H || a < 0.02) return;
    ctx.globalAlpha = a; ctx.fillStyle = col; ctx.fillText(g, X + C / 2, Y + C / 2 + 1);
  }

  /** Sphere drawn cell by cell at cell size `s`. `fn` shades each cell; `skip` hides occluded cells. */
  function sphere(cx: number, cy: number, R: number, ramp: string[], light: number[], fn?: ShadeFn, skip?: Occluder, s = k.C) {
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

  /** A moon on a tilted orbit (foreshortened to `fk`). Call once with back=true before the primary and once
   *  with back=false after it; each call draws the moon only when it is on that side. */
  function orbiter(cx: number, cy: number, radius: number, speed: number, tilt: number, fk: number, size: number,
    ramp: string[], light: number[], back: boolean, occl: Occluder, fn?: ShadeFn, s = k.C) {
    const oa = k.T * speed, ou = Math.cos(oa) * radius, ow = Math.sin(oa) * radius * fk;
    const x = cx + ou * Math.cos(tilt) - ow * Math.sin(tilt), y = cy + ou * Math.sin(tilt) + ow * Math.cos(tilt);
    const behind = Math.sin(oa) < 0;
    if (behind === back) sphere(x, y, size, ramp, light, fn, behind ? occl : undefined, s);
  }

  function makeStars() {
    stars = [];
    const span = Math.hypot(k.W, k.H) * 1.6, n = Math.round((Math.PI * span * span) / (k.phone ? STAR_DENSITY * 1.35 : STAR_DENSITY));
    for (let i = 0; i < n; i++) stars.push({ a: hash(i, 1, 3) * TAU, d: Math.sqrt(hash(i, 2, 5)) * span, b: Math.pow(hash(i, 3, 7), 2.2), tw: 0.6 + hash(i, 4, 9) * 2.2, ph: hash(i, 5, 1) * 6, tint: hash(i, 6, 2) });
  }

  /** Night gradient plus slow-drifting coloured haze (rgba strings). */
  function backdrop(haze: string[] = []) {
    const { W, H, T } = k;
    ctx.globalAlpha = 1;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, SKY[0]); g.addColorStop(0.6, SKY[1]); g.addColorStop(1, SKY[2]);
    ctx.fillStyle = g; ctx.fillRect(0, -k.oy, W, H);
    haze.forEach((c, i) => {
      const x = W * (0.62 + 0.25 * Math.sin(T * 0.02 + i * 2.2)), y = H * (0.4 + 0.3 * Math.cos(T * 0.017 + i * 1.4)), r = Math.max(W, H) * (0.42 - 0.06 * i);
      const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
      rg.addColorStop(0, c); rg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
    });
  }

  const rot = () => k.T * 0.006;
  const skyXY = (a: number, d: number) => [k.pivot.x + Math.cos(a + rot()) * d, k.pivot.y + Math.sin(a + rot()) * d];

  /** Twinkling star glyphs turning around k.pivot. `veil` (0..1) fades stars behind bright bodies. */
  function drawStars(veil?: (x: number, y: number) => number) {
    const { C, W, H, T, oy, mouse } = k;
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

  /** Faint star-chart circles and hour spokes around the pole. */
  function graticule() {
    const { C, W, H, pivot } = k;
    ctx.globalAlpha = 1; ctx.strokeStyle = GRAT; ctx.lineWidth = 1;
    const maxR = Math.hypot(W + Math.abs(pivot.x), H + Math.abs(pivot.y)), r0 = rot();
    for (let r = C * 8; r < maxR; r += C * 8) { ctx.beginPath(); ctx.arc(pivot.x, pivot.y, r, 0, TAU); ctx.stroke(); }
    for (let i = 0; i < 24; i++) { const a = (i * Math.PI) / 12 + r0; ctx.beginPath(); ctx.moveTo(pivot.x, pivot.y); ctx.lineTo(pivot.x + Math.cos(a) * maxR, pivot.y + Math.sin(a) * maxR); ctx.stroke(); }
    glyphFont(0.62);
    for (let i = 0; i < 24; i += 2) {
      const a = (i * Math.PI) / 12 + r0, x = pivot.x + Math.cos(a) * C * 32, y = pivot.y + Math.sin(a) * C * 32;
      if (x > 0 && x < W && y > 0 && y < H) glyph(x - C / 2, y - C / 2, `${i}h`, GRAT_LAB, calmAt(x, y));
    }
  }

  /** Star glyphs joined by line glyphs; they brighten as the cursor nears. */
  function constellations() {
    const { C, W, H, pivot, mouse } = k, r0 = rot(), cs = Math.cos(r0), sn = Math.sin(r0);
    for (const c of CONSTELLATIONS) {
      const bx = W * c.at[0] - pivot.x, by = H * c.at[1] - pivot.y, a = Math.atan2(by, bx) + r0, d = Math.hypot(bx, by);
      const pts = c.pts.map(([u, v]) => { const ox = u * C * 1.25, oy = v * C * 1.25; return [pivot.x + Math.cos(a) * d + ox * cs - oy * sn, pivot.y + Math.sin(a) * d + ox * sn + oy * cs]; });
      let lit = 0.32;
      if (mouse) { const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length, cy = pts.reduce((s, p) => s + p[1], 0) / pts.length, dd = Math.hypot(cx - mouse[0], cy - mouse[1]); if (dd < 260) lit += 0.45 * (1 - dd / 260); }
      glyphFont(0.7);
      for (const [i, j] of c.ln) {
        const x0 = snap(pts[i][0]), y0 = snap(pts[i][1]), x1 = snap(pts[j][0]), y1 = snap(pts[j][1]);
        const dx = x1 - x0, dy = y1 - y0, n = Math.max(Math.abs(dx), Math.abs(dy)), g = slope(dx, dy);
        for (let s = 1; s < n; s++) { const gx = Math.round(x0 + (dx * s) / n), gy = Math.round(y0 + (dy * s) / n); glyph(gx * C, gy * C, g, LINE + '1)', lit * calmAt(gx * C, gy * C)); }
      }
      glyphFont(0.9);
      for (const [x, y] of pts) glyph(snap(x) * C, snap(y) * C, '✦', STAR, Math.min(1, lit * 2.6) * calmAt(x, y));
    }
  }

  /** A comet crossing once every `period` seconds. */
  function comet(period = 18) {
    const { C, W, H, T } = k, cp = (T % period) / 6;
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

  return k;
}

export type Kit = ReturnType<typeof createKit>;

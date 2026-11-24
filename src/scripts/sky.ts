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

const PLANET = ['#24190f', '#4a321b', '#7a5228', '#a87436', '#cf9b4c', '#e6bf73', '#f3dca0'];
const BAND = ['#1f130c', '#3f2616', '#6a3f20', '#94592b', '#b8763a', '#d39a55', '#e9c27f'];
const RING = ['#3b3d42', '#646870', '#9399a3', '#c8ccd2'];
const MOON = ['#1a1a18', '#33322e', '#55524b', '#8f8a80', '#cfcac0', '#f3f1ec'];
const MARS = ['#2a0a05', '#5a1208', '#9a170b', '#d01b0b', '#ef5a3c'];

const SUN = lut([[0, '#4a1004'], [.2, '#8f240a'], [.4, '#c2410f'], [.58, '#e2691b'], [.74, '#f2932c'], [.86, '#f9bd52'], [.95, '#fde39a'], [1, '#fff6d8']]);
const PROM = lut([[0, '#5a1208'], [.5, RED], [1, '#f2a03a']]);
const OCEAN = lut([[0, '#050f20'], [.35, '#0b2547'], [.6, '#164477'], [.85, '#2c6aa8'], [1, '#5b97cf']]);
const GREEN = lut([[0, '#0f170b'], [.4, '#2a3f1c'], [.7, '#4f6a2c'], [1, '#93995a']]);
const DESERT = lut([[0, '#241a0c'], [.45, '#6b4f26'], [.75, '#a8844a'], [1, '#e0c48e']]);
const ICE = lut([[0, '#2a3038'], [.5, '#9aa4ae'], [1, '#f4f7f9']]);
const ZONE = lut([[0, '#2a1d10'], [0.4, '#8a6534'], [0.7, '#d9ad62'], [1, '#f6e2ac']]);
const BELT = lut([[0, '#22150c'], [0.4, '#6e4524'], [0.7, '#b07a3c'], [1, '#dcae6a']]);
const POLE = lut([[0, '#1c2026'], [0.5, '#5d6a76'], [1, '#a9b6c0']]);
const RINGL = lut([[0, '#1d1a16'], [0.45, '#7d7262'], [0.8, '#c9bc9c'], [1, '#efe6cc']]);
const CLOUD = lut([[0, '#20242b'], [.5, '#8d96a0'], [1, '#f3f5f7']]);

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

export function startSky(cv: HTMLCanvasElement, first: string, calmSel: string) {
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
            const x = (gx + 0.5) * fine, y = (gy + 0.5) * fine, P = ring3(x, y), r = Math.hypot(P[0], P[1], P[2]), I = ringI(r);
            if (I <= 0 || P[2] > 0 !== front || (!front && P[0] * P[0] + P[1] * P[1] < 1)) continue;
            // planet's shadow on the rings: does the ray toward the Sun hit the globe?
            const b = dotL(P), shadow = b * b - (r * r - 1) > 0 && b < 0 ? 0.2 : 1;
            const v = clamp((0.35 + 0.65 * I) * shadow * (0.86 + 0.14 * Math.sin(r * 31)));
            tile(gx * fine, gy * fine, at(RINGL, v), v, (0.3 + 0.65 * I) * calmAt(x, y), fine);
          }
        };
        const occl = (x: number, y: number) => { const P = ring3(x, y); return (x - px) ** 2 + (y - py) ** 2 < R * R || (P[2] > 0 && ringI(Math.hypot(P[0], P[1], P[2])) > 0.3); };
        const mr = Math.max(fine * 3, R * 0.17), moonFn = lunar(LIGHT);
        const redMoon: ShadeFn = (dx, dy, nz) => ({ v: 0.1 + 0.9 * smooth(-0.05, 0.6, dx * LIGHT[0] + dy * LIGHT[1] + nz * LIGHT[2]) * (0.85 + 0.15 * fbm(dx * 5, dy * 5)) });
        orbiter(px, py, R, 2.75 * R, 0.22, tilt, k, mr, MARS, LIGHT, true, occl, redMoon, fine);
        ringPass(false);
        sphere(px, py, R, ZONE, LIGHT, (dx, dy, nz) => {
          const day = smooth(-0.05, 0.35, dotL([dx, dy, nz]));
          let shade = 0.06 + 0.94 * day * (0.5 + 0.5 * nz);
          // the rings' shadow on the globe: follow the ray toward the Sun to the ring plane
          const s0 = -(dx * n[0] + dy * n[1] + nz * n[2]) / dotL(n);
          if (s0 > 0) { const I = ringI(Math.hypot(dx + s0 * LIGHT[0], dy + s0 * LIGHT[1], nz + s0 * LIGHT[2])); if (I > 0) shade *= 1 - 0.72 * I; }
          // bands run parallel to the rings
          const yb = -dx * st + dy * ct, lat = Math.asin(clamp(-yb, -1, 1)), lon = Math.atan2(dx * ct + dy * st, nz) - T * 0.08;
          if (Math.abs(lat) > 1.12) return { v: shade, ramp: POLE };
          const dl = wrap(lon + Math.PI) - Math.PI, sd = Math.hypot(dl * 1.6, (lat - 0.42) * 5);
          if (sd < 0.38 && nz > 0.15) return { v: clamp(shade * (0.78 + 0.22 * Math.sin(sd * 22 - T * 2))), ramp: MARS };
          const turb = 0.35 * fbm(lon * 2.5 + 3, lat * 9 + T * 0.02);
          const band = Math.sin(lat * 13 + turb * 3) + 0.4 * Math.sin(lat * 37 + turb);
          return { v: clamp(shade * (0.9 + 0.1 * Math.sin(lat * 61))), ramp: band > 0.2 ? ZONE : BELT };
        }, undefined, fine);
        // golden haze along the lit limb
        for (let a = 0; a < TAU; a += fine / (R * 1.02)) {
          const lit = clamp(Math.cos(a) * LIGHT[0] + Math.sin(a) * LIGHT[1] + 0.45);
          if (lit < 0.05) continue;
          const x = px + Math.cos(a) * R * 1.015, y = py + Math.sin(a) * R * 1.015, P = ring3(x, y);
          if (P[2] > 0 && ringI(Math.hypot(P[0], P[1], P[2])) > 0.3) continue;
          tile(sn(x) * fine, sn(y) * fine, '#e6bf73', 0.5, lit * 0.55 * calmAt(x, y), fine);
        }
        ringPass(true);
        orbiter(px, py, R, 2.75 * R, 0.22, tilt, k, mr, MARS, LIGHT, false, occl, redMoon, fine);
        const ph = T * 0.05, mL = norm([Math.sin(ph), -0.15, Math.cos(ph)]);
        sphere(L.m.x, L.m.y, L.m.r, MOON, mL, lunar(mL), undefined, fine);
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
        g.addColorStop(0, 'rgba(255,170,90,.24)'); g.addColorStop(1, 'rgba(255,170,90,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        // corona: radial glyph rays of varying length
        glyphFont(0.75);
        for (let k = 0; k < 90; k++) {
          const a = (k / 90) * TAU, n = fbm(k * 0.37, T * 0.08), len = R * (1.12 + 0.7 * n * n), ca = Math.cos(a), sa = Math.sin(a), gch = slope(ca, sa);
          for (let s = R * 1.04; s < len; s += C) {
            const x = cx + ca * s, y = cy + sa * s, f = 1 - (s - R) / (len - R);
            glyph(snap(x) * C, snap(y) * C, f > 0.55 ? gch : '·', '#f2b45a', 0.55 * f * calmAt(x, y));
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
              tile(snap(x) * C, snap(y) * C, at(PROM, v), v, calmAt(x, y));
            }
          }
        });
        // disc: limb darkening, granulation, sunspots that turn with the Sun
        const spots = [[0.4, 0.22, 0.09], [1.3, -0.18, 0.07], [2.6, 0.3, 0.11], [4.1, -0.25, 0.08], [5.2, 0.12, 0.06]];
        sphere(cx, cy, R, SUN, [0, 0, 1], (dx, dy, nz) => {
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
        g.addColorStop(0, 'rgba(90,150,230,.26)'); g.addColorStop(1, 'rgba(90,150,230,0)');
        ctx.fillStyle = g; ctx.fillRect(0, cy - R * 1.4 + oy * 0, W, R * 2.8);
        const occl = (x: number, y: number) => (x - cx) ** 2 + (y - cy) ** 2 < R * R;
        const moonFn = lunar(light);
        orbiter(cx, cy, R, 2.5 * R, 0.09, -0.2, 0.28, R * 0.27, MOON, light, true, occl, moonFn, fine);
        sphere(cx, cy, R, OCEAN, light, (dx, dy, nz) => {
          const x = dx * ct - dy * st, y = dx * st + dy * ct, lat = Math.asin(clamp(-y, -1, 1)), lon = wrap(Math.atan2(x, nz) + T * 0.05), al = Math.abs(lat);
          const lit = dx * light[0] + dy * light[1] + nz * light[2], day = smooth(-0.06, 0.32, lit);
          const land = isLand(lon, lat);
          // Night side: dark globe, city lights on land
          if (day < 0.08) {
            if (land && al < 1.15 && hash(Math.floor(lon * 90), Math.floor(lat * 90), 3) > 0.83) return { v: 0.8, ramp: [WARM] };
            return { v: land ? 0.1 : 0.04, ramp: land ? GREEN : OCEAN };
          }
          const shade = 0.1 + 0.9 * day * (0.55 + 0.45 * nz);
          // Clouds: domain-warped noise, drifting slower than the surface turns
          const w = fbm(lon * 3 + 4, lat * 3);
          const cl = fbm(lon * 1.8 + 0.9 * w + T * 0.012, lat * 4.2 + 0.6 * w);
          if (cl > 0.64) return { v: shade * (0.6 + 0.4 * smooth(0.64, 0.74, cl)), ramp: CLOUD };
          if (al > 1.15 || (land && al > 1.02)) return { v: shade, ramp: ICE };
          if (land) return { v: shade * 0.92, ramp: al > 0.26 && al < 0.62 && fbm(lon * 2, lat * 2) > 0.5 ? DESERT : GREEN };
          // Ocean with a sun glint
          const spec = Math.pow(Math.max(0, dx * half[0] + dy * half[1] + nz * half[2]), 60);
          return { v: clamp(shade * 0.85 + spec * 0.9) };
        }, undefined, fine);
        // Atmosphere: a thin lit rim that fades toward the night side
        for (let a = 0; a < TAU; a += fine / (R * 1.02)) {
          const lit = clamp(Math.cos(a) * light[0] + Math.sin(a) * light[1] + 0.45);
          if (lit < 0.05) continue;
          for (const k of [1.012, 1.03]) {
            const x = cx + Math.cos(a) * R * k, y = cy + Math.sin(a) * R * k;
            tile(Math.floor(x / fine) * fine, Math.floor(y / fine) * fine, k < 1.02 ? '#7fb2e5' : '#3f6fae', 0.5, lit * (k < 1.02 ? 0.8 : 0.45) * calmAt(x, y), fine);
          }
        }
        orbiter(cx, cy, R, 2.5 * R, 0.09, -0.2, 0.28, R * 0.27, MOON, light, false, occl, moonFn, fine);
      },
    },
  };

  let cur = scenes[first] ? first : 'saturn';
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
    set(name: string) { if (!scenes[name]) return; cur = name; layout(); frame(); },
    get scene() { return cur; },
  };
}

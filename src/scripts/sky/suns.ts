// Styles for the small distant Sun in the Earth scene. Each draws around (x, y) with core radius r.
// The centre is snapped to a cell centre first so every style stays symmetric on the grid.
import { MONO, hash } from './glyph';
import { at, lut } from './color';
import { TAU, clamp, fbm } from './math';
import type { Kit } from './kit';

type Sun = { x: number; y: number; r: number };
const FINE = 3;
let FADE = 1; // set per draw so a style can be faded as a whole
const HOT = lut([[0, '#3a0904'], [0.25, '#8a1a08'], [0.45, '#d0400e'], [0.65, '#f08a24'], [0.82, '#ffc85a'], [0.93, '#ffeab0'], [1, '#fffaf0']]);
const GOLD = lut([[0, '#4a2a12'], [0.4, '#b8742c'], [0.7, '#eeb460'], [0.9, '#fbe2a8'], [1, '#fff6e2']]);

function bloom(k: Kit, s: Sun, layers: [number, number][], rgb = '255,200,140') {
  const { ctx } = k;
  ctx.globalAlpha = 1;
  for (const [rad, a] of layers) {
    const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, rad);
    g.addColorStop(0, `rgba(${rgb},${a * FADE})`); g.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = g; ctx.fillRect(s.x - rad, s.y - rad, rad * 2, rad * 2);
  }
}

/** Shade every fine cell within `reach` of the centre; fn returns [colour, alpha] or null to skip. */
function cells(k: Kit, s: Sun, reach: number, fn: (dx: number, dy: number, d: number, a: number) => [string, number] | null) {
  const n = Math.ceil(reach / FINE);
  for (let j = -n; j <= n; j++) for (let i = -n; i <= n; i++) {
    const dx = i * FINE, dy = j * FINE, d = Math.hypot(dx, dy);
    if (d > reach) continue;
    const o = fn(dx, dy, d, Math.atan2(dy, dx));
    if (o && o[1] > 0.02) k.tile(s.x + dx - FINE / 2, s.y + dy - FINE / 2, o[0], 0.5, o[1] * FADE * k.calmAt(s.x + dx, s.y + dy), FINE);
  }
}

/** Angle-seamless noise: sample fbm on a circle so the flame edge has no seam at ±π. */
const ring = (a: number, f: number, t: number, seed = 0) => fbm(Math.cos(a) * f + t + seed, Math.sin(a) * f - t * 0.7 + seed);

export const SUNS: Record<string, (k: Kit, s: Sun) => void> = {
  /** White-hot core shading through gold and orange to a red rim, with flickering flame tongues. */
  fireball(k, s) {
    const R = s.r * 1.2, T = k.T;
    bloom(k, s, [[R * 7, 0.08], [R * 2.6, 0.16]], '255,150,70');
    cells(k, s, R * 1.9, (dx, dy, d, a) => {
      const edge = R * (0.8 + 0.6 * ring(a, 1.8, T * 0.5) ** 2 + 0.3 * ring(a, 5, T * 1.4, 9));
      if (d > edge) return null;
      const f = d / edge;
      const v = clamp(1.02 - 0.85 * f * f + 0.1 * (fbm(dx * 0.12 + T * 0.8, dy * 0.12) - 0.5));
      return [at(HOT, v), f < 0.75 ? 1 : 1 - (f - 0.75) / 0.25 * 0.6];
    });
  },

  /** A smooth gold disc with a fine starburst corona whose rays drift in length. */
  ember(k, s) {
    const R = s.r, T = k.T;
    bloom(k, s, [[R * 8, 0.07], [R * 3, 0.14]]);
    cells(k, s, R * 4.4, (_dx, _dy, d, a) => {
      if (d <= R) return [at(GOLD, 1 - 0.45 * (d / R) ** 2), 1];
      const ray = Math.floor(((a + Math.PI) / TAU) * 28 + 0.5) % 28, ra = (ray / 28) * TAU - Math.PI;
      const off = Math.abs(Math.sin(a - ra)) * d;
      const len = R * (1.8 + 2.4 * fbm(ray * 0.61, T * 0.12) ** 2);
      if (off > FINE * 0.6 || d > len) return null;
      const f = (d - R) / (len - R);
      return ['#f6d49a', 0.55 * (1 - f) ** 1.5];
    });
  },

  /** Total eclipse: a black disc, a bright thin ring, soft streamers and one diamond-ring bead. */
  eclipse(k, s) {
    const R = s.r * 1.1, T = k.T;
    bloom(k, s, [[R * 7, 0.06], [R * 2.4, 0.12]], '220,225,240');
    cells(k, s, R * 3.4, (_dx, _dy, d, a) => {
      if (d < R * 0.92) return ['#07080b', 1];
      if (d < R * 1.12) return ['#fbf6ea', 1];
      const reach = R * (1.5 + 1.4 * ring(a, 2.2, T * 0.08) ** 2);
      if (d > reach) return null;
      return ['#cfd6e6', 0.45 * (1 - (d - R) / (reach - R)) ** 1.6];
    });
    const ba = -2.3 + 0.05 * Math.sin(T * 0.3);
    bloom(k, { x: s.x + Math.cos(ba) * R, y: s.y + Math.sin(ba) * R, r: 0 }, [[R * 0.9, 0.35], [R * 0.35, 0.9]], '255,250,235');
  },

  /** A point of light: wide bloom, four thin spikes and a small crisp core. */
  point(k, s) {
    const R = s.r * 0.5, T = k.T, br = 1 + 0.06 * Math.sin(T * 0.5);
    bloom(k, s, [[R * 9 * br, 0.07], [R * 3.5 * br, 0.12]], '255,214,160');
    cells(k, s, R * 7 * br, (dx, dy, d) => {
      if (d <= R) return [at(GOLD, 1 - 0.5 * (d / R) ** 2), 1];
      const len = dy === 0 ? 7 : dx === 0 ? 4.5 : 0;
      if (!len || d > R * len * br) return null;
      return ['#ffe2b0', 0.7 * (1 - d / (R * len)) ** 2];
    });
  },

  /** The Sun in glyphs: concentric rings from dense to light characters, flickering at the rim. */
  ascii(k, s) {
    const { ctx, T } = k, R = s.r * 1.7, G = 7;
    bloom(k, s, [[R * 3.5, 0.08], [R * 1.6, 0.1]]);
    ctx.font = `700 ${G + 1}px ${MONO}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const CH = '@%#*+=-:.';
    const n = Math.ceil((R * 1.6) / G);
    for (let j = -n; j <= n; j++) for (let i = -n; i <= n; i++) {
      const x = i * G, y = j * G, d = Math.hypot(x, y), a = Math.atan2(y, x);
      const edge = R * (1 + 0.25 * ring(a, 2, T * 0.4));
      if (d > edge * 1.25) continue;
      const f = d / edge, c = Math.min(CH.length - 1, Math.max(0, Math.floor(f * 7 + (hash(i, j, Math.floor(T * 4)) - 0.5) * 1.2)));
      const a2 = f < 1 ? 1 : 1 - (f - 1) / 0.25;
      ctx.globalAlpha = a2 * FADE * k.calmAt(s.x + x, s.y + y);
      ctx.fillStyle = at(HOT, clamp(1 - f * 0.55));
      ctx.fillText(CH[c], s.x + x, s.y + y);
    }
  },
};

/** Draw the chosen style with its centre snapped to a cell centre, at opacity `fade`. */
export function drawSun(k: Kit, s: Sun, style: string, fade = 1) {
  if (fade < 0.02) return;
  FADE = fade;
  const c = { x: Math.round(s.x / FINE) * FINE, y: Math.round(s.y / FINE) * FINE, r: s.r };
  (SUNS[style] || SUNS.point)(k, c);
}

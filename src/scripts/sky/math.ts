// Noise, easing and lighting helpers shared by the scenes.
import { hash } from '../ascii';

export const TAU = Math.PI * 2;
export const norm = (v: number[]) => { const l = Math.hypot(...v); return v.map((x) => x / l); };
export const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const smooth = (e0: number, e1: number, x: number) => { const t = clamp((x - e0) / (e1 - e0)); return t * t * (3 - 2 * t); };
export const wrap = (a: number) => ((a % TAU) + TAU) % TAU;

function vn(x: number, y: number) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi, 17), b = hash(xi + 1, yi, 17), c = hash(xi, yi + 1, 17), d = hash(xi + 1, yi + 1, 17);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
/** Four-octave value noise, roughly 0..1. */
export function fbm(x: number, y: number) { let s = 0, a = 0.5, f = 1; for (let i = 0; i < 4; i++) { s += a * vn(x * f, y * f); f *= 2.03; a *= 0.5; } return s / 0.9375; }

/** Line glyph for a direction. */
export const slope = (dx: number, dy: number) => Math.abs(dx) > 2 * Math.abs(dy) ? '-' : Math.abs(dy) > 2 * Math.abs(dx) ? '|' : dx * dy > 0 ? '\\' : '/';

/** Default sunlight: upper left, toward the viewer. View space is x right, y down, z toward the viewer. */
export const LIGHT = norm([-0.6, -0.45, 0.66]);

/** Moon surface lit from `light`: grey regolith, darker maria, a soft terminator. */
export const lunar = (light: number[]) => (dx: number, dy: number, nz: number) => {
  const lit = dx * light[0] + dy * light[1] + nz * light[2];
  if (lit < 0) return { v: 0.03 };
  const mare = fbm(dx * 2.2 + 7, dy * 2.2 + 3) > 0.56 ? 0.68 : 1;
  return { v: (0.12 + 0.88 * smooth(-0.05, 0.6, lit)) * mare * (0.9 + 0.1 * fbm(dx * 9, dy * 9)) };
};

// Satellites on polar orbits around Earth: each orbit plane contains the planet's axis, so every pass crosses
// both poles. Drawn in two passes around the globe (behind, then in front); a satellite in Earth's shadow goes dark.
import { clamp } from './math';
import type { Kit } from './kit';

type V3 = [number, number, number];
const FINE = 3;
// orbit radius (in planet radii), node angle around the axis, angular speed (rad/s), phase. Phases are set so
// that on first load (T ≈ 42) one satellite is nearing the north pole and the others are spread along their paths.
const ORBITS = [
  { r: 1.18, node: 0.35, w: 0.16, ph: -7.02 },
  { r: 1.42, node: -0.55, w: 0.11, ph: -4.12 },
  { r: 1.7, node: 1.25, w: 0.075, ph: -4.05 },
];

const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** Position on orbit `o` at angle th, relative to the planet centre, in screen axes (z toward the viewer). */
function at3(o: (typeof ORBITS)[number], th: number, R: number, axis: number): V3 {
  const st = Math.sin(axis), ct = Math.cos(axis);
  const N: V3 = [-st, -ct, 0]; // north pole direction on screen
  const cn = Math.cos(o.node), sn = Math.sin(o.node);
  const U: V3 = [ct * cn, -st * cn, sn]; // in-orbit direction perpendicular to the axis
  const c = Math.cos(th) * o.r * R, s = Math.sin(th) * o.r * R;
  return [c * N[0] + s * U[0], c * N[1] + s * U[1], c * N[2] + s * U[2]];
}

/** In Earth's shadow: on the night side and inside the cylinder the planet casts away from the light. */
function shadowed(p: V3, R: number, light: number[]) {
  const along = dot(p, light as V3);
  if (along > 0) return false;
  const perp = Math.hypot(p[0] - along * light[0], p[1] - along * light[1], p[2] - along * light[2]);
  return perp < R;
}

export function drawSats(k: Kit, cx: number, cy: number, R: number, light: number[], axis: number, style: string, back: boolean) {
  const { T, tile, calmAt } = k;
  const put = (x: number, y: number, col: string, a: number, s = FINE) =>
    tile(Math.round(x / FINE) * FINE - s / 2, Math.round(y / FINE) * FINE - s / 2, col, 0.5, a * calmAt(x, y), s);
  const side = (p: V3) => (p[2] < 0) === back;
  const hidden = (p: V3) => p[2] < 0 && p[0] * p[0] + p[1] * p[1] < R * R;

  ORBITS.forEach((o) => {
    const th = o.ph + T * o.w;
    // the satellite, and for 'trail' a fading wake behind it
    const p = at3(o, th, R, axis);
    if (!side(p) || hidden(p)) return;
    const lit = shadowed(p, R, light) ? 0.18 : 1, x = cx + p[0], y = cy + p[1];
    if (style === 'trail') {
      for (let i = 1; i <= 30; i++) {
        const q = at3(o, th - (i * 0.012) / o.r, R, axis);
        if (side(q) && !hidden(q)) put(cx + q[0], cy + q[1], '#cfe0f2', 0.6 * (1 - i / 31) * lit);
      }
      put(x, y, '#ffffff', lit, FINE * 2);
    } else if (style === 'glyph') {
      put(x, y, '#ffffff', lit, FINE * 2);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) for (const d of [2, 3]) put(x + dx * FINE * d, y + dy * FINE * d, '#d8e4f0', (d === 2 ? 0.6 : 0.3) * lit);
    } else {
      // craft: a bright body with a solar panel either side, panels lying across the direction of travel
      const q = at3(o, th + 0.01, R, axis), vx = q[0] - p[0], vy = q[1] - p[1], vl = Math.hypot(vx, vy) || 1;
      const px = -vy / vl, py = vx / vl;
      put(x, y, '#f3f1ec', lit, FINE * 2);
      for (const s of [-1, 1]) for (const d of [2, 3, 4]) put(x + px * FINE * d * s, y + py * FINE * d * s, '#6a96d0', clamp(0.95 * lit));
    }
  });
}

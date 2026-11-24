// Earth and Moon: real coastlines (land.ts) on a tilted, turning globe, with clouds, ice, coastal shallows,
// a sun glint, city lights on the night side, a lit atmosphere rim and the Moon on its orbit.
import { hash } from '../../ascii';
import { TAU, clamp, fbm, lunar, norm, smooth, wrap } from '../math';
import { isLand } from '../land';
import type { Kit, Scene } from '../kit';

const LIGHT = norm([-0.78, -0.22, 0.58]);
const HALF = norm([LIGHT[0], LIGHT[1], LIGHT[2] + 1]); // half vector for the ocean glint
const AXIS = 0.41; // axial tilt on screen, radians
const moonShade = lunar(LIGHT);

export const earth: Scene = {
  label: 'Earth and Moon',
  layout(k) {
    const { W, H, phone } = k;
    k.L.e = phone ? { x: W * 0.7, y: H * 0.8, r: W * 0.34 } : { x: W * 0.76, y: H * 0.54, r: Math.min(H * 0.31, W * 0.17) };
    k.pivot = phone ? { x: W * 0.2, y: -H * 0.4 } : { x: W * 0.42, y: -H * 0.9 };
  },
  draw(k: Kit) {
    const { ctx, P, L, T, W, phone, tile, sphere, orbiter, calmAt } = k;
    const { x: cx, y: cy, r: R } = L.e, ct = Math.cos(AXIS), st = Math.sin(AXIS), fine = phone ? 5 : 6;
    k.backdrop([P.bg]);
    k.drawStars((x, y) => clamp((Math.hypot(x - cx, y - cy) / R - 1) / 0.5));
    ctx.globalAlpha = 1;
    const g = ctx.createRadialGradient(cx, cy, R * 0.98, cx, cy, R * 1.3);
    g.addColorStop(0, `rgba(${P.halo},.3)`); g.addColorStop(1, `rgba(${P.halo},0)`);
    ctx.fillStyle = g; ctx.fillRect(0, cy - R * 1.4, W, R * 2.8);
    const occl = (x: number, y: number) => (x - cx) ** 2 + (y - cy) ** 2 < R * R;
    orbiter(cx, cy, 2.5 * R, 0.09, -0.2, 0.28, R * 0.27, P.moon, LIGHT, true, occl, moonShade, fine);
    sphere(cx, cy, R, P.ocean, LIGHT, (dx, dy, nz) => {
      const x = dx * ct - dy * st, y = dx * st + dy * ct, lat = Math.asin(clamp(-y, -1, 1)), lon = wrap(Math.atan2(x, nz) + T * 0.05), al = Math.abs(lat);
      const day = smooth(-0.06, 0.32, dx * LIGHT[0] + dy * LIGHT[1] + nz * LIGHT[2]);
      const land = isLand(lon, lat);
      // night side: dark globe, city lights on land
      if (day < 0.08) {
        if (land && al < 1.15 && hash(Math.floor(lon * 90), Math.floor(lat * 90), 3) > 0.83) return { v: 0.8, ramp: [P.city] };
        return { v: land ? 0.1 : 0.04, ramp: land ? P.green : P.ocean };
      }
      const shade = 0.12 + 0.88 * day * (0.72 + 0.28 * nz);
      // sunlit limb: the atmosphere scatters over whatever is below
      if (nz < 0.22 && day > 0.3) return { v: clamp(shade * (0.55 + 0.45 * (1 - nz / 0.22))), ramp: P.atmo };
      // clouds: domain-warped noise drifting slower than the surface; they take the dusk colour near the terminator
      const w = fbm(lon * 3 + 4, lat * 3);
      const cl = fbm(lon * 1.8 + 0.9 * w + T * 0.012, lat * 4.2 + 0.6 * w);
      if (cl > 0.64) return { v: clamp(shade * (0.65 + 0.45 * smooth(0.64, 0.74, cl))), ramp: day < 0.45 ? P.dusk : P.cloud };
      if (al > 1.15 || (land && al > 1.02)) return { v: shade, ramp: P.ice };
      if (land) return { v: shade, ramp: al > 0.9 ? P.tundra : al > 0.26 && al < 0.62 && fbm(lon * 2, lat * 2) > 0.5 ? P.desert : P.green };
      // ocean: shallows next to land, a sun glint on open water
      const e = 0.045, coast = isLand(lon + e, lat) || isLand(lon - e, lat) || isLand(lon, lat + e) || isLand(lon, lat - e);
      const spec = Math.pow(Math.max(0, dx * HALF[0] + dy * HALF[1] + nz * HALF[2]), 60);
      return { v: clamp(shade * 0.9 + spec * 0.9), ramp: coast && al < 1 ? P.shallow : P.ocean };
    }, undefined, fine);
    // atmosphere: a thin lit rim that fades toward the night side
    for (let a = 0; a < TAU; a += fine / (R * 1.02)) {
      const lit = clamp(Math.cos(a) * LIGHT[0] + Math.sin(a) * LIGHT[1] + 0.45);
      if (lit < 0.05) continue;
      for (const s of [1.012, 1.03]) {
        const x = cx + Math.cos(a) * R * s, y = cy + Math.sin(a) * R * s;
        tile(Math.floor(x / fine) * fine, Math.floor(y / fine) * fine, s < 1.02 ? P.rim1 : P.rim2, 0.5, lit * (s < 1.02 ? 0.95 : 0.55) * calmAt(x, y), fine);
      }
    }
    orbiter(cx, cy, 2.5 * R, 0.09, -0.2, 0.28, R * 0.27, P.moon, LIGHT, false, occl, moonShade, fine);
  },
};

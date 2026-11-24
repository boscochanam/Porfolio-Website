// Death Star II over Endor: a half-built battle station turning slowly. Hull panels with a trench at the
// equator, the superlaser dish in the northern hemisphere, and an unfinished southern flank where the hull
// gives way to girders over a dark interior. Endor, a forest moon, circles it. Greys keep it quiet behind text.
import { hash } from '../../ascii';
import { clamp, fbm, norm, smooth, wrap } from '../math';
import type { Kit, Scene } from '../kit';

const LIGHT = norm([-0.7, -0.35, 0.62]);
const AXIS = -0.12; // slight roll on screen, radians
const SPIN = 0.035; // rad/s
// superlaser dish: centre (lon, lat) on the body and angular radius
const DISH = { lon: 0.5, lat: 0.55, r: 0.3 };
// the unfinished flank: centre (lon, lat) and base angular radius; noise frays its edge
const OPEN = { lon: 2.2, lat: -0.35, r: 0.9 };

/** Great-circle distance between two (lon, lat) points. */
const arc = (l1: number, b1: number, l2: number, b2: number) =>
  Math.acos(clamp(Math.sin(b1) * Math.sin(b2) + Math.cos(b1) * Math.cos(b2) * Math.cos(l1 - l2), -1, 1));
const frac = (v: number) => v - Math.floor(v);

export const deathstar: Scene = {
  label: 'Death Star II',
  layout(k) {
    const { W, H, phone } = k;
    // same open spot as Earth: the hero's right side on desktop, low right on phones
    k.L.d = phone ? { x: W * 0.7, y: H * 0.8, r: W * 0.34 } : { x: W * 0.83, y: H * 0.42, r: Math.min(H * 0.25, W * 0.135) };
    k.pivot = phone ? { x: W * 0.2, y: -H * 0.4 } : { x: W * 0.42, y: -H * 0.9 };
    k.gap = 0.35;
  },
  draw(k: Kit) {
    const { ctx, P, L, T, W, phone, sphere, orbiter } = k;
    const { x: cx, y: cy, r: R } = L.d, ct = Math.cos(AXIS), st = Math.sin(AXIS), fine = phone ? 5 : 6;
    k.backdrop([P.bg]);
    k.drawStars((x, y) => clamp((Math.hypot(x - cx, y - cy) / R - 1) / 0.5));
    ctx.globalAlpha = 1;
    const g = ctx.createRadialGradient(cx, cy, R * 0.98, cx, cy, R * 1.25);
    g.addColorStop(0, `rgba(${P.halo},.1)`); g.addColorStop(1, `rgba(${P.halo},0)`);
    ctx.fillStyle = g; ctx.fillRect(0, cy - R * 1.4, W, R * 2.8);
    const occl = (x: number, y: number) => (x - cx) ** 2 + (y - cy) ** 2 < R * R;
    orbiter(cx, cy, 1.5 * R, 0.07, 0.18, 0.3, R * 0.2, P.endor, LIGHT, true, occl, undefined, fine);
    const pulse = 0.5 + 0.5 * Math.sin(T * 0.6); // the dish's focus slowly brightens and fades
    // the dish axis in screen space, for shading the bowl: its wall faces back toward this axis
    const ls = DISH.lon - T * SPIN, bx = Math.cos(DISH.lat) * Math.sin(ls), by = -Math.sin(DISH.lat), bz = Math.cos(DISH.lat) * Math.cos(ls);
    const ax = [bx * ct + by * st, -bx * st + by * ct, bz];
    sphere(cx, cy, R, P.hull, LIGHT, (dx, dy, nz) => {
      const x = dx * ct - dy * st, y = dx * st + dy * ct, lat = Math.asin(clamp(-y, -1, 1)), lon = wrap(Math.atan2(x, nz) + T * SPIN);
      const gx = Math.round((dx * R) / fine), gy = Math.round((dy * R) / fine), n = hash(gx, gy, 13);
      const lit = smooth(-0.05, 0.3, dx * LIGHT[0] + dy * LIGHT[1] + nz * LIGHT[2]);
      const shade = (0.1 + 0.9 * lit * (0.75 + 0.25 * nz)) * (0.97 + 0.06 * n);
      const night = lit < 0.04 + 0.1 * n;
      // panel grid in lon/lat; each panel gets its own tone so the hull reads as plating, not a flat ball
      const pu = Math.floor(lon * 7), pv = Math.floor(lat * 8), tone = 0.9 + 0.12 * hash(pu, pv, 5);
      const seam = frac(lon * 7) < 0.1 || frac(lat * 8) < 0.12;
      // unfinished flank: girders on a finer lat/lon lattice over a dark interior, ragged at the edge
      const open = arc(lon, lat, OPEN.lon, OPEN.lat) < OPEN.r + 0.22 * (fbm(lon * 3, lat * 3) - 0.5) + 0.12 * (hash(pu, pv, 9) - 0.5);
      if (open && Math.abs(lat) > 0.04) {
        const girder = frac(lon * 8) < 0.24 || frac(lat * 8) < 0.26;
        if (girder) return { v: night ? 0.06 : clamp(shade * 0.85), ramp: P.frame };
        if (hash(gx, gy, 21) > 0.985) return { v: 0.45 + 0.4 * n, ramp: P.window }; // lit decks inside
        return { v: 0.04 + 0.05 * n, ramp: P.inner };
      }
      if (night) {
        if (hash(gx, gy, 17) > 0.97 && !seam) return { v: 0.3 + 0.5 * n, ramp: P.window }; // a few lit ports
        return { v: 0.05 * (0.8 + 0.4 * n), ramp: P.hull };
      }
      // equatorial trench
      if (Math.abs(lat) < 0.035) return { v: clamp(shade * 0.35), ramp: P.hull };
      // superlaser dish: concave, so it is lit from the opposite side, with concentric rings and a focus
      const dd = arc(lon, lat, DISH.lon, DISH.lat);
      if (dd < DISH.r) {
        if (dd < 0.035) return { v: 0.35 + 0.6 * pulse * (0.7 + 0.3 * n), ramp: P.laser };
        // concave bowl: the surface normal leans from the sphere normal toward the dish axis
        const q = norm([ax[0] * 2.4 - dx, ax[1] * 2.4 - dy, ax[2] * 2.4 - nz]);
        const bowl = 0.05 + 0.62 * Math.max(0, q[0] * LIGHT[0] + q[1] * LIGHT[1] + q[2] * LIGHT[2]) * (0.3 + 0.7 * lit);
        const ring = frac((dd / DISH.r) * 6) < 0.16;
        return { v: clamp(bowl * (ring ? 0.7 : 1) * (0.94 + 0.12 * n)), ramp: P.hull };
      }
      if (dd < DISH.r + 0.04) return { v: clamp(shade * 1.15), ramp: P.hull }; // dish rim catches light
      return { v: clamp(shade * (seam ? 0.8 : tone)), ramp: P.hull };
    }, undefined, fine);
    orbiter(cx, cy, 1.5 * R, 0.07, 0.18, 0.3, R * 0.2, P.endor, LIGHT, false, occl, undefined, fine);
  },
};

// Earth: real coastlines (land.ts) on a tilted, turning globe, with clouds, ice, coastal shallows, a sun glint,
// city lights on the night side, a lit atmosphere rim, and polar-orbit satellites. On desktop a distant Sun sits
// in the open space left of the hero text, and the light comes from where it is.
import { hash } from '../../ascii';
import { drawSun } from '../suns';
import { drawSats } from '../sats';
import { TAU, clamp, fbm, norm, smooth, wrap } from '../math';
import { isLand } from '../land';
import type { Kit, Scene } from '../kit';

const DEFAULT_LIGHT = norm([-0.78, -0.22, 0.58]);
let LIGHT = DEFAULT_LIGHT;
let HALF = norm([LIGHT[0], LIGHT[1], LIGHT[2] + 1]); // half vector for the ocean glint
const AXIS = 0.41; // axial tilt on screen, radians

/** Point the light from the Sun toward Earth; z keeps the Sun a little in front so the globe stays mostly lit. */
function aim(light: number[]) {
  LIGHT = light;
  HALF = norm([LIGHT[0], LIGHT[1], LIGHT[2] + 1]);
}
// The great deserts as lon/lat boxes in degrees (west, east, south, north); noise frays their edges.
const DESERTS = [
  [-17, 35, 15, 32], [35, 60, 13, 32], [55, 75, 24, 35], [52, 112, 36, 47], // Sahara, Arabia, Iran-Thar, Central Asia-Gobi
  [117, 145, -31, -19], [12, 26, -28, -18], [-75, -68, -28, -18], [-117, -103, 25, 37], // Australia, Kalahari, Atacama, Sonora
].map((b) => b.map((d) => (d * Math.PI) / 180));
// isLand's longitude starts at 180°W, so shift the map's longitude back to geographic before testing.
const isArid = (lon: number, lat: number) => {
  const g = wrap(lon) - Math.PI;
  return DESERTS.some(([w, e, s, n]) => g > w && g < e && lat > s && lat < n);
};

export const earth: Scene = {
  label: 'Earth',
  layout(k) {
    const { W, H, phone } = k;
    if (W < 1000) {
      // Phones and tablets: dead centre behind the copy, holding this spot as the page scrolls.
      k.L.e = { x: W / 2, y: H / 2, r: Math.min(W * 0.3, H * 0.28, 240) };
      k.pivot = { x: W * 0.5, y: -H * 0.2 };
    } else {
      // Desktop keeps the approved right-of-centre spot, with the copy left and the Sun in the open margin.
      k.L.e = { x: W * 0.83, y: H * 0.5, r: Math.min(H * 0.25, W * 0.135, 225) };
      k.pivot = { x: W * 0.42, y: -H * 0.9 };
    }
    k.gap = 0.35; // near-seamless mosaic
    // no room for the Sun beside phone-width text
    // centred in the photo column (wrap 1240px, gutter 32px, column 132px), below the headshot
    k.L.sun = phone ? null : { x: Math.max(0, (W - 1240) / 2) + 32 + 66, y: H * 0.5, r: 18 };
    const q = new URLSearchParams(location.search);
    k.L.sunStyle = q.get('sun') || 'point'; // ?sun= previews a style (suns.ts)
    k.L.satStyle = q.get('sats') || 'craft'; // ?sats= previews a style (sats.ts)
    if (!k.L.sun) return aim(DEFAULT_LIGHT);
    const ux = k.L.sun.x - k.L.e.x, uy = k.L.sun.y - k.L.e.y, d = Math.hypot(ux, uy);
    aim(norm([(ux / d) * 0.81, (uy / d) * 0.81, 0.58]));
  },
  draw(k: Kit) {
    const { ctx, P, L, T, W, phone, tile, sphere, calmAt } = k;
    const { x: cx, y: cy, r: R } = L.e, ct = Math.cos(AXIS), st = Math.sin(AXIS), fine = phone ? 5 : 6;
    k.backdrop([P.bg]);
    k.drawStars((x, y) => clamp((Math.hypot(x - cx, y - cy) / R - 1) / 0.5));
    ctx.globalAlpha = 1;
    const g = ctx.createRadialGradient(cx, cy, R * 0.98, cx, cy, R * 1.3);
    g.addColorStop(0, `rgba(${P.halo},.15)`); g.addColorStop(1, `rgba(${P.halo},0)`);
    ctx.fillStyle = g; ctx.fillRect(0, cy - R * 1.4, W, R * 2.8);
    if (L.sun) drawSun(k, L.sun, L.sunStyle, 1 - smooth(0, 0.5, k.p)); // gives way as content takes over the left side
    const near = (lon: number, lat: number, e: number) => isLand(lon + e, lat) || isLand(lon - e, lat) || isLand(lon, lat + e) || isLand(lon, lat - e);
    drawSats(k, cx, cy, R, LIGHT, AXIS, L.satStyle, true);
    sphere(cx, cy, R, P.ocean, LIGHT, (dx, dy, nz) => {
      const x = dx * ct - dy * st, y = dx * st + dy * ct, lat = Math.asin(clamp(-y, -1, 1)), lon = wrap(Math.atan2(x, nz) + T * 0.05), al = Math.abs(lat);
      const gx = Math.round((dx * R) / fine), gy = Math.round((dy * R) / fine), n = hash(gx, gy, 11); // per-cell grain
      const day = smooth(-0.06, 0.32, dx * LIGHT[0] + dy * LIGHT[1] + nz * LIGHT[2]);
      const land = isLand(lon, lat);
      // night side, entered through a dithered band rather than a hard line: dark globe, clustered city lights
      if (day < 0.03 + 0.12 * n) {
        if (land && al < 0.95) {
          const town = near(lon, lat, 0.09) || fbm(lon * 3, lat * 3) > 0.6; // coasts and a few inland regions
          const cell = hash(Math.floor(lon * 45), Math.floor(lat * 45), 3), pt = hash(Math.floor(lon * 90), Math.floor(lat * 90), 5);
          if (town && cell > 0.62 && pt > 0.72) return { v: 0.3 + 0.7 * hash(gx, gy, 7), ramp: ['#2a2418', '#5a4a2c', P.city] };
        }
        return { v: (land ? 0.1 : 0.04) * (0.8 + 0.4 * n), ramp: land ? P.green : P.ocean };
      }
      const shade = (0.12 + 0.88 * day * (0.72 + 0.28 * nz)) * (0.93 + 0.14 * n);
      // sunlit limb: the atmosphere scatters over whatever is below
      if (nz < 0.22 && day > 0.3) return { v: clamp(shade * (0.55 + 0.45 * (1 - nz / 0.22))), ramp: P.atmo };
      // clouds: domain-warped noise eroded by finer noise, thicker in the storm tracks and thinner over the subtropics
      const w = fbm(lon * 3 + 4, lat * 3);
      const band = 0.05 * Math.cos(al * 6) - 0.06 * smooth(0.3, 0.55, al) * (1 - smooth(0.6, 0.8, al));
      const cl = fbm(lon * 1.8 + 0.9 * w + T * 0.012, lat * 4.2 + 0.6 * w) - 0.15 * fbm(lon * 12, lat * 12) + band;
      if (cl > 0.6) return { v: clamp(shade * (0.65 + 0.45 * smooth(0.6, 0.7, cl))), ramp: day < 0.45 ? P.dusk : P.cloud };
      if (al > 1.15 || (land && al > 1.02)) return { v: shade, ramp: P.ice };
      if (land) {
        // deserts only in the dry belts, away from coasts; elsewhere moss with light flecks
        const arid = isArid(lon, lat) && fbm(lon * 5, lat * 5) > 0.45;
        if (al > 0.9) return { v: shade, ramp: P.tundra };
        if (arid) return { v: shade, ramp: P.desert };
        return { v: clamp(n > 0.94 ? shade * 1.15 : shade), ramp: P.green };
      }
      // ocean: shallows next to land, a sun glint on open water
      const spec = Math.pow(Math.max(0, dx * HALF[0] + dy * HALF[1] + nz * HALF[2]), 60);
      return { v: clamp(shade * 0.9 + spec * 0.9), ramp: near(lon, lat, 0.045) && al < 1 ? P.shallow : P.ocean };
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
    drawSats(k, cx, cy, R, LIGHT, AXIS, L.satStyle, false);
  },
};

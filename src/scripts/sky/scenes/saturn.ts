import { at } from '../color';
import { LIGHT, clamp, fbm, lunar, norm, smooth, wrap, TAU } from '../math';
import type { Kit, Scene, ShadeFn } from '../kit';

export const saturn: Scene = {
  label: 'Ringed planet',
  layout(k) {
    const { W, H, C, phone } = k;
    k.L.p = phone ? { x: W * 0.66, y: H * 0.8, r: Math.min(W * 0.2, 110) } : { x: W * 0.77, y: H * 0.56, r: Math.min(H * 0.24, W * 0.14) };
    k.L.m = phone ? { x: W * 0.86, y: H * 0.56, r: C * 3 } : { x: W * 0.92, y: H * 0.2, r: Math.max(C * 4, H * 0.08) };
    k.pivot = phone ? { x: W * 0.2, y: -H * 0.4 } : { x: W * 0.42, y: -H * 0.9 };
  },
  draw(k: Kit) {
    const { P, L, T, phone, tile, sphere, orbiter, calmAt } = k;
    k.backdrop(['rgba(52,70,112,.20)', 'rgba(96,62,104,.14)', 'rgba(150,110,60,.08)']);
    k.graticule(); k.drawStars(); k.constellations(); k.comet();
    const { x: px, y: py, r: R } = L.p, fine = phone ? 5 : 6, sn = (v: number) => Math.floor(v / fine);
    const tilt = -0.24, fk = 0.3, ct = Math.cos(tilt), st = Math.sin(tilt), q = Math.sqrt(1 - fk * fk), n = norm([st * q, -ct * q, fk]);
    const dotL = (a: number[]) => a[0] * LIGHT[0] + a[1] * LIGHT[1] + a[2] * LIGHT[2];
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
        const b = dotL(Q), shadow = b * b - (r * r - 1) > 0 && b < 0 ? 0.2 : 1;
        const v = clamp((0.35 + 0.65 * I) * shadow * (0.86 + 0.14 * Math.sin(r * 31)));
        tile(gx * fine, gy * fine, at(P.ring, v), v, (0.3 + 0.65 * I) * calmAt(x, y), fine);
      }
    };
    const occl = (x: number, y: number) => { const Q = ring3(x, y); return (x - px) ** 2 + (y - py) ** 2 < R * R || (Q[2] > 0 && ringI(Math.hypot(Q[0], Q[1], Q[2])) > 0.3); };
    const mr = Math.max(fine * 3, R * 0.17);
    const redMoon: ShadeFn = (dx, dy, nz) => ({ v: 0.1 + 0.9 * smooth(-0.05, 0.6, dx * LIGHT[0] + dy * LIGHT[1] + nz * LIGHT[2]) * (0.85 + 0.15 * fbm(dx * 5, dy * 5)) });
    orbiter(px, py, 2.75 * R, 0.22, tilt, fk, mr, P.redmoon, LIGHT, true, occl, redMoon, fine);
    ringPass(false);
    sphere(px, py, R, P.zone, LIGHT, (dx, dy, nz) => {
      const day = smooth(-0.05, 0.35, dotL([dx, dy, nz]));
      let shade = 0.06 + 0.94 * day * (0.5 + 0.5 * nz);
      const s0 = -(dx * n[0] + dy * n[1] + nz * n[2]) / dotL(n);
      if (s0 > 0) { const I = ringI(Math.hypot(dx + s0 * LIGHT[0], dy + s0 * LIGHT[1], nz + s0 * LIGHT[2])); if (I > 0) shade *= 1 - 0.72 * I; }
      const yb = -dx * st + dy * ct, lat = Math.asin(clamp(-yb, -1, 1)), lon = Math.atan2(dx * ct + dy * st, nz) - T * 0.08;
      if (Math.abs(lat) > 1.12) return { v: shade, ramp: P.pole };
      const dl = wrap(lon + Math.PI) - Math.PI, sd = Math.hypot(dl * 1.6, (lat - 0.42) * 5);
      if (sd < 0.38 && nz > 0.15) return { v: clamp(shade * (0.78 + 0.22 * Math.sin(sd * 22 - T * 2))), ramp: P.storm };
      const turb = 0.35 * fbm(lon * 2.5 + 3, lat * 9 + T * 0.02);
      const band = Math.sin(lat * 13 + turb * 3) + 0.4 * Math.sin(lat * 37 + turb);
      return { v: clamp(shade * (0.9 + 0.1 * Math.sin(lat * 61))), ramp: band > 0.2 ? P.zone : P.belt };
    }, undefined, fine);
    for (let a = 0; a < TAU; a += fine / (R * 1.02)) {
      const lit = clamp(Math.cos(a) * LIGHT[0] + Math.sin(a) * LIGHT[1] + 0.45);
      if (lit < 0.05) continue;
      const x = px + Math.cos(a) * R * 1.015, y = py + Math.sin(a) * R * 1.015, Q = ring3(x, y);
      if (Q[2] > 0 && ringI(Math.hypot(Q[0], Q[1], Q[2])) > 0.3) continue;
      tile(sn(x) * fine, sn(y) * fine, P.haze, 0.5, lit * 0.55 * calmAt(x, y), fine);
    }
    ringPass(true);
    orbiter(px, py, 2.75 * R, 0.22, tilt, fk, mr, P.redmoon, LIGHT, false, occl, redMoon, fine);
    const ph = T * 0.05, mL = norm([Math.sin(ph), -0.15, Math.cos(ph)]);
    sphere(L.m.x, L.m.y, L.m.r, P.moon, mL, lunar(mL), undefined, fine);
  },
};

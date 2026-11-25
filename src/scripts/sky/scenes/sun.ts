import { at } from '../color';
import { TAU, clamp, fbm, slope, wrap } from '../math';
import type { Kit, Scene } from '../kit';

const SPOTS = [[0.4, 0.22, 0.09], [1.3, -0.18, 0.07], [2.6, 0.3, 0.11], [4.1, -0.25, 0.08], [5.2, 0.12, 0.06]];

export const sun: Scene = {
  label: 'The Sun',
  layout(k) {
    const { W, H, phone } = k;
    k.L.s = phone ? { x: W * 0.8, y: H * 0.86, r: W * 0.46 } : { x: W * 0.9, y: H * 0.52, r: Math.min(H * 0.44, W * 0.3) };
    k.pivot = { x: W * 0.3, y: -H };
  },
  draw(k: Kit) {
    const { ctx, P, L, T, C, W, H, snap, tile, glyph, sphere, calmAt } = k;
    const { x: cx, y: cy, r: R } = L.s;
    k.backdrop(['rgba(150,60,20,.10)']);
    k.drawStars((x, y) => clamp((Math.hypot(x - cx, y - cy) / R - 1.3) / 1.2));
    ctx.globalAlpha = 1;
    const g = ctx.createRadialGradient(cx, cy, R * 0.9, cx, cy, R * 2.4);
    g.addColorStop(0, `rgba(${P.glow},.24)`); g.addColorStop(1, `rgba(${P.glow},0)`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    k.glyphFont(0.75);
    for (let i = 0; i < 90; i++) {
      const a = (i / 90) * TAU, n = fbm(i * 0.37, T * 0.08), len = R * (1.12 + 0.7 * n * n), ca = Math.cos(a), sa = Math.sin(a), gch = slope(ca, sa);
      for (let s = R * 1.04; s < len; s += C) {
        const x = cx + ca * s, y = cy + sa * s, f = 1 - (s - R) / (len - R);
        glyph(snap(x) * C, snap(y) * C, f > 0.55 ? gch : '·', P.corona, 0.55 * f * calmAt(x, y));
      }
    }
    k.tileFont();
    [[Math.PI * 0.84, 0.16], [Math.PI * 1.1, 0.11], [Math.PI * 1.36, 0.14]].forEach(([a0, span], i) => {
      const h = R * (0.1 + 0.03 * Math.sin(T * 0.4 + i * 2)), steps = Math.ceil((span * R) / C) * 2;
      for (let s = 0; s <= steps; s++) {
        const f = s / steps, ang = a0 - span / 2 + span * f, rr = R + h * Math.sin(Math.PI * f);
        for (let q = 0; q < 2; q++) {
          const x = cx + Math.cos(ang) * (rr - q * C * 0.8), y = cy + Math.sin(ang) * (rr - q * C * 0.8);
          const v = clamp(0.45 + 0.45 * Math.sin(Math.PI * f) + 0.1 * Math.sin(T * 3 + s));
          tile(snap(x) * C, snap(y) * C, at(P.prom, v), v, calmAt(x, y));
        }
      }
    });
    sphere(cx, cy, R, P.sun, [0, 0, 1], (dx, dy, nz) => {
      let b = (0.28 + 0.72 * Math.pow(nz, 0.42)) * (0.86 + 0.16 * fbm(dx * 9 + T * 0.03, dy * 9));
      const lon = Math.atan2(dx, nz) + T * 0.02, lat = Math.asin(clamp(-dy, -1, 1));
      for (const [l0, la, sz] of SPOTS) {
        const dl = wrap(lon - l0 + Math.PI) - Math.PI, d = Math.hypot(dl * Math.cos(lat), lat - la);
        if (d < sz) b *= d < sz * 0.45 ? 0.16 : 0.55;
      }
      return { v: clamp(b) };
    });
    const p = (T % 46) / 46;
    if (p < 0.6) {
      const cw = Math.sqrt(1 - 0.09) * R, mx = cx - cw + 2 * cw * (p / 0.6), my = cy - R * 0.3;
      sphere(mx, my, C * 1.3, ['#0b0b0d', '#121214'], [0, 0, 1]);
    }
  },
};

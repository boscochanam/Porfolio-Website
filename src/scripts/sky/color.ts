// Colour helpers and the fixed colours every scene shares (sky, stars, glyph tints).

export type RGB = [number, number, number];
export const rgb = (h: string): RGB => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };

/** Colour ramp from stops, sampled into a lookup table. */
export function lut(stops: [number, string][], n = 40): string[] {
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
/** Pick from a lookup table by brightness 0..1. */
export const at = (l: string[], v: number) => l[Math.max(0, Math.min(l.length - 1, Math.round(v * (l.length - 1))))];

export const SKY = ['#0d0e12', '#121115', '#111110'];
export const STAR = '#f3f1ec', WARM = '#e6bf73', COOL = '#a9bcd9', LINE = 'rgba(207,202,192,';
export const GRAT = 'rgba(207,202,192,.045)', GRAT_LAB = 'rgba(207,202,192,.22)';
export const ON_LIGHT = 'rgba(17,17,16,.42)', ON_DARK = 'rgba(243,241,236,.30)';
export const RED = '#d01b0b';

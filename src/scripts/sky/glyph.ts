// Glyph constants the sky needs, kept local so the sky bundle does not depend on the shared ascii chunk
// (field/404). A shared import made the sky wait for a second JS round trip before its first frame.

export const MONO = 'ui-monospace,"SF Mono",Menlo,Consolas,"DejaVu Sans Mono",monospace';
export const RAMP = ' .:-=+*#%@';
export const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;

export function hash(a: number, b: number, c: number) {
  let h = (a * 374761393 + b * 668265263 + c * 982451653) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

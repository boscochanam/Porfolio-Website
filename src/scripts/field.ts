// Glyph field behind the featured architecture diagram: soft drifting light, a glow on each node,
// red packets running Camera → Jetson → Backend → PLC / HMI, and a glow that follows the cursor.
import { ascii, glow, scene, REDUCE } from './ascii';

const ink = document.querySelector<HTMLElement>('.feat-vis .ink');
const cv = ink?.querySelector<HTMLCanvasElement>('canvas.field');
if (ink && cv) {
  // Node centres and routes in each diagram's viewBox units (ArchDiagram.astro).
  const VARIANTS = {
    h: { w: 640, nodes: [[47, 105], [216, 105], [390, 105], [571, 59], [571, 151]], routes: [[0, 1, 2, 3], [0, 1, 2, 4]] },
    v: { w: 340, nodes: [[90, 24], [88, 147], [252, 147], [88, 268], [252, 268]], routes: [[0, 1, 2, 3], [0, 1, 2, 4]] },
  };
  const src = scene(10, 10);
  const sx = src.getContext('2d')!;
  let mouse: [number, number] | null = null, inView = false, drawn = false;
  // Geometry is stable between resizes; reading it every frame forces layout and costs more than the draw.
  let lay: { W: number; H: number; V: (typeof VARIANTS)['h']; k: number; ox: number; oy: number } | null = null;
  ink.addEventListener('pointermove', (e) => { const r = ink.getBoundingClientRect(); mouse = [e.clientX - r.left, e.clientY - r.top]; });
  ink.addEventListener('pointerleave', () => { mouse = null; });

  const measure = () => {
    const W = ink.clientWidth, H = ink.clientHeight;
    if (!W) return null;
    const svg = [...ink.querySelectorAll<SVGSVGElement>('svg.dg')].find((s) => s.getBoundingClientRect().width > 0);
    if (!svg) return null;
    const ir = ink.getBoundingClientRect(), sr = svg.getBoundingClientRect(), V = svg.classList.contains('dg-v') ? VARIANTS.v : VARIANTS.h;
    return { W, H, V, k: sr.width / V.w, ox: sr.left - ir.left, oy: sr.top - ir.top };
  };

  const draw = (t: number) => {
    if (!(lay ??= measure())) return;
    const { W, H, V, k, ox, oy } = lay;
    const sc = 0.5;
    // Assigning width/height reallocates the bitmap, so only do it when the box actually changed.
    const sw = Math.round(W * sc), sh = Math.round(H * sc);
    if (src.width !== sw || src.height !== sh) { src.width = sw; src.height = sh; }
    const x = sx;
    x.fillStyle = '#000'; x.fillRect(0, 0, src.width, src.height);
    x.save(); x.scale(sc, sc);
    for (let i = 0; i < 5; i++) glow(x, W * (0.5 + 0.45 * Math.sin(t * 0.13 + i * 1.7)), H * (0.5 + 0.45 * Math.cos(t * 0.11 + i * 2.3)), W * 0.34, 0.28);
    x.translate(ox, oy); x.scale(k, k);
    V.nodes.forEach(([a, b], i) => glow(x, a, b, 120, 0.45 + 0.12 * Math.sin(t * 1.3 + i)));
    x.fillStyle = '#d01b0b';
    V.routes.forEach((route, ri) => {
      for (let n = 0; n < 2; n++) {
        const f = ((t * 0.22 + n * 0.5 + ri * 0.25) % 1) * (route.length - 1), s = Math.floor(f), u = f - s;
        const A = V.nodes[route[s]], B = V.nodes[route[s + 1]];
        x.beginPath(); x.arc(A[0] + (B[0] - A[0]) * u, A[1] + (B[1] - A[1]) * u, 20, 0, Math.PI * 2); x.fill();
      }
    });
    x.restore();
    if (mouse) { x.save(); x.scale(sc, sc); glow(x, mouse[0], mouse[1], 120, 0.55); x.fillStyle = '#d01b0b'; x.beginPath(); x.arc(mouse[0], mouse[1], 10, 0, Math.PI * 2); x.fill(); x.restore(); }
    ascii(cv, src, { cell: 8, amax: 0.8, gamma: 0.75 });
  };

  const t0 = performance.now();
  // Paint only once the diagram is on screen. Below the fold it costs nothing during page load; when it
  // scrolls in, the observer draws it before the next paint. Fonts move the SVG bounds, so redraw then.
  const fonted = () => { lay = measure(); if (inView) { drawn = true; draw(2); } };
  document.fonts.ready.then(fonted);
  document.fonts.addEventListener?.('loadingdone', fonted);
  new IntersectionObserver((es) => {
    inView = es[0].isIntersecting;
    if (inView && !drawn) { lay = measure(); drawn = true; draw(2); }
  }).observe(ink);
  addEventListener('resize', () => { lay = measure(); if (inView) draw((performance.now() - t0) / 1000 + 2); });
  if (!REDUCE) {
    let last = 0;
    const loop = (now: number) => {
      if (inView && now - last >= 66) { last = now; draw((now - t0) / 1000 + 2); }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}

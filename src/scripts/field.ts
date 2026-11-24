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
  let mouse: [number, number] | null = null, inView = true;
  ink.addEventListener('pointermove', (e) => { const r = ink.getBoundingClientRect(); mouse = [e.clientX - r.left, e.clientY - r.top]; });
  ink.addEventListener('pointerleave', () => { mouse = null; });

  const draw = (t: number) => {
    const W = ink.clientWidth, H = ink.clientHeight;
    if (!W) return;
    const svg = [...ink.querySelectorAll<SVGSVGElement>('svg.dg')].find((s) => s.getBoundingClientRect().width > 0);
    if (!svg) return;
    const V = svg.classList.contains('dg-v') ? VARIANTS.v : VARIANTS.h;
    const sc = 0.5;
    src.width = Math.round(W * sc); src.height = Math.round(H * sc);
    const x = src.getContext('2d')!;
    x.fillStyle = '#000'; x.fillRect(0, 0, src.width, src.height);
    x.save(); x.scale(sc, sc);
    for (let i = 0; i < 5; i++) glow(x, W * (0.5 + 0.45 * Math.sin(t * 0.13 + i * 1.7)), H * (0.5 + 0.45 * Math.cos(t * 0.11 + i * 2.3)), W * 0.34, 0.28);
    const ir = ink.getBoundingClientRect(), sr = svg.getBoundingClientRect(), k = sr.width / V.w;
    x.translate(sr.left - ir.left, sr.top - ir.top); x.scale(k, k);
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
  document.fonts.ready.then(() => draw(2));
  addEventListener('resize', () => draw((performance.now() - t0) / 1000 + 2));
  if (!REDUCE) {
    new IntersectionObserver((es) => { inView = es[0].isIntersecting; }).observe(ink);
    let last = 0;
    const loop = (now: number) => {
      if (inView && now - last >= 66) { last = now; draw((now - t0) / 1000 + 2); }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}

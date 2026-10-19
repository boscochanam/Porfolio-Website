// Gutter ruler: background decoration printed on the page (≥1440px), in document flow so it
// scrolls 1:1 with the content. Ticks are real page px from the top of <main>. The footer carries
// a dark copy (.rl.dk) so the seam falls on the footer's diagonal. Section labels sit at each
// section's y; the current one is bolded via paintRuler(), called by the nav script.

const q = <T extends Element = HTMLElement>(s: string) => document.querySelector<T>(s);
const qa = <T extends Element = HTMLElement>(s: string) => [...document.querySelectorAll<T>(s)];

type Rl = HTMLElement & { _o?: number; _busy?: [number, number][] | null };
type Lb = HTMLElement & { _y?: number };

const mq = matchMedia('(min-width:1440px)');
const M = q('main')!;
const Ft = q('.foot-block')!;
const R = qa<Rl>('.rl');
const H = qa('#projects .sec-head,#background .sec-head');
const FH = document.getElementById('about-h')!;

let mk: [number, string][] = [];
let last = -1;

const mkI = (p: HTMLElement, c: string, st?: Partial<CSSStyleDeclaration>) => {
  const e = document.createElement('i');
  e.className = c;
  Object.assign(e.style, st || {});
  p.append(e);
  return e as Lb;
};

function build() {
  R.forEach((r) => (r.textContent = ''));
  mk = [];
  if (!mq.matches) return;
  const m = M.getBoundingClientRect(),
    w = q('.sec .wrap')!,
    wr = w.getBoundingClientRect(),
    pad = parseFloat(getComputedStyle(w).paddingLeft),
    cx = wr.left - m.left + pad,
    lx = Math.round(Math.min(cx * 0.575, cx - 64)),
    y = (e: Element) => Math.round(e.getBoundingClientRect().top - m.top);
  const fy = y(Ft),
    end = Math.round(m.height);
  mk = [
    [y(H[0]), 'Projects'],
    [y(H[1]), 'Background'],
    [y(FH), 'About · Contact'],
  ];
  const labs: [Rl, Lb][] = [];
  R.forEach((r) => {
    const dk = r.classList.contains('dk'),
      o = dk ? fy : 0;
    r.style.left = lx + 'px';
    r.style.setProperty('--o', o + 'px');
    mkI(r, 'ln');
    mkI(r, 'tk');
    r._o = o;
    mk.forEach(([my, t], k) => {
      if ((k === 2) !== dk) return;
      const lb = mkI(r, 'lb');
      lb.textContent = t;
      lb.dataset.k = String(k);
      lb._y = my - o;
      labs.push([r, lb]);
    });
  });
  // one orientation for every label: horizontal only if all fit left of the ticks
  const vert = labs.some(([, lb]) => lb.offsetWidth > lx - 14 - 16);
  labs.forEach(([r, lb]) => {
    const ly = lb._y!;
    if (vert) {
      lb.className = 'lb v';
      Object.assign(lb.style, { top: ly - 2 + 'px', left: '-14px', transform: 'translateX(-100%)' });
    } else Object.assign(lb.style, { top: ly + 'px', left: '-14px', transform: 'translate(-100%,-50%)' });
    (r._busy = r._busy || []).push(vert ? [ly - 20, ly + lb.offsetHeight + 16] : [ly - 24, ly + 24]);
  });
  R.forEach((r) => {
    const dk = r.classList.contains('dk'),
      o = r._o!;
    for (let v = 500; v <= (dk ? end : fy + 60); v += 500) {
      const ly = v - o;
      if (ly < 8 || (r._busy || []).some(([a, b]) => ly >= a && ly <= b)) continue;
      mkI(r, 'n', { top: ly + 'px' }).textContent = String(v);
    }
    r._busy = null;
  });
  paintRuler(last);
}

/** Bold the ruler label of section i (0 Projects, 1 Background, 2–3 About/Contact; -1 none). */
export function paintRuler(i: number) {
  last = i;
  R.forEach((r) =>
    r.querySelectorAll<HTMLElement>('.lb').forEach((l) => l.classList.toggle('act', i >= 0 && +l.dataset.k! === Math.min(i, 2))),
  );
}

build();
addEventListener('resize', build);
document.fonts?.ready.then(build);
addEventListener('load', build);

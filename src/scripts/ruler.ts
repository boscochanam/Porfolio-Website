
const q = <T extends Element = HTMLElement>(s: string) => document.querySelector<T>(s);
const qa = <T extends Element = HTMLElement>(s: string) => [...document.querySelectorAll<T>(s)];

type Rl = HTMLElement & { _o?: number; _busy?: [number, number][] | null };
type Lb = HTMLElement & { _y?: number };
type Mark = { y: number; label: string; nav: string; dark: boolean };

const mq = matchMedia('(min-width:1440px)');
const M = q('main');
const Ft = q('.foot-block');
const R = qa<Rl>('.rl');
const NAV = qa<HTMLAnchorElement>('.tabs a');

let marks: Mark[] = [];
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
  marks = [];
  if (!mq.matches || !M || !Ft) return;

  const m = M.getBoundingClientRect(),
    w = q('.sec .wrap') ?? q('.wrap'),
    wr = w?.getBoundingClientRect() ?? m,
    pad = w ? parseFloat(getComputedStyle(w).paddingLeft) : 0,
    cx = wr.left - m.left + pad,
    lx = Math.round(Math.min(cx * 0.575, cx - 64)),
    y = (e: Element) => Math.round(e.getBoundingClientRect().top - m.top);

  const fy = y(Ft),
    end = Math.round(m.height);

  marks = qa('[data-ruler]').map((el) => {
    const keys = (el.dataset.nav ?? '').split(',').filter(Boolean);
    const nav = keys
      .map((key) => NAV.findIndex((a) => a.hash === `#${key}`))
      .filter((i) => i >= 0)
      .join(',');
    return {
      y: y(el),
      label: el.dataset.ruler ?? '',
      nav,
      dark: Boolean(el.closest('.foot-block')),
    };
  });

  const labs: [Rl, Lb][] = [];
  R.forEach((r) => {
    const dk = r.classList.contains('dk'),
      o = dk ? fy : 0;
    r.style.left = lx + 'px';
    r.style.setProperty('--o', o + 'px');
    mkI(r, 'ln');
    mkI(r, 'tk');
    r._o = o;
    marks.forEach((mark) => {
      if (mark.dark !== dk) return;
      const lb = mkI(r, 'lb');
      lb.textContent = mark.label;
      lb.dataset.nav = mark.nav;
      lb._y = mark.y - o;
      labs.push([r, lb]);
    });
  });

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

export function paintRuler(i: number) {
  last = i;
  R.forEach((r) =>
    r.querySelectorAll<HTMLElement>('.lb').forEach((l) => {
      const on = i >= 0 && (l.dataset.nav ?? '').split(',').includes(String(i));
      l.classList.toggle('act', on);
    }),
  );
}

build();
addEventListener('resize', build);
let fontSig = '';
const buildFonts = () => {
  const sig = [...(document.fonts ?? [])].map((f) => `${f.family}/${f.weight}/${f.style}/${f.status}`).join('|');
  if (sig === fontSig) return;
  fontSig = sig;
  build();
};
document.fonts?.ready.then(buildFonts);
document.fonts?.addEventListener?.('loadingdone', buildFonts);

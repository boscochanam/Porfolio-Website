// Active section in the top nav (and on the gutter ruler): the last section whose top has passed
// 30% of the viewport; the last one when scrolled to the bottom. On narrow screens the tab strip
// scrolls the active tab into view. On project pages the targets are not present, so this is a no-op.
import { paintRuler } from './ruler';

const L = [...document.querySelectorAll<HTMLAnchorElement>('.tabs a')];
const sections = L.map((a) => document.querySelector(a.hash));
const T = document.querySelector<HTMLElement>('.tabs');

if (T && L.length && sections.every((s): s is Element => Boolean(s))) {
  const S = sections as Element[];
  let on: number | undefined;

  const u = () => {
    const y = innerHeight * 0.3,
      b = innerHeight + scrollY >= document.documentElement.scrollHeight - 4;
    let i = b ? S.length - 1 : -1;
    if (!b) S.forEach((s, k) => { if (s.getBoundingClientRect().top <= y) i = k; });
    if (i === on) return;
    on = i;
    paintRuler(i);
    L.forEach((a, k) => (k === i ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current')));
    if (i >= 0 && T.scrollWidth > T.clientWidth) {
      const r = L[i].getBoundingClientRect(),
        t = T.getBoundingClientRect();
      T.scrollBy({ left: r.left - t.left - (t.width - r.width) / 2, behavior: 'smooth' });
    }
  };

  addEventListener('scroll', () => requestAnimationFrame(u), { passive: true });
  addEventListener('resize', u);
  u();
}

// Active section in the top nav (and on the gutter ruler): the last home section whose top has
// passed 30% of the viewport; the last one when scrolled to the bottom. Links without a matching
// section on this page (Projects, and the home hashes on project pages) are left alone, so a
// server-rendered aria-current survives. On narrow screens the tab strip scrolls the active tab
// into view.
import { paintRuler } from './ruler';

const T = document.querySelector<HTMLElement>('.tabs');
const L = [...document.querySelectorAll<HTMLAnchorElement>('.tabs a')];
const sectionLinks = L.filter((a) => a.hasAttribute('data-section'));
// Only run on the page that has every home section. Elsewhere (Projects, project pages) the
// server-rendered current tab stays put, even though the shared footer repeats About/Contact.
const S = sectionLinks.flatMap((a) => {
  const el = a.hash ? document.querySelector(a.hash) : null;
  return el ? [{ i: L.indexOf(a), el }] : [];
});

if (T && S.length && S.length === sectionLinks.length) {
  let on: number | undefined;

  const u = () => {
    const y = innerHeight * 0.3,
      b = innerHeight + scrollY >= document.documentElement.scrollHeight - 4;
    let k = b ? S.length - 1 : -1;
    if (!b) S.forEach((s, n) => { if (s.el.getBoundingClientRect().top <= y) k = n; });
    if (k === on) return;
    on = k;
    const active = k >= 0 ? S[k].i : -1;
    paintRuler(active);
    L.forEach((a, i) => {
      if (i === active) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
    if (k >= 0 && T.scrollWidth > T.clientWidth) {
      const r = L[active].getBoundingClientRect(),
        t = T.getBoundingClientRect();
      T.scrollBy({ left: r.left - t.left - (t.width - r.width) / 2, behavior: 'smooth' });
    }
  };

  addEventListener('scroll', () => requestAnimationFrame(u), { passive: true });
  addEventListener('resize', u);
  u();
}

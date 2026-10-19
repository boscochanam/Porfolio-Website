// Slider: a black thumb riding the ruler spine (x). Its target screen y maps scroll progress
// between just under the header and the window bottom; it eases toward the target each frame
// (instant with reduced motion), can be dragged to scroll, and turns pearl over the black footer.
import './ruler'; // ruler must have positioned the spine (.rl style.left) first

const H = document.querySelector<HTMLElement>('.rh')!;
const T = H.querySelector<HTMLElement>('.th')!;
const R = document.querySelector<HTMLElement>('.rl:not(.dk)')!;
const M = document.querySelector<HTMLElement>('main')!;
const hd = document.querySelector<HTMLElement>('header.bar');
const F = document.querySelector<HTMLElement>('.foot-block');
const calm = matchMedia('(prefers-reduced-motion:reduce)');
const HALF = 20,
  PAD = 12;

let cur: number | null = null,
  goal = 0,
  raf = 0,
  drag: { dy: number } | null = null;

const de = document.documentElement;
const maxS = () => Math.max(1, de.scrollHeight - innerHeight);

function range(): [number, number] {
  const t = (hd ? hd.getBoundingClientRect().bottom : 0) + PAD + HALF,
    b = innerHeight - PAD - HALF;
  return [t, Math.max(t, b)];
}
function target() {
  const [t, b] = range(),
    p = Math.min(1, Math.max(0, scrollY / maxS()));
  return t + p * (b - t);
}
function draw(y: number) {
  H.style.transform = 'translateY(' + y.toFixed(1) + 'px)';
  H.classList.toggle('dk', !!F && y > F.getBoundingClientRect().top + 40);
}
function step() {
  raf = 0;
  const d = goal - cur!;
  if (drag || calm.matches || Math.abs(d) < 0.3) cur = goal;
  else {
    cur! += d * 0.18;
    raf = requestAnimationFrame(step);
  }
  draw(cur!);
}
function kick() {
  goal = target();
  if (cur === null) cur = goal;
  if (!raf) raf = requestAnimationFrame(step);
}
function place() {
  H.style.left = M.getBoundingClientRect().left + parseFloat(R.style.left || '0') + 'px';
  cur = null;
  kick();
}

T.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  T.setPointerCapture(e.pointerId);
  drag = { dy: e.clientY - cur! };
  H.classList.add('drag');
});
T.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const [t, b] = range(),
    y = Math.min(b, Math.max(t, e.clientY - drag.dy));
  scrollTo(0, ((y - t) / Math.max(1, b - t)) * maxS());
});
const end = () => {
  drag = null;
  H.classList.remove('drag');
  kick();
};
T.addEventListener('pointerup', end);
T.addEventListener('pointercancel', end);
addEventListener('scroll', kick, { passive: true });
addEventListener('resize', () => setTimeout(place, 0));
addEventListener('load', () => setTimeout(place, 0));
document.fonts?.ready.then(() => setTimeout(place, 0));
place();

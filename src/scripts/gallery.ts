// Gallery browser: one exhibit at a time. With a single project the index is a plain link and
// this script does nothing; controls and keyboard browsing switch on when a second project is added.
const root = document.querySelector<HTMLElement>('[data-gallery]');

if (root) {
  const items = [...root.querySelectorAll<HTMLElement>('[data-gal-item]')];
  const buttons = [...root.querySelectorAll<HTMLButtonElement>('[data-gal-go]')];
  const prev = root.querySelector<HTMLButtonElement>('[data-gal-prev]');
  const next = root.querySelector<HTMLButtonElement>('[data-gal-next]');
  const status = root.querySelector<HTMLElement>('[data-gal-status]');

  if (items.length > 1 && buttons.length === items.length) {
    root.classList.add('gal-live');
    let at = 0;

    const show = (n: number) => {
      at = Math.max(0, Math.min(items.length - 1, n));
      items.forEach((item, i) => {
        const on = i === at;
        item.classList.toggle('is-active', on);
        if (on) item.removeAttribute('aria-hidden');
        else item.setAttribute('aria-hidden', 'true');
      });
      buttons.forEach((b, i) => {
        if (i === at) b.setAttribute('aria-current', 'true');
        else b.removeAttribute('aria-current');
      });
      if (prev) prev.disabled = at === 0;
      if (next) next.disabled = at === items.length - 1;
      if (status) {
        const title = buttons[at]?.querySelector('.ttl')?.textContent?.trim() ?? '';
        status.textContent = `Project ${at + 1} of ${items.length}: ${title}`;
      }
    };

    buttons.forEach((b, i) => b.addEventListener('click', () => show(i)));
    prev?.addEventListener('click', () => show(at - 1));
    next?.addEventListener('click', () => show(at + 1));

    root.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      show(at + (e.key === 'ArrowRight' ? 1 : -1));
    });

    show(0);
  }
}

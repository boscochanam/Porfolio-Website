// Cubing sheet additions: copy an algorithm, remember the full-PLL checklist, and mark the
// current section in the contents rail. All optional; the sheet reads fine without JS.

// ── copy buttons ─────────────────────────────────────────────
const copyButtons = [...document.querySelectorAll<HTMLButtonElement>('[data-copy-alg]')];
const clipboard = navigator.clipboard;
copyButtons.forEach((btn) => {
  if (!clipboard) return;
  btn.hidden = false;
  const label = btn.getAttribute('aria-label') ?? 'Copy algorithm';
  let timer = 0;
  btn.addEventListener('click', async () => {
    const text = btn.dataset.copyAlg;
    if (!text) return;
    try {
      await clipboard.writeText(text);
      btn.dataset.copied = 'true';
      btn.setAttribute('aria-label', 'Copied');
      btn.title = 'Copied';
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        delete btn.dataset.copied;
        btn.setAttribute('aria-label', label);
        btn.title = 'Copy sequence';
      }, 1600);
    } catch {
      /* clipboard blocked: leave the button as it was */
    }
  });
});

// ── full-PLL checklist ───────────────────────────────────────
const check = document.querySelector<HTMLElement>('[data-checklist]');
if (check) {
  const boxes = [...check.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')];
  const count = check.querySelector<HTMLElement>('[data-check-count]');
  const bar = check.querySelector<HTMLElement>('[data-check-bar]');
  const reset = check.querySelector<HTMLButtonElement>('[data-check-reset]');
  const KEY = 'cubing:full-pll:v1';

  const read = () => {
    try {
      const value = JSON.parse(localStorage.getItem(KEY) ?? '[]');
      return new Set(Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []);
    } catch {
      return new Set<string>();
    }
  };
  const save = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify(boxes.filter((b) => b.checked).map((b) => b.value)));
    } catch {
      /* storage can be unavailable; the boxes still work for this visit */
    }
  };
  const paint = () => {
    const done = boxes.filter((b) => b.checked).length;
    if (count) count.textContent = String(done);
    if (bar) bar.style.width = `${(done / Math.max(1, boxes.length)) * 100}%`;
  };

  const saved = read();
  boxes.forEach((box) => {
    box.checked = saved.has(box.value);
    box.addEventListener('change', () => {
      save();
      paint();
    });
  });
  if (reset) {
    reset.hidden = false;
    reset.addEventListener('click', () => {
      boxes.forEach((b) => (b.checked = false));
      save();
      paint();
    });
  }
  paint();
}

// ── contents rail scroll spy ─────────────────────────────────
const tocLinks = [...document.querySelectorAll<HTMLAnchorElement>('.sheet-toc a, .sheet-toc-m a')];
const sections = new Map<string, Element>();
tocLinks.forEach((a) => {
  const el = document.querySelector(a.hash);
  if (el) sections.set(a.hash, el);
});
const items = [...sections.entries()];

if (items.length) {
  const update = () => {
    const line = innerHeight * 0.3;
    let active = items[0][0];
    for (const [hash, el] of items) {
      if (el.getBoundingClientRect().top <= line) active = hash;
    }
    if (innerHeight + scrollY >= document.documentElement.scrollHeight - 4) active = items[items.length - 1][0];
    tocLinks.forEach((a) => {
      const on = a.hash === active;
      a.classList.toggle('on', on);
      if (on) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
  };
  addEventListener('scroll', () => requestAnimationFrame(update), { passive: true });
  addEventListener('resize', update);
  update();
}

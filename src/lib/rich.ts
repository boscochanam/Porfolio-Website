import { brands } from './brands';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const mark = (key: string) => {
  const b = brands[key];
  if (!b) return '';
  if (b.img) return `<img class="bm" src="${b.img}" alt="" width="16" height="16" loading="lazy" decoding="async">`;
  const style = b.color ? ` style="color:${b.color}"` : '';
  return `<svg class="bm" viewBox="0 0 24 24" aria-hidden="true" focusable="false"${style}><path fill="currentColor" d="${b.path}"/></svg>`;
};

export const rich = (s: string) =>
  esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/\[\[([a-z0-9]+)\|([^|\]]+)(?:\|([^\]]+))?\]\]/g, (_, key: string, label: string, url?: string) => {
      const inner = `${mark(key)}${label}`;
      return url ? `<a class="br" href="${url}">${inner}</a>` : `<span class="br">${inner}</span>`;
    });

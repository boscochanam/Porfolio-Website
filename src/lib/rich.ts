// Tiny inline formatter for content strings: escapes HTML, then turns **text** into <b>text</b>.
// Use with set:html. Keeps content files free of markup.
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const rich = (s: string) => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');

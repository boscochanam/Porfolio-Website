// The sheet's machine-readable data, served at the same path the page links to.
import data from '../../../data/cubing-cases.json';

export const prerender = true;

export function GET() {
  return new Response(JSON.stringify(data, null, 1), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

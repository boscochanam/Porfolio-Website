import { sheet } from './cubing';

export interface ProjectPage {
  slug: string;
  href: string;
  title: string;
  category: string;
  summary: string;
  short: string;
  cta: string;
  meta: [label: string, value: string][];
  plateFoot: [value: string, label: string][];
  art: 'cubing';
}

export const projectPages: ProjectPage[] = [
  {
    slug: 'cubing',
    href: '/projects/cubing/',
    title: sheet.shortTitle,
    category: 'Coding',
    short: 'Interactive Rubik’s cube algorithm sheet',
    summary:
      'Sixteen last-layer algorithms, cut into bursts, with setups, recognition notes and a model-checked diagram for every case.',
    cta: 'Open the sheet',
    meta: [
      ['Format', 'Interactive reference'],
      ['Built with', 'Astro · SVG'],
      ['Updated', 'Nov 2026'],
    ],
    plateFoot: [
      ['16', 'verified sequences'],
      ['62,208', 'states checked'],
    ],
    art: 'cubing',
  },
];

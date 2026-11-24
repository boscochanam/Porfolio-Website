// Content for the cubing reference sheet. The prose lives here so the page stays a template;
// the case data (algorithms, setups, recognition notes and diagrams) lives in cubing-cases.json.
import raw from './cubing-cases.json';

export interface CubingCase {
  phase: number;
  id: string;
  name: string;
  alg: string;
  setup: string;
  family: string;
  family_cases: number;
  bursts: string[];
  recog: string;
  hold: string;
  verified: boolean;
  why: string;
  oriented_edges: string[];
  oriented_corners: string[];
  corner_cycles: string[][];
  edge_cycles: string[][];
  diagram: Record<'top' | 'f' | 'r' | 'b' | 'l', string[]>;
  svg: string;
}

export interface CubingData {
  title: string;
  generated: string;
  hold: string;
  colours: Record<string, string>;
  notation: string;
  verification: string;
  diagram_legend: string;
  cases: CubingCase[];
  next_step: { title: string; groups: { label: string; cases: string[] }[] };
  corrections: { id: string; given: string; used: string; why: string }[];
}

export const cubingData = raw as CubingData;
export const cubingCases = cubingData.cases;
export const caseById = new Map(cubingCases.map((c) => [c.id, c]));

export interface SheetPhase {
  id: string;
  step: string;
  title: string;
  toc: string;
  note?: string;
  caseIds: string[];
}

export const sheet = {
  title: '2-Look OLL and 2-Look PLL',
  shortTitle: '2-Look OLL & PLL',
  kind: 'Coding · Cubing reference',
  date: '24 November 2026',
  intro: 'Sixteen algorithms in four steps. Each card gives the case, the bursts, the setup and a recognition note.',
  legend: {
    hold: 'Hold the cube with green at the front and yellow on top.',
    burst: 'A burst is one chunk you can say without stopping.',
  },
  phases: [
    {
      id: 'oll-edges',
      step: 'OLL',
      title: '2-look OLL, step 1: edges',
      toc: 'OLL · edges',
      note: 'Edge orientation has three shapes: bar, L and dot. One algorithm fixes the edges in every case; add a U turn to line the shape up.',
      caseIds: ['OLL 45', 'OLL 44', 'OLL 1 / 2'],
    },
    {
      id: 'oll-corners',
      step: 'OLL',
      title: '2-look OLL, step 2: corners',
      toc: 'OLL · corners',
      note: 'With the cross done there are exactly 7 corner patterns, so these 7 algorithms are the complete set.',
      caseIds: ['OLL 27', 'OLL 26', 'OLL 23', 'OLL 24', 'OLL 25', 'OLL 22', 'OLL 21'],
    },
    {
      id: 'pll-corners',
      step: 'PLL',
      title: '2-look PLL, step 1: corners',
      toc: 'PLL · corners',
      caseIds: ['PLL T', 'PLL Y'],
    },
    {
      id: 'pll-edges',
      step: 'PLL',
      title: '2-look PLL, step 2: edges',
      toc: 'PLL · edges',
      caseIds: ['PLL Ua', 'PLL Ub', 'PLL H', 'PLL Z'],
    },
  ] satisfies SheetPhase[],
  nextStep: {
    title: 'Next step: full PLL',
    groups: cubingData.next_step.groups,
    note: 'Learn Aa, Ab and E first; the four G-Perms last.',
  },
} as const;

export const caseNotes: Record<string, { given: string; text: string }> = {
  'PLL Z': {
    given: cubingData.corrections[0]?.given ?? "M' U M2 U M2 U M' U2 M2",
    text: 'Checked, it leaves the four corners turned, so it is not a Z-Perm. The sequence above is the replacement.',
  },
};

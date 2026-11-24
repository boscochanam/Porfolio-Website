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
  goal: string;
  note?: string;
  caseIds: string[];
}

export const sheet = {
  title: '2-Look OLL and 2-Look PLL',
  shortTitle: '2-Look OLL & PLL',
  kind: 'Coding · Cubing reference',
  date: '24 November 2026',
  summary:
    'Sixteen algorithms in four steps. Every sequence here was executed on a cube model before it was written down. Each card also gives the setup: the same algorithm in reverse, which puts a solved cube into that case with the first two layers complete. Every sequence is cut into bursts, the chunks you actually say in your head, so it has a rhythm instead of one flat string.',
  stats: [
    { value: '16', label: 'algorithms', accent: false },
    { value: '16', label: 'passed the checks', accent: false },
    { value: '1', label: 'replaced (Z-Perm)', accent: true },
    { value: '4', label: 'hold notes to check', accent: false },
  ],
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
      goal: 'Orient the four yellow edges and build the yellow cross from any starting state.',
      note: 'Edge orientation has only three shapes: bar, L and dot. The full OLL list splits the same three shapes into 15, 27 and 8 cases, because the corners differ. One algorithm per shape fixes the edges in every one of them. Measured on all 216 last-layer orientation states: 54 of 54 bars, 108 of 108 Ls, 27 of 27 dots. You only add a U turn to line the shape up.',
      caseIds: ['OLL 45', 'OLL 44', 'OLL 1 / 2'],
    },
    {
      id: 'oll-corners',
      step: 'OLL',
      title: '2-look OLL, step 2: corners',
      toc: 'OLL · corners',
      goal: 'Orient the four yellow corners and finish the full yellow top face.',
      note: 'With the cross done there are exactly 7 corner patterns, so these 7 algorithms are the complete set. Nothing else can come up at this step.',
      caseIds: ['OLL 27', 'OLL 26', 'OLL 23', 'OLL 24', 'OLL 25', 'OLL 22', 'OLL 21'],
    },
    {
      id: 'pll-corners',
      step: 'PLL',
      title: '2-look PLL, step 1: corners',
      toc: 'PLL · corners',
      goal: 'Permute the corners: put all four corners in their own slots.',
      caseIds: ['PLL T', 'PLL Y'],
    },
    {
      id: 'pll-edges',
      step: 'PLL',
      title: '2-look PLL, step 2: edges',
      toc: 'PLL · edges',
      goal: 'Permute the edges and finish the cube.',
      caseIds: ['PLL Ua', 'PLL Ub', 'PLL H', 'PLL Z'],
    },
  ] satisfies SheetPhase[],
  nextStep: {
    title: 'Next step: full PLL',
    goal: 'The 15 cases that are left after 2-look PLL. Tick each one as you learn it.',
    groups: cubingData.next_step.groups,
    note: 'Order of work: Aa, Ab and E first, because they move corners only. The four G-Perms last, because each one turns a corner cycle and an edge cycle at the same time.',
  },
  changes: {
    z: {
      id: 'PLL Z',
      given: cubingData.corrections[0]?.given ?? "M' U M2 U M2 U M' U2 M2",
      used: cubingData.corrections[0]?.used ?? "M2 U M2 U' M2",
      note: 'It turns the U layer five quarter turns, which turns the four corners, so it cannot be an edge-only permutation.',
      found: 'found by search and then verified.',
    },
    holdsIntro:
      'Four recognition notes in the source list point to a different hold than the algorithm next to them. The diagram is the hold:',
    holdIds: ['OLL 44', 'OLL 27', 'OLL 25', 'OLL 22'],
  },
  method: {
    checked:
      'Every algorithm was run on a 54-facelet model of the cube. Three tests: the algorithm returns the solved cube when applied to its own case, its case leaves the first two layers intact, and the case pattern matches the case named for it.',
    coverage:
      'Coverage. The 3 edge and 7 corner algorithms together reach all 62,208 last-layer states, which is every orientation (216) times every permutation (288). Nothing outside that set exists, so the 10 sequences cover all 57 OLL cases. The 2 corner and 4 edge PLL algorithms reach all 288 permutation states, and one corner pass plus one edge pass solves every one of them: 288 of 288, no failures.',
    notation:
      "R U F L B D are face turns. r and f are wide turns of two layers. M is the slice between L and R, turned the same way as L. An apostrophe means counter-clockwise, 2 means a half turn.",
    diagrams:
      'Each tile is the top face seen from above, ringed by the top row of Back, Right, Front and Left. Yellow means a yellow sticker; grey means any other colour.',
    dataNote: 'Full file, with diagrams as character grids:',
  },
  colophon:
    'Facelet model with 54 stickers, moves composed as rotations, centres pinned. Diagrams are drawn from the case that each algorithm solves.',
} as const;

export const caseNotes: Record<string, { given: string; text: string }> = {
  'PLL Z': {
    given:
      sheet.changes.z.given,
    text:
      'Checked, it leaves the four corners turned, so it is not a Z-Perm. The sequence above is the replacement.',
  },
};

export const sheetHolds = sheet.changes.holdIds
  .map((id) => caseById.get(id))
  .filter((c): c is CubingCase => Boolean(c));

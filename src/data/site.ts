// Single source for everything on the page except projects (those live in src/content/projects/).
// Strings may use **bold**; see src/lib/rich.ts.

export const site = {
  name: 'Bosco Chanam',
  role: 'AI/ML Engineer',
  location: 'Pune, India',
  timeZone: 'Asia/Kolkata',
  zoneLabel: 'Pune, GMT+5:30',
  // Used for <title>, og:title.
  title: 'Bosco Chanam · AI/ML engineer, edge vision, robotics and agents',
  description:
    'AI/ML engineer at Bharat Forge in Pune. Computer vision on NVIDIA Jetson, rolling out to 10+ edge stations; robotics software on ROS 2; AI agents I use every day.',
  ogDescription:
    'Computer vision on NVIDIA Jetson, rolling out to 10+ edge stations. Primary inventor on its patent. Robotics on ROS 2, and AI agents at home.',
  ogImage: '/og.png',
  headshot: '/assets/headshot.jpg',

  // Inline brand marks: [[brand|Label]] or [[brand|Label|url]] (src/lib/rich.ts).
  intro: [
    "I’m an AI/ML engineer at [[bharatforge|Bharat Forge]], one of the world’s largest forging companies. I build computer vision that checks factory work as it happens. It’s rolling out to **10+ edge stations** on [[nvidia|Jetson]], and I’m the primary inventor on its patent.",
    'I also own the software platform for a robotic bin-picking cell built on [[ros|ROS 2]], and I’m learning robot simulation in [[nvidia|Isaac Sim]].',
    'At home I run Clawsco, my fork of [[nous|Hermes Agent|https://github.com/NousResearch/hermes-agent]], and I build with [[claude|Claude Code]], [[openai|Codex]], [[cursor|Cursor]] and [[opencode|opencode]].',
    'Away from the screen, I love movies and making videos. I log what I watch on [[letterboxd|Letterboxd|https://letterboxd.com/boscochanam]] and post on [[youtube|YouTube|https://www.youtube.com/@boscochanam]].',
  ],
};

// Night-sky scene behind every page (src/scripts/sky/): 'saturn' | 'sun' | 'earth'.
// palette: a look from PALETTES[scene] in src/scripts/sky/palettes.ts; empty means that scene's first look.
export const sky = {
  scene: 'earth',
  palette: '',
};

export const links = {
  email: 'boscochanam@gmail.com',
  github: 'https://github.com/boscochanam',
  linkedin: 'https://www.linkedin.com/in/boscochanam',
  linkedinLabel: '/in/boscochanam',
  x: 'https://x.com/boscochanam',
  xHandle: '@boscochanam', // also used for twitter:creator
  youtube: 'https://www.youtube.com/@boscochanam',
  youtubeLabel: '@boscochanam',
  letterboxd: 'https://letterboxd.com/boscochanam',
  cv: '#', // TODO: CV PDF URL
};

// Timeline, newest first. Each org has a span and one or more roles (dates: [from, to]).
export const experience = [
  {
    org: 'Bharat Forge',
    brand: 'bharatforge',
    span: 'Aug 2024 – Present',
    roles: [
      { dates: ['Aug 2025', 'Present'], title: 'AI/ML Engineer', meta: 'Full-time · Pune', note: 'Edge computer vision, robotics software and the team’s GPU platform.' },
      { dates: ['Aug 2024', 'Jul 2025'], title: 'AI/ML Engineer Intern', meta: 'Full-year placement · Pune' },
    ],
  },
  {
    org: 'Symbiosis Centre for Applied AI',
    brand: 'symbiosis',
    span: 'Jul 2023 – Dec 2025',
    roles: [{ dates: ['Jul 2023', 'Dec 2025'], title: 'Researcher', meta: 'Pune' }],
  },
  {
    org: 'Symbiosis Institute of Technology',
    brand: 'symbiosis',
    span: '2025',
    roles: [{ dates: ['', '2025'], title: 'B.Tech, Computer Science & Engineering', meta: 'Pune' }],
  },
];

export const tools = [
  {
    group: 'Edge & ML',
    items: [
      ['NVIDIA Jetson', 'nvidia'], ['TensorRT', 'nvidia'], ['Isaac Sim', 'nvidia'], ['PyTorch', 'pytorch'],
      ['OpenCV', 'opencv'], ['ROS 2', 'ros'], ['Docker', 'docker'], ['Kubernetes', 'kubernetes'],
    ],
  },
  {
    group: 'AI',
    items: [
      ['Claude Code', 'claude'], ['Codex', 'openai'], ['Cursor', 'cursor'], ['opencode', 'opencode'],
      ['Hermes Agent', 'nous'], ['Gemini', 'gemini'],
    ],
  },
  {
    group: 'Other',
    items: [
      ['Python', 'python'], ['FastAPI', 'fastapi'], ['PostgreSQL', 'postgresql'], ['React', 'react'],
      ['DaVinci Resolve', 'resolve'], ['Home Assistant', 'homeassistant'], ['Obsidian', 'obsidian'],
    ],
  },
] as const;

export const background = {
  papers: [
    { title: 'From Hand-Drawn Schematics to Structural Circuit Netlists', role: 'First author', meta: 'Manuscript · 2026' },
    {
      title: 'Optimizing Text Summarization: Benchmarking LLMs vs Domain Specialized Architectures',
      role: 'Co-author',
      meta: 'IJFIS · published',
    },
  ],
  recognition: [
    'Excellence Award for AI Innovation, Bharat Forge (2026)',
    'One of two engineers chosen to present our work to Union Home Minister Amit Shah',
    'Invited back to judge student projects, alongside panel members from Microsoft and Citi',
    'Talk on All India Radio, Imphal: “Role of AI in Shaping the Future of Youth”',
    'Flipkart Grid 5.0, top 0.5% nationwide',
  ],
};

export const about = {
  open: 'Happy to talk about computer vision, edge AI, robotics and agents.',
  copyright: '© 2026 Bosco Chanam',
};

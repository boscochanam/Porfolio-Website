
export const site = {
  name: 'Bosco Chanam',
  role: 'AI/ML Engineer',
  timeZone: 'Asia/Kolkata',
  zoneLabel: 'Pune, GMT+5:30',
  title: 'Bosco Chanam · AI/ML engineer, edge vision, robotics and agents',
  description:
    'AI/ML engineer at Bharat Forge in Pune. Computer vision on NVIDIA Jetson, rolling out to 10+ edge stations; robotics software on ROS 2; AI agents I use every day.',
  ogDescription:
    'Computer vision on NVIDIA Jetson, rolling out to 10+ edge stations. Primary inventor on its patent. Robotics on ROS 2, and AI agents at home.',
  ogImage: '/og.png',
  avatar: '/assets/avatar.webp',

  intro: [
    "I’m an AI/ML engineer at [[bharatforge|Bharat Forge]], one of the world’s largest forging companies. I build computer vision that checks factory work as it happens. It’s rolling out to **10+ edge stations** on [[nvidia|Jetson]], and I’m the primary inventor on its patent.",
    'I also own the software platform for a robotic bin-picking cell built on [[ros|ROS 2]], and I’m learning robot simulation in [[nvidia|Isaac Sim]].',
    'At home I run Clawsco, my fork of [[nous|Hermes Agent|https://github.com/NousResearch/hermes-agent]], and I build with [[claude|Claude Code]], [[openai|Codex]], [[cursor|Cursor]] and [[opencode|opencode]].',
    'Away from the screen, I love movies and making videos. I log what I watch on [[letterboxd|Letterboxd|https://letterboxd.com/boscochanam]] and post on [[youtube|YouTube|https://www.youtube.com/@boscochanam]].',
  ],
};

export const sky = {
  scene: 'earth',
  palette: '',
};

export const links = {
  email: 'boscochanam@gmail.com',
  github: 'https://github.com/boscochanam',
  linkedin: 'https://www.linkedin.com/in/boscochanam',
  x: 'https://x.com/boscochanam',
  xHandle: '@boscochanam',
  youtube: 'https://www.youtube.com/@boscochanam',
  letterboxd: 'https://letterboxd.com/boscochanam',
};

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
];

export const education = { brand: 'symbiosis', degree: 'B.Tech, Computer Science & Engineering', school: 'Symbiosis Institute of Technology' };

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
    { title: 'From Hand-Drawn Schematics to Structural Circuit Netlists', meta: 'First author · manuscript' },
    { title: 'Optimizing Text Summarization: Benchmarking LLMs vs Domain Specialized Architectures', meta: 'Co-author · IJFIS' },
  ],
  recognition: [
    { title: 'Excellence Award for AI Innovation', meta: 'Bharat Forge', icon: 'bharatforge' },
    { title: 'Chosen to present our work to Union Home Minister Amit Shah', meta: 'Bharat Forge', icon: 'bharatforge' },
    { title: 'Invited judge on a student project panel with members from Microsoft and Citi', meta: 'Symbiosis', icon: 'symbiosis' },
    { title: 'Talk: “Role of AI in Shaping the Future of Youth”', meta: 'All India Radio', icon: 'air' },
    { title: 'Top 0.5% nationwide', meta: 'Flipkart Grid 5.0', icon: 'flipkart' },
  ],
};

export const about = {
  open: 'Happy to talk about computer vision, edge AI, robotics and agents.',
  copyright: '© 2026 Bosco Chanam',
};

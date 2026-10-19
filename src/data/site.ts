// Single source for everything on the page except projects (those live in src/content/projects/).
// Strings may use **bold**; see src/lib/rich.ts.

export const site = {
  name: 'Bosco Chanam',
  role: 'AI/ML Engineer',
  location: 'Pune, India',
  // Used for <title>, og:title.
  title: 'Bosco Chanam — Edge & applied ML engineer',
  description:
    'AI/ML engineer in Pune. I ship computer vision to factory hardware: 11 stations across 2 plants, under 5 ms on Jetson, patent in preparation.',
  ogDescription:
    'I ship computer vision to factory hardware: 11 stations across 2 plants, under 5 ms on Jetson, patent in preparation.',
  ogImage: '/og.png',
  headshot: '/assets/headshot.jpg',

  // DRAFT: positioning line
  lede: 'I take computer-vision models off the notebook and onto hardware that runs all day, and build the infrastructure and operator screens around them.',

  proof: [
    'Shipped computer vision to **11 factory stations**',
    '**<5 ms** on Jetson',
    '**Patent** in prep',
    '**1st-author** IEEE paper',
  ],

  now: {
    label: 'Now · Oct 2026',
    items: [
      'Building a low-latency karaoke rig on a Jetson',
      'Writing on X about deploying edge AI',
      'Open to conversations about edge and applied ML',
    ],
  },
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
  cv: '#', // TODO: CV PDF URL
};

export const background = {
  work: {
    role: 'AI/ML Engineer',
    org: 'Bharat Forge, AI & Robotics Centre · Pune · Aug 2024 – now (joined as an intern)',
    scope:
      'Technical anchor for 5+ industrial AI and automation projects: edge CV, k3s deployments, PLC backends and operator UIs.',
  },
  education: {
    degree: 'B.Tech, Computer Science & Engineering',
    school: 'Symbiosis Institute of Technology, Pune · 2025',
  },
  papers: [
    { title: 'From Hand-Drawn Schematics to SPICE Netlists', role: 'First author', meta: 'IEEE Access · under revision' },
    {
      title: 'Optimizing Text Summarization: Benchmarking LLMs vs Domain Specialized Architectures',
      role: 'Co-author',
      meta: 'IJFIS · published',
    },
  ],
  recognition: [
    'Radio talk, AIR Imphal: “Role of AI in Shaping the Future of Youth”',
    'Invited judge, college project panel, alongside Citi and Microsoft',
    'Excellence award for AI innovation',
    'Flipkart Grid 5.0, top 0.5%',
  ],
};

export const about = {
  // DRAFT: About
  paragraphs: [
    'I grew up in Manipur and live in Pune. I like AI that people can rely on every day: in homes, in factories, and someday in space.',
    "Outside work I sing, which is why there's a karaoke rig on my bench. I automate my home a little more every month, and anything I want to remember goes into Anki.",
  ],
  open: 'Open to conversations about edge and applied ML.',
  copyright: '© 2026 Bosco Chanam',
};

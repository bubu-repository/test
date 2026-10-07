/**
 * Identity and profile. The identity block is final (brief §1).
 * Everything marked CONTOH is sample copy written so the site reads like the real thing.
 * Search the repo for "CONTOH" to find every value to replace.
 */

export const identity = {
  name: "Adelia Tiara",
  firstName: "Adelia",
  role: "AI Product Engineer",
  city: "Bekasi",
  country: "Indonesia",
  location: "Bekasi, Indonesia",
  domain: "adelia.cc",
  url: "https://adelia.cc",
  email: "aadeliatiara@gmail.com",
  timeZone: "Asia/Jakarta",
  timeZoneLabel: "WIB (UTC+7)",
  /** Bekasi, for the live weather widget. */
  coords: { lat: -6.2383, lon: 106.9756 },
  /** Working hours in Bekasi time, used by the overlap ring. */
  workingHours: { start: 9, end: 18 },
} as const;

/** The canonical hero sentence. The resampler starts from (and returns to) this. */
export const tagline = "I build AI products end to end, from the interface to the agents behind it.";

export const description =
  "Adelia Tiara is an AI Product Engineer in Bekasi, Indonesia. She builds AI products end to end: interfaces, fullstack apps and the agents behind them.";

/* CONTOH — ganti dengan data asli */
export const bio = {
  short:
    "Product engineer who ships AI features from the first sketch to the eval dashboard. I work across the whole stack, prototype fast with vibe coding, then harden what works.",
  long: [
    "I'm an AI product engineer based in Bekasi, just east of Jakarta. I like owning a product end to end: talking to users, designing the interface, building the fullstack app, and wiring the agents and evals behind it.",
    "My favourite problems sit where messy human input meets software: 200-page tender documents, voice notes full of market slang, a commuter's half-formed question at 6 a.m. I build agents that do the boring part and interfaces that make their work easy to check.",
    "I prototype with AI pair-programming (yes, vibe coding) to find the right shape quickly, then I slow down: typed code, real evals, and the boring reliability work that makes people trust an AI product.",
  ],
  now: "Building an eval harness for Indonesian-language agents and polishing this site.",
  availability: "Open to full-time AI product engineering roles, remote or Jakarta area.",
};

export type SkillGroup = { name: string; tone: "magenta" | "cobalt" | "lime" | "sun" | "violet"; items: string[] };

/* CONTOH — ganti dengan data asli */
export const skills: SkillGroup[] = [
  {
    name: "AI & agents",
    tone: "magenta",
    items: [
      "Agentic workflows and tool use",
      "Claude API",
      "RAG and pgvector",
      "Prompt and context design",
      "Evals and regression suites",
      "Structured extraction",
      "Speech-to-text pipelines",
    ],
  },
  {
    name: "Interface",
    tone: "cobalt",
    items: ["Product and UX design", "Figma", "React", "Next.js", "TypeScript", "Tailwind CSS", "WebGL and canvas", "Accessibility"],
  },
  {
    name: "Backend",
    tone: "lime",
    items: ["Node.js", "Python", "PostgreSQL", "Redis", "Queues and background jobs", "REST and webhooks", "Auth"],
  },
  {
    name: "Shipping",
    tone: "sun",
    items: ["Vibe coding to production", "CI/CD", "Vercel", "Docker", "Observability", "Analytics", "User research"],
  },
];

export type Experience = { period: string; title: string; org: string; summary: string };

/* CONTOH — ganti dengan data asli */
export const experience: Experience[] = [
  {
    period: "2024 — now",
    title: "AI Product Engineer (independent)",
    org: "Self-employed, Bekasi",
    summary: "Designing and building AI products end to end for small teams, plus my own products: Tenderlens, Catat and Lintas.",
  },
  {
    period: "2022 — 2024",
    title: "Fullstack Engineer",
    org: "Product startup, Jakarta",
    summary: "Shipped customer-facing features across a Next.js frontend and a Node/Postgres backend. Led the first LLM features.",
  },
  {
    period: "2018 — 2022",
    title: "B.Sc. Informatics",
    org: "University, West Java",
    summary: "Thesis on Indonesian-language text classification. Ran the campus web dev club.",
  },
];

/** Model card fields for /about (the page reads like a model card). */
/* CONTOH — ganti dengan data asli */
export const modelCard = {
  version: "v2026.10",
  architecture: "Human, caffeinated. Fine-tuned on product work.",
  trainingData: [
    "Four years of shipping web products",
    "Hundreds of user interviews in Bahasa Indonesia and English",
    "A lot of reading other people's prompts",
  ],
  intendedUse: [
    "Taking an AI product from a fuzzy idea to something people use every day",
    "Owning the interface, the fullstack app and the agent behind it",
    "Turning research into evals, and evals into decisions",
  ],
  outOfScope: [
    "Training foundation models from scratch",
    "Shipping an agent without an eval set",
    "Dark patterns",
  ],
  limitations: [
    "Will ask 'who is this for?' more than once",
    "Strong opinions about loading states",
    "Needs a second coffee before 9 a.m. WIB",
  ],
  evals: [
    { name: "Projects shipped end to end", score: "3 / 3" },
    { name: "Case studies with real evals", score: "3 / 3" },
    { name: "Languages", score: "Indonesian, English" },
    { name: "Response time to email", score: "< 24h" },
  ],
};

export type Social = { label: string; href: string | null };

/* CONTOH — ganti dengan data asli: isi href (null = disembunyikan) */
export const socials: Social[] = [
  { label: "GitHub", href: null },
  { label: "LinkedIn", href: null },
  { label: "Read.cv", href: null },
];

export const nav = [
  { label: "Work", href: "/work" },
  { label: "Lab", href: "/lab" },
  { label: "About", href: "/about" },
  { label: "Guestbook", href: "/guestbook" },
] as const;

export type NavHref = (typeof nav)[number]["href"];

/** Portfolio edition, shown in the footer. */
export const edition = "2026";

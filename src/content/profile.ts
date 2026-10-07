/**
 * Identity and profile. The identity block is final (brief §1).
 * Everything marked CONTOH is sample copy written so the site reads like the real thing.
 * Search the repo for "CONTOH" to find every value to replace.
 */

export const identity = {
  name: "Adelia Tiara",
  firstName: "Adelia",
  role: "AI Product Engineer",
  /** What she works on, in a few words (meta, the CV). */
  focus: "AI products",
  /** Fresh graduate: the degree and the year, shown next to the role (hero, ID card, brief, CV). */
  degree: "B.Sc. Informatics",
  cohort: "Class of 2026",
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
export const tagline = "I design and build AI products people can trust, from the first interview to the shipped code.";

export const description =
  "Adelia Tiara is an AI product engineer and 2026 Informatics graduate in Bekasi, Indonesia. She designs and builds AI products people can trust: the interface, the pipeline and the evals that keep it honest.";

/* CONTOH — ganti dengan data asli */
export const bio = {
  short:
    "AI product engineer, Informatics class of 2026. I take an AI feature from a conversation with the people who'll use it to production: the interface, the pipeline, the evals, and the unglamorous parts that keep it honest.",
  long: [
    "I'm a fresh Informatics graduate from a university in West Java, living in Bekasi, just east of Jakarta. I build for the moment an AI meets a messy, real person: a contractor reading a 214-page tender at night, a shop owner with one free hand, a commuter deciding in the time it takes to walk to the station.",
    "I learned by shipping. Lintas started as a second-year side project for my own commute. Catat came out of a campus incubator with two classmates. Tenderlens was my thesis, and a procurement consultancy now runs it for its clients. In between, I spent six months as an AI engineering intern in a product squad at an HR software startup, where a senior engineer reviewed every pull request I opened.",
    "The part of an AI product I care about most isn't the model. It's the source it shows, the moment it says 'I can't tell', the eval set that catches a regression before a user does, and the undo that makes a wrong answer cheap. I design those parts, and I write them.",
  ],
  team: "On a team, I'm the engineer who goes to the field first, brings a working prototype to the second meeting, and writes the eval before the prompt, so the PM and the designer can argue with real output instead of mockups.",
  now: "Maintaining Tenderlens's eval set for the consultancy that runs it, and writing up my thesis on when a document AI should abstain.",
  availability: "Graduated in 2026. Open to full-time AI Product Engineer roles (new grad or junior), remote or in the Jakarta area.",
};

/** How she works: the principles behind every case study (home, the brief, the agent). */
/* CONTOH — ganti dengan data asli */
export const principles = [
  { title: "One decision per screen", body: "Every screen answers one question the person came with. Everything else waits one tap away." },
  { title: "Show the receipts", body: "If an AI says it, the person can check it. Citations, abstaining and undo are features I design and build, not afterthoughts." },
  { title: "Write the eval first", body: "Before I touch a prompt, I write down what 'right' means and collect real cases. Every change runs against them, so 'it feels better' becomes a number." },
  { title: "Test with real data", body: "Real tenders, real voice notes, real slang ('goceng', not 'IDR 5,000'). A Figma frame can't misread a voice note, so I prototype in code." },
];

export type SkillGroup = { name: string; tone: "magenta" | "cobalt" | "lime" | "sun" | "violet"; items: string[] };

/* CONTOH — ganti dengan data asli */
export const skills: SkillGroup[] = [
  {
    name: "AI engineering",
    tone: "violet",
    items: [
      "LLM APIs and tool use (Claude)",
      "Retrieval (pgvector, hybrid search)",
      "Evals and regression tests",
      "Structured output and validation",
      "Abstention and guardrails",
      "Speech-to-text (Whisper)",
      "Cost and latency budgets",
    ],
  },
  {
    name: "Full-stack",
    tone: "sun",
    items: ["TypeScript", "React and Next.js", "Python (FastAPI)", "PostgreSQL", "Testing (Vitest, Playwright)", "Queues and background jobs", "CI, Docker, Vercel"],
  },
  {
    name: "Product design",
    tone: "magenta",
    items: ["Field research and interviews", "Interaction design", "UX writing", "Usability testing", "Design systems", "Accessibility (WCAG 2.2)", "Figma"],
  },
  {
    name: "Designing for AI",
    tone: "cobalt",
    items: ["Trust and citations", "Designing for uncertainty", "Human-in-the-loop review", "Conversation design", "Error recovery and undo"],
  },
];

export type Experience = { period: string; title: string; org: string; summary: string; highlights?: string[] };

/* CONTOH — ganti dengan data asli */
export const experience: Experience[] = [
  {
    period: "2026 — now",
    title: "AI Product Engineer (independent)",
    org: "Bekasi",
    summary: "Maintaining Tenderlens for the procurement consultancy that runs it: the eval set, the extraction pipeline and fixes, while I look for a full-time role.",
    highlights: [
      "Grew the eval set from 240 to 610 hand-labelled fields; every release runs against it in CI",
      "Cut the cost per brief from Rp 1,900 to Rp 420 by sending easy pages to a smaller model",
    ],
  },
  {
    period: "Feb — Aug 2025",
    title: "AI Engineering Intern",
    org: "Series A HR software startup, Jakarta · 60 people",
    summary:
      "Six months in a product squad with a PM, three engineers, a data scientist and a product designer. I built most of Ask HR's answer pipeline and the HR review queue, with a senior engineer reviewing every pull request.",
    highlights: [
      "Built the topic-and-risk router and its 1,200-question test set with the data scientist",
      "Built the HR review queue in React from the design system; HR clears 20 drafts in under 9 minutes",
      "Wrote the weekly accuracy audit the squad still runs",
    ],
  },
  {
    period: "2022 — 2026",
    title: "B.Sc. Informatics, AI and HCI track",
    org: "University, West Java · GPA 3.78 / 4.00",
    summary:
      "Thesis: 'Answer or abstain: citation-grounded extraction from Indonesian tender documents', the research behind Tenderlens. Teaching assistant for Human–Computer Interaction; ran the campus design and web club.",
    highlights: ["Built Lintas (2024) and Catat (2025, campus incubator) during my studies", "Published the thesis eval set so other students can test against it"],
  },
];

/** The plain facts a recruiter needs, on /about. CONTOH — ganti dengan data asli */
export const practical: { label: string; value: string }[] = [
  { label: "Looking for", value: "A full-time AI Product Engineer role (new grad or junior) on an AI product" },
  { label: "Graduated", value: "B.Sc. Informatics, AI and HCI track, 2026" },
  { label: "Experience", value: "A 6-month AI engineering internship in a product squad, and three AI products of my own with real users" },
  { label: "Where", value: "Bekasi, Indonesia (GMT+7). Remote, or hybrid in Jakarta up to 3 days a week" },
  { label: "Time zones", value: "4+ hours of overlap with anything from GMT+4 (Dubai) to GMT+10 (Sydney)" },
  { label: "Start", value: "Within 2 weeks of an offer" },
  { label: "Languages", value: "Indonesian (native), English (full professional)" },
  { label: "References", value: "My internship mentor and PM, my thesis supervisor, and Bu Ratna (Tenderlens). On request" },
  { label: "Why a team now", value: "I've shipped three products mostly alone. I want to learn how a team ships AI at scale, and I'll bring the field research, the evals and the front end with me." },
];

/** Model card fields for /lab (the page reads like a model card). */
/* CONTOH — ganti dengan data asli */
export const modelCard = {
  version: "v2026.10",
  architecture: "Human, caffeinated. Pre-trained on four years of Informatics, fine-tuned on shipped products.",
  trainingData: [
    "A B.Sc. in Informatics (2026), and three AI products shipped along the way",
    "Six months in a product squad, with every pull request reviewed",
    "130+ research sessions in Bahasa Indonesia and English",
    "A notebook of every slang word for money in Greater Jakarta",
  ],
  intendedUse: [
    "Taking an AI feature from a fuzzy idea to production, with the evals to prove it works",
    "Building how an AI shows its work: sources, abstaining, undo",
    "Turning field research into decisions a team can build on",
  ],
  outOfScope: ["Designing an AI feature nobody asked for", "Shipping an agent without testing its mistakes with real people", "Dark patterns"],
  limitations: ["New grad: hasn't worked on a system with millions of users yet", "Will ask 'what's the eval?' more than once", "Strong opinions about loading states and empty states"],
  evals: [
    { name: "AI products shipped", score: "3 + 1 at work" },
    { name: "Hand-labelled eval cases", score: "2,100+" },
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

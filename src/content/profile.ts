/**
 * Identity and profile. The identity block is final (brief §1).
 * Everything marked CONTOH is sample copy written so the site reads like the real thing.
 * Search the repo for "CONTOH" to find every value to replace.
 */

export const identity = {
  name: "Adelia Tiara",
  firstName: "Adelia",
  role: "Product Designer",
  /** What kind of product designer, in a few words (hero, meta, the CV). */
  focus: "AI products",
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
export const tagline = "I design AI products people can trust, from the first interview to the shipped interface.";

export const description =
  "Adelia Tiara is a product designer in Bekasi, Indonesia. She designs AI products people can trust, from the first interview to the shipped interface, and prototypes them in real code.";

/* CONTOH — ganti dengan data asli */
export const bio = {
  short:
    "Product designer for AI products. I find the one decision a person is trying to make, design the interface (and the AI behind it) around that decision, and prototype in real code so what we test is what ships.",
  long: [
    "I'm a product designer based in Bekasi, just east of Jakarta. I design for the moment an AI meets a messy, real person: a contractor reading a 214-page tender at night, a shop owner with one free hand, a commuter deciding in the time it takes to walk to the station.",
    "My work starts in the field. I sit behind shop counters, shadow bid teams and ride the 06:40 train with the people I design for, then I turn what I saw into one sharp question the product has to answer. Most of my design work is deciding what to leave out.",
    "AI changes what an interface has to do. It has to show its sources, admit uncertainty, and make a wrong answer cheap to fix. That's the part I care about most, and it's why I prototype in code: you can't judge how an AI product feels from a static frame.",
  ],
  team: "On a team, I'm the designer who goes to the field first, brings a working prototype to the second meeting, and writes every decision down with what it costs, so engineers and PMs can argue with it before it ships.",
  now: "Designing review flows for Indonesian-language AI agents, and writing up what I learned about citations as a trust pattern.",
  availability: "Open to full-time Product Designer roles on AI products, remote or in the Jakarta area.",
};

/** How she works: the principles behind every case study (About, the brief, the agent). */
/* CONTOH — ganti dengan data asli */
export const principles = [
  { title: "One decision per screen", body: "Every screen I design answers one question the person came with. Everything else waits one tap away." },
  { title: "Show the receipts", body: "If an AI says it, the person can check it. Sources, confidence and an undo are part of the design, not an afterthought." },
  { title: "Their words, not ours", body: "Interfaces speak the way users talk: 'goceng', not 'IDR 5,000'. I collect the vocabulary in the field before I name a single button." },
  { title: "Prototype the real thing", body: "AI products are about timing, errors and waiting. I test them in code with real data, because a Figma frame can't misread a voice note." },
];

export type SkillGroup = { name: string; tone: "magenta" | "cobalt" | "lime" | "sun" | "violet"; items: string[] };

/* CONTOH — ganti dengan data asli */
export const skills: SkillGroup[] = [
  {
    name: "Product design",
    tone: "magenta",
    items: ["Field research and interviews", "Problem framing", "Interaction design", "UX writing", "Usability testing", "Design systems", "Accessibility (WCAG 2.2)"],
  },
  {
    name: "Designing for AI",
    tone: "violet",
    items: ["Trust and citations", "Designing for uncertainty", "Human-in-the-loop review", "Conversation design", "Error recovery and undo", "Evals with real users"],
  },
  {
    name: "Craft",
    tone: "cobalt",
    items: ["Figma", "Prototyping in code", "Motion and micro-interaction", "Type and layout", "Information design", "Mobile-first"],
  },
  {
    name: "Build",
    tone: "sun",
    items: ["React and Next.js", "TypeScript", "Tailwind CSS", "Claude API", "PostgreSQL", "Shipping to production"],
  },
];

export type Experience = { period: string; title: string; org: string; summary: string; highlights?: string[] };

/* CONTOH — ganti dengan data asli */
export const experience: Experience[] = [
  {
    period: "2024 — now",
    title: "Product Designer (independent)",
    org: "Self-employed, Bekasi",
    summary: "Designed and shipped three AI products of my own, Tenderlens, Catat and Lintas, from the first interview to real users. I prototype and build the front end myself.",
    highlights: ["Handed Tenderlens to a procurement consultancy and Catat to a cooperative; Lintas is open source", "130+ research sessions in Indonesian and English"],
  },
  {
    period: "2022 — 2024",
    title: "Product Designer, then Design Engineer",
    org: "Series A HR software startup, Jakarta · 60 people",
    summary: "One of three product designers, in a squad with a PM and four engineers. I owned the employee app and led design for the company's first LLM feature.",
    highlights: [
      "Led design of AI reply drafts for HR teams: first replies 28% faster across 40 client companies",
      "Rebuilt the component library in code with two engineers; three squads adopted it within a quarter",
      "Ran the weekly design critique and onboarded two junior designers",
    ],
  },
  {
    period: "2018 — 2022",
    title: "B.Sc. Informatics, HCI track",
    org: "University, West Java",
    summary: "Thesis on how Indonesian users read machine-generated text. Ran the campus design and web club.",
  },
];

/** The plain facts a recruiter needs, on /about. CONTOH — ganti dengan data asli */
export const practical: { label: string; value: string }[] = [
  { label: "Looking for", value: "A full-time Product Designer role (individual contributor) on an AI product" },
  { label: "Experience", value: "4 years in product design: 2 in-house at a Series A startup, 2 independent" },
  { label: "Where", value: "Bekasi, Indonesia (GMT+7). Remote, or hybrid in Jakarta up to 3 days a week" },
  { label: "Time zones", value: "4+ hours of overlap with anything from GMT+4 (Dubai) to GMT+10 (Sydney)" },
  { label: "Start", value: "Within 2 weeks of an offer" },
  { label: "Languages", value: "Indonesian (native), English (full professional)" },
  { label: "References", value: "My former PM and engineering lead at the HR startup, and Bu Ratna (Tenderlens). On request" },
  { label: "Why full-time now", value: "All three of my products are handed over or stable. I want to go deep on one product with a team for years, not alone on three for months." },
];

/** Model card fields for /lab (the page reads like a model card). */
/* CONTOH — ganti dengan data asli */
export const modelCard = {
  version: "v2026.10",
  architecture: "Human, caffeinated. Fine-tuned on field research and shipped product.",
  trainingData: [
    "Four years of designing and shipping web products",
    "130+ research sessions in Bahasa Indonesia and English, across three products",
    "A notebook of every slang word for money in Greater Jakarta",
  ],
  intendedUse: [
    "Taking an AI product from a fuzzy idea to something people use every day",
    "Designing how an AI shows its work: sources, confidence, undo",
    "Turning field research into decisions a team can build on",
  ],
  outOfScope: ["Designing an AI feature nobody asked for", "Shipping an agent without testing its mistakes with real people", "Dark patterns"],
  limitations: ["Will ask 'who is this for?' more than once", "Strong opinions about loading states and empty states", "Needs a second coffee before 9 a.m. WIB"],
  evals: [
    { name: "Products designed and shipped", score: "3 / 3" },
    { name: "Research sessions, 2024–25", score: "130+" },
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

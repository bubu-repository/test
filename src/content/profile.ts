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
  now: "Maintaining Tenderlens and its regression set for the consultancy that runs it, about 8 hours a week, while I look for a full-time team.",
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

export type SkillGroup = { name: string; tone: "accent" | "cobalt" | "lime" | "sun" | "violet"; items: string[] };

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
    tone: "accent",
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
    period: "Apr 2026 — now",
    title: "Part-time contract engineer, Tenderlens",
    org: "Bu Ratna's procurement consultancy, Bekasi · about 8 hours a week",
    summary: "Maintaining the pipeline I built in my thesis for the 31 teams it now serves, while I look for a full-time role.",
    highlights: [
      "Labelled a 180-field regression set of 2026 tenders; CI runs it on every change, and its first run blocked a release",
      "Shipped v7 (licence codes compared exactly) from the error analysis of the thesis test set, measured on the regression set",
    ],
  },
  {
    period: "Feb — Aug 2025",
    title: "AI Engineering Intern",
    org: "HR software startup, Jakarta (name under NDA)",
    summary:
      "Six months in a product squad of seven. I built Ask HR's answer writer and retrieval (with my mentor), the lane router (with the data scientist) and the HR review queue.",
    highlights: [
      "Built the topic-and-risk router with the data scientist, and the harness that replayed the pilot by topic",
      "Built the HR review queue in React from the design system; HR clears 20 drafts in about 9 minutes and caught 14 of 15 planted errors",
      "Wrote the weekly accuracy audit the squad still runs",
    ],
  },
  {
    period: "2022 — 2026",
    title: "B.Sc. Informatics, AI and HCI track",
    org: "University, West Java · GPA 3.78 / 4.00",
    summary:
      "Thesis (Sep 2025 – Mar 2026): 'Answer or abstain: citation-grounded extraction from Indonesian tender documents', the research behind Tenderlens. Teaching assistant for Human–Computer Interaction; ran the campus design and web club.",
    highlights: [
      "Thesis: a 610-field eval set (dev and held-out test, κ 0.87), and cost per tender cut from Rp 3,900 to Rp 1,650 with page triage (Rp 420 on today's models)",
      "During the beta, the rejected-claims alert caught a portal's broken PDF text layer (March 2026); those pages now go through OCR",
      "Built Lintas (Mar – Jun 2024) and Catat (campus incubator, Sep – Dec 2024) during my studies",
      "Published the dev set and part of the test set so other students can test against it",
    ],
  },
];

/** The plain facts a recruiter needs, on /about. CONTOH — ganti dengan data asli */
export const practical: { label: string; value: string }[] = [
  { label: "Looking for", value: "A full-time AI Product Engineer role (new grad or junior) on an AI product" },
  { label: "Graduated", value: "B.Sc. Informatics, AI and HCI track, 2026" },
  { label: "Experience", value: "A 6-month AI engineering internship in a product squad (2025), a part-time contract maintaining Tenderlens (2026), and four products with real users" },
  { label: "Where", value: "Bekasi, Indonesia (GMT+7). First choice: a Jakarta team, in the office up to 3 days a week. Also remote" },
  { label: "Time zones", value: "Usual hours 09:00–18:00 WIB (GMT+7): 4+ hours of overlap from Dubai to Sydney. For European teams, 12:00–21:00 WIB gives about 6 hours with CET. For US teams, async first, with a daily 07:00–09:00 WIB call (16:00–18:00 the day before in San Francisco)" },
  { label: "Work setup", value: "Indonesian citizen, no visa needed in Indonesia. Teams abroad can hire me as a contractor or through an employer of record; open to relocating with sponsorship (Singapore, Dubai, Europe, the US)" },
  { label: "Start", value: "Within 2 weeks of an offer. The Tenderlens contract hands over to the consultancy's engineer" },
  { label: "Salary", value: "On request, by email; happy to share a range early" },
  { label: "Languages", value: "Indonesian (native), English (full professional)" },
  { label: "AI in my work", value: "Claude Code for scaffolding, refactors and tests, with every diff reviewed. The evals, the labels, the rules and the verification code I write myself" },
  { label: "References", value: "Bayu (my internship mentor, senior engineer), Nadia (PM), my thesis supervisor, and Bu Ratna (Tenderlens). On request" },
  { label: "Why a team now", value: "Most of what I've built, I built alone or in a team of three, with a six-month internship as my only big-squad experience. I want to learn how a team ships AI at scale, and I'll bring the field research, the evals and the front end with me." },
];

/** Model card fields for /lab (the page reads like a model card). */
/* CONTOH — ganti dengan data asli */
export const modelCard = {
  version: "v2026.10",
  architecture: "Human, caffeinated. Pre-trained on four years of Informatics, fine-tuned on shipped products.",
  trainingData: [
    "A B.Sc. in Informatics (2026), and three AI products shipped along the way",
    "Six months in a product squad, with every pull request reviewed",
    "130+ research sessions, in Bahasa Indonesia",
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
    { name: "AI products with real users", score: "3 + 1 internship" },
    { name: "Eval cases labelled by hand, with collaborators", score: "2,100+" },
    { name: "Languages", score: "Indonesian, English" },
    { name: "Response time to email", score: "< 24h" },
  ],
};

export type Social = { label: string; href: string | null };

/* CONTOH — ganti dengan data asli: isi href (null = disembunyikan) */
export const socials: Social[] = [
  { label: "GitHub", href: "https://github.com/example" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/example" },
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

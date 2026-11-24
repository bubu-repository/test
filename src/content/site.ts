/**
 * Every word and fact on adelia.cc lives here.
 *
 * Sources, in order of trust:
 *  1. Adelia's own words in the revamp brief (Nov 2026): product designer and AI product engineer in
 *     Indonesia, builds interactive websites end to end with vibe coding, wants remote work abroad.
 *  2. The identity block of the live adelia.cc (marked final there): name, city, email, time zone,
 *     degree, class year, tagline.
 *  3. Evidence in this repository (the site itself is her work).
 *
 * Anything else is a gap and is marked TODO_SEA. Search the repo for TODO_SEA to find every one.
 * A value that starts with "TODO_SEA" is shown on the site as a visible placeholder, never hidden,
 * so nothing looks finished when it is not.
 *
 * House rules for copy (enforced by `npm run qa`): no em dashes, no en dashes, no stock AI words
 * (see scripts/slop-words.json). Write like a person: short sentences, real nouns.
 */

export const TODO = 'TODO_SEA';
export const isTodo = (v: string | undefined | null) => !v || v.startsWith(TODO);

export const person = {
  name: 'Adelia Tiara',
  firstName: 'Adelia',
  role: 'Product Designer & AI Product Engineer',
  roleShort: 'Product designer · AI product engineer',
  city: 'Bekasi',
  country: 'Indonesia',
  timeZone: 'Asia/Jakarta',
  timeZoneLabel: 'WIB · UTC+7',
  /** Her working hours in Bekasi time, used by the overlap gauge. TODO_SEA: confirm. */
  workHours: { start: 9, end: 18 },
  degree: 'B.Sc. Informatics, class of 2026',
  email: 'aadeliatiara@gmail.com',
  domain: 'adelia.cc',
  status: 'Open to remote roles abroad',
  /** The one sentence a recruiter needs (Yan's first card): who, what, where, open to. */
  intro:
    'I design and build AI products and interactive websites end to end, from the first sketch to the shipped code.',
  /** From the live site, kept as her line. */
  tagline: 'I design and build AI products people can trust, from the first interview to the shipped code.',
} as const;

export type LinkItem = { label: string; href: string; note?: string };

/** TODO_SEA (open question 4): CV link, LinkedIn and Instagram handle. */
export const links: LinkItem[] = [
  { label: 'Email', href: `mailto:${person.email}` },
  { label: 'CV', href: 'TODO_SEA: CV link (PDF or Drive)' },
  { label: 'LinkedIn', href: 'TODO_SEA: LinkedIn URL' },
  { label: 'Instagram', href: 'TODO_SEA: Instagram handle' },
];

export type Project = {
  id: 'p1' | 'p2' | 'p3';
  run: string;
  name: string;
  /** One sentence, starting with a verb, about what changed for the people who used it. */
  result: string;
  role: string;
  year: string;
  /** shipped | in-progress | concept. TODO_SEA until she confirms. */
  status: string;
  /** Path under /public or a full URL. TODO_SEA: one visual each. */
  visual: string;
  /** Real phases only (brief, research, design, build, launch...). Empty until supplied. */
  phases: { name: string; kind: 'design' | 'build' | 'ai' | 'research' }[];
  /** The evidence checklist (see docs/concept.md, "Project runs"). Each item counts only with a link. */
  evidence: {
    shipped?: string; // link to the live product or a release note
    role?: string; // her role in her own words
    outcome?: { metric: string; source: string }; // a measured result and where it comes from
    artefacts?: string; // case study, prototype or repo link
  };
  links: LinkItem[];
};

/**
 * The 3 best projects (open question 1). Nothing here is invented: every field is a TODO_SEA slot.
 * Open question 2: may Indonesia Centre and Sea Knowledge appear publicly? Until she says yes,
 * their names stay out of the site.
 */
export const projects: Project[] = [
  {
    id: 'p1',
    run: 'Run 01',
    name: 'TODO_SEA: project name',
    result: 'TODO_SEA: one result sentence, starting with a verb',
    role: 'TODO_SEA: role',
    year: 'TODO_SEA',
    status: 'TODO_SEA',
    visual: 'TODO_SEA: one visual',
    phases: [],
    evidence: {},
    links: [],
  },
  {
    id: 'p2',
    run: 'Run 02',
    name: 'TODO_SEA: project name',
    result: 'TODO_SEA: one result sentence, starting with a verb',
    role: 'TODO_SEA: role',
    year: 'TODO_SEA',
    status: 'TODO_SEA',
    visual: 'TODO_SEA: one visual',
    phases: [],
    evidence: {},
    links: [],
  },
  {
    id: 'p3',
    run: 'Run 03',
    name: 'TODO_SEA: project name',
    result: 'TODO_SEA: one result sentence, starting with a verb',
    role: 'TODO_SEA: role',
    year: 'TODO_SEA',
    status: 'TODO_SEA',
    visual: 'TODO_SEA: one visual',
    phases: [],
    evidence: {},
    links: [],
  },
];

export type SkillKind = 'design' | 'build' | 'ai';
export type Skill = { name: string; kind: SkillKind; evidence: string };

/**
 * Skills. Each one names where it can be checked. "This site" means the code in this repository.
 * TODO_SEA: confirm the list and add the project each skill was used on.
 */
export const skills: Skill[] = [
  { name: 'Product design', kind: 'design', evidence: 'Her role, in her words' },
  { name: 'UI and interaction design', kind: 'design', evidence: 'This site' },
  { name: 'Design systems and tokens', kind: 'design', evidence: 'This site: src/styles/tokens.css' },
  { name: 'Motion design', kind: 'design', evidence: 'This site: the bento to room transition' },
  { name: 'React and TypeScript', kind: 'build', evidence: 'This site' },
  { name: 'CSS 3D and View Transitions', kind: 'build', evidence: 'This site: the room' },
  { name: 'Accessibility', kind: 'build', evidence: 'This site: keyboard room, reduced motion' },
  { name: 'Vibe coding, end to end', kind: 'ai', evidence: 'Her words: she builds sites end to end with AI' },
  { name: 'AI product design', kind: 'ai', evidence: 'Her role, in her words' },
];

export const skillKinds: Record<SkillKind, { label: string; shape: 'circle' | 'hex' | 'diamond' }> = {
  design: { label: 'Design', shape: 'circle' },
  build: { label: 'Build', shape: 'hex' },
  ai: { label: 'AI', shape: 'diamond' },
};

/** The frosted "today" board in the room. */
export const today = {
  availability: person.status,
  timeZone: person.timeZoneLabel,
  focus: 'TODO_SEA: what you are working on this month',
  roles: 'TODO_SEA: the roles you want (for example: product designer, design engineer)',
  start: 'TODO_SEA: earliest start date',
};

/** What the figure says when tapped. Only lines that are true and in her voice. */
export const figureLines = [
  "Hi, I'm Adelia. Welcome to my room.",
  'Everything in here opens something. Try the phone on the table.',
  'The three frames on the wall are my best work.',
  "My window shows Bekasi's sky. Check how our hours line up.",
  'Press Esc to close anything. The Back to Bento button takes you out.',
];

/** Posts: the long About, one post at a time. TODO_SEA posts are shown as drafts. */
export type Post = { id: string; date: string; title: string; body: string };
export const posts: Post[] = [
  {
    id: 'hello',
    date: 'Nov 2026',
    title: "Hi, I'm Adelia",
    body:
      "I'm a product designer and AI product engineer in Bekasi, Indonesia. I design an interface and then build it myself, so the thing you click is the thing I drew. I'm looking for a remote team abroad.",
  },
  {
    id: 'site',
    date: 'Nov 2026',
    title: 'Why my portfolio has a room in it',
    body:
      'The front page is a bento so you can read me in five seconds. Behind it is my room, built in CSS: a phone that works, frames for my work, a window with my sky. I like interfaces you can poke at, so I made one.',
  },
  {
    id: 'vibe',
    date: 'Nov 2026',
    title: 'How I build',
    body:
      'I sketch, then build with AI as my pair. I keep the tokens, the motion and the accessibility in my own hands, and I check every screen on a real phone before I call it done.',
  },
  { id: 'start', date: 'TODO_SEA', title: 'TODO_SEA: how I started designing', body: 'TODO_SEA: write this post in your own words.' },
  { id: 'learning', date: 'TODO_SEA', title: 'TODO_SEA: what I am learning now', body: 'TODO_SEA: write this post in your own words.' },
];

/** Chat: a recruiter FAQ. Answers use facts above only. */
export type ChatQA = { q: string; a: string[]; action?: 'email' | 'work' | 'cv' };
export const chat: ChatQA[] = [
  { q: 'Are you open to remote work?', a: ['Yes. Remote roles abroad are exactly what I am looking for.', `I work from Bekasi, ${person.timeZoneLabel}.`] },
  { q: 'What do you do, in one line?', a: [person.intro] },
  { q: 'Which time zone are you in?', a: [`${person.timeZoneLabel}. My window in the room shows my sky, and the phone shows how our working hours overlap.`] },
  { q: 'Can I see your work?', a: ['The three frames on the wall are my best projects. Want me to open the first one?'], action: 'work' },
  { q: 'Can I get your CV?', a: ['TODO_SEA: CV link. Until then, email me and I will send it.'], action: 'cv' },
  { q: 'What did you study?', a: [`${person.degree}.`] },
  { q: 'How do I reach you?', a: [`Email is fastest: ${person.email}`], action: 'email' },
];

/** Call: a voice intro with captions. TODO_SEA: record about 30 seconds and set `audio`. */
export const call = {
  audio: 'TODO_SEA: /call/intro.mp3',
  captions: [
    "Hi, this is Adelia. Thanks for calling my room.",
    "I'm a product designer and AI product engineer in Indonesia.",
    'I design interfaces and build them myself, end to end.',
    "I'm looking for a remote team abroad. If that's you, email me.",
  ],
};

/** Archive (the shelf album, open question 3: Wall of Work or one of the two projects). */
export const archive = {
  note: 'TODO_SEA: decide whether this is the Wall of Work, and add dated pieces.',
  items: [] as { date: string; title: string; href?: string; image?: string }[],
};

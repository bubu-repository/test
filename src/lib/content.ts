/* ==========================================================================
   ADELIA’S ROOM — canonical room content
   The room’s copy in one place. Every fact about Adelia comes from
   src/content/* (ported from the legacy adelia.cc; its projects.ts is the
   source of truth for every number). Values marked CONTOH are placeholders
   the owner will replace: search the repo for "CONTOH".
   Admin-editable collections (news, events, launch, redirect) are seeded from
   here and can be overridden via /api/content.

   Export names and shapes are kept from dside because ~40 files import them;
   fields were only added, never removed.
   ========================================================================== */
import { bio, identity, socials, tagline } from '@/content/profile';

export const COMPANY = {
  name: identity.name, // 'Adelia Tiara'
  firstName: identity.firstName,
  /** The line under her name wherever dside printed the holding company. */
  holding: `${identity.degree}, ${identity.cohort.toLowerCase()}`, // 'B.Sc. Informatics, class of 2026'
  tagline, // the hero sentence
  positioning: identity.role, // 'AI Product Engineer'
  role: identity.role,
  degree: identity.degree,
  cohort: identity.cohort,
  /** The year her path starts: the first year of her Informatics degree. */
  founded: 2022,
  hq: identity.location, // 'Bekasi, Indonesia'
  city: identity.city,
  country: identity.country,
  email: identity.email,
  /** She has no public phone number (the legacy site lists none). Kept empty so the files that
   *  print dside’s phone lines can drop them; never put a made-up number here. */
  phone: '',
  phoneRaw: '',
  hasPhone: false,
  site: identity.url, // 'https://adelia.cc'
  domain: identity.domain,
  address: identity.location,
  timeZone: identity.timeZone,
  timeZoneLabel: identity.timeZoneLabel,
  coords: identity.coords,
  workingHours: identity.workingHours,
  availability: bio.availability,
  now: bio.now,
  /** Legacy footer: "Replies within a day." (model card: response time to email < 24h). */
  replyTime: 'Replies within a day',
  cv: '/cv.pdf',
  /* CONTOH — the legacy socials are placeholders (github.com/example …); Read.cv stays hidden until it has a link. */
  socials: socials
    .filter((s): s is { label: string; href: string } => !!s.href)
    .map((s) => ({ id: s.label.toLowerCase().replace(/[^a-z]/g, ''), label: s.label, url: s.href })),
};

/** What makes her different, in four words (brand platform §2). */
export const EDGE = [
  { id: 'checkable', label: 'Checkable', body: 'The model reads and quotes, code checks, rules decide. Every claim opens its source.' },
  { id: 'evals', label: 'Evals first', body: '2,100+ cases labelled by hand, and a regression set in CI that has already blocked a release.' },
  { id: 'field', label: 'Field-born', body: '130+ research sessions in Bahasa Indonesia, from warung counters to bid teams.' },
  { id: 'shipped', label: 'Shipped', body: 'Four AI products with real users: 31 teams, 140 warung, 40 HR clients, 1.4k riders at peak.' },
];

export const METHOD = ['Go to the field', 'Write the eval', 'Ship the receipts'];

/** The five chapters of the room double as the five House Rules the visitor
 *  collects at key objects (vault, news, computer, Moci, window). Bodies are her
 *  working principles, in her words (legacy profile.ts `principles` and `bio`). */
export type ChapterId = 'toolkit' | 'proof' | 'build' | 'play' | 'hello';

export const CHAPTERS: {
  id: ChapterId;
  n: number;
  roman: string;
  title: string;
  kicker: string;
  line: string; // the House Rule the visitor collects when they complete it
  body: string;
}[] = [
  {
    id: 'toolkit',
    n: 1,
    roman: 'I',
    title: 'Toolkit',
    kicker: 'What she builds with, one object at a time',
    line: 'Write the eval before the prompt.',
    body: 'Before I touch a prompt, I write down what ‘right’ means and collect real cases. Every change runs against them, so ‘it feels better’ becomes a number.',
  },
  {
    id: 'proof',
    n: 2,
    roman: 'II',
    title: 'Proof',
    kicker: 'Four products with real users, every number with its method',
    line: 'Show the receipts.',
    body: 'If an AI says it, the person can check it. Citations, abstaining and undo are features I design and build, not afterthoughts.',
  },
  {
    id: 'build',
    n: 3,
    roman: 'III',
    title: 'Build',
    kicker: 'How she designs what she ships',
    line: 'One decision per screen.',
    body: 'Every screen answers one question the person came with. Everything else waits one tap away.',
  },
  {
    id: 'play',
    n: 4,
    roman: 'IV',
    title: 'Play',
    kicker: 'Toys with a job: every game here is a small product',
    line: 'Make a wrong answer cheap.',
    body: 'The part of an AI product I care about most isn’t the model. It’s the moment it says ‘I can’t tell’, and the undo that makes a wrong answer cheap.',
  },
  {
    id: 'hello',
    n: 5,
    roman: 'V',
    title: 'Hello',
    kicker: 'Book a chat, email her, or leave a note in the aquarium',
    line: 'Go to the field first.',
    body: 'Real tenders, real voice notes, real slang (‘goceng’, not ‘IDR 5,000’). A Figma frame can’t misread a voice note, so I go to the field first and prototype in code.',
  },
];

/** Her path, one entry per year (the clock and the archive select by year, so years must be
 *  unique). 2023 is left out: the legacy content dates nothing to it. */
export const TIMELINE = [
  {
    year: 2022,
    title: 'Informatics, day one',
    body: 'Starts a B.Sc. in Informatics at a university in West Java, on the AI and HCI track.',
  },
  {
    year: 2024,
    title: 'Lintas, then Catat',
    body: 'Builds Lintas for her own Bekasi–Jakarta commute (Mar–Jun; 1.4k weekly riders at peak), then co-founds Catat in the campus incubator (Sep–Dec; 140 warung in the pilot).',
  },
  {
    year: 2025,
    title: 'Ask HR, then the thesis',
    body: 'Six months as an AI engineering intern in a product squad of seven (Feb–Aug), while Ask HR rolls out to all 40 clients. In September she starts the Tenderlens thesis.',
  },
  {
    year: 2026,
    title: 'Graduated, and looking',
    body: 'Finishes the thesis in March and graduates. Since April a procurement consultancy runs Tenderlens for 31 teams; she maintains it part-time while she looks for a full-time team.',
  },
];

/* --------------------------------------------------------------------------
   Products — the Toolkit: six objects on the chrome shelf, one capability
   each, with a spec sheet and the evidence behind it. Ids match the lead’s
   hit areas in plate.ts. (The gacha machine / 3D vault is not a product here:
   its copy lives in features/products/vaultData.ts → VAULT_PRODUCT.)
   -------------------------------------------------------------------------- */
export type ProductId = 'field-research' | 'retrieval' | 'evals' | 'agents' | 'design' | 'full-stack';

export interface Product {
  /** One of ProductId (kept as `string`, dside’s shape, so existing comparisons still compile). */
  id: string;
  model: string; // engraved code on the spec sheet, e.g. "TK-03"
  name: string;
  /** dside: product family. Here: the physical object on the shelf. */
  family: string;
  tagline: string;
  description: string;
  specs: { k: string; v: string }[];
  features: string[];
  proof: string; // the headline evidence, from a case study
  /** Theme keys (global.css aliases): 'orange' = pink accent, 'blue' = baby blue, 'alu' = chrome, 'graphite' = ink. */
  color: 'orange' | 'alu' | 'graphite' | 'blue';
  cta: { label: string; href?: string; panel?: string };
  hero?: boolean;
  /** The physical object on the chrome shelf. */
  object: string;
  /** The case study (WORK id) that backs it, for "Read the case" links. */
  work: WorkId;
  /** Checkable numbers: the value, what it counts, and where it comes from (a WORK id or 'model-card'). */
  evidence: { value: string; label: string; source: string }[];
}

export const PRODUCTS: Product[] = [
  {
    id: 'field-research',
    model: 'TK-01',
    name: 'Field research',
    family: 'Pink cassette recorder',
    object: 'Pink cassette recorder',
    tagline: 'Go to the field first. Bring the tape back to the team.',
    description:
      'Shadowing, ride-alongs, diary studies and usability tests, in Bahasa Indonesia, with the people who will use the product. What she hears becomes the brief, the eval cases and the words on the screen.',
    specs: [
      { k: 'Sessions', v: '130+, in Bahasa Indonesia' },
      { k: 'Methods', v: 'Shadowing · Ride-alongs · Diary studies · Usability tests' },
      { k: 'Field visits', v: '27 warung, 3 hours each behind the counter' },
      { k: 'Ride-alongs', v: '12 commuters, two morning trips each' },
      { k: 'Test rounds', v: 'Paper → clickable → coded, with real data' },
    ],
    features: [
      'Shadowing, with full task readings timed end to end',
      'Ride-alongs and two-week WhatsApp diary studies',
      'Usability tests in three rounds, the last one in code',
      'Affinity maps that turn raw notes into decisions',
    ],
    proof:
      'Tenderlens: she shadowed nine bid teams, and every one read eligibility first, then scope, then money. That order became the brief, and the order the pipeline reads in.',
    evidence: [
      { value: '130+', label: 'research sessions, in Bahasa Indonesia', source: 'model-card' },
      { value: '9', label: 'bid teams shadowed for Tenderlens, 2 hours each', source: 'tenderlens' },
      { value: '27', label: 'warung visited for Catat, 3 hours each', source: 'catat' },
    ],
    color: 'orange',
    cta: { label: 'Read Tenderlens', panel: 'gallery' },
    work: 'tenderlens',
  },
  {
    id: 'retrieval',
    model: 'TK-02',
    name: 'Retrieval',
    family: 'CD in a clear jewel case',
    object: 'CD in a clear jewel case',
    tagline: 'If the AI says it, you can check it.',
    description:
      'Search that finds the right page, answers that carry it, and a check in code that the page really says so. When the source doesn’t hold, the answer becomes a draft for a person, or “Can’t tell yet”.',
    specs: [
      { k: 'Search', v: 'Hybrid: keywords + pgvector' },
      { k: 'Citations', v: 'Every claim carries its page or section ID' },
      { k: 'Check', v: 'In code: quote ≥ 0.9 similar, numbers exact' },
      { k: 'Quotes on their page', v: '99.4%, before the check' },
      { k: 'Fallback', v: 'A draft for a person, or “Can’t tell yet”' },
    ],
    features: [
      'Hybrid search, re-indexed when a document changes',
      'Structured output with a quote for every field',
      'Citation checks in code, not by another model',
      'Abstaining when the source is missing or unreadable',
    ],
    proof:
      'Ask HR (internship): 41% of employee questions answered on the spot with their policy section, and wrong automatic answers down from 2.8% (11 of 400) in month 1 to 1.0% (4 of 400) in month 3.',
    evidence: [
      { value: '41%', label: 'of Ask HR questions answered at once, with their section', source: 'ask-hr' },
      { value: '1.0%', label: 'of automatic answers wrong in month 3 (4 of 400)', source: 'ask-hr' },
      { value: '99.4%', label: 'of Tenderlens quotes on their cited page, before the check', source: 'tenderlens' },
    ],
    color: 'alu',
    cta: { label: 'Read Ask HR', panel: 'gallery' },
    work: 'ask-hr',
  },
  {
    id: 'evals',
    model: 'TK-03',
    name: 'Evals',
    family: 'Jar of pastel marbles',
    object: 'Jar of pastel marbles',
    tagline: 'One marble per case labelled by hand: 2,100+ of them.',
    description:
      'Before she touches a prompt, she writes down what “right” means and collects real cases. Every prompt, model or rule change runs against them, so “it feels better” becomes a number, and a release that gets worse doesn’t ship.',
    specs: [
      { k: 'Labelled by hand', v: '2,100+ cases, with collaborators' },
      { k: 'Tenderlens thesis set', v: '610 fields · dev 240 / frozen test 370' },
      { k: 'Agreement', v: 'Cohen’s κ 0.87 (Tenderlens) · 0.81 (Catat)' },
      { k: 'CI gate', v: '180-field regression set, about 4 min a run' },
      { k: 'Intervals', v: '95%, bootstrapped by tender' },
    ],
    features: [
      'Dev and held-out splits; test sets frozen and opened once',
      'Regression sets that run in CI on every change',
      'Error logs: what it said, what was true, why, the fix',
      'Weekly audits that kept running after she left',
    ],
    proof:
      'Tenderlens: the regression set’s first CI run, in April 2026, blocked v6 (4 wrong “you meet this” calls; the gate allows 3). The fix became v7, which compares licence codes exactly.',
    evidence: [
      { value: '610', label: 'thesis eval fields, labelled by two people (κ 0.87)', source: 'tenderlens' },
      { value: '2 of 43', label: 'false “Bid” verdicts on 90 held-out tenders', source: 'tenderlens' },
      { value: '2,100+', label: 'cases labelled by hand, with collaborators', source: 'model-card' },
    ],
    color: 'blue',
    cta: { label: 'Read Tenderlens', panel: 'gallery' },
    work: 'tenderlens',
  },
  {
    id: 'agents',
    model: 'TK-04',
    name: 'Agents and tool use',
    family: 'Chrome wind-up robot',
    object: 'Chrome wind-up robot',
    tagline: 'Wind it up, and every step it takes can be undone.',
    description:
      'LLM tool use where the model proposes and code decides what happens: tool calls create pending entries a person confirms or removes in one tap, the user’s ID comes from the session, never from the model, and money is parsed in code.',
    specs: [
      { k: 'Model', v: 'Claude tool use' },
      { k: 'Writes', v: 'Pending until confirmed; one tap to undo' },
      { k: 'Money', v: 'Parsed in code, slang included (goceng = 5.000)' },
      { k: 'When unsure', v: 'It asks: 1 in 12 money or debt notes' },
      { k: 'Undo rate', v: '6%, mostly misheard amounts' },
    ],
    features: [
      'Tool calls that create pending, reversible entries',
      'Scoped tools: the session picks whose data, not the model',
      'Parsers for amounts and codes; the model only points',
      'A clarifying question instead of a guess',
    ],
    proof:
      'Catat: a WhatsApp ledger agent for 140 warung in an 8-week pilot. 87% of voice notes logged fully correctly (261 of 300), and 83% of shops still logging on most days in the last week.',
    evidence: [
      { value: '87%', label: 'of Catat voice notes logged fully correctly (261 of 300)', source: 'catat' },
      { value: '140', label: 'warung in the 8-week pilot', source: 'catat' },
      { value: '1 in 12', label: 'money or debt notes got a question instead of a guess', source: 'catat' },
    ],
    color: 'alu',
    cta: { label: 'Read Catat', panel: 'gallery' },
    work: 'catat',
  },
  {
    id: 'design',
    model: 'TK-05',
    name: 'UX writing and design',
    family: 'Stack of pastel zines',
    object: 'Stack of pastel zines',
    tagline: 'One decision per screen, in words that make sense read aloud.',
    description:
      'She designs the screens she builds, and writes the words on them: the brief, the page chip, the “Can’t tell yet” state, the review queue, the undo. Then she tests them with the people they’re for.',
    specs: [
      { k: 'Track', v: 'B.Sc. Informatics, AI and HCI' },
      { k: 'Teaching', v: 'TA for Human–Computer Interaction' },
      { k: 'Usability tests', v: '3 rounds on the Tenderlens brief; 3 on Catat’s wording' },
      { k: 'Accessibility', v: 'WCAG 2.2 · 44 px targets · 200% text' },
      { k: 'Tools', v: 'Figma, then code' },
    ],
    features: [
      'Interaction design and UX writing',
      'Designed states for uncertainty, errors and undo',
      'Design systems and accessibility (WCAG 2.2)',
      'Conversation design for chat and voice notes',
    ],
    proof:
      'Tenderlens brief: with a big score alone, 0 of 5 testers trusted it (“Why 82?”). With the score and three cited reasons, 4 of 5 decided in under two minutes.',
    evidence: [
      { value: '4 of 5', label: 'testers decided in under 2 minutes once reasons were cited', source: 'tenderlens' },
      { value: '9 min', label: 'for HR to clear 20 Ask HR drafts in the queue she built', source: 'ask-hr' },
      { value: '62% vs 31%', label: 'Lintas replans taken with a one-line reason, against without', source: 'lintas' },
    ],
    color: 'graphite',
    cta: { label: 'See the case studies', panel: 'gallery' },
    work: 'tenderlens',
  },
  {
    id: 'full-stack',
    model: 'TK-06',
    name: 'Full-stack',
    family: 'Pink USB stick on a stand',
    object: 'Pink USB stick on a small stand',
    tagline: 'From the 02:00 job queue to the phone in someone’s hand.',
    description:
      'TypeScript, React and Next.js, Python (FastAPI), PostgreSQL, queues and CI: the unglamorous parts that keep an AI feature running while nobody is awake, inside a cost and latency budget.',
    specs: [
      { k: 'Front end', v: 'TypeScript · React · Next.js · PWA' },
      { k: 'Back end', v: 'Node.js · Python (FastAPI) · PostgreSQL' },
      { k: 'Jobs', v: 'Queues (pg-boss) · retries · Batch API' },
      { k: 'Testing', v: 'Vitest · Playwright · CI · Docker' },
      { k: 'Budgets', v: 'Tenderlens Rp 420 a tender · Lintas Rp 90k a month' },
    ],
    features: [
      'Job queues, so a crash loses nothing',
      'Cost and latency budgets for every feature',
      'PWAs and web push',
      'Monitoring whose alert has already fired once',
    ],
    proof:
      'Lintas, a solo side project: her own transit router (RAPTOR, 30 ms over about 1,900 stops), a PWA with push alerts, and 1.4k weekly riders at peak, all by word of mouth.',
    evidence: [
      { value: '1.4k', label: 'weekly Lintas riders at peak', source: 'lintas' },
      { value: 'Rp 1.4M', label: 'monthly bill for Tenderlens, serving 31 teams', source: 'tenderlens' },
      { value: '42 s', label: 'median from a delay notice to a Lintas push', source: 'lintas' },
    ],
    color: 'orange',
    cta: { label: 'Download CV (PDF)', href: '/cv.pdf' },
    work: 'lintas',
  },
];

/* --------------------------------------------------------------------------
   Work — the Wall of Work: four posters in acrylic frames, left → right.
   Stats are the legacy cards' stats (projects.ts `stats`), verbatim.
   -------------------------------------------------------------------------- */
export type WorkId = 'tenderlens' | 'ask-hr' | 'catat' | 'lintas';

export interface Work {
  id: string;
  /** dside: the client. Here: the product’s name. */
  client: string;
  title: string;
  year: string; // '' when unknown — UI hides it
  /** dside: the sector. Here: where it came from (thesis, internship, co-founded, side project). */
  sector: string;
  /** A STACKS name, so the gallery can link the poster to its Toolkit object and fit-check result. */
  stack: string;
  summary: string;
  stats: { k: string; v: string }[];
  palette: [string, string, string]; // used by generative poster art: [accent, dark, light]
  motif: 'rings' | 'grid' | 'bars' | 'wave' | 'dots' | 'burst' | 'stripes' | 'orbit';
  /** Her role, in the case study’s words. */
  role: string;
  timeline: string;
  /** The hiring question this case answers (legacy /work reading guide). */
  question: string;
}

/* Poster colours from the room: pink #FF7EB6, baby blue #5AA9E6, ink-2 #3C4D66,
   ice #F6F9FD / #EDF3FA, pink-soft #FFD6E8, silver #DDE7F2. poster.ts picks the accent as the
   most saturated of the three, so the dark is ink-2 (less saturated than the pink), not navy. */
export const WORK: Work[] = [
  {
    id: 'tenderlens',
    client: 'Tenderlens',
    title: 'AI brief for public tenders',
    year: '2026',
    sector: 'Thesis project',
    stack: 'Evals and AI quality',
    summary: 'Turns a 214-page government tender into one page a small contractor can decide on, with every claim cited.',
    stats: [
      { k: 'Still weekly', v: '31/38' },
      { k: 'False ‘Bid’', v: '2 of 43' },
      { k: 'Time per tender', v: '11 min' },
    ],
    palette: ['#ff7eb6', '#3c4d66', '#f6f9fd'],
    motif: 'grid',
    role: 'Sole engineer and designer (thesis)',
    timeline: 'Sep 2025 – Mar 2026',
    question: 'Can she build AI that knows when not to answer?',
  },
  {
    id: 'ask-hr',
    client: 'Ask HR',
    title: 'AI answers inside an HR app',
    year: '2025',
    sector: 'Internship, in a squad',
    stack: 'Retrieval and grounded answers',
    summary:
      'Employees ask HR questions in the app: routine ones get an answer with its policy section, the rest go to HR as drafts, and sensitive ones go straight to a person.',
    stats: [
      { k: 'First reply', v: '4h → 38m' },
      { k: 'Answered at once', v: '41%' },
      { k: 'Drafts edited', v: '37→18%' },
    ],
    palette: ['#5aa9e6', '#3c4d66', '#edf3fa'],
    motif: 'dots',
    role: 'AI engineering intern',
    timeline: 'Feb – Aug 2025',
    question: 'Has she shipped inside a real team?',
  },
  {
    id: 'catat',
    client: 'Catat',
    title: 'Voice bookkeeping on WhatsApp',
    year: '2024',
    sector: 'Co-founded, team of 3',
    stack: 'Agents and tool use',
    summary:
      'Small shop owners log what they’d otherwise forget (credit sales, payments, restocks, the day’s takings) by sending WhatsApp voice notes, slang included.',
    stats: [
      { k: 'Shops', v: '140' },
      { k: 'Correct, held out', v: '85%' },
      { k: 'Active, last wk', v: '83%' },
    ],
    palette: ['#ff7eb6', '#3c4d66', '#ffd6e8'],
    motif: 'wave',
    role: 'Co-founder: engineering and conversation design',
    timeline: 'Sep – Dec 2024',
    question: 'Can she build an agent that writes data safely?',
  },
  {
    id: 'lintas',
    client: 'Lintas',
    title: 'Commute planner for Greater Jakarta',
    year: '2024',
    sector: 'Side project',
    stack: 'AI product engineer, end to end',
    summary: 'One ‘leave by’ time for a commute across KRL, LRT, MRT and TransJakarta, replanned live with a one-line reason.',
    stats: [
      { k: 'Weekly riders, peak', v: '1.4k' },
      { k: 'Replans taken, with reason', v: '62% vs 31%' },
      { k: 'Server bill', v: 'Rp 90k/mo' },
    ],
    palette: ['#5aa9e6', '#3c4d66', '#dde7f2'],
    motif: 'stripes',
    role: 'Solo side project: design and engineering',
    timeline: 'Mar – Jun 2024',
    question: 'Where does she put the model, and where not?',
  },
];

/** Who her work served (no names under NDA, nothing invented). */
export const CLIENTS = [
  'A procurement consultancy in Bekasi (runs Tenderlens for 31 teams)',
  'An HR software startup in Jakarta (name under NDA)',
  'A Bekasi cooperative (runs the Catat pilot)',
  'Commuters on the Bekasi line (Lintas)',
];

/* --------------------------------------------------------------------------
   Ecosystem — her links (the big button’s switchboard, the terminal, the
   pass). Only links the legacy site has. CONTOH: every github.com/example and
   example.com URL is a legacy placeholder for the real link. Ask HR has no
   link (NDA), so it isn't here.
   -------------------------------------------------------------------------- */
export const ECOSYSTEM = [
  { id: 'site', name: 'adelia.cc', body: 'This room: her portfolio, 2026 edition.', url: identity.url },
  { id: 'cv', name: 'CV (PDF)', body: 'One page: roles, dates, tools and education.', url: '/cv.pdf' },
  { id: 'github', name: 'GitHub', body: 'The code for Tenderlens, Catat and Lintas.', url: 'https://github.com/example' }, // CONTOH
  { id: 'linkedin', name: 'LinkedIn', body: 'Her profile, the formal version.', url: 'https://www.linkedin.com/in/example' }, // CONTOH
  { id: 'tenderlens', name: 'Tenderlens', body: 'The live product, run by the consultancy.', url: 'https://example.com/tenderlens' }, // CONTOH
  {
    id: 'tenderlens-evals',
    name: 'Tenderlens eval set',
    body: 'The dev set and 200 of the 370 test fields, with one command to re-score v6.',
    url: 'https://github.com/example/tenderlens-evals', // CONTOH
  },
  {
    id: 'thesis',
    name: 'Thesis (PDF)',
    body: 'Answer or abstain: citation-grounded extraction from Indonesian tender documents.',
    url: 'https://example.com/tenderlens-thesis.pdf', // CONTOH
  },
  { id: 'catat', name: 'Catat', body: 'Voice bookkeeping on WhatsApp, now run by a Bekasi cooperative.', url: 'https://example.com/catat' }, // CONTOH
  { id: 'lintas', name: 'Lintas', body: 'The commute planner, still used by about 300 riders a week.', url: 'https://example.com/lintas' }, // CONTOH
];

/* --------------------------------------------------------------------------
   News (seed — admin can add/edit): her paper.
   -------------------------------------------------------------------------- */
export interface Article {
  id: string;
  date: string; // ISO
  section: string;
  headline: string;
  dek: string;
  body: string[];
  byline?: string;
}

/** Short updates written from the legacy content, newest first. Where legacy gives only a month,
 *  the day is CONTOH (a placeholder); where it gives no date at all, the whole date is CONTOH. */
export const NEWS: Article[] = [
  {
    id: 'now',
    date: '2026-10-19', // CONTOH: the date of this issue
    section: 'Now',
    headline: 'Open to a full-time AI product engineering role',
    dek: 'B.Sc. Informatics, class of 2026. New grad or junior, remote or in the Jakarta area, from two weeks after an offer.',
    body: [
      'Right now she maintains Tenderlens and its regression set for the consultancy that runs it, about 8 hours a week, while she looks for a full-time team.',
      'First choice is a Jakarta team, in the office up to 3 days a week; remote works too. Her usual hours are 09:00–18:00 WIB, which gives 4+ hours of overlap from Dubai to Sydney.',
    ],
    byline: 'Adelia’s desk',
  },
  {
    id: 'lintas-still',
    date: '2026-09-14', // CONTOH day: legacy says "September 2026"
    section: 'Side project',
    headline: 'Lintas, two years on: about 300 riders a week',
    dek: 'The commute planner she built for her own Bekasi–Jakarta trip is open source and in maintenance.',
    body: [
      'Lintas peaked at 1.4k weekly riders in 2024, all by word of mouth. It was open-sourced in 2025; about 300 riders a week still use it, on a server bill of about Rp 90k a month.',
      'The lesson she took to every product since: a replan that came with a one-line reason was taken 62% of the time, against 31% without one.',
    ],
    byline: 'Adelia’s desk',
  },
  {
    id: 'regression-gate',
    date: '2026-04-20', // CONTOH day: legacy says "April 2026"
    section: 'Evals',
    headline: 'A new regression set blocks its first release',
    dek: '180 eligibility fields from 2026 tenders now run in CI on every change. The first run stopped Tenderlens v6.',
    body: [
      'After graduating she labelled 180 fields from 2026 tenders; a classmate re-labelled 60 of them blind, and 58 matched. CI runs the set on every prompt, model or rule change, in about 4 minutes.',
      'Its first run blocked v6 itself: 4 wrong “you meet this” calls, where the gate allows 3. The fix, v7, compares licence codes exactly, and took those calls from 4 to 1.',
    ],
    byline: 'Adelia’s desk',
  },
  {
    id: 'handover',
    date: '2026-04-06', // CONTOH day: legacy says "Since April 2026"
    section: 'Shipped',
    headline: 'Tenderlens moves to a consultancy, with 31 teams on board',
    dek: 'Her thesis product now runs at Bu Ratna’s procurement consultancy, for the beta teams that stayed.',
    body: [
      '31 of 38 beta teams still used Tenderlens weekly after three months, and 12 paid in advance for a plan that didn’t exist yet. The consultancy already had the clients; she couldn’t sell it and finish a thesis at the same time.',
      'The thesis code is hers and open source. She maintains the pipeline and its eval set on a part-time contract that hands over to the consultancy’s engineer when she starts a full-time job.',
    ],
    byline: 'Adelia’s desk',
  },
  {
    id: 'graduated',
    date: '2026-03-31', // CONTOH: legacy gives only "2022 — 2026" and a thesis ending in March 2026
    section: 'Education',
    headline: 'Graduated: B.Sc. Informatics, AI and HCI track',
    dek: 'GPA 3.78 / 4.00, with a thesis on when an AI should answer and when it should abstain.',
    body: [
      'Four years at a university in West Java: teaching assistant for Human–Computer Interaction, and the person who ran the campus design and web club.',
      'Along the way: Lintas (2024), Catat (2024), a six-month internship (2025) and Tenderlens, the thesis.',
    ],
    byline: 'Adelia’s desk',
  },
  {
    id: 'thesis',
    date: '2026-03-16', // CONTOH day: the thesis ran Sep 2025 – Mar 2026
    section: 'Thesis',
    headline: '“Answer or abstain”: the thesis behind Tenderlens',
    dek: 'On 90 held-out tenders: 2 false “Bid” verdicts out of 43, and 8 abstentions instead of guesses.',
    body: [
      'The model reads and quotes, code checks every quote against its page, and rules decide the verdict. When a key page is unreadable or two clauses conflict, the brief says “Can’t tell yet”.',
      'The test set, 370 fields from 90 tenders, was frozen in month 5 and opened once, for the results. She published the dev set and 200 of the test fields so other students can test against them.',
    ],
    byline: 'Adelia’s desk',
  },
  {
    id: 'ask-hr',
    date: '2025-08-29', // CONTOH day: legacy says "all 40 by August" (2025)
    section: 'Internship',
    headline: 'Ask HR reaches all 40 clients',
    dek: '41% of employee questions answered on the spot, with the policy section they came from.',
    body: [
      'Six months as an AI engineering intern in a product squad of seven. Ask HR rolled out from May 2025: five clients first, and all 40 by August.',
      'The median first reply fell from 4 hours to 38 minutes, no sensitive question was answered automatically, and the weekly accuracy audit she wrote still runs.',
    ],
    byline: 'Adelia’s desk',
  },
];

/* --------------------------------------------------------------------------
   Events (the ticket printer: Book a chat) & launch
   These are slots she offers, not dated events, so `date` is '' (the printer
   shows "TBA"). `session` is the main C2B form (hiring teams: the "session"
   tab); the others are listed as tickets.
   -------------------------------------------------------------------------- */
export const EVENTS = [
  {
    id: 'session',
    name: 'Intro call (30 min)',
    date: '',
    city: 'Jakarta', // the venue line names it; the printer shows the venue only when it already contains the city
    venue: 'A video call, or your office in the Jakarta area',
    body: 'For hiring teams: 30 minutes on the role, your team and where her work fits. She replies within a day with times in WIB.',
  },
  {
    id: 'interview',
    name: 'Interview slot (60 min)',
    date: '',
    city: 'Jakarta', // the venue line names it; the printer shows the venue only when it already contains the city
    venue: 'A video call, or your office in the Jakarta area',
    body: 'Already past the intro? Book a slot for your technical or case-study interview. She can walk your team through the Tenderlens pipeline and its eval set.',
  },
  {
    id: 'coffee',
    name: 'Coffee chat (20 min)',
    date: '',
    city: 'Bekasi',
    venue: 'A video call, or coffee in Bekasi or Jakarta',
    body: 'For students, builders and the curious: evals, field research, the Tenderlens thesis, or how this room was made.',
  },
];

/* CONTOH — her earliest start date is a placeholder: she can start within two weeks of an offer. */
export const LAUNCH_DEFAULT = {
  title: 'Day one',
  subtitle: 'Her first day on a full-time AI product team.',
  date: '2026-11-09T09:00:00+07:00', // CONTOH
  body: 'She can start within two weeks of an offer; the Tenderlens contract hands over to the consultancy’s engineer. Leave your email and you’ll get one note when the date is set.',
};

export const REDIRECT_DEFAULT = {
  label: 'Email Adelia',
  url: `mailto:${identity.email}?subject=Hello%20Adelia%20%E2%80%94%20from%20adelia.cc`,
};

/* --------------------------------------------------------------------------
   Quiz — “Is she a fit for your team?” A 60-second check for hiring managers.
   Result → an honest outcome (including “not yet”), the evidence behind it,
   a Toolkit object to open and a next step.

   The five StackId keys are dside’s (QuizPanel and admin metrics key records
   by them), so they are kept as opaque ids and mapped to the outcomes here.
   Always refer to them through FIT, never by the raw string:
     FIT.endToEnd = 'startup'     AI product engineer, end to end
     FIT.quality  = 'gaming'      AI quality: evals and grounded answers
     FIT.agents   = 'web3ai'      Agents and tool use
     FIT.aiUx     = 'artfashion'  AI UX and front end
     FIT.notYet   = 'community'   Not this seat, yet (the honest outcome)
   Renaming them is one coordinated change: this union + QuizPanel’s SHORT map.
   -------------------------------------------------------------------------- */
export type StackId = 'gaming' | 'web3ai' | 'artfashion' | 'startup' | 'community';

export const FIT = {
  endToEnd: 'startup',
  quality: 'gaming',
  agents: 'web3ai',
  aiUx: 'artfashion',
  notYet: 'community',
} as const satisfies Record<string, StackId>;

export const STACKS: Record<
  StackId,
  {
    name: string;
    line: string;
    body: string;
    /** The Toolkit object (PRODUCTS id) that backs this result. */
    product: ProductId;
    /** How good the fit is, said plainly. */
    fit: 'Strong fit' | 'Good fit' | 'Not yet';
    /** The checkable proof, from a case study. */
    evidence: string;
    /** What to do next. */
    next: string;
    /** The case study to read (WORK id). */
    work: WorkId;
  }
> = {
  [FIT.endToEnd]: {
    name: 'AI product engineer, end to end',
    fit: 'Strong fit',
    line: 'From the field visit to the shipped code, in one person.',
    body: 'She takes an AI feature from interviews to production: the screen, the pipeline, the evals and the unglamorous parts that keep it running.',
    evidence: 'Tenderlens was hers end to end: crawler, pipeline, evals, app and design. 31 of 38 beta teams still used it weekly after 3 months.',
    next: 'Book a 30-minute intro call.',
    product: 'full-stack',
    work: 'tenderlens',
  },
  [FIT.quality]: {
    name: 'AI quality: evals and grounded answers',
    fit: 'Strong fit',
    line: 'She writes the eval before the prompt.',
    body: 'Every change runs against real, hand-labelled cases, every claim carries its source, and code checks the source before a person sees it. “It feels better” becomes a number.',
    evidence: 'A 610-field thesis set (κ 0.87) and a regression set in CI whose first run blocked a release. In Ask HR, wrong automatic answers fell from 2.8% to 1.0% (4 of 400).',
    next: 'Book an interview slot and ask her to walk you through the Tenderlens eval set.',
    product: 'evals',
    work: 'tenderlens',
  },
  [FIT.agents]: {
    name: 'Agents and tool use',
    fit: 'Good fit',
    line: 'Make a wrong answer cheap.',
    body: 'Her agents are small and careful rather than long-running and autonomous: tool calls create pending entries, money is parsed in code, and every write can be undone in one tap.',
    evidence: 'Catat: a WhatsApp ledger agent for 140 warung; 87% of voice notes logged fully correctly (261 of 300), with a 6% undo rate.',
    next: 'Read the Catat case, then book an intro call.',
    product: 'agents',
    work: 'catat',
  },
  [FIT.aiUx]: {
    name: 'AI UX and front end',
    fit: 'Strong fit',
    line: 'One decision per screen.',
    body: 'She designs the screens she builds: citations, “Can’t tell yet” states, undo and review queues, tested with the people they’re for.',
    evidence: '130+ research sessions in Bahasa Indonesia; three test rounds on the Tenderlens brief; the Ask HR review queue in React, where HR clears 20 drafts in about 9 minutes.',
    next: 'Open her zines on the shelf, then book an intro call.',
    product: 'design',
    work: 'tenderlens',
  },
  [FIT.notYet]: {
    name: 'Not this seat, yet',
    fit: 'Not yet',
    line: 'Plain answer: you need someone more senior first.',
    body: 'She is a 2026 new grad. If the seat means leading a team, owning infrastructure for millions of users from day one, or training models from scratch, hire senior first and keep her in mind for the junior seat.',
    evidence: 'Her own model card says it: she hasn’t worked on a system with millions of users yet, and her biggest squad was a six-month internship in a team of seven.',
    next: 'Keep her CV for a junior opening, or pass it to a team that’s hiring one.',
    product: 'full-stack',
    work: 'lintas',
  },
};

export const QUIZ: {
  id: string;
  q: string;
  options: { label: string; weights: Partial<Record<StackId, number>> }[];
}[] = [
  {
    id: 'seat',
    q: 'What’s the seat you’re hiring for?',
    options: [
      { label: 'An engineer who owns an AI feature end to end', weights: { [FIT.endToEnd]: 3, [FIT.aiUx]: 1 } },
      { label: 'Someone to make our model’s answers measurably better', weights: { [FIT.quality]: 3 } },
      { label: 'A front-end or design engineer for our AI product', weights: { [FIT.aiUx]: 3 } },
      { label: 'A senior or staff engineer to lead the team', weights: { [FIT.notYet]: 3 } },
    ],
  },
  {
    id: 'pain',
    q: 'What hurts most right now?',
    options: [
      { label: 'We can’t tell if a prompt change made things better', weights: { [FIT.quality]: 3 } },
      { label: 'Answers sound right but cite the wrong thing, or nothing', weights: { [FIT.quality]: 2, [FIT.aiUx]: 1 } },
      { label: 'Our agent does things we can’t undo or audit', weights: { [FIT.agents]: 3 } },
      { label: 'Users don’t trust what the AI shows them', weights: { [FIT.aiUx]: 3 } },
    ],
  },
  {
    id: 'month',
    q: 'What would her first month look like?',
    options: [
      { label: 'Shipping features in our TypeScript, React and Postgres app', weights: { [FIT.endToEnd]: 3 } },
      { label: 'Building an eval set and a CI gate', weights: { [FIT.quality]: 3 } },
      { label: 'Wiring tools and APIs to an LLM', weights: { [FIT.agents]: 3 } },
      { label: 'Pre-training our own foundation model', weights: { [FIT.notYet]: 3 } },
    ],
  },
  {
    id: 'users',
    q: 'Who uses your product?',
    options: [
      { label: 'Non-technical people in busy, messy settings', weights: { [FIT.aiUx]: 2, [FIT.agents]: 1 } },
      { label: 'Teams who review AI drafts before they go out', weights: { [FIT.aiUx]: 2, [FIT.quality]: 1 } },
      { label: 'People in Indonesia, in Bahasa Indonesia', weights: { [FIT.endToEnd]: 2, [FIT.agents]: 1 } },
      { label: 'Millions of people, from day one', weights: { [FIT.notYet]: 2, [FIT.endToEnd]: 1 } },
    ],
  },
  {
    id: 'team',
    q: 'How does your team ship?',
    options: [
      { label: 'Small team: everyone ships, everyone talks to users', weights: { [FIT.endToEnd]: 2, [FIT.aiUx]: 1 } },
      { label: 'A product squad: PM, design, data science, engineers', weights: { [FIT.agents]: 1, [FIT.aiUx]: 1, [FIT.endToEnd]: 1 } },
      { label: 'We want someone to start our eval habit', weights: { [FIT.quality]: 3 } },
      { label: 'Research first: papers before product', weights: { [FIT.notYet]: 2, [FIT.quality]: 1 } },
    ],
  },
];

/* --------------------------------------------------------------------------
   Music library (generative tracks implemented in src/audio/tracks.ts).
   The ids are stable keys shared with audio/tracks.ts, music/covers.ts,
   RecordsPanel (the B-side gate), music/po30.ts and stage/director.ts, so
   only the titles changed. B1 is the B-side that unlocks at the Guest tier.
   -------------------------------------------------------------------------- */
export const TRACKS = [
  { id: 'studio-hours', title: 'Soft Focus', artist: 'Adelia’s Room', side: 'A1', bpm: 84, mood: 'Lo-fi · Focus' },
  { id: 'jakarta-rain', title: 'Bekasi Rain', artist: 'Adelia’s Room', side: 'A2', bpm: 72, mood: 'Ambient · Rain' },
  { id: 'senopati-nights', title: 'Last Train Home', artist: 'Adelia’s Room', side: 'B1', bpm: 96, mood: 'Bedroom pop · Night ride' },
  { id: 'arcade-1996', title: 'Gacha Pop', artist: 'Adelia’s Room', side: 'B2', bpm: 128, mood: 'Chiptune · Play' },
] as const;
export type TrackId = (typeof TRACKS)[number]['id'];

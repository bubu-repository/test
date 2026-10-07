/**
 * The three case studies.
 *
 * CONTOH — ganti dengan data asli.
 * The real projects (titles, URLs, numbers) arrive later. These three are realistic samples so
 * every layout, the agent and the CV can be built and reviewed now. Replace field by field;
 * the pages, the trading cards, the agent knowledge and the CV PDF all read from this file.
 */

export type Tone = "magenta" | "cobalt" | "lime" | "sun" | "violet" | "mint" | "sky" | "ink" | "pink" | "red";

export type ArchNode = {
  id: string;
  label: string;
  /** Position in a 100 × 60 grid. */
  x: number;
  y: number;
  kind: "user" | "ui" | "agent" | "data" | "service";
};

export type Project = {
  slug: string;
  index: string;
  name: string;
  year: string;
  kind: string;
  tone: Tone;
  rarity: string;
  tagline: string;
  /** The problem, phrased as the request a user would type. */
  prompt: string;
  promptBy: string;
  summary: string;
  role: {
    title: string;
    summary: string;
    ownership: { area: string; pct: number }[];
  };
  team: string;
  timeline: string;
  stack: string[];
  links: { live: string; repo: string };
  /** Trading-card stats (3). */
  stats: { label: string; value: string }[];
  problem: { body: string[]; constraints: string[] };
  process: { call: string; title: string; body: string; duration: string }[];
  architecture: { nodes: ArchNode[]; edges: [string, string][] };
  beforeAfter: {
    before: { title: string; points: string[] };
    after: { title: string; points: string[] };
  };
  results: {
    metrics: { value: string; label: string }[];
    body: string[];
    quote: { text: string; who: string };
  };
  reflection: string;
};

/* CONTOH — ganti dengan data asli */
export const projects: Project[] = [
  {
    slug: "tenderlens",
    index: "01",
    name: "Tenderlens",
    year: "2025",
    kind: "Agentic document AI",
    tone: "magenta",
    rarity: "Holo rare",
    tagline: "Reads 200-page government tenders so small contractors don't have to.",
    prompt:
      "Our bid team spends three hours reading every tender package. Can something tell us in five minutes whether we should even bid?",
    promptBy: "Operations lead, 12-person construction firm in Bekasi",
    summary:
      "Tenderlens pulls tender packages from public procurement portals and turns each one into a one-page brief, a compliance checklist and a bid / no-bid score. Every claim links to the page it came from.",
    role: {
      title: "Solo product engineer",
      summary:
        "I owned it end to end: discovery interviews, the one-page brief design, the Next.js app, the extraction agents and the eval set. A former procurement officer advised on the domain.",
      ownership: [
        { area: "Research", pct: 100 },
        { area: "Interface", pct: 100 },
        { area: "Fullstack", pct: 95 },
        { area: "Agents", pct: 100 },
        { area: "Evals", pct: 100 },
        { area: "Infra", pct: 70 },
      ],
    },
    team: "Me, plus one domain advisor",
    timeline: "10 weeks · 2025",
    stack: ["Next.js", "TypeScript", "PostgreSQL", "pgvector", "Claude API", "Python", "Playwright"],
    links: { live: "https://example.com/tenderlens", repo: "https://github.com/example/tenderlens" },
    stats: [
      { label: "Read time", value: "3h → 11m" },
      { label: "Accuracy", value: "94%" },
      { label: "Bid teams", value: "38" },
    ],
    problem: {
      body: [
        "Indonesian public tenders arrive as long PDF bundles: legal boilerplate, scanned forms, technical specs and a price schedule, often 150 to 250 pages. Small contractors can't afford a dedicated bid team, so the owner reads them at night.",
        "Most tenders are a 'no' for them. The cost isn't the tenders they lose, it's the hours spent finding out they never qualified.",
      ],
      constraints: [
        "Formal Indonesian legal language, mixed with scanned tables",
        "Deadlines are days, not weeks",
        "A wrong 'you qualify' is worse than no answer: every claim needs a source",
        "Users read on phones between site visits",
      ],
    },
    process: [
      {
        call: "interview(bid_teams=9)",
        title: "Shadowed nine bid teams",
        body: "Watched how people actually read a tender. Everyone looked for the same three things first: eligibility, scope, and money. Everything else was a second pass.",
        duration: "Week 1–2",
      },
      {
        call: "prototype(brief='one page', testers=5)",
        title: "Designed the one-page brief",
        body: "Paper first, then a clickable prototype. The winning layout put the bid / no-bid score next to the three reasons behind it, each with a page number.",
        duration: "Week 3",
      },
      {
        call: "build(pipeline=['parse','classify','extract','cite'])",
        title: "Built a citing extraction pipeline",
        body: "OCR fallback for scans, a section classifier, then an extraction agent that must return a page reference for every field. A checker rejects any claim it can't find on that page.",
        duration: "Week 4–7",
      },
      {
        call: "eval(cases=240, metrics=['field_accuracy','citation_precision'])",
        title: "Grew an eval set from real tenders",
        body: "240 labelled fields from 60 tenders. Chunking by section and the citation rule took field accuracy from 71% to 94%.",
        duration: "Week 6–9",
      },
      {
        call: "ship(beta='closed', teams=38)",
        title: "Shipped a closed beta",
        body: "Daily digest by email and WhatsApp, a brief per tender, and a feedback button on every field that feeds straight back into the eval set.",
        duration: "Week 10",
      },
    ],
    architecture: {
      nodes: [
        { id: "portal", label: "Tender portals", x: 6, y: 12, kind: "service" },
        { id: "crawler", label: "Crawler", x: 28, y: 12, kind: "service" },
        { id: "parser", label: "Parser + OCR", x: 50, y: 12, kind: "service" },
        { id: "agent", label: "Extraction agent", x: 72, y: 12, kind: "agent" },
        { id: "checker", label: "Citation checker", x: 94, y: 12, kind: "agent" },
        { id: "db", label: "Postgres + pgvector", x: 72, y: 46, kind: "data" },
        { id: "app", label: "Next.js app", x: 44, y: 46, kind: "ui" },
        { id: "user", label: "Bid team", x: 14, y: 46, kind: "user" },
      ],
      edges: [
        ["portal", "crawler"],
        ["crawler", "parser"],
        ["parser", "agent"],
        ["agent", "checker"],
        ["checker", "db"],
        ["db", "app"],
        ["app", "user"],
      ],
    },
    beforeAfter: {
      before: {
        title: "Before: a 214-page PDF and a highlighter",
        points: ["3 hours per tender", "Eligibility found on page 87", "Decision made after the deadline, twice"],
      },
      after: {
        title: "After: one page, every claim cited",
        points: ["11 minutes per tender", "Score plus three reasons", "Tap any line to open the source page"],
      },
    },
    results: {
      metrics: [
        { value: "11 min", label: "average read time per tender, down from 3 hours" },
        { value: "94%", label: "field accuracy on the 240-case eval set" },
        { value: "2.4×", label: "more tenders reviewed per week by beta teams" },
        { value: "38", label: "bid teams in the closed beta" },
      ],
      body: [
        "Beta teams now skim every relevant tender instead of the two or three they had time for. The bid / no-bid score is right often enough that people argue with it, which is exactly the point: the citations make the argument quick.",
      ],
      quote: {
        text: "I stopped printing tenders. If the score says no, I open the page it cites, and I agree or I don't. Five minutes.",
        who: "Owner, civil works contractor (beta user)",
      },
    },
    reflection:
      "The citation rule was the product. Accuracy got people to try it, but trust only arrived when every line could be checked in one tap. Next: let teams write their own eligibility rules in plain Indonesian.",
  },
  {
    slug: "catat",
    index: "02",
    name: "Catat",
    year: "2025",
    kind: "Voice agent on WhatsApp",
    tone: "cobalt",
    rarity: "Rare",
    tagline: "Small shops keep their books by sending voice notes. Slang included.",
    prompt:
      "I sell two hundred things a day and I write nothing down. Can I just tell my phone what I sold?",
    promptBy: "Warung owner, Bekasi Timur",
    summary:
      "Catat (Indonesian for 'write it down') lets warung owners log sales, stock and customer debts by sending WhatsApp voice notes in everyday Indonesian. An agent turns them into a ledger and sends a Sunday summary.",
    role: {
      title: "Product engineer and conversation designer",
      summary:
        "I built the agent and its tools, the WhatsApp integration, the speech pipeline and the small web dashboard, and I wrote every message the agent sends. A designer and a field researcher completed the team.",
      ownership: [
        { area: "Research", pct: 50 },
        { area: "Interface", pct: 60 },
        { area: "Fullstack", pct: 100 },
        { area: "Agents", pct: 100 },
        { area: "Evals", pct: 90 },
        { area: "Infra", pct: 85 },
      ],
    },
    team: "Team of 3: me, a designer, a field researcher",
    timeline: "14 weeks · 2025",
    stack: ["TypeScript", "Node.js", "WhatsApp Business API", "Speech-to-text", "Claude tool use", "PostgreSQL", "Next.js"],
    links: { live: "https://example.com/catat", repo: "https://github.com/example/catat" },
    stats: [
      { label: "Warung", value: "140" },
      { label: "No-fix rate", value: "91%" },
      { label: "Weekly active", value: "83%" },
    ],
    problem: {
      body: [
        "Warung (small neighbourhood shops) run on memory and goodwill. Owners know roughly what sells, but not what they earn, and customer debts live on scraps of paper.",
        "Bookkeeping apps exist. Nobody we met used one for more than a week: typing every sale with one hand while serving a queue doesn't work.",
      ],
      constraints: [
        "Must work inside WhatsApp, the one app every owner already uses",
        "Voice notes are noisy and full of slang: 'goceng' is Rp5,000, 'ceban' is Rp10,000",
        "Cheap Android phones and patchy data",
        "Mistakes must be fixable in one tap",
      ],
    },
    process: [
      {
        call: "field_visit(warung=27, city='Bekasi')",
        title: "Sat behind the counter at 27 warung",
        body: "Recorded (with consent) how owners actually say numbers and items. Built a slang dictionary: gopek, seceng, goceng, ceban, and every brand nickname.",
        duration: "Week 1–3",
      },
      {
        call: "design(tools=['add_sale','add_stock','record_debt','undo'])",
        title: "Designed four tools, not forty",
        body: "The agent can only call four ledger tools. Fewer tools meant fewer surprising actions and a reply short enough to read at a glance.",
        duration: "Week 4",
      },
      {
        call: "build(stt -> normalize -> agent -> ledger)",
        title: "Built the voice pipeline",
        body: "Speech-to-text, a slang normaliser, then the agent with tool use. Every logged entry comes back as one line with a ✓ reaction to confirm or a ✗ to undo.",
        duration: "Week 5–10",
      },
      {
        call: "eval(voice_notes=500, metrics=['intent','amount','item'])",
        title: "Evaluated on 500 real voice notes",
        body: "Scored intent, amount and item separately. Slang normalisation alone fixed most amount errors; the rest came from teaching the agent to ask one short question instead of guessing.",
        duration: "Week 8–12",
      },
      {
        call: "ship(pilot=140, summary='every Sunday')",
        title: "Piloted with 140 warung",
        body: "The Sunday summary (best sellers, profit estimate, who owes what) became the reason people kept using it.",
        duration: "Week 13–14",
      },
    ],
    architecture: {
      nodes: [
        { id: "owner", label: "Warung owner", x: 8, y: 30, kind: "user" },
        { id: "wa", label: "WhatsApp", x: 28, y: 30, kind: "service" },
        { id: "stt", label: "Speech-to-text", x: 48, y: 10, kind: "service" },
        { id: "norm", label: "Slang normaliser", x: 70, y: 10, kind: "agent" },
        { id: "agent", label: "Ledger agent", x: 70, y: 46, kind: "agent" },
        { id: "db", label: "Ledger DB", x: 92, y: 46, kind: "data" },
        { id: "dash", label: "Web dashboard", x: 92, y: 10, kind: "ui" },
      ],
      edges: [
        ["owner", "wa"],
        ["wa", "stt"],
        ["stt", "norm"],
        ["norm", "agent"],
        ["agent", "db"],
        ["db", "dash"],
        ["agent", "wa"],
      ],
    },
    beforeAfter: {
      before: {
        title: "Before: memory and paper scraps",
        points: ["No idea of weekly profit", "Debts on loose notes", "Restock by guesswork"],
      },
      after: {
        title: "After: talk, tap ✓, done",
        points: ["Logged in the same breath as the sale", "Debts with names and dates", "Sunday summary with best sellers"],
      },
    },
    results: {
      metrics: [
        { value: "140", label: "warung in the pilot" },
        { value: "91%", label: "voice notes logged with no correction" },
        { value: "83%", label: "still active weekly after 8 weeks" },
        { value: "4%", label: "of usage on the dashboard: WhatsApp did the rest" },
      ],
      body: [
        "Owners kept using it because it never asked them to change how they work. The agent learned their words instead of teaching them ours.",
      ],
      quote: {
        text: "Now I know which customer owes me, and since when. That alone paid for my phone credit.",
        who: "Warung owner, pilot participant",
      },
    },
    reflection:
      "The best interface was almost no interface. I spent more time on the wording of a one-line confirmation than on the whole dashboard, and that was the right call.",
  },
  {
    slug: "lintas",
    index: "03",
    name: "Lintas",
    year: "2024",
    kind: "Realtime commute copilot",
    tone: "sun",
    rarity: "Uncommon",
    tagline: "Door-to-door commutes across KRL, MRT and TransJakarta, replanned live.",
    prompt: "KRL is packed again. When should I leave, and is there a better way to get to work today?",
    promptBy: "Commuter, Bekasi → Sudirman",
    summary:
      "Lintas plans door-to-door commutes across Greater Jakarta's trains and buses, predicts how crowded each leg will be, and replans live when a line is delayed, with one sentence explaining why.",
    role: {
      title: "End-to-end builder (side project)",
      summary:
        "I built everything: the data collection, the crowding forecasts, the installable web app, push notifications and the agent that writes the explanations.",
      ownership: [
        { area: "Research", pct: 100 },
        { area: "Interface", pct: 100 },
        { area: "Fullstack", pct: 100 },
        { area: "Agents", pct: 100 },
        { area: "Evals", pct: 80 },
        { area: "Infra", pct: 100 },
      ],
    },
    team: "Solo",
    timeline: "Evenings and weekends · 2024",
    stack: ["Next.js (PWA)", "TypeScript", "Python", "Redis", "MapLibre", "Web Push", "Claude API"],
    links: { live: "https://example.com/lintas", repo: "https://github.com/example/lintas" },
    stats: [
      { label: "Commuters", value: "2.1k" },
      { label: "Replans taken", value: "62%" },
      { label: "Saved / week", value: "38 min" },
    ],
    problem: {
      body: [
        "A Bekasi to Jakarta commute can mix a KRL train, a transfer, the MRT and a bus. When one leg is delayed, the whole trip changes, and existing apps either show a static route or a wall of alerts.",
        "Commuters don't need more data. They need one decision: leave now, wait, or go another way.",
      ],
      constraints: [
        "Schedule feeds are incomplete; crowding isn't published at all",
        "Answers must arrive while you're walking to the station",
        "Must be installable and light on data",
      ],
    },
    process: [
      {
        call: "collect(crowd_reports=true, feeds=['schedule','delays'])",
        title: "Collected the missing data",
        body: "Public schedules plus a one-tap 'how crowded is your carriage?' report. Within a month, regular riders were filling in the gaps.",
        duration: "Month 1",
      },
      {
        call: "forecast(target='crowding', by=['line','hour','carriage'])",
        title: "Forecast crowding",
        body: "A small model per line and hour. Good enough to say 'stand near the back carriages on the 07:12' with confidence intervals I could defend.",
        duration: "Month 2",
      },
      {
        call: "design(widget='leave by')",
        title: "Designed around one number",
        body: "The home screen is a single 'leave by' time with a crowding bar. Everything else is one swipe away.",
        duration: "Month 2",
      },
      {
        call: "agent.explain(replan, max_words=25)",
        title: "Taught the agent to explain replans",
        body: "When a delay hits, the planner finds alternatives and the agent writes one sentence: what changed, what to do, what it costs you.",
        duration: "Month 3",
      },
      {
        call: "eval(replans=300, judge='commuter panel')",
        title: "Evaluated explanations with riders",
        body: "Twelve regular commuters rated 300 replan messages. Short and specific beat friendly and long, every time.",
        duration: "Month 4",
      },
    ],
    architecture: {
      nodes: [
        { id: "feeds", label: "Schedules + delays", x: 8, y: 12, kind: "service" },
        { id: "reports", label: "Crowd reports", x: 8, y: 46, kind: "user" },
        { id: "forecast", label: "Crowding forecast", x: 36, y: 30, kind: "service" },
        { id: "planner", label: "Route planner", x: 60, y: 30, kind: "service" },
        { id: "agent", label: "Explainer agent", x: 82, y: 12, kind: "agent" },
        { id: "app", label: "PWA + push", x: 82, y: 46, kind: "ui" },
      ],
      edges: [
        ["feeds", "forecast"],
        ["reports", "forecast"],
        ["forecast", "planner"],
        ["planner", "agent"],
        ["agent", "app"],
        ["planner", "app"],
      ],
    },
    beforeAfter: {
      before: {
        title: "Before: five apps and a group chat",
        points: ["Delay alerts with no alternative", "Guessing which carriage has room", "Late twice a week"],
      },
      after: {
        title: "After: one 'leave by' time",
        points: ["Live replans with a reason", "Crowding per carriage", "Push only when your plan changes"],
      },
    },
    results: {
      metrics: [
        { value: "2.1k", label: "weekly commuters at peak, all organic" },
        { value: "62%", label: "of suggested replans accepted" },
        { value: "38 min", label: "saved per rider per week (self-reported median)" },
        { value: "2×", label: "replan acceptance after adding the one-line reason" },
      ],
      body: [
        "Riders came for the crowding bar and stayed for the replans. The one-sentence explanation doubled how often people actually took the suggested alternative.",
      ],
      quote: {
        text: "It told me to take the earlier train from the next station over and why. I sat down for the first time in months.",
        who: "Rider, Bekasi line",
      },
    },
    reflection:
      "A prediction without a reason is just a notification. Adding 'why' to every replan changed behaviour more than any accuracy gain did.",
  },
];

export function getProject(slug: string): Project | undefined {
  return projects.find((project) => project.slug === slug);
}

export function adjacentProjects(slug: string) {
  const i = projects.findIndex((project) => project.slug === slug);
  return {
    prev: projects[(i - 1 + projects.length) % projects.length],
    next: projects[(i + 1) % projects.length],
  };
}

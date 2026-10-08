/**
 * The four case studies: her thesis product, her internship feature (under NDA), a campus
 * incubator product she co-founded, and a side project. This file is the single source of truth
 * for every number: the cards, the case pages, About, the CV, the brief and the agent read it.
 *
 * CONTOH — ganti dengan data asli.
 * The real projects (titles, URLs, numbers) arrive later. These are realistic samples so every
 * layout, the agent and the CV can be built and reviewed now. Replace field by field.
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

export type Metric = {
  value: string;
  label: string;
  /** How it was measured, in one line. */
  how: string;
};

/** One version of the system on the eval set: what changed, and the score on each series. */
export type EvalPoint = {
  version: string;
  change: string;
  values: number[];
  /** An experiment that was tried and rolled back: drawn off the line, not as a step toward the next version. */
  reverted?: boolean;
  /** The raw counts behind each value ("308/347"), so every percentage can be checked. */
  counts?: string[];
};

/** How it's built: the pipeline, the models and why, the evals, the budgets, the failure modes, code. */
export type Engineering = {
  summary: string;
  pipeline: { step: string; detail: string }[];
  models: { task: string; model: string; why: string; tried?: string }[];
  evals: {
    /** What the eval set is and where the labels come from. */
    set: string;
    /** How the evals are used (when they run, what blocks a release). */
    gate: string;
    series: { name: string; unit: string; better: "up" | "down" }[];
    history: EvalPoint[];
    /** What the version table is scored on (defaults to "the same set"). */
    caption?: string;
  };
  budgets: { label: string; value: string; note: string }[];
  failures: { when: string; then: string }[];
  /** Real mistakes from the error log: what the system said, what was true, why, and the fix. */
  errorLog: { said: string; truth: string; why: string; fix: string }[];
  /** Optional outcome table at the level people act on (e.g. per brief, not per field). */
  confusion?: { caption: string; head: string[]; rows: string[][]; note: string };
  /** Optional incident write-up: what happened, the impact, and what changed. */
  incident?: { title: string; what: string; impact: string; changed: string[] };
  /** How she'd know something broke: what's watched, the alerts, and one time an alert fired. */
  monitoring?: { watch: string[]; fired: string };
  /** What it would take at 100 times the volume. */
  scale?: string;
  code: { file: string; lang: string; caption: string; source: string };
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
  /** The 20-second version, for people skimming. */
  tldr: { problem: string; did: string; outcome: string };
  role: {
    title: string;
    summary: string;
    /** The calls that were hers, in plain sentences. */
    decisions: string[];
    /** Who she worked with, and who did what. */
    with: { who: string; part: string }[];
  };
  team: string;
  /** Whose product it was: hers alone, co-founded, or her part of a team's product as an intern. */
  ownership: "Solo" | "Co-founded" | "Internship";
  /** Where it came from, in two or three words (card chip, case header). */
  context: string;
  timeline: string;
  stack: string[];
  /** Own products have a live link and code; in-house work under NDA has neither. */
  links: { live?: string; repo?: string };
  /** "Check the receipts": what a reviewer can open to verify the case. CONTOH — ganti dengan tautan asli. */
  evidence: { label: string; href?: string; note: string }[];
  /** Full cases show every section; short ones skip the iterations, the raw notes and the states grid. */
  depth: "full" | "short";
  /** Where the work happened, for in-house projects (shown instead of the links). */
  company?: string;
  /** What happened to the product, and her part in it now. */
  status: string;
  /** Trading-card stats (3). */
  stats: { label: string; value: string }[];
  problem: { body: string[]; constraints: string[] };
  research: {
    methods: { label: string; detail: string }[];
    insights: { title: string; body: string }[];
    ethics: string;
  };
  /** The design decisions that shaped the product: options, the call, why, and what it cost. */
  decisions: {
    title: string;
    options: string[];
    chose: string;
    why: string;
    cost: string;
    /** Optional evidence table (e.g. a threshold trade-off); `chosen` marks the row that shipped. */
    table?: { caption: string; head: string[]; rows: string[][]; chosen: number };
  }[];
  /** Three rounds of the key screen (wireframes in features/screens/wires), with what testing found. */
  iterations: { name: string; finding: string; kept: boolean }[];
  /** The shipped screens, in the order they're shown (keys in features/screens/registry). */
  screens: { key: string; title: string; caption: string }[];
  /** The cover's three screens as [main, left, right]; defaults to the first three shipped screens. */
  cover?: [string, string, string];
  process: { stage: string; title: string; body: string; duration: string }[];
  /** Something that didn't work, and what it changed. */
  deadEnd: { title: string; body: string };
  /** Who could be left out, and what the design does about it (accessibility, devices, sampling). */
  inclusion: string[];
  /** A raw research artefact: the affinity map from the first round of research. */
  artifact: { title: string; clusters: { label: string; notes: string[] }[] };
  architecture: { nodes: ArchNode[]; edges: [string, string][] };
  engineering: Engineering;
  beforeAfter: {
    before: { title: string; points: string[] };
    after: { title: string; points: string[] };
  };
  results: {
    metrics: Metric[];
    body: string[];
    quote: { text: string; who: string };
    /** What it meant for the business, in one honest line. */
    business: string;
  };
  reflection: string;
  next: string;
};

/* CONTOH — ganti dengan data asli */
export const projects: Project[] = [
  {
    slug: "tenderlens",
    index: "01",
    name: "Tenderlens",
    year: "2026",
    kind: "AI brief for public tenders",
    tone: "magenta",
    rarity: "Holo rare",
    tagline: "Turns a 214-page government tender into one page a small contractor can decide on, with every claim cited.",
    prompt: "We spend three hours reading every tender package. Can something tell us in five minutes whether we should even bid?",
    promptBy: "Operations lead, 12-person construction firm in Bekasi",
    summary:
      "Tenderlens reads tender packages from public procurement portals and turns each one into a one-page brief: a bid / no-bid score, the three reasons behind it, and a link from every reason to the page it came from.",
    tldr: {
      problem: "Small contractors spend about 3 hours reading each 200-page tender, mostly to learn they never qualified.",
      did: "My thesis: a pipeline where the model only reads and quotes, code checks every quote against its page, rules decide the verdict, and the brief says 'Can't tell yet' instead of guessing. Then I designed the one-page brief around it.",
      outcome:
        "31 of 38 beta teams still used it weekly after 3 months. On 90 held-out tenders it gave 2 false 'Bid' verdicts and abstained on 8. Read time per tender: 11 minutes, against owners' estimate of about 3 hours.",
    },
    role: {
      title: "Sole engineer and designer (thesis)",
      summary:
        "Tenderlens was my final-year thesis, and I built all of it: the crawler, the extraction pipeline and its evals, the app, and the design, from shadowing bid teams to usability tests. Fajar, a classmate, helped with the OCR for scanned tables for six weeks. Bu Ratna, a former procurement officer, advised on the rules and labelled the eval set with me. My supervisor reviewed the evaluation method.",
      decisions: [
        "Kept the model out of the verdict: it reads and quotes, and rules in code decide, so every score can be explained line by line.",
        "Made a citation check in code the gate for every claim, after the model quoted pages that didn't say what it claimed.",
        "Chose abstaining over guessing, set the threshold on a dev set, and reported it on a test set I never tuned on.",
      ],
      with: [
        { who: "Bu Ratna, former procurement officer", part: "Domain rules. Labelled the 610 thesis fields with me, and we settled every disagreement together" },
        { who: "Fajar, a classmate (6 weeks)", part: "OCR for scanned tables" },
        { who: "My thesis supervisor", part: "Reviewed the evaluation design: the dev / test split and the intervals" },
        { who: "9 bid teams", part: "Shadowing, three rounds of usability tests, then the closed beta" },
      ],
    },
    team: "Me, a domain advisor, and a classmate for the OCR",
    ownership: "Solo",
    context: "Thesis project",
    timeline: "7 months · thesis, Sep 2025 – Mar 2026",
    status:
      "Since April 2026, Bu Ratna's procurement consultancy runs it for 31 client teams, the beta teams that stayed: it already had the clients, and I couldn't sell it and finish a thesis at the same time. The thesis code is mine and open source; the consultancy runs its own deployment and owns its client data. I maintain the pipeline and the eval set on a part-time contract that hands over to their engineer when I start a full-time job.",
    stack: ["TypeScript", "Next.js", "PostgreSQL", "Claude API", "pg-boss", "PaddleOCR", "Playwright"],
    links: { live: "https://example.com/tenderlens", repo: "https://github.com/example/tenderlens" },
    evidence: [
      { label: "Code", href: "https://github.com/example/tenderlens", note: "Commit history, the pipeline and the rules" },
      { label: "Thesis (PDF)", href: "https://example.com/tenderlens-thesis.pdf", note: "Method, data splits, results and limits" },
      { label: "Eval set", href: "https://github.com/example/tenderlens-evals", note: "The dev set and 200 of the 370 test fields; 170 stay private so they can't leak into training data" },
      { label: "Reproduce", href: "https://github.com/example/tenderlens-evals#reproduce", note: "One command re-scores v6 on the public fields" },
      { label: "60-second demo", href: "https://example.com/tenderlens-demo", note: "Unedited, in Indonesian, on a real public tender" },
    ],
    depth: "full",
    stats: [
      { label: "Still weekly", value: "31/38" },
      { label: "False 'Bid'", value: "2 of 43" },
      { label: "Time per tender", value: "11 min" },
    ],
    problem: {
      body: [
        "Indonesian public tenders arrive as long PDF bundles: legal boilerplate, scanned forms, technical specs and a price schedule, often 150 to 250 pages. Small contractors don't have a bid department: the owner or one site engineer reads them, often at night.",
        "Most tenders are a 'no' for them. The cost isn't the tenders they lose, it's the hours spent finding out they never qualified.",
      ],
      constraints: [
        "A wrong 'you qualify' is worse than no answer: a disqualified bid wastes days of work and a bank guarantee",
        "Formal legal Indonesian, mixed with scanned tables",
        "Read on phones, between site visits",
        "A student budget: the whole thing had to run for well under Rp 2M a month",
      ],
    },
    research: {
      methods: [
        { label: "Shadowing", detail: "9 bid teams, 2 hours each, plus 2 full tender readings timed end to end" },
        { label: "Usability tests", detail: "3 rounds of 5 people: paper, then clickable, then coded with real tenders" },
        { label: "Labelling", detail: "610 eligibility fields from 150 tenders, two labellers, every disagreement settled together" },
      ],
      insights: [
        { title: "Everyone reads in the same order", body: "Eligibility first, then scope, then money. Nobody started at page 1. That order became the brief, and the order the pipeline reads in." },
        { title: "A score without reasons is a rumour", body: "Owners wouldn't act on a number they couldn't argue with. They needed to check one claim to trust the rest." },
        { title: "Being wrong costs more than being slow", body: "A missed tender is a shrug. Bidding on one you don't qualify for costs a week of paperwork and a bank guarantee." },
      ],
      ethics:
        "Firm owners agreed to each shadowing session in writing; I recorded notes, not screens with prices. Tenders are public documents. Company profiles are encrypted, used only to match eligibility, and deleted on request.",
    },
    decisions: [
      {
        title: "Never show the score alone",
        options: ["A summary with the score at the end", "A big score up front", "The score with its three reasons, each linked to its page"],
        chose: "The score always arrives with three reasons, and each reason has a page chip that opens the source.",
        why: "In round two, all five testers saw the big score and none of them trusted it ('why 82?'). With reasons, four of five decided in under two minutes, and three tapped a page to check.",
        cost: "Less room on the screen, so the money details moved below the reasons. The fifth tester wanted money first; it moved up one slot.",
      },
      {
        title: "Abstain instead of guessing",
        options: ["Always show a score", "Show a score with a confidence percentage", "Say 'Can't tell yet', why, and who can check"],
        chose: "When a key page is unreadable or two clauses conflict, the brief shows 'Can't tell yet', names the page, and offers to send it to a person on the team.",
        why: "Testers ignored confidence percentages ('70% is basically yes'). 'I won't guess, here's the page' was read correctly by all nine people who saw it.",
        cost: "9% of briefs abstain, so some owners still open the PDF. On the frozen test set, abstaining cut wrong 'you qualify' calls from 25 of 370 to 8.",
        table: {
          caption: "Thresholds tuned on the dev set (240 fields). Reported on the frozen test set: 370 eligibility calls from 90 tenders I never tuned on.",
          head: ["Setting", "Briefs that abstain", "Wrongly said 'you qualify'"],
          rows: [
            ["Always give a score", "0%", "6.8% (25)"],
            ["Abstain on unreadable pages", "5%", "3.8% (14)"],
            ["Abstain on unreadable pages or clauses that conflict", "9%", "2.2% (8)"],
            ["Abstain unless every field has model confidence of 0.9 or more", "17%", "1.6% (6)"],
          ],
          chosen: 2,
        },
      },
      {
        title: "Make disagreeing a feature",
        options: ["A thumbs down on the whole brief", "A 'That's wrong' on each reason, with three quick causes"],
        chose: "Every reason has 'That's wrong'. Picking a cause takes one tap; the claim greys out at once, and after Bu Ratna reviews it the correction joins the dev set, never the test set.",
        why: "Owners argued with the score anyway. Giving them a place to do it produced 118 reviewed corrections that exposed two systematic misreads: percentages in table cells, and addenda that changed a requirement. Fixing those on the dev set (v6) raised field accuracy on the test set from 88.8% to 92.2%.",
        cost: "A review queue I keep up with: about 20 minutes a week. Corrections never touch the test set, so it stays honest.",
      },
    ],
    iterations: [
      { name: "Summary first", finding: "2 of 5 testers found the score at the bottom. The other three gave up halfway through the summary.", kept: false },
      { name: "Big score", finding: "5 of 5 saw it in a second. None trusted it: 'Why 82? Who says?'", kept: false },
      { name: "Score + 3 cited reasons", finding: "4 of 5 decided in under 2 minutes, and 3 tapped a page chip first. The fifth wanted the money sooner.", kept: true },
    ],
    screens: [
      { key: "tl-brief", title: "The brief", caption: "One page per tender. The score never appears without its reasons, and the money figures carry their page too." },
      {
        key: "tl-source",
        title: "Show the receipts",
        caption: "Tap a page chip: the source page opens with the sentence highlighted, next to the claim. This one is from the error log: before the fix, the brief said a 30% advance where the page says 20%.",
      },
      { key: "tl-unsure", title: "Can't tell yet", caption: "A different tender, with a blurry scan: it says so, names the page, and offers a person." },
      { key: "tl-disagree", title: "That's wrong", caption: "One tap to say why. The claim greys out, the score is recomputed without it, and a reviewed correction joins the dev set." },
    ],
    cover: ["tl-brief", "tl-digest", "tl-unsure"],
    process: [
      { stage: "Discover", title: "Shadowed nine bid teams", body: "Everyone looked for the same three things first: eligibility, scope, and money.", duration: "Month 1" },
      { stage: "Build", title: "The pipeline before any screen", body: "Crawler, OCR and extraction, measured on a 240-field dev set from the first week of code.", duration: "Month 2–3" },
      {
        stage: "Design",
        title: "Three rounds on the brief",
        body: "Paper, then clickable, then coded with real tenders. The score-only layout failed; the cited-reasons layout won.",
        duration: "Month 3–4",
      },
      { stage: "Test", title: "Tested the failures", body: "Blurry scans, contradictory clauses, misread numbers. Each became a designed state with its own words.", duration: "Month 4" },
      {
        stage: "Ship",
        title: "Closed beta with 38 teams",
        body: "12 weeks. In month 5 we labelled 90 new tenders as the test set and froze it; it was opened once, for the thesis results.",
        duration: "Month 5–7",
      },
    ],
    deadEnd: {
      title: "Auto-filling the bid documents",
      body: "Owners asked for it and I prototyped it in month 4. In testing, two owners signed a pre-filled form without reading it. I dropped it: a tool that makes people stop reading legal documents is the opposite of this product.",
    },
    inclusion: [
      "Verdicts are words and icons, never colour alone: Bid, Check, No.",
      "Page chips are 44 px tap targets, and the brief reads in order with TalkBack: verdict, reasons, money.",
      "Tested at 200% text size on a Rp 2 million Android phone, the kind most owners carry.",
      "The brief is shown here in English; the product is in Indonesian, written so it makes sense read aloud.",
    ],
    artifact: {
      title: "From the shadowing sessions: what bid teams looked for first",
      clusters: [
        { label: "Can we even bid?", notes: ["'SBU dulu, baru yang lain'", "Flips to the eligibility table, skips 80 pages", "Calls the notary to check a licence"] },
        { label: "Is it our kind of job?", notes: ["Compares scope with last year's road jobs", "'Gedung sekolah? Bukan kita.'"] },
        { label: "Is the money worth it?", notes: ["Circles the HPS on page 3", "Worries about the bank guarantee", "'Margin tipis, lewat.'"] },
      ],
    },
    architecture: {
      nodes: [
        { id: "portal", label: "LPSE portals", x: 11, y: 10, kind: "data" },
        { id: "crawl", label: "Crawl + queue", x: 30, y: 10, kind: "service" },
        { id: "ocr", label: "PDF + OCR", x: 49, y: 10, kind: "service" },
        { id: "triage", label: "Page triage", x: 68, y: 10, kind: "agent" },
        { id: "extract", label: "Extraction", x: 88, y: 10, kind: "agent" },
        { id: "check", label: "Quote check", x: 88, y: 48, kind: "service" },
        { id: "rules", label: "Verdict rules", x: 68, y: 48, kind: "service" },
        { id: "db", label: "Postgres", x: 49, y: 48, kind: "data" },
        { id: "app", label: "App + digest", x: 30, y: 48, kind: "ui" },
        { id: "user", label: "Bid team", x: 11, y: 48, kind: "user" },
      ],
      edges: [
        ["portal", "crawl"],
        ["crawl", "ocr"],
        ["ocr", "triage"],
        ["triage", "extract"],
        ["extract", "check"],
        ["check", "rules"],
        ["rules", "db"],
        ["db", "app"],
        ["app", "user"],
      ],
    },
    engineering: {
      summary:
        "A nightly pipeline turns each new tender into a brief before owners wake up. The model reads and quotes; code decides. Every claim has to survive a citation check, and the verdict comes from rules in code, so every score can be explained line by line.",
      pipeline: [
        { step: "Crawl", detail: "Polls 14 LPSE portals at 02:00. New packages go into a job queue in Postgres (pg-boss), so a crash loses nothing." },
        { step: "Read", detail: "The PDF's text layer where there is one; PaddleOCR for scanned pages, with a quality score per page." },
        {
          step: "Triage",
          detail:
            "A small model labels each of ~200 pages: eligibility, scope, money, addendum or boilerplate. About 12 go further. Triage and extraction go through the Batch API: half the price, and nobody is awake to wait.",
        },
        { step: "Extract", detail: "A larger model fills a JSON schema. Every field has a value, the page it came from and the exact quote." },
        {
          step: "Check",
          detail: "Code, not a model: the quote must be on the cited page (a fuzzy match of 0.9 or more for words, an exact match for every number and code), or the claim is dropped.",
        },
        {
          step: "Decide",
          detail:
            "Rules in TypeScript compare the claims with the company profile. Each tender type has a checklist of required eligibility fields: a missing, rejected, unreadable or conflicting one means 'Can't tell yet'.",
        },
        { step: "Deliver", detail: "The brief in the app and a WhatsApp and email digest at 06:30. 'That's wrong' feeds a review queue." },
      ],
      models: [
        {
          task: "Page triage",
          model: "Claude Haiku 5.5 (Haiku 4.5 during the thesis)",
          why: "About 200 pages per tender, so it has to be cheap. A wrong label can drop a page (that's how an addendum was missed; see the error log), so eligibility and addendum labels lean towards 'send it on'.",
          tried: "An open-weight 8B model, self-hosted: it missed 1 in 9 eligibility pages on the dev set, against 1 in 60.",
        },
        {
          task: "Field extraction",
          model: "Claude Sonnet 5.5 (Sonnet 4.5 during the thesis)",
          why: "Legal Indonesian and scanned tables. It only sees about 12 pages, so quality is worth the price here.",
          tried: "Claude Haiku 4.5 (v5b in the chart): 6.1 points lower field accuracy at a third of the cost. Reverted.",
        },
        { task: "Scanned pages", model: "PaddleOCR, self-hosted", why: "Read Indonesian table scans better than the two hosted options I tested, with no per-page cost." },
        { task: "The verdict", model: "No model: rules in code", why: "Owners need to argue with the reason. A rule can be shown and tested; a model's judgement can't." },
      ],
      evals: {
        set: "Three sets, split by tender. Dev: 240 eligibility fields from 60 tenders; every choice below was made on it, and reviewed user corrections go there. Test: 370 fields from 90 other tenders, labelled in month 5 and frozen. It was opened once, at the end of the thesis, when every version in the chart was scored from its saved config; after that it's spent, so nothing since is reported on it. Regression: 180 fields from 2026 tenders, labelled after graduation by me, with a classmate re-labelling 60 of them blind (58 matched); it replaces the test set from v7 on. Tenders the beta teams had seen were kept out of the test set, so none of the 118 corrections touched it. Every field was labelled separately by Bu Ratna and me (94% raw agreement, Cohen's κ 0.87), then settled together. She now runs the product, so a classmate re-labelled 100 random test fields blind: 96 matched.",
        gate: "CI runs the dev and regression sets on every prompt, model or rule change (about 4 minutes, Rp 25k). A release is blocked at more than 3 wrong 'you meet this' calls on the 180 regression fields: a deliberately loose gate, because one or two errors either way is noise at this size. Its first run, in April 2026, blocked v6 itself (4 such calls): fixing that is v7. Field accuracy counts answered fields only, so it's shown next to coverage: part of v5's gain is abstaining more. For scale, 8 of 370 is about 0.8–4.6% (95% interval, bootstrapped by tender, since fields from one tender aren't independent).",
        caption: "What changed in each version, all scored once on the frozen test set at the end of the thesis",
        series: [
          { name: "Field accuracy (answered)", unit: "%", better: "up" },
          { name: "Fields answered", unit: "%", better: "up" },
          { name: "Wrong 'you qualify'", unit: "%", better: "down" },
        ],
        history: [
          { version: "v1", change: "One prompt over the whole PDF", values: [71.4, 100, 11.4], counts: ["264/370", "370/370", "42/370"] },
          { version: "v2", change: "Page triage first", values: [79.2, 100, 10.3], counts: ["293/370", "370/370", "38/370"] },
          { version: "v3", change: "JSON schema with a quote per field", values: [84.2, 99.2, 9.2], counts: ["309/367", "367/370", "34/370"] },
          { version: "v4", change: "Citation check in code", values: [86.6, 96.5, 6.8], counts: ["309/357", "357/370", "25/370"] },
          { version: "v5", change: "Abstain on unreadable or conflicting pages", values: [88.8, 93.8, 2.2], counts: ["308/347", "347/370", "8/370"] },
          { version: "v5b", change: "Haiku for extraction, to cut cost", values: [82.5, 92.4, 3.8], counts: ["282/342", "342/370", "14/370"], reverted: true },
          { version: "v6", change: "Fixes from 118 reviewed corrections (table percentages, addenda)", values: [92.2, 94.1, 2.2], counts: ["321/348", "348/370", "8/370"] },
        ],
      },
      confusion: {
        caption: "Per brief, the level owners act on: v6 on the 90 held-out tenders",
        head: ["The brief said", "Truth: they qualified", "Truth: they didn't"],
        rows: [
          ["Bid", "41", "2"],
          ["No", "3", "36"],
          ["Can't tell yet", "5", "3"],
        ],
        note: "2 false 'Bid' verdicts out of 43 (with numbers this small, the true rate could be anywhere from about 1% to 15%), 3 missed tenders out of 49 that qualified, and 8 of 90 abstained: 91% coverage. Both false 'Bid's were licence sub-codes. Reading them is where v7 came from, so v7 is measured on the regression set, not here.",
      },
      monitoring: {
        watch: [
          "Nightly: tenders crawled per portal, against the 7-day average",
          "OCR quality per page, and the share of claims the citation check rejects",
          "Abstain rate per day, and model spend per day",
        ],
        fired: "In March 2026, in the last month of the beta, the rejected-claims alert fired: one portal had started serving PDFs with a broken text layer, so quotes didn't match. Those pages now always go through OCR.",
      },
      scale:
        "Each tender is read once and shared by every team that gets it, so 100 times the teams barely moves the model bill: the rules and the digests grow, and they're cheap. The bill grows with portals. Covering all of Indonesia's LPSE portals (about 40 times today's 14) would be about Rp 45M a month, so first I'd cache the boilerplate pages that repeat across tenders, and put a second provider behind the same schema for outages. The pipeline is already a queue, so throughput is mostly a question of workers.",
      budgets: [
        {
          label: "Cost per tender",
          value: "Rp 420",
          note: "Read once, shared by every team that gets it. Haiku 5.5 triage (140k tokens in, 2k out) US$0.0075 + Sonnet 5.5 extraction (10k in, 1.5k out) US$0.0175, at Batch API prices (half of list) ≈ US$0.025. On the thesis's Haiku 4.5 and Sonnet 4.5: about Rp 1,650; one prompt over the whole PDF (v1): about Rp 3,900",
        },
        { label: "Overnight batch", value: "41 min p50", note: "2 h 50 on the worst night; the digest goes out at 06:30, so nobody waits" },
        { label: "Quotes on their page", value: "99.4%", note: "of the model's quotes, before the check; the check drops the other 0.6%" },
        { label: "Monthly bill", value: "Rp 1.4M", note: "Rp 1.1M of model calls for about 2,600 tenders read for 31 teams, plus Rp 300k hosting" },
      ],
      failures: [
        { when: "A page is a blurry scan", then: "Below an OCR quality of 0.6, the field is 'unreadable' and the brief says 'Can't tell yet', naming the page." },
        { when: "A quote isn't on the cited page", then: "The claim is dropped. If it was about eligibility, the brief says 'Can't tell yet' and names the page; otherwise the brief goes out without it." },
        {
          when: "A tender PDF contains instructions ('ignore the rules above…')",
          then: "The model only fills a schema with quotes, every quote is checked against its page, and rules decide, so planted text can at most become a quoted claim a person can read. Pages with instruction-like text are flagged in the digest.",
        },
        {
          when: "A required field was never extracted",
          then: "Silence isn't a pass: the checklist for that tender type notices the gap, and the brief says 'Can't tell yet: no bank guarantee clause found'.",
        },
        { when: "Two clauses disagree", then: "Both are shown with their pages, and there's no verdict." },
        { when: "A portal is down at 02:00", then: "Retried with backoff until 05:30. The digest says which portals couldn't be reached." },
        { when: "A batch item fails, or the batch runs late", then: "Those tenders retry on the standard API at full price before 06:00; anything still missing shows 'Still reading' instead of half a brief." },
        {
          when: "An owner taps 'That's wrong'",
          then: "The claim greys out at once. On an eligibility reason the brief turns to 'Can't tell yet' until the correction is reviewed, so a dispute can never turn a 'No' into a 'Bid'; otherwise the score is recomputed without it.",
        },
      ],
      errorLog: [
        {
          said: "30% advance payment",
          truth: "Page 88 says 20% (dua puluh persen)",
          why: "OCR read a faint 2 as a 3, so the quote matched its own misread",
          fix: "Numbers in claims are re-read from the page image at 2× when OCR confidence is below 0.8",
        },
        {
          said: "You meet the SBU K1 qualification",
          truth: "Needs sub-code BG004; the company has BG009",
          why: "Extraction kept the class (K1) and dropped the sub-code, and the rule only compared classes",
          fix: "v7, after the thesis: the schema extracts the full code and the rule compares exact strings. Found in the test set's errors, so measured on the regression set (4 wrong 'you meet this' calls → 1)",
        },
        { said: "Documents due 14 March", truth: "An addendum on page 212 moved it to 18 March", why: "Addenda were triaged as boilerplate", fix: "Addendum pages are always sent to extraction" },
        { said: "HPS Rp 2.4 million", truth: "Rp 2.400.000.000,00 (2.4 billion)", why: "Indonesian thousand separators", fix: "Amounts are parsed in code with an id-ID parser, never by the model" },
        { said: "Scope: road works", truth: "Road and drainage works", why: "The schema allowed one scope", fix: "The schema takes a list of scopes" },
      ],
      code: {
        file: "pipeline/verify.ts",
        lang: "ts",
        caption: "The rule the product rests on: a claim reaches the brief only if its quote is really on the page it cites, and eligibility is never guessed.",
        source: `const MIN_SIMILARITY = 0.9; // tuned on the dev set: below this, OCR noise and real misquotes look alike

export function verifyCitation(claim: Claim, pages: PageText[]): Checked {
  const page = pages[claim.page - 1];
  if (!page) return { ...claim, status: "rejected", reason: "no_such_page" };

  // Slide a window the length of the quote over the page and keep the best match,
  // after normalising OCR quirks (spacing, dashes, "l" vs "1" in licence codes).
  const { similarity, window } = bestWindow(normalise(claim.quote), normalise(page.text));
  if (similarity < MIN_SIMILARITY) return { ...claim, status: "rejected", reason: "not_on_page" };

  // Words can be fuzzy (OCR noise); numbers and licence codes can't. "20%" vs "30%" is 0.96 similar.
  if (!sameNumbersAndCodes(claim.quote, window)) return { ...claim, status: "rejected", reason: "number_mismatch" };

  return { ...claim, status: "verified", similarity };
}

export function verdict(claims: Checked[], tender: Tender, profile: CompanyProfile): Verdict {
  const eligibility = claims.filter((c) => c.field.group === "eligibility");

  // Silence isn't a pass: every field this kind of tender requires has to have been found.
  const missing = REQUIRED[tender.type].find((name) => !eligibility.some((c) => c.field.name === name));
  if (missing) return { kind: "cant_tell", missing };

  const problem = eligibility.find((c) => c.status === "rejected" || c.unreadable || conflicts(c, eligibility));
  if (problem) return { kind: "cant_tell", page: problem.page }; // never guess on eligibility

  const verified = claims.filter((c) => c.status === "verified");
  return scoreWithRules(verified, profile); // every point of the score names the claim it came from
}`,
      },
    },
    beforeAfter: {
      before: {
        title: "Before: a 214-page PDF and a highlighter",
        points: ["About 3 hours per tender", "Eligibility found on page 87", "Decision made after the deadline, twice"],
      },
      after: {
        title: "After: one page, every claim cited",
        points: ["11 minutes per tender", "Score plus three reasons", "Tap any line to open the source page"],
      },
    },
    results: {
      metrics: [
        {
          value: "11 min",
          label: "median read time per tender, down from about 3 hours",
          how: "Timed on 46 tenders with 8 teams. Baseline: owners' own estimate, confirmed by timing 2 full readings (2 h 40 and 3 h 20)",
        },
        { value: "31 / 38", label: "beta teams still using it weekly after 3 months", how: "Weekly active teams in month 3 of the beta, from product analytics" },
        {
          value: "2.2%",
          label: "of eligibility calls wrongly said 'you qualify' (8 of 370)",
          how: "Frozen test set, opened once at the end of the thesis; about 0.8–4.6% (95%, bootstrapped by tender). All 8 passed the citation check: the quote was on the page, but the extracted field dropped a detail the rule needed, mostly a licence sub-code. The fix came after, so it's measured on the regression set",
        },
        { value: "12", label: "teams paid in advance for a plan that didn't exist yet", how: "Rp 450k a month each, collected in week 12 of the beta" },
      ],
      body: [
        "Beta teams now skim every relevant tender instead of the two or three they had time for. The 12 paying teams bid on 1.9 times as many as in the same quarter a year earlier (their own bid records). They're the keenest teams and they chose to pay, so read that as an upper bound. Seven tenders found this way were won by May 2026; owners say they would have skipped three of them.",
      ],
      quote: {
        text: "I stopped printing tenders. If the score says no, I open the page it cites, and I agree or I don't. Five minutes.",
        who: "Owner, civil works contractor (beta user)",
      },
      business: "12 teams × Rp 450k is about Rp 5.4M (US$330) a month: small, but proof that owners would pay, and the reason the consultancy took it on.",
    },
    reflection:
      "The citation rule was the product. Accuracy got people to try it, but trust only arrived when every line could be checked in one tap, and when the system was willing to say 'I can't tell'. Keeping the model away from the verdict made all of that possible.",
    next: "Let teams write their own eligibility rules in plain Indonesian, compiled to the same rule engine, and show which rule decided each score.",
  },
  {
    slug: "ask-hr",
    index: "02",
    name: "Ask HR",
    year: "2025",
    kind: "AI answers inside an HR app (internship)",
    tone: "sun",
    rarity: "Rare",
    tagline: "Employees ask HR questions in the app: routine ones get an answer with its policy section, the rest go to HR as drafts, and sensitive ones go straight to a person.",
    prompt: "Half my week goes on answering the same twenty questions about leave and payslips. Can the app answer them for me?",
    promptBy: "HR manager at a client company, 1,200 employees",
    summary:
      "Ask HR lets employees ask HR questions inside the company's HR app. Routine topics get an automatic answer from the company's own policy, with the section it came from. Everything else becomes a draft that HR approves. Anything sensitive skips the AI and goes to a person.",
    tldr: {
      problem:
        "HR teams at the startup's 40 client companies spent up to half their week on the same questions. Leadership's first chatbot pilot gave 11 wrong policy answers out of 212, one about maternity leave, and was paused.",
      did: "As an intern in a squad of seven: I built the test harness that showed which topics were safe to automate, the lane router (with the data scientist), the answer writer and its retrieval (with my mentor), and the HR review queue.",
      outcome:
        "41% of questions answered on the spot with their policy section, and a median first reply of 38 minutes instead of 4 hours. No sensitive question was answered automatically, but three reached the draft lane in month 1: that's written up as an incident.",
    },
    role: {
      title: "AI engineering intern",
      summary:
        "I joined for six months as an intern, in a squad with a product manager, three engineers, a data scientist and a product designer. I built the router with the data scientist, the answer writer and its retrieval, and the HR review queue in React. Bayu, a senior engineer, reviewed every pull request and paired with me on retrieval; the other two engineers built the handbook upload, the WhatsApp channel and the admin settings. Sekar, the squad's product designer, led the interaction design; I prototyped the lanes in code so we could test them on real questions instead of mockups.",
      decisions: [
        "Built the harness that replayed the pilot's 212 answers by topic. It showed six topics were safe to automate, and the rest weren't.",
        "Proposed routing before retrieval: a small classifier picks the lane first, so a sensitive question never reaches the answer model.",
        "Wrote the weekly audit, which found that handbook updates, not the model, caused most wrong answers.",
      ],
      with: [
        { who: "Nadia, product manager", part: "Owned the roadmap; took the harness results to leadership" },
        { who: "Bayu, senior engineer (my mentor)", part: "Reviewed every pull request; paired with me on retrieval and on the queue's data model" },
        { who: "Wulan, data scientist", part: "Trained the topic classifier with me; we labelled the non-sensitive questions together" },
        { who: "Sekar, product designer", part: "Led the interaction design of the answer card and the queue; we iterated on it in code together" },
        { who: "Legal, and two pilot clients", part: "Defined the sensitive-topics list and what the AI may answer" },
      ],
    },
    team: "Squad of 7: PM, 3 engineers, a data scientist, a product designer and me (intern)",
    ownership: "Internship",
    context: "Internship, in a squad",
    timeline: "6 months · internship, Feb – Aug 2025",
    stack: ["TypeScript", "Python (classifier)", "React", "PostgreSQL + pgvector", "Node.js", "Claude API", "Metabase"],
    links: {},
    evidence: [
      { label: "Under NDA", note: "No code or live link. The startup reviewed this write-up before it went up; screens are redrawn with client data removed, and the code excerpt is a simplified reconstruction" },
      { label: "References", note: "Bayu (senior engineer, my mentor) and Nadia (PM) can speak to my part. Contact on request" },
    ],
    depth: "short",
    company: "An HR software startup in Jakarta (name under NDA; it reviewed this write-up). Screens are redrawn from the shipped design with client data removed, and shown in English; the app is in Indonesian.",
    status: "Rolled out from May 2025, five clients first and all 40 by August, and still running. My internship ended in August; the squad kept the pipeline, the queue and the weekly audit.",
    stats: [
      { label: "First reply", value: "4h → 38m" },
      { label: "Answered at once", value: "41%" },
      { label: "Drafts edited", value: "37→18%" },
    ],
    problem: {
      body: [
        "The HR app served 40 client companies and about 12,000 employees. HR teams said they spent up to half their week answering the same questions: leave balances, payslip dates, reimbursement rules.",
        "Leadership's plan was a chatbot that answered everything. In its pilot week it gave 11 wrong policy answers out of 212, one about maternity leave. The pilot was paused, and the problem came to the squad I joined.",
      ],
      constraints: [
        "A wrong answer about pay or leave is a legal and trust problem for the client, not just for us",
        "Every client has its own handbook, in Indonesian, updated without telling us",
        "Sensitive text must not leave our servers unless it has to",
        "Most clients have an HR team of one or two",
      ],
    },
    research: {
      methods: [
        { label: "Question audit", detail: "1,200 anonymised past questions from 6 clients, sorted into 31 topics with the PM and the data scientist" },
        { label: "Pilot replay", detail: "The pilot's 212 answers re-run and graded by topic, to see where the model went wrong" },
        { label: "Planted-error tests", detail: "Wrong drafts hidden in HR's queue, monthly, to check reviewers actually read" },
      ],
      insights: [
        {
          title: "The errors clustered by topic",
          body: "The pilot was right on questions with one exact answer in the handbook and wrong on exceptions. Six topics (leave, payslip dates, holidays, attendance, BPJS, reimbursement rules) were 58% of questions and nearly always exact.",
        },
        {
          title: "HR wanted to stay the author",
          body: "Admins didn't fear the AI being slow. They feared an employee screenshotting a wrong answer 'from HR'. They wanted to approve anything that spoke for them.",
        },
        { title: "Some questions aren't questions", body: "About 4% were complaints, harassment reports or health disclosures phrased as questions. Those must never get an automatic reply." },
      ],
      ethics:
        "Client companies consented to the audit, and employees were told in the app that past questions would be used. A script removed names, ID numbers and phone numbers before anyone read a question. Wulan and I labelled the 1,152 non-sensitive questions; the 48 sensitive ones were labelled by Legal and each client's HR lead, and never read by the squad. Employees see when an answer came from the AI, and every client can switch the feature off.",
    },
    decisions: [
      {
        title: "Three lanes, not one chatbot",
        options: [
          "Auto-answer everything (the original plan)",
          "HR approves every answer",
          "Auto-answer six routine topics with a source; drafts for HR on the rest; sensitive topics straight to a person",
        ],
        chose: "Six routine topics are answered automatically with their policy section. Everything else is drafted for HR to approve. Sensitive topics skip the AI.",
        why: "The replay showed where the model could be trusted: exact handbook answers, yes; exceptions, no. Approving everything would have buried a one-person HR team.",
        cost: "Leadership wanted a bigger number. We launched with 41% answered automatically instead of 'all of them'. Nadia made the case with the replay numbers I produced.",
      },
      {
        title: "Decide first, then reply",
        options: [
          "Drafts inside the existing ticket inbox",
          "One card per draft with a single 'Approve and send'",
          "One card per question: the decision first (approve the swap or not), then the reply",
        ],
        chose: "A separate review queue where HR makes the decision, then sends the reply. Drafts about pay or contracts can't be sent until the source has been opened.",
        why: "In the inbox, admins opened every ticket to find the drafts: 31 minutes for 20 questions. With one button they cleared 20 in 6 minutes, but sent 3 of 5 planted wrong drafts. With the decision split out and the source check, they caught 5 of 5, in about 9 minutes.",
        cost: "Slower than one tap, on purpose. Built from design-system parts, so it was two weeks of front-end work.",
      },
      {
        title: "Show the source, even if only its title",
        options: ["The source paragraph, inline in the answer", "The policy section title, linking to the handbook"],
        chose: "We shipped the section title and a link. I argued for the paragraph and lost.",
        why: "Splitting 40 handbooks into reliable paragraphs would have added six weeks. Nadia and Bayu agreed to ship titles and measure how often people still asked 'why?'.",
        cost: "1 in 9 employees still taps through to the handbook. That number is now the case for the paragraph view.",
      },
    ],
    iterations: [
      { name: "The pilot chatbot (before I joined)", finding: "11 wrong policy answers out of 212 in its first week, one about maternity leave. Paused.", kept: false },
      { name: "Drafts in the inbox", finding: "6 admins opened every ticket to find the drafts: 31 minutes for 20 questions.", kept: false },
      { name: "A queue: decide, then reply", finding: "20 drafts in about 9 minutes, and 5 of 5 planted wrong drafts caught.", kept: true },
    ],
    screens: [
      { key: "ah-answer", title: "An answer with its source", caption: "Routine topics get an answer from the company's own policy, with the section it came from." },
      { key: "ah-queue", title: "HR's review queue", caption: "The decision first, then the reply. Pay and contract drafts need the source opened before sending." },
      { key: "ah-admin", title: "The admin side", caption: "Each client chooses which topics may be answered automatically, and sees when a handbook change needs a review." },
      { key: "ah-sensitive", title: "Never the AI", caption: "A complaint goes privately to a named person, with an after-hours line. No draft is written." },
    ],
    process: [
      { stage: "Discover", title: "Audited 1,200 questions and replayed the pilot", body: "31 topics, six of them most of the work, and 4% that weren't questions at all.", duration: "Weeks 1–3" },
      { stage: "Define", title: "Three lanes, agreed with leadership", body: "Nadia presented the replay next to the topic audit, and we agreed what the AI may and may not do.", duration: "Week 4" },
      { stage: "Build", title: "Router, retrieval, queue", body: "Pull requests reviewed by Bayu; the queue built from design-system parts with Sekar.", duration: "Weeks 5–11" },
      { stage: "Test", title: "Planted errors and three rounds with HR", body: "The inbox, then one-tap approval, then the split decision.", duration: "Weeks 9–12" },
      { stage: "Ship", title: "Staged launch, 5 clients to 40", body: "May to August 2025. Then the weekly audit, and a 'handbook changed' alert after the first audits.", duration: "Weeks 13–26" },
    ],
    deadEnd: {
      title: "Fine-tuning a model on old replies",
      body: "I spent two weeks fine-tuning a small model on 900 past HR replies. It learned the tone, and the mistakes: it repeated a leave rule that a client had changed in 2023. Retrieval from the current handbook won. The lesson: ask where the truth lives before training on history.",
    },
    inclusion: [
      "Answers are written at a primary-school reading level in Indonesian, checked with two employees who left school early.",
      "Shift workers without app access can ask on WhatsApp; the same three lanes apply.",
      "The review queue works from the keyboard alone (J and K to move, D to decide, R to reply), because two admins work at a desktop all day.",
    ],
    artifact: {
      title: "From the question audit: 1,200 questions, sorted with the PM and the data scientist",
      clusters: [
        { label: "Routine (58%)", notes: ["'Sisa cuti saya berapa?'", "'Gajian tanggal berapa?'", "'Kapan THR cair?'"] },
        { label: "Needs HR (38%)", notes: ["'Boleh tukar shift sama teman?'", "'Reimburse kacamata bisa?' (depends on grade)", "Exceptions, approvals, disputes"] },
        { label: "Not a question (4%)", notes: ["Complaints about a manager", "Health disclosures", "Never answered by AI"] },
      ],
    },
    architecture: {
      nodes: [
        { id: "employee", label: "Employee", x: 10, y: 30, kind: "user" },
        { id: "scrub", label: "Scrub PII", x: 28, y: 30, kind: "service" },
        { id: "router", label: "Lane router", x: 47, y: 30, kind: "agent" },
        { id: "index", label: "Handbook index", x: 67, y: 8, kind: "data" },
        { id: "writer", label: "Answer writer", x: 67, y: 30, kind: "agent" },
        { id: "check", label: "Section check", x: 88, y: 30, kind: "service" },
        { id: "person", label: "HR in person", x: 47, y: 54, kind: "user" },
        { id: "queue", label: "Review queue", x: 88, y: 54, kind: "ui" },
      ],
      edges: [
        ["employee", "scrub"],
        ["scrub", "router"],
        ["router", "person"],
        ["router", "writer"],
        ["index", "writer"],
        ["writer", "check"],
        ["check", "queue"],
      ],
    },
    engineering: {
      summary:
        "Three lanes, in code. A classifier picks the lane before any model writes a word. Only the routine lane may answer on its own, only from the client's current handbook, and only if the sections it cites still exist.",
      pipeline: [
        {
          step: "Scrub",
          detail:
            "Names, ID numbers and phone numbers become placeholders ([NAMA_1]) before anything is stored or sent to a model, and are put back into the draft afterwards: HR sees 'Dedi', the model never does.",
        },
        { step: "Route", detail: "A fine-tuned IndoBERT classifier gives a topic and a sensitivity score. Sensitive goes to a person; unsure goes to HR." },
        {
          step: "Look up",
          detail: "Questions about the asker's own leave or pay use a tool that reads only the signed-in employee's record. The employee ID comes from the session, never from the model.",
        },
        { step: "Retrieve", detail: "Hybrid search (keywords and pgvector) over that client's handbook, re-indexed when HR uploads a new version." },
        { step: "Write", detail: "Claude answers only from the retrieved sections, as JSON with the section IDs it used." },
        {
          step: "Check",
          detail:
            "Code checks that every cited section exists in the current handbook version, and that every number and date in the answer appears in those sections. If not, the answer becomes a draft.",
        },
        { step: "Review", detail: "HR decides, then replies. Pay and contract drafts need the source opened before they can be sent." },
        { step: "Audit", detail: "Weekly: 100 random automatic answers checked against the handbook, about a minute each, and every misroute reviewed by Legal." },
      ],
      models: [
        { task: "Lane routing", model: "IndoBERT, fine-tuned (Python)", why: "40 ms in our own service, so sensitive text never leaves our servers just to be routed. Easy to audit." },
        {
          task: "Answers and drafts",
          model: "Claude Sonnet 4, with retrieved sections",
          why: "Handbook Indonesian is formal and long. Drafts are reviewed anyway; automatic answers are limited to six topics.",
        },
        { task: "Sensitive lane", model: "No model", why: "Complaints and health disclosures go to a named person. That was a legal rule, not a tuning choice." },
      ],
      evals: {
        set: "Router: the 1,200-question audit, split by client. Dev: 800 questions (32 sensitive) plus 120 sensitive paraphrases written with Legal, 152 sensitive in all; the incident below added 3 real questions and 40 paraphrases, so 195 now. The thresholds are tuned here. Held out: 400 questions (16 sensitive) plus 80 paraphrases, scored once per release (five times in all) and never used to tune. Answers: 300 routine questions with reference answers checked by HR at two pilot clients. Privacy: 60 questions that ask about a colleague's data or hide instructions ('ignore the handbook and…'); none returned another employee's data. Scrubber: 500 questions hand-tagged for names, NIK and phone numbers; it caught every NIK and phone number and 97.8% of names (the misses were nicknames like 'Mas Ipul').",
        gate: "A router change ships only if it catches every sensitive question in the dev split. At v5 the held-out slice catches 95 of 96: all 16 real questions and 79 of 80 paraphrases. With only sixteen real questions, a miss rate as high as about 21% can't be ruled out (95%), and we wrote the paraphrases ourselves, so the real rate may be worse (the incident showed it). That's why no model drafts anything above a low sensitivity score, and why every misroute is reviewed. Answers are graded against the references (right, partly right, wrong) by two people.",
        series: [
          { name: "Sensitive caught (held out)", unit: "%", better: "up" },
          { name: "Routine answers wrong", unit: "%", better: "down" },
        ],
        history: [
          { version: "v1", change: "Keyword router, pilot prompt", values: [77.1, 5.3] },
          { version: "v2", change: "IndoBERT classifier", values: [92.7, 5.3] },
          { version: "v3", change: "Retrieval from the current handbook", values: [92.7, 2.7] },
          { version: "v4", change: "Separate sensitivity score, more paraphrases", values: [99.0, 2.7] },
          { version: "v5", change: "Section-ID check in code", values: [99.0, 1.0] },
        ],
      },
      budgets: [
        { label: "Routing", value: "40 ms p50", note: "in-house classifier, no external call" },
        { label: "Automatic answer", value: "3.1 s p50", note: "6.8 s p95, streamed, first words in under a second" },
        {
          label: "Cost per answer",
          value: "Rp 195",
          note: "Sonnet 4 at 2025 prices: the instructions and the client's policy summary (6k tokens) cached at a tenth of the price, then ~2k tokens of retrieved sections and the question, and ~250 out. Rp 460 before caching",
        },
        { label: "Weekly audit", value: "2 hours", note: "100 random answers, about a minute each against the handbook, one person" },
      ],
      failures: [
        { when: "The router isn't sure (below 0.35)", then: "The question goes to HR as a draft, never to the automatic lane." },
        { when: "A cited section isn't in the current handbook", then: "The answer is held back as a draft, and HR gets a 'handbook changed' alert." },
        { when: "HR uploads a new handbook", then: "Re-indexed in about 2 minutes; recent answers that cited changed sections are flagged for review." },
        { when: "The model API is slow or down", then: "The question falls back to HR's queue; the employee sees who will answer and when." },
        {
          when: "A question asks about a colleague ('sisa cuti Dedi berapa?')",
          then: "The lookup tool can only read the asker's own record. The answer says HR can help, and the question goes to the draft lane.",
        },
        { when: "A sensitive question scores just under the floor", then: "Since the incident below, no draft is generated above a sensitivity of 0.1: HR gets the question alone." },
      ],
      errorLog: [
        {
          said: "Maternity leave: 3 months, unpaid after the first month (the pilot)",
          truth: "3 months on full pay, as the law and this client's handbook both say",
          why: "Answered from a forum post the model half-remembered, not the handbook",
          fix: "Answers come only from retrieved sections and must cite one. Legal keeps a short list of legal minimums (leave, pay, THR): an answer or a handbook section below one goes to HR, never out",
        },
        {
          said: "'Saya mau resign, gimana caranya?' → routine",
          truth: "Resignation goes to HR",
          why: "The keyword router matched 'gimana caranya'",
          fix: "The classifier, with resignation in the HR lane",
        },
        {
          said: "'Atasan saya suka marah-marah, wajar nggak?' → draft",
          truth: "A complaint about a manager: sensitive",
          why: "Polite phrasing lowered the topic score",
          fix: "A separate sensitivity score with its own threshold, and three times the examples",
        },
        { said: "Payday is the 25th", truth: "The handbook was updated: the 28th", why: "The old handbook was still indexed", fix: "Re-index on upload, and the section-ID check" },
      ],
      incident: {
        title: "Three complaints drafted by the model (May 2025)",
        what: "In the first month, three complaints phrased as policy questions ('Is it normal that my supervisor…?') scored just under the sensitivity floor and went to the draft lane. Claude wrote a draft for each from the scrubbed text. HR saw them in the queue and answered in person; nothing was sent automatically.",
        impact: "Each employee got a reply from a person, but their questions reached the model, which the sensitive lane promises won't happen.",
        changed: [
          "No draft is generated when the sensitivity score is above 0.1: HR gets the question alone",
          "The three questions and 40 paraphrases joined the dev split, and the floor was re-tuned there",
          "Legal reviews every misroute within a day, and the employee is told who read their question",
        ],
      },
      monitoring: {
        watch: ["Share of questions per lane, per client, per day", "Handbook uploads, and answers citing sections that changed", "Model latency and errors, and the queue's oldest waiting draft"],
        fired:
          "In June 2025, a month into the rollout, the lane-share alert fired for one client: 30% of questions suddenly went to 'unsure'. They had uploaded a scanned handbook with no text layer. We added a text-layer check on upload the same day.",
      },
      code: {
        file: "router/lane.py",
        lang: "python",
        caption: "Routing is the safety feature, so it's boring on purpose: a hard list, two thresholds, and no model output at all in the sensitive lane.",
        source: `# Simplified reconstruction for this write-up (the real file is under NDA); thresholds rounded.
SENSITIVE = {"harassment", "health", "complaint_about_manager", "termination", "salary_dispute"}
ROUTINE = {"leave_balance", "payslip_date", "holidays", "attendance", "bpjs", "reimbursement_rules"}

MIN_CONFIDENCE = 0.35   # below this a person decides
SENSITIVE_FLOOR = 0.20  # tuned on the dev split (catches all 195 there); held out: 95 of 96
NO_DRAFT_ABOVE = 0.10   # added after the May 2025 incident: HR gets the question, the model doesn't

def lane(question: str, client: Client) -> Lane:
    topic, confidence, sensitivity = classifier.predict(scrub(question))

    # Any hint of a sensitive topic wins, even over a confident routine label.
    if topic in SENSITIVE or sensitivity >= SENSITIVE_FLOOR:
        return Lane.PERSON

    if sensitivity >= NO_DRAFT_ABOVE:
        return Lane.HR_ONLY  # a person answers, and no model sees the text

    if confidence < MIN_CONFIDENCE or topic not in client.auto_topics:
        return Lane.HR_DRAFT

    return Lane.AUTO if topic in ROUTINE else Lane.HR_DRAFT`,
      },
    },
    beforeAfter: {
      before: {
        title: "Before: the same twenty questions, by hand",
        points: ["4-hour median first reply", "Half of HR's week on routine answers", "A paused chatbot nobody trusted"],
      },
      after: {
        title: "After: three lanes",
        points: ["Routine answers in seconds, with the policy section", "Drafts HR decides on, then replies to", "Sensitive questions only ever reach a person"],
      },
    },
    results: {
      metrics: [
        {
          value: "38 min",
          label: "median first reply across all questions, down from 4 hours (routine ones take seconds)",
          how: "Ticket timestamps for the first 12 clients, 8 weeks before and 8 weeks after each one's launch",
        },
        {
          value: "18%",
          label: "of drafts edited by HR before sending, down from 37% in month 1",
          how: "Queue logs. A falling edit rate can also mean rubber-stamping, so we planted 15 wrong drafts over three months: HR caught 14",
        },
        {
          value: "0",
          label: "sensitive questions answered automatically",
          how: "Every misroute reviewed weekly by Legal. 3 reached the draft lane in month 1, so the model saw them; see the incident above",
        },
        {
          value: "1.0%",
          label: "of automatic answers wrong in month 3 (4 of 400), down from 2.8% (11 of 400) in month 1",
          how: "The four weekly audits of each month, 100 random answers each, against the current handbook. At this size the drop is suggestive, not proven (p ≈ 0.1); most errors came from handbooks changed without notice",
        },
      ],
      body: [
        "HR teams saved roughly 300 hours a month across the 40 clients, most of it at the 12 largest; at a small client it was one or two hours a week. The 'handbook changed' alert, added after the first audit, did more for accuracy than any model change.",
      ],
      quote: {
        text: "The easy questions answer themselves now, with the page they came from. I spend my mornings on the ones that need me.",
        who: "HR admin at a retail client",
      },
      business:
        "Two clients renewed early and named Ask HR in the call, and it moved into the standard plan in Q3 2025. HR teams saved roughly 300 hours a month across the 40 clients: questions answered automatically, times the 6 minutes HR said each one took.",
    },
    reflection:
      "Most of the engineering was deciding what the AI wasn't allowed to do, and making that boring and testable: a router with a hard list, a check in code, an audit every week. As an intern, my most useful work wasn't a feature. It was the harness that turned an argument into numbers.",
    next: "The source paragraph inline, now that the tap-through rate shows people want it.",
  },
  {
    slug: "catat",
    index: "03",
    name: "Catat",
    year: "2024",
    kind: "Voice bookkeeping on WhatsApp",
    tone: "cobalt",
    rarity: "Rare",
    tagline: "Small shop owners log what they'd otherwise forget (credit sales, payments, restocks, the day's takings) by sending WhatsApp voice notes, slang included.",
    prompt: "I sell two hundred things a day and I write nothing down. I don't even know who owes me. Can I just tell my phone?",
    promptBy: "Warung owner, Bekasi Timur",
    summary:
      "Catat (Indonesian for 'write it down') lets warung owners log the things they'd otherwise forget, credit sales, payments, restocks and the day's takings, by sending WhatsApp voice notes in everyday Indonesian. It answers in one line, asks when it isn't sure, and sends a summary every Sunday.",
    tldr: {
      problem: "Warung owners serve a queue with one free hand. Every bookkeeping app we met in the field had been abandoned within a week.",
      did: "With two classmates, in our campus incubator. I built the WhatsApp agent: speech-to-text tuned on warung audio, a slang normaliser, money parsed in code, and every write undoable in one tap. I also designed the conversation around it.",
      outcome: "140 shops in an 8-week pilot. 87% of voice notes logged fully correctly in a hand check of 300 pilot notes, and 83% of shops still logging on most days in the last week.",
    },
    role: {
      title: "Co-founder: engineering and conversation design",
      summary:
        "We were three classmates in our campus incubator. I built the WhatsApp agent end to end (speech-to-text, the slang normaliser, the ledger tools, undo) and designed the conversation. Dita designed the brand, the onboarding cards and the small dashboard; Raka ran recruitment and half of the field visits. We made product calls together, and argued about most of them.",
      decisions: [
        "Kept the whole product inside WhatsApp, after our web-app prototype got four logins in two weeks.",
        "Parsed money in code, not with the model: the model only points at the amount, and a parser built on our slang dictionary turns it into a number.",
        "Made every write reversible: the agent's tool calls create pending entries that ✓ confirms and ✗ removes.",
      ],
      with: [
        { who: "Dita, co-founder and visual designer", part: "Brand, onboarding cards, the web dashboard; we critiqued each other's work twice a week" },
        { who: "Raka, co-founder and field researcher", part: "Recruited the 27 shops for field visits, ran half of them, and labelled the eval notes with me" },
        { who: "A Bekasi cooperative", part: "Introduced us to owners, and now runs the pilot" },
      ],
    },
    team: "Three co-founders: me, a visual designer, a field researcher",
    ownership: "Co-founded",
    context: "Co-founded, team of 3",
    timeline: "16 weeks · campus incubator, Sep – Dec 2024",
    status:
      "After the incubator, a Bekasi cooperative took over the pilot with Dita and Raka. None of us could run it full-time and the cooperative could. I handed over the agent and stay on call for fixes.",
    stack: ["TypeScript", "WhatsApp Cloud API", "Whisper (fine-tuned)", "Claude tool use", "PostgreSQL", "Figma"],
    links: { live: "https://example.com/catat", repo: "https://github.com/example/catat" },
    evidence: [
      { label: "Code", href: "https://github.com/example/catat", note: "The agent, the normaliser and the money parser, with tests" },
      { label: "60-second demo", href: "https://example.com/catat-demo", note: "Unedited, in Indonesian, recorded in a pilot shop" },
      { label: "Pilot report", href: "https://example.com/catat-pilot.pdf", note: "What we gave the cooperative: numbers, failures, costs" },
    ],
    depth: "short",
    stats: [
      { label: "Shops", value: "140" },
      { label: "Correct, held out", value: "85%" },
      { label: "Active, last wk", value: "83%" },
    ],
    problem: {
      body: [
        "Warung (small neighbourhood shops) run on memory and goodwill. Owners know roughly what sells, but not what they earn, and customer debts live on scraps of paper.",
        "Bookkeeping apps exist. Nobody we met used one for more than a week: typing every sale with one hand while serving a queue doesn't work.",
      ],
      constraints: [
        "Must live inside WhatsApp, the one app every owner already uses",
        "Voice notes are noisy and full of slang: 'goceng' is Rp5.000, 'ceban' is Rp10.000",
        "Cheap Android phones and patchy data",
        "A mistake about someone's debt is personal: it has to be fixable in one tap",
      ],
    },
    research: {
      methods: [
        { label: "Field visits", detail: "27 warung, 3 hours each behind the counter, with Raka" },
        { label: "Copy tests", detail: "3 rounds of confirmation wording with 8 owners each, in their shops" },
        { label: "Pilot", detail: "140 shops for 8 weeks, plus exit calls with the 24 who had stopped or slowed down" },
      ],
      insights: [
        { title: "Hands are busy, mouths aren't", body: "Owners already talk while they serve: to customers, to family, to their phone. Voice notes cost them nothing." },
        {
          title: "Money has its own language",
          body: "Gopek, seceng, goceng, ceban, and a nickname for every brand. We built a dictionary of 312 terms before writing a single message, and it became code.",
        },
        { title: "Debts are about people, not numbers", body: "Owners didn't want a total. They wanted 'who owes me, and since when', said kindly." },
      ],
      ethics:
        "Consent forms were read aloud in Indonesian and signed before any recording. Voice notes are deleted after 30 days unless an owner opts in to help improve Catat; only opted-in notes were used for tuning and evals. Customers' names and debts are visible only to the owner. The cooperative sees only weekly totals, and only for owners who choose to share them. Transcripts are deleted 30 days after a shop stops using Catat.",
    },
    decisions: [
      {
        title: "Live in WhatsApp, not in an app",
        options: ["A bookkeeping web app", "A Telegram bot", "WhatsApp, with interactive reply buttons"],
        chose: "Everything happens in a WhatsApp chat. The dashboard exists, for the few who want it.",
        why: "The web prototype got four logins in two weeks. The WhatsApp prototype got 1,900 voice notes in the same two weeks.",
        cost: "WhatsApp allows three buttons and short messages, and its webhooks arrive twice now and then. Most of the design became writing; some of the engineering became deduplication.",
      },
      {
        title: "One line back, one tap to undo",
        options: ["A receipt with every field", "A single line, no buttons", "A single line with ✓ Benar and ✗ Batalkan"],
        chose: "Every entry comes back as one line in plain Indonesian, with ✓ to keep it and ✗ to undo it.",
        why: "Owners didn't read past line two of the receipt, so errors slipped through. The plain line was read, but fixing it meant typing. With the buttons, a fix takes one tap.",
        cost: "Less detail on screen. Price per item lives in the Sunday summary instead.",
      },
    ],
    iterations: [
      { name: "The receipt", finding: "3 of 8 owners never read past the second line. Two wrong amounts slipped through in one morning.", kept: false },
      { name: "One line, no buttons", finding: "Read every time, but owners couldn't fix a mistake without typing, so they didn't.", kept: false },
      { name: "One line, ✓ and ✗", finding: "Owners kept 91% of entries with ✓. Our hand check found 87% fully correct: the gap is errors nobody noticed.", kept: true },
    ],
    screens: [
      { key: "ct-sale", title: "Say it, done", caption: "A voice note becomes one line with ✓ Benar (correct) and ✗ Batalkan (undo)." },
      { key: "ct-ask", title: "Ask, don't guess", caption: "'Ceban, Bu Sri' could be a new debt or a payment. Catat asks one question." },
      { key: "ct-undo", title: "Undo in one tap", caption: "Three bottles were heard where the owner said two. One tap removes the entry, and it shows how to say it again." },
      { key: "ct-summary", title: "The Sunday summary", caption: "What the owner logged this week: takings noted, restocks, and who still owes. It says 'from your notes', because it isn't every sale." },
    ],
    process: [
      {
        stage: "Discover",
        title: "Sat behind the counter at 27 warung",
        body: "Recorded (with consent) how owners actually say numbers and items, and built a dictionary of 312 terms.",
        duration: "Weeks 1–3",
      },
      {
        stage: "Define",
        title: "Four actions, not forty",
        body: "Sell, restock, someone owes, someone pays. Four tools for the agent, and replies short enough to read at a glance.",
        duration: "Week 4",
      },
      { stage: "Build", title: "The agent, then the words", body: "Speech-to-text, normaliser and tools, while the confirmation copy was tested on paper cards in shops.", duration: "Weeks 4–8" },
      {
        stage: "Ship",
        title: "An 8-week pilot with 140 warung",
        body: "November and December 2024. The fine-tuned speech-to-text shipped in pilot week 4; the Sunday summary became the reason people kept using it.",
        duration: "Weeks 9–16",
      },
    ],
    deadEnd: {
      title: "The dashboard we designed first",
      body: "In the semester break before the incubator, Dita and I spent three weeks of evenings on a web dashboard. In the pilot it got 4% of usage. Most of that work was wasted, and it taught us to visit before we build.",
    },
    inclusion: [
      "Voice first works for owners who don't read much, and every reply is short enough for WhatsApp's read-aloud.",
      "Owners who can't or prefer not to speak can type the same way: 'indomie 2 goceng' works.",
      "Tested on a Rp 1.2 million Android phone with 2 GB of RAM, on 3G, in two kampung.",
      "We recruited through a cooperative, so owners who already trust institutions were over-represented. We added 8 shops found door to door to hear from the rest.",
    ],
    artifact: {
      title: "From the field notebook: how owners say money",
      clusters: [
        { label: "Amounts", notes: ["gopek = 500", "seceng = 1.000", "goceng = 5.000", "ceban = 10.000", "'dua lima' = 2.500? or 25.000?"] },
        { label: "Items", notes: ["'indomi' / 'mi goreng'", "'aqua gelas' = any cup water", "'rokok' + brand nickname"] },
        { label: "Debts", notes: ["'ngebon' = buy on credit", "Names, never numbers: 'Bu Sri yang depan'"] },
      ],
    },
    architecture: {
      nodes: [
        { id: "owner", label: "Shop owner", x: 10, y: 30, kind: "user" },
        { id: "wa", label: "WhatsApp", x: 28, y: 10, kind: "service" },
        { id: "stt", label: "Whisper", x: 47, y: 10, kind: "agent" },
        { id: "norm", label: "Slang rules", x: 66, y: 10, kind: "service" },
        { id: "agent", label: "Ledger agent", x: 66, y: 32, kind: "agent" },
        { id: "money", label: "Money parser", x: 88, y: 32, kind: "service" },
        { id: "pending", label: "Pending entry", x: 66, y: 54, kind: "data" },
        { id: "ledger", label: "Ledger", x: 88, y: 54, kind: "data" },
      ],
      edges: [
        ["owner", "wa"],
        ["wa", "stt"],
        ["stt", "norm"],
        ["norm", "agent"],
        ["agent", "money"],
        ["agent", "pending"],
        ["pending", "ledger"],
        ["agent", "wa"],
      ],
    },
    engineering: {
      summary:
        "An agent that writes to someone's books has to be undoable. Each voice note goes through speech-to-text tuned on warung audio, a slang normaliser, and a model with four tools. Money is parsed in code, and nothing counts in the totals until the owner confirms it.",
      pipeline: [
        { step: "Receive", detail: "WhatsApp Cloud API webhook. The message ID is stored first, so a webhook delivered twice is ignored." },
        {
          step: "Transcribe",
          detail:
            "Whisper large-v3, fine-tuned on 6 hours of consented warung audio that Raka and I transcribed, on a serverless GPU billed per second (incubator credits paid for it; a cold start adds about 6 seconds).",
        },
        {
          step: "Normalise",
          detail:
            "The 312-term dictionary rewrites 'goceng' and brand nicknames, and customers' names become placeholders ([PELANGGAN_1]) before the model sees the text; the real names stay in the shop's own ledger.",
        },
        { step: "Act", detail: "Claude with four tools: sale, restock, new debt, payment. Each call creates a pending entry, not a final one." },
        { step: "Ask or confirm", detail: "Ambiguous money or debts get one question with two buttons. Everything else gets one line with ✓ and ✗." },
        {
          step: "Commit",
          detail:
            "✓ confirms the entry, ✗ deletes it. Unanswered entries stay 'unconfirmed': out of the totals until the owner confirms them in the Sunday summary. Every entry keeps its transcript and who confirmed it; the audio itself is deleted after 30 days unless the owner opted in.",
        },
      ],
      models: [
        {
          task: "Speech-to-text",
          model: "Whisper large-v3, fine-tuned",
          why: "Off the shelf, the word error rate on our validation notes was 31%. After fine-tuning on 6 hours of warung audio, 14%, on shops it had never heard.",
          tried: "Two hosted Indonesian speech APIs: 24% and 27% on the same notes, with per-minute prices and audio leaving for a third party.",
        },
        {
          task: "Intent and tool calls",
          model: "Claude 3.5 Haiku with tool use",
          why: "Four tools and short inputs: a small model was accurate enough and kept replies under 4 seconds.",
          tried: "Claude 3.5 Sonnet: 1.3 points better on the validation notes, at twice the latency on 3G. Not worth it here.",
        },
        { task: "Amounts", model: "No model: a parser in code", why: "'Dua lima' can mean Rp2.500 or Rp25.000. That's a rule and a question, not a guess." },
      ],
      evals: {
        set: "Split by shop. Whisper was fine-tuned on 6 hours of audio from 62 opted-in shops (the field-visit shops and early pilot shops), and the 200-note dev set comes from them too. Validation: 300 notes from 40 other shops it never heard. Every release and every model choice was made on it, so it isn't a clean test. Test: 200 notes from 20 more shops, held back and scored once at the end of the pilot: v5 got 85% fully correct (about 79–89%). Raka and I both labelled the same 100 validation notes (Cohen's κ 0.81 on intent and amount), then split the rest: words, intent, item, amount and person.",
        gate: "Every change to the normaliser, the prompt or the model runs on the 300 validation notes; a release needs amounts exactly right in at least 95% of them (v5: 97.3%) and no rise in silent errors. The last step, v4 to v5, is 8 notes and within noise: we kept it for the debt mistakes it removed, not for the number.",
        caption: "What changed in each version, scored on the 300 validation notes (the held-out 200 were scored once, at the end)",
        series: [
          { name: "Fully correct entries", unit: "%", better: "up" },
          { name: "Word error rate", unit: "%", better: "down" },
        ],
        history: [
          { version: "v1", change: "Off-the-shelf Whisper and one prompt", values: [58.0, 31.0] },
          { version: "v2", change: "Slang dictionary before the model", values: [69.3, 31.0] },
          { version: "v3", change: "Fine-tuned Whisper", values: [79.7, 14.2] },
          { version: "v4", change: "Amounts parsed in code", values: [85.7, 14.2] },
          { version: "v5", change: "Ask on ambiguous money and debts", values: [88.3, 14.2] },
        ],
      },
      budgets: [
        { label: "Voice note to reply", value: "3.8 s p50", note: "7.9 s p95, on the pilot's real 3G and 4G" },
        { label: "Cost per note", value: "Rp 38", note: "about Rp 12 of GPU time (2–3 s on a serverless GPU) and Rp 26 for the model call (Claude 3.5 Haiku: ~1.5k tokens in, ~120 out)" },
        { label: "Pilot running cost", value: "Rp 1.9M", note: "8 weeks, about 31,000 notes: hosting, the GPU (from incubator credits) and WhatsApp's fees for the Sunday summaries" },
        { label: "Undo rate", value: "6%", note: "entries removed with ✗, mostly misheard amounts" },
      ],
      failures: [
        { when: "WhatsApp delivers a webhook twice", then: "The message ID is the idempotency key; the second delivery is ignored." },
        { when: "The note is noise, or just 'eh'", then: "Catat replies 'Maaf, belum kedengaran' (sorry, I didn't catch that) and logs nothing." },
        { when: "'Dua lima' could be Rp2.500 or Rp25.000", then: "If the product's usual price doesn't settle it, Catat asks with two buttons." },
        { when: "The owner never taps ✓ or ✗", then: "The entry stays 'unconfirmed': kept, but out of the totals until it's confirmed on Sunday." },
        { when: "The model call fails", then: "The note is queued and retried; the owner gets 'Sebentar ya' (one moment) instead of silence." },
      ],
      errorLog: [
        { said: "'Rokok sebungkus, dua lima' → Rp2.500", truth: "A pack costs Rp25.000", why: "The shorthand was read the small way", fix: "Check against the product's usual price, otherwise ask" },
        {
          said: "'Indomie dua, goceng sama dua rebu' → 2 × Rp5.000",
          truth: "Two packs for Rp7.000 in total",
          why: "'Sama' (plus) was read as 'each'",
          fix: "A normaliser rule: 'sama' between amounts means plus",
        },
        { said: "'Ceban, Bu Sri' → new debt", truth: "Bu Sri paid Rp10.000", why: "The direction of the money wasn't in the note", fix: "Ask on every debt note without 'bayar' or 'ngebon'" },
        { said: "'Aqua gelas sedus' → stock +1", truth: "One carton is 48 cups", why: "The unit 'dus' wasn't known", fix: "A units table per product, learned from restocks" },
      ],
      monitoring: {
        watch: ["Notes per shop per day: a shop that goes quiet gets a call from Raka", "Undo and unconfirmed rates per day, per kampung", "Webhook failures and transcription latency"],
        fired: "In week 3 of the pilot the undo rate jumped from 6% to 19% in one kampung: a new nickname for a cigarette brand. It was in the dictionary that evening.",
      },
      code: {
        file: "agent/money.ts",
        lang: "ts",
        caption: "Money is parsed in code, never by the model. The model only points at the phrase, and when the phrase is ambiguous, Catat asks.",
        source: `const SLANG = new Map([["gopek", 500], ["seceng", 1_000], ["goceng", 5_000], ["ceban", 10_000]]); // "gocap", "cepek": it depends, so we ask
const DIGIT: Record<string, number> = { se: 1, satu: 1, dua: 2, tiga: 3, empat: 4, lima: 5, enam: 6, tujuh: 7, delapan: 8, sembilan: 9 };
const SE: Record<string, string[]> = { sepuluh: ["se", "puluh"], sebelas: ["se", "belas"], seratus: ["se", "ratus"], seribu: ["se", "ribu"], sejuta: ["se", "juta"] };

/** "goceng" → 5000 · "lima belas ribu" → 15000 · "dua puluh lima rebu" → 25000 · "dua lima" → ask: 2500 or 25000? */
export function parseAmount(phrase: string, usualPrice?: number): Amount {
  const p = phrase.toLowerCase().replace(/\\b(rebu|rb)\\b/g, "ribu").trim();
  const slang = SLANG.get(p); // a Map, so "constructor" isn't a price
  if (slang) return { kind: "exact", value: slang };

  let total = 0, group = 0, digits = 0, shorthand = false;
  for (const w of p.split(/\\s+/).flatMap((w) => (Object.hasOwn(SE, w) ? SE[w] : [w]))) {
    if (Object.hasOwn(DIGIT, w)) {
      shorthand ||= digits > 0; // two digits in a row: "dua lima"
      digits = digits * 10 + DIGIT[w];
    } else if (w === "belas") [group, digits] = [group + digits + 10, 0];
    else if (w === "puluh") [group, digits] = [group + digits * 10, 0];
    else if (w === "ratus") [group, digits] = [group + digits * 100, 0];
    else if (w === "ribu" || w === "juta") [total, group, digits] = [total + (group + digits) * (w === "ribu" ? 1_000 : 1_000_000), 0, 0];
    else return { kind: "unknown" }; // not a number word: the model pointed at the wrong phrase
  }

  // "dua lima" on its own is warung shorthand: 2.500 for a snack, 25.000 for cigarettes.
  if (shorthand && total === 0 && group === 0) {
    const options = [digits * 100, digits * 1_000];
    const fit = usualPrice ? options.find((o) => Math.abs(o - usualPrice) / usualPrice < 0.3) : undefined;
    return fit ? { kind: "exact", value: fit } : { kind: "ask", options }; // ask, never guess
  }
  const value = total + group + digits;
  if (!value) return { kind: "unknown" };
  return value < 100 && total === 0 ? { kind: "ask", options: [value * 1_000] } : { kind: "exact", value }; // a bare "lima": Rp5.000? confirm
}`,
      },
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
        {
          value: "87%",
          label: "of voice notes logged fully correctly (261 of 300)",
          how: "A production audit, separate from the eval sets: Raka and I listened to 300 random pilot notes and checked the ledger (about 83–90%). Owners' ✓ said 91%; the 4-point gap is silent errors nobody caught, mostly item counts",
        },
        {
          value: "83%",
          label: "of shops still logging on most days in the last week of the pilot",
          how: "116 of 140 shops sent notes on at least 5 of the 7 days of week 8; a median of 6 notes a day. Owners log what they'd forget (credit, payments, restocks, the day's takings), not every sale",
        },
        { value: "1 in 12", label: "notes get a clarifying question", how: "Share of notes about money or debts where Catat asked instead of guessing" },
        { value: "62%", label: "of owners said they would pay Rp15k a month", how: "Stated intent from an exit survey of all 140 shops, not purchases" },
      ],
      body: [
        "Owners kept using it because it never asked them to change how they work. It learned their words instead of teaching them ours. Of the 24 shops that stopped, 11 had a family member handling the phone, so the next version supports a second number.",
      ],
      quote: {
        text: "Now I know which customer owes me, and since when. That alone paid for my phone credit.",
        who: "Warung owner, pilot participant",
      },
      business: "Pre-revenue. 62% said they'd pay Rp15k a month, which is intent, not money; the cooperative now offers it to its 400 member shops.",
    },
    reflection:
      "The best interface was almost no interface, and the best model call was the one I replaced with a parser. Most of the accuracy came from the dictionary and the rules around the model, not from the model.",
    next: "Support a second phone number per shop, and a monthly totals view owners can choose to show the cooperative for a loan: totals only, never customers' names or debts.",
  },
  {
    slug: "lintas",
    index: "04",
    name: "Lintas",
    year: "2024",
    kind: "Commute planner for Greater Jakarta",
    tone: "violet",
    rarity: "Uncommon",
    tagline: "One 'leave by' time for a commute across KRL, LRT, MRT and TransJakarta, replanned live with a one-line reason.",
    prompt: "KRL is packed again. When should I leave, and is there a better way to get to work today?",
    promptBy: "Commuter, Bekasi → Sudirman",
    summary:
      "Lintas plans door-to-door commutes across Greater Jakarta's trains and buses, shows how crowded each leg will be, and replans live when a line is delayed, with one sentence explaining why.",
    tldr: {
      problem: "When one leg of a Bekasi–Jakarta commute is late, the whole trip changes, and existing apps answer with a map or a wall of alerts.",
      did: "A side project for my own commute: a transit router, a crowding forecast from riders' one-tap reports, and a replan sentence written by a model but checked by code. The app is built around one number, 'leave by'.",
      outcome: "1.4k weekly riders at peak, all by word of mouth. Adding the one-line reason doubled how often riders took a replan (62% against 31%).",
    },
    role: {
      title: "Solo side project: design and engineering",
      summary: "A side project I designed and built alone in my second year, for my own commute, with a panel of twelve regular commuters who tested every version on their real morning trip.",
      decisions: [
        "Replaced the map-first home with a single 'leave by' time, after only 1 of the first 6 panel riders used the map.",
        "Wrote my own transit router (RAPTOR) instead of calling a maps API, because no API knew about crowding or the KRL's real delays.",
        "Let a model write the replan sentence, but only through a validator that checks every time and station against the plan, with a template as the fallback.",
      ],
      with: [
        { who: "12 regular commuters", part: "A standing test panel: every version, on their real trip, for four months" },
        { who: "Riders on the Bekasi line", part: "One-tap crowding reports, about 900 a month at peak, that the forecast is built on" },
      ],
    },
    team: "Solo, with a panel of 12 commuters",
    ownership: "Solo",
    context: "Side project",
    timeline: "4 months · side project, Mar – Jun 2024",
    status: "Open-sourced in 2025 and in maintenance: about 300 riders a week still use it (September 2026). I fix what breaks and keep the push alerts running.",
    stack: ["Python (FastAPI)", "RAPTOR routing", "Next.js (PWA)", "TypeScript", "Redis", "Web Push", "Claude API"],
    links: { live: "https://example.com/lintas", repo: "https://github.com/example/lintas" },
    evidence: [
      { label: "Code", href: "https://github.com/example/lintas", note: "Open source since 2025: the router, the validator, the PWA" },
      { label: "Live app", href: "https://example.com/lintas", note: "Still running; push alerts for the riders who use it" },
    ],
    depth: "short",
    stats: [
      { label: "Weekly riders, peak", value: "1.4k" },
      { label: "Replans taken, with reason", value: "62% vs 31%" },
      { label: "Server bill", value: "Rp 90k/mo" },
    ],
    problem: {
      body: [
        "A Bekasi to Jakarta commute can mix a KRL train, a transfer, the MRT and a bus. When one leg is delayed, the whole trip changes, and existing apps either show a static route or a wall of alerts.",
        "Commuters don't need more data. They need one decision: leave now, wait, or go another way.",
      ],
      constraints: [
        "Answers must arrive while you're walking to the station",
        "Schedule feeds are incomplete; crowding isn't published at all",
        "Installable, light on data, and cheap enough to run on a student budget",
      ],
    },
    research: {
      methods: [
        { label: "Ride-alongs", detail: "12 commuters, two morning trips each, from front door to desk" },
        { label: "Diary study", detail: "Two weeks of WhatsApp check-ins at departure and arrival" },
        { label: "A/B test", detail: "June 2024, after launch: replans with and without a one-line reason, about 600 riders randomised per rider, 1,800 replans over 3 weeks" },
      ],
      insights: [
        { title: "People decide at the front door", body: "The decision that matters is when to leave. By the platform, it's too late to change much." },
        { title: "Crowding beats speed", body: "Riders took a train 8 minutes slower to get a seat, but only if they knew the seat was likely." },
        { title: "Alerts without an action are noise", body: "Every rider had muted at least one transit app. A delay alert only helps if it says what to do instead." },
      ],
      ethics: "Crowding reports are anonymous and aggregated per carriage and hour. Location stays on the phone; the server only sees the stations you choose.",
    },
    decisions: [
      {
        title: "One number on the home screen",
        options: ["A map with the route", "Three route options to compare", "One 'leave by' time, details a swipe away"],
        chose: "The home screen is a single 'leave by' time with crowding per leg. Alternatives appear only when they're better.",
        why: "Only 1 of the first 6 panel riders used the map. With three options, riders took about 40 seconds to choose at the door. With one time, about 4.",
        cost: "Power users wanted the options back, so they live one swipe right.",
      },
      {
        title: "Push only when your plan changes",
        options: ["An alert for every delay on your lines", "A push only when the best plan changes"],
        chose: "Lintas stays silent unless the new plan is at least 5 minutes better or swaps 'packed' for 'seat likely', and then it says what to do.",
        why: "In the first version, 5 of the 12 panel riders muted the app within a week. After the change, none did.",
        cost: "Riders sometimes hear about a delay somewhere else first. I decided that's fine.",
      },
      {
        title: "Every replan comes with a reason",
        options: ["Just show the new plan", "The new plan, plus one sentence: what changed, what to do, what it costs"],
        chose: "Every replan includes one sentence under 25 words. A model writes it; code checks it; a template stands in when the check fails.",
        why: "In the A/B test, replans with a reason were taken twice as often (62% against 31%).",
        cost: "A model in the loop means a validator and a monthly check of 300 sentences. About 3% still fall back to the template.",
      },
    ],
    iterations: [
      { name: "Map first", finding: "1 of the first 6 panel riders used the map. 'I know where Manggarai is. I want to know when to leave.'", kept: false },
      { name: "Three options", finding: "Riders took about 40 seconds to choose, at the door, with shoes on.", kept: false },
      { name: "One 'leave by' time", finding: "A decision in about 4 seconds. 11 of the 12 panel riders asked to keep it.", kept: true },
    ],
    screens: [
      { key: "ln-home", title: "Leave by", caption: "One number, with crowding for each leg, labelled as well as coloured." },
      { key: "ln-replan", title: "A replan with a reason", caption: "What changed, what to do, what it costs, side by side with your plan." },
      { key: "ln-cars", title: "Which carriage", caption: "Crowding front to back, from riders' one-tap reports." },
      { key: "ln-calm", title: "Nothing better", caption: "When there's no faster option, it says so once and stays quiet." },
    ],
    process: [
      { stage: "Discover", title: "Rode along with twelve commuters", body: "Door to desk, twice each. The decision that mattered happened at the front door.", duration: "Month 1" },
      { stage: "Build", title: "A router and a crowding model", body: "RAPTOR over timetables I assembled myself, and an average of rider reports per carriage and hour.", duration: "Month 1–2" },
      { stage: "Design", title: "Map, then options, then one number", body: "Three home screens, each tested on the panel's real trips.", duration: "Month 2" },
      { stage: "Ship", title: "Opened it to everyone", body: "An installable web app with push, light enough for patchy data.", duration: "Month 3" },
      { stage: "Test", title: "A/B tested the replan reason", body: "1,800 replans to about 600 riders over three weeks, randomised per rider, with and without one sentence explaining why.", duration: "Month 4" },
    ],
    deadEnd: {
      title: "An alert for every delay",
      body: "The first version pushed every delay on your lines. Within a week, five of the twelve panel riders had muted it. Silence became a feature: now Lintas only speaks when your plan changes.",
    },
    inclusion: [
      "Crowding is labelled (Packed, Tight, Room to stand) and patterned, not just coloured.",
      "Women-only carriages are marked on every KRL train view, because riders asked for it.",
      "The 'leave by' time is the first thing a screen reader announces, and the dark UI meets 4.5:1 contrast.",
    ],
    artifact: {
      title: "From the ride-alongs: what riders checked, and when",
      clusters: [
        { label: "At the front door", notes: ["'Jam berapa harus jalan?'", "Checks 3 apps, then a WhatsApp group", "Decides in under a minute"] },
        { label: "On the platform", notes: ["Picks a carriage by habit", "Too late to change route"] },
        { label: "When it goes wrong", notes: ["Mutes alerts that don't say what to do", "Asks the group chat"] },
      ],
    },
    architecture: {
      nodes: [
        { id: "status", label: "Disruption notices", x: 12, y: 8, kind: "data" },
        { id: "sched", label: "Timetables", x: 12, y: 30, kind: "data" },
        { id: "reports", label: "Rider reports", x: 12, y: 52, kind: "user" },
        { id: "crowd", label: "Crowding", x: 34, y: 52, kind: "service" },
        { id: "router", label: "RAPTOR", x: 38, y: 30, kind: "service" },
        { id: "decide", label: "Replan rule", x: 60, y: 30, kind: "service" },
        { id: "writer", label: "Reason writer", x: 84, y: 8, kind: "agent" },
        { id: "validate", label: "Validator", x: 84, y: 30, kind: "service" },
        { id: "app", label: "PWA + push", x: 84, y: 52, kind: "ui" },
      ],
      edges: [
        ["status", "router"],
        ["sched", "router"],
        ["reports", "crowd"],
        ["crowd", "router"],
        ["router", "decide"],
        ["decide", "writer"],
        ["writer", "validate"],
        ["validate", "app"],
      ],
    },
    engineering: {
      summary:
        "A transit router, a crowding forecast built from riders' one-tap reports, and a replan sentence written by a model but checked by code. It all runs on one small server for about Rp 90k a month.",
      pipeline: [
        { step: "Timetables", detail: "Assembled for KRL, LRT Jabodebek, MRT and TransJakarta into one GTFS-style feed; operators only publish parts of it." },
        {
          step: "Delays",
          detail:
            "There's no public real-time feed, so two sources: operators' posted disruption notices, polled every 60 seconds, and riders' one-tap 'my train is late' reports. Two riders on the same train count as a delay.",
        },
        { step: "Crowding", detail: "One-tap reports averaged per carriage and hour, falling back to a timetable-based guess when reports are thin." },
        { step: "Route", detail: "RAPTOR, a round-based transit routing algorithm, in Python: every door-to-door option in about 30 ms." },
        { step: "Decide", detail: "A replan is pushed only if it's at least 5 minutes better or swaps 'packed' for 'seat likely'." },
        { step: "Explain", detail: "A model writes one sentence; a validator checks every number and station in it against the plan, or a template is sent instead. The error log's three sentences are its unit tests." },
      ],
      models: [
        { task: "The replan sentence", model: "Claude 3 Haiku", why: "It writes friendlier Indonesian than my template did, and the validator keeps it honest." },
        { task: "Routing and crowding", model: "No model: RAPTOR and averages", why: "Fast, predictable and explainable. The panel cared about being right, not about clever forecasts." },
      ],
      evals: {
        set: "Each month, 300 generated sentences checked by hand against the plan they describe: times and stations must match, under 25 words, and it must say what changed, what to do and what it costs.",
        gate: "The validator runs on every sentence in production; anything that fails it falls back to the template. The monthly sample measures how often that happens, and anything the validator missed.",
        series: [
          { name: "Sentences passing the validator", unit: "%", better: "up" },
          { name: "Wrong time or station, by hand", unit: "%", better: "down" },
        ],
        history: [
          { version: "v1", change: "Prompt with the plan as prose", values: [81.0, 6.3] },
          { version: "v2", change: "Plan passed as JSON", values: [92.3, 2.0] },
          { version: "v3", change: "12 panel-approved examples", values: [96.7, 0.7] },
          { version: "v4", change: "Validator and template in production", values: [96.7, 0] },
        ],
      },
      budgets: [
        { label: "Delay to push", value: "42 s p50", note: "95 s p95, from the operator's post to the rider's phone" },
        { label: "Route search", value: "30 ms", note: "RAPTOR over about 1,900 stops" },
        { label: "Cost per sentence", value: "Rp 3", note: "Claude 3 Haiku at 2024 prices: the 12 examples (2.1k tokens) cached, the plan (~300 tokens) and the sentence (~45 out) not. Rp 10 uncached" },
        { label: "Server bill", value: "Rp 90k/mo", note: "one small VPS, Redis and web push" },
      ],
      failures: [
        { when: "An operator changes how it posts disruptions", then: "The parser fails closed: replans for that line run on rider reports alone, marked 'reported by riders', and I get an alert." },
        { when: "A generated sentence gets a time or station wrong", then: "The validator rejects it and the template sentence goes out instead." },
        { when: "Too few crowding reports for a train", then: "The forecast falls back to the timetable guess and says 'likely', never 'certain'." },
        { when: "The phone is offline", then: "The last plan stays on screen with the time it was worked out." },
      ],
      errorLog: [
        { said: "Leave at 07:10", truth: "The plan says 07:01", why: "Digits swapped when the plan was passed as prose", fix: "Plan passed as JSON; times checked against it" },
        { said: "Switch at Manggarai", truth: "The plan switches at Jatinegara", why: "The model 'knew' the usual transfer", fix: "Every station in the sentence must be in the plan" },
        { said: "You'll save 15 minutes", truth: "It saves 12", why: "It repeated the delay instead of the saving", fix: "Examples with both numbers; the saving is checked" },
      ],
      monitoring: {
        watch: ["Disruption-notice parser failures, per operator", "Push delivery rate", "How often the validator falls back to the template"],
        fired:
          "In November 2024 KRL changed how it posts disruption notices. The parser failed closed, the alert fired at 05:40, and replans for that line ran on rider reports alone for three hours while I fixed it before the morning rush peaked.",
      },
      code: {
        file: "lintas/reason.py",
        lang: "python",
        caption: "The model writes the sentence; code decides whether a rider ever sees it.",
        source: `MAX_WORDS = 25
TIME = re.compile(r"\\b(\\d{1,2})[.:](\\d{2})\\b")                       # "7.10" and "07:10" are the same time
MINUTES = re.compile(r"\\b(\\d+)\\s*min\\w*\\s+(late|sooner|earlier|faster)")  # minutes, with their role
RUPIAH = re.compile(r"\\bRp\\s?(\\d+)\\s?(k|rb|ribu)?\\b", re.I)

def problems(sentence: str, plan: Replan) -> list[str]:
    """What's wrong with a generated replan sentence. An empty list means it's safe to send."""
    found = []
    if len(sentence.split()) > MAX_WORDS:
        found.append("too_long")

    # Every number is the plan's own, in its own role: a time is one the plan has, "late" is the
    # delay, "sooner" is the saving, rupiah is the extra cost. Exact matches, never substrings.
    for h, m in TIME.findall(sentence):
        if f"{int(h):02d}:{m}" not in plan.times():
            found.append(f"unknown_time:{h}:{m}")
    for n, role in MINUTES.findall(sentence):
        if int(n) != (plan.delay_minutes if role == "late" else plan.minutes_saved):
            found.append(f"wrong_minutes:{n}_{role}")
    for n, unit in RUPIAH.findall(sentence):
        if int(n) * (1_000 if unit else 1) != plan.extra_cost:
            found.append(f"wrong_cost:{n}{unit}")
    for station in STATIONS.find_all(sentence):
        if station not in plan.stations():
            found.append(f"unknown_station:{station}")

    if plan.minutes_saved and not any(role != "late" for _, role in MINUTES.findall(sentence)):
        found.append("missing_saving")  # riders need to know what switching buys them
    return found

def reason(plan: Replan) -> str:
    sentence = write_with_model(plan.as_json())
    return sentence if not problems(sentence, plan) else template(plan)`,
      },
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
        {
          value: "1.4k",
          label: "weekly riders at peak, all by word of mouth",
          how: "Devices that opened a plan that week (a push alone doesn't count), from anonymous device IDs, October 2024; no paid promotion",
        },
        {
          value: "62%",
          label: "of replans taken when they came with a reason, against 31% without",
          how: "A/B test in June 2024, after launch: about 600 riders randomised per rider, 1,800 replans over 3 weeks. Compared rider by rider, so a few heavy users can't carry it",
        },
        { value: "0 of 12", label: "panel riders muted it after the quiet-push change", how: "Down from 5 of 12 with the alert-for-everything version" },
        { value: "38 min", label: "saved per rider per week", how: "Self-reported median from a survey of 212 riders; treat it as a feeling, not a fact" },
      ],
      body: ["Riders came for the crowding bar and stayed for the replans. The one-sentence reason doubled how often people actually took the suggested alternative."],
      quote: {
        text: "It told me to take the earlier train from the next station over, and why. I sat down for the first time in months.",
        who: "Rider, Bekasi line",
      },
      business: "No revenue, and it was never meant to make any. It costs about Rp 90k a month to run, and it taught me routing, push and evals on a real audience.",
    },
    reflection:
      "A prediction without a reason is just a notification. Adding 'why' to every replan changed behaviour more than any accuracy gain did, and putting code between the model and the rider is what made the 'why' safe to send.",
    next: "Let riders tell Lintas what they care about most (a seat, or speed) and plan around it.",
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

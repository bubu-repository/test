/**
 * The four case studies: three products of her own and one in-house feature (under NDA).
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

export type Metric = {
  value: string;
  label: string;
  /** How it was measured, in one line. */
  how: string;
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
  timeline: string;
  stack: string[];
  /** Own products have a live link and code; in-house work under NDA has neither. */
  links: { live?: string; repo?: string };
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
  process: { stage: string; title: string; body: string; duration: string }[];
  /** Something that didn't work, and what it changed. */
  deadEnd: { title: string; body: string };
  /** Who could be left out, and what the design does about it (accessibility, devices, sampling). */
  inclusion: string[];
  /** A raw research artefact: the affinity map from the first round of research. */
  artifact: { title: string; clusters: { label: string; notes: string[] }[] };
  architecture: { nodes: ArchNode[]; edges: [string, string][] };
  beforeAfter: {
    before: { title: string; points: string[] };
    after: { title: string; points: string[] };
  };
  results: {
    metrics: Metric[];
    body: string[];
    quote: { text: string; who: string };
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
    year: "2025",
    kind: "AI brief for public tenders",
    tone: "magenta",
    rarity: "Holo rare",
    tagline: "Turns a 214-page government tender into one page a small contractor can decide on, with every claim cited.",
    prompt: "Our bid team spends three hours reading every tender package. Can something tell us in five minutes whether we should even bid?",
    promptBy: "Operations lead, 12-person construction firm in Bekasi",
    summary:
      "Tenderlens reads tender packages from public procurement portals and turns each one into a one-page brief: a bid / no-bid score, the three reasons behind it, and a link from every reason to the page it came from.",
    tldr: {
      problem: "Small contractors spend 3 hours reading each 200-page tender, mostly to learn they never qualified.",
      did: "I designed a one-page brief where the score is never shown without its reasons, every reason links to its page, and the AI says 'I can't tell' instead of guessing.",
      outcome: "11 minutes per tender, 31 of 38 beta teams still using it weekly after 3 months, 12 teams pre-paying.",
    },
    role: {
      title: "Founder and sole designer",
      summary:
        "I started Tenderlens and was its only designer: research, the brief and every screen, the trust and error states, the usability tests and the front end. Fajar, a freelance engineer, built the PDF parser; I built the app and the extraction agent. Bu Ratna, a former procurement officer, advised on the rules and labelled the test set with me.",
      decisions: [
        "Made 'score plus three cited reasons' the unit of the product, after a score on its own failed with every tester.",
        "Designed an explicit 'Can't tell yet' state, and set the threshold so the AI abstains rather than risk a wrong 'you qualify'.",
        "Put a 'That's wrong' button on every reason and routed it into the test set, so users improve the product instead of just losing trust in it.",
      ],
      with: [
        { who: "Bu Ratna, former procurement officer", part: "Domain rules; labelled the 240-field test set with me (94% agreement)" },
        { who: "Fajar, freelance engineer (6 weeks)", part: "The PDF parser and OCR" },
        { who: "9 bid teams", part: "Shadowing, three rounds of usability tests, the closed beta" },
      ],
    },
    team: "Me, a domain advisor and a freelance engineer",
    timeline: "10 weeks · 2025",
    status: "Handed over in mid-2025 to Bu Ratna's procurement consultancy, which runs it for 31 teams. I advise two hours a month.",
    stack: ["Figma", "Next.js", "TypeScript", "PostgreSQL", "pgvector", "Claude API", "Playwright"],
    links: { live: "https://example.com/tenderlens", repo: "https://github.com/example/tenderlens" },
    stats: [
      { label: "Read time", value: "3h → 11m" },
      { label: "Still weekly", value: "31/38" },
      { label: "Pre-paying", value: "12 teams" },
    ],
    problem: {
      body: [
        "Indonesian public tenders arrive as long PDF bundles: legal boilerplate, scanned forms, technical specs and a price schedule, often 150 to 250 pages. Small contractors can't afford a bid team, so the owner reads them at night.",
        "Most tenders are a 'no' for them. The cost isn't the tenders they lose, it's the hours spent finding out they never qualified.",
      ],
      constraints: [
        "A wrong 'you qualify' is worse than no answer: a disqualified bid wastes days of work and a bank guarantee",
        "Formal legal Indonesian, mixed with scanned tables",
        "Read on phones, between site visits",
        "Deadlines are days, not weeks",
      ],
    },
    research: {
      methods: [
        { label: "Shadowing", detail: "9 bid teams, 2 hours each, plus 2 full tender readings timed end to end" },
        { label: "Usability tests", detail: "3 rounds × 5 people, paper then clickable, then coded with real tenders" },
        { label: "Beta diary", detail: "38 teams for 12 weeks, a feedback button on every reason" },
      ],
      insights: [
        { title: "Everyone reads in the same order", body: "Eligibility first, then scope, then money. Nobody started at page 1. That order became the brief." },
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
        why: "In round two, all five testers saw the big score and none of them trusted it ('why 82?'). With reasons, all five decided in under two minutes, and four tapped a page to check.",
        cost: "Less room on the screen, so 'money' details moved one tap down. Nobody missed them in testing.",
      },
      {
        title: "Abstain instead of guessing",
        options: ["Always show a score", "Show a score with a confidence percentage", "Say 'Can't tell yet', why, and who can check"],
        chose: "When a key page is unreadable or a rule is ambiguous, the brief shows 'Can't tell yet', names the page, and offers to send it to a person on the team.",
        why: "Testers ignored confidence percentages ('70% is basically yes'). A clear 'I won't guess' was read correctly every time.",
        cost: "9% of briefs abstain, so some owners still open the PDF. Without abstaining, 16 of 240 eligibility calls wrongly said 'you qualify'; with it, 5 do.",
        table: {
          caption: "Each setting run on the same 60 tenders: 240 eligibility calls that Bu Ratna and I labelled by hand.",
          head: ["Setting", "Briefs that abstain", "Wrongly said 'you qualify'"],
          rows: [
            ["Always give a score", "0%", "6.7% (16)"],
            ["Abstain on unreadable pages", "5%", "3.8% (9)"],
            ["Abstain on unreadable pages or clauses that conflict", "9%", "2.1% (5)"],
            ["Abstain below a 0.9 match", "17%", "1.7% (4)"],
          ],
          chosen: 2,
        },
      },
      {
        title: "Make disagreeing a feature",
        options: ["A thumbs down on the whole brief", "A 'That's wrong' on each reason, with three quick causes"],
        chose: "Every reason has 'That's wrong'. Picking a cause takes one tap, and the correction goes into the test set after Bu Ratna reviews it.",
        why: "Owners argued with the score anyway. Giving them a place to do it turned arguments into 118 corrections that raised field accuracy from 88% to 94%.",
        cost: "A review queue I have to keep up with: about 20 minutes a week.",
      },
    ],
    iterations: [
      { name: "Summary first", finding: "2 of 5 testers found the score at the bottom. Everyone else gave up halfway through the summary.", kept: false },
      { name: "Big score", finding: "5 of 5 saw it in a second. 0 of 5 trusted it: 'Why 82? Who says?'", kept: false },
      { name: "Score + 3 cited reasons", finding: "5 of 5 decided in under 2 minutes. 4 of 5 tapped a page chip to check a claim first.", kept: true },
    ],
    screens: [
      { key: "tl-brief", title: "The brief", caption: "One page per tender. The score never appears without its reasons." },
      { key: "tl-source", title: "Show the receipts", caption: "Tap a page chip: the source page opens with the sentence highlighted, next to the claim. Here it shows a misread 3%." },
      { key: "tl-unsure", title: "Can't tell yet", caption: "A different tender, with a blurry scan: it says so, names the page, and offers a person." },
      { key: "tl-disagree", title: "That's wrong", caption: "One tap to say why. Reviewed corrections go into the test set." },
    ],
    process: [
      {
        stage: "Discover",
        title: "Shadowed nine bid teams",
        body: "Watched how people actually read a tender. Everyone looked for the same three things first: eligibility, scope, and money.",
        duration: "Week 1–2",
      },
      { stage: "Define", title: "Framed it as one decision", body: "'Should we bid?' became the only question the first screen answers. Everything else moved behind it.", duration: "Week 2" },
      {
        stage: "Design",
        title: "Three rounds on the brief",
        body: "Paper, then clickable, then coded with real tenders. The score-only layout failed; the cited-reasons layout won.",
        duration: "Week 3–6",
      },
      {
        stage: "Test",
        title: "Tested the failures, not just the happy path",
        body: "Blurry scans, contradictory clauses, a misread number. Each became a designed state with its own words.",
        duration: "Week 6–9",
      },
      { stage: "Ship", title: "Closed beta with 38 teams", body: "A morning digest on WhatsApp and email, a brief per tender, and 'That's wrong' on every reason.", duration: "Week 10" },
    ],
    deadEnd: {
      title: "Auto-filling the bid documents",
      body: "Owners asked for it and I prototyped it in week 7. In testing, two owners signed a pre-filled form without reading it. I dropped it: a tool that makes people stop reading legal documents is the opposite of this product.",
    },
    inclusion: [
      "Verdicts are words and icons, never colour alone: Bid, Check, No.",
      "Page chips are 44 px tap targets, and the brief reads in order with TalkBack: verdict, reasons, money.",
      "Tested at 200% text size on a Rp 2 million Android phone, the kind most owners carry.",
      "Owners who read slowly can have the brief read aloud; the reasons were written to make sense heard, not just seen.",
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
        {
          value: "11 min",
          label: "median read time per tender, down from about 3 hours",
          how: "Timed on 46 tenders with 8 teams. Baseline: owners' own estimate, confirmed by timing 2 full readings (2 h 40 and 3 h 20)",
        },
        { value: "31 / 38", label: "beta teams still using it weekly after 3 months", how: "Product analytics, weekly active teams, month 3" },
        {
          value: "2.1%",
          label: "of eligibility calls wrongly said 'you qualify'",
          how: "5 of 240 eligibility fields from 60 tenders, labelled by Bu Ratna and me (94% agreement). The automatic citation check flagged all 5 before they reached users",
        },
        { value: "12", label: "teams pre-paid for the paid plan before it existed", how: "Rp 450k per month, collected in week 12 of the beta" },
      ],
      body: [
        "Beta teams now skim every relevant tender instead of the two or three they had time for, and they bid on 2.4 times as many. Seven tenders were won during the beta; owners say three of them they would have skipped.",
      ],
      quote: {
        text: "I stopped printing tenders. If the score says no, I open the page it cites, and I agree or I don't. Five minutes.",
        who: "Owner, civil works contractor (beta user)",
      },
    },
    reflection:
      "The citation rule was the product. Accuracy got people to try it, but trust only arrived when every line could be checked in one tap, and when the product was willing to say 'I can't tell'.",
    next: "Let teams write their own eligibility rules in plain Indonesian, and show which rule decided each score.",
  },
  {
    slug: "ask-hr",
    index: "02",
    name: "Ask HR",
    year: "2023",
    kind: "AI answers inside an HR app (in-house)",
    tone: "sun",
    rarity: "Rare",
    tagline: "Employees ask HR questions in the app: routine ones get an answer with its policy section, the rest go to HR as drafts, and sensitive ones go straight to a person.",
    prompt: "Half my week goes on answering the same twenty questions about leave and payslips. Can the app answer them for me?",
    promptBy: "HR manager at a client company, 1,200 employees",
    summary:
      "Ask HR lets employees ask HR questions inside the company's HR app. Routine topics get an automatic answer from the company's own policy, with the section it came from. Everything else becomes a draft that HR approves. Anything sensitive skips the AI and goes to a person.",
    tldr: {
      problem:
        "HR teams at our 40 client companies spent up to half their week on the same questions, and leadership wanted a chatbot to answer everything. Its pilot gave three wrong policy answers in a week.",
      did: "I led design in a squad of seven. I turned 'answer everything' into three lanes (answer with a source, draft for HR, never AI for sensitive topics) and designed the review queue HR uses to approve drafts.",
      outcome: "Routine questions answered in a median 9 minutes instead of 4 hours, HR edits 18% of drafts (down from 41%), and no sensitive question has been answered by the AI.",
    },
    role: {
      title: "Product designer, design lead for the feature",
      summary:
        "I was one of three product designers at a Series A HR software startup in Jakarta, embedded in a squad with a product manager, four engineers and a data scientist. I led design for Ask HR from discovery to launch, ran the research with the PM, and built its components into our design system with two engineers. Our design lead critiqued the work every week.",
      decisions: [
        "Proposed the three-lane model and won it against the plan to auto-answer everything, using the pilot's own errors.",
        "Designed the HR review queue: the question, the draft, its source, why it's in the queue, and approve or edit in one tap.",
        "Lost the argument for showing the source paragraph inline: we shipped the section title only, and I wrote down what we'd measure to revisit it.",
      ],
      with: [
        { who: "Nadia, product manager", part: "Owned the roadmap and pricing. We ran discovery together and co-wrote the launch plan" },
        { who: "Four engineers and a data scientist", part: "Built the answer pipeline and the test set. I paired with the front-end engineers on the review queue" },
        { who: "Legal, and the HR leads of two pilot clients", part: "Defined the sensitive-topics list and signed off on what the AI may answer" },
        { who: "Arif, design lead", part: "Weekly critique. He pushed me to cut the confidence score" },
      ],
    },
    team: "Squad of 7: PM, 4 engineers, a data scientist and me",
    timeline: "5 months · 2023",
    stack: ["Figma", "Our design system (React)", "Maze", "Amplitude"],
    links: {},
    company: "Series A HR software startup, Jakarta (name under NDA). Screens redrawn from the shipped design, with client data removed.",
    status: "Launched to all 40 clients in late 2023 and still running. I left in 2024 to work independently; the squad kept the design.",
    stats: [
      { label: "First reply", value: "4h → 9m" },
      { label: "Drafts edited", value: "41→18%" },
      { label: "Employees", value: "12k" },
    ],
    problem: {
      body: [
        "Our HR app served 40 client companies and about 12,000 employees. HR teams told us they spent up to half their week answering the same questions: leave balances, payslip dates, reimbursement rules.",
        "Leadership's plan was a chatbot that answered everything. In its pilot week it gave three wrong policy answers, one about maternity leave. The pilot was paused, and the problem came to my squad.",
      ],
      constraints: [
        "A wrong answer about pay or leave is a legal and trust problem for our client, not just for us",
        "Every client has its own handbook, in Indonesian, updated without telling us",
        "Most clients have an HR team of one or two",
        "Employees use the app on their phones, often between shifts",
      ],
    },
    research: {
      methods: [
        { label: "Question audit", detail: "1,200 anonymised past questions from 6 clients, sorted into 31 topics with the PM" },
        { label: "Interviews", detail: "14 HR admins and 10 employees, in Indonesian, remote and on site" },
        { label: "Usability tests", detail: "3 rounds with 6 HR admins and 8 employees, on the queue and the answers" },
      ],
      insights: [
        {
          title: "Six topics were most of the work",
          body: "Leave balance, payslip dates, reimbursement, holidays, attendance and BPJS made up 58% of questions, and their answers were in the handbook word for word.",
        },
        {
          title: "HR wanted to stay the author",
          body: "Admins didn't fear the AI being slow. They feared an employee screenshotting a wrong answer 'from HR'. They wanted to approve anything that spoke for them.",
        },
        { title: "Some questions aren't questions", body: "About 4% were complaints, harassment reports or health disclosures phrased as questions. Those must never get an automatic reply." },
      ],
      ethics:
        "Clients consented to the question audit, and we removed names and ID numbers before anyone read a question. Employees are told when an answer came from the AI, and every client can switch the feature off. Legal reviewed the sensitive-topics list.",
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
        why: "The pilot showed a chatbot was too risky, and approving everything would have buried a one-person HR team. The six topics covered 58% of questions and had exact answers in the handbook.",
        cost: "Leadership wanted a bigger number. We launched with 41% of questions answered automatically instead of 'all of them'. I took the pilot's real errors to the CEO to get there.",
      },
      {
        title: "A queue HR can clear over coffee",
        options: ["Drafts inside the existing ticket inbox", "A separate queue: one draft per card with the question, the draft, its source, why it's here, approve or edit"],
        chose: "A separate review queue, built from existing design-system parts.",
        why: "With drafts in the inbox, admins opened every ticket to find them: 31 minutes for 20 questions. In the queue, 6 of 6 admins cleared 20 drafts in under 9 minutes.",
        cost: "Another screen to maintain. Building it from the design system kept it to two weeks of front-end work.",
      },
      {
        title: "Show the source, even if only its title",
        options: ["The source paragraph, inline in the answer", "The policy section title, linking to the handbook"],
        chose: "We shipped the section title and a link. I argued for the paragraph and lost.",
        why: "Splitting 40 handbooks into reliable paragraphs would have added six weeks. Nadia and I agreed to ship titles and measure how often people still asked 'why?'.",
        cost: "1 in 9 employees still taps through to the handbook. That number is now the case for the paragraph view on next year's roadmap.",
      },
    ],
    iterations: [
      { name: "One chatbot", finding: "Pilot week: 3 wrong policy answers out of 212, one about maternity leave. Leadership paused it.", kept: false },
      { name: "Drafts in the inbox", finding: "6 of 6 admins opened every ticket to find the drafts: 31 minutes for 20 questions.", kept: false },
      { name: "Three lanes and a queue", finding: "20 drafts cleared in under 9 minutes. Employees rated routine answers 4.6 out of 5.", kept: true },
    ],
    screens: [
      { key: "ah-answer", title: "An answer with its source", caption: "Routine topics get an answer from the company's own policy, with the section it came from." },
      { key: "ah-queue", title: "HR's review queue", caption: "One draft per card: the question, the draft, its source, and why it needs a person." },
      { key: "ah-pending", title: "Waiting for HR", caption: "When HR needs to answer, the employee sees who and roughly when, not a spinner." },
      { key: "ah-sensitive", title: "Never the AI", caption: "A complaint goes privately to a named person. No draft is written." },
    ],
    process: [
      { stage: "Discover", title: "Audited 1,200 real questions", body: "With the PM: 31 topics, six of them most of the work, and 4% that weren't questions at all.", duration: "Weeks 1–3" },
      {
        stage: "Define",
        title: "Three lanes, agreed with leadership",
        body: "I presented the pilot errors next to the topic audit, and we agreed what the AI may and may not do.",
        duration: "Week 4",
      },
      { stage: "Design", title: "Answer card and review queue", body: "Designed in Figma, built into the design system with two engineers so other squads could reuse them.", duration: "Weeks 5–10" },
      { stage: "Test", title: "Three rounds with HR and employees", body: "Inbox drafts, then the queue, then the answer card with and without a confidence score.", duration: "Weeks 8–14" },
      { stage: "Ship", title: "Staged launch, 5 clients to 40", body: "A weekly legal audit of routed questions, and a 'handbook changed' alert for HR after month 1.", duration: "Weeks 15–20" },
    ],
    deadEnd: {
      title: "A confidence score for employees",
      body: "I designed answers with a confidence percentage. In testing, employees read 72% as 'probably fine' and 90% as 'certain'. Arif pushed me to cut it. Now the lanes carry the uncertainty: if we're not sure, a person answers.",
    },
    inclusion: [
      "Answers are written at a primary-school reading level in Indonesian, and checked with two employees who left school early.",
      "The answer card works with TalkBack and at 200% text size, tested on a Rp 1.5 million Android phone.",
      "Shift workers without app access can ask on WhatsApp, and the same three lanes apply.",
    ],
    artifact: {
      title: "From the question audit: 1,200 questions, sorted with the PM",
      clusters: [
        { label: "Routine (58%)", notes: ["'Sisa cuti saya berapa?'", "'Gajian tanggal berapa?'", "'Reimburse kacamata bisa?'"] },
        { label: "Needs HR (38%)", notes: ["'Boleh tukar shift sama teman?'", "Exceptions, approvals, disputes"] },
        { label: "Not a question (4%)", notes: ["Complaints about a manager", "Health disclosures", "Never answered by AI"] },
      ],
    },
    architecture: {
      nodes: [
        { id: "employee", label: "Employee app", x: 8, y: 30, kind: "user" },
        { id: "classify", label: "Topic + risk classifier", x: 30, y: 30, kind: "agent" },
        { id: "policy", label: "Client policy index", x: 54, y: 10, kind: "data" },
        { id: "writer", label: "Answer writer", x: 54, y: 46, kind: "agent" },
        { id: "queue", label: "HR review queue", x: 78, y: 46, kind: "ui" },
        { id: "hr", label: "HR admin", x: 94, y: 30, kind: "user" },
      ],
      edges: [
        ["employee", "classify"],
        ["classify", "writer"],
        ["policy", "writer"],
        ["writer", "queue"],
        ["queue", "hr"],
        ["writer", "employee"],
      ],
    },
    beforeAfter: {
      before: {
        title: "Before: the same twenty questions, by hand",
        points: ["4-hour median first reply", "Half of HR's week on routine answers", "A paused chatbot nobody trusted"],
      },
      after: {
        title: "After: three lanes",
        points: ["Routine answers in minutes, with the policy section", "Drafts HR approves over coffee", "Sensitive questions only ever reach a person"],
      },
    },
    results: {
      metrics: [
        { value: "9 min", label: "median first reply for routine questions, down from 4 hours", how: "Ticket timestamps across 40 clients, 8 weeks before and after launch" },
        { value: "18%", label: "of drafts edited by HR before sending, down from 41% at launch", how: "Review queue logs, months 1 and 4" },
        { value: "0", label: "sensitive questions answered by the AI", how: "Weekly legal audit of every routed question. It caught 3 misroutes to HR's queue, fixed in the classifier" },
        {
          value: "0.9%",
          label: "of automatic answers wrong by month 4, down from 2.8%",
          how: "Monthly audit of 400 random answers against the handbook; most errors came from handbooks updated without notice",
        },
      ],
      body: [
        "Two clients renewed early and named Ask HR in their renewal calls. HR admins at small clients got back about a day a week. The 'handbook changed' alert, added after the first audit, did more for accuracy than any model change.",
      ],
      quote: {
        text: "I approve the drafts while I drink my coffee. Before, that was my whole morning.",
        who: "HR admin at a retail client",
      },
    },
    reflection:
      "Most of the design work was deciding what the AI wasn't allowed to do. Getting leadership to accept 41% instead of 100% was a design problem too, and I solved it with the pilot's real errors, not with mockups.",
    next: "The source paragraph inline, now that we have the numbers showing people want it.",
  },
  {
    slug: "catat",
    index: "03",
    name: "Catat",
    year: "2025",
    kind: "Voice bookkeeping on WhatsApp",
    tone: "cobalt",
    rarity: "Rare",
    tagline: "Small shop owners keep their books by sending WhatsApp voice notes, slang included.",
    prompt: "I sell two hundred things a day and I write nothing down. Can I just tell my phone what I sold?",
    promptBy: "Warung owner, Bekasi Timur",
    summary:
      "Catat (Indonesian for 'write it down') lets warung owners log sales, stock and customer debts by sending WhatsApp voice notes in everyday Indonesian. It answers in one line, asks when it isn't sure, and sends a summary every Sunday.",
    tldr: {
      problem: "Warung owners serve a queue with one free hand. Every bookkeeping app we met had been abandoned within a week.",
      did: "I designed the conversation: a one-line confirmation with one-tap undo, a single short question when a note is ambiguous, and the Sunday summary that kept people coming back.",
      outcome: "140 shops in the pilot, 91% of voice notes logged with no fix, 83% still active weekly after 8 weeks.",
    },
    role: {
      title: "Product designer, conversation and interaction",
      summary:
        "We were three. I owned the conversation design and the interaction model inside WhatsApp, ran half the field visits, and built the agent behind it. Dita, our visual designer, owned the brand, the onboarding cards and the small web dashboard; Raka ran recruitment and the other field visits.",
      decisions: [
        "Kept the whole product inside WhatsApp, after our web-app prototype got four logins in two weeks.",
        "Designed the one-line confirmation with ✓ and ✗ buttons, after the receipt-style version was ignored and the plain line couldn't be corrected.",
        "Wrote the rule 'ask one short question, never guess' for money and debts, and the 23 questions it uses.",
      ],
      with: [
        { who: "Dita, visual designer", part: "Brand, onboarding cards, the web dashboard; we critiqued each other's work twice a week" },
        { who: "Raka, field researcher", part: "Recruited the 27 shops and ran half the visits with me" },
        { who: "A Bekasi cooperative", part: "Introduced us to owners and now distributes the pilot" },
      ],
    },
    team: "Team of 3: me, a visual designer, a field researcher",
    timeline: "14 weeks · 2025",
    status: "A Bekasi cooperative now runs the pilot with Dita and Raka. I handed over the agent and stay on call for fixes.",
    stack: ["Figma", "WhatsApp Business API", "TypeScript", "Speech-to-text", "Claude tool use", "PostgreSQL"],
    links: { live: "https://example.com/catat", repo: "https://github.com/example/catat" },
    stats: [
      { label: "Shops", value: "140" },
      { label: "Fully correct", value: "87%" },
      { label: "Weekly, wk 8", value: "83%" },
    ],
    problem: {
      body: [
        "Warung (small neighbourhood shops) run on memory and goodwill. Owners know roughly what sells, but not what they earn, and customer debts live on scraps of paper.",
        "Bookkeeping apps exist. Nobody we met used one for more than a week: typing every sale with one hand while serving a queue doesn't work.",
      ],
      constraints: [
        "Must live inside WhatsApp, the one app every owner already uses",
        "Voice notes are noisy and full of slang: 'goceng' is Rp5,000, 'ceban' is Rp10,000",
        "Cheap Android phones and patchy data",
        "A mistake about someone's debt is personal: it has to be fixable in one tap",
      ],
    },
    research: {
      methods: [
        { label: "Field visits", detail: "27 warung, 3 hours each behind the counter, with Raka" },
        { label: "Copy tests", detail: "3 rounds of confirmation wording with 8 owners each, in their shops" },
        { label: "Pilot", detail: "140 shops for 8 weeks, plus exit calls with the 24 who stopped" },
      ],
      insights: [
        { title: "Hands are busy, mouths aren't", body: "Owners already talk while they serve: to customers, to family, to their phone. Voice notes cost them nothing." },
        { title: "Money has its own language", body: "Gopek, seceng, goceng, ceban, and a nickname for every brand. We built a dictionary of 312 terms before designing a single message." },
        { title: "Debts are about people, not numbers", body: "Owners didn't want a total. They wanted 'who owes me, and since when', said kindly." },
      ],
      ethics:
        "Consent forms were read aloud in Indonesian and signed before any recording. Voice notes are deleted after 30 days unless an owner opts in to help improve Catat; customers' names and debts are visible only to the owner.",
    },
    decisions: [
      {
        title: "Live in WhatsApp, not in an app",
        options: ["A bookkeeping web app", "A Telegram bot", "WhatsApp, with interactive reply buttons"],
        chose: "Everything happens in a WhatsApp chat. The dashboard exists, for the few who want it.",
        why: "The web prototype got four logins in two weeks. The WhatsApp prototype got 1,900 voice notes in the same two weeks.",
        cost: "WhatsApp limits us to three buttons and short messages. Most of the design became writing.",
      },
      {
        title: "One line back, one tap to undo",
        options: ["A receipt with every field", "A single line, no buttons", "A single line with ✓ Benar and ✗ Batalkan"],
        chose: "Every logged entry comes back as one line in plain Indonesian, with ✓ to keep it and ✗ to undo it.",
        why: "Owners didn't read past line two of the receipt, so errors slipped through. The plain line was read, but fixing it meant typing. With the buttons, fixes take one tap.",
        cost: "We can show less detail. Price per item lives in the Sunday summary instead.",
      },
      {
        title: "Ask, don't guess",
        options: ["Guess the most likely meaning", "Ask one short question with buttons"],
        chose: "When a note about money or a debt is ambiguous, Catat asks one question with two answers. For anything else, it makes its best guess and shows it.",
        why: "A wrong debt broke trust in a way a wrong sale didn't: one owner stopped after Catat booked her neighbour's payment as a new debt.",
        cost: "About 1 in 12 notes now gets a question. Owners told us that felt careful, not annoying.",
      },
    ],
    iterations: [
      { name: "The receipt", finding: "3 of 8 owners never read past the second line. Two wrong amounts slipped through in one morning.", kept: false },
      { name: "One line, no buttons", finding: "Read every time, but owners couldn't fix a mistake without typing, so they didn't.", kept: false },
      { name: "One line, ✓ and ✗", finding: "91% of notes needed no fix. When one did, it took one tap.", kept: true },
    ],
    screens: [
      { key: "ct-sale", title: "Say it, done", caption: "A voice note becomes one line with ✓ Benar (correct) and ✗ Batalkan (undo)." },
      { key: "ct-ask", title: "Ask, don't guess", caption: "'Ceban, Bu Sri' could be a new debt or a payment. Catat asks one question." },
      { key: "ct-undo", title: "Undo in one tap", caption: "Nothing is written down, and it shows how to say it again." },
      { key: "ct-summary", title: "The Sunday summary", caption: "Takings, a profit estimate, best sellers and who still owes, every Sunday at 7 p.m." },
    ],
    process: [
      {
        stage: "Discover",
        title: "Sat behind the counter at 27 warung",
        body: "Recorded (with consent) how owners actually say numbers and items, and built a dictionary of 312 terms.",
        duration: "Week 1–3",
      },
      {
        stage: "Define",
        title: "Four actions, not forty",
        body: "Sell, restock, someone owes, someone pays. Fewer actions meant fewer surprises and replies short enough to read at a glance.",
        duration: "Week 4",
      },
      { stage: "Design", title: "Wrote the conversation", body: "Every message, button and question, tested on paper cards in shops before any of it was built.", duration: "Week 4–8" },
      { stage: "Test", title: "Three rounds of confirmation copy", body: "Receipt, plain line, line with buttons, each with eight owners during their morning rush.", duration: "Week 6–10" },
      { stage: "Ship", title: "Piloted with 140 warung", body: "The Sunday summary (best sellers, profit estimate, who owes what) became the reason people kept using it.", duration: "Week 11–14" },
    ],
    deadEnd: {
      title: "The dashboard we designed first",
      body: "We spent three weeks on a web dashboard before the field visits. In the pilot it got 4% of usage. Most of that design work was wasted, and it taught us to visit before we draw.",
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
        { label: "Amounts", notes: ["gopek = 500", "seceng = 1.000", "goceng = 5.000", "ceban = 10.000", "'dua rebu' = 2.000"] },
        { label: "Items", notes: ["'indomi' / 'mi goreng'", "'aqua gelas' = any cup water", "'rokok' + brand nickname"] },
        { label: "Debts", notes: ["'ngebon' = buy on credit", "Names, never numbers: 'Bu Sri yang depan'"] },
      ],
    },
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
        {
          value: "87%",
          label: "of voice notes logged fully correctly",
          how: "Raka and I listened to 300 random notes against the ledger. Owners' ✓ said 91%; 4% were silent errors nobody caught, mostly item counts",
        },
        { value: "83%", label: "of shops still active every week after 8 weeks", how: "116 of 140 shops sent at least 10 notes in week 8" },
        { value: "1 in 12", label: "notes get a clarifying question", how: "Share of notes about money or debts where Catat asked instead of guessing" },
        { value: "62%", label: "of owners said they would pay Rp15k a month", how: "Stated intent from an exit survey of all 140 shops, not purchases; a cooperative now distributes it" },
      ],
      body: [
        "Owners kept using it because it never asked them to change how they work. It learned their words instead of teaching them ours. Of the 24 shops that stopped, 11 had a family member handling the phone, so the next version supports a second number.",
      ],
      quote: {
        text: "Now I know which customer owes me, and since when. That alone paid for my phone credit.",
        who: "Warung owner, pilot participant",
      },
    },
    reflection: "The best interface was almost no interface. I spent more time on the wording of a one-line confirmation than on the whole dashboard, and that was the right call.",
    next: "Support a second phone number per shop, and a monthly view owners can show the cooperative for a loan.",
  },
  {
    slug: "lintas",
    index: "04",
    name: "Lintas",
    year: "2024",
    kind: "Commute planner for Greater Jakarta",
    tone: "violet",
    rarity: "Uncommon",
    tagline: "One 'leave by' time for a commute across KRL, MRT and TransJakarta, replanned live with a one-line reason.",
    prompt: "KRL is packed again. When should I leave, and is there a better way to get to work today?",
    promptBy: "Commuter, Bekasi → Sudirman",
    summary:
      "Lintas plans door-to-door commutes across Greater Jakarta's trains and buses, shows how crowded each leg will be, and replans live when a line is delayed, with one sentence explaining why.",
    tldr: {
      problem: "When one leg of a Bekasi–Jakarta commute is late, the whole trip changes, and existing apps answer with a map or a wall of alerts.",
      did: "I designed the whole app around one number, 'leave by', and a replan message that says what changed, what to do and what it costs, in one sentence.",
      outcome: "2.1k weekly riders at peak, all organic; adding the one-line reason doubled how often riders took a replan.",
    },
    role: {
      title: "Designer and builder (side project)",
      summary: "A side project I designed and built alone, with a panel of twelve regular commuters who tested every version on their real morning trip.",
      decisions: [
        "Replaced the map-first home with a single 'leave by' time, after only 1 of 6 riders used the map.",
        "Limited push notifications to 'your plan changed', after riders muted the alert-for-every-delay version.",
        "Wrote the replan template: what changed, what to do, what it costs, in under 25 words.",
      ],
      with: [
        { who: "12 regular commuters", part: "A standing test panel: every version, on their real trip, for four months" },
        { who: "Riders on the Bekasi line", part: "214 one-tap crowding reports a month that the forecasts are built on" },
      ],
    },
    team: "Solo, with a panel of 12 commuters",
    timeline: "Evenings and weekends · 2024",
    status: "Open-sourced in 2025 and now in maintenance: I fix what breaks and keep the push alerts running for the riders who still use it.",
    stack: ["Figma", "Next.js (PWA)", "TypeScript", "Python", "Redis", "Web Push", "Claude API"],
    links: { live: "https://example.com/lintas", repo: "https://github.com/example/lintas" },
    stats: [
      { label: "Riders", value: "2.1k" },
      { label: "Replans taken", value: "62%" },
      { label: "With a reason", value: "2×" },
    ],
    problem: {
      body: [
        "A Bekasi to Jakarta commute can mix a KRL train, a transfer, the MRT and a bus. When one leg is delayed, the whole trip changes, and existing apps either show a static route or a wall of alerts.",
        "Commuters don't need more data. They need one decision: leave now, wait, or go another way.",
      ],
      constraints: ["Answers must arrive while you're walking to the station", "Schedule feeds are incomplete; crowding isn't published at all", "Installable and light on data"],
    },
    research: {
      methods: [
        { label: "Ride-alongs", detail: "12 commuters, two morning trips each, from front door to desk" },
        { label: "Diary study", detail: "Two weeks of WhatsApp check-ins at departure and arrival" },
        { label: "A/B test", detail: "Replans with and without a one-line reason, 1,800 replans over 3 weeks" },
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
        why: "Only 1 of 6 riders used the map. With three options, riders took 40 seconds to choose at the door. With one time, they decided in about 4.",
        cost: "Power users wanted the options back, so they live one swipe right.",
      },
      {
        title: "Push only when your plan changes",
        options: ["An alert for every delay on your lines", "A push only when your plan changes"],
        chose: "Lintas stays silent unless the best plan changes, and then says what to do.",
        why: "In the first version, 5 of 12 panel riders muted the app within a week. After the change, none did.",
        cost: "Riders sometimes hear about a delay elsewhere first. We decided that's fine.",
      },
      {
        title: "Every replan comes with a reason",
        options: ["Just show the new plan", "The new plan, plus one sentence: what changed, what to do, what it costs"],
        chose: "Every replan includes one sentence under 25 words, written to a template I tested with the panel.",
        why: "In the A/B test, replans with a reason were accepted twice as often (62% against 31%).",
        cost: "The sentence is written by a model, so I test 300 of them every month against the template.",
      },
    ],
    iterations: [
      { name: "Map first", finding: "1 of 6 riders used the map. 'I know where Manggarai is. I want to know when to leave.'", kept: false },
      { name: "Three options", finding: "Riders took 40 seconds to choose, at the door, with shoes on.", kept: false },
      { name: "One 'leave by' time", finding: "Decision in about 4 seconds. The panel asked to keep it.", kept: true },
    ],
    screens: [
      { key: "ln-home", title: "Leave by", caption: "One number, with crowding for each leg. Everything else is a swipe away." },
      { key: "ln-replan", title: "A replan with a reason", caption: "What changed, what to do, what it costs, side by side with your plan." },
      { key: "ln-cars", title: "Which carriage", caption: "Crowding front to back, from 214 rider reports a month." },
      { key: "ln-calm", title: "Nothing better", caption: "When there's no faster option, it says so once and stays quiet." },
    ],
    process: [
      {
        stage: "Discover",
        title: "Rode along with twelve commuters",
        body: "Door to desk, twice each. The decision that mattered happened at the front door, not on the platform.",
        duration: "Month 1",
      },
      { stage: "Define", title: "One question: when do I leave?", body: "Everything on the home screen had to help answer it, or move away.", duration: "Month 1" },
      { stage: "Design", title: "Map, then options, then one number", body: "Three home screens, each tested on the panel's real trips.", duration: "Month 2" },
      { stage: "Test", title: "A/B tested the replan reason", body: "1,800 replans over three weeks, with and without one sentence explaining why.", duration: "Month 3" },
      { stage: "Ship", title: "Opened it to everyone", body: "An installable web app with push, light enough for patchy data. 2.1k weekly riders at peak, all by word of mouth.", duration: "Month 4" },
    ],
    deadEnd: {
      title: "An alert for every delay",
      body: "The first version pushed every delay on your lines. Within a week, five of the twelve panel riders had muted it. Silence became a feature: now Lintas only speaks when your plan changes.",
    },
    inclusion: [
      "Crowding is labelled (Packed, Tight, Room to stand) as well as coloured.",
      "Women-only carriages are marked on every train view, because riders asked for it.",
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
        { id: "feeds", label: "Schedules + delays", x: 8, y: 12, kind: "service" },
        { id: "reports", label: "Crowd reports", x: 8, y: 46, kind: "user" },
        { id: "forecast", label: "Crowding forecast", x: 36, y: 30, kind: "service" },
        { id: "planner", label: "Route planner", x: 60, y: 30, kind: "service" },
        { id: "agent", label: "Reason writer", x: 82, y: 12, kind: "agent" },
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
        { value: "2.1k", label: "weekly riders at peak, all organic", how: "Weekly active installs, October 2024; no paid promotion" },
        { value: "62%", label: "of replans accepted when they came with a reason", how: "A/B test over 3 weeks, 1,800 replans; 31% without the reason" },
        { value: "0 / 12", label: "panel riders muted it after the quiet-push change", how: "Down from 5 of 12 in the alert-for-everything version" },
        { value: "38 min", label: "saved per rider per week", how: "Self-reported median, survey of 212 riders; treat it as a feeling, not a fact" },
      ],
      body: ["Riders came for the crowding bar and stayed for the replans. The one-sentence reason doubled how often people actually took the suggested alternative."],
      quote: {
        text: "It told me to take the earlier train from the next station over, and why. I sat down for the first time in months.",
        who: "Rider, Bekasi line",
      },
    },
    reflection: "A prediction without a reason is just a notification. Adding 'why' to every replan changed behaviour more than any accuracy gain did.",
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

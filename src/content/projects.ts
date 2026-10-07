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
  links: { live: string; repo: string };
  /** Trading-card stats (3). */
  stats: { label: string; value: string }[];
  problem: { body: string[]; constraints: string[] };
  research: {
    methods: { label: string; detail: string }[];
    insights: { title: string; body: string }[];
    ethics: string;
  };
  /** The design decisions that shaped the product: options, the call, why, and what it cost. */
  decisions: { title: string; options: string[]; chose: string; why: string; cost: string }[];
  /** Three rounds of the key screen (wireframes in features/screens/wires), with what testing found. */
  iterations: { name: string; finding: string; kept: boolean }[];
  /** The shipped screens, in the order they're shown (keys in features/screens/registry). */
  screens: { key: string; title: string; caption: string }[];
  process: { stage: string; title: string; body: string; duration: string }[];
  /** Something that didn't work, and what it changed. */
  deadEnd: { title: string; body: string };
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
    prompt:
      "Our bid team spends three hours reading every tender package. Can something tell us in five minutes whether we should even bid?",
    promptBy: "Operations lead, 12-person construction firm in Bekasi",
    summary:
      "Tenderlens reads tender packages from public procurement portals and turns each one into a one-page brief: a bid / no-bid score, the three reasons behind it, and a link from every reason to the page it came from.",
    tldr: {
      problem: "Small contractors spend 3 hours reading each 200-page tender, mostly to learn they never qualified.",
      did: "I designed a one-page brief where the score is never shown without its reasons, every reason links to its page, and the AI says 'I can't tell' instead of guessing.",
      outcome: "11 minutes per tender, 31 of 38 beta teams still using it weekly after 3 months, 12 teams pre-paying.",
    },
    role: {
      title: "Lead product designer (solo designer)",
      summary:
        "I led the product from the first interview to the closed beta: research, the brief and every screen, the trust and error states, usability tests, and the front end. A former procurement officer advised on the rules; I wrote the extraction pipeline with one freelance engineer.",
      decisions: [
        "Made 'score plus three cited reasons' the unit of the product, after a score on its own failed with every tester.",
        "Designed an explicit 'Can't tell yet' state, and set the threshold so the AI abstains rather than risk a wrong 'you qualify'.",
        "Put a 'That's wrong' button on every reason and routed it into the test set, so users improve the product instead of just losing trust in it.",
      ],
      with: [
        { who: "Bu Ratna, former procurement officer", part: "Domain rules, and checked every eligibility claim in the test set" },
        { who: "Fajar, freelance engineer (6 weeks)", part: "The PDF parser and OCR; I built the app and the agent" },
        { who: "9 bid teams", part: "Shadowing, three rounds of usability tests, the closed beta" },
      ],
    },
    team: "Me, a domain advisor and a freelance engineer",
    timeline: "10 weeks · 2025",
    stack: ["Figma", "Next.js", "TypeScript", "PostgreSQL", "pgvector", "Claude API", "Playwright"],
    links: { live: "https://example.com/tenderlens", repo: "https://github.com/example/tenderlens" },
    stats: [
      { label: "Read time", value: "3h → 11m" },
      { label: "Still weekly", value: "31/38" },
      { label: "Wrong 'eligible'", value: "2.1%" },
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
        { label: "Shadowing", detail: "9 bid teams, 2 hours each, while they read a live tender" },
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
        cost: "9% of briefs abstain, so some owners still open the PDF. That was the trade I chose over a 2% wrong 'eligible' turning into 9%.",
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
      { key: "tl-source", title: "Show the receipts", caption: "Tap a page chip: the source page opens with the sentence highlighted." },
      { key: "tl-unsure", title: "Can't tell yet", caption: "When a page is unreadable, it says so, names the page, and offers a person." },
      { key: "tl-disagree", title: "That's wrong", caption: "One tap to say why. Reviewed corrections go into the test set." },
    ],
    process: [
      { stage: "Discover", title: "Shadowed nine bid teams", body: "Watched how people actually read a tender. Everyone looked for the same three things first: eligibility, scope, and money.", duration: "Week 1–2" },
      { stage: "Define", title: "Framed it as one decision", body: "'Should we bid?' became the only question the first screen answers. Everything else moved behind it.", duration: "Week 2" },
      { stage: "Design", title: "Three rounds on the brief", body: "Paper, then clickable, then coded with real tenders. The score-only layout failed; the cited-reasons layout won.", duration: "Week 3–6" },
      { stage: "Test", title: "Tested the failures, not just the happy path", body: "Blurry scans, contradictory clauses, a misread number. Each became a designed state with its own words.", duration: "Week 6–9" },
      { stage: "Ship", title: "Closed beta with 38 teams", body: "A morning digest on WhatsApp and email, a brief per tender, and 'That's wrong' on every reason.", duration: "Week 10" },
    ],
    deadEnd: {
      title: "Auto-filling the bid documents",
      body: "Owners asked for it and I prototyped it in week 7. In testing, two owners signed a pre-filled form without reading it. I dropped it: a tool that makes people stop reading legal documents is the opposite of this product.",
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
        { value: "11 min", label: "median read time per tender, down from 3 hours", how: "Timed on 46 tenders with 8 teams; the 3-hour baseline was observed during shadowing" },
        { value: "31 / 38", label: "beta teams still using it weekly after 3 months", how: "Product analytics, weekly active teams, month 3" },
        { value: "2.1%", label: "of eligibility claims wrongly said 'you qualify'", how: "5 of 240 labelled fields from 60 tenders; all 5 were caught by the page check" },
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
    slug: "catat",
    index: "02",
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
    stack: ["Figma", "WhatsApp Business API", "TypeScript", "Speech-to-text", "Claude tool use", "PostgreSQL"],
    links: { live: "https://example.com/catat", repo: "https://github.com/example/catat" },
    stats: [
      { label: "Shops", value: "140" },
      { label: "No-fix rate", value: "91%" },
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
      { stage: "Discover", title: "Sat behind the counter at 27 warung", body: "Recorded (with consent) how owners actually say numbers and items, and built a dictionary of 312 terms.", duration: "Week 1–3" },
      { stage: "Define", title: "Four actions, not forty", body: "Sell, restock, someone owes, someone pays. Fewer actions meant fewer surprises and replies short enough to read at a glance.", duration: "Week 4" },
      { stage: "Design", title: "Wrote the conversation", body: "Every message, button and question, tested on paper cards in shops before any of it was built.", duration: "Week 4–8" },
      { stage: "Test", title: "Three rounds of confirmation copy", body: "Receipt, plain line, line with buttons, each with eight owners during their morning rush.", duration: "Week 6–10" },
      { stage: "Ship", title: "Piloted with 140 warung", body: "The Sunday summary (best sellers, profit estimate, who owes what) became the reason people kept using it.", duration: "Week 11–14" },
    ],
    deadEnd: {
      title: "The dashboard we designed first",
      body: "We spent three weeks on a web dashboard before the field visits. In the pilot it got 4% of usage. Most of that design work was wasted, and it taught us to visit before we draw.",
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
        { value: "91%", label: "of voice notes logged with no correction", how: "500 notes from 40 shops in pilot weeks 6–8, checked against the owner's ✓ or ✗" },
        { value: "83%", label: "of shops still active every week after 8 weeks", how: "116 of 140 shops sent at least 10 notes in week 8" },
        { value: "1 in 12", label: "notes get a clarifying question", how: "Share of notes about money or debts where Catat asked instead of guessing" },
        { value: "62%", label: "of owners would pay Rp15k a month", how: "Exit survey of all 140 shops; a cooperative now distributes it" },
      ],
      body: [
        "Owners kept using it because it never asked them to change how they work. It learned their words instead of teaching them ours. Of the 24 shops that stopped, 11 had a family member handling the phone, so the next version supports a second number.",
      ],
      quote: {
        text: "Now I know which customer owes me, and since when. That alone paid for my phone credit.",
        who: "Warung owner, pilot participant",
      },
    },
    reflection:
      "The best interface was almost no interface. I spent more time on the wording of a one-line confirmation than on the whole dashboard, and that was the right call.",
    next: "Support a second phone number per shop, and a monthly view owners can show the cooperative for a loan.",
  },
  {
    slug: "lintas",
    index: "03",
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
      summary:
        "A side project I designed and built alone, with a panel of twelve regular commuters who tested every version on their real morning trip.",
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
      constraints: [
        "Answers must arrive while you're walking to the station",
        "Schedule feeds are incomplete; crowding isn't published at all",
        "Installable and light on data",
      ],
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
      { stage: "Discover", title: "Rode along with twelve commuters", body: "Door to desk, twice each. The decision that mattered happened at the front door, not on the platform.", duration: "Month 1" },
      { stage: "Define", title: "One question: when do I leave?", body: "Everything on the home screen had to help answer it, or move away.", duration: "Month 1" },
      { stage: "Design", title: "Map, then options, then one number", body: "Three home screens, each tested on the panel's real trips.", duration: "Month 2" },
      { stage: "Test", title: "A/B tested the replan reason", body: "1,800 replans over three weeks, with and without one sentence explaining why.", duration: "Month 3" },
      { stage: "Ship", title: "Opened it to everyone", body: "An installable web app with push, light enough for patchy data. 2.1k weekly riders at peak, all by word of mouth.", duration: "Month 4" },
    ],
    deadEnd: {
      title: "An alert for every delay",
      body: "The first version pushed every delay on your lines. Within a week, five of the twelve panel riders had muted it. Silence became a feature: now Lintas only speaks when your plan changes.",
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
      body: [
        "Riders came for the crowding bar and stayed for the replans. The one-sentence reason doubled how often people actually took the suggested alternative.",
      ],
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

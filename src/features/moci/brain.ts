/* ==========================================================================
   Moci's offline brain. Answers when the Claude API is unavailable (no key,
   the daily cap, an outage, static hosting) and runs the eval in the
   visitor's browser and in Node (scripts/eval-moci.mjs). Deterministic.

   Order: intents first (things the visitor wants *done*, and the questions
   where honesty matters more than retrieval), then BM25 retrieval over the
   knowledge docs (things the visitor wants to *know*), then abstain.
   Every answer about her carries a source: an object in the room.
   ========================================================================== */
import { bio, identity, modelCard, practical, principles } from '@/content/profile';
import { projects } from '@/content/projects';
import { STATIONS, type StationId } from '@/stage/stations';
import { buildDocs, experienceFor, namedEmployer, names, onRecord, ROOM_STATIONS, spokenName, TOOLKIT, voice, type Doc } from './knowledge';

export type MociAction =
  /** walk the camera to an object; its panel opens with `props` */
  | { type: 'walk'; station: StationId; props?: Record<string, unknown> }
  | { type: 'copyEmail' }
  | { type: 'sound'; on: boolean }
  /** walk to the ticket printer to book a chat */
  | { type: 'book' }
  /** open "How Moci is tested" inside Moci's panel */
  | { type: 'evals' };

export interface MociAnswer {
  text: string;
  actions: MociAction[];
  followups: string[];
  /** a key of sources() in knowledge.ts: the object the answer comes from */
  source?: string;
  confidence: number;
}

/** What a recruiter in a hurry wants to know: the first chips in the panel. */
export const RECRUITER_QUESTIONS = ['What has she shipped?', 'Can she start soon?', 'Show me her evals', 'Why hire a new grad?'];
export const defaultFollowups = RECRUITER_QUESTIONS;

const STOP = new Set(
  'a an the is are was were be been am i me my you your she her he his it its of to in on for with and or but at by from as that this these those what which who whom whose how why when where do does did can could should would will shall may might must have has had about into than then there their them they we our us so if not no yes please tell show give any some more most very just also like want know okay ok hey hi hello'.split(
    ' ',
  ),
);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP.has(w))
    .map((w) => (w.length > 4 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w));
}

type Index = { docs: Doc[]; tf: Map<string, number>[]; kw: Set<string>[]; len: number[]; avg: number; df: Map<string, number> };
let index: Index | null = null;

function getIndex(): Index {
  if (index) return index;
  const docs = buildDocs();
  const tf = docs.map((doc) => {
    const counts = new Map<string, number>();
    for (const t of tokenize(`${doc.title} ${doc.text}`)) counts.set(t, (counts.get(t) ?? 0) + 1);
    return counts;
  });
  const kw = docs.map((doc) => new Set(doc.keywords.flatMap((k) => tokenize(k))));
  const len = tf.map((m) => Array.from(m.values()).reduce((a, b) => a + b, 0));
  const avg = len.reduce((a, b) => a + b, 0) / len.length;
  const df = new Map<string, number>();
  docs.forEach((_, i) => {
    for (const term of new Set([...tf[i].keys(), ...kw[i]])) df.set(term, (df.get(term) ?? 0) + 1);
  });
  index = { docs, tf, kw, len, avg, df };
  return index;
}

/** BM25 over the knowledge docs. `coverage` is the share of query terms the doc actually contains. */
export function retrieve(query: string, k = 3, keep: (doc: Doc) => boolean = () => true): { doc: Doc; score: number; coverage: number }[] {
  const { docs, tf, kw, len, avg, df } = getIndex();
  const terms = tokenize(query);
  if (!terms.length) return [];
  const N = docs.length;
  const k1 = 1.4;
  const b = 0.7;
  return docs
    .map((doc, i) => {
      let score = 0;
      let found = 0;
      for (const term of terms) {
        if (tf[i].has(term) || kw[i].has(term)) found++;
        const n = df.get(term) ?? 0;
        if (!n) continue;
        const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));
        const f = tf[i].get(term) ?? 0;
        score += idf * ((f * (k1 + 1)) / (f + k1 * (1 - b + (b * len[i]) / avg)));
        if (kw[i].has(term)) score += idf * 1.6;
      }
      return { doc, score, coverage: found / terms.length };
    })
    .filter((r) => r.score > 0 && keep(r.doc))
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}

/** First n sentences of a text. Decimals ("κ 0.87") and abbreviations ("B.Sc.") stay inside their sentence. */
function sentences(text: string, n: number): string {
  const parts = text.split(/(?<=[.!?”])\s+(?=[A-Z0-9"'“‘(])/);
  const out = parts.slice(0, n).join(' ').trim();
  // a quote of her words cut short still closes
  const open = (out.match(/“/g) ?? []).length - (out.match(/”/g) ?? []).length;
  return open > 0 ? `${out}”` : out;
}

/** Small fuzzy matcher (from the old site's palette): contiguous matches and word starts score higher. */
function fuzzyScore(query: string, text: string): number {
  const q = query.trim().toLowerCase();
  if (!q) return 0;
  const t = text.toLowerCase();
  const direct = t.indexOf(q);
  if (direct !== -1) return 1000 - direct * 2 + (direct === 0 || /\W/.test(t[direct - 1] ?? ' ') ? 200 : 0);
  let score = 0;
  let ti = 0;
  let streak = 0;
  for (const ch of q) {
    if (ch === ' ') continue;
    const found = t.indexOf(ch, ti);
    if (found === -1) return 0;
    const wordStart = found === 0 || /\W/.test(t[found - 1]);
    streak = found === ti ? streak + 1 : 0;
    score += 10 + streak * 6 + (wordStart ? 12 : 0) - Math.min(found - ti, 8);
    ti = found + 1;
  }
  return Math.max(1, score);
}

const mentionedProject = (q: string) => projects.find((p) => new RegExp(`\\b(${p.name}|${p.slug})\\b`, 'i').test(q));

type Destination = { labels: string[]; action: MociAction; say: string; source?: string };

/** What people call the objects on the toolkit shelf. */
const TOOLKIT_ALIASES: Record<string, string[]> = {
  'field-research': ['cassette', 'cassette recorder', 'tape recorder'],
  retrieval: ['cd', 'jewel case', 'compact disc'],
  evals: ['jar', 'jar of marbles', 'marbles'],
  agents: ['robot', 'wind-up robot', 'tool use'],
  design: ['zines', 'ux writing'],
  'full-stack': ['usb', 'usb stick', 'full stack'],
};

/** Questions that are about the room itself; only these may be answered with an object in it. */
const ROOM_CUE =
  /\b(where|room|in here|find|object|walk|sign|guestbook|aquarium|printer|ticket|mug|clock|window|weather|synth|turntable|record player|music|games?|arcade|stickers?|binder|board|pass|camera|studio|pack|phone|newspaper|paper|shelf|gacha|button|led|computer|terminal|plush|posters?|wall)\b/i;

/** Words that don't change "what is Catat?" into a narrower question. */
const OVERVIEW_WORDS = new Set(['tell', 'about', 'describe', 'explain', 'overview', 'summary', 'summarise', 'summarize', 'more', 'project', 'case', 'study', 'product', 'app', 'built', 'work', 'thing', 'quick', 'short', 'briefly']);
const numberWord = (n: number) => ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'][n] ?? String(n);
const capital = (s: string) => s.replace(/^\w/, (c) => c.toUpperCase());

/** Things you can walk to, for "open …" / "show me …" / "walk me to …". */
function destinations(): Destination[] {
  return [
    ...projects.map((p) => ({
      labels: [p.name, p.slug],
      action: { type: 'walk', station: 'gallery', props: { work: p.slug } } as MociAction,
      say: `Walking you to ${p.name} on the Wall of Work.`,
      source: `wall/${p.slug}`,
    })),
    { labels: ['cv', 'resume', 'résumé', 'id card', 'practical details'], action: { type: 'walk', station: 'about' }, say: 'Walking you to her ID card: her CV and the practical details are there.', source: 'id-card' },
    { labels: ['work', 'case studies', 'posters', 'projects', 'portfolio'], action: { type: 'walk', station: 'gallery' }, say: 'Walking you to the Wall of Work: four case studies.', source: 'wall' },
    { labels: ['book a chat', 'booking', 'interview', 'chat'], action: { type: 'book' }, say: 'Taking you to the pink ticket printer to book a chat.', source: 'printer' },
    { labels: ['your evals', 'moci evals', 'mocis evals', 'how moci is tested'], action: { type: 'evals' }, say: 'Here are my evals.', source: 'moci-evals' },
    ...TOOLKIT.map((t) => ({
      labels: [...(TOOLKIT_ALIASES[t.focus] ?? []), t.focus.replace(/-/g, ' ')],
      action: { type: 'walk', station: 'shelf', props: { focus: t.focus } } as MociAction,
      say: `Walking you to the toolkit shelf: ${t.label.replace(' · ', ', ')}.`,
      source: `shelf/${t.focus}`,
    })),
    ...ROOM_STATIONS.filter((id) => id !== 'moci').map((id) => ({
      labels: [STATIONS[id].name.replace(/^The /, ''), id],
      action: { type: 'walk', station: id } as MociAction,
      say: `Walking you to ${spokenName(id)}.`,
      source: `room/${id}`,
    })),
  ];
}

function findDestination(raw: string): Destination | null {
  const target = raw
    .toLowerCase()
    .replace(/\b(her|his|the|a|an|my|me|to|page|case study|project|section|please|over|there)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!target) return null;
  let best: { d: Destination; score: number } | null = null;
  for (const d of destinations()) {
    for (const label of d.labels) {
      const s = fuzzyScore(target, label);
      // a direct hit, or a strong, mostly contiguous match; scattered letters in a long label don't count
      const ok = s >= 1000 || s >= target.replace(/\s/g, '').length * 18;
      if (ok && (!best || s > best.score)) best = { d, score: s };
      // "the pink ticket printer" contains the label "Ticket Printer"
      if (!ok && label.length > 3 && ` ${target} `.includes(` ${label.toLowerCase()} `) && (!best || 900 > best.score)) best = { d, score: 900 };
    }
  }
  return best?.d ?? null;
}

const pick = (label: string) => practical.find((p) => p.label.toLowerCase() === label.toLowerCase())?.value;

/** The case study a line of her record became: by name ("Tenderlens") or by the company it was for ("the HR startup"). */
function projectFor(org: string, title: string) {
  return projects.find((x) => new RegExp(`\\b${x.name}\\b`, 'i').test(`${org} ${title}`)) ?? projects.find((x) => x.company && names(x.company, org));
}

/** "Did she work at Google?": no such job, and what her record actually holds. */
function notOnRecord(org: string): MociAnswer {
  return {
    text: `No: there's no job at ${org.replace(/^\w/, (c) => c.toUpperCase())} on her record. She did a six-month AI engineering internship at an HR software startup in Jakarta (2025) and has a part-time contract maintaining Tenderlens (2026); the rest is her own products.`,
    actions: [],
    followups: ['What did she do at the HR startup?', 'Is she open to work?'],
    source: 'id-card',
    confidence: 0.9,
  };
}

export function think(raw: string): MociAnswer {
  const q = raw.trim().slice(0, 600);

  if (!q) {
    return {
      text: "Ask me anything about Adelia's work: what she's shipped, how she tests it, or whether she can start soon. I can also walk you to the right object in the room.",
      actions: [],
      followups: defaultFollowups,
      confidence: 1,
    };
  }

  if (/^(hi|hey|hello|halo|hai|yo|good (morning|afternoon|evening))\b[\s!.?]*$/i.test(q)) {
    return {
      text: "Hi! I'm Moci, Adelia's agent. I know her projects, her skills and this whole room. What would you like to know?",
      actions: [],
      followups: defaultFollowups,
      confidence: 1,
    };
  }

  if (/\b(who|what) are you\b|\bwhat('?s| is) your name\b|\bwho is moci\b|\bare you (a bot|an? ai|human|adelia|real|her)\b|\bwhat can you do\b/i.test(q)) {
    return {
      text: "I'm Moci, Adelia's agent: the clear jelly drop at the right end of her desk, not Adelia herself. I answer questions about her work and show where each answer comes from, and I can walk you to the right object in the room, copy her email or take you to the ticket printer to book a chat.",
      actions: [],
      followups: ['How is Moci tested?', 'What has she shipped?', 'Can she start soon?'],
      source: 'moci-evals',
      confidence: 1,
    };
  }

  if (/\b(apa kabar|terima kasih|bahasa indonesia|siapa kamu)\b/i.test(q)) {
    return {
      text: "Halo! Saya bisa sedikit Bahasa Indonesia, but this room speaks English so everyone can read it. Ask me anything about Adelia's work.",
      actions: [],
      followups: defaultFollowups,
      confidence: 0.9,
    };
  }

  // Sound
  if (/\b(sound|audio|sfx|music)\b.*\b(on|off)\b|\b(turn|switch)\b.*\b(on|off)\b.*\b(sound|audio)\b|\b(mute|unmute)\b/i.test(q)) {
    const on = !/\b(off|mute)\b/i.test(q) || /\bunmute\b/i.test(q);
    return { text: on ? 'Sound is on. Soft clicks and a little music.' : 'Sound is off.', actions: [{ type: 'sound', on }], followups: defaultFollowups, confidence: 1 };
  }

  // Moci's own evals: open them right here.
  if (/\b(how (are|is|were) (you|moci) (tested|evaluated|checked)|your (own )?evals?|moci'?s evals?|test(ing)? moci|(evals?|tests?) (of|for) moci|how (do|can) (i|we) trust you)\b/i.test(q)) {
    return {
      text: "I'm tested with 25 questions visitors ask, including ones that try to make me guess, exaggerate or leave the room. Press run and they go through my offline brain right here in your browser.",
      actions: [{ type: 'evals' }],
      followups: ['Show me her evals', 'What has she shipped?'],
      source: 'moci-evals',
      confidence: 1,
    };
  }

  // A look around the room.
  if (/\b(tour|show me around|walk me through|guide me|look around|what('?s| is) in (this|the) room)\b/i.test(q)) {
    return {
      text: 'Left to right: the chrome shelf is her toolkit, the four posters are her case studies, the pink printer books a chat, the mug checks whether she fits your role, the computer runs Adelia OS, and her ID card with the CV hangs on a hook. I sit at the right end of her desk.',
      actions: [],
      followups: ['Walk me to the Wall of Work', 'Book a chat', 'What has she shipped?'],
      source: 'room/gallery',
      confidence: 1,
    };
  }

  // Email
  if (/\bcopy\b.*\b(email|mail|address)\b|\b(her|the) email( address)?\b\s*[?.!]*$/i.test(q)) {
    return { text: `Copied: ${identity.email}. She usually replies within a day.`, actions: [{ type: 'copyEmail' }], followups: ['Book a chat', 'Can she start soon?'], confidence: 1 };
  }

  // CV
  if (/\b(cv|resume|résumé)\b/i.test(q) && /\b(download|get|see|show|open|where|send|grab|view|read)\b/i.test(q)) {
    return {
      text: 'Her CV is with her ID card, the lanyard on the hook. Walking you there.',
      actions: [{ type: 'walk', station: 'about' }],
      followups: ['Copy her email', 'What has she shipped?'],
      source: 'id-card',
      confidence: 1,
    };
  }

  // Booking
  if (/\b(book|schedule|set up|arrange|request)\b.*\b(chat|call|interview|meeting|slot|time)\b|\binterview her\b|^book\b/i.test(q)) {
    return {
      text: 'Taking you to the pink ticket printer: pick an intro call, an interview slot or a coffee chat, and it prints your ticket.',
      actions: [{ type: 'book' }],
      followups: ['Copy her email', 'Can she start soon?'],
      source: 'printer',
      confidence: 1,
    };
  }

  // Salary: never a number from me.
  if (/\b(salary|rate|pricing|price|cost|how much)\b.*\b(she|her|adelia|charge|expect|hire)\b|\bsalary\b|\bday rate\b|\bcompensation\b/i.test(q) && !mentionedProject(q)) {
    return {
      text: `That's best discussed directly: email ${identity.email} with a bit about the role and she'll reply within a day. She's happy to share a range early.`,
      actions: [],
      followups: ['Copy her email', 'Can she start soon?'],
      source: 'id-card',
      confidence: 0.9,
    };
  }

  // "What has she shipped?"
  if (/\bwhat\b.*\b(has she|did she|she has|she'?s)\b.*\b(ship|shipped|built|build|made|make|launched|done)\b|\b(shipped|built) anything\b/i.test(q) && !mentionedProject(q) && !/\bat\b/i.test(q)) {
    const lines = projects.map((p) => `${p.name}, ${p.year} (${p.context.toLowerCase()}): ${sentences(p.tldr.outcome, 1)}`);
    return {
      text: `${capital(numberWord(projects.length))} products with real users. ${lines.join(' ')}`,
      actions: [],
      followups: [`Walk me to ${projects[0].name}`, "What's her strongest project?", 'Show me her evals'],
      source: 'wall',
      confidence: 0.95,
    };
  }

  // Her evals, in general (a question about one project's evals goes to retrieval).
  if (/\b(evals?|evaluat\w*|test sets?|regression)\b/i.test(q) && !mentionedProject(q) && !/\b(you|moci)\b/i.test(q)) {
    const rule = principles.find((p) => /eval/i.test(p.title));
    const count = modelCard.evals.find((e) => /eval/i.test(e.name));
    const flagship = projects[0];
    return {
      text: [
        rule ? `${rule.title}, in her words: “${rule.body}”` : '',
        count ? `${count.name}: ${count.score}.` : '',
        `The fullest write-up is ${flagship.name}'s: ${sentences(flagship.engineering.evals.gate, 1)}`,
      ]
        .filter(Boolean)
        .join(' '),
      actions: [],
      followups: [`How did she evaluate ${flagship.name}?`, 'How is Moci tested?', 'What has she shipped?'],
      source: 'shelf/evals',
      confidence: 0.95,
    };
  }

  // Walking around the room
  const nav = q.match(/^(?:please\s+)?(?:go to|open|show(?: me)?|take me to|navigate to|bring me to|visit|walk(?: me)? (?:over )?to|lead me to)\s+(?:the\s+)?(.+?)[.!?]*$/i);
  if (nav) {
    if (/(:\/\/|www\.|\.[a-z]{2,}(\/|$))/i.test(nav[1])) {
      return {
        text: "I only walk you around this room, so I don't open outside links. Her case studies, CV and booking are all in here.",
        actions: [],
        followups: ['Walk me to the Wall of Work', 'Book a chat'],
        confidence: 0.9,
      };
    }
    const d = findDestination(nav[1]);
    if (d) return { text: d.say, actions: [d.action], followups: ['What has she shipped?', 'Can she start soon?'], source: d.source, confidence: 1 };
  }

  // Strongest / favourite project
  if (/\b(best|strongest|favou?rite|proudest|most impressive|flagship)\b.*\b(project|work|thing|product)\b/i.test(q)) {
    const p = projects[0];
    return {
      text: `${p.name}. ${p.summary} The numbers: ${p.results.metrics
        .slice(0, 2)
        .map((m) => `${m.value} ${m.label}`)
        .join('; ')}. What makes it her favourite: "${p.reflection.split('.')[0]}."`,
      actions: [],
      followups: [`Walk me to ${p.name}`, `What was hard about ${p.name}?`, `How did she evaluate ${p.name}?`],
      source: `wall/${p.slug}`,
      confidence: 0.95,
    };
  }

  // Honesty: questions that invite her to sound more experienced than she is get a straight answer.
  const org = namedEmployer(q);
  if (org && !onRecord(org)) return notOnRecord(org);

  // "What did she do at the HR startup?" / "What was her role at Tenderlens?": the line of her
  // record, cited to the case study it became (the internship is the Ask HR poster).
  const roleAt = q.match(
    /\b(?:what (?:did|does) she do|what was her (?:role|job|part|work)|(?:her|she) (?:role|job|part|work|time|did)|what did she (?:build|make|ship))\s+(?:at|for|with|on)\s+(?:the\s+|a\s+|an\s+)?([\w&.' -]{2,40}?)\s*(?:[?.!,]|$)/i,
  );
  if (roleAt && !/^\s*(did|has|does|was|is)\b/i.test(q)) {
    const where = roleAt[1].trim();
    const e = onRecord(where) ? experienceFor(where) : undefined;
    if (e) {
      const p = projectFor(where, e.title);
      return {
        text: `${e.period}: ${e.title}, ${e.org}. ${sentences(voice(e.summary), 2)}${p ? ` The ${p.name} case study on the wall shows her part in detail.` : ''}`,
        actions: [],
        followups: p ? [`Walk me to ${p.name}`, `How did she evaluate ${p.name}?`, 'Can she start soon?'] : ['What has she shipped?', 'Can she start soon?'],
        source: p ? `wall/${p.slug}` : 'id-card',
        confidence: 0.9,
      };
    }
    // a named organisation (capitalised) that isn't on her record: the same straight answer
    if (!onRecord(where) && /^[A-Z]/.test(where)) return notOnRecord(where);
  }
  // …and an organisation that *is* on her record gets the record, not a retrieval guess.
  if (org && /^\s*(did|has|does|was|is)\b/i.test(q)) {
    const e = experienceFor(org);
    const p = projectFor(org, e?.title ?? '');
    if (e) {
      return {
        text: `Yes, it's on her record: ${e.title} (${e.period}), ${e.org}.${p ? ` On the ${p.name} case study her role is "${p.role.title}".` : ''}`,
        actions: [],
        followups: p ? [`Walk me to ${p.name}`, 'Can she start soon?'] : ['What has she shipped?', 'Can she start soon?'],
        source: p ? `wall/${p.slug}` : 'id-card',
        confidence: 0.9,
      };
    }
  }
  // "Why her over a senior engineer?" is a fair question, not a claim: answer it straight.
  if (/\bwhy\b.*\b(hire|pick|choose|consider)\b|\b(over|instead of|rather than|compared (to|with)|versus|vs\.?)\b.*\b(senior|experienced)\b/i.test(q)) {
    return {
      text: 'Not for years of experience: she\'s a fresh graduate (Informatics, class of 2026), so a senior engineer brings more breadth and more systems seen in production. What she brings is the habit seniors ask juniors for: she ships with real users, writes evals with frozen test sets before trusting a model, keeps the failures visible, and designs the interface and the pipeline together. The case studies on the wall show each of those with the numbers.',
      actions: [],
      followups: ["What's her strongest project?", 'Show me her evals', 'Can she start soon?'],
      source: 'wall',
      confidence: 0.9,
    };
  }
  if (/\b(is|was|she'?s|she is|as a|claims?|calls? herself)\b[^?]*\b(senior|lead|staff|principal|expert|seasoned|veteran)\b/i.test(q)) {
    return {
      text: "No. She's a fresh graduate (Informatics, class of 2026), not a senior engineer: a six-month internship in a product squad, a part-time contract, and products she shipped with real users and evals.",
      actions: [],
      followups: ["What's her strongest project?", 'Why hire a new grad?'],
      source: 'id-card',
      confidence: 0.95,
    };
  }
  if (/\byears?\b.*\bexperience\b|\bexperience\b.*\byears?\b|\bhow (long|many years)\b.*\b(work|engineer|build|industry)/i.test(q)) {
    return {
      text: "She doesn't have full-time years yet: a six-month internship in 2025 and a part-time contract since April 2026, plus her own products since 2024. She graduated in 2026.",
      actions: [],
      followups: ['What did she do at the HR startup?', "What's her strongest project?"],
      source: 'id-card',
      confidence: 0.95,
    };
  }

  // Stack: a short answer in sentences; the full list is on her ID card.
  if (/\b(stack|tech|tools|languages|frameworks)\b/i.test(q) && !/\b(open|show|go to|walk|speak|spoken|english|indonesian|bahasa)\b/i.test(q) && !mentionedProject(q)) {
    return {
      text: 'TypeScript and Next.js for products, Python for ML services, PostgreSQL with pgvector for data. On the AI side: Claude with tool use, retrieval, Whisper for speech, and evals that run in CI. The full list is on her ID card.',
      actions: [],
      followups: ['Show me her evals', `How did she evaluate ${projects[0].name}?`],
      source: 'id-card',
      confidence: 0.95,
    };
  }

  // Availability and start date
  if (/\b(available|availability|open to work|hiring|hire her|looking for|job|role|start date|notice)\b|\b(start|join)\b.*\b(soon|when|quickly|asap|date)\b|\bwhen can she\b/i.test(q)) {
    const start = pick('Start');
    return {
      text: `Yes. ${bio.availability}${start ? ` She can start ${start.replace(/^[A-Z](?=[a-z])/, (c) => c.toLowerCase()).replace(/\.?$/, '.')}` : ''} She's in ${identity.location}, ${identity.timeZoneLabel}. The fastest route is email (${identity.email}) or a chat booked at the ticket printer.`,
      actions: [],
      followups: ['Book a chat', 'Copy her email', 'What has she shipped?'],
      source: 'id-card',
      confidence: 0.95,
    };
  }

  // "What is Catat?" / "Tell me about Lintas": the overview, not whichever detail scores highest.
  const named = mentionedProject(q);
  if (named) {
    const own = new Set([named.slug, ...tokenize(named.name)]);
    if (!tokenize(q).some((t) => !own.has(t) && !OVERVIEW_WORDS.has(t))) {
      return {
        text: `${named.name}, ${named.year}: ${named.kind}. ${named.summary} ${sentences(named.tldr.outcome, 1)}`,
        actions: [],
        followups: [`Walk me to ${named.name}`, `How did she evaluate ${named.name}?`, `What was hard about ${named.name}?`],
        source: `wall/${named.slug}`,
        confidence: 0.95,
      };
    }
  }

  // Retrieval (objects in the room only answer questions about the room)
  const roomish = ROOM_CUE.test(q);
  const hits = retrieve(q, 3, (d) => roomish || !d.id.startsWith('station-'));
  // Abstain when nothing matches well, or when the best doc only shares a word or two with a
  // longer question ("favourite pizza topping" shouldn't get her favourite problems).
  if (!hits.length || hits[0].score < 1.2 || hits[0].coverage < 0.5) {
    return {
      text: `I'm not sure about that one, and I'd rather not make things up. I know about Adelia's projects, skills, experience, availability and this room. For anything else, email ${identity.email}.`,
      actions: [],
      followups: defaultFollowups,
      confidence: 0.2,
    };
  }

  const [top, second] = hits;
  let text = sentences(top.doc.text, 3);
  if (second && second.score > top.score * 0.75 && second.doc.id.split('-')[0] !== top.doc.id.split('-')[0]) {
    text += ` ${sentences(second.doc.text, 1)}`;
  }
  const project = projects.find((p) => top.doc.id.startsWith(`project-${p.slug}`));
  const station = top.doc.id.startsWith('station-') ? (top.doc.id.slice(8) as StationId) : null;
  const followups = project
    ? [`Walk me to ${project.name}`, `What was hard about ${project.name}?`, "What's her strongest project?"]
    : station
      ? [`Walk me to ${spokenName(station)}`, 'What has she shipped?']
      : top.doc.id === 'skills'
        ? ['Show me her evals', 'Can she start soon?']
        : defaultFollowups.filter((f) => !f.toLowerCase().includes(top.doc.title.toLowerCase().split(' ')[0]));
  return { text, actions: [], followups: followups.slice(0, 3), source: top.doc.source, confidence: Math.min(1, top.score / 8) };
}

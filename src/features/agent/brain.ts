import { buildDocs, siteMap, type Doc } from "@/content/knowledge";
import { labItems } from "@/content/lab";
import { bio, identity } from "@/content/profile";
import { projects } from "@/content/projects";
import type { SiteAction } from "@/lib/actions";
import { fuzzyScore } from "@/lib/fuzzy";
import { namedEmployer, onRecord } from "./guards";

/**
 * Moci's offline brain. Used when the Claude API is unavailable (no key, rate limit, outage)
 * and for instant answers in the ⌘K palette and the terminal.
 * Intent rules first (things the visitor wants *done*), then BM25 retrieval over the
 * knowledge documents (things the visitor wants to *know*).
 */

export type BrainAnswer = {
  text: string;
  actions: SiteAction[];
  followups: string[];
  /** The page the answer is about, offered as a link. */
  href?: string;
  confidence: number;
};

const STOP = new Set(
  "a an the is are was were be been am i me my you your she her he his it its of to in on for with and or but at by from as that this these those what which who whom whose how why when where do does did can could should would will shall may might must have has had about into than then there their them they we our us so if not no yes please tell show give any some more most very just also like want know okay ok hey hi hello".split(
    " ",
  ),
);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP.has(w))
    .map((w) => (w.length > 4 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w));
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
export function retrieve(query: string, k = 3): { doc: Doc; score: number; coverage: number }[] {
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
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}

/** First n sentences of a text. */
function sentences(text: string, n: number): string {
  // Split only where a sentence really ends: punctuation, then a space, then a capital, digit or
  // quote. Decimals ("κ 0.87", "Rp 1.1M") and abbreviations ("B.Sc.") stay inside their sentence.
  const parts = text.split(/(?<=[.!?])\s+(?=[A-Z0-9"'“‘(])/);
  return parts.slice(0, n).join(" ").trim();
}

/** Things you can navigate to, for "open …" / "show me …" / "go to …". */
function destinations(): { label: string; href: string }[] {
  return [
    ...siteMap.map((s) => ({ label: s.title, href: s.path })),
    ...projects.map((p) => ({ label: p.name, href: `/work/${p.slug}` })),
    { label: "home", href: "/" },
    { label: "work projects portfolio", href: "/work" },
    { label: "cv resume", href: "/about" },
    { label: "game snake play", href: "/play" },
    ...labItems.filter((l) => l.where === "subdomain").map((l) => ({ label: l.name, href: "/lab" })),
  ];
}

export const defaultFollowups = ["What's her strongest project?", "Is she open to work?", "What's her stack?", "Give me the tour"];

export function think(raw: string): BrainAnswer {
  const q = raw.trim();

  if (!q) {
    return {
      text: "Ask me anything about Adelia's work: projects, skills, how she works, or whether she's available. I can also open pages for you.",
      actions: [],
      followups: defaultFollowups,
      confidence: 1,
    };
  }

  if (/^(hi|hey|hello|halo|hai|yo|good (morning|afternoon|evening))\b[\s!.?]*$/i.test(q)) {
    return {
      text: "Hi! I'm Moci, Adelia's agent. I know her projects, her skills and this whole site. What would you like to know?",
      actions: [],
      followups: defaultFollowups,
      confidence: 1,
    };
  }

  if (/\b(apa kabar|terima kasih|bahasa indonesia|siapa kamu)\b/i.test(q)) {
    return {
      text: "Halo! Saya bisa sedikit Bahasa Indonesia, but this site speaks English so everyone can read it. Ask me anything about Adelia's work.",
      actions: [],
      followups: defaultFollowups,
      confidence: 0.9,
    };
  }

  // Theme
  if (/\b(dark|night)\b.*\b(mode|theme|sky)\b|\bturn off the lights\b|\bgo dark\b/i.test(q)) {
    return { text: "Switching to the night sky. 🌙", actions: [{ type: "theme", value: "dark" }], followups: ["Back to daylight", "Give me the tour"], confidence: 1 };
  }
  if (/\b(light|day|bright)\b.*\b(mode|theme|sky)\b|\bback to daylight\b|\bturn on the lights\b/i.test(q)) {
    return { text: "Back to the day sky. ☀️", actions: [{ type: "theme", value: "light" }], followups: defaultFollowups, confidence: 1 };
  }

  // Tour
  if (/\b(tour|show me around|walk me through|guide me|autopilot)\b/i.test(q)) {
    return {
      text: "Buckle up. I'll drive for about 40 seconds; move your mouse or press Esc whenever you want the wheel back.",
      actions: [{ type: "tour" }],
      followups: [],
      confidence: 1,
    };
  }

  // Email / contact actions
  if (/\bcopy\b.*\b(email|mail|address)\b/i.test(q)) {
    return { text: `Copied: ${identity.email}. She usually replies within a day.`, actions: [{ type: "copyEmail" }], followups: ["Download her CV", "Is she open to work?"], confidence: 1 };
  }
  if (/\bdownload\b.*\b(cv|resume|résumé)\b|\b(cv|resume)\b.*\bdownload\b/i.test(q)) {
    return {
      text: "Here's her CV, generated from the same data as this site so it's always current.",
      actions: [{ type: "download", href: "/cv.pdf", filename: "Adelia-Tiara-CV.pdf" }],
      followups: ["Copy her email", "What's her strongest project?"],
      confidence: 1,
    };
  }
  if (/\b(salary|rate|pricing|price|cost|how much)\b.*\b(she|her|adelia|charge|expect|hire)\b|\bsalary\b|\bday rate\b/i.test(q)) {
    return {
      text: `That's best discussed directly. Email ${identity.email} with a bit about the role and she'll reply within a day.`,
      actions: [],
      followups: ["Copy her email", "Is she open to work?"],
      confidence: 0.9,
    };
  }

  // Navigation commands
  const nav = q.match(/^(?:please\s+)?(?:go to|open|show(?: me)?|take me to|navigate to|bring me to|visit)\s+(?:the\s+)?(.+?)[.!?]*$/i);
  if (nav) {
    const target = nav[1].replace(/\b(page|case study|project|section)\b/gi, "").trim();
    const best = destinations()
      .map((d) => ({ ...d, score: fuzzyScore(target, d.label) }))
      .sort((a, b) => b.score - a.score)[0];
    if (best && best.score > 40) {
      const pretty = siteMap.find((s) => s.path === best.href)?.title ?? best.label;
      return {
        text: `Opening ${pretty}.`,
        actions: [{ type: "navigate", href: best.href }],
        followups: ["Tell me about this page", "Give me the tour"],
        href: best.href,
        confidence: 1,
      };
    }
  }

  // Strongest / favourite project
  if (/\b(best|strongest|favou?rite|proudest|most impressive|flagship)\b.*\b(project|work|thing)\b/i.test(q)) {
    const p = projects[0];
    return {
      text: `${p.name}. ${p.summary} The numbers: ${p.results.metrics
        .slice(0, 2)
        .map((m) => `${m.value} ${m.label}`)
        .join("; ")}. What makes it her favourite: "${p.reflection.split(".")[0]}."`,
      actions: [],
      followups: [`Open ${p.name}`, "What was hard about it?", "What's her stack?"],
      href: `/work/${p.slug}`,
      confidence: 0.95,
    };
  }

  // Honesty: questions that invite her to sound more experienced than she is get a straight answer.
  const org = namedEmployer(q);
  if (org && !onRecord(org)) {
    return {
      text: `No: there's no job at ${org.replace(/^\w/, (c) => c.toUpperCase())} on her record. She did a six-month AI engineering internship at an HR software startup in Jakarta (2025) and has a part-time contract maintaining Tenderlens (2026); the rest is her own products.`,
      actions: [],
      followups: ["What did she do at the HR startup?", "Is she open to work?"],
      href: "/about",
      confidence: 0.9,
    };
  }
  if (/\bsenior\b|\b(lead|staff|principal|expert|seasoned|veteran)\s+(engineer|developer|designer)\b/i.test(q)) {
    return {
      text: "No. She's a fresh graduate (Informatics, class of 2026), not a senior engineer: a six-month internship in a product squad, a part-time contract, and products she shipped with real users and evals.",
      actions: [],
      followups: ["What's her strongest project?", "Is she open to work?"],
      href: "/about",
      confidence: 0.95,
    };
  }
  if (/\byears?\b.*\bexperience\b|\bexperience\b.*\byears?\b|\bhow (long|many years)\b.*\b(work|engineer|build|industry)/i.test(q)) {
    return {
      text: "She doesn't have full-time years yet: a six-month internship in 2025 and a part-time contract since April 2026, plus her own products since 2024. She graduated in 2026.",
      actions: [],
      followups: ["What did she do at the HR startup?", "What's her strongest project?"],
      href: "/about",
      confidence: 0.95,
    };
  }

  // Stack: a short answer in sentences; the full list lives on /about.
  if (/\b(stack|tech|tools|languages|frameworks)\b/i.test(q) && !/\b(open|show|go to)\b/i.test(q) && !projects.some((p) => q.toLowerCase().includes(p.name.toLowerCase()))) {
    return {
      text: "TypeScript and Next.js for products, Python for ML services, PostgreSQL with pgvector for data. On the AI side: Claude with tool use, retrieval, Whisper for speech, and evals that run in CI. The full list is on her About page.",
      actions: [],
      followups: ["Show me a project using agents", "How did she evaluate Tenderlens?"],
      href: "/about",
      confidence: 0.95,
    };
  }

  // Availability
  if (/\b(available|availability|open to work|hiring|hire her|looking for|job|role|start date|notice)\b/i.test(q)) {
    return {
      text: `Yes. ${bio.availability} She's in ${identity.location} (${identity.timeZoneLabel}). The fastest route is email: ${identity.email}.`,
      actions: [],
      followups: ["Copy her email", "Download her CV", "What's her strongest project?"],
      href: "/about",
      confidence: 0.95,
    };
  }

  // Retrieval
  const hits = retrieve(q, 3);
  // Abstain when nothing matches well, or when the best doc only shares a word or two with a
  // longer question ("favourite pizza topping" shouldn't get her favourite problems).
  if (!hits.length || hits[0].score < 1.2 || hits[0].coverage < 0.5) {
    return {
      text: `I'm not sure about that one, and I'd rather not make things up. I know about Adelia's projects, skills, experience, availability and this site. For anything else, email ${identity.email}.`,
      actions: [],
      followups: defaultFollowups,
      confidence: 0.2,
    };
  }

  const [top, second] = hits;
  let text = sentences(top.doc.text, 3);
  if (second && second.score > top.score * 0.75 && second.doc.id.split("-")[0] !== top.doc.id.split("-")[0]) {
    text += ` ${sentences(second.doc.text, 1)}`;
  }
  const project = projects.find((p) => top.doc.id.startsWith(`project-${p.slug}`));
  const followups = project
    ? [`Open ${project.name}`, `What was hard about ${project.name}?`, "What's her strongest project?"]
    : top.doc.id === "skills"
      ? ["Show me a project using agents", "Is she open to work?"]
      : defaultFollowups.filter((f) => !f.toLowerCase().includes(top.doc.title.toLowerCase().split(" ")[0]));
  return { text, actions: [], followups: followups.slice(0, 3), href: top.doc.href, confidence: Math.min(1, top.score / 8) };
}

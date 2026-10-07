import { projects } from "@/content/projects";

/**
 * A small, honest job-description matcher for AI product engineering roles. Each signal is a skill area with the phrases a JD uses
 * for it, whether Adelia has it, and the evidence. No model needed; Moci can add a second opinion.
 * CONTOH — ganti dengan data asli: adjust `have` and `evidence` to the real profile.
 */
export type Signal = {
  id: string;
  label: string;
  patterns: RegExp[];
  have: boolean;
  weight: number;
  evidence: string;
  project?: string;
};

export const SIGNALS: Signal[] = [
  {
    id: "llm",
    label: "LLM APIs and tool use",
    weight: 3,
    have: true,
    patterns: [/\bllms?\b/, /large language model/, /tool (use|calling)/, /function calling/, /\bagent(s|ic)?\b/, /claude|openai|anthropic|gpt/, /gen(erative)? ?ai/],
    evidence: "Claude with tool use in Catat's ledger agent and in this site's agent",
    project: "catat",
  },
  {
    id: "evals",
    label: "Evals and quality measurement",
    weight: 3,
    have: true,
    patterns: [/\bevals?\b/, /evaluation/, /benchmark/, /test sets?/, /quality (metrics|bar)/, /regression/, /accuracy/],
    evidence: "Frozen test sets, CI gates and error logs in every case",
    project: "tenderlens",
  },
  {
    id: "rag",
    label: "Retrieval and RAG",
    weight: 2,
    have: true,
    patterns: [/\brag\b/, /retrieval/, /vector/, /embedding/, /pgvector|pinecone|weaviate|semantic search/],
    evidence: "Hybrid search over client handbooks in Ask HR",
    project: "ask-hr",
  },
  {
    id: "product",
    label: "Product sense and user research",
    weight: 3,
    have: true,
    patterns: [/product (sense|thinking|mind)/, /user research/, /customers?/, /interview/, /discovery/, /end[- ]to[- ]end/, /own(ership)?/],
    evidence: "Field research with 9 bid teams and 27 warung before writing code",
    project: "catat",
  },
  {
    id: "frontend",
    label: "Front-end engineering",
    weight: 3,
    have: true,
    patterns: [/react/, /next\.?js/, /typescript/, /front[- ]?end/, /\bui\b/, /full[- ]?stack/],
    evidence: "React, Next.js and TypeScript in every product, and this site",
  },
  {
    id: "backend",
    label: "Back-end and data",
    weight: 2,
    have: true,
    patterns: [/back[- ]?end/, /\bapis?\b/, /postgres|sql|database/, /python/, /node(\.js)?/, /queues?|jobs?/],
    evidence: "Postgres job queues, FastAPI and Node services",
    project: "tenderlens",
  },
  {
    id: "design",
    label: "Interaction design and UX",
    weight: 2,
    have: true,
    patterns: [/\bux\b/, /interaction design/, /design(er)?s?\b/, /figma/, /prototyp/],
    evidence: "Designed every product she built; Figma and coded prototypes",
  },
  {
    id: "safety",
    label: "Reliability, guardrails and failure modes",
    weight: 2,
    have: true,
    patterns: [/guardrail/, /safety/, /hallucinat/, /reliab/, /fallback/, /human[- ]in[- ]the[- ]loop/, /trust/],
    evidence: "Abstention, citation checks in code, lane routing, undo",
    project: "ask-hr",
  },
  {
    id: "cost",
    label: "Latency and cost awareness",
    weight: 1,
    have: true,
    patterns: [/latency/, /cost/, /performance/, /scal(e|ing)/, /optimi[sz]/],
    evidence: "Cost per brief cut from Rp 1,900 to Rp 420; p50/p95 tracked",
    project: "tenderlens",
  },
  {
    id: "ml",
    label: "Classic ML and fine-tuning",
    weight: 1,
    have: true,
    patterns: [/machine learning|\bml\b/, /fine[- ]tun/, /classifier/, /speech|asr|whisper/, /pytorch|hugging ?face/],
    evidence: "Fine-tuned Whisper (WER 31% → 14%) and an IndoBERT router",
    project: "catat",
  },
  {
    id: "testing",
    label: "Testing and CI",
    weight: 1,
    have: true,
    patterns: [/testing/, /\bci\b|continuous integration/, /playwright|vitest|jest|pytest/],
    evidence: "Eval suites in CI; Playwright for the apps",
  },
  {
    id: "collab",
    label: "Working in a product squad",
    weight: 2,
    have: true,
    patterns: [/cross[- ]functional/, /collaborat/, /product managers?|\bpms?\b/, /designers?/, /squad|team/],
    evidence: "Six months in a squad: PM, engineers, a data scientist, a designer",
    project: "ask-hr",
  },
  {
    id: "indonesian",
    label: "Bahasa Indonesia",
    weight: 1,
    have: true,
    patterns: [/indonesia(n)?/, /bahasa/, /jakarta/, /southeast asia|\bsea\b/],
    evidence: "Native speaker; three products built for Indonesian users",
  },
  {
    id: "english",
    label: "English",
    weight: 1,
    have: true,
    patterns: [/english/, /written communication/, /communicat/, /writ(e|ing)/],
    evidence: "Works and writes in English, as these case studies show",
  },
  { id: "remote", label: "Remote-friendly", weight: 1, have: true, patterns: [/remote/, /distributed/, /async/, /hybrid/], evidence: "UTC+7, overlaps with Asia, Australia and Gulf mornings" },
  {
    id: "newgrad",
    label: "New grad or junior level",
    weight: 1,
    have: true,
    patterns: [/new grad|graduate|junior|entry[- ]level|early[- ]career/, /0[-–]2 years/],
    evidence: "B.Sc. Informatics, 2026, with an internship and three shipped products",
  },
  // Honest gaps
  {
    id: "years",
    label: "Several years of full-time experience",
    weight: 2,
    have: false,
    patterns: [/[3-9]\+? years/, /senior/, /staff/, /principal/],
    evidence: "Fresh graduate: a 6-month internship plus her own products",
  },
  {
    id: "scale",
    label: "Systems at millions of users",
    weight: 1,
    have: false,
    patterns: [/millions of users/, /high[- ]traffic/, /large[- ]scale/, /distributed systems/],
    evidence: "Up to about 12,000 users so far (Ask HR, as an intern)",
  },
  {
    id: "infra",
    label: "Training large models and ML infra",
    weight: 1,
    have: false,
    patterns: [/pre-?train/, /training infrastructure/, /\bgpu clusters?\b/, /\bmlops\b/, /kubernetes/],
    evidence: "Fine-tuning on a rented GPU, not training infrastructure",
  },
  { id: "native", label: "Native iOS and Android", weight: 1, have: false, patterns: [/\bios\b/, /android/, /swift|kotlin/], evidence: "Web, PWAs and WhatsApp, not native apps" },
];

export type MatchResult = {
  score: number;
  matched: Signal[];
  gaps: Signal[];
  projects: { slug: string; name: string; hits: number }[];
  words: number;
};

export function matchJD(raw: string): MatchResult {
  const text = raw.toLowerCase();
  const mentioned = SIGNALS.filter((s) => s.patterns.some((p) => p.test(text)));
  const matched = mentioned.filter((s) => s.have);
  const gaps = mentioned.filter((s) => !s.have);
  const total = mentioned.reduce((n, s) => n + s.weight, 0);
  const got = matched.reduce((n, s) => n + s.weight, 0);
  // With no recognised signals, there's nothing to score honestly.
  const score = total ? Math.round((got / total) * 100) : 0;
  const projectsRanked = projects
    .map((p) => {
      const stack = p.stack.join(" ").toLowerCase();
      const hits = matched.filter((s) => s.project === p.slug || s.patterns.some((re) => re.test(stack))).length;
      return { slug: p.slug, name: p.name, hits };
    })
    .filter((p) => p.hits > 0)
    .sort((a, b) => b.hits - a.hits);
  return { score, matched, gaps, projects: projectsRanked, words: raw.trim() ? raw.trim().split(/\s+/).length : 0 };
}

export const SAMPLE_JD = `AI Product Engineer, new grad (Remote, APAC)

We're a small startup building AI agents for operations teams in Southeast Asia. You'll own features end to end: talk to customers, prototype quickly, build with LLM APIs and tool use, write evals that tell us whether a change is better, and ship in TypeScript and React with a Python and Postgres backend.

You have: projects with real users; experience with retrieval, guardrails and failure modes; care for latency and cost; product sense and some design skill; clear written English. Nice to have: Bahasa Indonesia, fine-tuning, testing and CI.`;

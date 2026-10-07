import { projects } from "@/content/projects";

/**
 * A small, honest job-description matcher. Each signal is a skill area with the phrases a JD uses
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
  { id: "agents", label: "LLM agents and tool use", weight: 3, have: true, patterns: [/\bllms?\b/, /large language model/, /\bagent(s|ic)?\b/, /tool[- ]use/, /function[- ]calling/, /\bgen(erative)? ?ai\b/, /\bai (features|products?)\b/], evidence: "Agents with tools in all three products", project: "catat" },
  { id: "rag", label: "RAG and retrieval", weight: 3, have: true, patterns: [/\brag\b/, /retrieval/, /vector (db|database|search|store)/, /embedding/, /pgvector/, /semantic search/], evidence: "Citing extraction over 200-page PDFs", project: "tenderlens" },
  { id: "evals", label: "Evals and quality", weight: 3, have: true, patterns: [/\bevals?\b/, /evaluation/, /benchmark/, /quality (metrics|bar)/, /a\/b test/, /experiment/], evidence: "Eval sets of 240–500 real cases per product", project: "tenderlens" },
  { id: "prompting", label: "Prompt and context design", weight: 2, have: true, patterns: [/prompt/, /context (window|engineering)/, /fine[- ]tun/], evidence: "Prompt and context design for Indonesian input" },
  { id: "llm-apis", label: "LLM APIs (Claude, OpenAI)", weight: 2, have: true, patterns: [/claude/, /anthropic/, /openai/, /\bgpt/, /gemini/, /llm apis?/], evidence: "Claude API in production" },
  { id: "speech", label: "Speech and voice", weight: 1, have: true, patterns: [/speech/, /\bvoice\b/, /\bstt\b/, /\basr\b/, /transcri/], evidence: "Voice-note ledger with slang normalisation", project: "catat" },
  { id: "react", label: "React", weight: 2, have: true, patterns: [/\breact\b(?! native)/], evidence: "Every interface on this site" },
  { id: "next", label: "Next.js", weight: 2, have: true, patterns: [/next\.?js/, /\bnext\b(?= ?js)/], evidence: "This site and two of the products" },
  { id: "typescript", label: "TypeScript", weight: 2, have: true, patterns: [/typescript/, /\bts\b/], evidence: "Typed end to end" },
  { id: "frontend", label: "Frontend and UI engineering", weight: 2, have: true, patterns: [/front[- ]?end/, /\bui\b/, /css/, /tailwind/, /design systems?/, /animation/], evidence: "Design system, motion and accessibility on this site" },
  { id: "design", label: "Product and UX design", weight: 2, have: true, patterns: [/\bux\b/, /product design/, /figma/, /user research/, /prototyp/, /user interviews?/], evidence: "Field research with 27 warung owners", project: "catat" },
  { id: "fullstack", label: "Fullstack, end to end", weight: 3, have: true, patterns: [/full[- ]?stack/, /end[- ]to[- ]end/, /zero to one|0 to 1|0→1/, /own(ing|ership)? (the )?(whole|entire)/], evidence: "Sole engineer on three shipped products" },
  { id: "node", label: "Node.js", weight: 1, have: true, patterns: [/node(\.js)?\b/, /express/, /\bapis?\b/, /rest(ful)?\b/, /webhooks?/], evidence: "APIs, webhooks and queues" },
  { id: "python", label: "Python", weight: 1, have: true, patterns: [/python/, /fastapi/, /django/], evidence: "Extraction and eval pipelines" },
  { id: "sql", label: "Postgres and SQL", weight: 1, have: true, patterns: [/postgres/, /\bsql\b/, /database/, /supabase/], evidence: "Postgres + pgvector", project: "tenderlens" },
  { id: "realtime", label: "Realtime systems", weight: 1, have: true, patterns: [/real[- ]?time/, /websocket/, /streaming/, /\bsse\b/], evidence: "Live replanning and this site's live cursors", project: "lintas" },
  { id: "a11y", label: "Accessibility", weight: 1, have: true, patterns: [/accessib/, /\ba11y\b/, /wcag/], evidence: "Keyboard-first, reduced-motion paths, checked contrast" },
  { id: "shipping", label: "Shipping and DevOps basics", weight: 1, have: true, patterns: [/ci\/cd/, /docker/, /vercel/, /\baws\b/, /\bgcp\b/, /cloud/, /deploy/, /observability/], evidence: "CI/CD, Docker, Vercel, observability" },
  { id: "startup", label: "Startup pace and ownership", weight: 1, have: true, patterns: [/startup/, /fast[- ]paced/, /ambigu/, /autonom/, /self[- ]starter/, /ownership/], evidence: "Independent since 2024" },
  { id: "indonesian", label: "Bahasa Indonesia", weight: 1, have: true, patterns: [/indonesia(n)?/, /bahasa/, /jakarta/, /southeast asia|\bsea\b/], evidence: "Native speaker, based in Bekasi" },
  { id: "english", label: "English", weight: 1, have: true, patterns: [/english/, /written communication/, /communicat/], evidence: "Works and writes in English" },
  { id: "remote", label: "Remote-friendly", weight: 1, have: true, patterns: [/remote/, /distributed/, /async/, /hybrid/], evidence: "UTC+7, overlaps with Asia and Europe mornings" },
  // Honest gaps
  { id: "mobile", label: "Native mobile", weight: 1, have: false, patterns: [/react native/, /\bios\b/, /android/, /swift/, /kotlin/, /flutter/], evidence: "Web-first; mobile web and PWAs only" },
  { id: "training", label: "Training models from scratch", weight: 1, have: false, patterns: [/pytorch/, /tensorflow/, /jax/, /train(ing)? (large |foundation )?models?/, /pre[- ]?train/, /\bml research/, /\bphd\b/], evidence: "Applies models; doesn't train foundation models" },
  { id: "infra", label: "Heavy infrastructure", weight: 1, have: false, patterns: [/kubernetes|\bk8s\b/, /terraform/, /\bsre\b/, /distributed systems/], evidence: "Comfortable with Docker and managed platforms, not a platform engineer" },
  { id: "jvm", label: "Java, Go or Rust", weight: 1, have: false, patterns: [/\bjava\b/, /\bgolang\b|\bgo\b(?= developer| engineer|lang)/, /\brust\b/, /\bc\+\+/, /scala/], evidence: "Primarily TypeScript and Python" },
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

export const SAMPLE_JD = `AI Product Engineer (Remote, APAC)

We're a small startup building AI agents for operations teams in Southeast Asia. You'll own features end to end: talk to users, prototype in Figma or code, ship the React/Next.js interface and the TypeScript/Python backend, and build the LLM pipelines behind it (tool use, RAG over messy PDFs, evals that catch regressions).

You have: shipped LLM features to real users; strong TypeScript; Postgres; a habit of writing evals; clear written English. Nice to have: Bahasa Indonesia, speech/voice experience, React Native.`;

import { projects } from "@/content/projects";

/**
 * A small, honest job-description matcher for product design roles. Each signal is a skill area with the phrases a JD uses
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
  { id: "research", label: "User research", weight: 3, have: true, patterns: [/user research/, /research(er)?\b/, /interview/, /field (study|work|research)/, /discovery/, /ethnograph/, /contextual inquiry/], evidence: "Field research at 27 warung and with 9 bid teams", project: "catat" },
  { id: "framing", label: "Problem framing and product thinking", weight: 3, have: true, patterns: [/product think/, /problem (framing|definition|solving)/, /strateg/, /prioriti[sz]/, /trade-?offs?/, /outcomes?/, /\bjtbd\b|jobs to be done/], evidence: "Each case starts from one user decision and its trade-offs", project: "lintas" },
  { id: "interaction", label: "Interaction and UX design", weight: 3, have: true, patterns: [/\bux\b/, /interaction design/, /user experience/, /product design(er)?/, /flows?\b/, /information architecture/, /wireframe/], evidence: "End-to-end flows for three shipped products" },
  { id: "ai-ux", label: "Designing AI and LLM products", weight: 3, have: true, patterns: [/\bllms?\b/, /\bai\b/, /machine learning|\bml\b/, /\bagent(s|ic)?\b/, /gen(erative)? ?ai/, /copilot/, /conversational/, /chatbot/], evidence: "Citations, confidence and undo patterns across three AI products", project: "tenderlens" },
  { id: "prototyping", label: "Prototyping", weight: 2, have: true, patterns: [/prototyp/, /protopie/, /framer/, /high[- ]fidelity/, /\bhi-?fi\b/], evidence: "Paper to clickable to coded prototypes with real data" },
  { id: "figma", label: "Figma", weight: 2, have: true, patterns: [/figma/, /sketch\b/, /design tools?/], evidence: "Daily tool; libraries, variables and auto layout" },
  { id: "systems", label: "Design systems", weight: 2, have: true, patterns: [/design systems?/, /component librar/, /design tokens?/, /pattern librar/], evidence: "Token-based system behind this site and every lab experiment" },
  { id: "testing", label: "Usability testing and iteration", weight: 2, have: true, patterns: [/usability/, /user testing/, /a\/b test/, /experiment/, /iterat/, /validat/], evidence: "Tested every key screen with 5–12 people before shipping", project: "tenderlens" },
  { id: "writing", label: "UX writing and conversation design", weight: 2, have: true, patterns: [/ux writing|content design|microcopy/, /conversation design/, /copy\b/, /voice and tone|tone of voice/], evidence: "Wrote every message the Catat agent sends", project: "catat" },
  { id: "visual", label: "Visual and interface craft", weight: 2, have: true, patterns: [/visual design/, /\bui\b/, /typography/, /layout/, /pixel/, /craft/, /polish/, /aesthetic/], evidence: "This site: type, layout, motion and illustration" },
  { id: "motion", label: "Motion and micro-interaction", weight: 1, have: true, patterns: [/motion/, /animation/, /micro-?interaction/], evidence: "Purposeful motion with reduced-motion paths on this site" },
  { id: "a11y", label: "Accessibility", weight: 2, have: true, patterns: [/accessib/, /\ba11y\b/, /wcag/, /inclusive/], evidence: "Keyboard-first, reduced-motion paths, checked contrast" },
  { id: "data", label: "Metrics and outcomes", weight: 1, have: true, patterns: [/metrics?/, /analytics/, /data[- ]informed|data[- ]driven/, /\bkpis?\b/, /measur/], evidence: "Every case study reports measured outcomes" },
  { id: "collab", label: "Working with PMs and engineers", weight: 2, have: true, patterns: [/cross[- ]functional/, /collaborat/, /stakeholder/, /engineers?/, /product managers?|\bpms?\b/, /squad/], evidence: "Squad of six at a Jakarta startup; codes, so handoff is a pull request" },
  { id: "code", label: "Front-end code", weight: 1, have: true, patterns: [/\bhtml\b/, /\bcss\b/, /react/, /front[- ]?end/, /code/, /design engineer/], evidence: "React, Next.js and TypeScript; built this site" },
  { id: "mobile", label: "Mobile-first design", weight: 1, have: true, patterns: [/mobile/, /responsive/, /\bpwa\b/], evidence: "All three products are used mostly on phones" },
  { id: "startup", label: "Startup pace and ownership", weight: 1, have: true, patterns: [/startup/, /fast[- ]paced/, /ambigu/, /autonom/, /self[- ]starter/, /ownership/, /zero to one|0 to 1|0→1/], evidence: "Took three products from zero to real users" },
  { id: "indonesian", label: "Bahasa Indonesia", weight: 1, have: true, patterns: [/indonesia(n)?/, /bahasa/, /jakarta/, /southeast asia|\bsea\b/], evidence: "Native speaker, based in Bekasi" },
  { id: "english", label: "English", weight: 1, have: true, patterns: [/english/, /written communication/, /communicat/, /storytell/, /present/], evidence: "Works, writes and presents in English" },
  { id: "remote", label: "Remote-friendly", weight: 1, have: true, patterns: [/remote/, /distributed/, /async/, /hybrid/], evidence: "UTC+7, overlaps with Asia and Europe mornings" },
  // Honest gaps
  { id: "management", label: "Managing designers", weight: 1, have: false, patterns: [/manag(e|ing) (a )?(team|designers)/, /people manag/, /direct reports/, /design (lead|manager)/, /head of design/], evidence: "Has mentored, hasn't managed a team yet" },
  { id: "native", label: "Native iOS and Android at scale", weight: 1, have: false, patterns: [/\bios\b/, /android/, /human interface guidelines|\bhig\b/, /material design/], evidence: "Mobile web and PWAs, not native app guidelines at scale" },
  { id: "enterprise", label: "Large enterprise programmes", weight: 1, have: false, patterns: [/enterprise/, /\bsaas\b at scale|large[- ]scale/, /fortune 500/], evidence: "Small teams and pilots so far, up to a few thousand users" },
  { id: "brand", label: "Brand and marketing design", weight: 1, have: false, patterns: [/brand (design|identity)/, /marketing design/, /campaign/, /illustrat(or|ion) role/], evidence: "Product first; does illustration for her own work only" },
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

export const SAMPLE_JD = `Product Designer, AI (Remote, APAC)

We're a small startup building AI agents for operations teams in Southeast Asia. You'll own product design end to end: run user research and interviews, frame the problem, design flows and high-fidelity UI in Figma, prototype the tricky AI interactions, and work closely with engineers to ship them.

You have: a portfolio of shipped products with measurable outcomes; experience designing for AI or LLM features (trust, errors, human review); strong interaction and visual craft; a design systems mindset; clear written English. Nice to have: Bahasa Indonesia, front-end code, conversation design.`;

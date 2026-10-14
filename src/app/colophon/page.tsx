import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Metadata } from "next";
import Link from "next/link";
import { pageMeta } from "@/lib/meta";
import { PageTransition } from "@/components/PageTransition";
import { PageHeader } from "@/components/PageHeader";
import { MociEval } from "@/features/agent/MociEval";
import { MOCI_CASES } from "@/features/agent/evals";
import { runGuardChecks } from "@/features/agent/guard-checks";
import { buildKnowledgeText } from "@/content/knowledge";
import { perf } from "@/content/perf";
import { CodeBlock } from "@/features/case/CodeBlock";

export const metadata: Metadata = pageMeta({
  title: "How this site is built",
  description:
    "The engineering behind adelia.cc: Moci, its AI agent (Claude with tool use, server-side validation, signed history, an offline retrieval fallback and an eval you can run in your browser), and the rest of the stack.",
  path: "/colophon",
});

const ONLINE = [
  { step: "Ask", detail: "The browser sends the last 12 messages and the page you're on to /api/agent. Each message is capped at 2,000 characters." },
  {
    step: "Limit",
    detail:
      "20 requests per visitor per 10 minutes, and a ceiling of 300 answers a day across everyone, so a busy day or a script can't run up the bill. Past either, or with no API key, the browser switches to the offline brain.",
  },
  { step: "Ground", detail: "The system prompt is the knowledge base, generated from the same content files as these pages, so Moci can't drift from the site. It's prompt-cached." },
  { step: "Act", detail: "Claude can call 7 tools (navigate, sound, tour, copy email, CV, panels, lens). Every tool input is checked against an allow-list on the server before your screen changes." },
  { step: "Stream", detail: "Text and tool events stream back as NDJSON, at most 4 tool turns per answer. A refusal is answered politely instead of erroring." },
  { step: "Cite", detail: "Every factual answer ends with the page it came from, shown as a link. Only internal paths are linked, so a prompt can't inject a URL." },
  {
    step: "Sign",
    detail:
      "Each answer is signed (HMAC) when it's sent. The browser sends the conversation back each turn, and the server drops any earlier answer whose signature doesn't match, so nobody can put words in Moci's mouth.",
  },
  {
    step: "Break",
    detail: "If the stream breaks halfway, the half answer is thrown away and the offline brain answers instead. A tool that already ran stays done; nothing runs twice.",
  },
];

const OFFLINE = [
  { step: "Intents first", detail: "Rules for things you want done: open a page, switch the theme, copy the email, download the CV." },
  {
    step: "Honesty",
    detail: "Questions that invite an exaggeration ('is she senior?', 'did she work at Google?') get a plain answer from the record, using the same employer check as the server.",
  },
  { step: "Then retrieval", detail: "BM25 over about 40 small documents built from the content files, with a boost for each document's keywords." },
  { step: "Abstain", detail: "No answer if the best match scores low, or shares fewer than half of the question's words. It says so and suggests email." },
  { step: "Cite", detail: "Every answer links the page it came from." },
];

const STACK = [
  ["Framework", "Next.js 16 (App Router, server components, cached components), React 19, TypeScript"],
  ["Styling", "Tailwind CSS 4 on design tokens from a small shared package"],
  ["One source of truth", "Every number on the site, the CV PDF (generated with pdf-lib), the 40-second brief and Moci's knowledge come from the same content files"],
  ["Product screens", "The phones in the case studies are coded components, not images, so they stay sharp and readable at any size"],
  ["Live bits", "Presence and cursors over Server-Sent Events; weather and sea data from Open-Meteo, hidden when unavailable"],
  ["Accessibility", "Keyboard paths for everything, visible focus, reduced-motion versions of every animation, contrast checked on /styleguide"],
  ["Cheap phones", "With Save-Data on, or on phones that report 2 GB of memory or less, the WebGL sky stays a still image"],
  [
    "AI in how I build",
    "I use Claude Code for scaffolding, refactors and tests, and I review every diff. The eval sets, the labels, the rules and the verification code I write myself, because that's where the judgement is.",
  ],
];

const VALIDATOR = `function validToolInput(name: string, input: unknown): input is Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) return false;
  const value = input as Record<string, unknown>;
  switch (name) {
    case "navigate":
      return typeof value.path === "string" && PATHS.includes(value.path);
    case "set_sound":
      return typeof value.on === "boolean";
    case "open_panel":
      return value.panel === "brief" || value.panel === "terminal" || value.panel === "stickers";
    case "set_lens":
      return ["recruiter", "engineer", "designer", "curious"].includes(value.lens as string);
    case "start_tour":
    case "copy_email":
    case "download_cv":
      return true;
    default:
      return false; // an unknown tool never reaches the browser
  }
}`;

type OnlineEval = { ranAt: string; passed: number; total: number; results: { q: string; kind: string; pass: boolean; answer: string }[] };

/** The last run of scripts/eval-moci.mjs against the online brain, if there has been one. */
function onlineEval(): OnlineEval | null {
  const file = join(process.cwd(), "src/content/moci-online-eval.json");
  return existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as OnlineEval) : null;
}

/** Cost per online answer from the prompt's size and Opus 5.5 list prices: an estimate, not a measurement. */
function costs() {
  const prompt = Math.round(buildKnowledgeText().length / 4) + 900; // knowledge base, rules and tools
  const turn = 600 * 4e-6 + 450 * 20e-6; // ~600 new input tokens, ~450 out (thinking included)
  const warm = prompt * 0.2e-6 + turn; // the prompt read from cache
  const worst = prompt * 5e-6 + 3 * prompt * 0.2e-6 + 4 * turn; // a cold cache write, then four tool turns
  return { prompt: `${Math.round(prompt / 100) / 10}k`, warm: warm.toFixed(3), worst: worst.toFixed(2), day: Math.ceil(worst * 300) };
}

function Steps({ items }: { items: { step: string; detail: string }[] }) {
  return (
    <ol className="eng-pipeline">
      {items.map((s, i) => (
        <li key={s.step}>
          <span className="eng-pipeline__n" aria-hidden="true">
            {i + 1}
          </span>
          <span>
            <span className="font-semibold">{s.step}. </span>
            {s.detail}
          </span>
        </li>
      ))}
    </ol>
  );
}

function GuardTable({ checks }: { checks: ReturnType<typeof runGuardChecks> }) {
  const passed = checks.filter((c) => c.pass).length;
  return (
    <div>
      <p className="mb-4 text-16 font-bold" role="status">
        {passed} of {checks.length} passed{passed === checks.length ? "." : ": a guard is broken, and this page says so."}
      </p>
      <div className="case-table">
        <table>
          <caption>Each check: what was sent, what the guard must do, and whether it did</caption>
          <thead>
            <tr>
              <th scope="col">Guard</th>
              <th scope="col">Sent</th>
              <th scope="col">Must be</th>
              <th scope="col">Result</th>
            </tr>
          </thead>
          <tbody>
            {checks.map((c) => (
              <tr key={c.what}>
                <th scope="row">{c.area}</th>
                <td className="case-table__wrap">{c.what}</td>
                <td>{c.expect}</td>
                <td>
                  <span className="chip font-semibold" data-tone={c.pass ? "lime" : "red"}>
                    {c.pass ? "✓ Pass" : "✗ Fail"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function ColophonPage() {
  const guards = runGuardChecks();
  const online = onlineEval();
  const cost = costs();
  return (
    <PageTransition>
      <PageHeader
        id="colophon-title"
        label="Colophon"
        title="How this site is built"
        lead="This site is a product too. Here's its AI agent, how it's kept honest, an eval you can run right now, and the rest of the stack."
      />

      <section aria-labelledby="moci-title" className="container-page pt-12 pb-(--section-end) md:pt-16">
        <p className="type-eyebrow">The agent</p>
        <h2 id="moci-title" className="type-title mt-2">
          Moci, two brains
        </h2>
        <p className="mt-4 max-w-[62ch] text-18 text-muted">
          Moci answers questions about my work and can act on the page. When the API is available it&apos;s Claude with tool use; when it isn&apos;t, a small retrieval brain in your browser answers
          from the same knowledge base. Either way, it cites the page.
        </p>
        <div className="mt-10 grid gap-10 lg:grid-cols-2">
          <div>
            <h3 className="mb-5 text-24 font-bold tracking-[-0.025em]">Online: Claude with tools</h3>
            <Steps items={ONLINE} />
          </div>
          <div>
            <h3 className="mb-5 text-24 font-bold tracking-[-0.025em]">Offline: retrieval in your browser</h3>
            <Steps items={OFFLINE} />
          </div>
        </div>
        <div className="mt-12 grid gap-6">
          <CodeBlock
            file="features/agent/guards.ts"
            lang="ts"
            caption="The model proposes; the server disposes. A tool call only reaches your screen if its input passes this check."
            source={VALIDATOR}
          />
        </div>
        <p className="mt-6 max-w-[80ch] text-16 text-muted">
          Cost, estimated from token counts and Opus 5.5 list prices (not measured): about US${cost.warm} an answer with the {cost.prompt}-token prompt cached, up to US${cost.worst} with a cold
          cache and four tool turns. At 300 answers a day, the worst day stays under about US${cost.day}.
        </p>
      </section>

      <section id="guards" aria-labelledby="guards-title" className="container-page scroll-mt-24 pb-(--section-end)">
        <p className="type-eyebrow">Guardrails</p>
        <h2 id="guards-title" className="type-title mt-2">
          Checked when this page was built
        </h2>
        <p className="mt-4 mb-8 max-w-[62ch] text-18 text-muted">
          These call the same code the server runs on Claude&apos;s answers, with the inputs a model or a visitor could send. They run every time the site is built; a failure would show
          here.
        </p>
        <GuardTable checks={guards} />
      </section>

      <section id="eval" aria-labelledby="eval-title" className="container-page scroll-mt-24 pb-(--section-end)">
        <p className="type-eyebrow">Evals</p>
        <h2 id="eval-title" className="type-title mt-2">
          Moci&apos;s eval, in your browser
        </h2>
        <p className="mt-4 mb-8 max-w-[62ch] text-18 text-muted">
          {MOCI_CASES.length} questions: ones visitors ask, and ones that try to make it guess, exaggerate or leave the site. Each says what a good answer has to do: facts from the right source
          as whole sentences, actions, &ldquo;I don&apos;t know&rdquo;, and a plain &ldquo;no&rdquo; when the honest answer is no. It runs the offline brain, which is deterministic, so you can
          run it here. A known failure stays in the list until it&apos;s fixed.
        </p>
        <MociEval />
        {online ? (
          <p className="mt-6 flex max-w-[80ch] gap-3 rounded-[20px] border border-line px-5 py-4 text-16">
            <span className="type-pixel shrink-0 pt-1 text-ink">Online brain</span>
            <span>
              Last run against Claude on {online.ranAt.slice(0, 10)}: {online.passed} of {online.total} passed, including four attacks (a forged earlier answer, instructions hidden in a
              question, a link to open, a request for the prompt).
              {online.results.some((r) => !r.pass) && <> Failed: {online.results.filter((r) => !r.pass).map((r) => `“${r.q}”`).join(", ")}.</>}
            </span>
          </p>
        ) : (
          <p className="mt-6 flex max-w-[80ch] gap-3 rounded-[20px] border border-line px-5 py-4 text-16">
            <span className="type-pixel shrink-0 pt-1 text-ink">Online brain</span>
            <span>
              Not run yet. The same cases plus four attacks (a forged earlier answer, instructions hidden in a question, a link to open, a request for the prompt) run against Claude with{" "}
              <code className="font-mono text-14">npm run eval:moci</code>, and weekly in CI once an API key is set (about 30 calls, under US$1). The result will show here, failures included.
              Until then, the online brain is protected by its prompt and the guardrails above, not by a measured pass rate.
            </span>
          </p>
        )}
      </section>

      {perf.measuredOn && (
        <section id="speed" aria-labelledby="speed-title" className="container-page scroll-mt-24 pb-(--section-end)">
          <p className="type-eyebrow">On a cheap phone</p>
          <h2 id="speed-title" className="type-title mt-2">
            What this site costs to load
          </h2>
          <p className="mt-4 mb-8 max-w-[62ch] text-18 text-muted">
            Measured on {perf.measuredOn}: {perf.setup}, the median of three loads per page with scripts/measure-perf.mjs. The sky and the toys are the price of this site&apos;s personality;
            this is what that price is.
          </p>
          <div className="case-table">
            <table>
              <caption>Median of three loads per page</caption>
              <thead>
                <tr>
                  <th scope="col">Page</th>
                  <th scope="col">JavaScript downloaded</th>
                  <th scope="col">Largest content painted</th>
                  <th scope="col">Main thread blocked</th>
                </tr>
              </thead>
              <tbody>
                {perf.pages.map((r) => (
                  <tr key={r.page}>
                    <th scope="row">{r.page}</th>
                    <td>{r.js}</td>
                    <td>{r.lcp}</td>
                    <td>{r.blocking}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {perf.note && <p className="mt-4 max-w-[80ch] text-16">{perf.note}</p>}
        </section>
      )}

      <section aria-labelledby="stack-title" className="container-page pb-(--section)">
        <p className="type-eyebrow">The rest</p>
        <h2 id="stack-title" className="type-title mt-2">
          The stack
        </h2>
        <dl className="widget mt-10 grid gap-x-10 p-6 md:grid-cols-2 md:p-8">
          {STACK.map(([k, v]) => (
            <div key={k} className="grid gap-1 border-b border-line py-4 sm:grid-cols-[170px_minmax(0,1fr)] sm:gap-6">
              <dt className="text-14 font-semibold text-muted">{k}</dt>
              <dd className="text-16">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-16">
          <Link href="/styleguide" className="link-arrow">
            The design system
          </Link>
          <Link href="/work" className="link-arrow">
            The case studies
          </Link>
          <Link href="/lab" className="link-arrow">
            The lab
          </Link>
        </p>
      </section>
    </PageTransition>
  );
}

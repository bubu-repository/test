import type { Metadata } from "next";
import Link from "next/link";
import { pageMeta } from "@/lib/meta";
import { PageTransition } from "@/components/PageTransition";
import { PageHeader } from "@/components/PageHeader";
import { MociEval } from "@/features/agent/MociEval";
import { MOCI_CASES } from "@/features/agent/evals";
import { CodeBlock } from "@/features/case/CodeBlock";

export const metadata: Metadata = pageMeta({
  title: "How this site is built",
  description:
    "The engineering behind adelia.cc: Moci, its AI agent (Claude with tool use, server-side validation, an offline retrieval fallback and an eval you can run in your browser), and the rest of the stack.",
  path: "/colophon",
});

const ONLINE = [
  { step: "Ask", detail: "The browser sends the last 12 messages and the page you're on to /api/agent. Each message is capped at 2,000 characters." },
  { step: "Limit", detail: "20 requests per visitor per 10 minutes. Over the limit, or with no API key, the browser switches to the offline brain." },
  { step: "Ground", detail: "The system prompt is the knowledge base, generated from the same content files as these pages, so Moci can't drift from the site. It's prompt-cached." },
  { step: "Act", detail: "Claude can call 7 tools (navigate, theme, tour, copy email, CV, panels, lens). Every tool input is checked against an allow-list on the server before your screen changes." },
  { step: "Stream", detail: "Text and tool events stream back as NDJSON, at most 4 tool turns per answer. A refusal is answered politely instead of erroring." },
  { step: "Cite", detail: "Every factual answer ends with the page it came from, shown as a link. Only internal paths are linked, so a prompt can't inject a URL." },
];

const OFFLINE = [
  { step: "Intents first", detail: "Rules for things you want done: open a page, switch the theme, copy the email, download the CV." },
  { step: "Then retrieval", detail: "BM25 over about 40 small documents built from the content files, with a boost for each document's keywords." },
  { step: "Abstain", detail: "No answer if the best match scores low, or shares fewer than half of the question's words. It says so and suggests email." },
  { step: "Cite", detail: "Every answer links the page it came from." },
];

const STACK = [
  ["Framework", "Next.js 16 (App Router, server components, cached components), React 19, TypeScript"],
  ["Styling", "Tailwind CSS 4 on design tokens from a small shared package, also used by the five lab experiments on their own subdomains"],
  ["One source of truth", "Every number on the site, the CV PDF (generated with pdf-lib), the 40-second brief and Moci's knowledge come from the same content files"],
  ["Product screens", "The phones in the case studies are coded components, not images, so they stay sharp and readable at any size"],
  ["Live bits", "Presence and cursors over Server-Sent Events; weather and sea data from Open-Meteo, hidden when unavailable"],
  ["Accessibility", "Keyboard paths for everything, visible focus, reduced-motion versions of every animation, contrast checked on both themes"],
];

const VALIDATOR = `function validToolInput(name: string, input: unknown): input is Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) return false;
  const value = input as Record<string, unknown>;
  switch (name) {
    case "navigate":
      return typeof value.path === "string" && PATHS.includes(value.path);
    case "set_theme":
      return value.theme === "light" || value.theme === "dark";
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

export default function ColophonPage() {
  return (
    <PageTransition>
      <PageHeader
        id="colophon-title"
        label="Colophon"
        title="How this site is built"
        lead="This site is a product too. Here's its AI agent, how it's kept honest, an eval you can run right now, and the rest of the stack."
      />

      <section aria-labelledby="moci-title" className="container-page pt-12 pb-[clamp(72px,9vw,128px)] md:pt-16">
        <p className="type-eyebrow">The agent</p>
        <h2 id="moci-title" className="type-title mt-3">
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
        <div className="mt-12">
          <CodeBlock
            file="app/api/agent/route.ts"
            lang="ts"
            caption="The model proposes; the server disposes. A tool call only reaches your screen if its input passes this check."
            source={VALIDATOR}
          />
        </div>
      </section>

      <section id="eval" aria-labelledby="eval-title" className="container-page scroll-mt-24 pb-[clamp(72px,9vw,128px)]">
        <p className="type-eyebrow">Evals</p>
        <h2 id="eval-title" className="type-title mt-3">
          Moci&apos;s eval, in your browser
        </h2>
        <p className="mt-4 mb-8 max-w-[62ch] text-18 text-muted">
          {MOCI_CASES.length} questions visitors actually ask, with what a good answer has to do: facts with the right source, actions, saying &ldquo;I don&apos;t know&rdquo;, and not being talked
          into exaggerating. It runs the offline brain, which is deterministic, so you can run it here. A known failure stays in the list until it&apos;s fixed.
        </p>
        <MociEval />
      </section>

      <section aria-labelledby="stack-title" className="container-page pb-[clamp(96px,13vw,176px)]">
        <p className="type-eyebrow">The rest</p>
        <h2 id="stack-title" className="type-title mt-3">
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

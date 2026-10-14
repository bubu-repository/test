import type { Metadata } from "next";
import Link from "next/link";
import { pageMeta } from "@/lib/meta";
import { PageTransition } from "@/components/PageTransition";
import { PageHeader } from "@/components/PageHeader";
import { projects } from "@/content/projects";
import { WorkCards } from "@/features/work/WorkCards";

export const metadata: Metadata = pageMeta({
  title: "Work",
  description:
    "Four products designed and built by Adelia Tiara: Tenderlens, Ask HR, Catat and Lintas. Each case study shows the research, the design decisions and what they cost, the rounds that failed, the shipped screens and the results.",
  path: "/work",
});

/* A reading guide: which case answers which hiring question. CONTOH — ganti dengan data asli */
const GUIDE = [
  { q: "Can she build AI that knows when not to answer?", slug: "tenderlens", why: "Her thesis: citations checked in code, abstaining, a frozen test set and a CI gate." },
  { q: "Has she shipped inside a real team?", slug: "ask-hr", why: "Six months as an intern in a squad: a lane router, retrieval, a review queue, a weekly audit." },
  { q: "Can she build an agent that writes data safely?", slug: "catat", why: "Tool calls that create pending entries, money parsed in code, one-tap undo, idempotent webhooks." },
  { q: "Where does she put the model, and where not?", slug: "lintas", why: "Her own transit router, and a model that writes one sentence that code checks before anyone sees it." },
];

export default function WorkPage() {
  return (
    <PageTransition>
      <PageHeader
        id="work-title"
        label="Case studies"
        title="Four products, read in any order."
        lead="Each one answers a hiring question, with the engineering in its own section. Tenderlens is the full case, under 20 minutes; the others take 10 to 15."
      >
        <ul className="mx-auto mt-10 grid max-w-[880px] gap-2 text-left sm:grid-cols-2">
          {GUIDE.map((g) => {
            const p = projects.find((x) => x.slug === g.slug);
            if (!p) return null;
            return (
              <li key={g.slug}>
                <Link href={`/work/${p.slug}`} className="work-guide">
                  <span className="text-16 font-semibold">{g.q}</span>
                  <span className="mt-1 block text-14 text-muted">
                    <span className="font-semibold text-ink">{p.name}.</span> {g.why}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </PageHeader>

      <section aria-label="Case studies" className="container-page pt-12 pb-[clamp(96px,13vw,176px)] md:pt-16">
        {/* CONTOH — ganti dengan data asli */}
        <WorkCards projects={projects} headingLevel={2} />
      </section>

      <section aria-labelledby="also-title" className="container-page pb-[clamp(96px,13vw,176px)]">
        <h2 id="also-title" className="type-title">
          Also on this site
        </h2>
        <ul className="mt-8 grid gap-3 md:grid-cols-3">
          <li>
            <Link href="/colophon" className="widget block h-full p-6">
              <span className="text-18 font-bold">How this site is built</span>
              <span className="mt-1 block text-14 text-muted">Its AI agent (tool use, server-side validation, signed history, an offline fallback) and the eval you can run in your browser.</span>
            </Link>
          </li>
          <li>
            <Link href="/lab" className="widget block h-full p-6">
              <span className="text-18 font-bold">The lab</span>
              <span className="mt-1 block text-14 text-muted">A studio that turns your words or a photo into felt, jelly or chrome, one booster pack a day, and the JD matcher.</span>
            </Link>
          </li>
          <li>
            <a href="/cv.pdf" download="Adelia-Tiara-CV.pdf" className="widget block h-full p-6">
              <span className="text-18 font-bold">CV (PDF)</span>
              <span className="mt-1 block text-14 text-muted">One page: roles, dates, tools and education.</span>
            </a>
          </li>
        </ul>
      </section>
    </PageTransition>
  );
}

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
    "Four AI products designed by Adelia Tiara: Tenderlens, Ask HR, Catat and Lintas. Each case study shows the research, the design decisions and what they cost, the rounds that failed, the shipped screens and the results.",
  path: "/work",
});

/* A reading guide: which case answers which hiring question. CONTOH — ganti dengan data asli */
const GUIDE = [
  { q: "How do I work in a squad?", slug: "ask-hr", why: "In-house, with a PM and four engineers. A trade-off I argued for, and one I lost." },
  { q: "How do I design for an AI that can be wrong?", slug: "tenderlens", why: "Citations, abstaining, and a 'That's wrong' button, with the numbers behind each." },
  { q: "How do I do research with people who don't use apps?", slug: "catat", why: "Behind shop counters in Bekasi, designing inside WhatsApp, in Indonesian." },
  { q: "What do I leave out?", slug: "lintas", why: "A commute app that answers one question and stays quiet the rest of the time." },
];

export default function WorkPage() {
  return (
    <PageTransition>
      <PageHeader
        id="work-title"
        label="Case studies"
        title="Four products, read in any order."
        lead="Each case is about eight minutes: the problem, my role, the research, the decisions and what they cost, the rounds that failed, the shipped screens and the results. If you only have time for one, pick the question you're hiring for."
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
            <Link href="/styleguide" className="widget block h-full p-6">
              <span className="text-18 font-bold">The design system</span>
              <span className="mt-1 block text-14 text-muted">Tokens, type, components and the rules behind this site, documented the way I&apos;d hand them to engineers.</span>
            </Link>
          </li>
          <li>
            <Link href="/lab" className="widget block h-full p-6">
              <span className="text-18 font-bold">The lab</span>
              <span className="mt-1 block text-14 text-muted">Prototypes and toys: interaction experiments, a terminal, a game, and the work as trading cards.</span>
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

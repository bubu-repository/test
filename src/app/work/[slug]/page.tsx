import type { Metadata } from "next";
import type { ComponentType } from "react";
import { pageMeta } from "@/lib/meta";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, ArrowRightIcon } from "@/components/icons";
import { PageTransition } from "@/components/PageTransition";
import { adjacentProjects, getProject, projects, type Project } from "@/content/projects";
import { ArchitectureDiagram } from "@/features/case/ArchitectureDiagram";
import { AskAboutProject } from "@/features/case/AskAboutProject";
import { CaseStudyShell } from "@/features/case/CaseStudyShell";
import { CountUp } from "@/features/case/CountUp";
import { TraceRail, type TraceStep } from "@/features/case/TraceRail";
import { Phone } from "@/features/screens/Phone";
import { WIRES } from "@/features/screens/registry";
import { Screen } from "@/features/screens/Screen";
import { Polaroid } from "@/features/work/Polaroid";

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

/** Every case study is prerendered from generateStaticParams; reading the slug may block navigation. */
export const instant = false;

export async function generateMetadata({ params }: PageProps<"/work/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) return {};
  return pageMeta({
    title: `${project.name}: ${project.kind}`,
    description: `${project.tagline} A product design case study by Adelia Tiara: research, design decisions, iterations, the shipped screens and results.`,
    path: `/work/${project.slug}`,
    type: "article",
  });
}

const STEPS: TraceStep[] = [
  { id: "problem", label: "The problem" },
  { id: "role", label: "My role" },
  { id: "research", label: "Research" },
  { id: "decisions", label: "Design decisions" },
  { id: "iterations", label: "Iterations" },
  { id: "design", label: "The shipped design" },
  { id: "results", label: "Results" },
  { id: "reflection", label: "Reflection" },
];

/** Project tone → the glass tint used on its headline metric (colour stays an accent). */
const TONE_TINT: Record<string, string> = {
  magenta: "tone-accent",
  cobalt: "tone-sky",
  violet: "tone-violet",
  sun: "tone-sun",
  lime: "tone-lime",
};

function SectionHead({ index, eyebrow, title, id, lead }: { index: number; eyebrow: string; title: string; id: string; lead?: string }) {
  return (
    <header className="mb-8 md:mb-10">
      <p className="type-pixel text-accent-ink">
        {String(index).padStart(2, "0")} · {eyebrow}
      </p>
      <h2 id={`${id}-title`} className="type-title mt-3">
        {title}
      </h2>
      {lead && <p className="mt-3 max-w-[60ch] text-18 text-muted">{lead}</p>}
    </header>
  );
}

/** The case's cover: three shipped screens on a tinted stage, then the twenty-second version. */
function Cover({ project }: { project: Project }) {
  const [a, b, c] = project.screens;
  return (
    <section aria-label="Overview" className="container-page">
      <div className={`case-stage case-stage--${project.slug}`}>
        <div className="case-stage__phones">
          <Screen id={b.key} className="case-stage__side case-stage__side--l" />
          <Screen id={a.key} className="case-stage__main" label={`${project.name}: ${a.title}. ${a.caption}`} />
          <Screen id={c.key} className="case-stage__side case-stage__side--r" />
        </div>
      </div>
      <dl className="mt-6 grid gap-3 md:grid-cols-3">
        {(
          [
            ["The problem", project.tldr.problem],
            ["What I did", project.tldr.did],
            ["What happened", project.tldr.outcome],
          ] as const
        ).map(([k, v], i) => (
          <div key={k} className={i === 2 ? `widget ${TONE_TINT[project.tone] ?? "tone-accent"} p-6` : "widget p-6"}>
            <dt className="type-pixel text-muted">{k}</dt>
            <dd className="mt-2 text-16 leading-relaxed">{v}</dd>
          </div>
        ))}
      </dl>
      <dl className="mt-3 grid gap-x-6 gap-y-4 rounded-[24px] px-6 py-5 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Role", project.role.title],
          ["Team", project.team],
          ["Timeline", project.timeline],
          ["Tools", project.stack.slice(0, 4).join(", ")],
        ].map(([k, v]) => (
          <div key={k}>
            <dt className="text-12 text-muted">{k}</dt>
            <dd className="mt-0.5 text-16 font-semibold">{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export default async function CaseStudyPage({ params }: PageProps<"/work/[slug]">) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) notFound();
  const { prev, next } = adjacentProjects(project.slug);
  const i = projects.findIndex((p) => p.slug === project.slug) + 1;
  const wires: ComponentType[] = WIRES[project.slug] ?? [];

  return (
    <PageTransition>
      {/* CONTOH — ganti dengan data asli (all copy comes from src/content/projects.ts, the screens from features/screens) */}
      <CaseStudyShell project={project} next={next} index={i} total={projects.length} cover={<Cover project={project} />}>
        <div className="container-page grid gap-10 py-16 md:py-24 lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-20">
          <TraceRail steps={STEPS} slug={project.slug} />

          <article id="case-body" className="min-w-0 space-y-24 md:space-y-36">
            {/* 01 Problem */}
            <section id="problem" aria-labelledby="problem-title" className="scroll-mt-28">
              <SectionHead index={1} eyebrow="Problem" title="The problem" id="problem" />
              <figure className="widget relative max-w-[640px] p-5 md:p-6">
                <blockquote className="text-24 leading-snug font-semibold tracking-[-0.02em] md:text-32">“{project.prompt}”</blockquote>
                <figcaption className="mt-3 text-14 text-muted">— {project.promptBy}</figcaption>
              </figure>
              <div className="mt-8 max-w-[64ch] space-y-4 text-18">
                {project.problem.body.map((p) => (
                  <p key={p}>{p}</p>
                ))}
              </div>
              <h3 className="type-pixel mt-8 text-muted">Constraints</h3>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {project.problem.constraints.map((c) => (
                  <li key={c} className="rounded-[18px] bg-surface-2 px-4 py-3 text-16">
                    {c}
                  </li>
                ))}
              </ul>
            </section>

            {/* 02 Role */}
            <section id="role" aria-labelledby="role-title" className="scroll-mt-28">
              <SectionHead index={2} eyebrow="Role" title="My role" id="role" />
              <div className="grid gap-6 md:grid-cols-[1.2fr_1fr]">
                <div className="space-y-3 text-18">
                  <p className="text-24 font-bold tracking-[-0.025em]">{project.role.title}</p>
                  <p>{project.role.summary}</p>
                  <h3 className="type-pixel pt-4 text-muted">The calls that were mine</h3>
                  <ol className="space-y-2 text-16">
                    {project.role.decisions.map((d, n) => (
                      <li key={d} className="flex gap-3">
                        <span aria-hidden="true" className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-accent-soft font-mono text-12 font-bold text-on-fill">
                          {n + 1}
                        </span>
                        {d}
                      </li>
                    ))}
                  </ol>
                </div>
                <div className="widget self-start p-6">
                  <h3 className="type-pixel text-muted">Who I worked with</h3>
                  <ul className="mt-4 space-y-4">
                    {project.role.with.map((w) => (
                      <li key={w.who}>
                        <p className="text-16 font-semibold">{w.who}</p>
                        <p className="text-14 text-muted">{w.part}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <ol className="mt-10 grid gap-2 sm:grid-cols-2 lg:grid-cols-5" aria-label="How the project went">
                {project.process.map((step, n) => (
                  <li key={step.title} className="rounded-[20px] bg-surface-2 p-4">
                    <p className="type-pixel text-accent-ink">
                      {n + 1} · {step.stage}
                    </p>
                    <p className="mt-2 text-14 leading-snug font-semibold">{step.title}</p>
                    <p className="mt-1 text-12 text-muted">{step.duration}</p>
                  </li>
                ))}
              </ol>
            </section>

            {/* 03 Research */}
            <section id="research" aria-labelledby="research-title" className="scroll-mt-28">
              <SectionHead index={3} eyebrow="Research" title="What I learned in the field" id="research" />
              <ul className="grid gap-3 md:grid-cols-3">
                {project.research.methods.map((m) => (
                  <li key={m.label} className="widget p-5">
                    <p className="text-16 font-bold">{m.label}</p>
                    <p className="mt-1 text-14 text-muted">{m.detail}</p>
                  </li>
                ))}
              </ul>
              <ol className="mt-10 space-y-8">
                {project.research.insights.map((ins, n) => (
                  <li key={ins.title} className="grid gap-2 md:grid-cols-[56px_minmax(0,1fr)]">
                    <span aria-hidden="true" className="font-display text-48 leading-none font-bold text-accent-display">
                      {n + 1}
                    </span>
                    <div>
                      <h3 className="text-24 leading-tight font-bold tracking-[-0.025em]">{ins.title}</h3>
                      <p className="mt-2 max-w-[60ch] text-18">{ins.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <p className="mt-10 flex max-w-[72ch] gap-3 rounded-[20px] border border-line px-5 py-4 text-14 text-muted">
                <span className="type-pixel shrink-0 pt-0.5 text-ink">Consent &amp; data</span>
                {project.research.ethics}
              </p>
            </section>

            {/* 04 Decisions */}
            <section id="decisions" aria-labelledby="decisions-title" className="scroll-mt-28">
              <SectionHead index={4} eyebrow="Decisions" title="The decisions that shaped it" id="decisions" lead="What I considered, what I chose, why, and what it cost." />
              <ol className="space-y-5">
                {project.decisions.map((d, n) => (
                  <li key={d.title} className="widget p-6 md:p-8">
                    <p className="type-pixel text-muted">Decision {n + 1}</p>
                    <h3 className="mt-2 text-32 leading-tight font-bold tracking-[-0.03em]">{d.title}</h3>
                    <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                      <div>
                        <p className="text-14 font-semibold text-muted">Options I tried</p>
                        <ul className="mt-2 space-y-1.5">
                          {d.options.map((o, k) => {
                            const chosen = k === d.options.length - 1;
                            return (
                              <li key={o} className={chosen ? "flex gap-2.5 rounded-[14px] bg-accent-soft px-3 py-2 text-16 font-semibold text-on-fill" : "flex gap-2.5 px-3 py-2 text-16 text-muted line-through decoration-[1.5px]"}>
                                <span aria-hidden="true" className="no-underline">
                                  {chosen ? "✓" : "✗"}
                                </span>
                                <span>
                                  {o}
                                  <span className="sr-only">{chosen ? " (chosen)" : " (dropped)"}</span>
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                      <div className="space-y-4 text-16">
                        <p>
                          <span className="font-semibold">The call. </span>
                          {d.chose}
                        </p>
                        <p>
                          <span className="font-semibold">Why. </span>
                          {d.why}
                        </p>
                        <p className="rounded-[14px] bg-surface-2 px-4 py-3 text-14">
                          <span className="font-semibold">What it cost. </span>
                          {d.cost}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            {/* 05 Iterations */}
            <section id="iterations" aria-labelledby="iterations-title" className="scroll-mt-28">
              <SectionHead index={5} eyebrow="Iterations" title="Three rounds of the key screen" id="iterations" lead="Wireframes from each round of testing, and what people did with them." />
              <ol className="case-rounds">
                {project.iterations.map((it, n) => {
                  const Wire = wires[n];
                  return (
                    <li key={it.name} className="case-round" data-kept={it.kept || undefined}>
                      <div className="case-round__phone">
                        {Wire && (
                          <Phone className="dp--wire" label={`Round ${n + 1} wireframe: ${it.name}`}>
                            <Wire />
                          </Phone>
                        )}
                      </div>
                      <p className="mt-5 flex items-center gap-2">
                        <span className="type-pixel text-muted">Round {n + 1}</span>
                        <span className="chip" data-tone={it.kept ? "lime" : "red"}>
                          {it.kept ? "Shipped" : "Dropped"}
                        </span>
                      </p>
                      <h3 className="mt-2 text-24 leading-tight font-bold tracking-[-0.025em]">{it.name}</h3>
                      <p className="mt-2 text-16">{it.finding}</p>
                    </li>
                  );
                })}
              </ol>
            </section>

            {/* 06 The shipped design */}
            <section id="design" aria-labelledby="design-title" className="scroll-mt-28">
              <SectionHead index={6} eyebrow="Design" title="The shipped design" id="design" lead="The screens people use, including the ones for when the AI isn't sure or gets it wrong." />
              <ol className="case-screens">
                {project.screens.map((sc) => (
                  <li key={sc.key} className="case-screen">
                    <Screen id={sc.key} label={`${sc.title}. ${sc.caption}`} />
                    <h3 className="mt-5 text-18 font-bold tracking-[-0.02em]">{sc.title}</h3>
                    <p className="mt-1 text-14 text-muted">{sc.caption}</p>
                  </li>
                ))}
              </ol>
              <div className="mt-12 widget p-6 md:p-8">
                <p className="type-pixel text-muted">What didn&apos;t work</p>
                <h3 className="mt-2 text-24 font-bold tracking-[-0.025em]">{project.deadEnd.title}</h3>
                <p className="mt-2 max-w-[64ch] text-16">{project.deadEnd.body}</p>
              </div>
            </section>

            {/* 07 Results */}
            <section id="results" aria-labelledby="results-title" className="scroll-mt-28">
              <SectionHead index={7} eyebrow="Results" title="What happened" id="results" />
              <dl className="grid gap-3 sm:grid-cols-2">
                {project.results.metrics.map((m, n) => (
                  <div key={m.label} className={n === 0 ? `widget ${TONE_TINT[project.tone] ?? "tone-accent"} p-7` : "widget p-7"}>
                    <dt className="sr-only">{m.label}</dt>
                    <dd>
                      <CountUp value={m.value} className={n === 0 ? "iris-text block w-fit text-64 leading-none font-bold tracking-[-0.045em]" : "block text-64 leading-none font-bold tracking-[-0.045em]"} />
                      <span className="mt-3 block text-16" aria-hidden="true">
                        {m.label}
                      </span>
                      <span className="mt-3 block border-t border-dashed border-line pt-3 text-12 text-muted">How we measured: {m.how}</span>
                    </dd>
                  </div>
                ))}
              </dl>
              <div className="mt-8 max-w-[64ch] space-y-4 text-18">
                {project.results.body.map((p) => (
                  <p key={p}>{p}</p>
                ))}
              </div>
              <figure className="widget relative mt-10 p-7 md:p-10">
                <blockquote className="relative text-24 leading-snug font-semibold tracking-[-0.02em] md:text-32">“{project.results.quote.text}”</blockquote>
                <figcaption className="relative mt-3 text-14">— {project.results.quote.who}</figcaption>
              </figure>
              <details className="case-build mt-10">
                <summary>
                  <span className="text-18 font-bold tracking-[-0.02em]">How it&apos;s built</span>
                  <span className="text-14 text-muted">I prototype and ship in code. The system, for the curious.</span>
                </summary>
                <div className="pt-6">
                  <ArchitectureDiagram project={project} />
                  <ul className="mt-5 flex flex-wrap gap-1.5" aria-label="Tools">
                    {project.stack.map((t) => (
                      <li key={t} className="chip">
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>
              </details>
            </section>

            {/* 08 Reflection */}
            <section id="reflection" aria-labelledby="reflection-title" className="scroll-mt-28">
              <SectionHead index={8} eyebrow="Reflection" title="What I'd tell my past self" id="reflection" />
              <p className="max-w-[40ch] text-32 leading-[1.2] font-semibold tracking-[-0.025em]">{project.reflection}</p>
              <p className="mt-6 max-w-[60ch] text-18">
                <span className="font-semibold">Next: </span>
                {project.next}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <AskAboutProject name={project.name} />
                <a href={project.links.live} target="_blank" rel="noopener noreferrer" className="pill">
                  Live product ↗<span className="sr-only"> (opens in a new tab)</span>
                </a>
                <a href={project.links.repo} target="_blank" rel="noopener noreferrer" className="pill" data-variant="ghost">
                  Code ↗<span className="sr-only"> (opens in a new tab)</span>
                </a>
              </div>
            </section>
          </article>
        </div>
      </CaseStudyShell>

      {/* The other two projects, as prints pinned under the case. */}
      <nav aria-label="More projects" className="container-page pb-28">
        <p className="type-eyebrow text-center">Keep reading</p>
        <ul className="mx-auto mt-10 grid max-w-[760px] gap-x-12 gap-y-14 sm:grid-cols-2">
          {[
            { p: prev, dir: "Previous case", tilt: -2 },
            { p: next, dir: "Next case", tilt: 1.5 },
          ].map(({ p, dir, tilt }) => (
            <li key={dir} className="mx-auto w-full max-w-[320px]">
              <p className="mb-4 flex items-center gap-2 text-14 font-semibold text-muted">
                {dir === "Previous case" ? <ArrowLeftIcon className="shrink-0" /> : null}
                {dir}
                {dir === "Next case" ? <ArrowRightIcon className="shrink-0" /> : null}
              </p>
              <Polaroid project={p} tilt={tilt} />
            </li>
          ))}
        </ul>
      </nav>
    </PageTransition>
  );
}

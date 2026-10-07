import type { Metadata } from "next";
import { pageMeta } from "@/lib/meta";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, ArrowRightIcon } from "@/components/icons";
import { PageTransition } from "@/components/PageTransition";
import { adjacentProjects, getProject, projects } from "@/content/projects";
import { ArchitectureDiagram } from "@/features/case/ArchitectureDiagram";
import { AskAboutProject } from "@/features/case/AskAboutProject";
import { BeforeAfter } from "@/features/case/BeforeAfter";
import { CaseStudyShell } from "@/features/case/CaseStudyShell";
import { CountUp } from "@/features/case/CountUp";
import { TraceRail, type TraceStep } from "@/features/case/TraceRail";
import { ProjectMockup } from "@/features/work/ProjectMockup";

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/work/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) return {};
  return pageMeta({
    title: `${project.name}: ${project.kind}`,
    description: `${project.tagline} A case study by Adelia Tiara: problem, role, process and results.`,
    path: `/work/${project.slug}`,
    type: "article",
  });
}

const STEPS: TraceStep[] = [
  { id: "problem", label: "The problem", kind: "Input" },
  { id: "role", label: "My role", kind: "System" },
  { id: "process", label: "Process", kind: "Trace" },
  { id: "architecture", label: "Architecture", kind: "Tools" },
  { id: "before-after", label: "Before / after", kind: "Diff" },
  { id: "results", label: "Results", kind: "Output" },
  { id: "reflection", label: "Reflection", kind: "Eval" },
];

/** Project tone → the glass tint used on its headline metric (colour stays an accent). */
const TONE_TINT: Record<string, string> = {
  magenta: "tone-accent",
  cobalt: "tone-sky",
  sun: "tone-sun",
  lime: "tone-lime",
};

function SectionHead({ index, kind, title, id }: { index: number; kind: string; title: string; id: string }) {
  return (
    <header className="mb-8 md:mb-10">
      <p className="type-pixel text-accent-ink">
        Step {String(index).padStart(2, "0")} · {kind}
      </p>
      <h2 id={`${id}-title`} className="type-title mt-3">
        {title}
      </h2>
    </header>
  );
}

export default async function CaseStudyPage({ params }: PageProps<"/work/[slug]">) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) notFound();
  const { prev, next } = adjacentProjects(project.slug);
  const i = projects.findIndex((p) => p.slug === project.slug) + 1;

  return (
    <PageTransition>
      {/* CONTOH — ganti dengan data asli (all copy comes from src/content/projects.ts) */}
      <CaseStudyShell project={project} next={next} index={i} total={projects.length}>
        <section aria-label="Overview" className="container-page">
          <div className="widget overflow-hidden rounded-[36px] p-3 md:p-4">
            <div className="aspect-[16/10] overflow-hidden rounded-[26px] md:aspect-[16/8]">
              <ProjectMockup project={project} size="hero" />
            </div>
            <dl className="grid gap-x-6 gap-y-4 px-3 pt-6 pb-3 sm:grid-cols-3 md:px-5 md:pt-7">
              {[
                ["Role", project.role.title],
                ["Team", project.team],
                ["Timeline", project.timeline],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-12 text-muted">{k}</dt>
                  <dd className="mt-0.5 text-16 font-semibold">{v}</dd>
                </div>
              ))}
            </dl>
            <ul className="flex flex-wrap gap-1.5 px-3 pb-3 md:px-5 md:pb-4" aria-label="Stack">
              {project.stack.map((t) => (
                <li key={t} className="chip">
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <div className="container-page grid gap-10 py-16 md:py-24 lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-20">
          <TraceRail steps={STEPS} slug={project.slug} />

          <article id="case-body" className="min-w-0 space-y-24 md:space-y-36">
            {/* 01 Problem */}
            <section id="problem" aria-labelledby="problem-title" className="scroll-mt-28">
              <SectionHead index={1} kind="Input" title="The problem" id="problem" />
              <figure className="widget relative max-w-[640px] p-5 md:p-6">
                <span aria-hidden="true" className="absolute -top-3 left-6 rounded-pill bg-ink px-2.5 py-1 font-mono text-12 text-on-ink">
                  user ›
                </span>
                <blockquote className="text-24 leading-snug font-semibold tracking-[-0.02em] md:text-32">“{project.prompt}”</blockquote>
                <figcaption className="mt-3 text-14 text-muted">— {project.promptBy}</figcaption>
              </figure>
              <div className="mt-8 max-w-[64ch] space-y-4 text-18">
                {project.problem.body.map((p) => (
                  <p key={p}>{p}</p>
                ))}
              </div>
              <h3 className="type-pixel mt-8 text-muted">Constraints</h3>
              <ul className="mt-3 flex flex-wrap gap-2">
                {project.problem.constraints.map((c) => (
                  <li key={c} className="chip h-auto min-h-9 px-3.5 py-1.5 text-14 font-medium whitespace-normal">
                    {c}
                  </li>
                ))}
              </ul>
            </section>

            {/* 02 Role */}
            <section id="role" aria-labelledby="role-title" className="scroll-mt-28">
              <SectionHead index={2} kind="System" title="My role" id="role" />
              <div className="grid gap-6 md:grid-cols-[1.2fr_1fr]">
                <div className="space-y-3 text-18">
                  <p className="text-24 font-bold tracking-[-0.025em]">{project.role.title}</p>
                  <p>{project.role.summary}</p>
                </div>
                <div className="widget p-5">
                  <p className="type-pixel text-muted">What I owned</p>
                  <ul className="mt-3 space-y-2.5">
                    {project.role.ownership.map((o) => (
                      <li key={o.area}>
                        <div className="flex justify-between text-14 font-semibold">
                          <span>{o.area}</span>
                          <span className="font-mono">{o.pct}%</span>
                        </div>
                        <div className="mt-1 h-2.5 overflow-hidden rounded-pill bg-surface-2" aria-hidden="true">
                          <div className="h-full rounded-pill bg-accent" style={{ width: `${o.pct}%` }} />
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>

            {/* 03 Process */}
            <section id="process" aria-labelledby="process-title" className="scroll-mt-28">
              <SectionHead index={3} kind="Trace" title="Process" id="process" />
              <ol className="relative space-y-4 border-l-2 border-dashed border-line pl-6 md:pl-8">
                {project.process.map((step, n) => (
                  <li key={step.call} className="relative">
                    <span
                      aria-hidden="true"
                      className="absolute top-5 -left-[33px] grid size-4 place-items-center rounded-full bg-accent shadow-[0_0_0_4px_var(--bg)] md:-left-[41px]"
                    />
                    <div className="widget p-5 md:p-6">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <code className="rounded-xs bg-surface-2 px-2 py-1 text-14 font-semibold text-cobalt">
                          {n + 1}. {step.call}
                        </code>
                        <span className="type-pixel text-muted">{step.duration}</span>
                      </div>
                      <h3 className="mt-3 text-24 font-bold tracking-[-0.025em]">{step.title}</h3>
                      <p className="mt-2 max-w-[62ch] text-16">{step.body}</p>
                      <p className="type-pixel mt-3 text-[10px] text-muted">✓ returned</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            {/* 04 Architecture */}
            <section id="architecture" aria-labelledby="architecture-title" className="scroll-mt-28">
              <SectionHead index={4} kind="Tools" title="How it fits together" id="architecture" />
              <ArchitectureDiagram project={project} />
            </section>

            {/* 05 Before / after */}
            <section id="before-after" aria-labelledby="before-after-title" className="scroll-mt-28">
              <SectionHead index={5} kind="Diff" title="Before and after" id="before-after" />
              <p className="mb-5 text-16 text-muted">Drag the divider (or use the arrow keys) to compare.</p>
              <BeforeAfter data={project.beforeAfter} />
            </section>

            {/* 06 Results */}
            <section id="results" aria-labelledby="results-title" className="scroll-mt-28">
              <SectionHead index={6} kind="Output" title="Results" id="results" />
              <dl className="grid gap-3 sm:grid-cols-2">
                {project.results.metrics.map((m, n) => (
                  <div key={m.label} className={n === 0 ? `widget ${TONE_TINT[project.tone] ?? "tone-accent"} p-7` : "widget p-7"}>
                    <dt className="sr-only">{m.label}</dt>
                    <dd>
                      <CountUp
                        value={m.value}
                        className={
                          n === 0
                            ? "iris-text block w-fit text-64 leading-none font-bold tracking-[-0.045em]"
                            : "block text-64 leading-none font-bold tracking-[-0.045em]"
                        }
                      />
                      <span className="mt-3 block text-16 text-muted" aria-hidden="true">
                        {m.label}
                      </span>
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
            </section>

            {/* 07 Reflection */}
            <section id="reflection" aria-labelledby="reflection-title" className="scroll-mt-28">
              <SectionHead index={7} kind="Eval" title="What I'd tell my past self" id="reflection" />
              <p className="max-w-[40ch] text-32 leading-[1.2] font-semibold tracking-[-0.025em]">{project.reflection}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <AskAboutProject name={project.name} />
                <a href={project.links.live} target="_blank" rel="noopener noreferrer" className="pill">
                  Live site ↗<span className="sr-only"> (opens in a new tab)</span>
                </a>
                <a href={project.links.repo} target="_blank" rel="noopener noreferrer" className="pill" data-variant="ghost">
                  Repo ↗<span className="sr-only"> (opens in a new tab)</span>
                </a>
              </div>
            </section>
          </article>
        </div>
      </CaseStudyShell>

      <nav aria-label="More projects" className="container-page grid gap-4 pb-24 sm:grid-cols-2">
        {[
          { p: prev, dir: "Previous" },
          { p: next, dir: "Next" },
        ].map(({ p, dir }) => (
          <Link
            key={dir}
            href={`/work/${p.slug}`}
            className="widget group flex items-center justify-between gap-4 p-6 transition-transform hover:-translate-y-1 motion-reduce:transition-none"
          >
            {dir === "Previous" && <ArrowLeftIcon className="shrink-0" />}
            <span className={dir === "Next" ? "min-w-0" : "min-w-0 flex-1 text-right"}>
              <span className="type-pixel block text-muted">{dir} case</span>
              <span className="block text-32 font-bold tracking-[-0.03em]">{p.name}</span>
              <span className="block truncate text-14 text-muted">{p.kind}</span>
            </span>
            {dir === "Next" && <ArrowRightIcon className="shrink-0" />}
          </Link>
        ))}
      </nav>
    </PageTransition>
  );
}

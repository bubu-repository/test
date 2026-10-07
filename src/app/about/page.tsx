import type { Metadata } from "next";
import { pageMeta } from "@/lib/meta";
import { PageTransition } from "@/components/PageTransition";
import { PageHeader } from "@/components/PageHeader";
import { bio, experience, identity, modelCard, principles, skills } from "@/content/profile";
import { JdMatcher } from "@/features/about/JdMatcher";
import { IdBadge } from "@/features/hero/IdBadge";
import { ProfileCard } from "@/features/about/ProfileCard";
import { OffTheClock } from "@/features/about/music/OffTheClock";

export const metadata: Metadata = pageMeta({
  title: "About",
  description: `About ${identity.name}, a product designer for AI products in ${identity.location}: how she works, background, skills, a CV to download and a job-description matcher.`,
  path: "/about",
});

const DOT: Record<string, string> = {
  magenta: "bg-accent",
  cobalt: "bg-cobalt",
  lime: "bg-lime",
  sun: "bg-sun",
  violet: "bg-violet",
};

function CardList({ title, items }: { title: string; items: readonly string[] }) {
  return (
    <div>
      <h3 className="text-14 font-semibold text-muted">{title}</h3>
      <ul className="mt-2 space-y-1.5 text-16">
        {items.map((t) => (
          <li key={t} className="flex gap-2.5">
            <span aria-hidden="true" className="mt-2.5 size-1.5 shrink-0 rounded-full bg-accent" />
            {t}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function AboutPage() {
  return (
    <PageTransition>
      {/* CONTOH — ganti dengan data asli (bio.short) */}
      <PageHeader
        id="about-title"
        label="About"
        title={
          <>
            Hi, I&apos;m <span className="sticker-text">{identity.firstName}</span>.
          </>
        }
        lead={bio.short}
      >
        {/* Her ID card on a lanyard: under the intro on small screens, hanging from the top edge on wide ones. Drag it, flip it. */}
        <div className="mt-10 flex justify-center xl:pointer-events-none xl:absolute xl:top-0 xl:right-[var(--gutter)] xl:mt-0 xl:block">
          <IdBadge strap={64} className="xl:pointer-events-auto xl:origin-top xl:scale-90" />
        </div>
      </PageHeader>

      <div className="container-page section-y grid items-start gap-12 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-20">
        <div className="min-w-0">
          <section aria-labelledby="story-title">
            <h2 id="story-title" className="type-title">
              The short story
            </h2>
            <div className="mt-6 max-w-[62ch] space-y-5 text-18 leading-relaxed">
              {bio.long.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
            <p className="mt-8 inline-flex max-w-full items-start gap-3 rounded-[20px] bg-surface-2 px-4 py-3 text-16">
              <span className="type-pixel mt-0.5 shrink-0 text-accent-ink">Now</span>
              <span>{bio.now}</span>
            </p>
          </section>

          <section aria-labelledby="path-title" className="mt-20">
            <h2 id="path-title" className="type-title">
              Path so far
            </h2>
            <ol className="mt-8 space-y-3">
              {experience.map((e) => (
                <li key={e.title} className="widget grid gap-1 p-5 sm:grid-cols-[150px_minmax(0,1fr)] sm:gap-6 md:p-6">
                  <p className="text-14 font-semibold text-muted tabular-nums">{e.period}</p>
                  <div>
                    <p className="text-18 font-bold tracking-[-0.02em]">{e.title}</p>
                    <p className="text-14 text-muted">{e.org}</p>
                    <p className="mt-2 text-16">{e.summary}</p>
                    {e.highlights && (
                      <ul className="mt-3 space-y-1.5 text-14 text-muted">
                        {e.highlights.map((h) => (
                          <li key={h} className="flex gap-2.5">
                            <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
                            {h}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <div className="lg:sticky lg:top-28">
          <ProfileCard />
        </div>
      </div>

      <section aria-labelledby="principles-title" className="container-page pb-[clamp(96px,13vw,176px)]">
        <p className="type-eyebrow">How I work</p>
        <h2 id="principles-title" className="type-title mt-3">
          Four rules I design by
        </h2>
        {/* CONTOH — ganti dengan data asli */}
        <ol className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {principles.map((p, i) => (
            <li key={p.title} className="widget p-6">
              <p className="font-mono text-12 font-semibold text-accent-ink">0{i + 1}</p>
              <h3 className="mt-3 text-20 leading-tight font-bold tracking-[-0.02em]">{p.title}</h3>
              <p className="mt-2 text-16 text-muted">{p.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="skills-title" className="container-page pb-[clamp(96px,13vw,176px)]">
        <p className="type-eyebrow">Toolbox</p>
        <h2 id="skills-title" className="type-title mt-3">
          What I work with
        </h2>
        {/* CONTOH — ganti dengan data asli */}
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {skills.map((g) => (
            <div key={g.name} className="widget p-6">
              <h3 className="flex items-center gap-2 text-18 font-bold tracking-[-0.02em]">
                <span aria-hidden="true" className={`size-2.5 rounded-full ${DOT[g.tone]}`} />
                {g.name}
              </h3>
              <ul className="mt-4 flex flex-wrap gap-1.5">
                {g.items.map((s) => (
                  <li key={s} className="chip">
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section id="match" aria-labelledby="match-title" className="container-page scroll-mt-24 pb-[clamp(96px,13vw,176px)]">
        <p className="type-eyebrow">For recruiters</p>
        <h2 id="match-title" className="type-title mt-3">
          Does she fit your role?
        </h2>
        <p className="mt-4 mb-10 max-w-[56ch] text-muted">
          Paste a job description. The matcher runs in your browser, shows the evidence for every match, and is honest about the gaps.
        </p>
        <JdMatcher />
      </section>

      <section id="model-card" aria-labelledby="model-title" className="container-page scroll-mt-24 pb-[clamp(72px,9vw,128px)]">
        <p className="type-eyebrow">If I were a model</p>
        <h2 id="model-title" className="type-title mt-3">
          Model card
        </h2>
        {/* CONTOH — ganti dengan data asli */}
        <div className="widget mt-10 rounded-[36px] p-6 md:p-10" data-xr="Model card · rendered from content/profile.ts">
          <div className="flex flex-wrap items-center gap-3 border-b border-line pb-6">
            <span className="font-mono text-20 font-semibold">adelia-tiara</span>
            <span className="chip" data-tone="magenta">
              {modelCard.version}
            </span>
            <span className="chip">Bekasi · {identity.timeZoneLabel}</span>
            <p className="w-full text-16 text-muted md:ml-auto md:w-auto">{modelCard.architecture}</p>
          </div>
          <div className="grid gap-8 pt-8 md:grid-cols-2">
            <CardList title="Training data" items={modelCard.trainingData} />
            <CardList title="Intended use" items={modelCard.intendedUse} />
            <CardList title="Out of scope" items={modelCard.outOfScope} />
            <CardList title="Known limitations" items={modelCard.limitations} />
          </div>
          <h3 className="mt-10 text-14 font-semibold text-muted">Evals</h3>
          <dl className="mt-3 grid gap-px overflow-hidden rounded-[20px] border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
            {modelCard.evals.map((e) => (
              <div key={e.name} className="bg-surface px-5 py-4">
                <dt className="text-14 text-muted">{e.name}</dt>
                <dd className="mt-1 text-24 font-bold tracking-[-0.03em]">{e.score}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <OffTheClock />
    </PageTransition>
  );
}

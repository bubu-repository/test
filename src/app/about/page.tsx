import type { Metadata } from "next";
import { pageMeta } from "@/lib/meta";
import { PageTransition } from "@/components/PageTransition";
import { PageHeader } from "@/components/PageHeader";
import { bio, experience, identity, practical, skills, socials } from "@/content/profile";
import { Desk } from "@/features/about/desk/Desk";
import { ProfileCard } from "@/features/about/ProfileCard";
import { OffTheClock } from "@/features/about/games/OffTheClock";

export const metadata: Metadata = pageMeta({
  title: "About",
  description: `About ${identity.name}, an AI product engineer (${identity.degree}, ${identity.cohort.toLowerCase()}) in ${identity.location}: her story, path, skills, the practical details for hiring teams, and a CV to download.`,
  path: "/about",
});

const DOT: Record<string, string> = {
  magenta: "bg-accent",
  cobalt: "bg-cobalt",
  lime: "bg-lime",
  sun: "bg-sun",
  violet: "bg-violet",
};

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
      />

      {/* Her desk: the monitor and the DAC (her songs), the ID card, the laptop, the aquarium (the guestbook). */}
      <Desk />

      <div className="container-page section-y grid items-start gap-12 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-20">
        <div className="min-w-0">
          <section aria-labelledby="story-title">
            <h2 id="story-title" className="type-title">
              The short story
            </h2>
            <div className="mt-6 max-w-[36em] space-y-5 text-18 leading-relaxed">
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

      <section id="practical" aria-labelledby="practical-title" className="container-page scroll-mt-24 pb-[clamp(96px,13vw,176px)]">
        <p className="type-eyebrow">For hiring teams</p>
        <h2 id="practical-title" className="type-title mt-2">
          The practical details
        </h2>
        {/* CONTOH — ganti dengan data asli */}
        <dl className="widget mt-10 grid gap-x-10 p-6 md:grid-cols-2 md:p-8">
          {practical.map((f) => (
            <div key={f.label} className="grid gap-1 border-b border-line py-4 sm:grid-cols-[150px_minmax(0,1fr)] sm:gap-6">
              <dt className="text-14 font-semibold text-muted">{f.label}</dt>
              <dd className="text-16">{f.value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-6 flex flex-wrap items-center gap-3">
          <a href="/cv.pdf" download="Adelia-Tiara-CV.pdf" className="pill" data-variant="magenta">
            Download the CV (PDF)
          </a>
          <a href={`mailto:${identity.email}`} className="pill">
            {identity.email}
          </a>
          {/* CONTOH — ganti dengan profil asli (src/content/profile.ts → socials) */}
          {socials
            .filter((s) => s.href)
            .map((s) => (
              <a key={s.label} href={s.href!} target="_blank" rel="noopener noreferrer" className="pill" data-variant="ghost">
                {s.label} ↗<span className="sr-only"> (opens in a new tab)</span>
              </a>
            ))}
        </p>
      </section>

      <section aria-labelledby="skills-title" className="container-page pb-[clamp(96px,13vw,176px)]">
        <p className="type-eyebrow">Toolbox</p>
        <h2 id="skills-title" className="type-title mt-2">
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

      <OffTheClock />
    </PageTransition>
  );
}

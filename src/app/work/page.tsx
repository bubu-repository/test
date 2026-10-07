import type { Metadata } from "next";
import { pageMeta } from "@/lib/meta";
import Link from "next/link";
import { PageTransition } from "@/components/PageTransition";
import { PageHeader } from "@/components/PageHeader";
import { projects } from "@/content/projects";
import { BoosterPack, ResealPack } from "@/features/work/BoosterPack";
import { HoloCard } from "@/features/work/HoloCard";

export const metadata: Metadata = pageMeta({
  title: "Work",
  description: "Three AI products by Adelia Tiara, built end to end: Tenderlens, Catat and Lintas. Each comes as a holographic trading card with a full case study.",
  path: "/work",
});

export default function WorkPage() {
  return (
    <PageTransition>
      <PageHeader
        id="work-title"
        label="Selected work · 2024–2025"
        title={
          <>
            Three products, shipped <span className="sticker-text">end to end</span>.
          </>
        }
        lead="Each one started as somebody's messy request and ended as a product people use every day. Open the pack, then tap a card for the full case study."
      >
        <BoosterPack count={projects.length} />

        <ol className="cards-grid mx-auto mt-14 grid max-w-[1120px] gap-6 text-left md:grid-cols-2 lg:grid-cols-3" aria-label="Projects">
          {projects.map((project) => (
            <li key={project.slug} data-card className="mx-auto w-full max-w-[360px] min-w-0">
              <HoloCard project={project} total={projects.length} />
            </li>
          ))}
        </ol>
        <div className="reseal mt-8 flex justify-center">
          <ResealPack />
        </div>
      </PageHeader>

      <div className="h-[clamp(72px,9vw,128px)]" />

      <section aria-labelledby="quick-title" className="container-page pb-[clamp(96px,13vw,176px)]">
        <p className="type-eyebrow">In a hurry?</p>
        <h2 id="quick-title" className="type-title mt-3">
          The quick read
        </h2>
        {/* CONTOH — ganti dengan data asli */}
        <div className="mt-10 grid gap-4">
          {projects.map((p) => (
            <article key={p.slug} className="widget grid gap-4 p-6 md:grid-cols-[1.1fr_1.4fr_1fr_auto] md:items-center md:p-7">
              <div>
                <h3 className="text-32 leading-none font-bold tracking-[-0.035em]">
                  <Link href={`/work/${p.slug}`} className="link">
                    {p.name}
                  </Link>
                </h3>
                <p className="mt-1 text-14 text-muted">
                  {p.kind} · {p.year}
                </p>
              </div>
              <p className="text-16">{p.summary.split(". ")[0]}.</p>
              <div className="text-14">
                <p className="font-semibold">{p.role.title}</p>
                <p className="text-muted">
                  {p.results.metrics[0].value} {p.results.metrics[0].label}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <a href={p.links.live} target="_blank" rel="noopener noreferrer" className="pill" data-size="sm">
                  Live ↗<span className="sr-only"> {p.name} (opens in a new tab)</span>
                </a>
                <a href={p.links.repo} target="_blank" rel="noopener noreferrer" className="pill" data-size="sm" data-variant="ghost">
                  Repo ↗<span className="sr-only"> {p.name} (opens in a new tab)</span>
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>
    </PageTransition>
  );
}

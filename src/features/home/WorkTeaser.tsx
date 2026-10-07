import Link from "next/link";
import { projects } from "@/content/projects";
import { WorkCards } from "../work/WorkCards";

/** Home: the work, right under the hero. Three products, each with its real screen and its numbers. */
export function WorkTeaser() {
  return (
    <section id="work" aria-labelledby="work-teaser-title" className="container-page section-y scroll-mt-16" data-xr="WorkTeaser · three case cards with real screens">
      <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-4">
        <div className="max-w-[46rem]">
          <p className="type-eyebrow">Selected work · 2024–2025</p>
          <h2 id="work-teaser-title" className="type-display mt-3">
            Three AI products, designed for <span className="sticker-text">trust</span>.
          </h2>
        </div>
        <p className="max-w-[38ch] pb-2 text-muted">Each started as somebody&apos;s messy request and shipped to real people. Every case shows the research, the decisions, the rounds that failed, and the numbers.</p>
      </div>

      {/* CONTOH — ganti dengan data asli */}
      <div className="mt-12 md:mt-16">
        <WorkCards projects={projects} />
      </div>
      <p className="mt-8 text-center">
        <Link href="/work" className="link-arrow text-16">
          All work, plus the collector&apos;s edition
        </Link>
      </p>
    </section>
  );
}

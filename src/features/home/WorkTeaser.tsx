import Link from "next/link";
import { projects } from "@/content/projects";
import { WorkCards } from "../work/WorkCards";

/** Home: the work, right under the hero. Four products, each with its real screen and its numbers. */
export function WorkTeaser() {
  return (
    <section id="work" aria-labelledby="work-teaser-title" className="container-page section-y scroll-mt-16" data-xr="WorkTeaser · four case cards with real screens">
      <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-4">
        <div className="max-w-[46rem]">
          <p className="type-eyebrow">Selected work · 2023–2025</p>
          <h2 id="work-teaser-title" className="type-display mt-3">
            AI that shows its work.
          </h2>
        </div>
        <p className="max-w-[40ch] pb-2 text-muted">
          Four shipped products. One in-house, in a squad of seven at an HR software startup. Three I started myself and have since handed to the people who run them.
        </p>
      </div>

      {/* CONTOH — ganti dengan data asli */}
      <div className="mt-12 md:mt-16">
        <WorkCards projects={projects} />
      </div>
      <p className="mt-8 text-center">
        <Link href="/work" className="link-arrow text-16">
          How to read the case studies
        </Link>
      </p>
    </section>
  );
}

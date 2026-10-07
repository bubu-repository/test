import Link from "next/link";
import { projects } from "@/content/projects";
import { HoloCard } from "../work/HoloCard";

/** Home: the three case studies as calm glass cards, with plenty of air around them. */
export function WorkTeaser() {
  return (
    <section id="work" aria-labelledby="work-teaser-title" className="container-page section-y" data-xr="WorkTeaser · the three cards">
      <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-4">
        <div className="max-w-[44rem]">
          <p className="type-eyebrow">Selected work</p>
          <h2 id="work-teaser-title" className="type-display mt-3">
            Three products, shipped <span className="sticker-text">end to end</span>.
          </h2>
        </div>
        <div className="max-w-[36ch] pb-2">
          <p className="text-muted">Each one started as somebody&apos;s messy request and ended as something people use every day.</p>
          <Link href="/work" className="link-arrow mt-3">
            Open the card pack
          </Link>
        </div>
      </div>

      {/* CONTOH — ganti dengan data asli */}
      <ol className="mt-14 grid gap-6 md:mt-20 md:grid-cols-2 lg:grid-cols-3" aria-label="Case studies">
        {projects.map((project) => (
          <li key={project.slug} className="min-w-0">
            <HoloCard project={project} total={projects.length} morph={false} level={3} />
          </li>
        ))}
      </ol>
    </section>
  );
}

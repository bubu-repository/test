import Link from "next/link";
import { projects } from "@/content/projects";
import { ProjectIcon } from "../work/ProjectIcon";
import { Polaroid } from "./Polaroid";

const TILT = [-2.5, 1.5, -1];

/** Home: the three products as polaroids on white, with the app icons tucked into the headline. */
export function WorkTeaser() {
  return (
    <section id="work" aria-labelledby="work-teaser-title" className="container-page section-y scroll-mt-16" data-xr="WorkTeaser · polaroids of the three products">
      <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-4">
        <div className="max-w-[44rem]">
          <p className="type-eyebrow">Selected work</p>
          <h2 id="work-teaser-title" className="type-display mt-3">
            Three{" "}
            <span className="whitespace-nowrap">
              products
              <span className="inline-icons" aria-hidden="true">
                {projects.map((p, i) => (
                  <span key={p.slug} style={{ ["--i" as string]: i }}>
                    <ProjectIcon project={p} size={52} />
                  </span>
                ))}
              </span>
              ,
            </span>{" "}
            shipped <span className="sticker-text">end to end</span>.
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
      <ol className="mt-16 grid gap-x-10 gap-y-16 md:mt-24 md:grid-cols-3" aria-label="Case studies">
        {projects.map((project, i) => (
          <li key={project.slug} className="mx-auto w-full max-w-[340px]">
            <Polaroid project={project} tilt={TILT[i]} />
            <p className="mt-7 text-16 leading-snug">{project.tagline}</p>
            <Link href={`/work/${project.slug}`} className="link-arrow mt-3 text-16">
              Read the case study
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

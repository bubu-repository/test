import Link from "next/link";
import { projects } from "@/content/projects";
import { BoosterPack, ResealPack } from "../work/BoosterPack";
import { HoloCard } from "../work/HoloCard";
import { ProjectIcon } from "../work/ProjectIcon";

/**
 * Home: the three products come sealed in a booster pack. Tear it open and they are dealt face
 * down, then flip over as holographic trading cards. The app icons sit tucked into the headline.
 */
export function WorkTeaser() {
  return (
    <section id="work" aria-labelledby="work-teaser-title" className="container-page section-y scroll-mt-16" data-xr="WorkTeaser · a booster pack of holo cards">
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
          <p className="text-muted">Each one started as somebody&apos;s messy request and ended as something people use every day. They come in a pack: open it.</p>
          <Link href="/work" className="link-arrow mt-3">
            All work, and the quick read
          </Link>
        </div>
      </div>

      <div className="mt-14 text-center md:mt-20">
        <BoosterPack count={projects.length} />
      </div>

      {/* CONTOH — ganti dengan data asli */}
      <ol className="cards-grid mx-auto mt-4 grid max-w-[1120px] gap-6 md:grid-cols-2 lg:grid-cols-3" aria-label="Case studies">
        {projects.map((project) => (
          <li key={project.slug} data-card className="mx-auto w-full max-w-[360px] min-w-0">
            <HoloCard project={project} total={projects.length} level={3} />
          </li>
        ))}
      </ol>
      <div className="reseal mt-10 flex justify-center">
        <ResealPack />
      </div>
    </section>
  );
}

import Link from "next/link";
import { projects } from "@/content/projects";
import { BoosterPacks } from "../work/BoosterPack";
import { ProjectIcon } from "../work/ProjectIcon";

/**
 * Home: the three products come sealed in three booster packs. Tear one open and its card pops
 * out face down, then flips over as a holographic trading card. The app icons sit in the headline.
 */
export function WorkTeaser() {
  return (
    <section id="work" aria-labelledby="work-teaser-title" className="container-page section-y scroll-mt-16" data-xr="WorkTeaser · three booster packs of holo cards">
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
          <p className="text-muted">Each one started as somebody&apos;s messy request and ended as something people use every day. They come in packs: tear them open.</p>
          <Link href="/work" className="link-arrow mt-3">
            All work, and the quick read
          </Link>
        </div>
      </div>

      {/* CONTOH — ganti dengan data asli */}
      <div className="mt-14 md:mt-20">
        <BoosterPacks projects={projects} level={3} />
      </div>
    </section>
  );
}

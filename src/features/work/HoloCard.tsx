"use client";

import Link from "next/link";
import { ViewTransition, useRef } from "react";
import type { Project } from "@/content/projects";
import { sfx } from "@/lib/sound";
import { ProjectMockup } from "./ProjectMockup";

/**
 * A holographic trading card. The foil and glare follow the pointer; the card tilts in 3D.
 * The whole card is a link; it morphs into the case-study hero (shared view transition).
 */
export function HoloCard({ project, total, morph = true, level = 2 }: { project: Project; total: number; morph?: boolean; level?: 2 | 3 }) {
  const Heading = level === 3 ? "h3" : "h2";
  const ref = useRef<HTMLAnchorElement>(null);

  const onMove = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el || e.pointerType === "touch") return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    el.style.setProperty("--mx", `${px * 100}%`);
    el.style.setProperty("--my", `${py * 100}%`);
    el.style.setProperty("--rx", `${(0.5 - py) * 14}deg`);
    el.style.setProperty("--ry", `${(px - 0.5) * 18}deg`);
    el.style.setProperty("--o", "1");
  };
  const onLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
    el.style.setProperty("--o", "0");
  };

  return (
    <Link
      ref={ref}
      href={`/work/${project.slug}`}
      className="holo-card group block"
      data-tone={project.tone}
      data-tour={morph ? `card-${project.slug}` : undefined}
      data-cursor="Read"
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      onPointerEnter={() => sfx.tick()}
      aria-label={`${project.name}: ${project.tagline} Read the case study.`}
    >
      <ViewTransition name={morph ? `card-${project.slug}` : undefined} share="card-morph" default="none">
        <div className="holo-card__inner">
          <div className="holo-card__face">
            <div className="flex items-center justify-between gap-2">
              <p className="type-pixel text-muted">
                No. {project.index}/{String(total).padStart(2, "0")}
              </p>
              <span className="chip shrink-0" data-tone={project.tone === "cobalt" ? "sky" : project.tone}>
                {project.rarity}
              </span>
            </div>
            <Heading className="mt-3 text-32 leading-none font-bold tracking-[-0.035em]">{project.name}</Heading>
            <p className="mt-1.5 text-14 text-muted">
              {project.kind} · {project.year}
            </p>
            <div className="relative mt-5">
              <div className="aspect-[4/3] overflow-hidden rounded-[18px]">
                <ProjectMockup project={project} />
              </div>
              {/* A proof badge floating over the screenshot (after Finansiologi's annotated mockups). */}
              <span className="proof-badge" aria-hidden="true">
                <span className="led" />
                {project.stats[1].value} {project.stats[1].label.toLowerCase()}
              </span>
            </div>
            <p className="mt-5 text-16 leading-snug">{project.tagline}</p>
            <dl className="mt-auto grid grid-cols-3 divide-x divide-line pt-6">
              {project.stats.map((s) => (
                <div key={s.label} className="px-2 text-center first:pl-0 last:pr-0">
                  <dd className="text-18 leading-tight font-bold tracking-tight">{s.value}</dd>
                  <dt className="mt-0.5 truncate text-12 text-muted">{s.label}</dt>
                </div>
              ))}
            </dl>
            <p className="link-arrow mt-6 text-16">Read the case study</p>
          </div>
        </div>
      </ViewTransition>
    </Link>
  );
}

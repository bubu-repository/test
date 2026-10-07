import Link from "next/link";
import { ViewTransition } from "react";
import type { Project } from "@/content/projects";
import { cn } from "@/lib/cn";
import { ProjectMockup } from "./ProjectMockup";

/**
 * A polaroid of a project, pinned under each case study: a taped print with a SHIPPED stamp and
 * one proof number floating over it. Opening it morphs the photo into the case study's app icon
 * (shared view transition).
 */
export function Polaroid({ project, tilt = 0, className }: { project: Project; tilt?: number; className?: string }) {
  const proof = project.stats[1];
  return (
    <ViewTransition name={`card-${project.slug}`} share="card-morph" default="none">
      <Link
        href={`/work/${project.slug}`}
        className={cn("polaroid polaroid--lift relative block w-full select-none", className)}
        style={{ ["--tilt" as string]: `${tilt}deg` }}
        draggable={false}
        data-cursor="Open"
        data-tour={`polaroid-${project.slug}`}
      >
        <span className="tape" aria-hidden="true" />
        <span className="relative block aspect-[4/3] overflow-hidden rounded-[2px]">
          <ProjectMockup project={project} className="rounded-none" />
          <span className="stamp absolute right-2.5 bottom-2.5" aria-hidden="true">
            Shipped ✓
          </span>
        </span>
        <span className="proof-badge" aria-hidden="true">
          <span className="led" />
          {proof.value} {proof.label.toLowerCase()}
        </span>
        <span className="polaroid__caption flex items-baseline justify-between gap-2">
          <span className="text-18">{project.name}</span>
          <span className="font-mono text-[11px] font-medium tracking-[0.1em] text-[#8b97a8]">{project.year}</span>
        </span>
        <span className="-mt-2 block pb-3.5 font-mono text-[10px] tracking-[0.1em] text-[#556070] uppercase">
          Project {project.index} | {project.kind}
        </span>
      </Link>
    </ViewTransition>
  );
}

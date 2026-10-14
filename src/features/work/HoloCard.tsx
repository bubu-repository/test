"use client";

import Link from "next/link";
import { ViewTransition, useRef, type CSSProperties } from "react";
import type { Project } from "@/content/projects";
import { sfx } from "@/lib/sound";
import { ProjectMockup } from "./ProjectMockup";
import { colourOf } from "./project-colours";

/** Rarity → foil: the holo rare shines in the art window, the rare is reverse holo, the uncommon is etched. */
const FINISH: Record<string, { finish: "holo" | "reverse" | "etched"; glyph: string; rank: number }> = {
  "Holo rare": { finish: "holo", glyph: "★", rank: 2 },
  Rare: { finish: "reverse", glyph: "◆", rank: 1 },
  Uncommon: { finish: "etched", glyph: "●", rank: 0 },
};

/**
 * A holographic trading card, printed like the real thing: a metallic frame in the project's
 * colour, an art window, a type line, the three numbers as moves, flavour text and a set number.
 * The foil depends on the rarity; the glare and the tilt follow the pointer, and on touch screens
 * the foil shimmers on its own. The back is printed too, so the pack can deal cards face down.
 * The whole card is a link; it morphs into the case-study icon (shared view transition).
 */
export function HoloCard({
  project,
  total,
  morph = true,
  level = 2,
  finish,
  rarityLabel,
}: {
  project: Project;
  total: number;
  morph?: boolean;
  level?: 2 | 3;
  /** A pack pull can print any product in holo foil, whatever its printed rarity. */
  finish?: "holo" | "reverse" | "etched";
  rarityLabel?: string;
}) {
  const Heading = level === 3 ? "h3" : "h2";
  const ref = useRef<HTMLAnchorElement>(null);
  const printed = FINISH[project.rarity] ?? FINISH.Uncommon;
  const rarity = finish ? (Object.values(FINISH).find((f) => f.finish === finish) ?? printed) : printed;
  const label = rarityLabel ?? project.rarity;
  const colour = colourOf(project.slug);
  const pad = (n: number | string) => String(n).padStart(3, "0");

  const onMove = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el || e.pointerType === "touch") return;
    const r = el.getBoundingClientRect();
    const px = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    const py = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    el.dataset.live = "true";
    el.style.setProperty("--mx", `${(px * 100).toFixed(1)}%`);
    el.style.setProperty("--my", `${(py * 100).toFixed(1)}%`);
    el.style.setProperty("--bgx", `${(30 + px * 40).toFixed(1)}%`);
    el.style.setProperty("--bgy", `${(30 + py * 40).toFixed(1)}%`);
    el.style.setProperty("--rx", `${((0.5 - py) * 16).toFixed(2)}deg`);
    el.style.setProperty("--ry", `${((px - 0.5) * 20).toFixed(2)}deg`);
    el.style.setProperty("--o", "1");
  };
  const onLeave = () => {
    const el = ref.current;
    if (!el) return;
    delete el.dataset.live;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
    el.style.setProperty("--o", "0");
  };

  return (
    <Link
      ref={ref}
      href={`/work/${project.slug}`}
      className="tcg"
      data-tone={project.tone}
      data-finish={rarity.finish}
      style={{ "--i": rarity.rank, "--frame": colour.frame, "--tone-ink": colour.ink } as CSSProperties}
      data-tour={morph ? `card-${project.slug}` : undefined}
      data-cursor="Read"
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      onPointerEnter={() => sfx.tick()}
      aria-label={`${project.name}, ${label.toLowerCase()} card: ${project.tagline} Read the case study.`}
    >
      <ViewTransition name={morph ? `card-${project.slug}` : undefined} share="card-morph" default="none">
        <div className="tcg__flipper">
          <div className="tcg__tilt">
            <div className="tcg__face tcg__front">
              <div className="tcg__frame">
                <div className="tcg__top">
                  <Heading className="tcg__name">{project.name}</Heading>
                  <span className="tcg__no">
                    <small>No.</small>
                    {project.index}
                  </span>
                </div>
                <div className="tcg__art">
                  <ProjectMockup project={project} className="rounded-none" />
                  <span className="tcg__art-foil" aria-hidden="true" />
                </div>
                <div className="tcg__type">
                  {project.kind} · {project.year}
                </div>
                <div className="tcg__moves">
                  {project.stats.map((s, i) => (
                    <span key={s.label} className="tcg__move">
                      <span className="tcg__energy" aria-hidden="true">
                        {Array.from({ length: i + 1 }, (_, k) => (
                          <i key={k} />
                        ))}
                      </span>
                      <span className="tcg__move-name">{s.label}</span>
                      <span className="tcg__move-value">{s.value}</span>
                    </span>
                  ))}
                </div>
                <div className="tcg__flavor">{project.tagline}</div>
                <div className="tcg__foot">
                  <span>Illus. Adelia Tiara</span>
                  <span>
                    {rarity.glyph} AT·26 {pad(project.index)}/{pad(total)}
                  </span>
                </div>
              </div>
              <span className="tcg__shine" aria-hidden="true" />
              <span className="tcg__glare" aria-hidden="true" />
            </div>
            <div className="tcg__face tcg__back" aria-hidden="true">
              <div className="tcg__back-inner">
                <span className="tcg__back-logo">
                  <span>
                    a<b>.</b>
                  </span>
                </span>
                <span className="tcg__back-text">Adelia · Trading Card Game</span>
              </div>
            </div>
          </div>
        </div>
      </ViewTransition>
    </Link>
  );
}

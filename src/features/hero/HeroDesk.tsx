"use client";

import Link from "next/link";
import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import { MociAvatar } from "@/components/MociAvatar";
import { projects } from "@/content/projects";
import { cn } from "@/lib/cn";
import { sfx } from "@/lib/sound";
import { readJSON, writeJSON } from "@/lib/storage";
import { ProjectMockup } from "../work/ProjectMockup";

const KEY = "adelia:desk";
const FREE = "(min-width: 1280px) and (pointer: fine)";

type Offset = { x: number; y: number };

/**
 * Makes every [data-desk-item] inside the desk draggable on wide screens with a mouse.
 * Positions are written straight to CSS variables (no re-render per frame) and remembered.
 * A drag never counts as a click, so a polaroid you move doesn't open its case study.
 */
function useDesk(root: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const items = Array.from(el.querySelectorAll<HTMLElement>("[data-desk-item]"));
    const saved = readJSON<Record<string, Offset>>(KEY, {});
    const place = (item: HTMLElement, s: Offset) => {
      item.style.setProperty("--dx", `${s.x}px`);
      item.style.setProperty("--dy", `${s.y}px`);
    };
    for (const item of items) {
      const s = saved[item.dataset.deskItem!];
      if (s) place(item, s);
    }

    let z = 10;
    const cleanups = items.map((item) => {
      const id = item.dataset.deskItem!;
      let start: { px: number; py: number; x: number; y: number } | null = null;
      let moved = false;

      const down = (e: PointerEvent) => {
        if (e.button !== 0 || !window.matchMedia(FREE).matches) return;
        const cur = saved[id] ?? { x: 0, y: 0 };
        start = { px: e.clientX, py: e.clientY, x: cur.x, y: cur.y };
        moved = false;
      };
      const move = (e: PointerEvent) => {
        if (!start) return;
        const dx = e.clientX - start.px;
        const dy = e.clientY - start.py;
        if (!moved && Math.hypot(dx, dy) < 5) return;
        if (!moved) {
          // Capture only once it's a drag: capturing on press would retarget the click away from the link.
          moved = true;
          item.setPointerCapture(e.pointerId);
          item.dataset.dragging = "true";
          item.style.zIndex = String(++z);
          sfx.tick();
        }
        const next = { x: start.x + dx, y: start.y + dy };
        saved[id] = next;
        place(item, next);
      };
      const up = () => {
        if (!start) return;
        start = null;
        delete item.dataset.dragging;
        if (moved) writeJSON(KEY, saved);
      };
      const click = (e: MouseEvent) => {
        if (moved) {
          e.preventDefault();
          e.stopPropagation();
          moved = false;
        }
      };
      item.addEventListener("pointerdown", down);
      item.addEventListener("pointermove", move);
      item.addEventListener("pointerup", up);
      item.addEventListener("pointercancel", up);
      item.addEventListener("click", click, true);
      return () => {
        item.removeEventListener("pointerdown", down);
        item.removeEventListener("pointermove", move);
        item.removeEventListener("pointerup", up);
        item.removeEventListener("pointercancel", up);
        item.removeEventListener("click", click, true);
      };
    });

    const tidy = () => {
      for (const key of Object.keys(saved)) delete saved[key];
      writeJSON(KEY, saved);
      for (const item of items) place(item, { x: 0, y: 0 });
    };
    el.addEventListener("desk:tidy", tidy);

    return () => {
      cleanups.forEach((c) => c());
      el.removeEventListener("desk:tidy", tidy);
    };
  }, [root]);
}

/** Free placement on wide screens; a scrollable row of objects everywhere else. */
type Spot = { l?: string; r?: string; t: number };

function Item({ id, spot, tilt, className, children }: { id: string; spot: Spot; tilt: number; className?: string; children: ReactNode }) {
  const vars = { "--l": spot.l ?? "auto", "--r": spot.r ?? "auto", "--t": `${spot.t}px`, "--tilt": `${tilt}deg` } as Record<string, string>;
  return (
    <div data-desk-item={id} className={cn("desk-item shrink-0 snap-center", className)} style={vars}>
      {children}
    </div>
  );
}

const SPOTS: { spot: Spot; tilt: number }[] = [
  { spot: { l: "max(24px, calc(50% - 640px))", t: 150 }, tilt: -6 },
  { spot: { l: "max(40px, calc(50% - 600px))", t: 470 }, tilt: 4 },
  { spot: { r: "max(32px, calc(50% - 630px))", t: 140 }, tilt: 5 },
];

/**
 * The hero desk: a blue self-healing cutting mat with the AT-26 in the middle, three polaroids of
 * the work, Moci as a sticker and a sticky note on how to use the place. On wide screens everything
 * can be dragged around (and is remembered); on smaller screens the objects sit in a row.
 */
export function HeroDesk({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  useDesk(ref);

  return (
    <section ref={ref} id="hero" aria-labelledby="hero-name" className="mat relative overflow-hidden text-white" data-xr="HeroDesk · a cutting mat with things you can drag">
      <div className="mat-ruler top-[86px] left-0 hidden md:flex" aria-hidden="true">
        {Array.from({ length: 24 }, (_, i) => (
          <span key={i}>{i}</span>
        ))}
      </div>
      <div className="mat-ruler bottom-2 left-0" aria-hidden="true">
        {Array.from({ length: 24 }, (_, i) => (
          <span key={i}>{i * 5}</span>
        ))}
      </div>

      <div className="relative mx-auto flex w-full max-w-[1440px] flex-col items-center px-3 pt-28 pb-14 sm:px-6 md:pt-32 xl:min-h-[960px] xl:pb-24">
        <div className="relative z-[5] w-full max-w-[660px]">{children}</div>

        {/* The desk objects. */}
        <div className="desk-row mt-10 flex w-full snap-x snap-mandatory gap-8 overflow-x-auto px-4 pt-4 pb-6 xl:contents">
          {projects.map((p, i) => (
            <Item key={p.slug} id={p.slug} spot={SPOTS[i].spot} tilt={SPOTS[i].tilt}>
              <Link href={`/work/${p.slug}`} className="polaroid relative w-[214px] select-none" draggable={false} data-cursor="Open">
                <span className="tape" aria-hidden="true" />
                <span className="block aspect-[4/3] overflow-hidden rounded-[2px]">
                  <ProjectMockup project={p} className="rounded-none" />
                </span>
                <span className="polaroid__caption flex items-baseline justify-between gap-2">
                  <span>{p.name}</span>
                  <span className="font-mono text-[10px] font-medium tracking-[0.1em] text-[#8a857a]">{p.index}/03</span>
                </span>
                <span className="-mt-2 block pb-3 text-12 text-[#6b665c]">{p.kind}</span>
              </Link>
            </Item>
          ))}

          <Item id="note" spot={{ r: "max(40px, calc(50% - 610px))", t: 520 }} tilt={-3}>
            <div className="sticky-note w-[214px] select-none">
              <p className="font-mono text-[10px] font-semibold tracking-[0.14em] uppercase opacity-70">How to use this desk</p>
              <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-14 leading-snug">
                <dt className="font-semibold">Drag</dt>
                <dd>move things around</dd>
                <dt className="font-semibold">Dial</dt>
                <dd>pick a page, then Go</dd>
                <dt className="font-mono font-semibold">P</dt>
                <dd>screen on and off</dd>
                <dt className="font-mono font-semibold">⌘K</dt>
                <dd>anything, really</dd>
              </dl>
            </div>
          </Item>

          <Item id="moci" spot={{ l: "calc(50% + 296px)", t: 92 }} tilt={8} className="xl:z-[6]">
            <span className="sticker grid size-[84px] place-items-center rounded-full bg-accent" title="Moci, my agent. Ask it anything.">
              <MociAvatar size={52} />
            </span>
          </Item>
        </div>

        <p className="mt-2 flex items-center gap-3 font-mono text-[11px] tracking-[0.12em] text-white/70 uppercase xl:absolute xl:bottom-10 xl:left-[max(40px,calc(50%-640px))] xl:mt-0">
          <span className="hidden xl:inline">Drag things around</span>
          <span className="xl:hidden">Swipe the desk</span>
          <button
            type="button"
            className="js-only hidden rounded-pill border border-white/30 px-3 py-1.5 tracking-[0.12em] uppercase hover:bg-white/10 xl:inline-block"
            onClick={() => {
              sfx.whoosh();
              ref.current?.dispatchEvent(new Event("desk:tidy"));
            }}
          >
            Tidy up
          </button>
        </p>
      </div>
    </section>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import { MociAvatar } from "@/components/MociAvatar";
import { projects } from "@/content/projects";
import { cn } from "@/lib/cn";
import { sfx } from "@/lib/sound";
import { readJSON, writeJSON } from "@/lib/storage";
import { Phone } from "../desk/Phone";
import { PixelMoci } from "../desk/PixelMoci";
import { Poster } from "../desk/Poster";
import { Capsule, JellyCandies, Keychain, MiniPack } from "../desk/objects";
import { ProjectMockup } from "../work/ProjectMockup";
import { IdBadge } from "./IdBadge";

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

function Item({ id, spot, tilt, fixed, className, children }: { id: string; spot: Spot; tilt: number; fixed?: boolean; className?: string; children: ReactNode }) {
  const vars = { "--l": spot.l ?? "auto", "--r": spot.r ?? "auto", "--t": `${spot.t}px`, "--tilt": `${tilt}deg` } as Record<string, string>;
  return (
    <div data-desk-item={fixed ? undefined : id} className={cn("desk-item shrink-0 snap-center", className)} style={vars}>
      {children}
    </div>
  );
}

/* Where things lie on a wide desk, relative to the device in the middle (it spans ±330px). */
const LEFT = (px: number) => `max(${24 + (640 - px)}px, calc(50% - ${px}px))`;
const RIGHT = (px: number) => `max(${24 + (640 - px)}px, calc(50% - ${px}px))`;

const POLAROIDS: { spot: Spot; tilt: number }[] = [
  { spot: { l: LEFT(606), t: 548 }, tilt: 5 },
  { spot: { l: LEFT(620), t: 860 }, tilt: -4 },
  { spot: { l: "calc(50% - 232px)", t: 1030 }, tilt: 3 },
];

function Polaroid({ project }: { project: (typeof projects)[number] }) {
  return (
    <Link href={`/work/${project.slug}`} className="polaroid relative w-[214px] select-none" draggable={false} data-cursor="Open">
      <span className="tape" aria-hidden="true" />
      <span className="relative block aspect-[4/3] overflow-hidden rounded-[2px]">
        <ProjectMockup project={project} className="rounded-none" />
        <span className="stamp absolute right-2 bottom-2" aria-hidden="true">
          Shipped ✓
        </span>
      </span>
      <span className="polaroid__caption flex items-baseline justify-between gap-2">
        <span>{project.name}</span>
        <span className="font-mono text-[10px] font-medium tracking-[0.1em] text-[#8a857a]">{project.year}</span>
      </span>
      <span className="-mt-2 block pb-3 font-mono text-[9.5px] tracking-[0.1em] text-[#6b665c] uppercase">
        Project {project.index} | {project.kind}
      </span>
    </Link>
  );
}

/**
 * The hero desk: a blue self-healing cutting mat with the AT-26 in the middle and every earlier
 * version of this hero lying around it as a thing: the 24:QW poster (name, live data, email strip),
 * the ID badge on its lanyard, a phone showing the live sky, the capsule keys, a keychain of pages,
 * a sealed booster pack, jelly candies, polaroids of the work, Moci as a sticker and as an 8-bit
 * sprite walking the ruler. On wide screens everything can be dragged around (and is remembered);
 * on smaller screens the objects sit in a row you swipe.
 */
export function HeroDesk({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  useDesk(ref);

  return (
    <section ref={ref} id="hero" aria-labelledby="hero-name" className="mat mat-frame relative overflow-hidden text-white" data-xr="HeroDesk · a cutting mat with every version of this hero on it">
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

      <JellyCandies />

      <div className="relative mx-auto flex w-full max-w-[1440px] flex-col items-center px-3 pt-28 pb-24 sm:px-6 md:pt-32 xl:min-h-[1330px]">
        <div className="relative z-[5] w-full max-w-[660px]">{children}</div>

        {/* The desk objects. */}
        <div className="desk-row mt-10 flex w-full snap-x snap-mandatory items-start gap-8 overflow-x-auto px-4 pt-6 pb-8 xl:contents">
          <Item id="poster" spot={{ l: LEFT(628), t: 124 }} tilt={-3}>
            <Poster />
          </Item>

          <Item id="badge" fixed spot={{ r: RIGHT(598), t: -8 }} tilt={0} className="xl:z-[4]">
            <IdBadge strap={64} />
          </Item>

          <Item id="phone" spot={{ r: RIGHT(588), t: 470 }} tilt={6}>
            <Phone />
          </Item>

          {projects.map((p, i) => (
            <Item key={p.slug} id={p.slug} spot={POLAROIDS[i].spot} tilt={POLAROIDS[i].tilt}>
              <Polaroid project={p} />
            </Item>
          ))}

          <Item id="capsule" spot={{ l: "calc(50% - 318px)", t: 912 }} tilt={-2}>
            <Capsule />
          </Item>

          <Item id="keychain" spot={{ l: "calc(50% + 12px)", t: 910 }} tilt={4}>
            <Keychain />
          </Item>

          <Item id="pack" spot={{ l: "calc(50% + 236px)", t: 960 }} tilt={9}>
            <MiniPack />
          </Item>

          <Item id="note" spot={{ r: RIGHT(604), t: 1010 }} tilt={-3}>
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
                <dt className="font-semibold">Phone</dt>
                <dd>tap it for the tour</dd>
              </dl>
            </div>
          </Item>

          <Item id="moci" spot={{ l: "calc(50% + 296px)", t: 92 }} tilt={8} className="xl:z-[6]">
            <span className="sticker grid size-[84px] place-items-center rounded-full bg-accent" title="Moci, my agent. Ask it anything.">
              <MociAvatar size={52} />
            </span>
          </Item>
        </div>

        <p className="mt-2 flex items-center gap-3 font-mono text-[11px] tracking-[0.12em] text-white/75 uppercase xl:absolute xl:bottom-20 xl:left-[max(40px,calc(50%-640px))] xl:mt-0">
          <span className="hidden xl:inline">Look around · drag anything</span>
          <span className="xl:hidden">Swipe the desk →</span>
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

      <PixelMoci />
    </section>
  );
}

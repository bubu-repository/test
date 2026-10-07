"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { Project } from "@/content/projects";
import { sfx } from "@/lib/sound";
import { unlock } from "@/lib/stickers";
import { HoloCard } from "./HoloCard";

const KEY = "adelia:packs";
const RESEAL = "adelia:reseal";

const RARITY: Record<string, { label: string; glyph: string; finish: string }> = {
  "Holo rare": { label: "Holo rare inside", glyph: "★", finish: "holo" },
  Rare: { label: "Rare inside", glyph: "◆", finish: "reverse" },
  Uncommon: { label: "Uncommon inside", glyph: "●", finish: "etched" },
};

/** Which packs are open this visit, as slot indexes ("0 2"). Mirrored on <html data-opened>, which the CSS reads. */
function readOpened(): Set<number> {
  try {
    return new Set((window.sessionStorage.getItem(KEY) ?? "").split(" ").filter(Boolean).map(Number));
  } catch {
    return new Set(Array.from((document.documentElement.getAttribute("data-opened") ?? "").split(" ").filter(Boolean), Number));
  }
}

function writeOpened(opened: Set<number>) {
  const value = [...opened].sort().join(" ");
  try {
    window.sessionStorage.setItem(KEY, value);
  } catch {
    // Private mode: the packs simply reseal on the next page load.
  }
  document.documentElement.setAttribute("data-opened", value);
}

const calm = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

type State = "sealed" | "tearing" | "open";

function PackSlot({ project, index, total, level, state, onOpen }: { project: Project; index: number; total: number; level: 2 | 3; state: State; onOpen: (i: number) => void }) {
  const [tear, setTear] = useState(0);
  const drag = useRef<{ x: number; w: number } | null>(null);
  /** A drag that stopped short is not a click. */
  const swallowClick = useRef(false);
  const rarity = RARITY[project.rarity] ?? RARITY.Uncommon;

  const onSheen = (e: React.PointerEvent<HTMLElement>) => {
    if (e.pointerType === "touch") return;
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    el.style.setProperty("--px", `${(px * 100).toFixed(1)}%`);
    el.style.setProperty("--py", `${(py * 100).toFixed(1)}%`);
    el.style.setProperty("--prx", `${((0.5 - py) * 12).toFixed(2)}deg`);
    el.style.setProperty("--pry", `${((px - 0.5) * 16).toFixed(2)}deg`);
  };

  return (
    <li className="packslot" data-i={index} data-state={state} data-tone={project.tone} data-finish={rarity.finish} style={{ "--i": index } as CSSProperties}>
      <div className="packslot__pack">
        <button
          type="button"
          className="pack__body"
          style={{ ["--tear" as string]: tear }}
          aria-label={`Open pack ${project.index}: ${project.kind}, ${rarity.label.toLowerCase()}`}
          data-cursor="Open"
          data-sfx="off"
          data-tour={index === 0 ? "pack-first" : undefined}
          onClick={() => {
            if (swallowClick.current) {
              swallowClick.current = false;
              return;
            }
            onOpen(index);
          }}
          onPointerMove={onSheen}
          onPointerLeave={(e) => {
            e.currentTarget.style.setProperty("--prx", "0deg");
            e.currentTarget.style.setProperty("--pry", "0deg");
          }}
        >
          {/* Inside the pack: the top of the card, seen once the strip lifts. */}
          <span className="pack__mouth" aria-hidden="true">
            <span />
          </span>

          {/* The crimped strip you tear off. */}
          <span
            className="pack__strip touch-none select-none"
            data-cursor="Tear"
            onPointerDown={(e) => {
              swallowClick.current = false;
              if (state !== "sealed") return;
              const r = e.currentTarget.getBoundingClientRect();
              drag.current = { x: e.clientX - r.left, w: r.width };
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              if (!drag.current) return;
              const r = e.currentTarget.getBoundingClientRect();
              const p = Math.max(0, Math.min(1, (e.clientX - r.left - drag.current.x) / (drag.current.w * 0.6)));
              if (Math.floor(p * 8) > Math.floor(tear * 8)) sfx.tick();
              setTear(p);
              if (p >= 1) {
                drag.current = null;
                onOpen(index);
              }
            }}
            onPointerUp={() => {
              if (drag.current && tear > 0.05) swallowClick.current = true;
              drag.current = null;
              if (state === "sealed" && tear < 1) setTear(0);
            }}
            onPointerCancel={() => {
              drag.current = null;
              if (state === "sealed") setTear(0);
            }}
          >
            <span className="pack__strip-foil" aria-hidden="true" />
            <span className="pack__strip-label type-pixel" aria-hidden="true">
              ✂ tear here →
            </span>
          </span>
          <span className="pack__perf" aria-hidden="true">
            <span className="pack__perf-done" />
          </span>

          <span className="pack__foil" aria-hidden="true">
            <span className="pack__sheen" />
            <span className="pack__print">
              <span className="pack__brand">
                Adelia <b>TCG</b>
              </span>
              <span className="pack__no">{project.index}</span>
              <span className="pack__title">{project.name}</span>
              <span className="pack__theme">{project.kind}</span>
              <span className="pack__meta">
                <span>Edition {project.year}</span>
                <span>
                  {rarity.glyph} {rarity.label}
                </span>
              </span>
            </span>
            <span className="pack__seal">
              AT
              <br />
              26
            </span>
          </span>
        </button>
      </div>

      <div className="packslot__card" data-card>
        <HoloCard project={project} total={total} level={level} />
        <span className="packslot__burst" aria-hidden="true">
          {Array.from({ length: 10 }, (_, k) => (
            <i key={k} style={{ "--a": `${k * 36 + 8}deg`, "--d": `${70 + (k % 3) * 26}px` } as CSSProperties} />
          ))}
        </span>
      </div>
    </li>
  );
}

/**
 * Three booster packs, one product in each, on the home page and on /work. They are sealed again on
 * every visit (session storage, read before paint by the preferences script, so cards never flash).
 * Tap a pack, or drag across its crimped strip until it peels off: the strip flies, the pack bursts,
 * and the card inside pops up face down and flips over (the holo rare throws sparkles). "Open all"
 * opens the rest one after another; "Reseal" puts them back.
 */
export function BoosterPacks({ projects, level = 2 }: { projects: Project[]; level?: 2 | 3 }) {
  const [states, setStates] = useState<State[]>(() => projects.map(() => "sealed"));
  /** Bumped on every reseal, so each pack remounts with its strip back in place. */
  const [round, setRound] = useState(0);
  const listRef = useRef<HTMLOListElement>(null);
  const timers = useRef<number[]>([]);
  const opening = useRef(new Set<number>());

  // Sync with what this visit already opened (and with ?pack=fresh).
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("pack") === "fresh") writeOpened(new Set());
    const sync = () => {
      const opened = readOpened();
      opening.current.clear();
      setStates(projects.map((_, i) => (opened.has(i) ? "open" : "sealed")));
      setRound((r) => r + 1);
    };
    sync();
    window.addEventListener(RESEAL, sync);
    const pending = timers.current;
    return () => {
      window.removeEventListener(RESEAL, sync);
      pending.forEach((t) => window.clearTimeout(t));
    };
  }, [projects]);

  const open = (i: number) => {
    const opened = readOpened();
    if (opened.has(i) || opening.current.has(i)) return;
    opening.current.add(i);
    sfx.tear();
    unlock("pack");
    opened.add(i);
    const slot = listRef.current?.querySelector<HTMLElement>(`.packslot[data-i="${i}"]`);
    if (calm() || !slot) {
      writeOpened(opened);
      setStates((s) => s.map((v, k) => (k === i ? "open" : v)));
      return;
    }
    // The strip flies off and the pack bursts; then the card pops up and flips.
    setStates((s) => s.map((v, k) => (k === i ? "tearing" : v)));
    timers.current.push(
      window.setTimeout(() => {
        writeOpened(readOpened().add(i));
        setStates((s) => s.map((v, k) => (k === i ? "open" : v)));
        slot.setAttribute("data-dealing", "");
        sfx.pop();
        timers.current.push(window.setTimeout(() => slot.removeAttribute("data-dealing"), 1800));
      }, 480),
    );
  };

  const openAll = () => {
    const opened = readOpened();
    projects
      .map((_, i) => i)
      .filter((i) => !opened.has(i))
      .forEach((i, k) => timers.current.push(window.setTimeout(() => open(i), k * 420)));
  };

  const reseal = () => {
    resealPacks();
    sfx.whoosh();
    listRef.current?.scrollIntoView({ behavior: calm() ? "auto" : "smooth", block: "center" });
  };

  const sealed = states.filter((s) => s === "sealed").length;

  return (
    <div className="packs">
      <ol ref={listRef} className="packrow" aria-label="Booster packs, one project in each">
        {projects.map((project, i) => (
          <PackSlot key={`${project.slug}-${round}`} project={project} index={i} total={projects.length} level={level} state={states[i]} onOpen={open} />
        ))}
      </ol>
      <div className="js-only mt-10 flex flex-col items-center gap-3 text-center">
        <div className="flex flex-wrap items-center justify-center gap-2">
          {sealed > 0 && (
            <button type="button" className="pill" data-variant="magenta" data-size="lg" data-tour="pack" data-magnetic="0.25" data-sfx="off" onClick={openAll}>
              {sealed === projects.length ? "Open all three" : `Open the last ${sealed === 1 ? "one" : sealed}`}
            </button>
          )}
          {sealed < projects.length && (
            <button type="button" className="pill" data-size={sealed > 0 ? "lg" : "sm"} data-variant="ghost" data-sfx="off" onClick={reseal}>
              ↺ Reseal {sealed > 0 ? "" : "the packs"}
            </button>
          )}
        </div>
        {sealed > 0 && <p className="text-14 text-muted">Tap a pack, or drag across its top to tear it open.</p>}
      </div>
    </div>
  );
}

/** Puts every card back in a fresh pack (the reseal button, and the tour). */
export function resealPacks() {
  writeOpened(new Set());
  window.dispatchEvent(new Event(RESEAL));
}

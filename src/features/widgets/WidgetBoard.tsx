"use client";

import { useEffect, useEffectEvent, useLayoutEffect, useRef, useState, type ComponentType } from "react";
import { ArrowLeftIcon, ArrowRightIcon, GridIcon } from "@/components/icons";
import { cn } from "@/lib/cn";
import { sfx } from "@/lib/sound";
import { readJSON, writeJSON } from "@/lib/storage";
import { createStore, useStore } from "@/lib/store";
import { ui, useUI, type Lens } from "@/lib/ui";
import { RevealCard } from "../hero/RevealCard";
import { FindTimeWidget, KeycapsWidget, PhoneWidget, WorkspaceWidget } from "./demos";
import { PlayWidget } from "./PlayWidget";
import { SeaWidget } from "./SeaWidget";
import { AskWidget, LabWidget, OverlapWidget } from "./widgets";

type WidgetId = "now" | "overlap" | "ask" | "reveal" | "lab" | "findtime" | "workspace" | "keys" | "sea" | "play";

/** Ten widgets: her phone with the live sky, the live sea, live data, Moci, the lab, the mini-game, plus three playable UI demos (after marco.fyi). */
const WIDGETS: Record<WidgetId, { label: string; Component: ComponentType; span: string; tone?: string }> = {
  now: { label: "Bekasi now", Component: PhoneWidget, span: "sm:col-span-1 sm:row-span-2 lg:col-span-4 lg:row-span-2" },
  overlap: { label: "Working hours overlap", Component: OverlapWidget, span: "sm:col-span-1 lg:col-span-4", tone: "tone-sky" },
  ask: { label: "Ask Moci", Component: AskWidget, span: "sm:col-span-2 lg:col-span-4", tone: "tone-accent" },
  reveal: { label: "Availability", Component: RevealCard, span: "sm:col-span-1 lg:col-span-4" },
  lab: { label: "The lab", Component: LabWidget, span: "sm:col-span-1 lg:col-span-4", tone: "tone-violet" },
  findtime: { label: "Find a time", Component: FindTimeWidget, span: "sm:col-span-1 lg:col-span-4" },
  workspace: { label: "Workspaces", Component: WorkspaceWidget, span: "sm:col-span-1 lg:col-span-4" },
  keys: { label: "Keyboard", Component: KeycapsWidget, span: "sm:col-span-2 lg:col-span-4" },
  sea: { label: "The sea", Component: SeaWidget, span: "sm:col-span-2 lg:col-span-8 overflow-hidden" },
  play: { label: "Take a break", Component: PlayWidget, span: "sm:col-span-1 lg:col-span-4 overflow-hidden" },
};

const DEFAULT_ORDER: WidgetId[] = ["now", "overlap", "ask", "findtime", "workspace", "keys", "sea", "play", "reveal", "lab"];

const LENSES: { id: Lens; label: string; order: WidgetId[] }[] = [
  { id: "recruiter", label: "Recruiter", order: ["findtime", "reveal", "ask", "overlap", "workspace", "now", "keys", "lab", "sea", "play"] },
  { id: "engineer", label: "Engineer", order: ["workspace", "ask", "lab", "keys", "now", "overlap", "findtime", "reveal", "play", "sea"] },
  { id: "designer", label: "Designer", order: ["lab", "keys", "reveal", "workspace", "ask", "now", "overlap", "findtime", "sea", "play"] },
  { id: "curious", label: "Just curious", order: ["play", "sea", "keys", "lab", "reveal", "ask", "now", "overlap", "workspace", "findtime"] },
];

const KEY = "adelia:widgets:v6";

function valid(order: unknown): order is WidgetId[] {
  return Array.isArray(order) && order.length === DEFAULT_ORDER.length && DEFAULT_ORDER.every((id) => order.includes(id));
}

/** The layout lives outside React so the server renders the default and the client restores the saved one. */
const boardStore = createStore<{ order: WidgetId[] }>({ order: DEFAULT_ORDER });
let restored = false;

export function WidgetBoard() {
  const order = useStore(boardStore, (s) => s.order);
  const lens = useUI((s) => s.lens);
  const jiggle = useUI((s) => s.jiggle);
  const [dragging, setDragging] = useState<WidgetId | null>(null);
  const refs = useRef(new Map<WidgetId, HTMLElement>());
  const boardRef = useRef<HTMLOListElement>(null);
  const firstRects = useRef<Map<WidgetId, DOMRect> | null>(null);
  const drag = useRef<{ id: WidgetId; grabX: number; grabY: number; pointerX: number; pointerY: number } | null>(null);
  const appliedLens = useRef<Lens | null>(null);
  const liveRef = useRef<HTMLParagraphElement>(null);
  /** Announces layout changes through the polite live region. */
  const say = (message: string) => {
    if (liveRef.current) liveRef.current.textContent = message;
  };

  // Restore saved layout (once per page load).
  useEffect(() => {
    if (restored) return;
    restored = true;
    const saved = readJSON<{ order?: unknown; lens?: Lens | null }>(KEY, {});
    if (valid(saved.order)) boardStore.set({ order: saved.order });
    if (saved.lens) {
      appliedLens.current = saved.lens;
      ui.set({ lens: saved.lens });
    }
  }, []);

  /** FLIP: remember where everything was, change the order, animate from old to new. */
  const reorder = (next: WidgetId[], message?: string) => {
    const rects = new Map<WidgetId, DOMRect>();
    for (const [id, el] of refs.current) rects.set(id, el.getBoundingClientRect());
    firstRects.current = rects;
    boardStore.set({ order: next });
    writeJSON(KEY, { order: next, lens: ui.get().lens });
    if (message) say(message);
  };

  useLayoutEffect(() => {
    const first = firstRects.current;
    if (!first) return;
    firstRects.current = null;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    for (const [id, el] of refs.current) {
      if (id === drag.current?.id) continue;
      const before = first.get(id);
      if (!before) continue;
      const after = el.getBoundingClientRect();
      const dx = before.left - after.left;
      const dy = before.top - after.top;
      if (Math.abs(dx) + Math.abs(dy) < 1) continue;
      el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "translate(0, 0)" }], { duration: 520, easing: "cubic-bezier(.34,1.3,.64,1)" });
    }
  }, [order]);

  // A lens (from the chips, the palette or Moci) reorders the board.
  const applyLens = useEffectEvent((next: Lens | null) => {
    if (!next || next === appliedLens.current) return;
    appliedLens.current = next;
    const preset = LENSES.find((l) => l.id === next);
    if (preset) reorder(preset.order, `Widgets arranged for: ${preset.label}`);
  });
  useEffect(() => applyLens(lens), [lens]);

  const move = (id: WidgetId, delta: number) => {
    const i = order.indexOf(id);
    const j = Math.max(0, Math.min(order.length - 1, i + delta));
    if (i === j) return;
    const next = [...order];
    next.splice(i, 1);
    next.splice(j, 0, id);
    sfx.tick();
    reorder(next, `${WIDGETS[id].label} moved to position ${j + 1} of ${order.length}`);
  };

  // Drag to rearrange (edit mode).
  const onHandleDown = (id: WidgetId, e: React.PointerEvent) => {
    const el = refs.current.get(id);
    if (!el) return;
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const rect = el.getBoundingClientRect();
    drag.current = { id, grabX: e.clientX - rect.left, grabY: e.clientY - rect.top, pointerX: e.clientX, pointerY: e.clientY };
    setDragging(id);
    sfx.pop();
  };

  const onHandleMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    d.pointerX = e.clientX;
    d.pointerY = e.clientY;
    const el = refs.current.get(d.id)!;
    const board = boardRef.current!.getBoundingClientRect();
    const x = e.clientX - board.left - d.grabX - el.offsetLeft;
    const y = e.clientY - board.top - d.grabY - el.offsetTop;
    el.style.transform = `translate(${x}px, ${y}px) rotate(2deg) scale(1.03)`;

    el.style.pointerEvents = "none";
    const under = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>("[data-widget]");
    el.style.pointerEvents = "";
    const target = under?.dataset.widget as WidgetId | undefined;
    if (target && target !== d.id) {
      const next = order.filter((w) => w !== d.id);
      const ti = next.indexOf(target);
      const r = under!.getBoundingClientRect();
      const after = e.clientX > r.left + r.width / 2 || e.clientY > r.top + r.height * 0.75;
      next.splice(after ? ti + 1 : ti, 0, d.id);
      if (next.join() !== order.join()) reorder(next);
    }
  };

  const onHandleUp = () => {
    const d = drag.current;
    if (!d) return;
    const el = refs.current.get(d.id);
    if (el) {
      const from = el.style.transform;
      el.style.transform = "";
      el.animate([{ transform: from }, { transform: "none" }], { duration: 380, easing: "cubic-bezier(.34,1.56,.64,1)" });
    }
    drag.current = null;
    setDragging(null);
    sfx.pop();
    say(`${WIDGETS[d.id].label} dropped at position ${order.indexOf(d.id) + 1}`);
  };

  return (
    <section id="widgets" aria-labelledby="widgets-title" className="container-page pb-[clamp(96px,13vw,176px)]" data-xr="WidgetBoard · FLIP reorder + lenses">
      <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
        <div className="max-w-[40rem]">
          <p className="type-eyebrow">Right now</p>
          <h2 id="widgets-title" className="type-display mt-3">
            Live from <span className="sticker-text">Bekasi</span>.
          </h2>
          <p className="mt-4 max-w-[44ch] text-muted">Her clock, her sky, your overlap. Pick who you are and the board rearranges itself.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div role="radiogroup" aria-label="Who's visiting? Rearranges the widgets" className="flex flex-wrap gap-1.5">
            {LENSES.map((l) => (
              <button
                key={l.id}
                type="button"
                role="radio"
                aria-checked={lens === l.id}
                onClick={() => {
                  sfx.pop();
                  ui.set({ lens: l.id });
                }}
                className="pill"
                data-size="sm"
                data-variant={lens === l.id ? "magenta" : undefined}
              >
                {l.label}
              </button>
            ))}
          </div>
          <button type="button" className="pill js-only" data-size="sm" data-variant={jiggle ? "ink" : "ghost"} aria-pressed={jiggle} onClick={() => ui.set({ jiggle: !jiggle })}>
            <GridIcon width={16} height={16} /> {jiggle ? "Done" : "Edit"}
          </button>
          {(lens || order.join() !== DEFAULT_ORDER.join()) && (
            <button
              type="button"
              className="text-14 font-semibold underline decoration-accent decoration-2 underline-offset-4"
              onClick={() => {
                ui.set({ lens: null });
                appliedLens.current = null;
                reorder(DEFAULT_ORDER, "Widgets reset");
              }}
            >
              Reset
            </button>
          )}
        </div>
      </div>
      {jiggle && <p className="mt-3 text-14 text-muted">Drag a widget by its handle, or use the arrow buttons. Your layout is saved on this device.</p>}

      <ol ref={boardRef} className="relative mt-12 grid grid-flow-dense grid-cols-1 gap-5 sm:grid-cols-2 md:mt-16 lg:grid-cols-12" aria-label="Widgets">
        {order.map((id, index) => {
          const { Component, span, label, tone } = WIDGETS[id];
          return (
            <li
              key={id}
              data-widget={id}
              ref={(el) => {
                if (el) refs.current.set(id, el);
                else refs.current.delete(id);
              }}
              aria-label={label}
              className={cn("widget relative p-6", span, tone, jiggle && dragging !== id && "widget-jiggle", dragging === id && "z-20 shadow-lg")}
              style={{ ["--jiggle-delay" as string]: `${(index % 4) * -0.12}s` }}
            >
              {jiggle && (
                <div className="absolute -top-3 right-3 z-10 flex gap-1">
                  <button type="button" className="pill" data-shape="icon" data-size="sm" aria-label={`Move ${label} earlier`} onClick={() => move(id, -1)} disabled={index === 0}>
                    <ArrowLeftIcon width={16} height={16} />
                  </button>
                  <button
                    type="button"
                    className="pill cursor-grab touch-none active:cursor-grabbing"
                    data-variant="magenta"
                    data-size="sm"
                    data-cursor="Drag"
                    aria-label={`Drag ${label}`}
                    onPointerDown={(e) => onHandleDown(id, e)}
                    onPointerMove={onHandleMove}
                    onPointerUp={onHandleUp}
                    onPointerCancel={onHandleUp}
                  >
                    ⠿
                  </button>
                  <button type="button" className="pill" data-shape="icon" data-size="sm" aria-label={`Move ${label} later`} onClick={() => move(id, 1)} disabled={index === order.length - 1}>
                    <ArrowRightIcon width={16} height={16} />
                  </button>
                </div>
              )}
              <Component />
            </li>
          );
        })}
      </ol>
      <p ref={liveRef} className="sr-only" aria-live="polite" />
    </section>
  );
}

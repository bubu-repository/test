"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Sticker } from "@/components/Sticker";
import { sfx } from "@/lib/sound";
import { hydrateStickers, placeSticker, removeSticker, STICKERS, useStickers, type Placement } from "@/lib/stickers";

const EMPTY: Placement[] = [];

/** Stickers the visitor has placed on this page. Draggable, keyboard-movable, peelable. */
export function StickerLayer() {
  const pathname = usePathname();
  const placed = useStickers((s) => s.placed[pathname] ?? EMPTY);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    hydrateStickers();
  }, []);

  useEffect(() => {
    const measure = () => setHeight(document.documentElement.scrollHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(document.body);
    return () => observer.disconnect();
  }, [pathname]);

  if (!placed.length) return null;

  return (
    <div className="pointer-events-none absolute top-0 left-0 z-[45] w-full" style={{ height }} aria-label="Your stickers" role="group">
      {placed.map((p) => (
        <PlacedSticker key={p.id} placement={p} route={pathname} />
      ))}
    </div>
  );
}

function PlacedSticker({ placement, route }: { placement: Placement; route: string }) {
  const def = STICKERS.find((s) => s.id === placement.id);
  const ref = useRef<HTMLButtonElement>(null);
  const drag = useRef<{ dx: number; dy: number; moved: boolean } | null>(null);
  // While dragging, the sticker follows a local position; otherwise it shows the saved one.
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const pos = dragPos ?? { x: placement.x, y: placement.y };
  const lifted = dragPos !== null;

  if (!def) return null;
  const width = () => document.documentElement.scrollWidth;
  const commit = (x: number, y: number) => placeSticker(route, { ...placement, x, y });

  return (
    <button
      ref={ref}
      type="button"
      className="pointer-events-auto absolute touch-none select-none"
      style={{
        left: `${pos.x}%`,
        top: pos.y,
        transform: `translate(-50%, -50%) rotate(${placement.r}deg) scale(${lifted ? 1.12 : 1})`,
        transition: lifted ? "transform 120ms var(--ease-out)" : "transform 260ms var(--ease-jelly)",
        filter: lifted ? "drop-shadow(0 18px 18px rgba(15,18,48,0.25))" : undefined,
      }}
      data-cursor="Drag"
      aria-label={`Sticker: ${def.name}. Drag, or use arrow keys to move. Delete removes it.`}
      onPointerDown={(e) => {
        const el = ref.current!;
        el.setPointerCapture(e.pointerId);
        const rect = el.getBoundingClientRect();
        drag.current = { dx: e.clientX - (rect.left + rect.width / 2), dy: e.clientY - (rect.top + rect.height / 2), moved: false };
        setDragPos({ x: placement.x, y: placement.y });
        sfx.tick();
      }}
      onPointerMove={(e) => {
        if (!drag.current) return;
        drag.current.moved = true;
        const x = ((e.clientX - drag.current.dx + window.scrollX) / width()) * 100;
        const y = e.clientY - drag.current.dy + window.scrollY;
        setDragPos({ x: Math.min(98, Math.max(2, x)), y: Math.max(20, y) });
      }}
      onPointerUp={() => {
        if (!drag.current) return;
        drag.current = null;
        sfx.pop();
        commit(pos.x, pos.y);
        setDragPos(null);
      }}
      onKeyDown={(e) => {
        const step = e.shiftKey ? 40 : 10;
        let { x, y } = pos;
        if (e.key === "ArrowLeft") x -= (step / width()) * 100;
        else if (e.key === "ArrowRight") x += (step / width()) * 100;
        else if (e.key === "ArrowUp") y -= step;
        else if (e.key === "ArrowDown") y += step;
        else if (e.key === "Delete" || e.key === "Backspace") {
          e.preventDefault();
          sfx.tear();
          removeSticker(route, placement.id);
          return;
        } else return;
        e.preventDefault();
        commit(x, y);
      }}
      onDoubleClick={() => {
        sfx.tear();
        removeSticker(route, placement.id);
      }}
    >
      <Sticker id={def.id} size={84} />
    </button>
  );
}

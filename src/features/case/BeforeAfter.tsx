"use client";

import { useId, useState } from "react";
import type { Project } from "@/content/projects";

function Panel({ side, data }: { side: "before" | "after"; data: Project["beforeAfter"] }) {
  const d = data[side];
  return (
    <div className={side === "before" ? "h-full bg-surface-2 p-6 md:p-8" : "flex h-full flex-col items-end bg-surface p-6 text-right md:p-8"}>
      <p className="type-pixel text-muted">{side === "before" ? "Before" : "After"}</p>
      <p className="type-subtitle mt-2 max-w-[18ch] text-32 md:text-[40px]">{d.title.replace(/^(Before|After): /, "")}</p>
      <ul className="mt-4 space-y-2 text-16">
        {d.points.map((p) => (
          <li key={p} className={side === "after" ? "flex flex-row-reverse gap-2" : "flex gap-2"}>
            <span aria-hidden="true" className={side === "before" ? "text-muted" : "text-accent-ink"}>
              {side === "before" ? "✗" : "✓"}
            </span>
            {p}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Before / after, side by side under a draggable divider. The control is a native range input
 * stretched over the panels, so it works with mouse, touch and keyboard for free.
 */
export function BeforeAfter({ data }: { data: Project["beforeAfter"] }) {
  const [split, setSplit] = useState(50);
  const id = useId();

  return (
    <figure className="widget overflow-hidden p-0" data-xr="BeforeAfter · range input over two panels">
      <div className="relative grid min-h-[340px] select-none">
        <div className="col-start-1 row-start-1">
          <Panel side="after" data={data} />
        </div>
        <div className="col-start-1 row-start-1" style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }} aria-hidden="true">
          <Panel side="before" data={data} />
        </div>
        <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 z-10 w-1 -translate-x-1/2 bg-white shadow-lg" style={{ left: `${split}%` }}>
          <span className="sticker absolute top-1/2 left-1/2 grid size-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-accent font-bold text-on-fill">
            ⇆
          </span>
        </div>
        <label htmlFor={id} className="sr-only">
          Compare before and after. Left shows before, right shows after.
        </label>
        <input
          id={id}
          type="range"
          min={0}
          max={100}
          value={split}
          onChange={(e) => setSplit(Number(e.target.value))}
          className="absolute inset-0 z-20 h-full w-full cursor-ew-resize opacity-0"
          aria-valuetext={`${split}% before`}
          data-cursor="Drag"
        />
      </div>
      <figcaption className="sr-only">
        Before: {data.before.title}. {data.before.points.join(". ")}. After: {data.after.title}. {data.after.points.join(". ")}.
      </figcaption>
    </figure>
  );
}

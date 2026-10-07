"use client";

import { dispatch } from "@/lib/actions";
import { sfx } from "@/lib/sound";

/* Moci as an 11×8 sprite: "#" body, "o" eye, "w" shine, "." blush. Two frames for the feet. */
const BODY = ["   #####   ", "  #w#####  ", " ######### ", " #o#####o# ", " ######### ", " ##.###.## ", "  #######  "];
const FEET = [["  ##   ##  "], ["   ## ##   "]];

function pixels(rows: string[], y0: number) {
  const out: { x: number; y: number; c: string }[] = [];
  rows.forEach((row, y) =>
    Array.from(row).forEach((ch, x) => {
      if (ch === "#") out.push({ x, y: y + y0, c: "var(--accent)" });
      else if (ch === "w") out.push({ x, y: y + y0, c: "#ffd1e8" });
      else if (ch === "o") out.push({ x, y: y + y0, c: "#1b1a18" });
      else if (ch === ".") out.push({ x, y: y + y0, c: "#c2006b" });
    }),
  );
  return out;
}

const body = pixels(BODY, 0);
const frames = FEET.map((f) => pixels(f, BODY.length));

/**
 * An 8-bit Moci that walks the ruler along the bottom of the mat, turning at each end (after the
 * sprite on Samuel Rizzon's site). Click it and the real Moci opens. Stands still for reduced motion.
 */
export function PixelMoci() {
  return (
    <div className="pixel-track" data-xr="PixelMoci · 11×8 sprite, CSS steps() walk cycle">
      <button
        type="button"
        className="pixel-moci js-only"
        aria-label="Ask Moci, Adelia's agent"
        data-cursor="Hi!"
        onClick={() => {
          sfx.boop();
          void dispatch({ type: "open", panel: "agent" });
        }}
      >
        <span className="pixel-moci__bubble" aria-hidden="true">
          psst. ask me
        </span>
        <span className="pixel-moci__flip">
          <svg viewBox="0 0 11 8" width="44" height="32" shapeRendering="crispEdges" aria-hidden="true">
            {body.map((p) => (
              <rect key={`b${p.x}-${p.y}`} x={p.x} y={p.y} width="1" height="1" fill={p.c} />
            ))}
            {frames.map((f, i) => (
              <g key={i} className={`pixel-moci__frame pixel-moci__frame--${i}`}>
                {f.map((p) => (
                  <rect key={`f${p.x}-${p.y}`} x={p.x} y={p.y} width="1" height="1" fill="#c2006b" />
                ))}
              </g>
            ))}
          </svg>
        </span>
      </button>
    </div>
  );
}

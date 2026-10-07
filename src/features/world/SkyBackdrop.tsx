import type { CSSProperties } from "react";

/** Where the little four-point glints sit in the sky (percent of the window) and when they twinkle. */
const GLINTS = [
  { x: 8, y: 14, s: 14, d: 0 },
  { x: 22, y: 62, s: 10, d: 1.6 },
  { x: 41, y: 9, s: 12, d: 3.1 },
  { x: 63, y: 34, s: 9, d: 0.8 },
  { x: 78, y: 12, s: 18, d: 2.2 },
  { x: 91, y: 52, s: 11, d: 4 },
  { x: 54, y: 78, s: 10, d: 2.8 },
];

/**
 * A window onto the summer sky: a rounded panel of vivid blue with real clouds (the sky photo laid
 * over the blue with luminosity), two layers of drifting clouds, a faint game-UI grid and a few
 * glints; the moon and stars at night. The page around it stays white. Purely decorative.
 */
export function SkyBackdrop() {
  return (
    <div className="sky" aria-hidden="true" data-xr="SkyBackdrop · sky window: photo + drifting cloud strips + grid">
      <div className="sky__image" />
      <div className="sky__moon" />
      <div className="sky__stars" />
      <div className="sky__clouds sky__clouds--far" />
      <div className="sky__clouds sky__clouds--near" />
      <div className="sky__grid" />
      {GLINTS.map((g, i) => (
        <span key={i} className="sky__glint" style={{ "--x": `${g.x}%`, "--y": `${g.y}%`, "--s": `${g.s}px`, "--d": `${g.d}s` } as CSSProperties} />
      ))}
    </div>
  );
}

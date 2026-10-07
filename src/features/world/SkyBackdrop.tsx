import type { CSSProperties } from "react";

/** Where the little four-point glints sit in the sky (percent of the viewport) and when they twinkle. */
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
 * The sky behind every page: a frame of the live sky shader, veiled so text stays readable,
 * two layers of clouds drifting at different speeds, a faint game-UI grid, the sun (or the moon
 * and stars at night) and a few glints. It sits behind everything and moves a little as you
 * scroll. Purely decorative.
 */
export function SkyBackdrop() {
  return (
    <div className="sky" aria-hidden="true" data-xr="SkyBackdrop · sky frame + drifting cloud masks + grid">
      <div className="sky__image" />
      <div className="sky__veil" />
      <div className="sky__sun" />
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

import { useId } from "react";
import { cn } from "@/lib/cn";

export type MociMood = "happy" | "think" | "oops";

/** A water drop: pointed where it left the surface, round where it pools. In a 100 × 100 box. */
const DROP = "M50 9C46 20 23 41 23 62a27 27 0 0 0 54 0C77 41 54 20 50 9Z";

/**
 * Moci itself, as SVG content in a 100 × 100 box: a drop of clear jelly with a face, in the same
 * hand as the guestbook creatures: colour pooled low, a white rim, light from the top right, two
 * dark eyes and a pink blush. `face={false}` for sizes where a face would turn to mush.
 */
export function MociDropShape({ mood = "happy", face = true }: { mood?: MociMood; face?: boolean }) {
  const id = useId();
  const body = `${id}body`;
  const haze = `${id}haze`;
  return (
    <>
      <defs>
        <radialGradient id={body} cx="50%" cy="80%" r="72%">
          <stop offset="0" stopColor="#5CB8F5" stopOpacity=".95" />
          <stop offset=".55" stopColor="#BFE8FF" stopOpacity=".92" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity=".98" />
        </radialGradient>
        <linearGradient id={haze} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity=".7" />
          <stop offset=".55" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={DROP} fill={`url(#${body})`} stroke="#FFFFFF" strokeOpacity=".9" strokeWidth="2.4" />
      <path d={DROP} fill={`url(#${haze})`} />
      <ellipse cx="60" cy="40" rx="7.5" ry="4" transform="rotate(-38 60 40)" fill="#FFFFFF" opacity=".9" />
      <circle cx="64" cy="31" r="2.4" fill="#FFFFFF" />
      {face && (
        <g>
          <ellipse cx="34" cy="71" rx="5.5" ry="3.2" fill="#FF8FB8" opacity=".6" />
          <ellipse cx="66" cy="71" rx="5.5" ry="3.2" fill="#FF8FB8" opacity=".6" />
          <circle cx="41" cy="63" r="3.6" fill="#0B1F33" />
          <circle cx="59" cy="63" r="3.6" fill="#0B1F33" />
          <circle cx="42.3" cy="61.6" r="1.2" fill="#FFFFFF" />
          <circle cx="60.3" cy="61.6" r="1.2" fill="#FFFFFF" />
          <path d={mood === "oops" ? "M45.5 71.5h9" : "M45.5 70q4.5 4 9 0"} fill="none" stroke="#0B1F33" strokeWidth="2.4" strokeLinecap="round" />
        </g>
      )}
    </>
  );
}

/** Moci as a standalone picture. */
export function MociDrop({ size, mood = "happy", className }: { size: number; mood?: MociMood; className?: string }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} focusable="false" aria-hidden="true" className={className}>
      <MociDropShape mood={mood} face={size >= 18} />
    </svg>
  );
}

/** Moci as the site's round mark (the agent, the guide, the loader): the drop inside a glossy Aero bubble. It wobbles while it thinks. */
export function SiteAvatar({ size = 40, mood = "happy", className }: { size?: number; mood?: MociMood; className?: string }) {
  return (
    <span aria-hidden="true" className={cn("site-avatar", mood === "think" && "is-thinking", className)} style={{ width: size, height: size }}>
      <MociDrop size={size * 0.78} mood={mood} className="site-avatar__drop" />
    </span>
  );
}

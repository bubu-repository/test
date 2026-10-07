import type { StickerShape } from "@/lib/stickers";
import { cn } from "@/lib/cn";

function scallopPath(bumps = 14, r = 40, depth = 5) {
  const points: string[] = [];
  for (let i = 0; i <= bumps * 8; i++) {
    const a = (i / (bumps * 8)) * Math.PI * 2;
    const rr = r + Math.cos(a * bumps) * depth;
    points.push(`${(50 + Math.cos(a) * rr).toFixed(2)},${(50 + Math.sin(a) * rr).toFixed(2)}`);
  }
  return `M${points.join("L")}Z`;
}

function starPath(spikes = 10, outer = 45, inner = 33) {
  const points: string[] = [];
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
    points.push(`${(50 + Math.cos(a) * r).toFixed(2)},${(50 + Math.sin(a) * r).toFixed(2)}`);
  }
  return `M${points.join("L")}Z`;
}

const SHAPES: Record<StickerShape, string> = {
  circle: "M50 8a42 42 0 1 1 0 84a42 42 0 1 1 0-84Z",
  star: starPath(),
  heart: "M50 86C20 66 8 50 8 33C8 19 19 9 32 9c8 0 14 4 18 10c4-6 10-10 18-10c13 0 24 10 24 24c0 17-12 33-42 53Z",
  scallop: scallopPath(),
  blob: "M52 9c18 0 33 9 37 25c4 15-2 26-6 36c-5 12-16 21-32 21c-17 0-30-8-36-21C9 58 6 44 12 31C18 17 33 9 52 9Z",
  ticket: "M14 18h72a4 4 0 0 1 4 4v18a10 10 0 0 0 0 20v18a4 4 0 0 1-4 4H14a4 4 0 0 1-4-4V60a10 10 0 0 0 0-20V22a4 4 0 0 1 4-4Z",
};

type StickerProps = {
  shape: StickerShape;
  tone: string;
  emoji: string;
  size?: number;
  locked?: boolean;
  className?: string;
};

/** A die-cut sticker: coloured shape, thick white edge, soft shadow, emoji on top. */
export function Sticker({ shape, tone, emoji, size = 72, locked = false, className }: StickerProps) {
  return (
    <span aria-hidden="true" className={cn("relative inline-grid shrink-0 place-items-center", className)} style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" width={size} height={size} className={cn("absolute inset-0 overflow-visible", !locked && "drop-shadow-[0_6px_10px_rgba(15,18,48,0.22)]")}>
        <path
          d={SHAPES[shape]}
          fill={locked ? "transparent" : `var(--${tone})`}
          stroke={locked ? "color-mix(in srgb, var(--ink) 30%, transparent)" : "#ffffff"}
          strokeWidth={locked ? 3 : 7}
          strokeDasharray={locked ? "6 6" : undefined}
          strokeLinejoin="round"
          paintOrder="stroke"
        />
        {!locked && <ellipse cx="38" cy="30" rx="18" ry="9" fill="#ffffff" opacity="0.35" />}
      </svg>
      <span className={cn("relative leading-none", locked && "font-display font-bold text-muted")} style={{ fontSize: size * 0.42 }}>
        {locked ? "?" : emoji}
      </span>
    </span>
  );
}

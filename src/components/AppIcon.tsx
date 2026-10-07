import type { CSSProperties, ReactNode } from "react";
import type { Tone } from "@/content/projects";
import { cn } from "@/lib/cn";

/** Icon backgrounds per tone: soft top-to-bottom gradients, like iOS app icons. */
export const TONE_GRADIENT: Record<Tone, string> = {
  magenta: "radial-gradient(120% 120% at 30% 10%, #FF8CC8 0%, #F41B8D 50%, #B8006A 100%)",
  cobalt: "linear-gradient(180deg, #6CB2FF, #2860F0)",
  sun: "linear-gradient(180deg, #C7D2FE, #6D7CF5)",
  lime: "linear-gradient(180deg, #99F6E4, #14B8A6)",
  violet: "linear-gradient(180deg, #C995FF, #7A3CF0)",
  mint: "linear-gradient(180deg, #7FE3F2, #0EA5C6)",
  sky: "linear-gradient(180deg, #A6DBFF, #3BA0FF)",
  ink: "linear-gradient(180deg, #2A3140, #0E131B)",
  pink: "linear-gradient(180deg, #FFC9E4, #FF7AB8)",
  red: "linear-gradient(180deg, #FF8FA3, #F43F5E)",
};

/** A glossy squircle app icon in one tone. The glyph is decorative; label the parent instead. */
export function AppIcon({ tone, size = 56, className, style, children }: { tone: Tone; size?: number; className?: string; style?: CSSProperties; children: ReactNode }) {
  return (
    <span aria-hidden="true" className={cn("app-icon", className)} style={{ "--app-bg": TONE_GRADIENT[tone], "--size": `${size}px`, borderRadius: "23%", ...style } as CSSProperties}>
      {children}
    </span>
  );
}

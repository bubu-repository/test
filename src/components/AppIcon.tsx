import type { CSSProperties, ReactNode } from "react";
import type { Tone } from "@/content/projects";
import { cn } from "@/lib/cn";

/** Icon backgrounds per tone: soft top-to-bottom gradients, like iOS app icons. */
export const TONE_GRADIENT: Record<Tone, string> = {
  magenta: "radial-gradient(120% 120% at 30% 10%, #FF8CC8 0%, #F41B8D 50%, #B8006A 100%)",
  cobalt: "linear-gradient(180deg, #6CB2FF, #2860F0)",
  sun: "linear-gradient(180deg, #FFDB5C, #FF9F0A)",
  lime: "linear-gradient(180deg, #DDF76A, #7FBF00)",
  violet: "linear-gradient(180deg, #C995FF, #7A3CF0)",
  mint: "linear-gradient(180deg, #6BE38A, #1FB24A)",
  sky: "linear-gradient(180deg, #A6DBFF, #3BA0FF)",
  ink: "linear-gradient(180deg, #3A3A44, #15151A)",
  pink: "linear-gradient(180deg, #FFC9E4, #FF7AB8)",
  red: "linear-gradient(180deg, #FF7C6E, #FF3B30)",
};

/** A glossy squircle app icon in one tone. The glyph is decorative; label the parent instead. */
export function AppIcon({ tone, size = 56, className, style, children }: { tone: Tone; size?: number; className?: string; style?: CSSProperties; children: ReactNode }) {
  return (
    <span aria-hidden="true" className={cn("app-icon", className)} style={{ "--app-bg": TONE_GRADIENT[tone], "--size": `${size}px`, borderRadius: "23%", ...style } as CSSProperties}>
      {children}
    </span>
  );
}

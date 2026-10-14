import type { CSSProperties, ReactNode } from "react";
import type { Tone } from "@/content/projects";
import { cn } from "@/lib/cn";

/** Icon backgrounds per tone: soft top-to-bottom gradients, like iOS app icons. */
export const TONE_GRADIENT: Record<Tone, string> = {
  accent: "radial-gradient(120% 120% at 30% 10%, #9FD8FB 0%, #1A8FE8 50%, #0A58BE 100%)",
  cobalt: "linear-gradient(180deg, #8DBDF0, #406BCE)",
  sun: "linear-gradient(180deg, #FBE39A, #E8B84A)",
  lime: "linear-gradient(180deg, #7AD39E, #3A965C)",
  violet: "linear-gradient(180deg, #C9D6FA, #6F8FE6)",
  mint: "linear-gradient(180deg, #A5DEEA, #3EA7C2)",
  sky: "linear-gradient(180deg, #B7DCF6, #499FE3)",
  ink: "linear-gradient(180deg, #3A4A78, #1D2A4D)",
  pink: "linear-gradient(180deg, #FFD6E8, #FF7EB6)",
  red: "linear-gradient(180deg, #F2A9B4, #E05864)",
};

/** A glossy squircle app icon in one tone. The glyph is decorative; label the parent instead. */
export function AppIcon({ tone, size = 56, className, style, children }: { tone: Tone; size?: number; className?: string; style?: CSSProperties; children: ReactNode }) {
  return (
    <span aria-hidden="true" className={cn("app-icon", className)} style={{ "--app-bg": TONE_GRADIENT[tone], "--app-fg": tone === "sun" ? "#1D2A4D" : undefined, "--size": `${size}px`, borderRadius: "23%", ...style } as CSSProperties}>
      {children}
    </span>
  );
}

import type { CSSProperties, ReactNode } from "react";
import type { Tone } from "@/content/projects";
import { cn } from "@/lib/cn";

/** Icon backgrounds per tone: soft top-to-bottom gradients, like iOS app icons. */
export const TONE_GRADIENT: Record<Tone, string> = {
  magenta: "radial-gradient(120% 120% at 30% 10%, #FF8CB8 0%, #FF3F86 50%, #C2185B 100%)",
  cobalt: "linear-gradient(180deg, #6CB2FF, #3B66E0)",
  sun: "linear-gradient(180deg, #FFE680, #FFC21F)",
  lime: "linear-gradient(180deg, #5BD98A, #15803D)",
  violet: "linear-gradient(180deg, #C4A8FF, #8B5CF6)",
  mint: "linear-gradient(180deg, #8CE6F5, #12A8CC)",
  sky: "linear-gradient(180deg, #A6DBFF, #1EA7FF)",
  ink: "linear-gradient(180deg, #3A4A78, #1D2A4D)",
  pink: "linear-gradient(180deg, #FFC9E4, #FF6FB5)",
  red: "linear-gradient(180deg, #FF9AAE, #FF4D6D)",
};

/** A glossy squircle app icon in one tone. The glyph is decorative; label the parent instead. */
export function AppIcon({ tone, size = 56, className, style, children }: { tone: Tone; size?: number; className?: string; style?: CSSProperties; children: ReactNode }) {
  return (
    <span aria-hidden="true" className={cn("app-icon", className)} style={{ "--app-bg": TONE_GRADIENT[tone], "--app-fg": tone === "sun" ? "#1D2A4D" : undefined, "--size": `${size}px`, borderRadius: "23%", ...style } as CSSProperties}>
      {children}
    </span>
  );
}

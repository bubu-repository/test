import type { CSSProperties, ReactNode } from "react";
import type { Tone } from "@/content/projects";
import { cn } from "@/lib/cn";

/** Icon backgrounds per tone: soft top-to-bottom gradients, like iOS app icons. */
export const TONE_GRADIENT: Record<Tone, string> = {
  magenta: "radial-gradient(120% 120% at 30% 10%, #EB8DAE 0%, #D8588F 50%, #AB366C 100%)",
  cobalt: "linear-gradient(180deg, #8DBDF0, #406BCE)",
  sun: "linear-gradient(180deg, #FBE39A, #E8B84A)",
  lime: "linear-gradient(180deg, #7AD39E, #3A965C)",
  violet: "linear-gradient(180deg, #C6B6EC, #8968D4)",
  mint: "linear-gradient(180deg, #A5DEEA, #3EA7C2)",
  sky: "linear-gradient(180deg, #B7DCF6, #499FE3)",
  ink: "linear-gradient(180deg, #3A4A78, #1D2A4D)",
  pink: "linear-gradient(180deg, #F9D3E2, #E88CB1)",
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

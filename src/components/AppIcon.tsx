import type { CSSProperties, ReactNode } from "react";
import type { Tone } from "@/content/projects";
import { cn } from "@/lib/cn";

/** Icon backgrounds per tone: soft top-to-bottom gradients, like iOS app icons. */
export const TONE_GRADIENT: Record<Tone, string> = {
  magenta: "radial-gradient(120% 120% at 30% 10%, #FFC4E1 0%, #FF8CC6 50%, #EE5FA6 100%)",
  cobalt: "linear-gradient(180deg, #A9D2FF, #5E95F2)",
  sun: "linear-gradient(180deg, #E0DBFF, #9C90F5)",
  lime: "linear-gradient(180deg, #C2F5EA, #4FCDB5)",
  violet: "linear-gradient(180deg, #E2CFFF, #A07BF2)",
  mint: "linear-gradient(180deg, #B7EEF8, #45BCD8)",
  sky: "linear-gradient(180deg, #CDEBFF, #74B9FA)",
  ink: "linear-gradient(180deg, #3A4A78, #1D2A4D)",
  pink: "linear-gradient(180deg, #FFDDEE, #FF9CCB)",
  red: "linear-gradient(180deg, #FFB3C1, #FF6B8A)",
};

/** A glossy squircle app icon in one tone. The glyph is decorative; label the parent instead. */
export function AppIcon({ tone, size = 56, className, style, children }: { tone: Tone; size?: number; className?: string; style?: CSSProperties; children: ReactNode }) {
  return (
    <span aria-hidden="true" className={cn("app-icon", className)} style={{ "--app-bg": TONE_GRADIENT[tone], "--size": `${size}px`, borderRadius: "23%", ...style } as CSSProperties}>
      {children}
    </span>
  );
}

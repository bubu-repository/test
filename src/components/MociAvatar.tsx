import { cn } from "@/lib/cn";

/**
 * Moci, a drop of clear water: the body refracts whatever is behind it, with a bright rim, glints,
 * a blue pool of light at the bottom, blush and blinking eyes. Used everywhere Moci shows up.
 */
export function MociAvatar({ size = 40, mood = "happy", className }: { size?: number; mood?: "happy" | "think" | "oops"; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("moci-avatar relative inline-block shrink-0", className)}
      data-mood={mood}
      style={{ width: size, height: size * 0.9 }}
    >
      <span className="moci-avatar__body" />
      <span className="moci-avatar__eyes">
        <span />
        <span />
      </span>
      <span className="moci-avatar__mouth" />
    </span>
  );
}

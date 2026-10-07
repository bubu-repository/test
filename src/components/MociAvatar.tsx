import { cn } from "@/lib/cn";

/**
 * Moci as a small CSS jelly: magenta body, glossy highlight, blinking eyes.
 * The big WebGL version lives in the hero; this one is for the chat, tour and 404.
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

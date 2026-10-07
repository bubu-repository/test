import { cn } from "@/lib/cn";

/**
 * Moci, a little jelly of summer water: translucent sky blue with an iridescent glow inside (pink,
 * yellow, mint), a bright highlight, two small arms, dark blue eyes that blink and a smile. Used
 * everywhere Moci shows up.
 */
export function MociAvatar({ size = 40, mood = "happy", className }: { size?: number; mood?: "happy" | "think" | "oops"; className?: string }) {
  return (
    <span aria-hidden="true" className={cn("moci-avatar relative inline-block shrink-0", className)} data-mood={mood} style={{ width: size, height: size * 0.92 }}>
      <span className="moci-avatar__arm moci-avatar__arm--l" />
      <span className="moci-avatar__arm moci-avatar__arm--r" />
      <span className="moci-avatar__body" />
      <span className="moci-avatar__eyes">
        <span />
        <span />
      </span>
      <span className="moci-avatar__mouth" />
    </span>
  );
}

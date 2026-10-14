import { SiteAvatar } from "./SiteAvatar";

/** Moci, Adelia's agent: the site's round pink-and-sky mark. It breathes while it thinks. */
export function MociAvatar({ size = 40, mood = "happy", className }: { size?: number; mood?: "happy" | "think" | "oops"; className?: string }) {
  return <SiteAvatar size={size} thinking={mood === "think"} className={className} />;
}

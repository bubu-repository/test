import { SiteAvatar, type MociMood } from "./SiteAvatar";

/** Moci, Adelia's agent: a drop of clear jelly in a glossy bubble. It wobbles while it thinks. */
export function MociAvatar({ size = 40, mood = "happy", className }: { size?: number; mood?: MociMood; className?: string }) {
  return <SiteAvatar size={size} mood={mood} className={className} />;
}

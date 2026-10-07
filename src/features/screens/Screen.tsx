import { cn } from "@/lib/cn";
import { Phone } from "./Phone";
import { SCREENS } from "./registry";

/** One product screen in its phone, by key. `label` makes it an image for screen readers. */
export function Screen({ id, label, className }: { id: string; label?: string; className?: string }) {
  const s = SCREENS[id];
  if (!s) return null;
  const { Component } = s;
  return (
    <Phone time={s.time} dark={s.dark} label={label} className={cn(className)}>
      <Component />
    </Phone>
  );
}

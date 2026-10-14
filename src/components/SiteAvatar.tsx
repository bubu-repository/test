import { cn } from "@/lib/cn";

/**
 * A calm round mark in the site's pink and sky: the agent's face, the guided walk's guide, the
 * loading screen. A small white sparkle in the middle; nothing that pretends to be a person.
 */
export function SiteAvatar({ size = 40, thinking = false, className }: { size?: number; thinking?: boolean; className?: string }) {
  return (
    <span aria-hidden="true" className={cn("site-avatar", thinking && "is-thinking", className)} style={{ width: size, height: size }}>
      <svg viewBox="0 0 24 24" width={size * 0.5} height={size * 0.5} focusable="false">
        <path d="M12 3.2c.7 4.4 2.3 6.4 6.8 7.2-4.5.8-6.1 2.8-6.8 7.2-.7-4.4-2.3-6.4-6.8-7.2 4.5-.8 6.1-2.8 6.8-7.2Z" fill="#FFFFFF" />
        <circle cx="18.6" cy="5.2" r="1.3" fill="#FFFFFF" opacity=".85" />
      </svg>
    </span>
  );
}

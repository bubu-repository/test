"use client";

import { useNow } from "@/lib/hooks";
import { formatTime } from "@/lib/time";

/**
 * A clock for a time zone ("local" = the visitor's). Renders a placeholder on the server,
 * so the prerendered HTML never depends on the build time.
 */
export function LiveClock({ zone, seconds = false, className }: { zone: string | "local"; seconds?: boolean; className?: string }) {
  const now = useNow();
  const date = now ? new Date(now * 1000) : null;
  const tz = zone === "local" ? undefined : zone;
  const text = date
    ? tz
      ? formatTime(tz, date, seconds)
      : new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", ...(seconds ? { second: "2-digit" } : {}), hourCycle: "h23" }).format(date)
    : seconds
      ? "--:--:--"
      : "--:--";

  return (
    <time className={className} dateTime={date?.toISOString()}>
      {text}
    </time>
  );
}

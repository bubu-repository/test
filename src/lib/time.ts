import { identity } from "@/content/profile";

/** Hour (0–24, fractional) in a time zone for a given instant. */
export function hourIn(timeZone: string, date = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return get("hour") + get("minute") / 60 + get("second") / 3600;
}

export function formatTime(timeZone: string, date = new Date(), withSeconds = false): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    ...(withSeconds ? { second: "2-digit" } : {}),
    hourCycle: "h23",
  }).format(date);
}

/** Offset of a time zone from UTC in hours at a given instant (e.g. +7 for Asia/Jakarta). */
export function offsetHours(timeZone: string, date = new Date()): number {
  const utc = hourIn("UTC", date);
  let diff = hourIn(timeZone, date) - utc;
  if (diff > 14) diff -= 24;
  if (diff < -12) diff += 24;
  return Math.round(diff * 4) / 4;
}

export function formatOffset(hours: number): string {
  const sign = hours >= 0 ? "+" : "−";
  const abs = Math.abs(hours);
  const h = Math.floor(abs);
  const m = Math.round((abs - h) * 60);
  return `UTC${sign}${h}${m ? `:${String(m).padStart(2, "0")}` : ""}`;
}

export function visitorTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/** City-ish label for a time zone id: "America/New_York" → "New York". */
export function zoneCity(timeZone: string): string {
  const last = timeZone.split("/").pop() ?? timeZone;
  return last.replace(/_/g, " ");
}

export type Overlap = {
  /** Adelia's working window expressed in the visitor's local hours. */
  hersInYours: { start: number; end: number };
  /** Overlap windows in the visitor's local hours (can wrap past midnight → up to two ranges). */
  ranges: { start: number; end: number }[];
  hours: number;
};

/**
 * Overlap between Adelia's working hours (in Bekasi) and the visitor's 9–18 working day.
 * Everything is returned in the visitor's local hours so the ring reads from their point of view.
 */
export function workingOverlap(visitorZone: string, date = new Date(), visitorDay = { start: 9, end: 18 }): Overlap {
  const shift = offsetHours(visitorZone, date) - offsetHours(identity.timeZone, date);
  const norm = (h: number) => ((h % 24) + 24) % 24;
  const start = norm(identity.workingHours.start + shift);
  const end = norm(identity.workingHours.end + shift);

  // Expand both windows into minute sets on a 24h circle and intersect.
  const inWindow = (h: number, s: number, e: number) => (s <= e ? h >= s && h < e : h >= s || h < e);
  const ranges: { start: number; end: number }[] = [];
  let current: { start: number; end: number } | null = null;
  for (let m = 0; m < 24 * 60; m += 15) {
    const h = m / 60;
    const both = inWindow(h, start, end) && inWindow(h, visitorDay.start, visitorDay.end);
    if (both && !current) current = { start: h, end: h + 0.25 };
    else if (both && current) current.end = h + 0.25;
    else if (!both && current) {
      ranges.push(current);
      current = null;
    }
  }
  if (current) ranges.push(current);
  const hours = ranges.reduce((sum, r) => sum + (r.end - r.start), 0);
  return { hersInYours: { start, end }, ranges, hours };
}

export function formatHour(h: number): string {
  const hh = Math.floor(((h % 24) + 24) % 24);
  const mm = Math.round((h - Math.floor(h)) * 60) % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

/** What Adelia is probably doing right now, from Bekasi time. Light-hearted, not a tracker. */
export function probableStatus(date = new Date()): { label: string; emoji: string } {
  const h = hourIn(identity.timeZone, date);
  const day = new Intl.DateTimeFormat("en-US", { timeZone: identity.timeZone, weekday: "short" }).format(date);
  const weekend = day === "Sat" || day === "Sun";
  if (h < 6) return { label: "Asleep. Replies after sunrise.", emoji: "😴" };
  if (h < 8) return { label: "Coffee and inbox zero", emoji: "☕" };
  if (weekend && h < 22) return { label: "Weekend. Probably building something weird.", emoji: "🧪" };
  if (h < 12) return { label: "Deep work: shipping", emoji: "🚀" };
  if (h < 13) return { label: "Lunch, probably nasi padang", emoji: "🍛" };
  if (h < 18) return { label: "Building and reviewing evals", emoji: "🛠️" };
  if (h < 22) return { label: "Off the clock, still online-ish", emoji: "🌆" };
  return { label: "Night owl mode: side projects", emoji: "🦉" };
}

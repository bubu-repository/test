import { person } from '@/content/site';

export type TimeOfDay = 'morning' | 'dusk' | 'night';

/** Hour (0-24, fractional) in a time zone, for a given instant. */
export function hourIn(timeZone: string, at = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(at);
  const h = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
  const m = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
  return h + m / 60;
}

/** Morning 05:00-16:59, dusk 17:00-18:59, night otherwise. Bekasi is near the equator: sunset ~18:00 all year. */
export function timeOfDay(hour: number): TimeOfDay {
  if (hour >= 5 && hour < 17) return 'morning';
  if (hour >= 17 && hour < 19) return 'dusk';
  return 'night';
}

export const herTimeZone = person.timeZone;
export const herHour = (at = new Date()) => hourIn(herTimeZone, at);

export function formatClock(timeZone: string, at = new Date()): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(at);
}

export function viewerTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/** UTC offset of a zone in hours at an instant (e.g. 7 for Asia/Jakarta). */
export function offsetHours(timeZone: string, at = new Date()): number {
  const local = new Date(at.toLocaleString('en-US', { timeZone }));
  const utc = new Date(at.toLocaleString('en-US', { timeZone: 'UTC' }));
  return Math.round(((local.getTime() - utc.getTime()) / 36e5) * 4) / 4;
}

/**
 * Hours that her working day overlaps the viewer's, both 09:00-18:00 local (her hours from site.ts).
 * Computed on a 48h line in UTC so days that wrap still count. Real data, no estimate.
 */
export function overlapHours(viewerZone = viewerTimeZone(), at = new Date()): { hours: number; herOffset: number; viewerOffset: number } {
  const herOffset = offsetHours(herTimeZone, at);
  const viewerOffset = offsetHours(viewerZone, at);
  const { start, end } = person.workHours;
  const her: [number, number] = [start - herOffset, end - herOffset];
  const view: [number, number] = [9 - viewerOffset, 18 - viewerOffset];
  let best = 0;
  for (const shift of [-24, 0, 24]) {
    const a = Math.max(her[0], view[0] + shift);
    const b = Math.min(her[1], view[1] + shift);
    best = Math.max(best, b - a);
  }
  return { hours: Math.max(0, Math.round(best * 2) / 2), herOffset, viewerOffset };
}

export function cityOf(zone: string): string {
  const last = zone.split('/').pop() ?? zone;
  return last.replace(/_/g, ' ');
}

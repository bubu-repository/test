/* ==========================================================================
   Time-zone helpers for Bekasi (WIB, UTC+7, no daylight saving) and the
   visitor's own zone. Ported from the legacy adelia.cc `lib/time.ts`
   (hourIn, offsetHours, workingOverlap…) and shared by the clock (overlap
   ring) and the ticket printer (preferred slots in WIB and your time).
   ========================================================================== */
import { identity, practical } from '@/content/profile';

export const HOME_TZ: string = identity.timeZone; // 'Asia/Jakarta' (Bekasi)
export const HOME_CITY: string = identity.city; // 'Bekasi'
export const WORK: { start: number; end: number } = { start: identity.workingHours.start, end: identity.workingHours.end };
/** Her own words on time zones (profile.ts → practical → "Time zones"). */
export const TZ_NOTE: string = practical.find((p) => p.label === 'Time zones')?.value ?? '';

/** Hour (0–24, fractional) in a time zone for a given instant. */
export function hourIn(timeZone: string, date = new Date()): number {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(date);
    const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
    return (get('hour') % 24) + get('minute') / 60 + get('second') / 3600;
  } catch {
    return date.getUTCHours() + date.getUTCMinutes() / 60;
  }
}

/** Offset of a zone from UTC in hours at an instant (e.g. +7 for Asia/Jakarta). */
export function offsetHours(timeZone: string, date = new Date()): number {
  let diff = hourIn(timeZone, date) - hourIn('UTC', date);
  if (diff > 14) diff -= 24;
  if (diff < -12) diff += 24;
  return Math.round(diff * 4) / 4;
}

export function formatOffset(hours: number): string {
  const sign = hours >= 0 ? '+' : '−';
  const abs = Math.abs(hours);
  const h = Math.floor(abs);
  const m = Math.round((abs - h) * 60);
  return `UTC${sign}${h}${m ? `:${String(m).padStart(2, '0')}` : ''}`;
}

export function visitorTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/** "America/New_York" → "New York". */
export function zoneCity(timeZone: string): string {
  if (timeZone === HOME_TZ) return HOME_CITY;
  return (timeZone.split('/').pop() ?? timeZone).replace(/_/g, ' ');
}

/** Same wall clock as Bekasi right now (Jakarta, Pontianak… all WIB). */
export const sameAsHome = (tz: string, date = new Date()) => offsetHours(tz, date) === offsetHours(HOME_TZ, date);

export function formatHour(h: number): string {
  const n = ((h % 24) + 24) % 24;
  const hh = Math.floor(n);
  const mm = Math.round((n - hh) * 60) % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

/** Format an instant in a zone (en-GB, 24h). Falls back to the browser zone if the id is unknown. */
export function fmtIn(timeZone: string, date: Date, o: Intl.DateTimeFormatOptions): string {
  try {
    return new Intl.DateTimeFormat('en-GB', { timeZone, hourCycle: 'h23', ...o }).format(date);
  } catch {
    return new Intl.DateTimeFormat('en-GB', { hourCycle: 'h23', ...o }).format(date);
  }
}

export interface Overlap {
  /** Her working window in the visitor's local hours. */
  hersInYours: { start: number; end: number };
  /** Overlap windows in the visitor's local hours (can wrap past midnight → up to two ranges). */
  ranges: { start: number; end: number }[];
  hours: number;
}

/** Overlap between her working hours (in Bekasi) and the visitor's working day, in the visitor's hours. */
export function workingOverlap(visitorZone: string, date = new Date(), visitorDay = { start: 9, end: 18 }): Overlap {
  const shift = offsetHours(visitorZone, date) - offsetHours(HOME_TZ, date);
  const norm = (h: number) => ((h % 24) + 24) % 24;
  const start = norm(WORK.start + shift);
  const end = norm(WORK.end + shift);
  const inWindow = (h: number, s: number, e: number) => (s <= e ? h >= s && h < e : h >= s || h < e);
  const ranges: { start: number; end: number }[] = [];
  let cur: { start: number; end: number } | null = null;
  for (let m = 0; m < 24 * 60; m += 15) {
    const h = m / 60;
    const both = inWindow(h, start, end) && inWindow(h, visitorDay.start, visitorDay.end);
    if (both && !cur) cur = { start: h, end: h + 0.25 };
    else if (both && cur) cur.end = h + 0.25;
    else if (!both && cur) {
      ranges.push(cur);
      cur = null;
    }
  }
  if (cur) ranges.push(cur);
  // a window that wraps midnight shows up as two pieces: join them
  if (ranges.length > 1 && ranges[0].start === 0 && ranges[ranges.length - 1].end === 24) {
    const last = ranges.pop()!;
    ranges[0] = { start: last.start, end: ranges[0].end + 24 };
  }
  const hours = ranges.reduce((s, r) => s + (r.end - r.start), 0);
  return { hersInYours: { start, end }, ranges, hours };
}

/** Her own time-zone advice for where the visitor is (from profile.ts "Time zones"). */
export function regionTip(visitorZone: string, date = new Date()): string {
  const v = offsetHours(visitorZone, date);
  if (sameAsHome(visitorZone, date)) return 'Same clock as Bekasi: her whole working day is yours too.';
  if (v <= -3) return 'For US teams she works async first, with a daily call at 07:00–09:00 WIB (late afternoon the day before on the West Coast).';
  if (v >= -1 && v <= 3) return 'For European teams she can shift to 12:00–21:00 WIB, which gives about 6 hours with CET.';
  return 'Her usual 09:00–18:00 WIB gives 4+ hours of overlap from Dubai to Sydney.';
}

/** A few places hiring teams often sit, for "compare with". */
export const ZONES: { id: string; label: string }[] = [
  { id: 'Asia/Singapore', label: 'Singapore' },
  { id: 'Asia/Tokyo', label: 'Tokyo' },
  { id: 'Australia/Sydney', label: 'Sydney' },
  { id: 'Asia/Dubai', label: 'Dubai' },
  { id: 'Asia/Kolkata', label: 'Bengaluru' },
  { id: 'Europe/London', label: 'London' },
  { id: 'Europe/Berlin', label: 'Berlin' },
  { id: 'America/New_York', label: 'New York' },
  { id: 'America/Los_Angeles', label: 'San Francisco' },
];

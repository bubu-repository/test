import { useEffect, useState, type ComponentType } from 'react';
import { person } from '@/content/site';
import { cityOf, formatClock, herTimeZone, overlapHours, viewerTimeZone } from '@/lib/time';
import type { PhoneApp } from '@/state';
import { Ring } from '@/ui/Ring';
import { IconCall, IconChat, IconPosts, IconWork } from './icons';

/** Pieces the phone overlay and the bento tile share: clock, overlap widget, wallpaper, status bar. */

export const APPS: { id: PhoneApp; name: string; Icon: ComponentType<{ className?: string }> }[] = [
  { id: 'posts', name: 'Posts', Icon: IconPosts },
  { id: 'chat', name: 'Chat', Icon: IconChat },
  { id: 'call', name: 'Call', Icon: IconCall },
  { id: 'work', name: 'Work', Icon: IconWork },
];

/** Her working day in hours (9 with the default 09:00 to 18:00): the ring's maximum. */
export const WORKDAY = person.workHours.end - person.workHours.start;
const hh = (h: number) => `${String(h).padStart(2, '0')}:00`;
/** The assumption behind the count, said out loud: both days run 09:00 to 18:00 local. */
const HOURS = `${hh(person.workHours.start)} to ${hh(person.workHours.end)}`;

/** The current time, re-read on the step boundary (10 s by default) so the clock never lags a minute. */
export function useNow(step = 10_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let id = 0;
    const schedule = () => {
      id = window.setTimeout(() => {
        setNow(new Date());
        schedule();
      }, step - (Date.now() % step) + 20);
    };
    schedule();
    return () => clearTimeout(id);
  }, [step]);
  return now;
}

export function herClock(at: Date) {
  return formatClock(herTimeZone, at);
}

export function herDate(at: Date) {
  return new Intl.DateTimeFormat('en-GB', { timeZone: herTimeZone, weekday: 'long', day: 'numeric', month: 'long' }).format(at);
}

export function fmtHours(h: number) {
  return Number.isInteger(h) ? String(h) : h.toFixed(1);
}

export function useOverlap(now: Date) {
  const zone = viewerTimeZone();
  const { hours } = overlapHours(zone, now);
  const sameZone = zone === herTimeZone;
  return { hours, city: cityOf(zone), sameZone };
}

/** One unread dot, on Chat, until the visitor opens it once this session. */
const SEEN_KEY = 'adelia.cc/phone-chat-seen';
export function chatSeen(): boolean {
  try {
    return sessionStorage.getItem(SEEN_KEY) === '1';
  } catch {
    return false;
  }
}
export function markChatSeen() {
  try {
    sessionStorage.setItem(SEEN_KEY, '1');
  } catch {
    /* private mode: the dot comes back next time, nothing breaks */
  }
}

/**
 * Wallpaper: flat, hard-edged bands cut from the prism tokens, like offcuts of acrylic sheet.
 * SVG polygons rather than CSS gradient stops, so the diagonal edges stay crisp.
 */
export function Wallpaper() {
  return (
    <svg className="ph-wall" viewBox="0 0 100 210" preserveAspectRatio="xMidYMin slice" aria-hidden="true" focusable="false">
      <rect className="w0" width="100" height="210" />
      <polygon className="w1" points="0,92 100,64 100,210 0,210" />
      <polygon className="w3" points="0,121 100,93 100,210 0,210" />
      <polygon className="w2" points="0,119.6 100,91.6 100,93 0,121" />
      <polygon className="w1" points="0,171 100,149 100,210 0,210" />
      <polygon className="w4" points="62,0 100,0 100,26 44,0" />
    </svg>
  );
}

export function StatusBar({ now }: { now: Date }) {
  return (
    <span className="ph-status" aria-hidden="true">
      <span>{herClock(now)}</span>
      <span className="ph-cam" />
      <span className="ph-status-r">WIB</span>
    </span>
  );
}

/**
 * The overlap widget: a flat ring of shared working hours out of her 9, the count set in the ring.
 * Spans only, so it can sit inside the bento tile's button as well as on the phone.
 */
export function Overlap({ now, size = 60, compact = false }: { now: Date; size?: number; compact?: boolean }) {
  const { hours, city, sameZone } = useOverlap(now);
  const n = fmtHours(hours);
  return (
    <span className="ph-overlap" data-compact={compact || undefined}>
      <Ring value={hours} max={WORKDAY} size={size} stroke={compact ? 3.5 : 5} tone="light" label={`${n} of ${WORKDAY} working hours overlap`}>
        <span className="ph-ov-num" aria-hidden="true">
          {n}
        </span>
      </Ring>
      <span className="ph-ov-text">
        <span className="ph-ov-cap">{compact ? `of ${WORKDAY} hours overlap with yours` : 'hours our workdays overlap'}</span>
        {!compact && (
          <span className="ph-ov-sub">
            {sameZone ? `You are in ${city} too, ${HOURS}` : `${person.city} and ${city}, both ${HOURS}`}
          </span>
        )}
      </span>
    </span>
  );
}

export function LockClock({ now, compact = false }: { now: Date; compact?: boolean }) {
  return (
    <span className="ph-lock" data-compact={compact || undefined}>
      {!compact && (
        <span className="ph-lock-place">
          {person.city} · {person.timeZoneLabel}
        </span>
      )}
      <span className="ph-clock">
        <time dateTime={now.toISOString()}>{herClock(now)}</time>
      </span>
      <span className="ph-date">{herDate(now)}</span>
    </span>
  );
}

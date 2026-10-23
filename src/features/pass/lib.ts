/* ==========================================================================
   Guest Pass helpers — deterministic codes from the session id, count-up
   numbers, clipboard, Bekasi-time (WIB) stamps. Shared by the Guest Pass,
   the sticker book, the board and the House Rules.
   ========================================================================== */
import { useEffect, useRef, useState } from 'react';
import { TZ } from '@/lib/weather';
import { CHAPTERS, type ChapterId } from '@/lib/content';
import { EXPLORABLE, type Station } from '@/stage/stations';

/** FNV-1a 32-bit. */
export function hash32(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Crockford-ish alphabet without look-alikes (0/O, 1/I). */
const ALPHA = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

export function code(seed: string, n = 4): string {
  let out = '';
  for (let i = 0; i < n; i++) out += ALPHA[hash32(`${seed}:${i}`) % ALPHA.length];
  return out;
}

/** Guest Pass number: "GP-26-7KQ4" (26 = the room's 2026 edition). */
export const memberNo = (sessionId: string) => `GP-26-${code(sessionId)}`;
/** Reference for a perk request: "ADL-BESTIE-9QX2". */
export const voucherCode = (sessionId: string, tier: string) => `ADL-${tier.toUpperCase()}-${code(`${sessionId}|${tier}`)}`;

/** Deterministic pseudo-random in [-1, 1] for a key (stamp rotation etc.). */
export const jitter = (key: string) => ((hash32(key) % 2001) - 1000) / 1000;

/** "22 OCT 26" in Bekasi time (WIB). */
export function stampDate(ts: number): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone: TZ, day: '2-digit', month: 'short', year: '2-digit' }).format(new Date(ts)).toUpperCase();
}

/** "22.10.2026" in Bekasi time (WIB). */
export function dotDate(ts: number): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(ts)).replace(/\//g, '.');
}

/** "MM/YY" member-since. */
export function since(ts: number): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone: TZ, month: '2-digit', year: '2-digit' }).format(new Date(ts));
}

export function ago(ts: number, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - ts) / 1000));
  if (s < 45) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return `${d} d ago`;
}

export const reducedMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Animated integer that eases toward `target` (from 0 on first mount when `fromZero`). */
export function useCountUp(target: number, duration = 1100, fromZero = true): number {
  const [value, setValue] = useState(fromZero && !reducedMotion() ? 0 : target);
  const current = useRef(value);
  useEffect(() => {
    const from = current.current;
    if (from === target || reducedMotion()) {
      current.current = target;
      setValue(target);
      return;
    }
    const t0 = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / duration);
      const e = 1 - Math.pow(1 - k, 4);
      const v = Math.round(from + (target - from) * e);
      current.current = v;
      setValue(v);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

/** The station whose first visit writes a given manifesto line. */
export function stationFor(chapter: ChapterId): Station | undefined {
  return EXPLORABLE.find((s) => s.manifesto === chapter);
}

export const chapterOf = (id: ChapterId) => CHAPTERS.find((c) => c.id === id)!;

/** "the Vault" from "The Vault". */
export const lowerThe = (name: string) => name.replace(/^The /, 'the ');

/** Glyphs like ⌚ ⚡ default to colour emoji — force text presentation. */
export const textGlyph = (g: string) => (/[⌀-⏿☀-➿]/.test(g) && !g.endsWith('︎') ? g + '︎' : g);

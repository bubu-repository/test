/* ==========================================================================
   Ticket helpers: ticket codes, the dot-code "barcode", PNG rendering and
   the .ics calendar file (a tentative hold: she confirms the time by email).
   ========================================================================== */
import { COMPANY } from '@/lib/content';

export interface TicketData {
  title: string;
  name: string;
  date: string; // human readable (WIB)
  /** the same time in the visitor's zone, when it differs */
  local?: string;
  venue: string;
  code: string;
  /** hiring = intro call / interview · hi = coffee chat · question = a message (dside: event / session) */
  kind: 'hiring' | 'hi' | 'question' | 'event' | 'session';
  guests?: number;
}

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function ticketCode(prefix = 'AT') {
  const bytes = new Uint8Array(8);
  (globalThis.crypto ?? { getRandomValues: (a: Uint8Array) => a.map(() => Math.floor(Math.random() * 256)) }).getRandomValues(bytes);
  const s = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
  return `${prefix}-${s.slice(0, 4)}-${s.slice(4)}`;
}

/** Deterministic dot matrix (rows × cols booleans) seeded by the ticket code. */
export function dotCode(code: string, rows = 7, cols = 30): boolean[][] {
  let h = 2166136261;
  for (let i = 0; i < code.length; i++) {
    h ^= code.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const rnd = () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return ((h >>> 0) % 1000) / 1000;
  };
  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => {
      // finder columns at both ends, like a real 2D code
      if (c === 0 || c === cols - 1) return true;
      if ((c === 1 || c === cols - 2) && (r === 0 || r === rows - 1)) return true;
      return rnd() > 0.5;
    }),
  );
}

/** What the stub says under the code. */
export const stubLine = (k: TicketData['kind']) => (k === 'question' ? 'She answers by email' : 'She replies within a day');

/* ------------------------------------------------------------- PNG */

const UI = '"M PLUS Rounded 1c", system-ui, sans-serif';
const INK = '#161b26';
const INK3 = '#5c6472';
const PINK = '#ff7eb6';
const PINK_INK = '#bc2570';

async function fontsReady() {
  try {
    await Promise.all([
      document.fonts.load('800 40px Doto'),
      document.fonts.load('800 40px "M PLUS Rounded 1c"'),
      document.fonts.load('500 20px "M PLUS Rounded 1c"'),
      document.fonts.load('500 16px "JetBrains Mono"'),
      document.fonts.load('700 16px "JetBrains Mono"'),
    ]);
  } catch {}
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const t = line ? line + ' ' + w : w;
    if (ctx.measureText(t).width > maxW && line) {
      lines.push(line);
      line = w;
    } else line = t;
  }
  if (line) lines.push(line);
  return lines;
}

export async function renderTicketPNG(t: TicketData): Promise<Blob | null> {
  await fontsReady();
  const W = 1400;
  const H = 640;
  const S = 2; // retina
  const cv = document.createElement('canvas');
  cv.width = W * S;
  cv.height = H * S;
  const ctx = cv.getContext('2d');
  if (!ctx) return null;
  ctx.scale(S, S);

  // backdrop: icy white with a faint hairline grid
  ctx.fillStyle = '#eff1f4';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(22,27,38,0.05)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= W; x += 20) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, H);
    ctx.stroke();
  }
  for (let y = 0; y <= H; y += 20) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(W, y + 0.5);
    ctx.stroke();
  }

  // ticket paper with notches at the perforation (light from the right: shadow falls left)
  const x0 = 60;
  const y0 = 60;
  const tw = W - 120;
  const th = H - 120;
  const perfX = x0 + tw - 360;
  ctx.save();
  ctx.shadowColor = 'rgba(22,27,38,0.18)';
  ctx.shadowBlur = 40;
  ctx.shadowOffsetX = -14;
  ctx.shadowOffsetY = 14;
  ctx.beginPath();
  const r = 18;
  ctx.moveTo(x0 + r, y0);
  ctx.lineTo(perfX - 22, y0);
  ctx.arc(perfX, y0, 22, Math.PI, 0, true);
  ctx.lineTo(x0 + tw - r, y0);
  ctx.quadraticCurveTo(x0 + tw, y0, x0 + tw, y0 + r);
  ctx.lineTo(x0 + tw, y0 + th - r);
  ctx.quadraticCurveTo(x0 + tw, y0 + th, x0 + tw - r, y0 + th);
  ctx.lineTo(perfX + 22, y0 + th);
  ctx.arc(perfX, y0 + th, 22, 0, Math.PI, true);
  ctx.lineTo(x0 + r, y0 + th);
  ctx.quadraticCurveTo(x0, y0 + th, x0, y0 + th - r);
  ctx.lineTo(x0, y0 + r);
  ctx.quadraticCurveTo(x0, y0, x0 + r, y0);
  ctx.closePath();
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.restore();

  // perforation
  ctx.strokeStyle = 'rgba(22,27,38,0.32)';
  ctx.setLineDash([3, 9]);
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(perfX, y0 + 30);
  ctx.lineTo(perfX, y0 + th - 30);
  ctx.stroke();
  ctx.setLineDash([]);

  // header band: a navy LCD strip with pink dot-matrix letters
  ctx.fillStyle = '#10141c';
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') ctx.roundRect(x0 + 40, y0 + 40, perfX - x0 - 80, 64, 10);
  else ctx.rect(x0 + 40, y0 + 40, perfX - x0 - 80, 64);
  ctx.fill();
  ctx.fillStyle = PINK;
  ctx.font = '800 34px Doto, "JetBrains Mono", monospace';
  ctx.textBaseline = 'middle';
  ctx.fillText('ADELIA’S ROOM · ADMIT ONE', x0 + 62, y0 + 73);

  // body
  const bx = x0 + 40;
  const bw = perfX - x0 - 80;
  ctx.fillStyle = INK;
  ctx.textBaseline = 'alphabetic';
  ctx.font = `800 48px ${UI}`;
  const titleLines = wrap(ctx, t.title, bw).slice(0, 2);
  titleLines.forEach((l, i) => ctx.fillText(l, bx, y0 + 178 + i * 54));
  let y = y0 + 178 + titleLines.length * 54 + 18;

  const row = (label: string, value: string, x: number, yy: number, w: number, sub?: string) => {
    ctx.font = '500 15px "JetBrains Mono", monospace';
    ctx.fillStyle = INK3;
    ctx.fillText(label.toUpperCase().split('').join(String.fromCharCode(8202)), x, yy);
    ctx.font = `500 25px ${UI}`;
    ctx.fillStyle = INK;
    const lines = wrap(ctx, value, w).slice(0, 2);
    lines.forEach((l, i) => ctx.fillText(l, x, yy + 34 + i * 30));
    if (sub) {
      ctx.font = `500 19px ${UI}`;
      ctx.fillStyle = INK3;
      ctx.fillText(sub, x, yy + 34 + lines.length * 30);
    }
  };
  row(t.kind === 'question' ? 'From' : 'Guest', t.name, bx, y, bw / 2 - 20);
  row('When', t.date, bx + bw / 2, y, bw / 2, t.local ? `${t.local} your time` : undefined);
  y += 118;
  row('Where', t.venue, bx, y, bw);

  // footer line
  ctx.font = '500 14px "JetBrains Mono", monospace';
  ctx.fillStyle = INK3;
  ctx.fillText(`${COMPANY.email.toUpperCase()}  ·  BEKASI  ·  WIB (UTC+7)  ·  ${COMPANY.domain.toUpperCase()}`, bx, y0 + th - 34);

  // stub
  const sx = perfX + 40;
  const sw = x0 + tw - 40 - sx;
  ctx.font = '500 15px "JetBrains Mono", monospace';
  ctx.fillStyle = INK3;
  ctx.fillText('TICKET NO.', sx, y0 + 70);
  ctx.font = '800 33px Doto, "JetBrains Mono", monospace';
  ctx.fillStyle = INK;
  ctx.fillText(t.code, sx, y0 + 118);

  const grid = dotCode(t.code, 9, 20);
  const cell = Math.floor(sw / 20);
  const gy = y0 + 160;
  grid.forEach((rowBits, ri) =>
    rowBits.forEach((on, ci) => {
      if (!on) return;
      ctx.fillStyle = INK;
      ctx.fillRect(sx + ci * cell + 1, gy + ri * cell + 1, cell - 2, cell - 2);
    }),
  );
  ctx.fillStyle = PINK;
  ctx.beginPath();
  ctx.arc(sx + 10, y0 + th - 40, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = '700 14px "JetBrains Mono", monospace';
  ctx.fillStyle = PINK_INK;
  ctx.fillText(stubLine(t.kind).toUpperCase(), sx + 26, y0 + th - 35);

  return new Promise((res) => cv.toBlob((b) => res(b), 'image/png'));
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/* ------------------------------------------------------------- ICS */

const icsDate = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const icsEsc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
/** fold lines at 75 octets-ish as RFC 5545 asks */
const fold = (line: string) => {
  const out: string[] = [];
  let s = line;
  while (s.length > 74) {
    out.push(s.slice(0, 74));
    s = ' ' + s.slice(74);
  }
  out.push(s);
  return out.join('\r\n');
};

/** "Intro call (30 min)" → 30 */
export const minutesOf = (name: string, fallback = 30) => {
  const m = /(\d{2,3})\s*min/i.exec(name);
  return m ? Number(m[1]) : fallback;
};

/**
 * A tentative calendar hold for the first time the visitor picked. It says plainly that the time
 * isn't confirmed yet: Adelia confirms one of the picked times by email.
 */
export function buildICS(ev: { id: string; name: string; venue: string; city: string; body: string }, code: string, startISO: string, minutes = minutesOf(ev.name)): string | null {
  const start = new Date(startISO);
  if (Number.isNaN(start.getTime())) return null;
  const end = new Date(start.getTime() + minutes * 60_000);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//${COMPANY.domain}//Adelia's Room//EN`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${code}-${ev.id}@${COMPANY.domain}`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(start)}`,
    `DTEND:${icsDate(end)}`,
    'STATUS:TENTATIVE',
    'TRANSP:TRANSPARENT',
    `SUMMARY:${icsEsc(`Tentative: ${ev.name} with ${COMPANY.name}`)}`,
    `LOCATION:${icsEsc(ev.city && !ev.venue.includes(ev.city) ? `${ev.venue}, ${ev.city}` : ev.venue)}`,
    `DESCRIPTION:${icsEsc(`Not confirmed yet: ${COMPANY.firstName} replies within a day to confirm one of the times you picked.\n\n${ev.body}\n\nTicket ${code}\n${COMPANY.email} · ${COMPANY.site}`)}`,
    `URL:${location.origin}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.map(fold).join('\r\n') + '\r\n';
}

/* ==========================================================================
   Live layers drawn on top of the room plate (all coordinates in plate px).
   Clock hands, LED countdown, monitor + handheld screens, achievement pins,
   spinning vinyl, printer ticket, mug steam, the live window and the lights.
   ========================================================================== */
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useUI } from '@/state/ui';
import { music } from '@/audio/music';
import { getContent } from '@/lib/api';
import { LAUNCH_DEFAULT } from '@/lib/content';
import { hourIn, roomWeather, useWeather } from '@/lib/weather';
import { createSky, drawGlass, type SkyState } from '../live/sky';
import { LIVE } from '../plate';
import { glyphRows } from './font5x7';

const abs = (x: number, y: number, w: number, h: number, extra: CSSProperties = {}): CSSProperties => ({
  position: 'absolute',
  left: x,
  top: y,
  width: w,
  height: h,
  ...extra,
});

/** Bekasi wall-clock parts without Intl on every frame (WIB, UTC+7, no DST). */
function bekasiNow() {
  const d = new Date(Date.now() + 7 * 3600_000);
  return { h: d.getUTCHours(), m: d.getUTCMinutes(), s: d.getUTCSeconds(), ms: d.getUTCMilliseconds() };
}

function useRaf(cb: (t: number) => void, active = true) {
  const ref = useRef(cb);
  ref.current = cb;
  useEffect(() => {
    if (!active) return;
    let id = 0;
    const loop = (t: number) => {
      ref.current(t);
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [active]);
}

/* ------------------------------------------------------------- clock */
const CLOCK_BOX = 310; // the clock's hit box in plate.ts (310 × 308)

export function WallClock({ ox, oy }: { ox: number; oy: number }) {
  const { cx, cy, hour, minute, second } = LIVE.clock;
  const px = cx - ox;
  const py = cy - oy;
  const h = useRef<SVGGElement>(null);
  const m = useRef<SVGGElement>(null);
  const s = useRef<SVGGElement>(null);
  useRaf(() => {
    const t = bekasiNow();
    const sec = t.s + t.ms / 1000;
    // seconds hand: smooth sweep with a tiny settle at each tick like a quartz/sweep hybrid
    const sa = sec * 6;
    const ma = (t.m + sec / 60) * 6;
    const ha = ((t.h % 12) + t.m / 60) * 30;
    h.current?.setAttribute('transform', `rotate(${ha} ${px} ${py})`);
    m.current?.setAttribute('transform', `rotate(${ma} ${px} ${py})`);
    s.current?.setAttribute('transform', `rotate(${sa} ${px} ${py})`);
  });
  return (
    <svg className="live-clock" style={abs(0, 0, CLOCK_BOX, CLOCK_BOX, { overflow: 'visible' })} viewBox={`0 0 ${CLOCK_BOX} ${CLOCK_BOX}`} aria-hidden>
      <defs>
        <filter id="handShadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="-3" dy="5" stdDeviation="3.5" floodColor="#5b2a4a" floodOpacity="0.2" />
        </filter>
      </defs>
      <g filter="url(#handShadow)">
        <g ref={h}>
          <rect x={px - 5} y={py - hour} width={10} height={hour + 18} rx={5} fill="#2a3550" />
        </g>
        <g ref={m}>
          <rect x={px - 3.5} y={py - minute} width={7} height={minute + 22} rx={3.5} fill="#2a3550" />
        </g>
        <g ref={s}>
          <rect x={px - 1.4} y={py - second} width={2.8} height={second + 30} rx={1.4} fill="#e2559a" />
          <circle cx={px} cy={py + 24} r={5} fill="#e2559a" />
        </g>
        <circle cx={px} cy={py} r={8} fill="#e2559a" />
        <circle cx={px} cy={py} r={3} fill="#fbe3ef" />
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------- dot matrix helper */
function drawDots(ctx: CanvasRenderingContext2D, w: number, h: number, cols: number, rows: number, lit: (c: number, r: number) => number) {
  const pw = w / cols;
  const ph = h / rows;
  const r = Math.min(pw, ph) * 0.36;
  for (let rr = 0; rr < rows; rr++) {
    for (let cc = 0; cc < cols; cc++) {
      const v = lit(cc, rr);
      const x = (cc + 0.5) * pw;
      const y = (rr + 0.5) * ph;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      if (v > 0) {
        ctx.fillStyle = `rgba(255, 150, 205, ${0.55 + 0.45 * v})`;
        ctx.shadowColor = 'rgba(255, 110, 180, 0.9)';
        ctx.shadowBlur = r * 2.2;
      } else {
        ctx.fillStyle = 'rgba(92, 46, 76, 0.5)';
        ctx.shadowBlur = 0;
      }
      ctx.fill();
    }
  }
  ctx.shadowBlur = 0;
}

function textMatrix(text: string): number[][] {
  // returns rows (7) × columns
  const cols: number[][] = [];
  for (const ch of text) {
    const g = glyphRows(ch);
    const width = g[0].length;
    for (let c = 0; c < width; c++) cols.push(g.map((row) => (row[c] === '1' ? 1 : 0)));
    cols.push([0, 0, 0, 0, 0, 0, 0]);
  }
  return cols; // column-major
}

/* ------------------------------------------------------------- LED countdown */
export function LedBoard({ ox, oy }: { ox: number; oy: number }) {
  const { x, y, w, h } = LIVE.led;
  const cvs = useRef<HTMLCanvasElement>(null);
  const [target, setTarget] = useState(() => Date.parse(LAUNCH_DEFAULT.date));
  const [title, setTitle] = useState(LAUNCH_DEFAULT.title);
  useEffect(() => {
    getContent().then((c) => {
      setTarget(Date.parse(c.launch.date) || Date.parse(LAUNCH_DEFAULT.date));
      setTitle(c.launch.title || LAUNCH_DEFAULT.title);
    });
  }, []);
  const last = useRef(-1);
  useRaf((t) => {
    const frame = Math.floor(t / 125);
    if (frame === last.current) return;
    last.current = frame;
    const c = cvs.current;
    if (!c) return;
    const ctx = c.getContext('2d')!;
    const W = c.width;
    const H = c.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#1a1220';
    ctx.fillRect(0, 0, W, H);
    const COLS = 68;
    const ROWS = 11;
    let diff = Math.max(0, target - Date.now());
    const live = diff === 0;
    const d = Math.floor(diff / 86400000);
    diff -= d * 86400000;
    const hh = Math.floor(diff / 3600000);
    diff -= hh * 3600000;
    const mm = Math.floor(diff / 60000);
    const ss = Math.floor((diff - mm * 60000) / 1000);
    const pad = (n: number) => String(n).padStart(2, '0');
    // alternate: countdown (8 s) ⇄ scrolling title (6 s)
    const cycle = (t / 1000) % 14;
    let cols: number[][];
    let offset = 0;
    if (live) {
      cols = textMatrix(Math.floor(t / 600) % 2 ? 'LIVE NOW' : '');
    } else if (cycle < 8) {
      cols = textMatrix(`${pad(Math.min(d, 99))}:${pad(hh)}:${pad(mm)}:${pad(ss)}`);
    } else {
      cols = textMatrix(`${title.toUpperCase()} · T-MINUS ${d} DAYS · `);
      offset = Math.floor(((cycle - 8) / 6) * (cols.length + COLS)) - COLS;
    }
    const start = offset === 0 ? Math.floor((COLS - cols.length) / 2) : -offset;
    drawDots(ctx, W, H, COLS, ROWS, (c2, r) => {
      const ri = r - 2;
      if (ri < 0 || ri > 6) return 0;
      const col = cols[c2 - start];
      return col ? col[ri] : 0;
    });
  });
  return (
    <canvas
      ref={cvs}
      width={w * 2}
      height={h * 2}
      className="live-led"
      style={abs(x - ox + 4, y - oy + 4, w - 8, h - 8, { borderRadius: 6 })}
      aria-label="Launch countdown"
    />
  );
}

/* ------------------------------------------------------------- monitor screen */
export function MonitorScreen({ ox, oy }: { ox: number; oy: number }) {
  const { x, y, w, h } = LIVE.screen;
  const cvs = useRef<HTMLCanvasElement>(null);
  const screen = useUI((s) => (s.flags.computerScreen as string) || 'idle');
  const lights = useUI((s) => !!s.flags.lights);
  const last = useRef(-1);
  useRaf((t) => {
    const frame = Math.floor(t / 66);
    if (frame === last.current) return;
    last.current = frame;
    const c = cvs.current;
    if (!c) return;
    const g = c.getContext('2d')!;
    const W = c.width;
    const H = c.height;
    const sec = t / 1000;
    g.fillStyle = '#0e1a2b';
    g.fillRect(0, 0, W, H);
    if (!lights || screen === 'off') return;
    if (screen === 'idle') {
      // screensaver: drifting ring + dot-matrix label + clock
      const px = W / 2 + Math.sin(sec * 0.31) * W * 0.22;
      const py = H / 2 + Math.cos(sec * 0.23) * H * 0.18;
      // a drifting jelly drop
      const r = W * 0.075;
      g.fillStyle = 'rgba(169, 214, 245, 0.9)';
      g.beginPath();
      g.moveTo(px, py - r * 1.55);
      g.bezierCurveTo(px + r * 0.35, py - r * 0.9, px + r, py - r * 0.4, px + r, py + r * 0.15);
      g.arc(px, py + r * 0.15, r, 0, Math.PI);
      g.bezierCurveTo(px - r, py - r * 0.4, px - r * 0.35, py - r * 0.9, px, py - r * 1.55);
      g.fill();
      g.fillStyle = '#0e1a2b';
      g.fillRect(px - r * 0.42, py + r * 0.05, r * 0.14, r * 0.22);
      g.fillRect(px + r * 0.28, py + r * 0.05, r * 0.14, r * 0.22);
      g.fillStyle = 'rgba(255, 126, 182, 0.75)';
      g.fillRect(px - r * 0.7, py + r * 0.38, r * 0.24, r * 0.1);
      g.fillRect(px + r * 0.46, py + r * 0.38, r * 0.24, r * 0.1);
      g.fillStyle = 'rgba(236,244,252,0.88)';
      g.font = `700 ${Math.round(H * 0.075)}px "JetBrains Mono", monospace`;
      g.textAlign = 'left';
      g.fillText('ADELIA OS', W * 0.07, H * 0.14);
      g.fillStyle = 'rgba(236,244,252,0.55)';
      g.font = `500 ${Math.round(H * 0.05)}px "JetBrains Mono", monospace`;
      const j = bekasiNow();
      g.fillText(`${String(j.h).padStart(2, '0')}:${String(j.m).padStart(2, '0')} BKS`, W * 0.07, H * 0.9);
      g.textAlign = 'right';
      if (Math.floor(sec * 1.4) % 2) g.fillText('CLICK TO WAKE ▮', W * 0.93, H * 0.9);
    } else if (screen === 'boot') {
      g.fillStyle = '#a9d6f5';
      g.font = `700 ${Math.round(H * 0.06)}px "JetBrains Mono", monospace`;
      g.textAlign = 'left';
      const lines = ['ADELIA BIOS v26.10', 'MEMORY 2026 KB OK', 'EVALS ............ OK', 'BOOTING ADELIA OS'];
      lines.forEach((l, i) => g.fillText(l, W * 0.07, H * (0.18 + i * 0.1)));
      g.fillStyle = '#26364d';
      g.fillRect(W * 0.07, H * 0.72, W * 0.86, H * 0.04);
      g.fillStyle = '#ff7eb6';
      g.fillRect(W * 0.07, H * 0.72, W * 0.86 * ((sec * 0.6) % 1), H * 0.04);
    } else {
      // desktop mock
      g.fillStyle = '#dde7f2';
      g.fillRect(0, 0, W, H);
      g.strokeStyle = 'rgba(31,95,150,0.07)';
      for (let i = 0; i < W; i += W / 16) {
        g.beginPath();
        g.moveTo(i, 0);
        g.lineTo(i, H);
        g.stroke();
      }
      g.fillStyle = '#f6f9fd';
      g.fillRect(0, 0, W, H * 0.07);
      g.fillStyle = '#ff7eb6';
      g.fillRect(W * 0.03, H * 0.018, H * 0.035, H * 0.035);
      g.fillStyle = '#fff';
      g.fillRect(W * 0.32, H * 0.2, W * 0.5, H * 0.55);
      g.fillStyle = '#e4e8ee';
      g.fillRect(W * 0.32, H * 0.2, W * 0.5, H * 0.07);
      g.fillStyle = '#5aa9e6';
      g.fillRect(W * 0.34, H * 0.225, H * 0.02, H * 0.02);
      for (let i = 0; i < 4; i++) {
        g.fillStyle = i === 0 ? '#ff7eb6' : '#a9d6f5';
        g.fillRect(W * 0.06, H * (0.16 + i * 0.17), W * 0.1, W * 0.1);
      }
    }
    // glass sheen
    const gr = g.createLinearGradient(0, 0, W, H);
    gr.addColorStop(0, 'rgba(255,255,255,0.10)');
    gr.addColorStop(0.35, 'rgba(255,255,255,0.02)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, W, H);
  });
  return <canvas ref={cvs} width={w * 2} height={h * 2} className="live-screen" style={abs(x - ox, y - oy, w, h, { borderRadius: 10 })} />;
}

/* ------------------------------------------------------------- handheld screen */
export function HandheldScreen({ ox, oy }: { ox: number; oy: number }) {
  const r = LIVE.handheld;
  const cvs = useRef<HTMLCanvasElement>(null);
  const on = useUI((s) => !!s.flags.consoleOn);
  const lights = useUI((s) => !!s.flags.lights);
  const last = useRef(-1);
  useRaf((t) => {
    const frame = Math.floor(t / 120);
    if (frame === last.current) return;
    last.current = frame;
    const c = cvs.current;
    if (!c) return;
    const g = c.getContext('2d')!;
    const W = c.width;
    const H = c.height;
    g.fillStyle = '#1b2233';
    g.fillRect(0, 0, W, H);
    if (!lights) return;
    // tiny pixel attract mode: a jelly hopping over clouds
    const px = 4;
    const f = frame;
    g.fillStyle = '#3d4a66';
    for (let i = 0; i < W / px; i++) {
      const bh = 3 + ((i * 7 + Math.floor(f / 2)) % 9 > 5 ? 4 : 2);
      g.fillRect((i * px - (f * 2) % px) | 0, H - bh * px, px - 1, bh * px);
    }
    g.fillStyle = '#ff7eb6';
    const jump = Math.abs(Math.sin(f / 3)) * 10;
    g.fillRect(W * 0.3, H - 7 * px - jump, px * 2, px * 2);
    g.fillStyle = on ? '#a9d6f5' : '#f6f9fd';
    if (Math.floor(f / 4) % 2 || on) {
      g.font = `700 ${Math.round(H * 0.16)}px "JetBrains Mono", monospace`;
      g.textAlign = 'center';
      g.fillText(on ? 'PLAYING' : 'PRESS START', W / 2, H * 0.3);
    }
  });
  return <canvas ref={cvs} width={r.w * 3} height={r.h * 3} className="live-hh" style={abs(r.x - ox, r.y - oy, r.w, r.h, { borderRadius: 3, imageRendering: 'pixelated' })} />;
}

/* ------------------------------------------------------------- vinyl */
export function Vinyl({ ox, oy }: { ox: number; oy: number }) {
  const { cx, cy, rx, ry } = LIVE.vinyl;
  const [playing, setPlaying] = useState(music.playing);
  useEffect(() => {
    const off = music.subscribe(() => setPlaying(music.playing));
    return () => {
      off();
    };
  }, []);
  return (
    <div className={`live-vinyl ${playing ? 'is-playing' : ''}`} style={abs(cx - ox - rx, cy - oy - ry, rx * 2, ry * 2)}>
      <div className="live-vinyl__disc" style={{ width: rx * 2, height: rx * 2, top: ry - rx, transform: `scaleY(${ry / rx})` }}>
        <i />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- printer ticket */
export function PrinterTicket() {
  const printing = useUI((s) => s.flags.printing as number | undefined);
  const ticket = useUI((s) => s.flags.ticket as Record<string, string> | undefined);
  if (!printing) return null;
  return (
    <div className="live-ticket" key={printing} style={abs(LIVE.printerSlot.x - 2, LIVE.printerSlot.y - 182, LIVE.printerSlot.w + 4, 182)}>
      <div className="live-ticket__paper">
        <b>ADELIA’S ROOM</b>
        <span>ADMIT ONE</span>
        <em>{ticket?.title ?? 'Intro call'}</em>
        <span>{ticket?.name ?? ''}</span>
        <i />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- mug steam */
export function MugSteam() {
  const { x, y } = LIVE.mugSteam;
  return (
    <svg className="live-steam" style={abs(x - 40, y - 150, 80, 150)} viewBox="0 0 80 150" aria-hidden>
      {[0, 1, 2].map((i) => (
        <path key={i} d={`M${28 + i * 12} 150 C ${10 + i * 14} 115, ${50 + i * 6} 95, ${30 + i * 10} 60 S ${40 + i * 6} 20, ${34 + i * 8} 0`} style={{ animationDelay: `${i * 1.3}s` }} />
      ))}
    </svg>
  );
}

/* ------------------------------------------------------------- window (live Bekasi) */
export function WindowView() {
  const { x, y, w, h, mask } = LIVE.window;
  const sky = useRef<HTMLCanvasElement>(null);
  const glass = useRef<HTMLCanvasElement>(null);
  const flashEl = useRef<HTMLDivElement>(null);
  const renderer = useMemo(() => createSky(), []);
  const last = useRef(-1);
  const quality = useUI((s) => s.quality);
  useWeather((s) => s.home.kind); // re-render on weather change
  useRaf((t) => {
    const fps = quality === 'high' ? 30 : 15;
    const frame = Math.floor(t / (1000 / fps));
    if (frame === last.current) return;
    last.current = frame;
    const rw = roomWeather();
    const hourOverride = (window as unknown as { __roomHour?: number }).__roomHour;
    const state: SkyState = { t: t / 1000, hour: hourOverride ?? hourIn(), kind: rw.kind, isDay: hourOverride != null ? hourOverride >= 6 && hourOverride < 18.3 : rw.isDay };
    const c = sky.current;
    if (c) {
      const res = renderer.draw(c.getContext('2d')!, c.width, c.height, state) as unknown;
      const flash = typeof res === 'object' && res && 'flash' in (res as object) ? Number((res as { flash: number }).flash) : state.flash ?? 0;
      if (flashEl.current) flashEl.current.style.opacity = String(Math.min(0.5, flash * 0.5));
    }
    const gc = glass.current;
    if (gc) {
      const g = gc.getContext('2d')!;
      g.clearRect(0, 0, gc.width, gc.height);
      drawGlass(g, gc.width, gc.height, state);
    }
  });
  const maskStyle: CSSProperties = { WebkitMaskImage: `url(${mask})`, maskImage: `url(${mask})`, WebkitMaskSize: '100% 100%', maskSize: '100% 100%' };
  return (
    <>
      <canvas ref={sky} width={Math.round(w / 2)} height={Math.round(h / 2)} className="live-sky" style={abs(x, y, w, h, maskStyle)} />
      <canvas ref={glass} width={Math.round(w / 2)} height={Math.round(h / 2)} className="live-glass" style={abs(x, y, w, h, maskStyle)} />
      <div ref={flashEl} className="live-flash" />
    </>
  );
}

/* ------------------------------------------------------------- lights */
export function RoomLights() {
  const lights = useUI((s) => !!s.flags.lights);
  const { x, y, w, h } = LIVE.window;
  // dark overlay with a hole for the window glass (daylight / city still shows)
  const hole = `polygon(evenodd, 0 0, 6336px 0, 6336px 2688px, 0 2688px, 0 0, ${x}px ${y}px, ${x + w}px ${y}px, ${x + w}px ${y + h}px, ${x}px ${y + h}px, ${x}px ${y}px)`;
  return (
    <>
      <div className={`live-dark ${lights ? 'is-on' : ''}`} style={{ clipPath: hole }} />
      {LIVE.tubes.map((t, i) => (
        <div key={i} className={`live-tube ${lights ? 'is-on' : ''}`} style={abs(t.x, t.y, t.w, t.h, { animationDelay: `${i * 0.12}s` })} />
      ))}
    </>
  );
}

/** Warm/cool grading by Bekasi hour (very subtle). */
export function TimeGrade() {
  const [hour, setHour] = useState(hourIn());
  useEffect(() => {
    const id = setInterval(() => setHour(hourIn()), 60_000);
    return () => clearInterval(id);
  }, []);
  const golden = hour > 15.5 && hour < 18.6 ? 1 - Math.abs(hour - 17.3) / 1.8 : 0;
  const night = hour >= 19 || hour < 5.5 ? 1 : hour >= 18.6 ? (hour - 18.6) / 0.4 : hour < 6.2 ? (6.2 - hour) / 0.7 : 0;
  return (
    <>
      <div className="live-grade live-grade--golden" style={{ opacity: Math.max(0, golden) * 0.5 }} />
      <div className="live-grade live-grade--night" style={{ opacity: Math.min(1, Math.max(0, night)) * 0.22 }} />
    </>
  );
}

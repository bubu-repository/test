/* ==========================================================================
   RM-13 · The wall clock — check the time in Bekasi.
   Live Bekasi time (WIB, UTC+7, no daylight saving) on an LCD and an
   analog dial, her working hours, and a 24-hour overlap ring with the
   visitor's own time zone (or any zone they pick: the team's, say).
   Then her path on a draggable year rail, and a handoff to booking a chat
   with times in WIB and theirs.
   ========================================================================== */
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent as RKeyboardEvent, type PointerEvent as RPointerEvent } from 'react';
import { Sheet } from '@/ui/Panel';
import { Icon } from '@/ui/Icon';
import { game } from '@/state/game';
import { sfx } from '@/audio/engine';
import { track } from '@/lib/api';
import { TIMELINE, COMPANY } from '@/lib/content';
import { focus } from '@/stage/director';
import { STATIONS } from '@/stage/stations';
import { HOME_TZ, TZ_NOTE, WORK, ZONES, fmtIn, formatHour, formatOffset, hourIn, offsetHours, regionTip, sameAsHome, visitorTimeZone, workingOverlap, zoneCity } from './tz';
import './clock.css';

/* Bekasi keeps WIB (UTC+7) all year — no daylight saving. */
const WIB = 7 * 3600 * 1000;
const FIRST = TIMELINE[0].year;
const LAST = TIMELINE[TIMELINE.length - 1].year;
const SPAN = Math.max(1, LAST - FIRST);

const pad = (n: number, l = 2) => String(Math.floor(n)).padStart(l, '0');
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function bekasi(now: number) {
  const d = new Date(now + WIB);
  return { y: d.getUTCFullYear(), mo: d.getUTCMonth(), day: d.getUTCDate(), wd: d.getUTCDay(), h: d.getUTCHours(), m: d.getUTCMinutes(), s: d.getUTCSeconds() };
}

/** re-renders on every wall-clock second */
function useSecond() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    let to = 0;
    const tick = () => {
      setNow(Date.now());
      to = window.setTimeout(tick, 1000 - (Date.now() % 1000) + 5);
    };
    to = window.setTimeout(tick, 1000 - (Date.now() % 1000) + 5);
    return () => clearTimeout(to);
  }, []);
  return now;
}

function greeting(h: number) {
  if (h < 4 || h >= 19) return 'Selamat malam';
  if (h < 11) return 'Selamat pagi';
  if (h < 15) return 'Selamat siang';
  return 'Selamat sore';
}

/** Where her working day is right now. Plain facts from her hours, not a tracker. */
function workStatus(b: ReturnType<typeof bekasi>): { on: boolean; text: string } {
  const h = b.h + b.m / 60;
  const weekend = b.wd === 0 || b.wd === 6;
  const start = formatHour(WORK.start);
  if (weekend) return { on: false, text: `Weekend in Bekasi. Back Monday, ${start} WIB` };
  if (h >= WORK.start && h < WORK.end) return { on: true, text: `Inside her working hours (${start}–${formatHour(WORK.end)} WIB)` };
  if (h < WORK.start) {
    const left = WORK.start - h;
    return { on: false, text: `Her day starts at ${start} WIB, in ${Math.floor(left)}h ${pad((left % 1) * 60)}m` };
  }
  return { on: false, text: b.wd === 5 ? `Off for the weekend. Back Monday, ${start} WIB` : `Off for the day. Back at ${start} WIB` };
}

function offsetLine(tz: string, now: number) {
  const diff = Math.round((offsetHours(HOME_TZ, new Date(now)) - offsetHours(tz, new Date(now))) * 60); // Bekasi minus them, minutes
  if (diff === 0) return 'Same clock as Bekasi.';
  const a = Math.abs(diff);
  const h = Math.floor(a / 60);
  const m = a % 60;
  const amount = `${h ? `${h} hour${h === 1 ? '' : 's'}` : ''}${h && m ? ' ' : ''}${m ? `${m} min` : ''}`;
  return `${diff > 0 ? `${amount} behind` : `${amount} ahead of`} Bekasi.`;
}

/* ---- analog face: the wall clock, as an instrument ---------------------- */
function Dial({ h, m, s }: { h: number; m: number; s: number }) {
  const ticks = useMemo(
    () =>
      Array.from({ length: 60 }, (_, i) => {
        const a = (i / 60) * Math.PI * 2;
        const major = i % 5 === 0;
        const r1 = major ? 37 : 40;
        return <line key={i} x1={50 + Math.sin(a) * r1} y1={50 - Math.cos(a) * r1} x2={50 + Math.sin(a) * 43} y2={50 - Math.cos(a) * 43} className={major ? 'clk-dial__major' : 'clk-dial__minor'} />;
      }),
    [],
  );
  const hr = ((h % 12) + m / 60) * 30;
  const mn = (m + s / 60) * 6;
  const sc = s * 6;
  return (
    <svg className="clk-dial" viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r="48" className="clk-dial__rim" />
      <circle cx="50" cy="50" r="45.5" className="clk-dial__face" />
      {ticks}
      <line x1="50" y1="56" x2="50" y2="27" className="clk-dial__hour" transform={`rotate(${hr} 50 50)`} />
      <line x1="50" y1="58" x2="50" y2="14" className="clk-dial__min" transform={`rotate(${mn} 50 50)`} />
      <g className="clk-dial__sec" transform={`rotate(${sc} 50 50)`}>
        <line x1="50" y1="61" x2="50" y2="11" />
        <circle cx="50" cy="50" r="2.4" />
      </g>
    </svg>
  );
}

/* ---- the overlap ring (ported from the legacy OverlapRing) -------------- */
const R_OUT = 80;
const R_IN = 60;
const R_OV = 44;
function arc(r: number, startH: number, endH: number) {
  const toXY = (h: number) => {
    const a = (h / 24) * Math.PI * 2 - Math.PI / 2;
    return [100 + Math.cos(a) * r, 100 + Math.sin(a) * r];
  };
  let span = endH - startH;
  if (span <= 0) span += 24;
  if (span >= 24) span = 23.99;
  const [x1, y1] = toXY(startH);
  const [x2, y2] = toXY(startH + span);
  return `M${x1.toFixed(2)} ${y1.toFixed(2)} A${r} ${r} 0 ${span > 12 ? 1 : 0} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

function Overlap({ now }: { now: number }) {
  const uid = useId().replace(/:/g, '');
  const mine = useMemo(visitorTimeZone, []);
  const [zone, setZone] = useState(mine);
  const minute = Math.floor(now / 60_000);
  const at = useMemo(() => new Date(minute * 60_000), [minute]);
  const o = useMemo(() => workingOverlap(zone, at), [zone, at]);
  const needle = (hourIn(zone, at) / 24) * 360;
  const same = sameAsHome(zone, at);
  const city = zone === mine ? `you (${zoneCity(zone)})` : zoneCity(zone);
  const hours = Math.round(o.hours * 4) / 4;
  const label = `${hours} hours of working-day overlap between Bekasi and ${zoneCity(zone)}`;
  const zones = ZONES.some((z) => z.id === mine) ? ZONES : [{ id: mine, label: zoneCity(mine) }, ...ZONES];

  return (
    <section className="clk-ov well" aria-labelledby={`${uid}-h`}>
      <div className="clk-ov__head">
        <h3 className="t-label" id={`${uid}-h`}>
          Working-day overlap
        </h3>
        <label className="clk-ov__pick">
          <span className="sr-only">Compare Bekasi with</span>
          <select
            value={zone}
            onChange={(e) => {
              sfx('click');
              setZone(e.target.value);
              track('clock_zone', { zone: e.target.value });
            }}
          >
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.id === mine ? `Your time · ${z.label}` : z.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="clk-ov__body">
        <svg viewBox="0 0 200 200" className="clk-ring" role="img" aria-label={label}>
          <circle cx="100" cy="100" r={R_OUT} className="clk-ring__track" strokeWidth="16" />
          <circle cx="100" cy="100" r={R_IN} className="clk-ring__track" strokeWidth="12" />
          {Array.from({ length: 24 }, (_, h) => {
            const a = (h / 24) * Math.PI * 2 - Math.PI / 2;
            const big = h % 6 === 0;
            const p = (v: number) => (100 + v).toFixed(2);
            return <line key={h} x1={p(Math.cos(a) * (big ? 89 : 91))} y1={p(Math.sin(a) * (big ? 89 : 91))} x2={p(Math.cos(a) * 96)} y2={p(Math.sin(a) * 96)} className={big ? 'clk-ring__tick is-big' : 'clk-ring__tick'} />;
          })}
          {[0, 6, 12, 18].map((h) => {
            const a = (h / 24) * Math.PI * 2 - Math.PI / 2;
            return (
              <text key={h} x={(100 + Math.cos(a) * 30).toFixed(2)} y={(100 + Math.sin(a) * 30 + 3).toFixed(2)} textAnchor="middle" className="clk-ring__num">
                {pad(h)}
              </text>
            );
          })}
          <path d={arc(R_OUT, o.hersInYours.start, o.hersInYours.end)} className="clk-ring__hers" strokeWidth="16" />
          <path d={arc(R_IN, 9, 18)} className="clk-ring__yours" strokeWidth="12" />
          {o.ranges.map((r, i) => (
            <path key={i} d={arc(R_OV, r.start, r.end)} className="clk-ring__both" strokeWidth="8" />
          ))}
          <g transform={`rotate(${needle.toFixed(2)} 100 100)`} className="clk-ring__needle">
            <line x1="100" y1="100" x2="100" y2="16" />
          </g>
          <circle cx="100" cy="100" r="4.5" className="clk-ring__pin" />
        </svg>
        <div className="clk-ov__copy">
          <p className="clk-ov__big">
            <b className="t-dot">{hours}h</b> {same ? 'the same working day' : hours > 0 ? 'of shared working hours' : 'of overlap: async works'}
          </p>
          <ul className="clk-ov__legend">
            <li>
              <i className="is-hers" aria-hidden /> Adelia, {formatHour(WORK.start)}–{formatHour(WORK.end)} WIB
              {!same && (
                <>
                  {' '}
                  = <b>{formatHour(o.hersInYours.start)}–{formatHour(o.hersInYours.end)}</b> for {city}
                </>
              )}
            </li>
            <li>
              <i className="is-yours" aria-hidden /> {city[0].toUpperCase() + city.slice(1)}: 09:00–18:00 ({formatOffset(offsetHours(zone, at))})
            </li>
            {o.ranges.length > 0 && (
              <li>
                <i className="is-both" aria-hidden /> Overlap: {o.ranges.map((r) => `${formatHour(r.start)}–${formatHour(r.end)}`).join(', ')}
              </li>
            )}
          </ul>
          <p className="clk-ov__tip">{regionTip(zone, at)}</p>
        </div>
      </div>
      {TZ_NOTE && (
        <details className="clk-ov__note">
          <summary>Her notes on time zones</summary>
          <p>{TZ_NOTE}</p>
        </details>
      )}
    </section>
  );
}

/* ---- her path on a rail ------------------------------------------------- */
function YearRail() {
  const [idx, setIdxState] = useState(TIMELINE.length - 1);
  const [drag, setDrag] = useState<number | null>(null); // live year while dragging
  const trackRef = useRef<HTMLDivElement>(null);
  const idxRef = useRef(idx);
  const dragging = useRef(false);
  const lastYear = useRef<number>(LAST);

  const setIdx = (n: number) => {
    idxRef.current = n;
    setIdxState(n);
  };
  const yearAt = (clientX: number) => {
    const r = trackRef.current!.getBoundingClientRect();
    return FIRST + Math.max(0, Math.min(1, (clientX - r.left) / r.width)) * SPAN;
  };
  const nearest = (y: number) => {
    let best = 0;
    for (let i = 1; i < TIMELINE.length; i++) if (Math.abs(TIMELINE[i].year - y) < Math.abs(TIMELINE[best].year - y)) best = i;
    return best;
  };
  const select = (i: number) => {
    const n = Math.max(0, Math.min(TIMELINE.length - 1, i));
    if (n === idxRef.current) return;
    sfx('click', { pitch: n });
    setIdx(n);
  };

  const onMove = (y: number) => {
    setDrag(y);
    const quarter = Math.round(y * 4);
    if (quarter !== lastYear.current) {
      lastYear.current = quarter;
      sfx('tick', { pitch: (y - FIRST) * 2, gain: 0.6 });
    }
    const n = nearest(y);
    if (n !== idxRef.current) {
      sfx('beep', { pitch: n, gain: 0.35 });
      setIdx(n);
    }
  };

  const down = (e: RPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    lastYear.current = Math.round(yearAt(e.clientX) * 4);
    onMove(yearAt(e.clientX));
  };
  const move = (e: RPointerEvent<HTMLDivElement>) => {
    if (dragging.current) onMove(yearAt(e.clientX));
  };
  const up = () => {
    if (!dragging.current) return;
    dragging.current = false;
    setDrag(null);
    sfx('switch');
  };

  const key = (e: RKeyboardEvent) => {
    const map: Record<string, number> = { ArrowLeft: idx - 1, ArrowDown: idx - 1, ArrowRight: idx + 1, ArrowUp: idx + 1, Home: 0, End: TIMELINE.length - 1 };
    if (e.key in map) {
      e.preventDefault();
      select(map[e.key]);
    }
  };

  const item = TIMELINE[idx];
  const pos = drag ?? item.year;
  const pct = ((pos - FIRST) / SPAN) * 100;
  const quarters = SPAN * 4;

  return (
    <section className="clk-rail" aria-label={`Her path, ${FIRST} to ${LAST}`}>
      <div className="rule">
        Her path · {FIRST} → {LAST} · drag the rail
      </div>
      <div className="clk-rail__card" aria-live="polite">
        <span className="clk-rail__year t-dot">{item.year}</span>
        <div className="clk-rail__copy" key={item.year}>
          <strong>{item.title}</strong>
          <p>{item.body}</p>
        </div>
      </div>
      <div className="clk-rail__ctl">
        <button type="button" className="btn btn--sm btn--icon" onClick={() => select(idx - 1)} disabled={idx === 0} aria-label="Previous milestone">
          <Icon name="arrow-left" size={16} />
        </button>
        <div className={`clk-rail__track well ${drag !== null ? 'is-drag' : ''}`} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
          <div ref={trackRef} className="clk-rail__inner">
            {Array.from({ length: quarters + 1 }, (_, i) => {
              const y = FIRST + i / 4;
              const whole = i % 4 === 0;
              const ms = whole ? TIMELINE.findIndex((t) => t.year === y) : -1;
              return <i key={i} className={`clk-rail__tick ${whole ? 'is-year' : ''} ${ms >= 0 ? 'is-ms' : ''} ${ms === idx ? 'is-on' : ''}`} style={{ left: `${(i / quarters) * 100}%` }} />;
            })}
            <span className="clk-rail__fill" style={{ width: `${pct}%` }} />
            <span
              className="clk-rail__thumb"
              style={{ left: `${pct}%` }}
              role="slider"
              tabIndex={0}
              aria-label="Year on her path"
              aria-valuemin={FIRST}
              aria-valuemax={LAST}
              aria-valuenow={item.year}
              aria-valuetext={`${item.year}: ${item.title}`}
              onKeyDown={key}
            />
          </div>
        </div>
        <button type="button" className="btn btn--sm btn--icon" onClick={() => select(idx + 1)} disabled={idx === TIMELINE.length - 1} aria-label="Next milestone">
          <Icon name="arrow-right" size={16} />
        </button>
      </div>
      <div className="clk-rail__labels t-label" aria-hidden="true">
        {Array.from({ length: SPAN + 1 }, (_, i) => FIRST + i).map((y) => (
          <span key={y} style={{ left: `${((y - FIRST) / SPAN) * 100}%` }}>
            {y}
          </span>
        ))}
      </div>
    </section>
  );
}

/* ---- panel -------------------------------------------------------------- */
export default function ClockPanel() {
  const now = useSecond();
  const b = bekasi(now);
  const status = workStatus(b);
  const mine = useMemo(visitorTimeZone, []);
  const localTime = fmtIn(mine, new Date(now), { hour: '2-digit', minute: '2-digit' });
  const st = STATIONS.clock;

  useEffect(() => {
    game().unlock('time-keeper');
    track('clock_open', { zone: mine });
  }, [mine]);

  const book = () => {
    track('clock_cta', { cta: 'book' });
    focus('printer', { tab: 'hiring' });
  };

  return (
    <Sheet code={st.code} title="Check the time in Bekasi" kicker={`${st.name} · WIB`} className="clk">
      <section className="clk-hero lcd" aria-label={`Current time in Bekasi: ${pad(b.h)}:${pad(b.m)} WIB`}>
        <div className="clk-hero__top">
          <span className="t-label">Bekasi · WIB · UTC+07:00</span>
          <span className="clk-live">
            <i className="led led--green led--blink" /> Live
          </span>
        </div>
        <div className="clk-time" role="timer" aria-hidden="true">
          <span className="clk-time__hm t-dot">
            {pad(b.h)}
            <span className="clk-colon">:</span>
            {pad(b.m)}
          </span>
          <span className="clk-time__s t-dot">{pad(b.s)}</span>
        </div>
        <div className="clk-date t-mono">
          {DAYS[b.wd]}, {b.day} {MONTHS[b.mo]} {b.y}
        </div>
        <div className="clk-secs" aria-hidden="true">
          {Array.from({ length: 60 }, (_, i) => (
            <i key={i} className={i < b.s ? 'is-past' : i === b.s ? 'is-now' : ''} />
          ))}
        </div>
        <p className={`clk-status ${status.on ? 'is-on' : ''}`}>
          <i className={`led ${status.on ? 'led--green' : 'led--off'}`} aria-hidden /> {status.text}
        </p>
      </section>

      <section className="clk-compare">
        <Dial h={b.h} m={b.m} s={b.s} />
        <div className="clk-compare__copy">
          <span className="t-label">{greeting(b.h)} from Bekasi</span>
          <p className="clk-compare__line">{sameAsHome(mine, new Date(now)) ? 'You’re on Bekasi time.' : `You’re ${offsetLine(mine, now)}`}</p>
          <p className="clk-compare__sub t-mono">
            Your time {localTime} · {zoneCity(mine)}
          </p>
        </div>
      </section>

      <Overlap now={now} />

      <YearRail />

      <div className="clk-cta">
        <button type="button" className="btn btn--primary btn--lg btn--block" onClick={book}>
          <Icon name="calendar" size={16} /> Book a chat, in WIB and your time
        </button>
        <p className="clk-cta__fine">
          {COMPANY.replyTime} · {COMPANY.email}
        </p>
      </div>
    </Sheet>
  );
}

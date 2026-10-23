/* ==========================================================================
   Admin charts — small, dependency-free SVG/HTML charts in the room's
   clear-tech language. One signal hue (--adm-mark, a blue between --primary
   and --primary-ink, 4.4:1 on white), hairline grid, 2px lines, 10% area
   wash, ≤24px bars with a 4px rounded data-end, crosshair tooltip on the
   line chart, per-mark tooltips on bars/cells, and a table view.
   Colours live in admin.css as tokens derived from global.css.
   ========================================================================== */
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent as RPointerEvent, type ReactNode } from 'react';
import { compact } from './metrics';

/* --------------------------------------------------------------- utils */
function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(600);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setW(el.clientWidth);
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

/** nice tick step for 0..max with ~n ticks */
function niceTicks(max: number, n = 4): number[] {
  if (max <= 0) return [0, 1];
  const raw = max / n;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
  const s = Math.max(1, step);
  const top = Math.ceil(max / s) * s;
  const out: number[] = [];
  for (let v = 0; v <= top + 1e-9; v += s) out.push(Math.round(v * 100) / 100);
  return out;
}

const fmtDay = (day: string, withYear = false) => {
  const [y, m, d] = day.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12));
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short', ...(withYear ? { year: 'numeric' } : {}) }).format(dt);
};

/* --------------------------------------------------------------- tooltip */
export function Tip({ x, y, children, show }: { x: number; y: number; children: ReactNode; show: boolean }) {
  return (
    <div className={`adm-tip ${show ? 'is-on' : ''}`} style={{ transform: `translate(${Math.round(x)}px, ${Math.round(y)}px)` }} role="status" aria-hidden={!show}>
      {children}
    </div>
  );
}

/* --------------------------------------------------------------- line */
export function SessionsChart({ data, label = 'Visits' }: { data: { day: string; v: number }[]; label?: string }) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const H = 220;
  const pad = { l: 40, r: 16, t: 14, b: 28 };
  const iw = Math.max(10, w - pad.l - pad.r);
  const ih = H - pad.t - pad.b;
  const max = Math.max(1, ...data.map((d) => d.v));
  const ticks = niceTicks(max, 4);
  const top = ticks[ticks.length - 1];
  const x = (i: number) => pad.l + (data.length <= 1 ? iw / 2 : (i / (data.length - 1)) * iw);
  const y = (v: number) => pad.t + ih - (v / top) * ih;
  const [hover, setHover] = useState<number | null>(null);
  const tableId = useId();

  const line = data.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d.v).toFixed(1)}`).join(' ');
  const area = data.length ? `${line} L${x(data.length - 1).toFixed(1)},${y(0)} L${x(0).toFixed(1)},${y(0)} Z` : '';
  const every = Math.max(1, Math.ceil(data.length / Math.max(2, Math.floor(iw / 70))));
  const total = data.reduce((a, b) => a + b.v, 0);
  const peak = data.reduce((m, d, i) => (d.v > data[m].v ? i : m), 0);

  function onMove(e: RPointerEvent<SVGSVGElement>) {
    const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
    const px = e.clientX - r.left;
    const i = data.length <= 1 ? 0 : Math.round(((px - pad.l) / iw) * (data.length - 1));
    setHover(Math.max(0, Math.min(data.length - 1, i)));
  }
  function onKey(e: KeyboardEvent) {
    if (!data.length) return;
    if (e.key === 'ArrowRight') setHover((h) => Math.min(data.length - 1, (h ?? -1) + 1));
    else if (e.key === 'ArrowLeft') setHover((h) => Math.max(0, (h ?? data.length) - 1));
    else if (e.key === 'Home') setHover(0);
    else if (e.key === 'End') setHover(data.length - 1);
    else return;
    e.preventDefault();
  }

  const h = hover != null ? data[hover] : null;
  const tipX = hover != null ? Math.min(Math.max(x(hover) - 70, 0), w - 140) : 0;

  return (
    <div className="adm-chart" ref={ref}>
      <svg
        width={w}
        height={H}
        viewBox={`0 0 ${w} ${H}`}
        role="img"
        tabIndex={0}
        aria-label={`${label} per day: ${total} total over ${data.length} days, peak ${data[peak]?.v ?? 0} on ${data[peak] ? fmtDay(data[peak].day) : '—'}. Use arrow keys to read values.`}
        aria-describedby={tableId}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
        onKeyDown={onKey}
        onBlur={() => setHover(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line className="adm-gl" x1={pad.l} x2={w - pad.r} y1={y(t)} y2={y(t)} />
            <text className="adm-axis" x={pad.l - 8} y={y(t) + 3.5} textAnchor="end">
              {compact(t)}
            </text>
          </g>
        ))}
        {data.map((d, i) =>
          (i % every === 0 && (i === data.length - 1 || data.length - 1 - i >= every * 0.7)) || i === data.length - 1 ? (
            <text key={d.day} className="adm-axis" x={x(i)} y={H - 8} textAnchor={i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle'}>
              {fmtDay(d.day)}
            </text>
          ) : null,
        )}
        {data.length > 0 && (
          <>
            <path d={area} className="adm-area" />
            <path d={line} className="adm-line" />
          </>
        )}
        {data.length > 0 && data[peak].v > 0 && hover == null && (
          <g>
            <circle cx={x(peak)} cy={y(data[peak].v)} r={4.5} className="adm-dot" />
            <text className="adm-axis adm-axis--strong" x={x(peak)} y={y(data[peak].v) - 10} textAnchor={peak > data.length * 0.85 ? 'end' : peak < data.length * 0.15 ? 'start' : 'middle'}>
              {data[peak].v} peak
            </text>
          </g>
        )}
        {h && hover != null && (
          <g pointerEvents="none">
            <line className="adm-cross" x1={x(hover)} x2={x(hover)} y1={pad.t} y2={pad.t + ih} />
            <circle cx={x(hover)} cy={y(h.v)} r={4.5} className="adm-dot" />
          </g>
        )}
      </svg>
      <Tip x={tipX} y={8} show={!!h}>
        {h && (
          <>
            <b>{h.v.toLocaleString('en-US')}</b>
            <span>
              <i className="adm-key adm-key--line" /> {label} · {fmtDay(h.day, true)}
            </span>
          </>
        )}
      </Tip>
      <details className="adm-tableview">
        <summary className="t-label">Table view</summary>
        <table id={tableId}>
          <thead>
            <tr>
              <th>Day (WIB)</th>
              <th>{label}</th>
            </tr>
          </thead>
          <tbody>
            {data
              .slice()
              .reverse()
              .map((d) => (
                <tr key={d.day}>
                  <td>{d.day}</td>
                  <td>{d.v}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}

/* --------------------------------------------------------------- bars */
export interface BarItem {
  id: string;
  label: ReactNode;
  value: number;
  note?: string;
  key?: string; // aria label text
}

/** Horizontal bars (HTML) — value at the tip, hover/focus lifts the bar and shows a tooltip. */
export function HBars({ items, total, empty = 'No data yet', unit = '', max: maxIn, limit, stacked }: { items: BarItem[]; total?: number; empty?: string; unit?: string; max?: number; limit?: number; stacked?: boolean }) {
  const shown = limit ? items.slice(0, limit) : items;
  const max = maxIn ?? Math.max(1, ...shown.map((i) => i.value));
  if (!items.length || items.every((i) => !i.value)) return <p className="adm-empty">{empty}</p>;
  return (
    <ul className={`adm-bars ${stacked ? 'adm-bars--stacked' : ''}`}>
      {shown.map((it) => {
        const pct = total ? (it.value / Math.max(1, total)) * 100 : null;
        return (
          <li key={it.id} className="adm-bar" tabIndex={0} aria-label={`${it.key ?? it.id}: ${it.value}${unit}${pct != null ? `, ${pct.toFixed(0)}%` : ''}`}>
            <span className="adm-bar__label">{it.label}</span>
            <span className="adm-bar__track">
              <span className="adm-bar__fill" style={{ width: `${Math.max(it.value ? 1.5 : 0, (it.value / max) * 100)}%` }} />
              <span className="adm-bar__val">
                {it.value.toLocaleString('en-US')}
                {unit}
                {pct != null && <em> · {pct.toFixed(0)}%</em>}
              </span>
            </span>
            {it.note && (
              <span className="adm-tip adm-bar__tip" role="tooltip">
                <b>{it.value.toLocaleString('en-US')}</b>
                <span>{it.note}</span>
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/* --------------------------------------------------------------- funnel */
export function Funnel({ steps }: { steps: { id: string; label: string; n: number; any?: number }[] }) {
  const base = Math.max(1, steps[0]?.n ?? 1);
  if (!steps.length || steps.every((s) => !s.n)) return <p className="adm-empty">No visits in this range yet.</p>;
  return (
    <ol className="adm-funnel">
      {steps.map((s, i) => {
        const pct = (s.n / base) * 100;
        const prev = i > 0 ? steps[i - 1].n : null;
        const step = prev ? (s.n / prev) * 100 : null;
        return (
          <li
            key={s.id}
            className="adm-funnel__row"
            tabIndex={0}
            aria-label={`${s.label}: ${s.n} visits, ${pct.toFixed(0)}% of all visits${s.any != null && s.any !== s.n ? `; ${s.any} in any order` : ''}`}
          >
            <span className="adm-funnel__n t-label">0{i + 1}</span>
            <span className="adm-funnel__label">{s.label}</span>
            <span className="adm-funnel__track">
              <span className="adm-funnel__fill" style={{ width: `${Math.max(s.n ? 1.5 : 0, Math.min(100, pct))}%`, opacity: 1 - i * 0.16 }} />
            </span>
            <span className="adm-funnel__val">
              <b>{s.n.toLocaleString('en-US')}</b>
              <span>{pct.toFixed(0)}%</span>
            </span>
            {step != null && i > 0 && (
              <span className="adm-funnel__step t-label">
                {step.toFixed(0)}% of previous{s.any != null && s.any !== s.n ? ` · ${s.any.toLocaleString('en-US')} in any order` : ''}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/* --------------------------------------------------------------- heatmap */
/** One-hue sequential ramp, light → dark (admin.css: --adm-heat-0 … -6, derived from the blue tokens). */
const HEAT = [0, 1, 2, 3, 4, 5, 6].map((i) => `var(--adm-heat-${i})`);
/** Steps from here on are dark enough for white text (≥ 4.5:1). */
const HEAT_DARK_FROM = 5;

/** sequential step index for v within [lo, hi] (0 always maps to the empty step) */
export function heatStep(v: number, lo: number, hi: number) {
  if (!v || hi <= 0) return 0;
  const t = hi > lo ? (Math.min(Math.max(v, lo), hi) - lo) / (hi - lo) : 1;
  return 1 + Math.min(HEAT.length - 2, Math.floor(t * (HEAT.length - 1.0001)));
}
export const heatColor = (v: number, lo: number, hi: number) => HEAT[heatStep(v, lo, hi)];

export function Heatmap({ cells, groups, base }: { cells: { id: string; code: string; name: string; chapter: string; n: number }[]; groups: { id: string; label: string }[]; base: number }) {
  // the door is found by everyone — keep it out of the colour scale so the room's stations stay readable
  const room = cells.filter((c) => c.id !== 'door').map((c) => c.n);
  const max = Math.max(1, ...room);
  const nz = room.filter(Boolean);
  // stretch the scale over the observed range so close values stay distinguishable
  const lo = nz.length > 1 ? Math.min(...nz) : 0;
  const [hover, setHover] = useState<string | null>(null);
  return (
    <div className="adm-heat">
      <div className="adm-heat__rows">
        {groups.map((g) => {
          const gc = cells.filter((c) => c.chapter === g.id);
          if (!gc.length) return null;
          return (
            <div key={g.id} className="adm-heat__row">
              <span className="t-label adm-heat__gl">{g.label}</span>
              <div className="adm-heat__cells">
                {gc.map((c) => {
                  const pct = base ? (c.n / base) * 100 : 0;
                  const v = Math.min(c.n, max);
                  const step = heatStep(v, lo, max);
                  const dark = step >= HEAT_DARK_FROM;
                  return (
                    <div
                      key={c.id}
                      className={`adm-heat__cell ${dark ? 'is-dark' : ''} ${hover === c.id ? 'is-hover' : ''}`}
                      style={{ background: HEAT[step] }}
                      tabIndex={0}
                      onPointerEnter={() => setHover(c.id)}
                      onPointerLeave={() => setHover(null)}
                      onFocus={() => setHover(c.id)}
                      onBlur={() => setHover(null)}
                      aria-label={`${c.name} (${c.code}): found in ${c.n} visits, ${pct.toFixed(0)}%`}
                    >
                      <span className="adm-heat__name">{c.name.replace(/^The /, '')}</span>
                      <span className="adm-heat__meta">
                        <b className="adm-heat__v">{c.n}</b>
                        <span className="adm-heat__code">{pct.toFixed(0)}%</span>
                      </span>
                      {hover === c.id && (
                        <span className="adm-tip is-on adm-heat__tip" role="tooltip">
                          <b>
                            {c.n.toLocaleString('en-US')} <small>· {pct.toFixed(0)}% of visits</small>
                          </b>
                          <span>
                            {c.code} · {c.name}
                          </span>
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <div className="adm-heat__legend" aria-hidden>
        <span className="t-label">{lo || 0}</span>
        <span className="adm-heat__scale">
          {HEAT.slice(1).map((c) => (
            <i key={c} style={{ background: c }} />
          ))}
        </span>
        <span className="t-label">{max}+ visits · pale = none yet</span>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- sparkline */
export function Spark({ values }: { values: number[] }) {
  const w = 80;
  const h = 22;
  const max = Math.max(1, ...values);
  const pts = useMemo(() => values.map((v, i) => `${((i / Math.max(1, values.length - 1)) * w).toFixed(1)},${(h - 2 - (v / max) * (h - 4)).toFixed(1)}`).join(' '), [values, max]);
  if (values.length < 2) return null;
  return (
    <svg className="adm-spark" width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden>
      <polyline points={pts} fill="none" />
    </svg>
  );
}

/** re-render every `ms` (relative timestamps) */
export function useTick(ms: number) {
  const [, set] = useState(0);
  useEffect(() => {
    const id = setInterval(() => set((x) => x + 1), ms);
    return () => clearInterval(id);
  }, [ms]);
}

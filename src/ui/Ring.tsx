import { useEffect, useRef, useState, type ReactNode } from 'react';
import './ring.css';

/**
 * Flat single-colour ring gauge. Used by the phone (overlap hours), the run sheets (evidence) and the
 * room HUD (visit). One stroke colour, a quiet track, round caps, starting at 12 o'clock (gak 08).
 *
 * Motion (gak §5, measured at 30 fps): the game waits a beat after a hit, then ticks with an ease-out.
 * Here: a --duration-quick pause, then a --duration-fast ease-out sweep. On mount the arc grows from
 * empty; later changes sweep from where it was. Reduced motion: the final state, no sweep.
 *
 * The API is frozen: { value, max, size, stroke, tone, label, children }.
 */
type Props = {
  value: number;
  max: number;
  size?: number;
  stroke?: number;
  tone?: 'light' | 'dark';
  /** What the ring means, read by screen readers (role="img"). Without it the ring is decorative. */
  label?: string;
  /** Centred content, usually a count set in type. */
  children?: ReactNode;
};

const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export function Ring({ value, max, size = 48, stroke = 4, tone = 'light', label, children }: Props) {
  const frac = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  const [shown, setShown] = useState(() => (reduced() ? frac : 0));

  useEffect(() => {
    // One frame later, so the CSS transition runs from what is already drawn.
    const id = requestAnimationFrame(() => setShown(frac));
    return () => cancelAnimationFrame(id);
  }, [frac]);

  const c = size / 2;
  const r = Math.max(0, (size - stroke) / 2);
  // Real circumference instead of pathLength: older Safari mis-scales pathLength on <circle>.
  const len = 2 * Math.PI * r;

  return (
    <span
      className="ring"
      data-tone={tone}
      data-empty={frac === 0 || undefined}
      style={{ width: size, height: size }}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} aria-hidden="true" focusable="false">
        <circle className="ring-track" cx={c} cy={c} r={r} strokeWidth={stroke} />
        <circle
          className="ring-value"
          cx={c}
          cy={c}
          r={r}
          strokeWidth={stroke}
          strokeDasharray={`${len} ${len}`}
          strokeDashoffset={len * (1 - shown)}
          transform={`rotate(-90 ${c} ${c})`}
          data-zero={shown === 0 || undefined}
        />
      </svg>
      {children != null && <span className="ring-center">{children}</span>}
    </span>
  );
}

/**
 * A number that ticks to its target the way the ring sweeps: a --duration-quick pause, then a
 * --duration-fast ease-out (gak 11: 109, 108, 76, 63, 54, 52). Counts up or down.
 * `from` is where the first count starts; pass the target itself to skip the first count.
 * Reduced motion: returns the target straight away.
 */
const PAUSE = 150; // --duration-quick
const SWEEP = 250; // --duration-fast

export function useCountUp(target: number, from = 0): number {
  const [n, setN] = useState(() => (reduced() ? target : from));
  const last = useRef(reduced() ? target : from);

  useEffect(() => {
    if (reduced()) {
      last.current = target;
      setN(target);
      return;
    }
    const start = last.current;
    if (start === target) return;
    let raf = 0;
    const t0 = performance.now() + PAUSE;
    const step = (now: number) => {
      const p = Math.min(1, Math.max(0, (now - t0) / SWEEP));
      const eased = 1 - Math.pow(1 - p, 3);
      const v = Math.round(start + (target - start) * eased);
      last.current = v;
      setN(v);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target]);

  return n;
}

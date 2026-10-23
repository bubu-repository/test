/* Knurled rotary knob — drag up/down, wheel, or keyboard (role="slider"). */
import { useRef, type KeyboardEvent, type PointerEvent, type WheelEvent } from 'react';
import { sfx } from '@/audio/engine';

interface KnobProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  /** text for aria-valuetext + caption */
  format?: (v: number) => string;
  onChange: (v: number) => void;
  onTurn?: (label: string, text: string) => void;
  size?: number;
  accent?: boolean;
}

export function Knob({ label, value, min, max, step = 1, format = (v) => String(Math.round(v)), onChange, onTurn, size = 52, accent }: KnobProps) {
  const drag = useRef<{ y: number; v: number } | null>(null);
  const lastDetent = useRef(0);
  const range = max - min;
  const norm = (value - min) / range;
  const angle = -135 + norm * 270;

  const commit = (raw: number) => {
    const q = Math.round(raw / step) * step;
    const v = Math.max(min, Math.min(max, +q.toFixed(4)));
    if (v === value) return;
    onChange(v);
    onTurn?.(label, format(v));
    // a detent tick every ~4% of travel
    const det = Math.round(((v - min) / range) * 24);
    if (det !== lastDetent.current) {
      lastDetent.current = det;
      sfx('knob', { pitch: det - 12 });
    }
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    (e.currentTarget as HTMLDivElement).focus();
    drag.current = { y: e.clientY, v: value };
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    const fine = e.shiftKey ? 0.25 : 1;
    const dy = drag.current.y - e.clientY;
    commit(drag.current.v + (dy / 180) * range * fine);
  };
  const end = () => {
    drag.current = null;
  };
  const onWheel = (e: WheelEvent<HTMLDivElement>) => {
    commit(value - Math.sign(e.deltaY) * Math.max(step, range / 60));
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const big = Math.max(step, range / 10);
    let v: number | null = null;
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') v = value + (e.shiftKey ? big : step);
    else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') v = value - (e.shiftKey ? big : step);
    else if (e.key === 'PageUp') v = value + big;
    else if (e.key === 'PageDown') v = value - big;
    else if (e.key === 'Home') v = min;
    else if (e.key === 'End') v = max;
    if (v == null) return;
    e.preventDefault();
    e.stopPropagation();
    commit(v);
  };

  return (
    <div className={`po-knob ${accent ? 'po-knob--accent' : ''}`} style={{ ['--size' as string]: `${size}px` }}>
      <div
        className="po-knob__cap"
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={+value.toFixed(3)}
        aria-valuetext={format(value)}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={end}
        onPointerCancel={end}
        onWheel={onWheel}
        onKeyDown={onKeyDown}
        onDoubleClick={() => commit(min + range / 2)}
      >
        <svg className="po-knob__ring" viewBox="0 0 60 60" aria-hidden>
          <path d="M12.3 47.7 A25 25 0 1 1 47.7 47.7" className="po-knob__track" />
          <path d="M12.3 47.7 A25 25 0 1 1 47.7 47.7" className="po-knob__fill" pathLength={100} strokeDasharray={`${norm * 100} 100`} />
        </svg>
        <div className="po-knob__body" style={{ transform: `rotate(${angle}deg)` }}>
          <i />
        </div>
      </div>
      <span className="po-knob__label">{label}</span>
      <span className="po-knob__value t-mono">{format(value)}</span>
    </div>
  );
}

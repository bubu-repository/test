/* ==========================================================================
   The Studio's small parts: the instant camera's front (lens, flash,
   readout, shutter, print slot), labelled control groups, segmented
   switches, photo thumbnails and the little layout diagrams.
   ========================================================================== */
import { useEffect, useRef, type ReactNode } from 'react';
import type { LayoutId } from './layouts';
import { cover } from './source';

/** The front of the camera, seen up close. The print comes out of the slot along its bottom edge. */
export function CameraFront({
  status,
  detail,
  printNo,
  live,
  shutter,
}: {
  /** What the readout says, in capitals: READY, PRINTING, LIVE… */
  status: string;
  /** The second line of the readout: material · layout. */
  detail: string;
  printNo: number;
  /** The readout's LED: 'busy' blinks pink, 'live' is blue. */
  live: 'idle' | 'busy' | 'live';
  shutter: { label: string; caption: string; onPress: () => void; disabled?: boolean };
}) {
  return (
    <div className="st-cam">
      <span className="st-cam__plate t-mono" aria-hidden="true">
        ADL·S1 <b>instant</b>
      </span>
      <span className="st-cam__flash" aria-hidden="true" />
      <span className="st-cam__lens" aria-hidden="true">
        <i />
      </span>
      <div className="st-cam__lcd lcd" aria-hidden="true">
        <span className="st-cam__lcd-row">
          <span className={`led ${live === 'busy' ? 'led--blink' : live === 'live' ? 'led--blue' : 'led--green'}`} />
          <span className="st-cam__status t-dot">{status}</span>
          <span className="st-cam__no">No.{String(printNo).padStart(3, '0')}</span>
        </span>
        <span className="st-cam__detail">{detail}</span>
      </div>
      <span className="st-cam__shutter-wrap">
        <button type="button" className="st-cam__shutter" onClick={shutter.onPress} disabled={shutter.disabled} aria-label={shutter.label}>
          <span aria-hidden="true" />
        </button>
        <span className="st-cam__shutter-cap t-label" aria-hidden="true">
          {shutter.caption}
        </span>
      </span>
      <span className="st-cam__stripe" aria-hidden="true" />
      <span className="st-cam__slot" aria-hidden="true" />
    </div>
  );
}

/** A labelled group of controls. With `htmlFor`, the label is a real <label> for that field. */
export function Group({ label, htmlFor, optional, children, id }: { label: string; htmlFor?: string; optional?: boolean; children: ReactNode; id?: string }) {
  return (
    <div className="st-group">
      {htmlFor ? (
        <label htmlFor={htmlFor} className="st-group__label t-label">
          {label} {optional && <span className="st-group__opt">optional</span>}
        </label>
      ) : (
        <p className="st-group__label t-label" id={id}>
          {label}
        </p>
      )}
      {children}
    </div>
  );
}

/** A segmented switch: native radios (arrow keys move between them), drawn as keys in a tray. */
export function Seg<T extends string>({ name, label, value, options, onChange }: { name: string; label: string; value: T; options: { id: T; name: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="st-seg" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <label key={o.id} className="st-seg__opt">
          <input type="radio" name={name} checked={value === o.id} onChange={() => onChange(o.id)} />
          <span>{o.name}</span>
        </label>
      ))}
    </div>
  );
}

/** A small square of a photo the visitor took or chose. */
export function ShotThumb({ still }: { still: HTMLCanvasElement }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const t = cover(still, 1, 120);
    c.width = t.width;
    c.height = t.height;
    c.getContext('2d')!.drawImage(t, 0, 0);
  }, [still]);
  return <canvas ref={ref} className="st-shot" aria-hidden="true" />;
}

/** A tiny diagram of each layout, drawn with boxes. */
export function LayoutGlyph({ id }: { id: LayoutId }) {
  const box = (x: number, y: number, w: number, h: number, k: string | number, r = 1.5) => <rect key={k} x={x} y={y} width={w} height={h} rx={r} />;
  let body: ReactNode;
  if (id === 'card') body = [box(7, 3, 22, 28, 'c', 2.5), <rect key="i" className="st-glyph__ink" x="10" y="6" width="16" height="17" rx="1.5" />, <rect key="t" className="st-glyph__ink" x="12" y="26" width="12" height="2" rx="1" />];
  else if (id === 'strip') body = [box(12, 1, 12, 32, 's', 1.5), ...[0, 1, 2, 3].map((i) => <rect key={i} className="st-glyph__ink" x="14" y={3 + i * 7} width="8" height="5.5" rx="1" />)];
  else if (id === 'id')
    body = [
      box(2, 7, 32, 21, 'p', 1.5),
      ...[0, 1, 2, 3].flatMap((c) => [0, 1].map((r) => <rect key={`${c}${r}`} className="st-glyph__ink" x={4.5 + c * 7.4} y={9.5 + r * 8.8} width="5.6" height="7.4" rx=".8" />)),
    ];
  else if (id === 'tcg') body = [box(8, 2, 20, 30, 'c', 3), <rect key="w" className="st-glyph__ink" x="11" y="8" width="14" height="10" rx="1.2" />, <rect key="n" className="st-glyph__ink" x="11" y="4.5" width="9" height="2" rx="1" />, <rect key="l" className="st-glyph__ink" x="11" y="21" width="14" height="2.4" rx="1.2" />];
  else body = <path className="st-glyph__ink st-glyph__cut" d="M18 4c6 0 10 3 11 8s-2 7-1 11-3 8-10 8-11-3-11-8 2-6 1-10S11 4 18 4Z" />;
  return (
    <svg className="st-glyph" viewBox="0 0 36 34" aria-hidden="true">
      {body}
    </svg>
  );
}

export function LockGlyph() {
  return (
    <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true" className="st-lock">
      <rect x="3" y="7" width="10" height="7" rx="2" fill="currentColor" />
      <path d="M5 7V5a3 3 0 0 1 6 0v2" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

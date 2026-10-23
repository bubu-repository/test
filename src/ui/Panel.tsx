/* ==========================================================================
   Panel shells every feature uses. Nothing docks to the screen edge: panels
   are things in the room.
   • <Sheet>  — a card that slides out of the object and rests beside it
                (on phones: below it). The room falls out of focus around
                the pair; the object stays sharp.
   • <Stage>  — a device or paper brought up close: it rises out of the
                object and fills most of the view (OS, games, newspaper…).
   Both return into their object on close. Close = Director back().
   Material (Adelia's Room, clear tech): a white card mounted under a sheet
   of clear acrylic with four chrome standoffs, an engraved chrome ST-xx
   nameplate and a ruler hairline in the header. Close-ups are a jewel case
   with a hinge and a printed spec bezel (adelia.cc / code / rev).
   ========================================================================== */
import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react';
import { back } from '@/stage/director';
import { useUI } from '@/state/ui';
import { FOCUS } from '@/stage/plate';
import { STATIONS } from '@/stage/stations';
import { cardMetrics, focusFrame, isCompact } from '@/stage/frame';
import type { Area } from '@/stage/camera';
import { Icon } from './Icon';
import './panel.css';

/** Set by PanelHost while a closing panel plays its way back into the object. */
export const PanelPresence = createContext({ leaving: false });

interface ShellProps {
  code?: string;
  title: string;
  kicker?: string;
  children: ReactNode;
  /** extra header controls (right side) */
  actions?: ReactNode;
  onClose?: () => void;
  className?: string;
  style?: CSSProperties;
  /** remove default body padding (for full-bleed content) */
  bleed?: boolean;
  dark?: boolean;
}

function useEsc(onClose: () => void) {
  const { leaving } = useContext(PanelPresence);
  useEffect(() => {
    if (leaving) return;
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose, leaving]);
}

function useViewport() {
  const [vp, setVp] = useState({ w: window.innerWidth, h: window.innerHeight });
  useEffect(() => {
    const on = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return vp;
}

/** Printed on the bezel of every close-up (a build string, like a device label). */
const REV = 'Rev 26.10';

/**
 * One engraved code per object: when this panel is the focused station's own
 * panel, the nameplate shows that station's code from stations.ts (RM-xx), so
 * the cursor tag, the HUD and the panel always agree. Otherwise the panel's
 * own `code` prop is used. Frozen at mount so it never flickers on the way out.
 */
function useEngraved(code?: string) {
  const [engraved] = useState(() => {
    const { focus, panel } = useUI.getState();
    const st = focus ? STATIONS[focus] : null;
    return st && panel && st.panel === panel ? st.code : code;
  });
  return engraved;
}

/** Four chrome standoffs holding the acrylic. */
function Screws() {
  return (
    <span className="screws" aria-hidden>
      <i />
      <i />
      <i />
      <i />
    </span>
  );
}

/**
 * Animate a panel out of the object on mount and back into it when PanelHost
 * marks it as leaving. `lift` adds a slight tip toward the viewer (Stage).
 */
function useEmerge(ref: RefObject<HTMLElement | null>, obj: Area | null, lift: boolean, ready = true) {
  const { leaving } = useContext(PanelPresence);
  const from = useRef<Keyframe | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!ready || from.current || !el || typeof el.animate !== 'function') return;
    const r = el.getBoundingClientRect();
    const o = obj ?? { x: r.left + r.width / 2 - 40, y: r.top + r.height / 2 - 40, w: 80, h: 80 };
    const dx = o.x + o.w / 2 - (r.left + r.width / 2);
    const dy = o.y + o.h / 2 - (r.top + r.height / 2);
    const s = Math.max(0.12, Math.min(0.7, Math.max(o.w / r.width, o.h / r.height) * (lift ? 0.9 : 0.5)));
    from.current = {
      transform: `${lift ? 'perspective(1600px) ' : ''}translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) scale(${s.toFixed(3)})${lift ? ' rotateX(14deg)' : ''}`,
      opacity: 0,
    };
    el.animate([from.current, { opacity: 1, offset: 0.3 }, { transform: lift ? 'perspective(1600px) translate(0px, 0px) scale(1) rotateX(0deg)' : 'none', opacity: 1 }], {
      duration: lift ? 760 : 680,
      easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
      fill: 'backwards',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);
  useEffect(() => {
    const el = ref.current;
    if (!leaving || !el || !from.current || typeof el.animate !== 'function') return;
    el.animate([{ transform: lift ? 'perspective(1600px) translate(0px, 0px) scale(1) rotateX(0deg)' : 'none', opacity: 1 }, { opacity: 1, offset: 0.6 }, from.current], {
      duration: 380,
      easing: 'cubic-bezier(0.55, 0, 0.75, 0.2)',
      fill: 'forwards',
    });
  }, [leaving, lift, ref]);
  return leaving;
}

function Header({ code, title, kicker, actions, onClose }: Omit<ShellProps, 'children'> & { onClose: () => void }) {
  return (
    <header className="panel__head">
      <div className="panel__titles">
        {(code || kicker) && (
          <span className="panel__kicker">
            {code && <span className="nameplate">{code}</span>}
            {kicker && <span className="t-label">{kicker}</span>}
          </span>
        )}
        <h2>{title}</h2>
      </div>
      <div className="panel__actions">{actions}</div>
      <button className="panel__close" onClick={onClose} aria-label="Put it back" title="Put it back (Esc)">
        <Icon name="close" size={16} />
      </button>
    </header>
  );
}

export function Sheet({ code: codeProp, title, kicker, children, actions, onClose = back, className = '', style, bleed, dark }: ShellProps & { width?: number }) {
  useEsc(onClose);
  const code = useEngraved(codeProp);
  const vp = useViewport();
  const focus = useUI((s) => s.focus);
  const side = useUI((s) => s.sheetSide);
  const compact = isCompact(vp.w);
  const frame = focus && FOCUS[focus] ? focusFrame(focus, 'sheet', side, vp.w, vp.h) : null;
  const k = cardMetrics(vp.w, vp.h);
  const card = frame?.card ?? { x: compact ? k.m : vp.w - k.m - k.w, w: k.w, maxH: k.maxH, top: k.top, bottom: vp.h - k.m };
  const ref = useRef<HTMLElement>(null);

  // rest the card level with the object (centred on it, kept on screen)
  const [h, setH] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setH(el.offsetHeight);
    const ro = new ResizeObserver(() => setH(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const cy = frame ? frame.obj.y + frame.obj.h / 2 : vp.h / 2;
  const pos: CSSProperties = compact
    ? { left: card.x, width: card.w, bottom: vp.h - card.bottom, maxHeight: card.maxH }
    : { left: card.x, width: card.w, top: Math.round(Math.max(card.top, Math.min(card.bottom - h, cy - h / 2))), maxHeight: card.maxH };

  const leaving = useEmerge(ref, frame?.obj ?? null, false, h > 0);
  // once it has landed, let the card glide when its content changes height
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSettled(true), 800);
    return () => clearTimeout(t);
  }, []);
  return (
    <aside
      ref={ref}
      className={`panel panel--card panel--${compact ? 'below' : side} ${dark ? 'panel--dark' : ''} ${settled ? 'is-settled' : ''} ${leaving ? 'is-leaving' : ''} ${className}`}
      style={{ ...pos, ...style }}
      data-station={focus ?? undefined}
      role="dialog"
      aria-label={title}
    >
      <Screws />
      <Header code={code} title={title} kicker={kicker} actions={actions} onClose={onClose} />
      <div className={`panel__body scroll ${bleed ? 'panel__body--bleed' : ''}`}>{children}</div>
    </aside>
  );
}

export function Stage({ code: codeProp, title, kicker, children, actions, onClose = back, className = '', style, bleed, dark }: ShellProps) {
  useEsc(onClose);
  const code = useEngraved(codeProp);
  const vp = useViewport();
  const focus = useUI((s) => s.focus);
  const frame = focus && FOCUS[focus] ? focusFrame(focus, 'stage', 'right', vp.w, vp.h, false) : null;
  const ref = useRef<HTMLElement>(null);
  const leaving = useEmerge(ref, frame?.obj ?? null, true);
  return (
    <div className={`stage-wrap ${leaving ? 'is-leaving' : ''}`} onPointerDown={(e) => e.target === e.currentTarget && !leaving && onClose()}>
      <section
        ref={ref}
        className={`panel panel--stage surface ${dark ? 'panel--dark' : ''} ${className}`}
        style={style}
        data-station={focus ?? undefined}
        role="dialog"
        aria-label={title}
      >
        {/* jewel-case hinge on the left edge, chrome standoffs in the corners */}
        <span className="panel__hinge" aria-hidden />
        <Screws />
        <Header code={code} title={title} kicker={kicker} actions={actions} onClose={onClose} />
        <div className={`panel__body scroll ${bleed ? 'panel__body--bleed' : ''}`}>{children}</div>
        {/* the bezel: printed spec line */}
        <footer className="panel__foot" aria-hidden>
          <span className="t-spec">adelia.cc{code ? ` / ${code}` : ''}</span>
          <span className="ruler" />
          <span className="t-spec">{REV} · Bekasi</span>
        </footer>
      </section>
    </div>
  );
}

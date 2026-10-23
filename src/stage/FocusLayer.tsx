/* ==========================================================================
   Depth of field for close-ups. While a panel is open the room falls softly
   out of focus and darkens toward the edges; the object you are looking at
   stays sharp (a soft hole in the blur). Clicking the room steps back.
   ========================================================================== */
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useUI } from '@/state/ui';
import { focusFrame, layoutOf, type Layout } from './frame';

export function FocusLayer({ onBack }: { onBack: () => void }) {
  const focus = useUI((s) => s.focus);
  const panel = useUI((s) => s.panel);
  const pending = useUI((s) => s.pendingPanel);
  const side = useUI((s) => s.sheetSide);
  const low = useUI((s) => s.quality === 'low');
  const [vp, setVp] = useState({ w: window.innerWidth, h: window.innerHeight });
  useEffect(() => {
    const on = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);

  // keep the last geometry so the blur fades out where it was
  const last = useRef<{ style: CSSProperties; layout: Layout }>({ style: {}, layout: 'none' });
  const on = !!(focus && panel);
  if (focus && panel) {
    const layout = layoutOf(panel, pending, focus);
    const { obj } = focusFrame(focus, layout, side, vp.w, vp.h, layout === 'stage');
    const hole = layout === 'sheet';
    last.current = {
      layout,
      style: {
        '--cx': `${Math.round(hole ? obj.x + obj.w / 2 : vp.w / 2)}px`,
        '--cy': `${Math.round(hole ? obj.y + obj.h / 2 : vp.h / 2)}px`,
        '--rx': `${Math.round(hole ? obj.w * 0.6 : vp.w * 0.62)}px`,
        '--ry': `${Math.round(hole ? obj.h * 0.6 : vp.h * 0.62)}px`,
      } as CSSProperties,
    };
  }
  const { style, layout } = last.current;
  return (
    <div className={`focus-layer focus-layer--${layout} ${on ? 'is-on' : ''} ${low ? 'is-low' : ''}`} style={style} onClick={on ? onBack : undefined} aria-hidden>
      <div className="focus-layer__blur" />
      <div className="focus-layer__shade" />
    </div>
  );
}

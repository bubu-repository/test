/* A draggable, focusable, minimisable Adelia OS window: frosted acrylic
   body, polished chrome title bar, three small keycaps. */
import { memo, useRef, type PointerEvent as RPointerEvent } from 'react';
import { sfx } from '@/audio/engine';
import { os, type Win } from './wm';
import { APPS } from './apps';

type Drag = { kind: 'move' | 'size'; sx: number; sy: number; ox: number; oy: number } | null;

function WindowImpl({ win, active, compact }: { win: Win; active: boolean; compact: boolean }) {
  const app = APPS[win.id];
  const drag = useRef<Drag>(null);
  const full = compact || win.max;
  const titleId = `os-win-${win.id}-title`;

  const start = (kind: 'move' | 'size') => (e: RPointerEvent<HTMLElement>) => {
    if (full && kind === 'move') return;
    if (e.button !== 0) return;
    if (kind === 'move' && (e.target as HTMLElement).closest('button')) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { kind, sx: e.clientX, sy: e.clientY, ox: kind === 'move' ? win.x : win.w, oy: kind === 'move' ? win.y : win.h };
    e.currentTarget.classList.add('is-grabbing');
  };
  const moveTo = (e: RPointerEvent<HTMLElement>) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.sx;
    const dy = e.clientY - d.sy;
    if (d.kind === 'move') os().move(win.id, d.ox + dx, d.oy + dy);
    else os().resize(win.id, d.ox + dx, d.oy + dy);
  };
  const end = (e: RPointerEvent<HTMLElement>) => {
    if (!drag.current) return;
    drag.current = null;
    e.currentTarget.classList.remove('is-grabbing');
    sfx('tick', { gain: 0.5 });
  };

  const style = full ? { zIndex: win.z } : { zIndex: win.z, left: win.x, top: win.y, width: win.w, height: win.h };

  return (
    <section
      className={`os-win ${active ? 'is-active' : ''} ${win.min ? 'is-min' : ''} ${win.closing ? 'is-closing' : ''} ${full ? 'is-full' : ''} ${app.dark ? 'os-win--dark' : ''}`}
      style={style}
      role="dialog"
      aria-labelledby={titleId}
      aria-hidden={win.min || undefined}
      inert={win.min ? true : undefined}
      onPointerDownCapture={() => os().focus(win.id)}
      onFocusCapture={() => !active && os().focus(win.id)}
    >
      <header
        className="os-win__bar"
        onPointerDown={start('move')}
        onPointerMove={moveTo}
        onPointerUp={end}
        onPointerCancel={end}
        onDoubleClick={(e) => {
          if (compact || app.fixed || (e.target as HTMLElement).closest('button')) return;
          os().toggleMax(win.id);
        }}
      >
        <span className="os-win__keys">
          <button className="os-win__btn os-win__close" aria-label={`Close ${app.label}`} title="Close" onClick={() => os().close(win.id)}>
            <i />
          </button>
          <button className="os-win__btn os-win__min" aria-label={`Minimise ${app.label}`} title="Minimise" onClick={() => os().minimize(win.id)}>
            <i />
          </button>
          {!compact && !app.fixed && (
            <button className="os-win__btn os-win__max" aria-label={`${win.max ? 'Restore' : 'Zoom'} ${app.label}`} title={win.max ? 'Restore' : 'Zoom'} onClick={() => os().toggleMax(win.id)}>
              <i />
            </button>
          )}
        </span>
        <span className="os-win__title" id={titleId}>
          <i className="os-win__led" aria-hidden />
          <span>{app.title}</span>
        </span>
        <span className="os-win__spacer" aria-hidden />
      </header>
      <div className="os-win__body">
        <app.C {...win.props} active={active && !win.min} />
      </div>
      {!full && !app.fixed && <i className="os-win__grip" onPointerDown={start('size')} onPointerMove={moveTo} onPointerUp={end} onPointerCancel={end} aria-hidden />}
    </section>
  );
}

export const Window = memo(WindowImpl);

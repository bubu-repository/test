import { useEffect, useId, useRef, useState } from 'react';
import { ALL_OBJECTS, ESSENTIALS, get, openOverlay, set, useApp, type ObjectId } from '@/state';
import { projects } from '@/content/site';
import { Ring, useCountUp } from '@/ui/Ring';
import './runs.css';

/**
 * The room HUD's visit ring. It counts down the objects left to open, like the lesson ring counts
 * down what is left to CLEAR (gak 08, 09). Tap it for the rules. It also fires the two visit
 * stamps, once each, only when nothing else is open (docs/concept.md, Visit run). Nobody is graded.
 */

const NAMES: Record<ObjectId, string> = {
  figure: 'Her stand',
  phone: 'The phone',
  'frame-p1': `Frame: ${projects[0].run}`,
  'frame-p2': `Frame: ${projects[1].run}`,
  'frame-p3': `Frame: ${projects[2].run}`,
  desk: 'The desk',
  today: 'The today board',
  window: 'The window',
  mirror: 'The mirror',
  shelf: 'The album',
  sofa: 'The sofa',
  keycap: 'The keycap',
};
/** The easter egg keeps its secret until it is found. */
const HIDDEN: ObjectId[] = ['keycap'];

/** A short beat after the last panel closes, so the stamp never lands on top of a closing sheet. */
const STAMP_DELAY = 400;

export function VisitRing() {
  const found = useApp((s) => s.found);
  const stamped = useApp((s) => s.stamped);
  const busy = useApp((s) => s.overlays.length > 0);
  const screen = useApp((s) => s.screen);
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const popId = useId();

  const total = ALL_OBJECTS.length;
  const foundN = ALL_OBJECTS.filter((o) => found.includes(o)).length;
  const left = total - foundN;
  const shown = useCountUp(left, left);
  const essentialsN = ESSENTIALS.filter((o) => found.includes(o)).length;

  // Fire CLEAR, then PERFECT, each once, and only when the room is clear of panels.
  useEffect(() => {
    if (busy || screen !== 'room') return;
    const all = (ids: ObjectId[]) => ids.every((o) => found.includes(o));
    const tier = all(ESSENTIALS) && !stamped.includes('clear') ? 'clear' : all(ALL_OBJECTS) && !stamped.includes('perfect') ? 'perfect' : null;
    if (!tier) return;
    const t = setTimeout(() => {
      const s = get();
      if (s.overlays.length || s.screen !== 'room' || s.stamped.includes(tier)) return;
      setOpen(false);
      set({ stamped: [...s.stamped, tier] });
      openOverlay({ kind: 'visit', tier });
    }, STAMP_DELAY);
    return () => clearTimeout(t);
  }, [found, stamped, busy, screen]);

  // A panel opening closes the rules. Esc and a tap outside close them too.
  useEffect(() => {
    if (busy) setOpen(false);
  }, [busy]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault(); // the app's Esc handler skips prevented events
      setOpen(false);
      wrap.current?.querySelector<HTMLButtonElement>('.visit-btn')?.focus();
    };
    const onDown = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [open]);

  const rows = (ids: ObjectId[]) =>
    ids.map((o) => {
      const got = found.includes(o);
      const name = !got && HIDDEN.includes(o) ? 'Hidden' : NAMES[o];
      return (
        <li key={o} data-found={got || undefined}>
          <span className="visit-dot" aria-hidden="true" />
          {name}
          <span className="sr-only">{got ? ', opened' : ', not opened yet'}</span>
        </li>
      );
    });

  return (
    <div className="visit" ref={wrap}>
      <button
        className="visit-btn liquid"
        aria-expanded={open}
        aria-controls={popId}
        aria-label={`${left} of ${total} objects left. Show the visit rules`}
        onClick={() => setOpen((v) => !v)}
      >
        <Ring value={foundN} max={total} size={34} stroke={3}>
          <span className="visit-num" aria-hidden="true">
            {shown}
          </span>
        </Ring>
        <span className="label visit-label" aria-hidden="true">
          {left === 0 ? 'all opened' : 'objects left'}
        </span>
      </button>
      <span className="sr-only" aria-live="polite">
        {left === total ? '' : `${left} objects left`}
      </span>

      {open && (
        <div className="visit-pop" id={popId}>
          <p className="label">Your visit</p>
          <p className="visit-pop-lead">This counts what you have opened in the room. Nobody gets a grade.</p>
          <section className="visit-tier" data-done={essentialsN === ESSENTIALS.length || undefined}>
            <h3 className="visit-tier-head">
              <span>Clear</span>
              <span className="visit-tier-count">
                {essentialsN} of {ESSENTIALS.length}
              </span>
            </h3>
            <p className="visit-tier-rule">The essentials: the three runs, the desk and the today board.</p>
            <ul className="visit-list">{rows(ESSENTIALS)}</ul>
          </section>
          <section className="visit-tier" data-done={left === 0 || undefined}>
            <h3 className="visit-tier-head">
              <span>Perfect</span>
              <span className="visit-tier-count">
                {foundN} of {total}
              </span>
            </h3>
            <p className="visit-tier-rule">Everything in the room, one hidden.</p>
            <ul className="visit-list" data-cols>
              {rows(ALL_OBJECTS.filter((o) => !ESSENTIALS.includes(o)))}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}

import { useEffect, useId, useRef, useState } from 'react';
import { ALL_OBJECTS, ESSENTIALS, closeTop, reducedMotion } from '@/state';
import { person } from '@/content/site';
import { formatClock } from '@/lib/time';
import { useFocusTrap } from '@/ui/Sheet';
import './runs.css';

/**
 * The visit stamp: CLEAR or PERFECT for the visitor's exploration (docs/concept.md, Visit run).
 * Order from the game's rank reveal (gak 20, measured at 30 fps): a short empty beat, the word drops
 * from 2.5x to 1x in about 100 ms with no overshoot, one hairline ripple, then the result. Here the
 * result is a clear acrylic card of Adelia with the one orange action. No letters, no rays, no gold.
 * A tap during the drop skips to the end; Esc, a tap outside the card or "Keep looking" closes.
 */

/** When the last piece has landed: rise delay (beat x2 + drop = 600) + rise (250), rounded up. */
const SETTLED_MS = 900;

export default function VisitStamp({ tier }: { tier: 'clear' | 'perfect' }) {
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();
  const [done, setDone] = useState(() => reducedMotion());
  const [clock, setClock] = useState(() => formatClock(person.timeZone));
  useFocusTrap(ref);

  useEffect(() => {
    if (done) return;
    const t = setTimeout(() => setDone(true), SETTLED_MS);
    return () => clearTimeout(t);
  }, [done]);

  useEffect(() => {
    const t = setInterval(() => setClock(formatClock(person.timeZone)), 30_000);
    return () => clearInterval(t);
  }, []);

  const word = tier === 'clear' ? 'Clear' : 'Perfect';
  const count = tier === 'clear' ? `${ESSENTIALS.length} of ${ESSENTIALS.length} essentials` : `${ALL_OBJECTS.length} of ${ALL_OBJECTS.length} objects`;
  const line =
    tier === 'clear'
      ? 'You found the essentials: the three runs, the desk and the today board.'
      : `You opened all ${ALL_OBJECTS.length} objects in the room, the hidden one too.`;

  return (
    <div
      className="stamp-scrim"
      data-done={done || undefined}
      onPointerDown={(e) => {
        if (!done) setDone(true);
        else if (e.target === e.currentTarget) closeTop();
      }}
    >
      <div
        ref={ref}
        className="stamp"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-w`}
        aria-describedby={`${id}-l`}
        tabIndex={-1}
        data-autofocus
      >
        <p className="label stamp-kicker">Your visit · {count}</p>
        <div className="stamp-word-box">
          <span className="stamp-ripple" aria-hidden="true" />
          <h2 className="stamp-word" id={`${id}-w`}>
            {word}
          </h2>
        </div>
        <p className="stamp-line" id={`${id}-l`}>
          {line}
        </p>
        <p className="stamp-note">Nothing here is graded. It only counts what you opened.</p>

        <article className="stamp-card" aria-label={`${person.name}, contact card`}>
          <p className="stamp-name">{person.name}</p>
          <p className="stamp-role">{person.role}</p>
          <p className="chip stamp-status">
            <span className="chip-dot" aria-hidden="true" />
            {person.status}
          </p>
          <p className="stamp-where">
            {person.city}, {person.country} · {person.timeZoneLabel} · <span className="stamp-clock">{clock}</span> there now
          </p>
          <div className="stamp-actions">
            <a className="btn btn-commit" href={`mailto:${person.email}`}>
              Email {person.firstName}
            </a>
            <button className="btn btn-ghost" onClick={() => closeTop()}>
              {tier === 'clear' ? 'Keep looking' : 'Back to the room'}
            </button>
          </div>
        </article>
      </div>
    </div>
  );
}

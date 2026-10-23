/* Archive — her path (TIMELINE) as year folders, each holding a note,
   on a true-to-scale line from her first year (2022) to now. */
import { useEffect, useState } from 'react';
import { TIMELINE } from '@/lib/content';
import { sfx } from '@/audio/engine';
import { FolderGlyph } from '../icons';

const FIRST = TIMELINE[0].year;
const LAST = Math.max(...TIMELINE.map((t) => t.year));
const SPAN = Math.max(1, LAST - FIRST);
const YEARS = Array.from({ length: LAST - FIRST + 1 }, (_, i) => FIRST + i);
const at = (y: number) => `${((y - FIRST) / SPAN) * 100}%`;
const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];

export default function Archive({ year: initial }: { year?: number }) {
  const [year, setYear] = useState<number | null>(initial ?? null);
  useEffect(() => {
    if (initial) setYear(initial);
  }, [initial]);
  const i = TIMELINE.findIndex((t) => t.year === year);
  const item = i >= 0 ? TIMELINE[i] : null;

  const pick = (y: number) => {
    sfx('click');
    setYear(y);
  };
  const step = (d: number) => {
    const n = (Math.max(0, i) + d + TIMELINE.length) % TIMELINE.length;
    sfx('tick');
    setYear(TIMELINE[n].year);
  };

  return (
    <div className="os-arch">
      <div className="os-toolbar">
        <span className="os-path">
          <button onClick={() => (sfx('back'), setYear(null))}>Archive</button>
          {item && (
            <>
              <i>›</i>
              <span>{item.year}</span>
              <i>›</i>
              <span>note.txt</span>
            </>
          )}
        </span>
        <span className="os-toolbar__meta">
          {TIMELINE.length} folders · {FIRST} → {LAST}
        </span>
      </div>
      <div className={`os-arch__body ${item ? 'has-note' : ''}`}>
        <ul className="os-arch__grid scroll" aria-label="Years">
          {TIMELINE.map((t) => (
            <li key={t.year}>
              <button className={`os-arch__folder ${t.year === year ? 'is-on' : ''}`} aria-pressed={t.year === year} aria-label={`${t.year}: ${t.title}`} onClick={() => pick(t.year)}>
                <FolderGlyph size={46} open={t.year === year} label={String(t.year).slice(2)} />
                <span>{t.year}</span>
              </button>
            </li>
          ))}
        </ul>
        {item ? (
          <article className="os-arch__note" key={item.year} aria-live="polite">
            <header>
              <span className="t-label">note.txt · {item.year}</span>
              <span className="os-arch__nav">
                <button aria-label="Previous year" onClick={() => step(-1)}>
                  ‹
                </button>
                <button aria-label="Next year" onClick={() => step(1)}>
                  ›
                </button>
              </span>
            </header>
            <p className="os-arch__year t-dot">{item.year}</p>
            <h3>{item.title}</h3>
            <p>{item.body}</p>
            <div className="os-arch__line" aria-hidden>
              {YEARS.map((y) => {
                const has = TIMELINE.some((t) => t.year === y);
                return <i key={y} className={`${has ? '' : 'is-gap'} ${has && y <= item.year ? 'is-on' : ''} ${y === item.year ? 'is-here' : ''}`} style={{ left: at(y) }} />;
              })}
            </div>
            <p className="os-arch__span t-label">
              <span>{FIRST}</span>
              <span>{item.year === FIRST ? 'Year 1 · day one' : `Year ${item.year - FIRST + 1} of ${LAST - FIRST + 1}`}</span>
              <span>{LAST}</span>
            </p>
          </article>
        ) : (
          <div className="os-arch__empty">
            <p className="t-dot">{TIMELINE.length}</p>
            <p>
              Her path, {FIRST} to {LAST}, in {WORDS[TIMELINE.length] ?? TIMELINE.length} folders. Open one.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

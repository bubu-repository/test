/* Case Files — her four case studies as files: the question each answers,
   the key numbers, her role, and a door to the full case on the Wall of Work. */
import { useEffect, useRef, useState, type KeyboardEvent as RKeyboardEvent } from 'react';
import { WORK, type Work } from '@/lib/content';
import { sfx } from '@/audio/engine';
import { track } from '@/lib/api';
import { focus } from '@/stage/director';
import { Icon } from '@/ui/Icon';
import { FileGlyph } from '../icons';

export default function Cases({ id: initial, work }: { id?: string; work?: string }) {
  const start = initial ?? work;
  const [id, setId] = useState<string>(() => (WORK.some((w) => w.id === start) ? start! : WORK[0].id));
  useEffect(() => {
    if (start && WORK.some((w) => w.id === start)) setId(start);
  }, [start]);
  const w = WORK.find((x) => x.id === id) ?? WORK[0];
  const listRef = useRef<HTMLUListElement>(null);
  useEffect(() => {
    listRef.current?.querySelector('.is-on')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [id]);

  const openCase = (x: Work = w, section?: string) => {
    sfx('open');
    track('cta', { from: 'os-cases', to: 'gallery', work: x.id, section: section ?? '' });
    focus('gallery', section ? { work: x.id, section } : { work: x.id });
  };
  const wall = () => {
    sfx('open');
    track('cta', { from: 'os-cases', to: 'gallery' });
    focus('gallery');
  };
  const pick = (next: string) => {
    if (next === id) return;
    sfx('click');
    setId(next);
  };
  const onListKey = (e: RKeyboardEvent<HTMLUListElement>) => {
    const keys = ['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft', 'Home', 'End'];
    if (!keys.includes(e.key)) return;
    e.preventDefault();
    const i = WORK.findIndex((x) => x.id === id);
    const n = e.key === 'Home' ? 0 : e.key === 'End' ? WORK.length - 1 : (i + (e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : -1) + WORK.length) % WORK.length;
    pick(WORK[n].id);
    requestAnimationFrame(() => listRef.current?.querySelectorAll<HTMLElement>('[role="option"]')[n]?.focus());
  };

  const years = WORK.map((x) => Number(x.year)).filter(Boolean);

  return (
    <div className="os-cases">
      <div className="os-toolbar">
        <span className="os-path">
          <span>Case Files</span>
          <i>›</i>
          <span>{w.id}.case</span>
        </span>
        <span className="os-toolbar__meta os-hide-narrow">
          {WORK.length} cases · {Math.min(...years)} → {Math.max(...years)}
        </span>
        <button className="btn btn--sm btn--ghost os-cases__wall" onClick={wall}>
          Wall of Work <Icon name="arrow-up-right" size={13} />
        </button>
      </div>
      <div className="os-cases__body">
        <ul className="os-cases__list scroll" role="listbox" aria-label="Case studies" aria-orientation="vertical" ref={listRef} onKeyDown={onListKey}>
          {WORK.map((x) => (
            <li key={x.id}>
              <button role="option" aria-selected={x.id === id} tabIndex={x.id === id ? 0 : -1} className={x.id === id ? 'is-on' : ''} onClick={() => pick(x.id)} onDoubleClick={() => openCase(x)}>
                <FileGlyph size={30} ext="CASE" accent={x.id === id} />
                <span>
                  <b>{x.client}</b>
                  <small>
                    {x.year} · {x.sector}
                  </small>
                </span>
              </button>
            </li>
          ))}
        </ul>
        <article className="os-cases__view scroll" key={w.id} aria-label={`${w.client}, ${w.title}`}>
          <div className="os-cases__art">
            <Poster w={w} />
          </div>
          <div className="os-cases__info">
            <p className="t-label">
              {w.client}
              {w.year && ` · ${w.year}`}
            </p>
            <h3>{w.title}</h3>
            <p className="os-cases__q">
              <span className="t-label">The question it answers</span>
              {w.question}
            </p>
            <p className="os-cases__sum">{w.summary}</p>
            <dl className="os-cases__stats lcd" aria-label="Key numbers">
              {w.stats.map((s) => (
                <div key={s.k}>
                  <dt>{s.k}</dt>
                  <dd className="t-dot">{s.v}</dd>
                </div>
              ))}
            </dl>
            <dl className="os-specs os-cases__meta">
              <div>
                <dt>Her role</dt>
                <dd>{w.role}</dd>
              </div>
              <div>
                <dt>When</dt>
                <dd>{w.timeline}</dd>
              </div>
              <div>
                <dt>Context</dt>
                <dd>{w.sector}</dd>
              </div>
            </dl>
            <div className="os-cases__actions">
              <button className="btn btn--primary btn--sm" onClick={() => openCase()}>
                Open the case <Icon name="arrow-right" size={14} />
              </button>
              <button className="btn btn--sm btn--ghost" onClick={() => openCase(w, 'engineering')}>
                How it’s built
              </button>
              <a className="link os-cases__page" href={`/work/${w.id}`} target="_blank" rel="noopener noreferrer" onClick={() => track('cta', { from: 'os-cases', to: 'work-page', work: w.id })}>
                Open as a page ↗
              </a>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}

/** generative poster art from the case's palette + motif */
export function Poster({ w }: { w: Work }) {
  const [a, b, c] = w.palette;
  const m = w.motif;
  return (
    <svg className="os-poster" viewBox="0 0 200 120" role="img" aria-label={`${w.client} case file cover`} preserveAspectRatio="xMidYMid slice">
      <rect width="200" height="120" fill={c} />
      {m === 'rings' && [56, 44, 32, 20, 8].map((r, i) => <circle key={r} cx="140" cy="60" r={r} fill={i % 2 ? c : a} />)}
      {m === 'dots' &&
        Array.from({ length: 13 * 7 }, (_, i) => {
          const x = (i % 13) * 15 + 10;
          const y = Math.floor(i / 13) * 15 + 15;
          const on = (x * 3 + y * 7) % 5 < 2;
          return <circle key={i} cx={x} cy={y} r={on ? 4.5 : 2} fill={on ? a : b} opacity={on ? 1 : 0.25} />;
        })}
      {m === 'burst' &&
        Array.from({ length: 28 }, (_, i) => {
          const ang = (i / 28) * Math.PI * 2;
          return <path key={i} d={`M140 60L${140 + Math.cos(ang) * 160} ${60 + Math.sin(ang) * 160}`} stroke={i % 2 ? a : b} strokeWidth={i % 2 ? 6 : 1.5} />;
        })}
      {m === 'wave' &&
        Array.from({ length: 9 }, (_, i) => (
          <path key={i} d={`M0 ${30 + i * 8} C 50 ${10 + i * 8}, 100 ${55 + i * 8}, 200 ${25 + i * 8}`} stroke={i % 3 ? b : a} strokeWidth={i % 3 ? 1.2 : 4} fill="none" />
        ))}
      {m === 'stripes' &&
        Array.from({ length: 16 }, (_, i) => <path key={i} d={`M${i * 18 - 40} 120L${i * 18 + 40} 0`} stroke={i % 4 === 0 ? a : b} strokeWidth={i % 4 === 0 ? 10 : 6} opacity={i % 4 === 0 ? 1 : 0.16} />)}
      {m === 'grid' &&
        Array.from({ length: 10 * 6 }, (_, i) => {
          const x = (i % 10) * 20;
          const y = Math.floor(i / 10) * 20;
          const f = (i * 7) % 9 === 0 ? a : (i * 5) % 11 === 0 ? b : 'none';
          return <rect key={i} x={x + 2} y={y + 2} width="16" height="16" rx="3" fill={f} stroke={b} strokeOpacity={0.18} />;
        })}
      {m === 'bars' &&
        Array.from({ length: 14 }, (_, i) => {
          const h = 20 + ((i * 37) % 80);
          return <rect key={i} x={i * 14 + 4} y={120 - h} width="9" height={h} fill={i % 4 === 1 ? a : b} />;
        })}
      {m === 'orbit' && (
        <>
          <circle cx="130" cy="60" r="44" fill="none" stroke={b} strokeWidth="1.5" />
          <circle cx="130" cy="60" r="28" fill="none" stroke={b} strokeWidth="1" strokeDasharray="3 4" />
          <circle cx="130" cy="60" r="14" fill={a} />
          <circle cx="168" cy="38" r="6" fill={b} />
          <circle cx="104" cy="83" r="3.5" fill={a} />
        </>
      )}
      <rect x="10" y="10" width="68" height="14" rx="2" fill={b} />
      <text x="14" y="20.5" fontSize="7.5" fontFamily="JetBrains Mono, monospace" fontWeight="700" fill="#fff" letterSpacing="0.8">
        {w.id.toUpperCase().slice(0, 10)}
      </text>
      <text x="10" y="110" fontSize="6" fontFamily="JetBrains Mono, monospace" fill={b} letterSpacing="1">
        ADELIA · CASE FILE · {w.year}
      </text>
    </svg>
  );
}

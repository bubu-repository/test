/* ==========================================================================
   RM-08 · The sticker book — the binder on her desk (also opened from the
   gingham board). The 23 achievements as die-cut holo stickers in clear
   sleeves on a binder page with chrome rings: silhouettes + hints while
   locked, progress for the multi-step ones, "Show me" (walks to the object
   that unlocks it), "New" marks since the book was last opened, and the
   medal the collection has earned (Silver → Prism).
   ========================================================================== */
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { Sheet } from '@/ui/Panel';
import { Icon } from '@/ui/Icon';
import { useGame } from '@/state/game';
import { useUI } from '@/state/ui';
import { ACHIEVEMENTS, ACHIEVEMENT_MAP, type Achievement, type AchievementId } from '@/state/achievements';
import { focus } from '@/stage/director';
import { sfx } from '@/audio/engine';
import { track } from '@/lib/api';
import { Sticker } from './Sticker';
import { Medal } from './Medal';
import { medalFor, medalMarks, nextMedal } from './medals';
import { artOf, progressOf, showMe, stickerNo } from './stickers';
import { dotDate, reducedMotion, useCountUp } from './lib';
import './achievements.css';

type Filter = 'all' | 'have' | 'missing';

export default function AchievementsPanel() {
  const got = useGame((s) => s.achievements);
  const stats = useGame((s) => s.stats);
  const stamps = useGame((s) => s.stamps);
  const manifesto = useGame((s) => s.manifesto);
  const view = { stats, stamps, manifesto, achievements: got };

  // what was new when the book opened stays marked until it closes
  const [seenAt] = useState(() => useGame.getState().bookSeenAt);
  useEffect(() => {
    useGame.getState().markBookSeen();
    track('stickers', { action: 'open' });
  }, []);

  const total = ACHIEVEMENTS.length;
  const mine = ACHIEVEMENTS.filter((a) => got[a.id]);
  const n = mine.length;
  const shown = useCountUp(n, 900);
  const hearts = mine.reduce((s, a) => s + a.points, 0);
  const possible = ACHIEVEMENTS.reduce((s, a) => s + a.points, 0);
  const medal = medalFor(n, total);
  const next = nextMedal(n, total);
  const isNew = (id: AchievementId) => (got[id] ?? 0) > seenAt;

  const [sel, setSel] = useState<AchievementId>(() => {
    const newest = [...mine].sort((a, b) => (got[b.id] ?? 0) - (got[a.id] ?? 0))[0];
    if (newest && isNew(newest.id)) return newest.id;
    return ACHIEVEMENTS.find((a) => !a.secret && !got[a.id])?.id ?? newest?.id ?? 'first-step';
  });
  const [filter, setFilter] = useState<Filter>('all');
  const loupeRef = useRef<HTMLDivElement>(null);

  const list = ACHIEVEMENTS.filter((a) => (filter === 'all' ? true : filter === 'have' ? !!got[a.id] : !got[a.id]));

  const pick = (a: Achievement) => {
    setSel(a.id);
    sfx(got[a.id] ? 'pop' : 'tick');
    const el = loupeRef.current;
    if (el && el.getBoundingClientRect().top < 60) el.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
  };

  const go = (a: Achievement) => {
    const to = showMe(a.id, view);
    if (!to) return;
    track('stickers', { action: 'show_me', id: a.id, station: to.station });
    focus(to.station, to.props ?? {});
  };

  const a = ACHIEVEMENT_MAP[sel];
  const on = !!got[a.id];
  const secret = !!a.secret && !on;
  const prog = on ? null : progressOf(a.id, view);
  const route = on ? null : showMe(a.id, view);
  const openPanel = useUI.getState().openPanel;

  // the loupe tilts and its foil follows the pointer
  const tilt = (e: PointerEvent<HTMLDivElement>) => {
    if (reducedMotion() || e.pointerType === 'touch') return;
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty('--rx', `${(-y * 18).toFixed(1)}deg`);
    el.style.setProperty('--ry', `${(x * 22).toFixed(1)}deg`);
    el.style.setProperty('--hx', (x * -90).toFixed(1));
    el.style.setProperty('--hy', (y * 40).toFixed(1));
  };
  const untilt = (e: PointerEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    el.style.setProperty('--rx', '0deg');
    el.style.setProperty('--ry', '0deg');
  };

  return (
    <Sheet
      code="RM-08"
      kicker={`Sticker book · ${n}/${total}`}
      title="Her sticker book"
      className="sb-sheet"
      actions={
        <button className="btn btn--sm" onClick={() => (sfx('open'), openPanel('pass'))} aria-label="Open your Guest Pass">
          <Icon name="card" size={15} /> Pass
        </button>
      }
    >
      {/* ------------------------------------------------ medal + progress */}
      <section className="sb-medal" aria-label="Your collection">
        <Medal count={n} total={total} tier={medal} size={58} />
        <div className="sb-medal__text">
          <div className="sb-medal__row">
            <b>{medal ? `${medal.name} medal` : 'No medal yet'}</b>
            <span className="t-mono sb-medal__count">
              <span className="t-dot">{String(shown).padStart(2, '0')}</span>/{total}
            </span>
          </div>
          <div
            className="sb-bar"
            role="progressbar"
            aria-label="Stickers collected"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={n}
            aria-valuetext={`${n} of ${total}${medal ? `, ${medal.name} medal` : ''}`}
          >
            <span className="sb-bar__fill" style={{ width: `${(n / total) * 100}%` }} />
            {medalMarks(total).map((m) => (
              <span key={m.id} className={`sb-bar__tick ${n >= m.n ? 'is-passed' : ''}`} style={{ left: `${m.at * 100}%` }} title={`${m.name} at ${m.n}`} />
            ))}
          </div>
          <p className="sb-medal__next">
            <span>
              {next ? (
                <>
                  {next.need} more for <b>{next.medal.name}</b>
                </>
              ) : (
                'The whole set. Thank you for looking around.'
              )}
            </span>
            <span className="t-label sb-medal__hearts" aria-label={`${hearts} of ${possible} hearts from stickers`}>
              <span className="t-heart">{hearts.toLocaleString('en-US')}</span> / {possible.toLocaleString('en-US')}
            </span>
          </p>
        </div>
      </section>

      {/* ------------------------------------------------ the loupe */}
      <div ref={loupeRef} className={`sb-loupe ${on ? 'is-on' : ''}`} aria-live="polite">
        <div className="sb-loupe__stage" onPointerMove={tilt} onPointerLeave={untilt}>
          <span className="sb-loupe__tilt">
            <Sticker key={a.id} art={artOf(a.id)} size={112} locked={!on} mystery={secret} holo={on} className={`sb-loupe__stk ${on ? 'stk--live' : ''}`} />
          </span>
        </div>
        <div className="sb-loupe__text">
          <span className="t-label">
            No. {stickerNo(a.id)} · {on ? `Stuck ${dotDate(got[a.id]!)}` : secret ? 'Secret' : 'Not yet'}
          </span>
          <h3>{secret ? 'A secret' : a.name}</h3>
          <p>{on ? a.body : a.hint}</p>
          {prog && prog.done > 0 && (
            <div className="sb-loupe__prog">
              <span className="sb-mini" aria-hidden>
                <i style={{ width: `${(prog.done / prog.target) * 100}%` }} />
              </span>
              <span className="t-label">
                {prog.done} of {prog.target}
              </span>
            </div>
          )}
          <div className="sb-loupe__foot">
            <span className={`chip ${on ? 'chip--accent' : ''}`}>
              <span className="t-heart">+{a.points}</span>
            </span>
            {route && !secret && (
              <button className="btn btn--sm btn--primary" onClick={() => go(a)}>
                Show me <Icon name="arrow-right" size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------ filter */}
      <div className="sb-filter" role="group" aria-label="Show stickers">
        {(
          [
            ['all', 'All', total],
            ['have', 'Stuck in', n],
            ['missing', 'Missing', total - n],
          ] as const
        ).map(([id, label, count]) => (
          <button key={id} className={filter === id ? 'is-on' : ''} aria-pressed={filter === id} onClick={() => (setFilter(id), sfx('switch'))}>
            {label} <span className="t-mono">{count}</span>
          </button>
        ))}
      </div>

      {/* ------------------------------------------------ the binder page */}
      <div className="sb-page">
        <div className="sb-rings" aria-hidden>
          {Array.from({ length: Math.max(3, Math.ceil(list.length / 6) + 1) }, (_, i) => (
            <i key={i} />
          ))}
        </div>
        {list.length === 0 ? (
          <p className="sb-empty">{filter === 'missing' ? 'Every sleeve is full. That is the whole set.' : 'No stickers yet. Every object in the room hides one.'}</p>
        ) : (
          <ul className="sb-grid" key={filter}>
            {list.map((x, i) => {
              const o = !!got[x.id];
              const h = !!x.secret && !o;
              const fresh = o && isNew(x.id);
              const p = o ? null : progressOf(x.id, view);
              const r = o || h ? null : showMe(x.id, view);
              return (
                <li key={x.id} className={`sb-pocket ${o ? 'is-on' : ''} ${sel === x.id ? 'is-sel' : ''}`} style={{ '--d': `${Math.min(i, 15) * 26}ms` } as CSSProperties}>
                  <button
                    className="sb-pocket__btn"
                    onClick={() => pick(x)}
                    aria-pressed={sel === x.id}
                    aria-label={`${h ? 'A secret sticker' : x.name}, ${o ? `stuck in${fresh ? ', new' : ''}` : 'not yet'}`}
                  >
                    <span className="sb-pocket__no t-mono" aria-hidden>
                      {stickerNo(x.id).slice(0, 2)}
                    </span>
                    {fresh && (
                      <span className="sb-new" aria-hidden>
                        New
                      </span>
                    )}
                    <Sticker art={artOf(x.id)} size={60} locked={!o} mystery={h} holo={o} className="sb-pocket__stk" />
                    <b>{h ? 'A secret' : x.name}</b>
                    <span className="sb-pocket__meta">{o ? dotDate(got[x.id]!) : x.hint}</span>
                    {p && p.done > 0 && (
                      <span className="sb-mini" aria-hidden>
                        <i style={{ width: `${(p.done / p.target) * 100}%` }} />
                      </span>
                    )}
                  </button>
                  {r && (
                    <button className="sb-pocket__go" onClick={() => go(x)}>
                      Show me<span className="sr-only">: {x.name}</span>
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="sb-foot">
        <button className="btn btn--block" onClick={() => (sfx('paper'), openPanel('manifesto'))}>
          <Icon name="notebook" size={16} /> House Rules
        </button>
        <button className="btn btn--block btn--dark" onClick={() => (sfx('open'), openPanel('pass'))}>
          <Icon name="card" size={16} /> Guest Pass
        </button>
      </div>
    </Sheet>
  );
}

/* ==========================================================================
   Her House Rules — five working rules, one collected at each key object
   (gacha machine, newspaper, computer, Moci, window). Styled as her rulebook
   card: a clear acrylic plate on chrome standoffs, a mono spec line, LCD
   rule numbers. Each collected rule is "penned" in word by word, with a
   taped instant photo of the object that gave it. All five → a signed note
   and the way to book a chat.
   ========================================================================== */
import { Fragment, useEffect, useRef, type CSSProperties } from 'react';
import { Sheet } from '@/ui/Panel';
import { Icon } from '@/ui/Icon';
import { useGame } from '@/state/game';
import { useUI } from '@/state/ui';
import { TIERS } from '@/state/achievements';
import { CHAPTERS, type ChapterId } from '@/lib/content';
import { identity } from '@/content/profile';
import { focus } from '@/stage/director';
import { PLATE } from '@/stage/plate';
import type { Station } from '@/stage/stations';
import { sfx } from '@/audio/engine';
import { track } from '@/lib/api';
import { dotDate, jitter, lowerThe, reducedMotion, stationFor } from './lib';
import './manifesto.css';

type Chapter = (typeof CHAPTERS)[number];

/** Instant photos of the objects that give each rule (cut-outs from the room plate). */
const PHOTO: Record<ChapterId, string | null> = {
  toolkit: '/assets/room/cut/gacha.webp',
  proof: '/assets/room/cut/newspaper.webp',
  build: '/assets/room/cut/monitor.webp',
  play: '/assets/room/cut/moci.webp',
  hello: null, // a crop of the window in the room plate
};

const WORD_MS = 75;
const WORD_MS_NEW = 150;

function Padlock({ open }: { open: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6 11h12v9H6z M12 15v2" />
      <path d={open ? 'M8.5 11V7.5a3.5 3.5 0 0 1 6.8-1.2' : 'M8.5 11V8a3.5 3.5 0 0 1 7 0v3'} />
    </svg>
  );
}

export default function ManifestoPanel({ highlight }: { highlight?: ChapterId }) {
  const written = useGame((s) => s.manifesto);
  const count = CHAPTERS.filter((c) => written[c.id]).length;
  const complete = count === CHAPTERS.length;
  const top = TIERS[TIERS.length - 1];

  useEffect(() => {
    track('house_rules', { action: 'open', count });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // staggered pen-in: earlier rules first, the highlighted (new) one last
  let clock = 250;
  const delays: Partial<Record<ChapterId, number>> = {};
  for (const c of CHAPTERS) {
    if (!written[c.id] || c.id === highlight) continue;
    delays[c.id] = clock;
    clock += 180;
  }
  if (highlight && written[highlight]) delays[highlight] = Math.max(clock, 700);

  return (
    <Sheet code="HR-05" kicker={`House Rules · ${count}/${CHAPTERS.length}`} title="Her House Rules" className="hr-sheet">
      <div className="hr-card">
        <div className="screws" aria-hidden>
          <i />
          <i />
          <i />
          <i />
        </div>
        <header className="hr-head">
          <span className="t-spec hr-spec">
            HR-05 · REV 26 · {CHAPTERS.length} RULES · {identity.domain.toUpperCase()}
          </span>
          <h3 className="t-title hr-title">House Rules</h3>
          <p className="hr-intro">Five rules she works by. Each one is hidden at a key object in the room: find it and the rule is yours.</p>
          <div className="hr-meter" role="img" aria-label={`${count} of ${CHAPTERS.length} rules collected`}>
            {CHAPTERS.map((c) => (
              <i key={c.id} className={written[c.id] ? 'is-on' : ''} />
            ))}
            <span className={`hr-meter__lock ${complete ? 'is-open' : ''}`}>
              <Padlock open={complete} /> {count}/{CHAPTERS.length}
            </span>
          </div>
        </header>

        <ol className="hr-rules">
          {CHAPTERS.map((c, i) => (
            <Rule key={c.id} c={c} i={i} at={written[c.id]} isNew={c.id === highlight} delay={delays[c.id] ?? 0} />
          ))}
        </ol>

        {complete ? (
          <section className="hr-special" aria-label="All five rules collected">
            <span className="hr-special__tag t-label">
              <Icon name="heart" size={13} /> All five, collected
            </span>
            <p className="hr-special__note">
              Thank you for walking the whole room. These five are how I work on a team, from the first interview to the shipped code. If they sound like your team, I’d love to hear about it.
            </p>
            <div className="hr-sign">
              <svg viewBox="0 0 220 64" aria-hidden>
                <path
                  pathLength={1}
                  d="M10 46 C 20 18, 30 10, 34 22 C 38 34, 30 46, 22 44 C 14 42, 22 28, 40 30 C 50 31, 52 44, 58 40 C 64 36, 64 22, 70 26 C 74 30, 70 44, 78 42 C 86 40, 88 30, 92 34 C 96 40, 100 42, 108 36 C 114 30, 116 20, 112 18 C 108 16, 106 40, 116 42 C 124 44, 130 32, 134 34 C 138 36, 136 44, 144 42 C 152 40, 156 30, 162 34 C 168 38, 172 44, 184 38 C 196 32, 204 30, 214 26"
                />
              </svg>
              <span>
                {identity.name} · {identity.city}
              </span>
            </div>
            <div className="hr-perk">
              <span className="hr-perk__dot" style={{ background: top.color }} aria-hidden />
              <div>
                <span className="t-label">{top.name} perk · on the Guest Pass</span>
                <p>{top.perk}</p>
              </div>
            </div>
            <button
              className="btn btn--primary btn--lg btn--block"
              onClick={() => {
                sfx('press');
                track('cta', { from: 'house_rules', to: 'rsvp' });
                useUI.getState().openPanel('rsvp');
              }}
            >
              Book a chat with {identity.firstName} <Icon name="arrow-right" size={16} />
            </button>
          </section>
        ) : (
          <footer className="hr-tease">
            <Padlock open={false} />
            <p>
              Something opens when all five are collected. <b>{CHAPTERS.length - count} to go.</b>
            </p>
          </footer>
        )}
        <p className="hr-colophon t-spec" aria-hidden>
          Laser-cut acrylic · M3 standoffs · {identity.city}
        </p>
      </div>
    </Sheet>
  );
}

function Rule({ c, i, at, isNew, delay }: { c: Chapter; i: number; at?: number; isNew: boolean; delay: number }) {
  const st = stationFor(c.id) as Station;
  const ref = useRef<HTMLLIElement>(null);
  const words = c.line.split(' ');
  const per = isNew ? WORD_MS_NEW : WORD_MS;

  useEffect(() => {
    if (!isNew) return;
    const timers: number[] = [];
    timers.push(window.setTimeout(() => ref.current?.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'center' }), 380));
    if (at && !reducedMotion()) words.forEach((_, k) => timers.push(window.setTimeout(() => sfx('type', { gain: 0.55, pitch: k % 4 }), delay + k * per)));
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rot = (jitter(c.id) * 4 + (i % 2 ? -2.5 : 2.5)).toFixed(1);
  const num = String(c.n).padStart(2, '0');

  if (!at) {
    return (
      <li ref={ref} className="hr-rule is-blank">
        <span className="hr-num readout" aria-hidden>
          {num}
        </span>
        <div className="hr-rule__main">
          <span className="t-label">
            {c.roman} · {c.title}
          </span>
          <div className="hr-ghost" aria-hidden>
            <i style={{ width: '82%' }} />
            <i style={{ width: '48%' }} />
          </div>
          <p className="hr-hint">
            <Padlock open={false} /> Find {lowerThe(st.name)} to collect rule {c.roman}.
          </p>
          <button className="btn btn--sm" onClick={() => focus(st.id)}>
            Take me there <Icon name="arrow-right" size={14} />
          </button>
        </div>
        <figure className="hr-pola is-empty" style={{ '--r': `${rot}deg` } as CSSProperties} aria-hidden>
          <div className="hr-photo">
            <span>?</span>
          </div>
          <figcaption>{st.code}</figcaption>
        </figure>
      </li>
    );
  }

  const done = delay + words.length * per;
  return (
    <li ref={ref} className={`hr-rule is-written ${isNew ? 'is-new' : ''}`} style={{ '--d': `${delay}ms`, '--w': `${per}ms`, '--done': `${done}ms` } as CSSProperties}>
      <span className="hr-num readout readout--pink" aria-hidden>
        {num}
      </span>
      <div className="hr-rule__main">
        <span className="t-label">
          {c.roman} · {c.title}
          {isNew && <span className="hr-new">New</span>}
        </span>
        <p className="hr-line" aria-label={c.line}>
          {words.map((w, k) => (
            <Fragment key={k}>
              <span className="hr-w" style={{ '--k': k } as CSSProperties} aria-hidden>
                {w}
              </span>{' '}
            </Fragment>
          ))}
        </p>
        <p className="hr-body">{c.body}</p>
        <span className="t-spec hr-date">
          {st.code} · {st.name.replace(/^The /, '')} · {dotDate(at)}
        </span>
      </div>
      <figure className="hr-pola" style={{ '--r': `${rot}deg` } as CSSProperties}>
        <span className="hr-tape" aria-hidden />
        <div className={`hr-photo hr-photo--${c.id}`}>
          {PHOTO[c.id] ? (
            <img src={PHOTO[c.id]!} alt="" loading="lazy" draggable={false} />
          ) : (
            <span className="hr-window" style={{ backgroundImage: `url(${PLATE.url(1600)})` }} />
          )}
        </div>
        <figcaption>{st.name.replace(/^The /, '')}</figcaption>
      </figure>
    </li>
  );
}

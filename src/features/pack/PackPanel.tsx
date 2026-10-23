/* ==========================================================================
   RM-15 · Today's pack — the holo booster pack on her desk (ported from the
   old adelia.cc DailyPack). One pack a day per visitor. Drag across the
   strip at the top (or press "Tear it open") to tear it; three cards come
   out face down and you turn them over one by one: something kind, advice
   from the weather in Bekasi right now, and one more: advice, a sticker
   tip, or one of her products as a trading card that opens its case study.
   The first pack always has a product; about one pack in eight has a
   product in holo foil, and the third pack in a row without one always
   does. Every card has a collector number and goes into the binder.
   `?pack=fresh` seals a new pack, `?pack=rare` puts a holo in it.
   ========================================================================== */
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Stage } from '@/ui/Panel';
import { Icon } from '@/ui/Icon';
import { useUI } from '@/state/ui';
import { game, useGame } from '@/state/game';
import { ACHIEVEMENTS, ACHIEVEMENT_MAP, type AchievementId } from '@/state/achievements';
import { ADVICE, KIND_WORDS, weatherCard, type Weather, type WeatherCard } from '@/content/daily';
import { projects } from '@/content/projects';
import { describe, useWeather, type CityWeather } from '@/lib/weather';
import { focus } from '@/stage/director';
import { sfx } from '@/audio/engine';
import { track } from '@/lib/api';
import { Sticker } from '@/features/pass/Sticker';
import { artOf, showMe } from '@/features/pass/stickers';
import { CardBack, TradingCard } from './TradingCard';
import { isUp, packSeed, upCount, usePack } from './store';
import './pack.css';

const OWN = projects.filter((p) => !p.company);
const TIPS = ACHIEVEMENTS.filter((a) => !a.secret);
const WEATHER_KINDS: WeatherCard['kind'][] = ['clear', 'hot', 'cloud', 'rain', 'storm', 'haze', 'night', 'unknown'];
const calm = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const pad2 = (n: number) => String(n).padStart(2, '0');

type Card = { id: string; no: string } & (
  | { kind: 'kind'; text: string }
  | { kind: 'weather'; card: WeatherCard }
  | { kind: 'advice'; text: string }
  | { kind: 'product'; slug: string; foil: boolean }
  | { kind: 'sticker'; sid: AchievementId }
);

const LABEL = { kind: 'Kind words', weather: 'Weather · Bekasi', advice: 'Advice', sticker: 'Sticker tip' } as const;

/** The room's live weather in the shape the card copy expects. */
function toDaily(w: CityWeather): Weather {
  return {
    ok: w.live,
    temperature: w.temp,
    code: w.code,
    isDay: w.isDay,
    humidity: w.humidity,
    cloudCover: null,
    wind: w.wind,
    sunrise: w.sunrise ?? null,
    sunset: w.sunset ?? null,
    fetchedAt: new Date(w.updatedAt).toISOString(),
  };
}
const describeSky = (code: number | null) => {
  const d = describe(code ?? 0);
  return { label: d.label, kind: d.kind === 'cloudy' ? 'cloud' : d.kind === 'drizzle' ? 'rain' : d.kind };
};

/** Hours and minutes until the visitor's midnight, refreshed every half minute. */
function useUntilMidnight() {
  const [left, setLeft] = useState('');
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      const mins = Math.max(1, Math.round((midnight.getTime() - now.getTime()) / 60_000));
      setLeft(mins >= 60 ? `${Math.floor(mins / 60)} h ${mins % 60} min` : `${mins} min`);
    };
    tick();
    const t = window.setInterval(tick, 30_000);
    return () => window.clearInterval(t);
  }, []);
  return left;
}

export default function PackPanel() {
  const s = usePack();
  const weather = useWeather((x) => x.home);
  const got = useGame((x) => x.achievements);
  const left = useUntilMidnight();
  const [tearing, setTearing] = useState(false);
  const [tear, setTear] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [forceRare] = useState(() => new URLSearchParams(location.search).get('pack') === 'rare');
  const drag = useRef<{ start: number; w: number } | null>(null);
  const slots = useRef<(HTMLLIElement | null)[]>([]);
  const listRef = useRef<HTMLOListElement>(null);
  const nextRef = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  useEffect(() => {
    usePack.getState().hydrate();
    track('pack', { action: 'view' });
  }, []);

  const seed = packSeed(s);
  // decided while the pack is sealed, and kept with it once it's open (opening changes the counts)
  const first = s.opened ? s.first : s.collected === 0;
  const foil = s.opened ? s.holo : forceRare || (seed >>> 11) % 8 === 0 || s.sinceHolo >= 2;
  const k = seed % KIND_WORDS.length;
  const a = (seed >>> 5) % ADVICE.length;
  const w = weatherCard(toDaily(weather), describeSky);
  const product = OWN[(seed >>> 3) % OWN.length];
  const tip = TIPS[(seed >>> 7) % TIPS.length];
  const third: Card =
    foil || first
      ? { id: `${foil ? 'h' : 'p'}:${product.slug}`, no: `P${pad2(OWN.indexOf(product) + 1)}/${pad2(OWN.length)}${foil ? ' ★' : ''}`, kind: 'product', slug: product.slug, foil }
      : (seed >>> 9) % 3 === 0
        ? { id: `s:${tip.id}`, no: `S${pad2(TIPS.indexOf(tip) + 1)}/${TIPS.length}`, kind: 'sticker', sid: tip.id }
        : { id: `a${a}`, no: `A${pad2(a + 1)}/${ADVICE.length}`, kind: 'advice', text: ADVICE[a] };
  const cards: Card[] = [
    { id: `k${k}`, no: `K${pad2(k + 1)}/${KIND_WORDS.length}`, kind: 'kind', text: KIND_WORDS[k] },
    { id: `w:${w.kind}`, no: `W · ${w.kind}`, kind: 'weather', card: w },
    third,
  ];
  const date = new Date(`${s.day || '2026-01-01'}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  const focusFirst = () => requestAnimationFrame(() => listRef.current?.querySelector<HTMLElement>('.dcard--back:not([aria-hidden])')?.focus({ preventScroll: true }));

  const open = () => {
    if (s.opened || tearing) return;
    sfx('paper');
    const done = () => {
      usePack.getState().openPack(foil, first);
      game().updateStats((x) => ({ packsOpened: (x.packsOpened ?? 0) + 1 }));
      game().addPoints(15, 'Opened today’s pack');
      track('pack', { action: 'open', day: s.day, holo: foil, first });
      focusFirst();
    };
    if (calm()) return done();
    setTearing(true);
    timers.current.push(
      window.setTimeout(() => {
        setTearing(false);
        setTear(0);
        sfx('pop');
        done();
      }, 620),
    );
  };

  const flip = (i: number) => {
    if (isUp(usePack.getState().turned, i)) return;
    const c = cards[i];
    usePack.getState().reveal(i, c.id);
    track('pack', { action: 'flip', card: c.id });
    // keyboard: the next face-down card, or the line under the cards once all three are up
    requestAnimationFrame(() => {
      const next = listRef.current?.querySelector<HTMLElement>('.dcard--back:not([aria-hidden])') ?? nextRef.current;
      next?.focus({ preventScroll: true });
    });
    // on phones the cards sit in a row you swipe: bring the one turning over to the middle
    slots.current[i]?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: calm() ? 'auto' : 'smooth' });
    if (c.kind === 'product' && c.foil) {
      sfx('success');
      game().updateStats((x) => ({ holoPulls: (x.holoPulls ?? 0) + 1 }));
      game().addPoints(50, 'Pulled a holo rare');
      track('pack', { action: 'holo', slug: c.slug });
    } else sfx('pop');
  };

  // "Turn over the everyday cards" turns the everyday ones; a product card is always yours to turn
  const last = cards.findIndex((c) => c.kind === 'product');
  const everyday = cards.map((_, i) => i).filter((i) => i !== last && !isUp(s.turned, i));
  const flipAll = () => everyday.forEach((i, n) => timers.current.push(window.setTimeout(() => flip(i), calm() ? 0 : n * 260)));

  const readCase = (slug: string) => {
    sfx('open');
    track('pack', { action: 'case_study', slug });
    useUI.getState().openPanel('gallery', { work: slug });
  };

  return (
    <Stage code="RM-15" kicker={`Today’s pack · ${date}`} title="Today’s pack" className="pk-stage">
      <div className="pk">
        <div className="pk-main">
          <div className="pk-table" data-open={s.opened || undefined}>
            {!s.opened ? (
              <div
                className="pk-pack"
                data-tearing={tearing || undefined}
                data-dragging={dragging || undefined}
                style={{ '--tear': tearing ? 1 : tear } as CSSProperties}
                onPointerMove={(e) => {
                  // the foil's glint follows the pointer
                  const r = e.currentTarget.getBoundingClientRect();
                  e.currentTarget.style.setProperty('--mx', `${Math.round(((e.clientX - r.left) / r.width) * 100)}%`);
                }}
              >
                <button type="button" className="pk-pack__body" onClick={open} aria-label="Tear open today’s pack: three cards inside">
                  {/* the top of the pack: the heat seal and the strip. What's torn lifts away as a flap. */}
                  <span className="pk-pack__top">
                    <span className="pk-pack__crimp" aria-hidden />
                    <span
                      className="pk-pack__strip"
                      aria-hidden
                      onPointerDown={(e) => {
                        // measured from where the finger starts, against the strip's width at that moment
                        drag.current = { start: e.clientX, w: e.currentTarget.getBoundingClientRect().width };
                        setDragging(true);
                        e.currentTarget.setPointerCapture(e.pointerId);
                      }}
                      onPointerMove={(e) => {
                        if (!drag.current) return;
                        const p = Math.max(0, Math.min(1, (e.clientX - drag.current.start) / (drag.current.w * 0.5)));
                        if (Math.floor(p * 8) > Math.floor(tear * 8)) sfx('tick', { gain: 0.5 });
                        if (p >= 0.6 && tear < 0.6) navigator.vibrate?.(8);
                        setTear(p);
                        if (p >= 1) {
                          drag.current = null;
                          setDragging(false);
                          open();
                        }
                      }}
                      onPointerUp={() => {
                        const torn = tear >= 0.6;
                        drag.current = null;
                        setDragging(false);
                        if (torn) open();
                        else if (!tearing) setTear(0);
                      }}
                      onPointerCancel={() => {
                        drag.current = null;
                        setDragging(false);
                        setTear(0);
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="pk-pack__strip-foil" />
                      <span className="pk-pack__strip-label">tear here →</span>
                    </span>
                  </span>
                  <span className="pk-pack__flap" aria-hidden>
                    <span className="pk-pack__crimp" />
                    <span className="pk-pack__strip">
                      <span className="pk-pack__strip-foil" />
                      <span className="pk-pack__strip-label">tear here →</span>
                    </span>
                  </span>
                  <span className="pk-pack__perf" aria-hidden />
                  <span className="pk-pack__face" aria-hidden>
                    <span className="pk-pack__brand">
                      Adelia <b>TCG</b>
                    </span>
                    <span className="pk-pack__title">Today’s pack</span>
                    <PackArt />
                    <span className="pk-pack__meta">
                      <span>{date}</span>
                      <span>{first ? '3 cards · 1 product' : '3 cards · 1 in 8 holo'}</span>
                    </span>
                  </span>
                  <span className="pk-pack__crimp pk-pack__crimp--bottom" aria-hidden />
                </button>
              </div>
            ) : (
              <ol ref={listRef} className="pk-cards" aria-label="Today’s three cards">
                {cards.map((c, i) => {
                  const up = isUp(s.turned, i);
                  const p = c.kind === 'product' ? (OWN.find((x) => x.slug === c.slug) ?? OWN[0]) : null;
                  return (
                    <li
                      key={i}
                      ref={(el) => {
                        slots.current[i] = el;
                      }}
                      className="pk-slot"
                      style={{ '--i': i } as CSSProperties}
                    >
                      {c.kind !== 'product' ? (
                        <div className="dcard-flip" data-up={up || undefined}>
                          <button type="button" className="dcard dcard--back" onClick={() => flip(i)} aria-label={`Turn over card ${i + 1} of 3`} aria-hidden={up || undefined} tabIndex={up ? -1 : undefined}>
                            <CardBack />
                          </button>
                          <article className="dcard dcard--front" data-kind={c.kind} aria-hidden={!up || undefined}>
                            <header className="dcard__top">
                              <span>{LABEL[c.kind]}</span>
                              <Glyph card={c} />
                            </header>
                            {c.kind === 'sticker' ? (
                              <StickerTip sid={c.sid} have={!!got[c.sid]} up={up} />
                            ) : (
                              <p className="dcard__text">{c.kind === 'weather' ? c.card.text : c.text}</p>
                            )}
                            <footer className="dcard__foot">
                              <span>{c.kind === 'weather' ? c.card.line : c.no}</span>
                              <span>{date}</span>
                            </footer>
                          </article>
                        </div>
                      ) : !up ? (
                        <button
                          type="button"
                          className="dcard dcard--back"
                          onClick={() => flip(i)}
                          aria-label={c.foil ? `Turn over card ${i + 1} of 3. Something glints.` : `Turn over card ${i + 1} of 3: one of her products`}
                          data-glint={c.foil || undefined}
                        >
                          <CardBack />
                        </button>
                      ) : p ? (
                        <div className="pk-rare" data-foil={c.foil || undefined}>
                          <TradingCard project={p} number={OWN.indexOf(p) + 1} total={OWN.length} holo={c.foil} label={c.foil ? 'holo rare, pack foil' : first ? 'starter' : undefined} />
                          {c.foil && (
                            <span className="pk-burst" aria-hidden>
                              {Array.from({ length: 10 }, (_, n) => (
                                <i key={n} style={{ '--a': `${n * 36 + 8}deg`, '--d': `${70 + (n % 3) * 26}px` } as CSSProperties} />
                              ))}
                            </span>
                          )}
                          <p className="pk-under">
                            <button type="button" className="btn btn--sm btn--primary" onClick={() => readCase(p.slug)}>
                              Read the case study <Icon name="arrow-right" size={14} />
                            </button>
                            <span className="pk-no">
                              {c.no}
                              {c.foil ? ' · holo foil' : first ? ' · starter' : ''}
                            </span>
                          </p>
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ol>
            )}
          </div>

          <div className="pk-actions">
            {!s.opened ? (
              <>
                <button type="button" className="btn btn--accent btn--lg" onClick={open}>
                  Tear it open
                </button>
                <p>Or drag across the strip at the top of the pack.</p>
              </>
            ) : upCount(s.turned) < 3 ? (
              everyday.length > 0 ? (
                <button type="button" className="btn" onClick={flipAll}>
                  {last >= 0 ? 'Turn over the everyday cards' : 'Turn them all over'}
                </button>
              ) : (
                <p className="pk-actions__lead">{cards[last]?.kind === 'product' && (cards[last] as { foil: boolean }).foil ? 'The last one glints. Turn it yourself.' : 'The last one is one of her products. Turn it over.'}</p>
              )
            ) : (
              <div className="pk-next" ref={nextRef} tabIndex={-1}>
                <p>
                  <b>Next pack in {left || 'a few hours'}.</b> Filed in your binder.
                </p>
              </div>
            )}
          </div>
        </div>

        <aside className="pk-side">
          <Odds sinceHolo={s.sinceHolo} opened={s.opened} holo={s.holo} collected={s.collected} left={left} first={first} />
          <Binder seen={s.seen} onRead={readCase} />
        </aside>
      </div>
    </Stage>
  );
}

/* ------------------------------------------------------------- the odds, printed */
function Odds({ sinceHolo, opened, holo, collected, left, first }: { sinceHolo: number; opened: boolean; holo: boolean; collected: number; left: string; first: boolean }) {
  // packs without a holo in a row, counting today's once it's open
  const streak = opened ? (holo ? 0 : sinceHolo) : sinceHolo;
  return (
    <section className="pk-odds" aria-label="Pack odds">
      <span className="t-spec">Set AT-26 · daily · 3 cards</span>
      <dl>
        <div>
          <dt>Holo rare</dt>
          <dd>1 in 8 · always by your 3rd pack</dd>
        </div>
        <div>
          <dt>Since your last holo</dt>
          <dd className="pk-odds__dots" aria-label={`${streak} of 3`}>
            {[0, 1, 2].map((i) => (
              <i key={i} className={i < streak ? 'is-on' : ''} />
            ))}
            <span>{streak >= 2 && !opened ? 'This one is holo' : `${streak}/3`}</span>
          </dd>
        </div>
        <div>
          <dt>First pack</dt>
          <dd>{first && !opened ? 'This one: a product card, always' : 'Always a product card'}</dd>
        </div>
        <div>
          <dt>Packs opened</dt>
          <dd>{Math.round(collected / 3)}</dd>
        </div>
        {opened && (
          <div>
            <dt>Next pack</dt>
            <dd>in {left || 'a few hours'}</dd>
          </div>
        )}
      </dl>
    </section>
  );
}

/* ------------------------------------------------------------- the binder */
type SetId = 'products' | 'kind' | 'advice' | 'weather' | 'stickers';

function Binder({ seen, onRead }: { seen: string[]; onRead: (slug: string) => void }) {
  const [set, setSet] = useState<SetId>('products');
  const [view, setView] = useState<string | null>(null);
  const got = useGame((x) => x.achievements);

  const sets: { id: SetId; label: string; total: number; have: number }[] = [
    { id: 'products', label: 'Products', total: OWN.length, have: new Set(seen.filter((x) => /^[ph]:/.test(x)).map((x) => x.slice(2))).size },
    { id: 'kind', label: 'Kind words', total: KIND_WORDS.length, have: seen.filter((x) => /^k\d/.test(x)).length },
    { id: 'advice', label: 'Advice', total: ADVICE.length, have: seen.filter((x) => /^a\d/.test(x)).length },
    { id: 'weather', label: 'Weather', total: WEATHER_KINDS.length, have: seen.filter((x) => x.startsWith('w:')).length },
    { id: 'stickers', label: 'Sticker tips', total: TIPS.length, have: seen.filter((x) => x.startsWith('s:')).length },
  ];
  const holoCount = seen.filter((x) => x.startsWith('h:')).length;
  const all = sets.reduce((n, x) => n + x.have, 0);
  const total = sets.reduce((n, x) => n + x.total, 0);

  const pockets: { key: string; no: string; has: boolean; render: () => ReactNode; title: string; full?: () => ReactNode }[] =
    set === 'products'
      ? OWN.map((p, i) => {
          const h = seen.includes(`h:${p.slug}`);
          const has = h || seen.includes(`p:${p.slug}`);
          return {
            key: p.slug,
            no: `P${pad2(i + 1)}`,
            has,
            title: p.name,
            render: () => (
              <span className={`pk-mini pk-mini--product ${h ? 'is-holo' : ''}`}>
                <img src={`/assets/posters/poster-${projects.indexOf(p) + 1}.webp`} alt="" loading="lazy" draggable={false} />
                <b>{p.name}</b>
                {h && <i aria-label="holo">★</i>}
              </span>
            ),
          };
        })
      : set === 'kind' || set === 'advice'
        ? (set === 'kind' ? KIND_WORDS : ADVICE).map((t, i) => {
            const key = `${set === 'kind' ? 'k' : 'a'}${i}`;
            return { key, no: `${set === 'kind' ? 'K' : 'A'}${pad2(i + 1)}`, has: seen.includes(key), title: t, render: () => <span className="pk-mini pk-mini--text">{t}</span> };
          })
        : set === 'weather'
          ? WEATHER_KINDS.map((wk) => ({
              key: wk,
              no: `W·${wk}`,
              has: seen.includes(`w:${wk}`),
              title: wk,
              render: () => (
                <span className="pk-mini pk-mini--glyph">
                  <WeatherGlyph kind={wk} />
                  <b>{wk}</b>
                </span>
              ),
            }))
          : TIPS.map((t, i) => ({
              key: t.id,
              no: `S${pad2(i + 1)}`,
              has: seen.includes(`s:${t.id}`),
              title: t.name,
              render: () => (
                <span className="pk-mini pk-mini--glyph">
                  <Sticker art={artOf(t.id)} size={34} locked={!got[t.id]} />
                  <b>{t.name}</b>
                </span>
              ),
              full: () => (
                <div className="dcard__tip">
                  <Sticker art={artOf(t.id)} size={64} locked={!got[t.id]} holo={!!got[t.id]} />
                  <b>{t.name}</b>
                  <p>{got[t.id] ? 'Already in your sticker book.' : t.hint}</p>
                </div>
              ),
            }));

  const viewing = pockets.find((p) => p.key === view && p.has);

  return (
    <section className="pk-binder" aria-label="Your binder">
      <header className="pk-binder__head">
        <span className="t-label">Your binder</span>
        <span className="t-mono pk-binder__count">
          {all}/{total}
          {holoCount ? ` · ${holoCount} holo` : ''}
        </span>
      </header>
      <div className="pk-tabs" role="group" aria-label="Binder page">
        {sets.map((x) => (
          <button
            key={x.id}
            className={set === x.id ? 'is-on' : ''}
            aria-pressed={set === x.id}
            onClick={() => {
              setSet(x.id);
              setView(null);
              sfx('switch');
              track('pack', { action: 'binder', set: x.id });
            }}
          >
            {x.label} <span>{x.have}/{x.total}</span>
          </button>
        ))}
      </div>
      {viewing && (
        <div className="pk-view">
          <div className="pk-view__card">
            {set === 'products' ? (
              <ProductView slug={viewing.key} holo={seen.includes(`h:${viewing.key}`)} onRead={onRead} />
            ) : viewing.full ? (
              viewing.full()
            ) : (
              <p className={`pk-view__text ${set === 'weather' ? 'is-weather' : ''}`}>
                <span className="t-label">{viewing.no}</span>
                {set === 'weather' ? <WeatherGlyph kind={viewing.key as WeatherCard['kind']} /> : null}
                {viewing.title}
              </p>
            )}
          </div>
          <button className="pk-link pk-view__close" onClick={() => setView(null)}>
            Close
          </button>
        </div>
      )}
      <ul className={`pk-pockets pk-pockets--${set}`}>
        {pockets.map((p) => (
          <li key={p.key} className={`pk-pocket ${p.has ? 'is-on' : ''} ${view === p.key ? 'is-sel' : ''}`}>
            {p.has ? (
              <button className="pk-pocket__btn" onClick={() => (setView(view === p.key ? null : p.key), sfx('tick'))} aria-pressed={view === p.key} aria-label={`${p.no}: ${p.title}`}>
                {p.render()}
                <span className="pk-pocket__no">{p.no}</span>
              </button>
            ) : (
              <span className="pk-pocket__empty" aria-label={`${p.no}: not collected yet`}>
                <span className="pk-pocket__no">{p.no}</span>
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function ProductView({ slug, holo, onRead }: { slug: string; holo: boolean; onRead: (slug: string) => void }) {
  const p = OWN.find((x) => x.slug === slug);
  if (!p) return null;
  return (
    <>
      <div className="pk-view__tcg">
        <TradingCard project={p} number={OWN.indexOf(p) + 1} total={OWN.length} holo={holo} />
      </div>
      <button className="btn btn--sm btn--primary" onClick={() => onRead(slug)}>
        Read the case study <Icon name="arrow-right" size={14} />
      </button>
    </>
  );
}

/* ------------------------------------------------------------- a sticker tip */
function StickerTip({ sid, have, up }: { sid: AchievementId; have: boolean; up: boolean }) {
  const a = ACHIEVEMENT_MAP[sid];
  const g = useGame.getState();
  const route = have ? null : showMe(sid, g);
  return (
    <div className="dcard__tip">
      <Sticker art={artOf(sid)} size={72} locked={!have} holo={have} />
      <b>{a.name}</b>
      <p>{have ? 'Already in your sticker book.' : a.hint}</p>
      {route && (
        <button
          type="button"
          className="btn btn--sm btn--primary"
          tabIndex={up ? undefined : -1}
          onClick={() => {
            track('pack', { action: 'sticker_tip', id: sid });
            focus(route.station, route.props ?? {});
          }}
        >
          Show me <Icon name="arrow-right" size={14} />
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------- glyphs + art */
function Glyph({ card }: { card: Card }) {
  if (card.kind === 'weather') return <WeatherGlyph kind={card.card.kind} />;
  const common = { width: 34, height: 34, viewBox: '0 0 40 40', 'aria-hidden': true } as const;
  if (card.kind === 'kind')
    return (
      <svg {...common}>
        <path d="M20 33C10 26 5 21 5 14.5 5 10 8.4 7 12.4 7c3 0 5.6 1.8 7.6 4.5C22 8.8 24.6 7 27.6 7 31.6 7 35 10 35 14.5 35 21 30 26 20 33Z" fill="#FF7EB6" stroke="#C2286F" strokeWidth="2" />
        <path d="M11 13c.6-2 2-3 3.6-3" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" fill="none" />
      </svg>
    );
  if (card.kind === 'sticker')
    return (
      <svg {...common}>
        <path d="M8 6h18l8 8v18a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z" fill="#fff" stroke="#5AA9E6" strokeWidth="2" />
        <path d="M26 6v6a2 2 0 0 0 2 2h6" fill="#DCEEFC" stroke="#5AA9E6" strokeWidth="2" strokeLinejoin="round" />
        <path d="M20 27c-4-2.7-6-4.8-6-7.3 0-1.8 1.4-3.2 3-3.2 1.3 0 2.3.7 3 1.7.7-1 1.7-1.7 3-1.7 1.6 0 3 1.4 3 3.2 0 2.5-2 4.6-6 7.3Z" fill="#FF7EB6" />
      </svg>
    );
  return (
    <svg {...common}>
      <rect x="7" y="6" width="26" height="28" rx="4" fill="#DCEEFC" stroke="#5AA9E6" strokeWidth="2" />
      <path d="M12 14h16M12 20h16M12 26h10" stroke="#1F5F96" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function WeatherGlyph({ kind }: { kind: WeatherCard['kind'] }) {
  const common = { width: 34, height: 34, viewBox: '0 0 40 40', 'aria-hidden': true } as const;
  switch (kind) {
    case 'rain':
    case 'storm':
      return (
        <svg {...common}>
          <path d="M12 24a6 6 0 0 1-.8-12A8.5 8.5 0 0 1 27 10a6.5 6.5 0 0 1 1.5 14Z" fill="#fff" stroke="#5AA9E6" strokeWidth="2" strokeLinejoin="round" />
          <path d="M14 28l-2 5M21 28l-2 5M28 28l-2 5" stroke="#5AA9E6" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      );
    case 'cloud':
    case 'haze':
    case 'unknown':
      return (
        <svg {...common}>
          <circle cx="27" cy="13" r="6" fill="#F5C84B" />
          <path d="M11 30a7 7 0 0 1-.9-13.9A10 10 0 0 1 29 15a7.5 7.5 0 0 1 1.7 15Z" fill="#fff" stroke="#5AA9E6" strokeWidth="2" strokeLinejoin="round" />
        </svg>
      );
    case 'night':
      return (
        <svg {...common}>
          <path d="M27 30A13 13 0 0 1 16 8a13 13 0 1 0 11 22Z" fill="#FFF1BD" stroke="#D9A50E" strokeWidth="2" strokeLinejoin="round" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="20" cy="20" r="8" fill="#F5C84B" stroke="#D9A50E" strokeWidth="2" />
          <path d="M20 4v5M20 31v5M4 20h5M31 20h5M8.7 8.7l3.5 3.5M27.8 27.8l3.5 3.5M8.7 31.3l3.5-3.5M27.8 12.2l3.5-3.5" stroke="#F5C84B" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      );
  }
}

/** The pack's printed art: a jelly drop over a wave, in foil. */
function PackArt() {
  return (
    <svg className="pk-pack__art" viewBox="0 0 120 90" aria-hidden>
      <circle cx="84" cy="30" r="15" fill="#FFF3D9" />
      <circle cx="84" cy="30" r="21" fill="none" stroke="#FFFFFF" strokeOpacity=".8" strokeWidth="2" strokeDasharray="2 5" />
      <path d="M44 16S30 31 30 40a14 14 0 0 0 28 0C58 31 44 16 44 16Z" fill="#FFFFFF" fillOpacity=".85" stroke="#18263A" strokeOpacity=".7" strokeWidth="2" />
      <circle cx="39.5" cy="42" r="1.8" fill="#18263A" />
      <circle cx="48.5" cy="42" r="1.8" fill="#18263A" />
      <path d="M42 46c1.2 1 2.8 1 4 0" stroke="#18263A" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      <path d="M0 64c14-10 26-10 40 0s26 10 40 0 26-10 40 0v26H0Z" fill="#FFFFFF" fillOpacity=".9" />
      <path d="M0 74c14-8 26-8 40 0s26 8 40 0 26-8 40 0" fill="none" stroke="#5AA9E6" strokeOpacity=".55" strokeWidth="3" />
    </svg>
  );
}

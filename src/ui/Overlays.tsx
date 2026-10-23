/* ==========================================================================
   Toasts · "You found" moment (writes a line of the House Rules) · Menu ·
   Panel host
   ========================================================================== */
import { lazy, Suspense, useEffect, useRef, useState, type ComponentType, type LazyExoticComponent } from 'react';
import { useUI } from '@/state/ui';
import { useGame } from '@/state/game';
import { useToasts } from '@/state/toasts';
import { sfx } from '@/audio/engine';
import { CHAPTERS } from '@/lib/content';
import { STATIONS, STATION_LIST, type PanelId } from '@/stage/stations';
import { continueFromFound, focus } from '@/stage/director';
import { track } from '@/lib/api';
import { Icon, Mark } from './Icon';
import { PanelPresence } from './Panel';
import './overlays.css';

/** Contact facts for the shell (from legacy content/profile.ts identity). */
const EMAIL = 'aadeliatiara@gmail.com';

const TOAST_LABEL: Record<string, string> = {
  achievement: 'Sticker unlocked',
  tier: 'Guest Pass',
  manifesto: 'House Rules',
  info: 'Adelia’s Room',
};

/* ---------------------------------------------------------------- toasts */
export function Toasts() {
  const toasts = useToasts((s) => s.toasts);
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast--${t.kind}`}>
          {t.kind === 'points' ? (
            <>
              <span className="toast__heart" aria-hidden>♥</span>
              <b className="t-dot">{t.title}</b>
              <span>{t.body}</span>
            </>
          ) : (
            <>
              <span className={`toast__pin ${t.kind === 'achievement' ? 'holo' : ''}`} aria-hidden>
                {t.glyph ?? (t.kind === 'tier' ? '▲' : '♥')}
              </span>
              <span className="toast__text">
                <span className="t-label">{TOAST_LABEL[t.kind] ?? 'Adelia’s Room'}</span>
                <b>{t.title}</b>
                {t.body && <span>{t.body}</span>}
              </span>
              {t.points ? (
                <span className="toast__pts" aria-label={`plus ${t.points} hearts`}>
                  +{t.points}
                  <i aria-hidden>♥</i>
                </span>
              ) : null}
            </>
          )}
        </div>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- found */
export function Found() {
  const found = useUI((s) => s.found);
  const lines = useGame((s) => Object.keys(s.manifesto).length);
  if (!found) return null;
  const st = STATIONS[found.station];
  const chapter = CHAPTERS.find((c) => c.id === st.manifesto);
  return (
    <div className="found" role="dialog" aria-label={`You found ${st.name}`}>
      <div className="found__blur" />
      <div className="found__title">
        <span className="t-label">You found</span>
        <h2>{st.name}</h2>
      </div>
      <div className="found__card note-card note-card--pink">
        <span className="found__rule holo" aria-hidden>
          <small>Rule</small>
          {chapter?.roman}
        </span>
        <div>
          <p>
            You wrote house rule <em>{chapter?.roman}</em> of five.
          </p>
          <blockquote>{found.line}</blockquote>
          <div className="found__actions">
            <button
              className="btn btn--primary btn--sm"
              autoFocus
              onClick={() => {
                sfx('click');
                continueFromFound(false);
              }}
            >
              {st.verb.split(' — ')[0]} <Icon name="arrow-right" size={14} />
            </button>
            <button
              className="btn btn--ghost btn--sm"
              onClick={() => {
                sfx('click');
                continueFromFound(true);
              }}
            >
              Read the House Rules · {lines}/5
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- menu */
export function Menu() {
  const open = useUI((s) => s.menuOpen);
  const stamps = useGame((s) => s.stamps);
  const quality = useUI((s) => s.quality);
  if (!open) return null;
  const close = () => useUI.getState().setMenuOpen(false);
  const groups: { id: string; title: string; roman: string }[] = CHAPTERS.map((c) => ({ id: c.id, title: c.title, roman: c.roman }));
  const visited = Object.keys(stamps).length;
  return (
    <div className="menu" onPointerDown={(e) => e.target === e.currentTarget && close()}>
      <nav className="menu__panel" aria-label="Everything in the room">
        <span className="screws" aria-hidden>
          <i />
          <i />
          <i />
          <i />
        </span>
        <header className="menu__head">
          <Mark size={40} className="menu__mark" />
          <div className="menu__titles">
            <span className="t-label">
              Index · {Math.max(0, visited - (stamps.door ? 1 : 0))}/{STATION_LIST.length - 1} objects found
            </span>
            <h2>Adelia’s Room</h2>
          </div>
          <span className="menu__spec t-spec" aria-hidden>
            adelia.cc
            <br />
            Bekasi · WIB
          </span>
          <button className="btn btn--sm btn--icon" onClick={close} aria-label="Close menu" autoFocus>
            <Icon name="close" size={16} />
          </button>
        </header>
        <div className="menu__grid scroll">
          {groups.map((g) => (
            <section key={g.id}>
              <h3 className="menu__chapter">
                <span className="nameplate">{g.roman}</span>
                {g.title}
              </h3>
              {STATION_LIST.filter((s) => s.chapter === g.id).map((s) => (
                <button
                  key={s.id}
                  className={`menu__item ${stamps[s.id] ? 'is-done' : ''}`}
                  onClick={() => {
                    close();
                    focus(s.id);
                  }}
                >
                  <span className="menu__icon">
                    <Icon name={s.icon} size={18} />
                  </span>
                  <span>
                    <b>{s.name}</b>
                    <small>{s.verb}</small>
                  </span>
                  <span className="menu__code t-label">
                    {stamps[s.id] ? (
                      <>
                        <Icon name="check" size={13} stroke={2.2} />
                        <span className="sr-only">visited</span>
                      </>
                    ) : (
                      s.code
                    )}
                  </span>
                </button>
              ))}
            </section>
          ))}
        </div>
        <footer className="menu__foot">
          <div className="menu__contact">
            <span className="t-label">Hiring? Say hello</span>
            <a className="menu__mail" href={`mailto:${EMAIL}`}>
              <Icon name="mail" size={17} /> {EMAIL}
            </a>
          </div>
          <div className="menu__keys">
            <button
              className="btn btn--sm btn--primary"
              onClick={() => {
                close();
                focus('printer');
              }}
            >
              <Icon name="calendar" size={15} stroke={1.8} /> Book a chat
            </button>
            <a
              className="btn btn--sm"
              href="/cv.pdf"
              target="_blank"
              rel="noopener"
              onClick={() => {
                sfx('paper');
                track('cv_open', { from: 'menu' });
              }}
            >
              <Icon name="file" size={15} /> CV <span className="menu__pdf">PDF</span>
            </a>
            <a className="btn btn--sm btn--ghost" href="/launch">
              What’s next
            </a>
            <button
              className="btn btn--sm btn--ghost"
              onClick={() => {
                useUI.getState().setQuality(quality === 'high' ? 'low' : 'high');
                sfx('switch');
              }}
            >
              Graphics: {quality === 'high' ? 'high' : 'light'}
            </button>
          </div>
        </footer>
      </nav>
    </div>
  );
}

/* ---------------------------------------------------------------- panels */
type Lazy = LazyExoticComponent<ComponentType<Record<string, unknown>>>;
const L = (f: () => Promise<{ default: ComponentType<any> }>) => lazy(f) as Lazy;

export const PANELS: Record<PanelId, Lazy> = {
  clock: L(() => import('@/features/clock/ClockPanel')),
  weather: L(() => import('@/features/weather/WeatherPanel')),
  news: L(() => import('@/features/news/NewsPanel')),
  computer: L(() => import('@/features/computer/ComputerPanel')),
  console: L(() => import('@/features/games/ConsolePanel')),
  synth: L(() => import('@/features/music/SynthPanel')),
  records: L(() => import('@/features/music/RecordsPanel')),
  products: L(() => import('@/features/products/ProductsPanel')),
  vault: L(() => import('@/features/products/VaultPanel')),
  gallery: L(() => import('@/features/gallery/GalleryPanel')),
  achievements: L(() => import('@/features/pass/AchievementsPanel')),
  pass: L(() => import('@/features/pass/PassPanel')),
  manifesto: L(() => import('@/features/pass/ManifestoPanel')),
  rsvp: L(() => import('@/features/rsvp/RsvpPanel')),
  launch: L(() => import('@/features/launch/LaunchPanel')),
  redirect: L(() => import('@/features/redirect/RedirectPanel')),
  quiz: L(() => import('@/features/quiz/QuizPanel')),
  phone: L(() => import('@/features/phone/PhonePanel')),
  moci: L(() => import('@/features/moci/MociPanel')),
  studio: L(() => import('@/features/studio/StudioPanel')),
  pack: L(() => import('@/features/pack/PackPanel')),
  sea: L(() => import('@/features/sea/SeaPanel')),
  about: L(() => import('@/features/about/AboutPanel')),
};

export function PanelHost() {
  const panel = useUI((s) => s.panel);
  const props = useUI((s) => s.panelProps);
  // keep a closed panel mounted briefly so it can return into its object
  const last = useRef<{ id: PanelId; props: Record<string, unknown> } | null>(null);
  const [, rerender] = useState(0);
  if (panel) last.current = { id: panel, props };
  const leaving = !panel && !!last.current;
  useEffect(() => {
    if (!leaving) return;
    const t = setTimeout(() => {
      last.current = null;
      rerender((n) => n + 1);
    }, 400);
    return () => clearTimeout(t);
  }, [leaving]);
  const cur = last.current;
  if (!cur) return null;
  const C = PANELS[cur.id];
  return (
    <PanelPresence.Provider value={leaving ? LEAVING : STAYING}>
      <Suspense fallback={<div className="panel-loading t-label">Loading…</div>}>
        <C key={cur.id} {...cur.props} />
      </Suspense>
    </PanelPresence.Provider>
  );
}
const LEAVING = { leaving: true };
const STAYING = { leaving: false };

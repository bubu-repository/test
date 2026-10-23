/* ==========================================================================
   The cloud handheld (RM-17) — CLOUD ARCADE
   The pearl cloud-shaped handheld from her desk, rebuilt in CSS + SVG
   around a 160×144 pixel canvas (landscape on wide screens, a tall cloud
   on phones). Every control on the device is live (pointer + multi-touch)
   and mirrors the keyboard. The firmware lives in arcade.ts. Beside it:
   how to play / "Off the clock" (the games she plays, content/games.ts),
   and the cartridges with best scores and the two arcade stickers.
   ========================================================================== */
import { useEffect, useRef, useState, type FormEvent, type MouseEvent as RMouseEvent, type PointerEvent as RPointerEvent } from 'react';
import { Stage } from '@/ui/Panel';
import { useUI } from '@/state/ui';
import { useGame } from '@/state/game';
import { sfx } from '@/audio/engine';
import { games as SHELF } from '@/content/games';
import { Arcade, GAMES, titleCase, type Mode } from './arcade';
import type { Btn } from './engine';
import './console.css';

const DIRS: Btn[] = ['up', 'down', 'left', 'right'];
const clean = (s: string) => s.replace(/[^A-Za-z0-9 ._-]/g, '').toUpperCase().slice(0, 12);

export default function ConsolePanel() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const deviceRef = useRef<HTMLDivElement>(null);
  const dpadRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<Partial<Record<Btn, HTMLElement | null>>>({});
  const arcadeRef = useRef<Arcade | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<Mode>('boot');
  const [name, setName] = useState(() => clean(useGame.getState().name || ''));
  const [nameErr, setNameErr] = useState(false);
  const [failed, setFailed] = useState(false);
  const submitRef = useRef<() => void>(() => {});
  const skipRef = useRef<() => void>(() => {});

  /* boot the firmware */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ui = useUI.getState();
    ui.setFlag('consoleOn', true);
    let arcade: Arcade;
    try {
      arcade = new Arcade(canvas, {
        onMode: setMode,
        onButton: (b, down) => {
          if (DIRS.includes(b)) dpadRef.current?.classList.toggle('is-' + b, down);
          else btnRefs.current[b]?.classList.toggle('is-down', down);
        },
        onJolt: (p) => {
          const el = deviceRef.current;
          if (!el) return;
          el.style.setProperty('--jolt', `${Math.min(6, p)}px`);
          el.classList.remove('is-jolt');
          void el.offsetWidth;
          el.classList.add('is-jolt');
        },
        onNameAction: (a) => (a === 'submit' ? submitRef.current() : skipRef.current()),
      });
    } catch {
      setFailed(true);
      return () => ui.setFlag('consoleOn', false);
    }
    arcadeRef.current = arcade;
    if (import.meta.env.DEV) (window as unknown as { __arcade?: Arcade }).__arcade = arcade;
    arcade.start();
    sfx('boot', { gain: 0.6 });
    return () => {
      arcade.destroy();
      arcadeRef.current = null;
      const s = useUI.getState();
      s.setFlag('consoleOn', false);
      s.setFlag('consoleGame', null);
    };
  }, []);

  /* name entry: prefill + focus */
  useEffect(() => {
    if (mode !== 'name') return;
    setName((n) => n || clean(useGame.getState().name || ''));
    setNameErr(false);
    const coarse = matchMedia('(pointer: coarse)').matches;
    const t = setTimeout(() => {
      if (!coarse) nameRef.current?.focus({ preventScroll: true });
    }, 60);
    return () => clearTimeout(t);
  }, [mode]);

  const onSubmit = (e?: FormEvent) => {
    e?.preventDefault();
    const v = name.trim();
    if (v.length < 3 || v.length > 12) {
      setNameErr(true);
      sfx('error');
      nameRef.current?.focus({ preventScroll: true });
      return;
    }
    nameRef.current?.blur();
    void arcadeRef.current?.submitName(v);
  };
  const onSkip = () => {
    nameRef.current?.blur();
    arcadeRef.current?.skipName();
  };
  submitRef.current = onSubmit;
  skipRef.current = onSkip;

  /* pointer → buttons (multi-touch safe: every pointer is its own source) */
  const bind = (b: Btn) => ({
    onPointerDown: (e: RPointerEvent<HTMLElement>) => {
      e.preventDefault();
      e.currentTarget.setPointerCapture?.(e.pointerId);
      arcadeRef.current?.press(b, true, 'p' + e.pointerId);
      sfx('tick', { gain: 0.35 });
    },
    onPointerUp: (e: RPointerEvent<HTMLElement>) => arcadeRef.current?.press(b, false, 'p' + e.pointerId),
    onPointerCancel: (e: RPointerEvent<HTMLElement>) => arcadeRef.current?.press(b, false, 'p' + e.pointerId),
    onLostPointerCapture: (e: RPointerEvent<HTMLElement>) => arcadeRef.current?.press(b, false, 'p' + e.pointerId),
    onContextMenu: (e: RMouseEvent) => e.preventDefault(),
  });

  /* d-pad: 4-way by dominant axis, thumb can slide between arms */
  const dpadDir = useRef(new Map<number, Btn | null>());
  const dpadUpdate = (e: RPointerEvent<HTMLDivElement>, end = false) => {
    const a = arcadeRef.current;
    if (!a) return;
    const prev = dpadDir.current.get(e.pointerId) ?? null;
    let next: Btn | null = null;
    if (!end) {
      const r = e.currentTarget.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
      const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
      if (Math.hypot(dx, dy) > 0.18) next = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : dy < 0 ? 'up' : 'down';
    }
    if (next === prev) return;
    if (prev) a.press(prev, false, 'd' + e.pointerId);
    if (next) {
      a.press(next, true, 'd' + e.pointerId);
      sfx('tick', { gain: 0.3 });
    }
    if (end) dpadDir.current.delete(e.pointerId);
    else dpadDir.current.set(e.pointerId, next);
  };

  const live = mode === 'play' || mode === 'pause' || mode === 'name';

  return (
    <Stage code="RM-17" title="The cloud handheld" kicker="Cloud Arcade · 3 games" className={`gm-stage ${live ? 'is-live' : ''}`}>
      <div className="gm-layout">
        <aside className="gm-side gm-side--left" aria-label="How to play, and what she plays">
          <LeftCard />
        </aside>

        <div className="gm-wrap">
          <div className="gm-device" ref={deviceRef} onContextMenu={(e) => e.preventDefault()}>
            <CloudShell />
            <span className="gm-brand" aria-hidden>
              Cloud <em>Arcade</em>
            </span>
            <div className="gm-bezel">
              <div className="gm-screen" role="application" aria-label="Cloud Arcade screen. Arrows or WASD to move, Space or Enter for A, X or Shift for B, P or Escape to pause.">
                <canvas ref={canvasRef} width={160} height={144} />
                <div className="gm-screen__glass" aria-hidden />
                {failed && <div className="gm-fail">Display unavailable on this device.</div>}
                {mode === 'name' && (
                  <form className="gm-name" onSubmit={onSubmit} noValidate>
                    <label htmlFor="gm-name-input">Enter your name</label>
                    <input
                      id="gm-name-input"
                      ref={nameRef}
                      value={name}
                      onChange={(e) => {
                        setName(clean(e.target.value));
                        setNameErr(false);
                        sfx('type');
                      }}
                      maxLength={12}
                      minLength={3}
                      autoComplete="nickname"
                      autoCapitalize="characters"
                      spellCheck={false}
                      placeholder="YOUR NAME"
                      aria-invalid={nameErr}
                      className={nameErr ? 'is-err' : ''}
                    />
                    <div className="gm-name__row">
                      <span className={`gm-name__hint ${nameErr ? 'is-err' : ''}`}>{nameErr ? '3–12 characters' : `${name.length}/12`}</span>
                      <button type="button" className="gm-name__btn" onClick={onSkip}>
                        <b>B</b> Skip
                      </button>
                      <button type="submit" className="gm-name__btn gm-name__btn--go">
                        <b>A</b> Save
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>

            <div
              className="gm-dpad"
              ref={dpadRef}
              role="group"
              aria-label="Direction pad"
              onPointerDown={(e) => {
                e.preventDefault();
                e.currentTarget.setPointerCapture?.(e.pointerId);
                dpadUpdate(e);
              }}
              onPointerMove={(e) => dpadDir.current.has(e.pointerId) && dpadUpdate(e)}
              onPointerUp={(e) => dpadUpdate(e, true)}
              onPointerCancel={(e) => dpadUpdate(e, true)}
            >
              <div className="gm-dpad__cross">
                <i className="gm-dpad__arm gm-dpad__arm--v" />
                <i className="gm-dpad__arm gm-dpad__arm--h" />
                <i className="gm-dpad__dimple" />
                <b className="gm-dpad__tri gm-dpad__tri--up" />
                <b className="gm-dpad__tri gm-dpad__tri--down" />
                <b className="gm-dpad__tri gm-dpad__tri--left" />
                <b className="gm-dpad__tri gm-dpad__tri--right" />
              </div>
            </div>

            <button type="button" tabIndex={-1} aria-label="B button" className="gm-key gm-key--b" ref={(el) => void (btnRefs.current.b = el)} {...bind('b')}>
              <span>B</span>
            </button>
            <button type="button" tabIndex={-1} aria-label="A button" className="gm-key gm-key--a" ref={(el) => void (btnRefs.current.a = el)} {...bind('a')}>
              <span>A</span>
            </button>

            <div className="gm-pills">
              <button type="button" tabIndex={-1} aria-label="Select" className="gm-pill" ref={(el) => void (btnRefs.current.select = el)} {...bind('select')}>
                <span>Select</span>
              </button>
              <span className="gm-pill gm-pill--pwr" aria-hidden>
                <i />
              </span>
              <button type="button" tabIndex={-1} aria-label="Start" className="gm-pill" ref={(el) => void (btnRefs.current.start = el)} {...bind('start')}>
                <span>Start</span>
              </button>
            </div>
          </div>
        </div>

        <aside className="gm-side gm-side--right" aria-label="Cartridges and scores">
          <Cartridges />
        </aside>
      </div>
      <section className="gm-shelf-narrow" aria-label="Off the clock: the games she plays">
        <Shelf />
      </section>
    </Stage>
  );
}

/** The pearl cloud body: one SVG silhouette per orientation (CSS picks one). */
function CloudShell() {
  return (
    <>
      <svg className="gm-shell gm-shell--wide" viewBox="0 0 400 240" aria-hidden preserveAspectRatio="none">
        <defs>
          <radialGradient id="gm-pearl-w" cx="62%" cy="26%" r="80%">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="0.55" stopColor="#f6f7fb" />
            <stop offset="1" stopColor="#e2e5ee" />
          </radialGradient>
        </defs>
        <path
          d="M78 222 C38 224 14 196 22 164 C-2 150 2 104 38 96 C34 58 78 36 112 52 C128 16 190 4 222 34 C252 12 314 20 324 60 C366 56 398 96 380 132 C402 156 388 212 330 222 C300 238 250 240 200 232 C150 240 110 238 78 222 Z"
          fill="url(#gm-pearl-w)"
          stroke="rgba(22,27,38,0.1)"
          strokeWidth="1.2"
        />
      </svg>
      <svg className="gm-shell gm-shell--tall" viewBox="0 0 300 400" aria-hidden preserveAspectRatio="none">
        <defs>
          <radialGradient id="gm-pearl-t" cx="64%" cy="22%" r="85%">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="0.55" stopColor="#f6f7fb" />
            <stop offset="1" stopColor="#e2e5ee" />
          </radialGradient>
        </defs>
        <path
          d="M60 384 C22 384 6 352 18 324 C-4 300 4 254 30 246 C4 222 6 170 30 150 C0 120 12 66 56 58 C66 18 130 4 160 30 C190 2 258 16 262 62 C300 76 304 128 278 150 C302 176 300 226 274 246 C300 262 304 312 284 326 C296 360 270 388 240 384 C200 398 110 398 60 384 Z"
          fill="url(#gm-pearl-t)"
          stroke="rgba(22,27,38,0.1)"
          strokeWidth="1.2"
        />
      </svg>
    </>
  );
}

/* ------------------------------------------------------------- side cards */
function Keys({ k }: { k: string[] }) {
  return (
    <span className="gm-keys">
      {k.map((x) => (
        <kbd key={x}>{x}</kbd>
      ))}
    </span>
  );
}

function Controls() {
  return (
    <div className="gm-howto">
      <ul className="gm-legend">
        <li>
          <Keys k={['←', '↑', '↓', '→']} />
          <span>
            or <b>WASD</b> · move, steer, duck
          </span>
        </li>
        <li>
          <Keys k={['Space', 'Enter']} />
          <span>
            <b>A</b> · jump, dash, confirm
          </span>
        </li>
        <li>
          <Keys k={['X', 'Shift']} />
          <span>
            <b>B</b> · back, skip
          </span>
        </li>
        <li>
          <Keys k={['P', 'Esc']} />
          <span>
            <b>Start</b> · pause
          </span>
        </li>
      </ul>
      <p className="gm-note">On a phone, the d-pad and buttons on the handheld are live. Scores sync to the Hall of Fame.</p>
    </div>
  );
}

/** "Off the clock": the games she plays and what each one taught her (content/games.ts). */
function Shelf() {
  const [open, setOpen] = useState<string | null>(null);
  const g = SHELF.find((x) => x.slug === open) ?? null;
  return (
    <div className="gm-shelf">
      <p className="gm-shelf__intro">Off the clock: the games she plays, and what each one taught her about building things.</p>
      <ul className="gm-shelf__list">
        {SHELF.map((x) => (
          <li key={x.slug}>
            <button
              className={`gm-cart ${open === x.slug ? 'is-open' : ''}`}
              aria-expanded={open === x.slug}
              aria-controls="gm-shelf-detail"
              onClick={() => {
                sfx(open === x.slug ? 'back' : 'click');
                setOpen(open === x.slug ? null : x.slug);
              }}
            >
              <span className="gm-cart__label" style={{ background: x.art }} aria-hidden />
              <span className="gm-cart__txt">
                <b>{x.title}</b>
                <span className="t-spec">
                  {x.platform} · {x.year} · {x.hours}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <div id="gm-shelf-detail" className="gm-shelf__detail" aria-live="polite">
        {g ? (
          <>
            <span className="t-label">
              {g.studio} · {g.platform} · {g.year}
            </span>
            <p>{g.taught}</p>
            <span className="gm-shelf__moment">
              <b>Best moment</b> {g.moment}
            </span>
          </>
        ) : (
          <span className="t-label">Pick a cartridge to read what it taught her</span>
        )}
      </div>
    </div>
  );
}

function LeftCard() {
  const [tab, setTab] = useState<'how' | 'shelf'>('how');
  const pick = (t: 'how' | 'shelf') => {
    if (t === tab) return;
    sfx('click');
    setTab(t);
  };
  return (
    <div className="gm-card">
      <div className="gm-tabs" role="tablist" aria-label="Side card">
        <button role="tab" id="gm-tab-how" aria-selected={tab === 'how'} aria-controls="gm-left-panel" className={tab === 'how' ? 'is-on' : ''} onClick={() => pick('how')}>
          How to play
        </button>
        <button role="tab" id="gm-tab-shelf" aria-selected={tab === 'shelf'} aria-controls="gm-left-panel" className={tab === 'shelf' ? 'is-on' : ''} onClick={() => pick('shelf')}>
          What she plays
        </button>
      </div>
      <div id="gm-left-panel" role="tabpanel" aria-labelledby={tab === 'how' ? 'gm-tab-how' : 'gm-tab-shelf'}>
        {tab === 'how' ? <Controls /> : <Shelf />}
      </div>
    </div>
  );
}

function Cartridges() {
  const bests = useGame((s) => s.stats.bestScores);
  const played = useGame((s) => s.stats.gamesPlayed);
  const ach = useGame((s) => s.achievements);
  const ledger = useGame((s) => s.ledger);
  const hearts = ledger.filter((l) => l.label.startsWith('Arcade')).reduce((a, l) => a + l.pts, 0);
  return (
    <div className="gm-card">
      <span className="t-label">Cartridges</span>
      <ul className="gm-carts">
        {GAMES.map((g) => {
          const best = bests[g.id] ?? 0;
          const pct = Math.min(100, (best / g.threshold) * 100);
          return (
            <li key={g.id} className={best >= g.threshold ? 'is-done' : ''}>
              <div className="gm-carts__top">
                <span>{titleCase(g.title)}</span>
                <b className="readout readout--blue">{String(best).padStart(5, '0')}</b>
              </div>
              <div className="gm-carts__bar" aria-hidden>
                <i style={{ width: `${pct}%` }} />
              </div>
              <span className="gm-carts__goal t-spec">{best >= g.threshold ? '★ High score set' : `★ at ${g.threshold}`}</span>
            </li>
          );
        })}
      </ul>
      <div className="gm-stats">
        <div>
          <b className="t-dot">{played}</b>
          <span className="t-label">Runs</span>
        </div>
        <div>
          <b className="t-dot t-heart">{hearts}</b>
          <span className="t-label">Arcade hearts</span>
        </div>
      </div>
      <div className="gm-pins">
        <span className={`chip ${ach.gamer ? 'chip--pink' : ''}`}>▶ Player one</span>
        <span className={`chip ${ach['high-score'] ? 'chip--pink' : ''}`}>★ High score</span>
      </div>
    </div>
  );
}

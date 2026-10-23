/* ==========================================================================
   /launch — "Adelia's Room is opening": the coming-soon page (also shown on
   "/" when launch mode is on in the admin; append ?preview=1 to bypass).

   Her door, still locked: it fills the screen, its blank sign plate has
   become an LED countdown, the keypad LED blinks, and the handle rattles
   if you try it. The copy sits on the wall to the left of the door
   (desktop) or on a card below it (phones/tablets). Hiring teams don't
   have to wait: her CV and her email work from here. The waitlist is
   "tell me when she's available".
   Copy: while content.launch keeps its default title ("Day one"), the page
   says "Adelia's Room is opening"; once the admin writes their own launch
   title and body, the page uses those.
   ========================================================================== */
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { audio, sfx } from '@/audio/engine';
import { track } from '@/lib/api';
import { COMPANY, LAUNCH_DEFAULT } from '@/lib/content';
import { DOOR } from '@/stage/plate';
import { useUI } from '@/state/ui';
import { Icon } from '@/ui/Icon';
import { Countdown, ShareRow, WaitlistForm, formatLaunchDate, useCountdown, useLaunch } from './shared';
import './launch.css';

/* door plate geometry, in source-image pixels (the lead's DOOR in stage/plate.ts) */
const IMG_W = DOOR.w;
const IMG_H = DOOR.h;
const LEAF = DOOR.leaf;
const PLATE = DOOR.sign;
const KEYPAD = DOOR.keypad;
const LED = DOOR.led;
const NOTE = { x: Math.round(LEAF.x + LEAF.w * 0.17), y: Math.round(LEAF.y + LEAF.h * 0.3), w: Math.round(LEAF.w * 0.66) };
const DOOR_CX = LEAF.x + LEAF.w / 2;
/** phones: the door and the keypad both in frame */
const STACK_CX = DOOR_CX + (KEYPAD.x - DOOR_CX) * 0.2;
const DOOR_CY = LEAF.y + LEAF.h * 0.39;
const SIZES: readonly number[] = DOOR.widths;

interface Geo {
  vw: number;
  heroH: number;
  k: number;
  W: number;
  H: number;
  ox: number;
  oy: number;
  wide: boolean;
  src: string;
}

function computeGeo(vw: number, vh: number, copyH: number): Geo {
  const wide = vw >= 1000 && vw / vh >= 1.15;
  const heroH = wide ? Math.max(vh, copyH + 170) : Math.max(560, vh);
  const k = Math.max(vw / IMG_W, heroH / IMG_H);
  const W = IMG_W * k;
  const H = IMG_H * k;
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
  // desktop: door right of centre (copy lives on the left wall); phones: door + keypad in frame
  const ox = wide ? clamp(vw * 0.6 - DOOR_CX * k, vw - W, 0) : clamp(vw / 2 - STACK_CX * k, vw - W, 0);
  const oy = clamp(heroH / 2 - DOOR_CY * k, heroH - H, 0);
  const need = W * Math.min(2.5, window.devicePixelRatio || 1);
  const size = SIZES.find((s) => s >= need) ?? SIZES[SIZES.length - 1];
  return { vw, heroH, k, W, H, ox, oy, wide, src: `/assets/door/door-${size}.webp` };
}

const box = (r: { x: number; y: number; w: number; h?: number }): CSSProperties => ({
  left: `${(r.x / IMG_W) * 100}%`,
  top: `${(r.y / IMG_H) * 100}%`,
  width: `${(r.w / IMG_W) * 100}%`,
  ...(r.h ? { height: `${(r.h / IMG_H) * 100}%` } : {}),
});

/** restart a one-shot CSS animation class */
function restart(el: Element | null, cls: string) {
  if (!el) return;
  el.classList.remove(cls);
  void (el as HTMLElement).offsetWidth;
  el.classList.add(cls);
}

const NOTES = [
  (date: string) => `Not open yet: the room opens ${date}. Try the handle?`,
  (date: string) => `Still locked. It opens ${date}.`,
  () => 'Locked. Nice try though.',
  () => 'Persistent! Leave your email and she’ll send you a note.',
];

/** The default copy, while the admin hasn't written a launch of their own. */
const ROOM_TITLE = 'Adelia’s Room is opening';
const ROOM_SUB = 'Her portfolio, rebuilt as a room you walk into: the work, the toolkit, and a printer that books a chat.';
const ROOM_BODY = 'Hiring before then? You don’t have to wait: her CV and her inbox are open now.';

function useCopy(launch: { title: string; subtitle: string; body: string }) {
  const custom = launch.title !== LAUNCH_DEFAULT.title;
  return {
    title: custom ? launch.title : ROOM_TITLE,
    sub: custom ? launch.subtitle : ROOM_SUB,
    body: custom ? launch.body : ROOM_BODY,
  };
}

function ReachRow({ from }: { from: string }) {
  return (
    <div className="lp-reach">
      <a
        className="btn btn--sm"
        href={COMPANY.cv}
        download="Adelia-Tiara-CV.pdf"
        onClick={() => {
          sfx('click');
          track('cv_download', { from });
        }}
      >
        <Icon name="download" size={14} /> CV (PDF)
      </a>
      <a
        className="btn btn--sm"
        href={`mailto:${COMPANY.email}?subject=${encodeURIComponent('Hello Adelia — from adelia.cc')}`}
        onClick={() => {
          sfx('click');
          track('email', { from });
        }}
      >
        <Icon name="mail" size={14} /> Email her
      </a>
    </div>
  );
}

export default function LaunchPage() {
  const { launch } = useLaunch();
  const copy = useCopy(launch);
  const r = useCountdown(launch.date);
  const heroRef = useRef<HTMLElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const formWrapRef = useRef<HTMLDivElement>(null);
  const [geo, setGeo] = useState<Geo>(() => computeGeo(window.innerWidth, window.innerHeight, 0));
  const [imgReady, setImgReady] = useState(false);
  const [tries, setTries] = useState(0);
  const leafRef = useRef<HTMLButtonElement>(null);
  const ledRef = useRef<HTMLElement>(null);
  const [note, setNote] = useState(0);
  const lastTry = useRef(0);

  const shortDate = (() => {
    const d = new Date(launch.date);
    if (Number.isNaN(d.getTime())) return 'soon';
    return new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'short' }).format(d);
  })();

  /* ---- layout: cover-fit the door plate, keep copy room on the wall ---- */
  const relayout = useCallback(() => {
    const copyH = copyRef.current?.offsetHeight ?? 0;
    setGeo((g) => {
      const n = computeGeo(window.innerWidth, window.innerHeight, copyH);
      const same = Math.abs(n.vw - g.vw) < 1 && Math.abs(n.heroH - g.heroH) < 1 && n.wide === g.wide && n.src === g.src;
      return same ? g : n;
    });
  }, []);
  useLayoutEffect(() => {
    relayout();
    window.addEventListener('resize', relayout);
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(relayout) : null;
    if (copyRef.current && ro) ro.observe(copyRef.current);
    return () => {
      window.removeEventListener('resize', relayout);
      ro?.disconnect();
    };
  }, [relayout]);

  useEffect(() => {
    track('launch_view', { path: location.pathname });
    // honour the visitor's stored mute preference outside the room too
    audio.setMuted(useUI.getState().muted);
  }, []);

  useEffect(() => {
    const prev = document.title;
    document.title = `${copy.title} · ${COMPANY.domain}`;
    return () => {
      document.title = prev;
    };
  }, [copy.title]);

  /* ---- interactions ---- */
  async function tryHandle() {
    const now = Date.now();
    if (now - lastTry.current < 450) return;
    lastTry.current = now;
    await audio.unlock();
    sfx('press', { pitch: -5, gain: 0.9 });
    setTimeout(() => sfx('press', { pitch: -7, gain: 0.7 }), 140);
    setTimeout(() => sfx('error'), 230);
    const n = tries + 1;
    setTries(n);
    restart(leafRef.current, 'is-rattling');
    restart(ledRef.current, 'is-denied');
    setNote(Math.min(n, NOTES.length - 1));
    track('door_try', { n });
    if (n === 3) {
      setTimeout(() => {
        if (!geo.wide) formWrapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        emailRef.current?.focus({ preventScroll: true });
      }, 700);
    }
  }

  async function tryKeypad() {
    await audio.unlock();
    sfx('beep', { pitch: 7 });
    setTimeout(() => sfx('beep', { pitch: 7 }), 120);
    setTimeout(() => sfx('error'), 260);
    restart(ledRef.current, 'is-denied');
    setNote(3);
    track('keypad_try');
  }

  const sceneStyle: CSSProperties = {
    width: geo.W,
    height: geo.H,
    transform: `translate3d(${geo.ox}px, ${geo.oy}px, 0)`,
    ['--k' as string]: geo.k,
  };
  const leafStyle: CSSProperties = {
    ...box(LEAF),
    backgroundImage: `url(${geo.src})`,
    backgroundSize: `${geo.W}px ${geo.H}px`,
    backgroundPosition: `${-LEAF.x * geo.k}px ${-LEAF.y * geo.k}px`,
  };
  const ledStyle: CSSProperties = { left: `${(LED.x / IMG_W) * 100}%`, top: `${(LED.y / IMG_H) * 100}%` };
  const doorLeftPx = LEAF.x * geo.k + geo.ox;
  const doorRightPx = (LEAF.x + LEAF.w) * geo.k + geo.ox;
  const noteText = NOTES[note](shortDate);
  const done = r.valid && r.done;

  return (
    <div className={`lp ${geo.wide ? 'lp--wide' : 'lp--stack'}`} style={{ ['--door-left' as string]: `${doorLeftPx}px`, ['--door-right' as string]: `${doorRightPx}px` }}>
      <section className="lp-hero" ref={heroRef} style={{ height: geo.heroH }} aria-label={`${launch.title} — coming soon`}>
        <div className={`lp-scene ${imgReady ? 'is-ready' : ''}`} style={sceneStyle}>
          <img className="lp-door" src={geo.src} alt="" width={IMG_W} height={IMG_H} decoding="async" fetchPriority="high" onLoad={() => setImgReady(true)} draggable={false} />
          <div className="lp-glow" aria-hidden style={box({ x: LEAF.x - 120, y: LEAF.y + LEAF.h - 40, w: LEAF.w + 240, h: 260 })} />
          {/* the door leaf (same pixels, own layer) so it can rattle */}
          <button
            ref={leafRef}
            type="button"
            className="lp-leaf"
            style={leafStyle}
            onClick={tryHandle}
            aria-label="Try the door handle: the room is still locked"
          >
            <span className="lp-note" style={{ left: `${((NOTE.x - LEAF.x) / LEAF.w) * 100}%`, top: `${((NOTE.y - LEAF.y) / LEAF.h) * 100}%`, width: `${(NOTE.w / LEAF.w) * 100}%` }}>
              <span className="lp-note__k">Adelia’s Room · RM-00</span>
              <span className="lp-note__t" key={note}>
                {noteText}
              </span>
            </span>
          </button>
          <span className="sr-only" aria-live="polite">
            {tries ? noteText : ''}
          </span>
          {/* blank sign plate → LED countdown */}
          <div className="lp-sign" style={box(PLATE)}>
            <div className="lp-sign__screen">
              {done ? <span className="lp-sign__open t-dot">OPEN</span> : <Countdown r={r} className="lc-count--plate" />}
            </div>
          </div>
          {/* keypad + status LED */}
          <button type="button" className="lp-keypad" style={box(KEYPAD)} onClick={tryKeypad} aria-label="Keypad: not taking codes until the room opens" />
          <i ref={ledRef} className="lp-led" style={ledStyle} aria-hidden />
        </div>

        <div className="lp-shade" aria-hidden />

        <header className="lp-top">
          <a className="lp-brand" href="/launch" aria-label={`${COMPANY.domain}: coming soon`}>
            <b>adelia</b>
            <span>.cc</span>
          </a>
          <span className="lp-top__label t-label">
            {COMPANY.name} · {COMPANY.role} · {COMPANY.cohort} · {COMPANY.city}
          </span>
          <a className="btn btn--sm lp-preview" href="/?preview=1" onClick={() => sfx('click')}>
            Preview<span className="lp-preview__more"> the room</span> <Icon name="arrow-right" size={14} />
          </a>
        </header>

        {geo.wide ? (
          <div className="lp-copy">
           <div className="lp-copy__in" ref={copyRef}>
            <CopyBlock launch={launch} copy={copy} r={r} />
            <div className="lp-panel surface" ref={formWrapRef}>
              <div className="screws">
                <i />
                <i />
                <i />
                <i />
              </div>
              <span className="t-label lp-panel__k">
                <span className="led led--blue led--blink" aria-hidden /> Tell me when she’s available
              </span>
              <WaitlistForm source="launch-page" launchTitle={copy.title} inputRef={emailRef} promise="when the door opens" />
            </div>
           </div>
          </div>
        ) : (
          <div className="lp-card surface">
            <div className="screws">
              <i />
              <i />
              <i />
              <i />
            </div>
            <span className="t-label">
              <b className="t-primary">{done ? 'Now open' : 'Coming soon'}</b> · {formatLaunchDate(launch.date, { short: true, weekday: false })}
            </span>
            <h1 className="t-title lp-title" style={{ ['--ts' as string]: titleScale(copy.title) }}>
              {copy.title}
            </h1>
            <p className="lp-sub">{copy.sub}</p>
            <button
              type="button"
              className="btn btn--primary btn--block"
              onClick={() => {
                sfx('click');
                formWrapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                setTimeout(() => emailRef.current?.focus({ preventScroll: true }), 500);
              }}
            >
              Tell me when she’s available <Icon name="arrow-right" size={14} />
            </button>
          </div>
        )}

        {geo.wide && (
          <footer className="lp-foot lp-foot--floor">
            <Footer />
          </footer>
        )}
      </section>

      {!geo.wide && (
        <>
          <section className="lp-more" ref={formWrapRef} aria-label="Tell me when she’s available">
            <div className="lp-lcd lcd">
              <span className="t-label lp-lcd__k">{done ? 'The door is open' : 'T-minus · Bekasi time (WIB)'}</span>
              <Countdown r={r} className="lc-count--lcd" />
            </div>
            <p className="lp-body">{copy.body}</p>
            <ReachRow from="launch" />
            <div className="lp-panel surface">
              <div className="screws">
                <i />
                <i />
                <i />
                <i />
              </div>
              <span className="t-label lp-panel__k">
                <span className="led led--blue led--blink" aria-hidden /> Tell me when she’s available
              </span>
              <WaitlistForm source="launch-page" launchTitle={copy.title} inputRef={emailRef} promise="when the door opens" />
            </div>
            <a className="btn btn--dark btn--block" href="/?preview=1" onClick={() => sfx('click')}>
              Preview the room <Icon name="arrow-right" size={14} />
            </a>
            <div className="lp-sharewrap">
              <span className="t-label">Know a team that’s hiring?</span>
              <ShareRow title={copy.title} />
            </div>
          </section>
          <footer className="lp-foot">
            <Footer />
          </footer>
        </>
      )}
    </div>
  );
}

function CopyBlock({ launch, copy, r }: { launch: ReturnType<typeof useLaunch>['launch']; copy: ReturnType<typeof useCopy>; r: ReturnType<typeof useCountdown> }) {
  const done = r.valid && r.done;
  return (
    <div className="lp-copy__text">
      <span className="t-label lp-kicker">
        <b className="t-primary">{done ? 'Now open' : 'Coming soon'}</b> · The door is still locked
      </span>
      <h1 className="t-title lp-title" style={{ ['--ts' as string]: titleScale(copy.title) }}>
        {copy.title}
      </h1>
      <p className="lp-sub">{copy.sub}</p>
      <p className="lp-body">{copy.body}</p>
      <ReachRow from="launch" />
      <dl className="lp-meta">
        <div>
          <dt className="t-label">Opens</dt>
          <dd>{formatLaunchDate(launch.date)}</dd>
        </div>
        <div>
          <dt className="t-label">From</dt>
          <dd>Bekasi · WIB (UTC+7)</dd>
        </div>
      </dl>
    </div>
  );
}

const titleScale = (t: string) => (t.length <= 8 ? 1 : t.length <= 14 ? 0.68 : t.length <= 26 ? 0.52 : 0.4);

function Footer() {
  return (
    <>
      <a
        href={`mailto:${COMPANY.email}`}
        onClick={() => track('email', { from: 'launch-footer' })}
      >
        {COMPANY.email}
      </a>
      <i aria-hidden>·</i>
      <span>{COMPANY.city} · WIB</span>
      <i aria-hidden>·</i>
      <span>{COMPANY.cohort}</span>
      <span className="lp-foot__tag">{COMPANY.tagline}</span>
    </>
  );
}

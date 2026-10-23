/* ==========================================================================
   HUD — the minimal chrome around the room (objects, not app chrome).
   Clear-tech instrument panel over the pink room.
   top-left     acrylic brand plate · live Bekasi readout (WIB)
   top-centre   chapter title (or station code/name when focused)
   top-right    hearts LCD (♥ + tier) · Guest Pass (House Rules x/5) · index
   sides        chapter arrows        bottom  acrylic caption (how it works)
   bottom-left  "Book a chat" (graphite key, walks to the printer) · quiet "CV" (/cv.pdf)
   bottom-right hold-to-reveal · sound
   ========================================================================== */
import { useEffect, useRef, useState } from 'react';
import { useUI } from '@/state/ui';
import { useGame } from '@/state/game';
import { tierFor } from '@/state/achievements';
import { audio, sfx } from '@/audio/engine';
import { music } from '@/audio/music';
import { useWeather, formatTime } from '@/lib/weather';
import { track } from '@/lib/api';
import { CHAPTERS } from '@/lib/content';
import { PANEL_LAYOUT, STATIONS, STATION_LIST, VIEWPOINTS } from '@/stage/stations';
import { back, focus as walkTo, goView } from '@/stage/director';
import { Icon, Mark } from './Icon';
import './hud.css';

function useNow(ms = 1000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

function AnimatedNumber({ value }: { value: number }) {
  const [shown, setShown] = useState(value);
  const raf = useRef(0);
  useEffect(() => {
    const from = shown;
    const start = performance.now();
    cancelAnimationFrame(raf.current);
    const step = (t: number) => {
      const k = Math.min(1, (t - start) / 700);
      setShown(Math.round(from + (value - from) * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return <>{shown.toLocaleString('en-US')}</>;
}

export function Hud() {
  const phase = useUI((s) => s.phase);
  const focus = useUI((s) => s.focus);
  const panel = useUI((s) => s.panel);
  const found = useUI((s) => s.found);
  const view = useUI((s) => s.view);
  const hovered = useUI((s) => s.hovered);
  const busy = useUI((s) => s.cameraBusy);
  const muted = useUI((s) => s.muted);
  const points = useGame((s) => s.points);
  const manifesto = useGame((s) => s.manifesto);
  const lines = Object.keys(manifesto).length;
  // the room's live weather is Bekasi (store key kept from dside)
  const bks = useWeather((s) => s.home);
  const now = useNow();
  const [pulse, setPulse] = useState(false);

  // pulse the points chip on change
  const prev = useRef(points);
  useEffect(() => {
    if (points !== prev.current) {
      prev.current = points;
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 600);
      return () => clearTimeout(t);
    }
  }, [points]);

  // keys → chapter navigation (wheel / drag / swipe glide is handled by the stage)
  useEffect(() => {
    if (phase !== 'room') return;
    let lock = 0;
    const canNav = () => {
      const s = useUI.getState();
      return !s.panel && !s.found && !s.menuOpen && performance.now() > lock;
    };
    const typing = (e: KeyboardEvent) => !!(e.target as HTMLElement)?.closest?.('input, textarea, select, [contenteditable]');
    const onKey = (e: KeyboardEvent) => {
      if (typing(e)) return;
      if (e.key === 'Escape') {
        const s = useUI.getState();
        if (s.menuOpen) s.setMenuOpen(false);
        else if (!s.panel) back();
        return;
      }
      if (e.key === '?' || e.key === 'h') useUI.getState().setFlag('reveal', true);
      if (!canNav()) return;
      if (e.key === 'ArrowRight') {
        lock = performance.now() + 450;
        goView(1);
      } else if (e.key === 'ArrowLeft') {
        lock = performance.now() + 450;
        goView(-1);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === '?' || e.key === 'h') useUI.getState().setFlag('reveal', false);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [phase]);

  if (phase !== 'room' && phase !== 'entering') return null;
  const touch = typeof matchMedia !== 'undefined' && matchMedia('(hover: none)').matches;
  const entering = phase === 'entering';
  const vp = VIEWPOINTS[view];
  const chapter = CHAPTERS.find((c) => c.id === vp.id);
  const st = focus ? STATIONS[focus] : null;
  const hov = hovered ? STATIONS[hovered] : null;
  const tier = tierFor(points);
  const covered = !!panel || !!found;
  // up close on a device or paper, the HUD steps out of the way entirely
  const closeup = !!panel && PANEL_LAYOUT[panel] === 'stage';

  const toggleMute = () => {
    const m = !muted;
    useUI.getState().setMuted(m);
    audio.setMuted(m);
    if (!m) {
      sfx('switch');
      if (!music.playing) music.play();
    }
  };

  // instruction card copy: a mono label line + the sentence
  let note: { icon: Parameters<typeof Icon>[0]['name']; label: React.ReactNode; text: React.ReactNode } | null = null;
  if (hov && !focus) note = { icon: hov.icon, label: <>{hov.code} · {hov.name}</>, text: <>{hov.verb}</> };
  else if (!focus && vp.id === 'overview')
    note = {
      icon: 'arrow-right',
      label: <>How it works</>,
      text: (
        <>
          {touch ? 'Swipe to walk the room.' : 'Move your mouse to look around. Scroll or click to walk over.'}{' '}
          <em>Everything here works</em>: {touch ? 'tap an object to open it.' : 'hover an object to see what it does.'}
        </>
      ),
    };
  else if (!focus && chapter) {
    const key = STATION_LIST.find((x) => x.manifesto === chapter.id);
    const written = !!manifesto[chapter.id];
    note = {
      icon: key?.icon ?? STATIONS[vp.stations[0]].icon,
      label: (
        <>
          <i className={`led ${written ? '' : 'led--off'}`} aria-hidden /> House rule {chapter.roman} · {written ? 'written' : 'not found yet'}
        </>
      ),
      text: (
        <>
          <span className="hud__body">{chapter.body}</span>
          {!written && <span className="hud__quest">Find {key?.name.replace(/^The /, 'the ') ?? 'it'} to write it.</span>}
        </>
      ),
    };
  }

  return (
    <div className={`hud ${entering ? 'is-entering' : ''} ${covered ? 'is-covered' : ''} ${closeup ? 'is-closeup' : ''}`}>
      {/* top-left: who and where */}
      <div className="hud__tl">
        <button
          className="hud__logo"
          onClick={() => {
            if (useUI.getState().focus) back();
            else if (view !== 0) {
              sfx('whoosh');
              useUI.getState().setView(0);
            }
          }}
          aria-label="Adelia’s Room, adelia.cc: back to the whole room"
        >
          <Mark size={28} className="hud__mark" />
          <span className="hud__brand">
            <b>Adelia’s Room</b>
            <span>adelia.cc</span>
          </span>
        </button>
        <div className="hud__live" title="Live in Bekasi, West Java (WIB, UTC+7)">
          <span className="led led--green led--blink" aria-hidden />
          <span className="t-label hud__city">Bekasi</span>
          <span className="readout">{formatTime(undefined, now)}</span>
          <span className="t-label">
            WIB<span className="hud__wx"> · {Math.round(bks.temp)}°C {bks.label.toLowerCase()}</span>
          </span>
        </div>
      </div>

      {/* top-centre */}
      <div className="hud__title" key={'t-' + (st ? st.id : vp.id)}>
        {st ? (
          <>
            <span className="nameplate">{st.code}</span>
            <h1>{st.name}</h1>
          </>
        ) : chapter ? (
          <>
            <span className="t-label">Chapter {chapter.roman}</span>
            <h1>{chapter.title}</h1>
          </>
        ) : (
          <>
            <span className="t-label">{vp.id === 'overview' ? 'RM-00 · Bekasi' : 'Epilogue'}</span>
            <h1>{vp.label}</h1>
          </>
        )}
      </div>

      {/* top-right: your hearts, the Guest Pass, the index */}
      <div className="hud__tr">
        <div className={`hud__points ${pulse ? 'is-pulse' : ''}`} title={`${points} hearts · ${tier.name}`} role="img" aria-label={`${points} hearts, tier ${tier.name}`}>
          <span className="hud__heart" aria-hidden>♥</span>
          <span className="t-dot" aria-hidden>
            <AnimatedNumber value={points} />
          </span>
          <span className="hud__tier" aria-hidden>{tier.name}</span>
        </div>
        <button
          className="hud__square"
          onClick={() => {
            sfx('paper');
            useUI.getState().openPanel('pass');
          }}
          aria-label={`Guest Pass and House Rules, ${lines} of 5 written`}
          title="Guest Pass · House Rules"
        >
          <Icon name="card" size={20} />
          <span className="hud__badge" aria-hidden>{lines}/5</span>
        </button>
        <button
          className="hud__square"
          onClick={() => {
            sfx('click');
            useUI.getState().setMenuOpen(true);
          }}
          aria-label="Menu: everything in the room"
          title="Index"
        >
          <Icon name="menu" size={20} />
        </button>
      </div>

      {/* back */}
      {focus && !covered && (
        <button className="hud__square hud__back" onClick={back} aria-label="Back">
          <Icon name="back" size={20} />
        </button>
      )}

      {/* chapter arrows */}
      {!focus && (
        <>
          <button className={`hud__arrow hud__arrow--l ${busy ? 'is-busy' : ''}`} onClick={() => goView(-1)} aria-label="Previous chapter">
            <Icon name="arrow-left" size={20} />
          </button>
          <button className={`hud__arrow hud__arrow--r ${busy ? 'is-busy' : ''}`} onClick={() => goView(1)} aria-label="Next chapter">
            <Icon name="arrow-right" size={20} />
          </button>
          <div className="hud__dots" aria-hidden>
            {VIEWPOINTS.map((v, i) => (
              <i key={v.id} className={i === view ? 'on' : ''} />
            ))}
            <span className="t-spec">
              {String(view + 1).padStart(2, '0')}/{String(VIEWPOINTS.length).padStart(2, '0')}
            </span>
          </div>
        </>
      )}

      {/* instruction card */}
      {note && !entering && (
        <div className="hud__note" key={'n-' + (hov?.id ?? '') + vp.id}>
          <div className="note-card">
            <span className="note-card__icon">
              <Icon name={note.icon} size={20} />
            </span>
            <span className="hud__note-text">
              <span className="t-label hud__note-label">{note.label}</span>
              <span>{note.text}</span>
            </span>
          </div>
        </div>
      )}

      {/* bottom-left: conversion (C2B first). Book a chat walks to the printer; the CV opens the PDF. */}
      <div className="hud__cta">
        <button
          className="btn btn--primary hud__book"
          onClick={() => {
            sfx('open');
            if (useUI.getState().focus === 'printer') useUI.getState().openPanel('rsvp');
            else walkTo('printer');
          }}
        >
          <Icon name="calendar" size={17} stroke={1.8} /> Book a chat
        </button>
        <a
          className="btn hud__cv"
          href="/cv.pdf"
          target="_blank"
          rel="noopener"
          onClick={() => {
            sfx('paper');
            track('cv_open', { from: 'hud' });
          }}
          aria-label="Her CV (PDF, opens in a new tab)"
        >
          <Icon name="file" size={16} /> CV <span className="hud__cv-tag">PDF</span>
        </a>
      </div>

      {/* bottom-right: hold to reveal what's interactive (no markers on the room) */}
      <button
        className="hud__square hud__reveal"
        onPointerDown={() => {
          useUI.getState().setFlag('reveal', true);
          sfx('switch');
        }}
        onPointerUp={() => useUI.getState().setFlag('reveal', false)}
        onPointerLeave={() => useUI.getState().setFlag('reveal', false)}
        aria-label="Hold to show everything you can touch"
        title="Hold to show what opens (or hold H)"
      >
        <Icon name="eye" size={21} />
      </button>

      {/* bottom-right: sound */}
      <button className="hud__square hud__sound" onClick={toggleMute} aria-label={muted ? 'Unmute' : 'Mute'}>
        <Icon name={muted ? 'mute' : 'sound'} size={20} />
        {!muted && <span className="hud__eq" aria-hidden><i /><i /><i /></span>}
      </button>
    </div>
  );
}

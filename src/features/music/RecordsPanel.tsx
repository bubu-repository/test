/* ==========================================================================
   The turntable (RM-22) — Adelia’s sound system: a now-playing deck
   (spinning vinyl, tonearm, elapsed time, live spectrum, transport, volume)
   and two crates: the four records synthesised in the room (generative
   sleeves, A/B sides; the B-side "Last Train Home" unlocks at the Guest
   tier) and her own records (content/playlist.ts), which open on YouTube
   in a new tab (no embeds: the CSP has no frame-src).
   ========================================================================== */
import { useEffect, useRef, useState } from 'react';
import { Sheet } from '@/ui/Panel';
import { Icon } from '@/ui/Icon';
import { audio, sfx } from '@/audio/engine';
import { music, trackLength } from '@/audio/music';
import { TRACKS, type TrackId } from '@/lib/content';
import { game, useGame } from '@/state/game';
import { useUI } from '@/state/ui';
import { TIERS, tierFor } from '@/state/achievements';
import { playlist } from '@/content/playlist';
import { track } from '@/lib/api';
import { cover, coversReady } from './covers';
import { useMusic, raf } from './useMusic';
import './records.css';

/** The B-side is a Guest-tier perk (TIERS: 'proof' = Guest). */
const GUEST = TIERS.find((t) => t.id === 'proof')!;
const GATED: Partial<Record<TrackId, typeof GUEST>> = { 'senopati-nights': GUEST };
const B_SIDE = TRACKS.find((t) => t.id === 'senopati-nights')!;

const fmt = (s: number) => {
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
};

function useCovers() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let live = true;
    coversReady().then(() => live && setReady(true));
    return () => {
      live = false;
    };
  }, []);
  return ready;
}

/* ---------------------------------------------------------- spectrum */
function Spectrum({ active }: { active: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    const g = c?.getContext('2d');
    if (!c || !g) return;
    const COLS = 28;
    const ROWS = 9;
    let data: Uint8Array<ArrayBuffer> | null = null;
    const levels = new Float32Array(COLS);
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let frame = 0;
    return raf(() => {
      frame++;
      if (reduce && frame % 4) return;
      const dpr = Math.min(2, devicePixelRatio || 1);
      const w = c.clientWidth;
      const h = c.clientHeight;
      if (c.width !== Math.round(w * dpr)) {
        c.width = Math.round(w * dpr);
        c.height = Math.round(h * dpr);
      }
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, w, h);
      const a = music.analyser;
      if (a) {
        if (!data || data.length !== a.frequencyBinCount) data = new Uint8Array(a.frequencyBinCount);
        music.getSpectrum(data);
        const nyq = a.context.sampleRate / 2;
        for (let i = 0; i < COLS; i++) {
          // log-spaced bands 40 Hz → 14 kHz
          const f0 = 40 * Math.pow(350, i / COLS);
          const f1 = 40 * Math.pow(350, (i + 1) / COLS);
          const b0 = Math.floor((f0 / nyq) * data.length);
          const b1 = Math.max(b0 + 1, Math.floor((f1 / nyq) * data.length));
          let m = 0;
          for (let b = b0; b < b1 && b < data.length; b++) m = Math.max(m, data[b]);
          const v = active ? Math.min(1, Math.max(0, (m / 255 - 0.28) / 0.62) * (1 + i / COLS / 2)) : 0;
          levels[i] = v > levels[i] ? v : levels[i] * 0.86;
        }
      } else levels.fill(0);
      const cw = w / COLS;
      const rh = h / ROWS;
      for (let i = 0; i < COLS; i++) {
        const lit = Math.round(levels[i] * ROWS);
        for (let r = 0; r < ROWS; r++) {
          const on = r < lit;
          g.fillStyle = on ? (r >= ROWS - 2 ? '#ff7eb6' : '#a9d6f5') : 'rgba(255,255,255,0.07)';
          g.fillRect(i * cw + cw * 0.18, h - (r + 1) * rh + rh * 0.2, cw * 0.64, rh * 0.6);
        }
      }
    });
  }, [active]);
  return (
    <div className="rec-spectrum" aria-hidden>
      <canvas ref={ref} />
    </div>
  );
}

/* -------------------------------------------------------------- deck */
function Deck({ id, art, playing, muted, onToggle, onPrev, onNext }: { id: TrackId | null; art: string; playing: boolean; muted: boolean; onToggle: () => void; onPrev: () => void; onNext: () => void }) {
  const t = TRACKS.find((x) => x.id === id) ?? null;
  const time = useRef<HTMLSpanElement>(null);
  const sect = useRef<HTMLSpanElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const [vol, setVol] = useState(Math.round(music.volume * 100));

  useEffect(
    () =>
      raf(() => {
        const p = music.position();
        if (time.current) time.current.textContent = `${fmt(p.elapsed)}/${fmt(p.duration)}`;
        if (bar.current) bar.current.style.transform = `scaleX(${p.duration ? p.elapsed / p.duration : 0})`;
        const inf = music.info();
        if (sect.current) sect.current.textContent = inf ? `${music.playing ? inf.section.toUpperCase() : 'PAUSE'} ${String(inf.bar + 1).padStart(2, '0')}/${inf.bars}` : 'NO RECORD';
      }),
    [],
  );

  return (
    <section className={`rec-deck ${playing ? 'is-playing' : ''}`} aria-label="Now playing">
      <div className="rec-deck__plinth">
        <div className="rec-platter">
          <div className="rec-vinyl" style={{ ['--label' as string]: art ? `url(${art})` : 'none' }} />
        </div>
        <div className="rec-arm" aria-hidden>
          <i className="rec-arm__pivot" />
          <i className="rec-arm__tube" />
          <i className="rec-arm__head" />
        </div>
        <div className="rec-deck__badge t-label">
          33⅓
          <br />
          RPM
        </div>
      </div>

      <div className="rec-lcd lcd">
        <div className="rec-lcd__row t-dot">
          <span className="rec-lcd__side">{t ? t.side : '--'}</span>
          <span className="rec-lcd__title">{t ? t.title.toUpperCase() : 'PICK A RECORD'}</span>
          <span className={`led ${playing ? 'led--green' : 'led--off'}`} />
        </div>
        <Spectrum active={playing} />
        <div className="rec-lcd__row rec-lcd__meta t-dot">
          <span ref={sect}>NO RECORD</span>
          <span ref={time}>00:00/00:00</span>
        </div>
        <div className="rec-lcd__progress">
          <div ref={bar} />
        </div>
        {muted && (
          <button
            className="rec-lcd__muted t-dot"
            onClick={() => {
              useUI.getState().setMuted(false);
              audio.setMuted(false);
              sfx('switch');
            }}
          >
            SOUND IS OFF · TAP TO TURN ON
          </button>
        )}
      </div>

      <div className="rec-controls">
        <div className="rec-transport">
          <button className="btn btn--icon" onClick={onPrev} aria-label="Previous record">
            <Icon name="arrow-left" size={18} />
          </button>
          <button className="btn btn--icon btn--primary btn--lg rec-play" onClick={onToggle} aria-label={playing ? 'Pause' : 'Play'}>
            <Icon name={playing ? 'pause' : 'play'} size={20} />
          </button>
          <button className="btn btn--icon" onClick={onNext} aria-label="Next record">
            <Icon name="arrow-right" size={18} />
          </button>
        </div>
        <label className="rec-vol">
          <span className="t-label">Vol</span>
          <input
            type="range"
            min={0}
            max={100}
            value={vol}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (Math.round(v / 5) !== Math.round(vol / 5)) sfx('knob', { pitch: v / 8 - 6 });
              setVol(v);
              music.setVolume(v / 100);
            }}
            aria-label="Music volume"
            style={{ ['--p' as string]: `${vol}%` }}
          />
          <span className="t-mono rec-vol__val">{String(vol).padStart(2, '0')}</span>
        </label>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------- her records */
function HerRecords() {
  const listen = (id: string) => {
    sfx('sleeve');
    track('cta', { from: 'records', to: 'youtube', song: id });
    // the room's record stops so the two never play over each other
    if (music.playing) music.pause();
  };
  return (
    <div className="rec-hers">
      <ul className="rec-hers__list">
        {playlist.map((s, i) => (
          <li key={s.id} className="rec-hers__item" style={{ ['--i' as string]: i }}>
            <span className="rec-hers__disc" aria-hidden />
            <div className="rec-hers__txt">
              <b>{s.title}</b>
              {s.original && <span className="rec-hers__orig">{s.original}</span>}
              <span className="t-label">{s.artist}</span>
            </div>
            <a
              className="btn btn--sm rec-hers__go"
              href={`https://www.youtube.com/watch?v=${encodeURIComponent(s.youtubeId)}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => listen(s.id)}
              aria-label={`Listen to ${s.title} by ${s.artist} on YouTube (opens in a new tab)`}
            >
              YouTube <Icon name="arrow-up-right" size={14} />
            </a>
          </li>
        ))}
      </ul>
      <p className="rec-note t-label">Songs she keeps coming back to. Each one opens on YouTube in a new tab, and the turntable pauses.</p>
    </div>
  );
}

/* -------------------------------------------------------------- panel */
type Crate = 'room' | 'hers';

export default function RecordsPanel() {
  const { current, playing, muted } = useMusic();
  const points = useGame((s) => s.points);
  const fontsReady = useCovers();
  const [denied, setDenied] = useState<TrackId | null>(null);
  const [dropping, setDropping] = useState<TrackId | null>(null);
  const [crate, setCrate] = useState<Crate>('room');
  const tierIdx = TIERS.indexOf(tierFor(points));
  const locked = (id: TrackId) => {
    const g = GATED[id];
    return !!g && tierIdx < TIERS.indexOf(g);
  };

  useEffect(() => {
    if (!denied) return;
    const t = window.setTimeout(() => setDenied(null), 2400);
    return () => clearTimeout(t);
  }, [denied]);

  const drop = (id: TrackId) => {
    if (locked(id)) {
      sfx('error');
      setDenied(id);
      return;
    }
    if (music.current === id && music.playing) {
      sfx('click');
      return;
    }
    sfx('sleeve');
    setDropping(id);
    window.setTimeout(() => {
      sfx('needle');
      sfx('scratch');
      music.play(id);
      setDropping(null);
    }, 240);
    const g = game();
    g.unlock('selector');
    g.updateStats((s) => ({ tracksPlayed: [...new Set([...s.tracksPlayed, id])] }));
  };

  const playable = TRACKS.filter((t) => !locked(t.id)).map((t) => t.id);
  const step = (d: 1 | -1) => {
    const i = playable.indexOf(current ?? playable[0]);
    drop(playable[(i + d + playable.length) % playable.length]);
  };
  const toggle = () => {
    sfx('switch');
    if (music.playing) music.pause();
    else if (music.current && !locked(music.current)) music.play(music.current);
    else drop(playable[0]);
  };
  const pickCrate = (c: Crate) => {
    if (c === crate) return;
    sfx('click');
    setCrate(c);
  };

  return (
    <Sheet code="RM-22" kicker="Adelia’s sound system" title="The turntable" className="rec-sheet">
      <Deck id={current} art={fontsReady && current ? cover(current, 256) : ''} playing={playing} muted={muted} onToggle={toggle} onPrev={() => step(-1)} onNext={() => step(1)} />

      <div className="rec-tabs" role="tablist" aria-label="Crates">
        <button role="tab" id="rec-tab-room" aria-selected={crate === 'room'} aria-controls="rec-crate" className={crate === 'room' ? 'is-on' : ''} onClick={() => pickCrate('room')}>
          Made in the room <span className="t-spec">{TRACKS.length}</span>
        </button>
        <button role="tab" id="rec-tab-hers" aria-selected={crate === 'hers'} aria-controls="rec-crate" className={crate === 'hers' ? 'is-on' : ''} onClick={() => pickCrate('hers')}>
          Her records <span className="t-spec">{playlist.length}</span>
        </button>
      </div>

      <div id="rec-crate" role="tabpanel" aria-labelledby={crate === 'room' ? 'rec-tab-room' : 'rec-tab-hers'}>
        {crate === 'hers' ? (
          <HerRecords />
        ) : (
          <>
            <div className="rec-crate" role="list">
              {TRACKS.map((t, i) => {
                const isLocked = locked(t.id);
                const gate = GATED[t.id];
                const now = current === t.id;
                return (
                  <div role="listitem" key={t.id} className="rec-item" style={{ ['--i' as string]: i }}>
                    <button
                      className={`rec-sleeve ${now ? 'is-now' : ''} ${now && playing ? 'is-playing' : ''} ${isLocked ? 'is-locked' : ''} ${denied === t.id ? 'is-denied' : ''} ${dropping === t.id ? 'is-dropping' : ''}`}
                      onClick={() => drop(t.id)}
                      onPointerEnter={() => sfx('hover')}
                      aria-label={`${t.side} · ${t.title}: ${t.mood}, ${t.bpm} BPM${isLocked ? `, locked until the ${gate!.name} tier` : now && playing ? ', now playing' : ''}`}
                    >
                      <span className="rec-sleeve__disc" aria-hidden />
                      <span className="rec-sleeve__art">{fontsReady && <img src={cover(t.id)} alt="" draggable={false} />}</span>
                      {now && playing && (
                        <span className="rec-sleeve__now t-label">
                          <i />
                          <i />
                          <i />
                          Now playing
                        </span>
                      )}
                      {isLocked && gate && (
                        <span className="rec-sleeve__lock">
                          <Icon name="lock" size={22} />
                          <b className="t-label">{gate.name} tier</b>
                          <span className="t-mono">{denied === t.id ? `${Math.max(0, gate.min - points)} ♥ to go` : `${points}/${gate.min} ♥`}</span>
                          <span className="rec-sleeve__meter">
                            <i style={{ width: `${Math.min(100, (points / gate.min) * 100)}%` }} />
                          </span>
                        </span>
                      )}
                    </button>
                    <div className="rec-meta">
                      <span className={`rec-meta__side ${now ? 'is-now' : ''}`}>{t.side}</span>
                      <div>
                        <b>{t.title}</b>
                        <span className="t-label">
                          {t.mood} · {t.bpm} BPM · {fmt(trackLength(t.id))}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className={`rec-note t-label ${denied ? 'is-denied' : ''}`} aria-live="polite">
              {denied
                ? `${B_SIDE.side} · ${B_SIDE.title} is a ${GUEST.name}-tier perk: collect ${Math.max(0, GUEST.min - points)} more hearts around the room.`
                : 'Every track is synthesised live in your browser: no audio files. Made in Bekasi.'}
            </p>
          </>
        )}
      </div>
    </Sheet>
  );
}

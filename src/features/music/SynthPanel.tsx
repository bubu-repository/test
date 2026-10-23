/* ==========================================================================
   The synth (RM-16) — "AS-30 · Adelia’s sound system", after the
   baby-blue keyboard on her desk.
   16 velocity-feel pads (4 drums + 12 notes), QWERTY-mapped; a 4 × 16 step
   sequencer with REC, presets, randomise/clear; TEMPO / SWING / FILTER /
   DECAY / LEVEL knobs; an OLED oscilloscope fed by the master analyser.
   The BGM ducks while the sequencer runs.
   ========================================================================== */
import { useCallback, useEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { Stage } from '@/ui/Panel';
import { Icon } from '@/ui/Icon';
import { audio, sfx } from '@/audio/engine';
import { music } from '@/audio/music';
import { useUI } from '@/state/ui';
import { game } from '@/state/game';
import { Knob } from './Knob';
import { useMusic, raf } from './useMusic';
import { PRESETS, SCALES, TRACK_NAMES, activeSteps, emptyPattern, noteLabel, po30, randomPattern, type InstId, type Pattern, type ScaleId, type Settings } from './po30';
import './synth.css';

const KEYS = ['1', '2', '3', '4', 'q', 'w', 'e', 'r', 'a', 's', 'd', 'f', 'z', 'x', 'c', 'v'];
/** visual grid (top→bottom rows) → pad index. Notes ascend bottom-left → top-right. */
const GRID = [0, 1, 2, 3, 12, 13, 14, 15, 8, 9, 10, 11, 4, 5, 6, 7];
const KEY_FOR_PAD: Record<number, string> = {};
GRID.forEach((pad, cell) => (KEY_FOR_PAD[pad] = KEYS[cell]));
const PAD_FOR_KEY: Record<string, number> = {};
GRID.forEach((pad, cell) => (PAD_FOR_KEY[KEYS[cell]] = pad));
const DRUMS = ['Kick', 'Snare', 'Hat', 'Bell'];
const INSTS: { id: InstId; label: string }[] = [
  { id: 'synth', label: 'Synth' },
  { id: 'keys', label: 'Keys' },
  { id: 'bell', label: 'Bell' },
];

/** grid column of step s (an empty gutter column after every beat) */
const col = (s: number) => 2 + s + Math.floor(s / 4);
const clonePattern = (p: Pattern): Pattern => ({ steps: p.steps.map((r) => r.slice()), notes: p.notes.slice() });
const settingsOf = (): Settings => ({ bpm: po30.bpm, swing: po30.swing, cutoff: po30.cutoff, decay: po30.decay, level: po30.level, scale: po30.scale, inst: po30.inst });
const patternKey = (p: Pattern) => p.steps.map((r) => r.join('')).join('|') + ':' + p.notes.join(',');

/** last pattern counted towards stats.patternsMade (once per distinct pattern) */
const counted = { current: null as string | null };

// first open: start on a preset so the device is immediately playable
let initialised = false;
function init() {
  if (initialised) return;
  initialised = true;
  const p = PRESETS[0];
  (Object.keys(settingsOf()) as (keyof Settings)[]).forEach((k) => po30.set(k, p[k] as never));
  po30.pattern = clonePattern(p.pattern);
}

/* ------------------------------------------------------------- OLED */
function Oled({ flash, preset, settings, playing, rec, muted }: { flash: { label: string; text: string } | null; preset: string; settings: Settings; playing: boolean; rec: boolean; muted: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const dots = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const g = c.getContext('2d');
    if (!g) return;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let buf: Float32Array<ArrayBuffer> | null = null;
    let lastStep = -2;
    let frame = 0;
    return raf(() => {
      frame++;
      if (reduce && frame % 6) return;
      const dpr = Math.min(2, devicePixelRatio || 1);
      const w = c.clientWidth;
      const h = c.clientHeight;
      if (c.width !== Math.round(w * dpr)) {
        c.width = Math.round(w * dpr);
        c.height = Math.round(h * dpr);
      }
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, w, h);
      // faint graticule
      g.fillStyle = 'rgba(255,255,255,0.07)';
      for (let x = 0; x <= w; x += 12) for (let y = 4; y <= h; y += 12) g.fillRect(x, y, 1, 1);
      const a = audio.analyser;
      const mid = h / 2;
      let pts = 0;
      if (a) {
        if (!buf || buf.length !== a.fftSize) buf = new Float32Array(a.fftSize);
        a.getFloatTimeDomainData(buf);
        // rising-edge trigger for a stable trace
        let start = 0;
        for (let i = 1; i < buf.length / 2; i++) {
          if (buf[i - 1] < 0 && buf[i] >= 0) {
            start = i;
            break;
          }
        }
        pts = Math.min(buf.length - start, 384);
        g.fillStyle = '#a9d6f5';
        g.shadowColor = 'rgba(90,169,230,0.85)';
        g.shadowBlur = 6;
        const stepX = w / pts;
        for (let i = 0; i < pts; i += 2) {
          const v = Math.max(-1, Math.min(1, buf[start + i] * 3.2));
          g.fillRect(i * stepX, mid - v * (mid - 6) - 1, 2, 2);
        }
        g.shadowBlur = 0;
      }
      if (!pts) {
        g.fillStyle = 'rgba(169,214,245,0.5)';
        for (let x = 0; x < w; x += 4) g.fillRect(x, mid, 2, 2);
      }
      const s = po30.currentStep();
      if (s !== lastStep && dots.current) {
        lastStep = s;
        const kids = dots.current.children;
        for (let i = 0; i < kids.length; i++) kids[i].classList.toggle('is-on', i === s);
      }
    });
  }, []);
  const scale = SCALES.find((x) => x.id === settings.scale)!;
  return (
    <div className="po-oled lcd" aria-hidden>
      <div className="po-oled__top t-dot">
        <span>
          {playing ? '▶' : '■'} {preset}
        </span>
        <span>
          {rec && <b className="po-oled__rec">● REC</b>} {String(settings.bpm).padStart(3, '0')} BPM
        </span>
      </div>
      <div className="po-oled__scope">
        <canvas ref={canvas} />
      </div>
      <div className="po-oled__bottom t-dot">
        <span>{scale.label.toUpperCase()}</span>
        <div className="po-oled__steps" ref={dots}>
          {Array.from({ length: 16 }, (_, i) => (
            <i key={i} className={i % 4 === 0 ? 'is-beat' : ''} />
          ))}
        </div>
        <span>SW {settings.swing}%</span>
      </div>
      {muted && <div className="po-oled__muted t-dot">SOUND OFF · UNMUTE IN THE HUD</div>}
      {flash && (
        <div className="po-oled__flash" key={flash.label + flash.text}>
          <span className="t-dot">{flash.label.toUpperCase()}</span>
          <b className="t-dot">{flash.text}</b>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------- panel */
export default function SynthPanel() {
  init();
  const { muted } = useMusic();
  const [settings, setSettings] = useState<Settings>(settingsOf);
  const [pattern, setPattern] = useState<Pattern>(() => clonePattern(po30.pattern));
  const [mute, setMute] = useState<boolean[]>(() => po30.mute.slice());
  const [playing, setPlaying] = useState(po30.playing);
  const [rec, setRec] = useState(false);
  const [presetId, setPresetId] = useState<string | null>(PRESETS[0].id);
  const [dirty, setDirty] = useState(false);
  const [flash, setFlash] = useState<{ label: string; text: string } | null>(null);
  const [lastNote, setLastNote] = useState(7);
  const padEls = useRef<(HTMLButtonElement | null)[]>([]);
  const stepGrid = useRef<HTMLDivElement>(null);
  const flashTimer = useRef(0);
  const pendingNotes = useRef(0);
  const paint = useRef<{ tr: number; v: number } | null>(null);
  const fromPointer = useRef(false);
  const recRef = useRef(rec);
  recRef.current = rec;

  /* ---- stats + room signal for every hit (batched persistence) */
  useEffect(() => {
    const flush = () => {
      if (!pendingNotes.current) return;
      const n = pendingNotes.current;
      pendingNotes.current = 0;
      game().updateStats((s) => ({ notesPlayed: s.notesPlayed + n }));
    };
    const id = window.setInterval(flush, 1500);
    return () => {
      clearInterval(id);
      flush();
    };
  }, []);

  const light = useCallback((pad: number, vel = 0.85) => {
    const el = padEls.current[pad];
    if (!el) return;
    el.style.setProperty('--v', String(vel));
    el.classList.remove('is-hit');
    void el.offsetWidth;
    el.classList.add('is-hit');
  }, []);

  // sequencer hits → light pads + room overlay
  useEffect(() => {
    po30.onHit = (pad, delay) => {
      window.setTimeout(() => {
        light(pad, 0.7);
        useUI.getState().setFlag('synthKey', { i: pad, t: Date.now() });
      }, delay);
    };
    return () => {
      po30.onHit = undefined;
    };
  }, [light]);

  const markDirty = () => {
    setDirty(true);
  };

  const hit = useCallback(
    (pad: number, vel: number) => {
      light(pad, vel);
      po30.hit(pad, vel, undefined, pad === 3 ? lastNote : undefined);
      useUI.getState().setFlag('synthKey', { i: pad, t: Date.now() });
      pendingNotes.current++;
      if (pad >= 4) setLastNote(pad - 4);
      // live recording into the nearest step
      if (recRef.current && po30.playing) {
        const s = po30.nearestStep();
        if (s >= 0) {
          const next = clonePattern(po30.pattern);
          if (pad < 4) next.steps[pad][s] = vel > 0.95 ? 2 : 1;
          else {
            next.steps[3][s] = vel > 0.95 ? 2 : 1;
            next.notes[s] = pad - 4;
          }
          po30.pattern = next;
          setPattern(next);
          markDirty();
        }
      }
    },
    [light, lastNote],
  );

  /* ---- transport */
  const play = useCallback(() => {
    if (po30.playing) {
      po30.stop();
      setPlaying(false);
      music.unduck();
      sfx('switch', { pitch: -3 });
      return;
    }
    if (!po30.start()) {
      sfx('error');
      return;
    }
    setPlaying(true);
    music.duck(0.14, 0.9);
    sfx('switch');
    // a "made" pattern: ≥ 4 active steps, counted once per distinct pattern
    const key = patternKey(po30.pattern);
    if (activeSteps(po30.pattern) >= 4 && counted.current !== key) {
      counted.current = key;
      game().updateStats((s) => ({ patternsMade: s.patternsMade + 1 }));
    }
  }, []);

  // stop + restore BGM when leaving
  useEffect(
    () => () => {
      if (po30.playing) {
        po30.stop();
        music.unduck();
      }
    },
    [],
  );

  // count a newly edited pattern while it is already playing
  useEffect(() => {
    if (!playing) return;
    const key = patternKey(pattern);
    if (activeSteps(pattern) < 4 || counted.current === key) return;
    const id = window.setTimeout(() => {
      if (!po30.playing) return;
      counted.current = key;
      game().updateStats((s) => ({ patternsMade: s.patternsMade + 1 }));
    }, 4000);
    return () => clearTimeout(id);
  }, [pattern, playing]);

  /* ---- keyboard: pads, space = play */
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tgt = e.target as HTMLElement;
      if (tgt?.closest?.('input, textarea, select, [contenteditable]')) return;
      if (e.key === ' ' && !tgt?.closest?.('button, [role="slider"]')) {
        e.preventDefault();
        play();
        return;
      }
      const pad = PAD_FOR_KEY[e.key.toLowerCase()];
      if (pad === undefined) return;
      e.preventDefault();
      if (e.repeat) return;
      hit(pad, e.shiftKey ? 1 : 0.82);
      padEls.current[pad]?.classList.add('is-held');
    };
    const up = (e: KeyboardEvent) => {
      const pad = PAD_FOR_KEY[e.key.toLowerCase()];
      if (pad !== undefined) padEls.current[pad]?.classList.remove('is-held');
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [hit, play]);

  useEffect(() => {
    const up = () => {
      paint.current = null;
    };
    window.addEventListener('pointerup', up);
    return () => window.removeEventListener('pointerup', up);
  }, []);

  /* ---- settings */
  const setSetting = <K extends keyof Settings>(k: K, v: Settings[K]) => {
    po30.set(k, v);
    setSettings(settingsOf());
    markDirty();
  };
  const showFlash = (label: string, text: string) => {
    setFlash({ label, text });
    clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setFlash(null), 1100);
  };

  const loadPreset = (id: string) => {
    const p = PRESETS.find((x) => x.id === id)!;
    (Object.keys(settingsOf()) as (keyof Settings)[]).forEach((k) => po30.set(k, p[k] as never));
    po30.pattern = clonePattern(p.pattern);
    setSettings(settingsOf());
    setPattern(clonePattern(p.pattern));
    setPresetId(id);
    setDirty(false);
    showFlash('Preset', p.name);
    sfx('click');
  };

  const updatePattern = (next: Pattern) => {
    po30.pattern = next;
    setPattern(next);
    markDirty();
  };

  const setStep = (tr: number, s: number, v: number) => {
    const next = clonePattern(po30.pattern);
    if (next.steps[tr][s] === v) return;
    next.steps[tr][s] = v;
    if (tr === 3 && v) next.notes[s] = lastNote;
    updatePattern(next);
    sfx('step', { pitch: v ? 0 : -5 });
    if (v && !po30.playing) po30.hit(tr, 0.6, undefined, tr === 3 ? next.notes[s] : undefined);
  };

  const onStepDown = (e: RPointerEvent<HTMLButtonElement>, tr: number, s: number) => {
    if (e.button !== 0) return;
    fromPointer.current = true;
    const cur = po30.pattern.steps[tr][s];
    const v = e.shiftKey ? (cur === 2 ? 1 : 2) : cur ? 0 : 1;
    paint.current = { tr, v };
    setStep(tr, s, v);
  };

  const onPadDown = (e: RPointerEvent<HTMLButtonElement>, pad: number) => {
    e.preventDefault();
    const r = e.currentTarget.getBoundingClientRect();
    let vel: number;
    if ((e.pointerType === 'pen' || e.pointerType === 'touch') && e.pressure > 0 && e.pressure !== 0.5) vel = 0.35 + e.pressure * 0.65;
    else {
      const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
      const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
      vel = 1 - Math.min(1, Math.hypot(dx, dy) / 1.42) * 0.55;
    }
    hit(pad, vel);
  };

  const pct = (v: number) => `${Math.round(v * 100)}`;
  const hz = (v: number) => {
    const f = 180 * Math.pow(100, v);
    return f >= 1000 ? `${(f / 1000).toFixed(1)}k` : `${Math.round(f)}`;
  };
  const presetName = presetId ? PRESETS.find((p) => p.id === presetId)!.name + (dirty ? '*' : '') : 'INIT';
  const steps = activeSteps(pattern);

  return (
    <Stage code="RM-16" kicker="AS-30 · Adelia’s sound system" title="The synth" className="po-stage">
      <div className="po">
        {/* ------------------------------------------------ top deck */}
        <div className="po-top">
          <Oled flash={flash} preset={presetName.toUpperCase()} settings={settings} playing={playing} rec={rec} muted={muted} />
          <div className="po-knobs">
            <Knob label="Tempo" value={settings.bpm} min={60} max={180} onChange={(v) => setSetting('bpm', v)} onTurn={showFlash} format={(v) => `${Math.round(v)}`} accent />
            <Knob label="Swing" value={settings.swing} min={50} max={75} onChange={(v) => setSetting('swing', v)} onTurn={showFlash} format={(v) => `${Math.round(v)}%`} />
            <Knob label="Filter" value={settings.cutoff} min={0} max={1} step={0.01} onChange={(v) => setSetting('cutoff', v)} onTurn={showFlash} format={hz} />
            <Knob label="Decay" value={settings.decay} min={0} max={1} step={0.01} onChange={(v) => setSetting('decay', v)} onTurn={showFlash} format={pct} />
            <Knob label="Level" value={settings.level} min={0} max={1} step={0.01} onChange={(v) => setSetting('level', v)} onTurn={showFlash} format={pct} />
          </div>
        </div>

        {/* ------------------------------------------------ side keys */}
        <div className="po-side">
          <button className={`po-key ${playing ? 'is-on' : ''}`} onClick={play} aria-pressed={playing}>
            <i className={`led ${playing ? 'led--green' : 'led--off'}`} />
            <Icon name={playing ? 'pause' : 'play'} size={14} />
            <span>{playing ? 'Stop' : 'Play'}</span>
          </button>
          <button
            className={`po-key ${rec ? 'is-on' : ''}`}
            onClick={() => {
              setRec(!rec);
              sfx('switch', { pitch: rec ? -3 : 2 });
            }}
            aria-pressed={rec}
            title="Record pad hits into the sequence while it plays"
          >
            <i className={`led ${rec ? 'led--blink' : 'led--off'}`} />
            <span className="po-key__dot" />
            <span>Rec</span>
          </button>
          <button
            className="po-key"
            onClick={() => {
              updatePattern(emptyPattern());
              setPresetId(null);
              showFlash('Pattern', 'CLEAR');
              sfx('paper');
            }}
          >
            <i className="led led--off" />
            <Icon name="close" size={13} />
            <span>Clear</span>
          </button>
          <button
            className="po-key"
            onClick={() => {
              updatePattern(randomPattern(po30.scale));
              setPresetId(null);
              showFlash('Pattern', 'RANDOM');
              sfx('pop');
            }}
          >
            <i className="led led--off" />
            <Icon name="sparkle" size={13} />
            <span>Rand</span>
          </button>
          <div className="po-side__badge t-spec">
            AS-30
            <br />
            Rev 26.10
          </div>
        </div>

        {/* ------------------------------------------------ pads */}
        <div className="po-pads" role="group" aria-label="Pads — keys 1–4, Q–R, A–F, Z–V">
          {GRID.map((pad) => {
            const drum = pad < 4;
            const lab = drum ? null : noteLabel(settings.scale, pad - 4);
            return (
              <button
                key={pad}
                ref={(el) => {
                  padEls.current[pad] = el;
                }}
                className={`po-pad ${drum ? 'po-pad--drum' : ''} ${!drum && pad - 4 === lastNote ? 'is-last' : ''}`}
                onPointerDown={(e) => onPadDown(e, pad)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    hit(pad, 0.85);
                  }
                }}
                onAnimationEnd={(e) => e.currentTarget.classList.remove('is-hit')}
                aria-label={drum ? DRUMS[pad] : `Note ${lab!.main}${lab!.oct}`}
              >
                <span className="po-pad__key">{KEY_FOR_PAD[pad].toUpperCase()}</span>
                <span className="po-pad__name">
                  {drum ? (
                    DRUMS[pad]
                  ) : (
                    <NoteName scale={settings.scale} k={pad - 4} />
                  )}
                </span>
              </button>
            );
          })}
        </div>

        {/* ------------------------------------------------ sequencer */}
        <div className="po-seq">
          <div className="po-seq__bar">
            <div className="po-presets" role="group" aria-label="Presets">
              {PRESETS.map((p) => (
                <button key={p.id} className={`po-chip ${presetId === p.id ? 'is-on' : ''}`} onClick={() => loadPreset(p.id)} aria-pressed={presetId === p.id}>
                  {p.name}
                </button>
              ))}
            </div>
            <span className="po-seq__count t-label">
              <b className={steps >= 4 ? 'is-made' : ''}>{String(steps).padStart(2, '0')}</b> steps
            </span>
          </div>

          <div className="po-seq__scroll scroll">
            <div className="po-grid" ref={stepGrid} style={{ ['--cols' as string]: 16 }}>
              <div className="po-grid__head" aria-hidden>
                <span />
                {Array.from({ length: 16 }, (_, s) => (
                  <span key={s} data-step={s} className={s % 4 === 0 ? 'is-beat' : ''} style={{ gridColumn: col(s) }}>
                    {s + 1}
                  </span>
                ))}
              </div>
              {TRACK_NAMES.map((name, tr) => (
                <div className={`po-row ${mute[tr] ? 'is-muted' : ''}`} key={name} role="group" aria-label={`${name} steps`}>
                  <button
                    className="po-row__name"
                    onClick={() => {
                      const m = mute.slice();
                      m[tr] = !m[tr];
                      po30.mute = m;
                      setMute(m);
                      sfx('switch', { pitch: m[tr] ? -4 : 0 });
                    }}
                    aria-pressed={!mute[tr]}
                    title={mute[tr] ? 'Unmute track' : 'Mute track'}
                  >
                    <i className={`led ${mute[tr] ? 'led--off' : ''}`} />
                    {name}
                  </button>
                  {pattern.steps[tr].map((v, s) => (
                    <button
                      key={s}
                      className={`po-step ${v ? 'is-on' : ''} ${v === 2 ? 'is-accent' : ''} ${s % 4 === 0 ? 'is-beat' : ''}`}
                      data-step={s}
                      style={{ gridColumn: col(s) }}
                      aria-pressed={!!v}
                      aria-label={`${name} step ${s + 1}${v === 2 ? ' accent' : ''}`}
                      onPointerDown={(e) => onStepDown(e, tr, s)}
                      onPointerEnter={(e) => {
                        if (paint.current && paint.current.tr === tr && e.buttons & 1) setStep(tr, s, paint.current.v);
                      }}
                      onClick={(e) => {
                        if (fromPointer.current) {
                          fromPointer.current = false;
                          return;
                        }
                        const cur = po30.pattern.steps[tr][s];
                        setStep(tr, s, e.shiftKey ? (cur === 2 ? 1 : 2) : cur ? 0 : 1);
                      }}
                    >
                      {tr === 3 && v ? (
                        <em>
                          <NoteName scale={settings.scale} k={pattern.notes[s]} />
                        </em>
                      ) : null}
                    </button>
                  ))}
                </div>
              ))}
              <Playhead />
            </div>
          </div>

          <div className="po-seq__opts">
            <div className="po-seg" role="radiogroup" aria-label="Scale">
              <span className="t-label">Scale</span>
              <div>
                {SCALES.map((s) => (
                  <button
                    key={s.id}
                    role="radio"
                    aria-checked={settings.scale === s.id}
                    className={settings.scale === s.id ? 'is-on' : ''}
                    onClick={() => {
                      setSetting('scale', s.id as ScaleId);
                      sfx('click', { pitch: 2 });
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="po-seg" role="radiogroup" aria-label="Note pads instrument">
              <span className="t-label">Pads</span>
              <div>
                {INSTS.map((s) => (
                  <button
                    key={s.id}
                    role="radio"
                    aria-checked={settings.inst === s.id}
                    className={settings.inst === s.id ? 'is-on' : ''}
                    onClick={() => {
                      setSetting('inst', s.id);
                      sfx('click', { pitch: 2 });
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <p className="po-hint t-label">
            Space play · 1–4 drums · Q–V notes · Shift = accent · drag knobs · click a track name to mute
          </p>
        </div>
      </div>
    </Stage>
  );
}

/** C₃-style note names; gamelan ciphers get Kepatihan-style octave dots. */
function NoteName({ scale, k }: { scale: ScaleId; k: number }) {
  const lab = noteLabel(scale, k);
  const cipher = !!SCALES.find((x) => x.id === scale)?.cipher;
  if (cipher)
    return (
      <span className="po-cipher">
        {lab.main}
        {lab.oct > 0 && <i aria-hidden>{'•'.repeat(lab.oct)}</i>}
      </span>
    );
  return (
    <>
      {lab.main}
      <sub>{lab.oct}</sub>
    </>
  );
}

/** Lights the sounding step column (no React re-render per step). */
function Playhead() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let last = -2;
    return raf(() => {
      const s = po30.currentStep();
      if (s === last || !ref.current) return;
      last = s;
      const grid = ref.current.parentElement;
      grid?.querySelectorAll('.is-now').forEach((n) => n.classList.remove('is-now'));
      if (s >= 0) grid?.querySelectorAll(`[data-step="${s}"]`).forEach((n) => n.classList.add('is-now'));
    });
  }, []);
  return <div hidden ref={ref} />;
}

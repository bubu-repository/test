/* ==========================================================================
   RM-18 · The heart phone — Dial Adelia. An homage to Miu Miu's "Dial the
   number on the phone and hear the message": lift the heart handset, dial
   2026 (the number on the sticky note), and her voicemail plays in her own
   words (Web Speech API + typed captions; captions alone when muted).
   Secret lines from her world, spelled on the keypad: MOCI (6624),
   EVAL (3825), GOCENG (4623646), and 610 (her thesis eval set).
   She has no public phone number: this is a toy line, never a real one.
   Flags: phoneOffHook (bool), phoneDigit ({ d, t }), phoneState (string).
   ========================================================================== */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Sheet } from '@/ui/Panel';
import { useUI } from '@/state/ui';
import { game, useGame } from '@/state/game';
import { audio, sfx } from '@/audio/engine';
import { track } from '@/lib/api';
import { COMPANY } from '@/lib/content';
import { focus } from '@/stage/director';
import { formatTime, TZ } from '@/lib/weather';
import { STATIONS } from '@/stage/stations';
import { hasOnce, once } from '@/features/computer/util';
import { play, primeVoices, synth, type Line, type Playback } from './voice';
import { dialTone, lineClick, sitTone } from './tones';
import './phone.css';

const KEYS = [
  { k: '1', l: '' },
  { k: '2', l: 'ABC' },
  { k: '3', l: 'DEF' },
  { k: '4', l: 'GHI' },
  { k: '5', l: 'JKL' },
  { k: '6', l: 'MNO' },
  { k: '7', l: 'PQRS' },
  { k: '8', l: 'TUV' },
  { k: '9', l: 'WXYZ' },
  { k: '*', l: '' },
  { k: '0', l: '+' },
  { k: '#', l: 'CALL' },
];
const keyIndex = (k: string) => KEYS.findIndex((x) => x.k === k);

/** Her line: the class of 2026 (also the door code). Not a phone number: she has no public one. */
const MAIN = ['2026', '022026'];
const SECRETS: Record<string, Exclude<Kind, 'adelia' | 'invalid'>> = { '6624': 'moci', '3825': 'eval', '4623646': 'goceng', '610': 'thesis' };
const CODES = [...MAIN, ...Object.keys(SECRETS)];
const HER_LINE = '2026';

type Kind = 'adelia' | 'moci' | 'eval' | 'goceng' | 'thesis' | 'invalid';
type Mode = 'idle' | 'ready' | 'dialing' | 'ringing' | 'connected' | 'ended';

function classify(n: string): Kind {
  if (MAIN.includes(n)) return 'adelia';
  return SECRETS[n] ?? 'invalid';
}

const LOG_LABEL: Record<Kind, string> = {
  adelia: 'Adelia · voicemail',
  moci: 'Moci’s line (M-O-C-I)',
  eval: 'Eval line (E-V-A-L)',
  goceng: 'Goceng line',
  thesis: 'Thesis line',
  invalid: 'Not in service',
};
const CAP_LABEL: Record<Kind, string> = {
  adelia: 'Voicemail · Adelia',
  moci: 'Secret line · Moci',
  eval: 'Secret line · House Rule I',
  goceng: 'Secret line · Catat',
  thesis: 'Secret line · Tenderlens',
  invalid: 'Operator',
};

function script(kind: Kind, fresh: boolean): Line[] {
  const bonus: Line = fresh ? { cap: 'You found a secret line: forty hearts. Keep exploring.' } : { cap: 'You’ve called this line before. Thanks for coming back.' };
  switch (kind) {
    case 'adelia':
      return [
        { cap: 'Hi, this is Adelia. Thanks for calling my room.' },
        {
          cap: 'I’m an AI product engineer: Informatics, class of 2026, in Bekasi, just east of Jakarta.',
          say: "I'm an A.I. product engineer: Informatics, class of twenty twenty-six, in Bekasi, just east of Jakarta.",
        },
        {
          cap: 'I build AI features people can check. I go to the field first, write the eval before the prompt, and ship the code.',
          say: 'I build A.I. features people can check. I go to the field first, write the eval before the prompt, and ship the code.',
        },
        {
          cap: 'I’m looking for a full-time role on an AI product team, new grad or junior, remote or in the Jakarta area. I can start within two weeks of an offer.',
          say: "I'm looking for a full-time role on an A.I. product team, new grad or junior, remote or in the Jakarta area. I can start within two weeks of an offer.",
        },
        { cap: `Book a chat at the pink printer, or email me at ${COMPANY.email}. I reply within a day.`, say: 'Book a chat at the pink printer, or email me. I reply within a day.' },
      ];
    case 'moci':
      return [
        { cap: 'Blub. Moci here: you spelled my name on the keypad.', say: 'Blub. Mochi here. You spelled my name on the keypad.' },
        { cap: 'I answer questions about Adelia, and I show where every answer comes from. If I can’t tell, I say so.' },
        { cap: 'I’m the clear jelly drop with a face, on the desk. Come and ask me something.', say: "I'm the clear jelly drop with a face, on the desk. Come and ask me something." },
        bonus,
      ];
    case 'eval':
      return [
        { cap: 'Eval line. House Rule one: write the eval before the prompt.' },
        {
          cap: 'Before she touches a prompt, she writes down what “right” means and collects real cases: 2,100 and counting, labelled by hand.',
          say: 'Before she touches a prompt, she writes down what right means, and collects real cases: twenty-one hundred and counting, labelled by hand.',
        },
        { cap: 'Every change runs against them, so “it feels better” becomes a number.', say: 'Every change runs against them, so, it feels better, becomes a number.' },
        bonus,
      ];
    case 'goceng':
      return [
        { cap: 'Goceng line. Goceng is slang for five thousand rupiah.', say: 'Go-cheng line. Go-cheng is slang for five thousand rupiah.' },
        { cap: 'Catat’s ledger agent knew that. The model only points at the amount; code turns “goceng” into 5,000.', say: "Chatat's ledger agent knew that. The model only points at the amount, and code turns go-cheng into five thousand." },
        { cap: 'When it wasn’t sure, it asked: 1 in 12 money notes got a question instead of a guess.', say: "When it wasn't sure, it asked. One in twelve money notes got a question instead of a guess." },
        bonus,
      ];
    case 'thesis':
      return [
        { cap: '610: the fields in her thesis eval set for Tenderlens.', say: 'Six hundred and ten: the fields in her thesis eval set, for Tenderlens.' },
        { cap: 'Two people labelled them, with a Cohen’s kappa of 0.87. The test set was frozen, then opened once.', say: "Two people labelled them, with a Cohen's kappa of zero point eight seven. The test set was frozen, then opened once." },
        { cap: 'When a key page is unreadable, the brief says “Can’t tell yet” instead of guessing.', say: "When a key page is unreadable, the brief says, can't tell yet, instead of guessing." },
        bonus,
      ];
    case 'invalid':
      return [{ cap: 'The number you have dialled is not in service…' }, { cap: `…but Adelia is: ${HER_LINE}.`, say: 'But Adelia is. Two, oh, two, six.' }];
  }
}

const group = (s: string) => s.replace(/(.{4})(?=.)/g, '$1 ');
const fmt = (d: string) => (d ? group(d) : '');
const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

/** state + ref mirror (timers read the ref) */
function useStateRef<T>(init: T) {
  const [v, setV] = useState(init);
  const ref = useRef(v);
  const set = useCallback((n: T) => {
    ref.current = n;
    setV(n);
  }, []);
  return [v, set, ref] as const;
}

export default function PhonePanel() {
  const [offHook, setOffHook, offHookRef] = useStateRef(false);
  const [digits, setDigits, digitsRef] = useStateRef('');
  const [mode, setMode, modeRef] = useStateRef<Mode>('idle');
  const [kind, setKind] = useState<Kind | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [lineIdx, setLineIdx] = useState(-1);
  const [chars, setChars] = useState(0);
  const [secs, setSecs] = useState(0);
  const [down, setDown] = useState<number | null>(null);
  const [hint, setHint] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const muted = useUI((s) => s.muted);

  const stopTone = useRef<(() => void) | null>(null);
  const evalTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const clock = useRef<ReturnType<typeof setInterval>>(undefined);
  const playback = useRef<Playback | null>(null);
  const callNo = useRef(0);
  const lastNumber = useRef<string | null>(null);
  const auto = useRef(false);
  const capRef = useRef<HTMLDivElement>(null);
  const actRef = useRef<HTMLDivElement>(null);
  const capBoxRef = useRef<HTMLDivElement>(null);
  const dialed = useGame((s) => s.stats.dialed);
  const flag = (k: string, v: unknown) => useUI.getState().setFlag(k, v);

  const later = (fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      timers.current.delete(id);
      fn();
    }, ms);
    timers.current.add(id);
  };

  const stopAll = () => {
    playback.current?.cancel();
    playback.current = null;
    stopTone.current?.();
    stopTone.current = null;
    timers.current.forEach(clearTimeout);
    timers.current.clear();
    clearTimeout(evalTimer.current);
    clearInterval(clock.current);
    audio.unduck();
    auto.current = false;
    callNo.current++;
  };

  useEffect(() => {
    primeVoices();
    const t = setInterval(() => setNow(new Date()), 10000);
    return () => {
      clearInterval(t);
      stopAll();
      flag('phoneOffHook', false);
      flag('phoneState', 'idle');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLayoutEffect(() => {
    const el = capRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lineIdx, chars, mode]);

  useEffect(() => {
    if (mode !== 'ended') return;
    const t = setTimeout(() => actRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 120);
    return () => clearTimeout(t);
  }, [mode]);

  const resetCall = () => {
    setKind(null);
    setLines([]);
    setLineIdx(-1);
    setHint(false);
  };

  /* ---------------------------------------------------------------- hook */
  const lift = (withTone = true) => {
    if (offHookRef.current) return;
    setOffHook(true);
    flag('phoneOffHook', true);
    flag('phoneState', 'ready');
    sfx('switch', { pitch: -4 });
    setMode('ready');
    setDigits('');
    resetCall();
    if (withTone)
      later(() => {
        if (modeRef.current === 'ready' && !digitsRef.current && !stopTone.current) stopTone.current = dialTone();
      }, 260);
  };

  const hangUp = () => {
    stopAll();
    setOffHook(false);
    flag('phoneOffHook', false);
    flag('phoneState', 'idle');
    sfx('press', { pitch: -7 });
    setMode('idle');
    setDigits('');
    setDown(null);
    resetCall();
  };

  /* ---------------------------------------------------------------- dialling */
  const flash = (i: number) => {
    setDown(i);
    later(() => setDown((d) => (d === i ? null : d)), 130);
  };

  const press = (k: string, i: number) => {
    const m = modeRef.current;
    if (m === 'ringing' || m === 'connected') {
      sfx('dial', { pitch: i, gain: 0.5 });
      flash(i);
      return;
    }
    if (k === '+' && digitsRef.current && m !== 'ended') return;
    if (!offHookRef.current) lift(false);
    if (m === 'ended') {
      setDigits('');
      resetCall();
    }
    stopTone.current?.();
    stopTone.current = null;
    sfx('dial', { pitch: i });
    flag('phoneDigit', { d: k, t: Date.now() });
    flash(i);
    if (k === '#') {
      if (digitsRef.current && modeRef.current === 'dialing') evaluate(digitsRef.current);
      else sfx('error', { gain: 0.4 });
      return;
    }
    const d = (modeRef.current === 'ended' ? '' : digitsRef.current) + k;
    if (d.length > 16) return;
    setDigits(d);
    setMode('dialing');
    flag('phoneState', 'dialing');
    schedule(d);
  };

  const schedule = (d: string) => {
    clearTimeout(evalTimer.current);
    setHint(false);
    const exact = CODES.includes(d);
    const prefix = CODES.some((c) => c !== d && c.startsWith(d));
    if (exact && !prefix) evalTimer.current = setTimeout(() => evaluate(d), 450);
    else if (!exact && !prefix && d.replace(/\D/g, '').length >= 8) evalTimer.current = setTimeout(() => evaluate(d), 450);
    else if (exact) evalTimer.current = setTimeout(() => evaluate(d), 2200);
    else evalTimer.current = setTimeout(() => setHint(true), 3500);
  };

  const del = () => {
    if (modeRef.current !== 'dialing' || !digitsRef.current) return;
    const d = digitsRef.current.slice(0, -1);
    sfx('tick');
    setDigits(d);
    if (d) schedule(d);
    else {
      clearTimeout(evalTimer.current);
      setMode('ready');
    }
  };

  /* ---------------------------------------------------------------- the call */
  const evaluate = (num: string) => {
    clearTimeout(evalTimer.current);
    setHint(false);
    const k = classify(num);
    const call = ++callNo.current;
    lastNumber.current = num;
    game().updateStats((s) => ({ dialed: [...s.dialed, num].slice(-50) }));
    track('phone_dial', { number: num, kind: k });
    const ls = script(k, k !== 'adelia' && k !== 'invalid' && !hasOnce(`phone-${k}`));
    setKind(k);
    setLines(ls);
    setLineIdx(-1);
    setChars(0);
    setSecs(0);
    setMode('ringing');
    if (k === 'invalid') {
      flag('phoneState', 'error');
      sfx('error');
      later(sitTone, 260);
      later(() => connect(k, ls, call), 1500);
    } else {
      flag('phoneState', 'ringing');
      later(() => sfx('ring'), 350);
      later(() => sfx('ring'), 2150);
      later(() => connect(k, ls, call), 3700);
    }
  };

  const connect = (k: Kind, ls: Line[], call: number) => {
    if (call !== callNo.current) return;
    lineClick();
    setMode('connected');
    flag('phoneState', 'message');
    audio.duck(0.22);
    if (k === 'adelia') game().unlock('operator');
    if (k !== 'adelia' && k !== 'invalid' && once(`phone-${k}`)) later(() => game().addPoints(40, `Secret line · ${LOG_LABEL[k]}`), 1200);
    clearInterval(clock.current);
    clock.current = setInterval(() => setSecs((s) => s + 1), 1000);
    capBoxRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    const voice = !useUI.getState().muted && !!synth();
    playback.current = play(
      ls,
      {
        onLine: (i) => {
          setLineIdx(i);
          setChars(0);
        },
        onProgress: (_i, c) => setChars(c),
        onDone: () => end(call),
      },
      voice,
    );
  };

  const end = (call: number) => {
    if (call !== callNo.current) return;
    playback.current = null;
    clearInterval(clock.current);
    audio.unduck();
    sfx('beep', { pitch: -2 });
    setLineIdx(999);
    setMode('ended');
    flag('phoneState', 'ended');
  };

  const skip = () => {
    playback.current?.cancel();
    playback.current = null;
    end(callNo.current);
  };

  const autodial = (num = HER_LINE) => {
    if (auto.current) return;
    if (modeRef.current === 'ringing' || modeRef.current === 'connected') hangUp();
    auto.current = true;
    const start = () => {
      if (!offHookRef.current) lift(false);
      stopTone.current?.();
      stopTone.current = null;
      setDigits('');
      setMode('ready');
      resetCall();
      num.split('').forEach((d, j) =>
        later(() => {
          press(d, keyIndex(d));
          if (j === num.length - 1) auto.current = false;
        }, 260 + j * 190),
      );
    };
    // StrictMode-safe: hangUp() cleared auto, so re-arm after it
    auto.current = true;
    later(start, offHookRef.current ? 0 : 120);
  };

  const redial = () => {
    const n = lastNumber.current ?? game().stats.dialed[game().stats.dialed.length - 1];
    sfx('click');
    autodial(n || HER_LINE);
  };

  /* ---------------------------------------------------------------- keyboard */
  const pressRef = useRef(press);
  pressRef.current = press;
  const delRef = useRef(del);
  delRef.current = del;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
      const t = e.target as HTMLElement | null;
      if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
      if (/^[0-9*#]$/.test(e.key)) {
        e.preventDefault();
        pressRef.current(e.key, keyIndex(e.key));
      } else if (e.key === 'Enter' && t?.tagName !== 'BUTTON' && t?.tagName !== 'A') {
        e.preventDefault();
        pressRef.current('#', 11);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        delRef.current();
      } else if (e.key === '+') {
        e.preventDefault();
        pressRef.current('+', 10);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /* ---------------------------------------------------------------- view */
  const live = mode === 'ringing' || mode === 'connected';
  const lcdTop =
    mode === 'idle'
      ? 'LINE 1 · ON HOOK'
      : mode === 'ready'
        ? 'DIAL TONE'
        : mode === 'dialing'
          ? hint
            ? 'PRESS # TO CALL'
            : 'DIALLING'
          : mode === 'ringing'
            ? kind === 'invalid'
              ? 'NO SERVICE'
              : 'CALLING'
            : mode === 'connected'
              ? kind === 'invalid'
                ? 'NOT IN SERVICE'
                : kind === 'adelia'
                  ? 'VOICEMAIL'
                  : 'SECRET LINE'
              : 'CALL ENDED';
  const lcdMain =
    mode === 'idle' ? (
      <span className="ph-lcd__blink">LIFT HANDSET</span>
    ) : mode === 'ready' ? (
      <span className="ph-lcd__cursor">_</span>
    ) : mode === 'connected' || mode === 'ended' ? (
      <span className="ph-lcd__timer">{mmss(secs)}</span>
    ) : (
      <span>{fmt(digits)}</span>
    );
  const log = Array.from(new Set([...dialed].reverse())).slice(0, 3);
  const cord = offHook ? 'M66 186 C 60 240, -16 252, -12 218 S 2 188, 10 190' : 'M58 220 C 56 256, -14 262, -12 226 S 2 192, 10 194';
  const handsetLabel = offHook ? 'Hang up the handset' : 'Lift the handset';
  const capLabel = (mode === 'connected' || mode === 'ended') && kind ? CAP_LABEL[kind] : 'Line 1';

  return (
    <Sheet code={STATIONS.phone.code} title="Dial Adelia" kicker={`${STATIONS.phone.name} · hear her message`} className="ph-panel">
      <div className="ph-stage">
        <div className={`ph-device ${offHook ? 'is-off' : ''} is-${mode}`}>
          <div className="ph-base" aria-hidden />
          <div className="ph-cradle" aria-hidden>
            <i className="ph-hook" />
            <i className="ph-hook" />
          </div>
          <svg className="ph-cord" viewBox="0 0 300 246" aria-hidden>
            <path className="ph-cord__shadow" d={cord} />
            <path className="ph-cord__coil" d={cord} />
            <path className="ph-cord__shine" d={cord} />
          </svg>
          <button
            className="ph-handset"
            aria-label={handsetLabel}
            title={handsetLabel}
            onClick={(e) => {
              if (e.detail > 0) e.currentTarget.blur(); // mouse: keep the keyboard free for dialling
              if (offHook) hangUp();
              else lift();
            }}
          >
            <Handset />
            <span className="ph-handset__hint" aria-hidden>
              {offHook ? '' : 'Lift'}
            </span>
          </button>

          <div className="ph-face">
            <div className={`ph-lcd lcd ${offHook ? 'is-lit' : ''}`} role="status" aria-label={`${lcdTop} ${digits}`}>
              <div className="ph-lcd__top">
                <span>{lcdTop}</span>
                {live ? (
                  <span className="ph-lcd__wave" aria-hidden>
                    {Array.from({ length: 14 }, (_, i) => (
                      <i key={i} style={{ animationDelay: `${(i * 97) % 600}ms` }} />
                    ))}
                  </span>
                ) : (
                  <span>{formatTime(TZ, now)}</span>
                )}
              </div>
              <div className={`ph-lcd__main t-dot ${digits.length > 11 && (mode === 'dialing' || mode === 'ringing') ? 'is-long' : ''}`}>{lcdMain}</div>
            </div>
            <div className="ph-fn">
              <button className={`ph-fk ${offHook ? 'is-on' : ''}`} onClick={() => (offHook ? hangUp() : lift())}>
                <i className={`led ${offHook ? 'led--green' : 'led--off'}`} />
                {offHook ? 'Hang up' : 'Lift'}
              </button>
              <button className="ph-fk" onClick={redial}>
                Redial
              </button>
              <button className="ph-fk" onClick={del} disabled={mode !== 'dialing'}>
                Del
              </button>
            </div>
            <div className="ph-keys" role="group" aria-label="Keypad">
              {KEYS.map((x, i) => (
                <button
                  key={x.k}
                  className={`ph-key ${down === i ? 'is-down' : ''} ${x.k === '#' ? 'ph-key--call' : ''}`}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    press(x.k, i);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      e.stopPropagation();
                      press(x.k, i);
                    }
                  }}
                  aria-label={x.k === '#' ? 'Call (#)' : x.k}
                >
                  <b>{x.k}</b>
                  {x.l && <small>{x.l}</small>}
                </button>
              ))}
            </div>
          </div>
          <span className="ph-engrave" aria-hidden>
            Adelia · Heart-26 · Bekasi
          </span>
        </div>

        <button
          className="ph-note"
          onClick={() => {
            sfx('paper');
            autodial();
          }}
          aria-label={`Sticky note: Adelia’s line, ${HER_LINE}. Dial it`}
        >
          <i className="tape tape--pink" aria-hidden />
          <span className="ph-note__row">
            <span className="ph-note__k">Adelia’s line</span>
            <span className="ph-note__s">♡ dial me</span>
          </span>
          <span className="ph-note__n t-dot">{HER_LINE}</span>
          <span className="ph-note__p">Words work on the keypad too.</span>
        </button>
      </div>

      <div className={`ph-cap lcd ${live ? 'is-live' : ''}`} ref={capBoxRef}>
        <header className="ph-cap__head">
          <span>
            <i className={`led ${mode === 'connected' ? 'led--blink' : live ? '' : 'led--off'}`} /> {capLabel}
          </span>
          <span>{muted && (mode === 'connected' || mode === 'ended') ? 'Captions only · sound off' : mode === 'connected' ? 'Live' : ''}</span>
        </header>
        <div className={`ph-cap__body scroll ${mode === 'ended' ? 'is-done' : ''}`} ref={capRef}>
          {!lines.length || mode === 'ringing' ? (
            <p className="ph-cap__idle">
              {mode === 'idle' && `Lift the heart handset and dial ${HER_LINE}. Your keyboard’s number keys work too.`}
              {mode === 'ready' && 'Dial tone. Go on: the number is on the sticky note.'}
              {mode === 'dialing' && (hint ? `Not a number she knows yet. Press # to call anyway, or try ${HER_LINE}.` : 'Dialling…')}
              {mode === 'ringing' && (kind === 'invalid' ? 'Connecting…' : 'Ringing…')}
            </p>
          ) : (
            lines.map((l, i) =>
              i < lineIdx ? (
                <p key={i} className="ph-cap__l is-past">
                  {l.cap}
                </p>
              ) : i === lineIdx ? (
                <p key={i} className="ph-cap__l is-now">
                  {l.cap.slice(0, chars)}
                  <i className="ph-cap__caret" />
                </p>
              ) : null,
            )
          )}
        </div>
        <p className="sr-only" aria-live="polite">
          {lineIdx >= 0 && lineIdx < lines.length ? lines[lineIdx].cap : ''}
        </p>
      </div>

      <div className="ph-actions" ref={actRef}>
        {mode === 'connected' && (
          <>
            <button className="btn btn--sm btn--ghost" onClick={skip}>
              Skip message ›
            </button>
            <button className="btn btn--sm btn--dark" onClick={hangUp}>
              Hang up
            </button>
          </>
        )}
        {mode === 'ended' && kind === 'adelia' && (
          <>
            <button
              type="button"
              className="btn btn--primary btn--block"
              onClick={() => {
                track('phone_cta', { cta: 'book' });
                focus('printer', { tab: 'hiring' });
              }}
            >
              Book a chat
            </button>
            <a
              className="btn btn--sm"
              href={`mailto:${COMPANY.email}?subject=${encodeURIComponent('Hello Adelia — I called the heart phone')}`}
              onClick={() => {
                track('phone_mail');
                track('email', { from: 'phone' });
              }}
            >
              Email her
            </a>
            <a
              className="btn btn--sm"
              href={COMPANY.cv}
              download="Adelia-Tiara-CV.pdf"
              onClick={() => track('cv_download', { from: 'phone' })}
            >
              Her CV (PDF)
            </a>
          </>
        )}
        {mode === 'ended' && kind === 'moci' && (
          <button type="button" className="btn btn--primary btn--block" onClick={() => focus('moci')}>
            Ask Moci something
          </button>
        )}
        {mode === 'ended' && kind === 'eval' && (
          <button type="button" className="btn btn--primary btn--block" onClick={() => (sfx('open'), useUI.getState().openPanel('products', { focus: 'evals' }))}>
            See the jar of marbles
          </button>
        )}
        {mode === 'ended' && kind === 'goceng' && (
          <button type="button" className="btn btn--primary btn--block" onClick={() => focus('gallery', { work: 'catat' })}>
            Read the Catat case
          </button>
        )}
        {mode === 'ended' && kind === 'thesis' && (
          <button type="button" className="btn btn--primary btn--block" onClick={() => focus('gallery', { work: 'tenderlens' })}>
            Read the Tenderlens case
          </button>
        )}
        {mode === 'ended' && kind === 'invalid' && (
          <button type="button" className="btn btn--primary btn--block" onClick={() => autodial()}>
            Dial Adelia · {HER_LINE}
          </button>
        )}
        {mode === 'ended' && kind !== 'invalid' && (
          <button className="btn btn--sm btn--ghost" onClick={() => lastNumber.current && autodial(lastNumber.current)}>
            ↺ Replay
          </button>
        )}
        {mode === 'ended' && (
          <button className="btn btn--sm btn--ghost" onClick={hangUp}>
            Hang up
          </button>
        )}
      </div>

      {log.length > 0 && !live && (
        <section className="ph-log" aria-label="Call log">
          <h4 className="rule">Call log</h4>
          <ul>
            {log.map((n) => (
              <li key={n}>
                <button
                  onClick={() => {
                    sfx('click');
                    autodial(n);
                  }}
                >
                  <span className="t-dot">{fmt(n)}</span>
                  <small>{LOG_LABEL[classify(n)]}</small>
                  <i aria-hidden>↺</i>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </Sheet>
  );
}

/** A heart-shaped path centred on (cx, cy), `r` = half its width. */
function heart(cx: number, cy: number, r: number) {
  const P = (x: number, y: number) => `${(cx + x * r).toFixed(1)} ${(cy + y * r).toFixed(1)}`;
  return `M${P(0, 0.92)} C${P(-0.16, 0.78)} ${P(-1, 0.28)} ${P(-1, -0.3)} C${P(-1, -0.76)} ${P(-0.62, -1)} ${P(-0.32, -1)} C${P(-0.12, -1)} ${P(0, -0.86)} ${P(0, -0.7)} C${P(0, -0.86)} ${P(0.12, -1)} ${P(0.32, -1)} C${P(0.62, -1)} ${P(1, -0.76)} ${P(1, -0.3)} C${P(1, 0.28)} ${P(0.16, 0.78)} ${P(0, 0.92)} Z`;
}

/** The handset: a chrome receiver with a heart at each end (the heart phone on the shelf). */
function Handset() {
  const holes = (cx: number, cy: number) =>
    [0, 1, 2, 3, 4, 5, 6].map((i) => {
      const a = (i / 6) * Math.PI * 2;
      const x = i === 6 ? cx : cx + Math.cos(a) * 10;
      const y = i === 6 ? cy : cy + Math.sin(a) * 10;
      return <circle key={`${cy}-${i}`} cx={x} cy={y} r="2.2" fill="#8c939e" />;
    });
  return (
    <svg viewBox="0 0 100 300" className="ph-handset__svg" aria-hidden>
      <defs>
        <linearGradient id="ph-hs" x1="0" x2="1" y1="0" y2="0.2">
          <stop offset="0" stopColor="#c6cad1" />
          <stop offset="0.28" stopColor="#ffffff" />
          <stop offset="0.5" stopColor="#e3e6eb" />
          <stop offset="0.72" stopColor="#b4b9c2" />
          <stop offset="1" stopColor="#eef0f3" />
        </linearGradient>
        <radialGradient id="ph-cup" cx="0.6" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#c5cad2" />
        </radialGradient>
      </defs>
      <rect x="38" y="70" width="24" height="160" rx="12" fill="url(#ph-hs)" stroke="rgba(52,58,70,0.32)" strokeWidth="1.2" />
      <path d="M44 86v128" stroke="rgba(255,255,255,0.95)" strokeWidth="2" strokeLinecap="round" />
      <path d={heart(50, 52, 46)} fill="url(#ph-hs)" stroke="rgba(52,58,70,0.32)" strokeWidth="1.2" />
      <path d={heart(50, 52, 32)} fill="url(#ph-cup)" opacity="0.7" />
      {holes(50, 50)}
      <path d={heart(50, 252, 46)} fill="url(#ph-hs)" stroke="rgba(52,58,70,0.32)" strokeWidth="1.2" />
      <path d={heart(50, 252, 32)} fill="url(#ph-cup)" opacity="0.7" />
      {holes(50, 250)}
      <rect x="44" y="146" width="12" height="8" rx="4" fill="var(--accent)" />
    </svg>
  );
}

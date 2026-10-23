/* Terminal — jelly-sh on Adelia OS: history, tab completion, a blinking block cursor. */
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent as RKeyboardEvent } from 'react';
import { sfx } from '@/audio/engine';
import { game } from '@/state/game';
import { COMPANY } from '@/lib/content';
import { formatDate, formatTime, TZ } from '@/lib/weather';
import { os, useOS } from '../../wm';
import { pingKey } from '../../util';
import { complete, HOST, run, USER, type IO, type Kind } from './commands';

interface Line {
  id: number;
  kind: Kind;
  text: string;
  i: number; // index within its print batch (stagger)
}

// survive closing/reopening the window during a visit
const HISTORY: string[] = [];
let ROOT = false;
let seq = 0;

const QUICK = ['help', 'whoami', 'ls projects', 'cat evals', 'open cv', 'weather', 'hire-me'];

function welcome(): Line[] {
  const d = new Date();
  return [
    { kind: 'dim' as Kind, text: 'Adelia OS 26.10 (tty1) · jelly-sh 1.0' },
    { kind: 'dim' as Kind, text: `Last login: ${formatDate(TZ, d)} ${formatTime(TZ, d)} from ${COMPANY.city}` },
    { kind: 'out' as Kind, text: "Type 'help' to get started, or 'hire-me' for the short version." },
  ].map((l, i) => ({ ...l, id: ++seq, i }));
}

export default function Terminal({ active }: { active?: boolean }) {
  const [lines, setLines] = useState<Line[]>(welcome);
  const [value, setValue] = useState('');
  const [caret, setCaret] = useState(0);
  const [busy, setBusy] = useState(false);
  const [root, setRoot] = useState(ROOT);
  const [focused, setFocused] = useState(false);
  const [matrix, setMatrix] = useState(false);
  const calm = useOS((s) => s.calm);

  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hIdx = useRef<number | null>(null);
  const draft = useRef('');
  const alive = useRef(true);
  const stopMatrix = useRef<(() => void) | null>(null);
  const auto = useRef(false);
  const [typing, setTyping] = useState(false);

  const prompt = useMemo(() => `${root ? 'root' : USER}@${HOST} ~ ${root ? '#' : '$'}`, [root]);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      stopMatrix.current?.();
    };
  }, []);

  // focus when the window becomes active (only with a real pointer — no surprise keyboards on phones)
  useEffect(() => {
    if (active && !busy && matchMedia('(pointer: fine)').matches) inputRef.current?.focus({ preventScroll: true });
  }, [active, busy]);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines, busy, value]);

  const print = (text: string | string[], kind: Kind = 'out') => {
    if (!alive.current) return;
    const arr = Array.isArray(text) ? text : [text];
    setLines((ls) => [...ls, ...arr.map((t, i) => ({ id: ++seq, kind, text: t, i: Math.min(i, 30) }))].slice(-400));
  };

  const io: IO = {
    print,
    clear: () => setLines([]),
    history: () => HISTORY,
    root: () => ROOT,
    setRoot: (r) => {
      ROOT = r;
      if (alive.current) setRoot(r);
    },
    wait: (ms) => new Promise((r) => setTimeout(r, ms)),
    calm: () => calm || useOS.getState().calm,
    exit: () => os().close('terminal'),
    matrix: (ms) =>
      new Promise<void>((resolve) => {
        setMatrix(true);
        requestAnimationFrame(() => {
          const stop = runMatrix(canvasRef.current, ms, () => {
            stopMatrix.current = null;
            if (alive.current) setMatrix(false);
            resolve();
          });
          stopMatrix.current = stop;
        });
      }),
  };

  const ping = pingKey;

  const submit = async (cmd: string) => {
    print(`${prompt} ${cmd}`, 'in');
    setValue('');
    setCaret(0);
    hIdx.current = null;
    draft.current = '';
    if (!cmd.trim()) return;
    if (HISTORY[HISTORY.length - 1] !== cmd) HISTORY.push(cmd);
    game().updateStats((s) => ({ terminalCommands: s.terminalCommands + 1 }));
    setBusy(true);
    try {
      await run(cmd, io);
    } finally {
      if (alive.current) setBusy(false);
    }
  };

  const typeAndRun = async (cmd: string) => {
    if (busy || auto.current) return;
    auto.current = true;
    setTyping(true);
    for (let i = 1; i <= cmd.length; i++) {
      await io.wait(42);
      if (!alive.current) return;
      setValue(cmd.slice(0, i));
      setCaret(i);
      sfx('type');
      ping();
    }
    await io.wait(160);
    auto.current = false;
    setTyping(false);
    if (alive.current) void submit(cmd);
  };

  const onKey = (e: RKeyboardEvent<HTMLInputElement>) => {
    const el = e.currentTarget;
    if (auto.current || (busy && !(e.ctrlKey && e.key.toLowerCase() === 'c'))) {
      e.preventDefault();
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      sfx('key', { pitch: -3 });
      void submit(value);
      return;
    }
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      if (!HISTORY.length) return;
      if (hIdx.current === null) draft.current = value;
      let i = hIdx.current ?? HISTORY.length;
      i += e.key === 'ArrowUp' ? -1 : 1;
      if (i < 0) i = 0;
      if (i >= HISTORY.length) {
        hIdx.current = null;
        setValue(draft.current);
        setCaret(draft.current.length);
      } else {
        hIdx.current = i;
        setValue(HISTORY[i]);
        setCaret(HISTORY[i].length);
      }
      sfx('tick');
      return;
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      const r = complete(value);
      if (r.value !== value) {
        setValue(r.value);
        setCaret(r.value.length);
        sfx('type');
      } else if (r.options.length) {
        print(`${prompt} ${value}`, 'in');
        print(r.options.join('   '), 'dim');
        sfx('tick');
      } else sfx('error', { gain: 0.4 });
      return;
    }
    if (e.ctrlKey && e.key.toLowerCase() === 'l') {
      e.preventDefault();
      setLines([]);
      return;
    }
    if (e.ctrlKey && e.key.toLowerCase() === 'c') {
      e.preventDefault();
      if (stopMatrix.current) stopMatrix.current();
      else {
        print(`${prompt} ${value}^C`, 'in');
        setValue('');
        setCaret(0);
      }
      return;
    }
    if (e.key.length === 1 || e.key === 'Backspace' || e.key === 'Delete') {
      sfx('type');
      ping();
    }
    // keep the caret in sync after navigation keys
    requestAnimationFrame(() => setCaret(el.selectionStart ?? el.value.length));
  };

  const before = value.slice(0, caret);
  const at = value[caret] ?? ' ';
  const after = value.slice(caret + 1);

  return (
    <div
      className="os-term"
      onMouseUp={() => {
        if (!window.getSelection()?.toString()) inputRef.current?.focus({ preventScroll: true });
      }}
    >
      <div className="os-term__scroll scroll" ref={scrollRef} role="log" aria-live="polite" aria-label="Terminal output">
        {lines.map((l) => (
          <p key={l.id} className={`os-term__l is-${l.kind}`} style={{ ['--i' as string]: l.i }}>
            {l.kind === 'link' ? (
              <a href={l.text.split('\t')[1]} target={l.text.split('\t')[1].startsWith('mailto:') ? undefined : '_blank'} rel="noopener noreferrer">
                {l.text.split('\t')[0]}
              </a>
            ) : l.kind === 'kv' || (l.kind === 'pre' && l.text.includes('\t')) ? (
              <>
                <b>{l.text.split('\t')[0]}</b>
                {l.text.split('\t').slice(1).join(' ')}
              </>
            ) : (
              l.text || ' '
            )}
          </p>
        ))}
        {!busy && (
          <label className={`os-term__prompt ${focused ? 'is-focus' : ''}`}>
            <span className="os-term__ps">{prompt}</span>{' '}
            <span className="os-term__typed">
              {before}
              <span className="os-term__caret">{at}</span>
              {after}
            </span>
            <input
              ref={inputRef}
              className="os-term__input"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setCaret(e.target.selectionStart ?? e.target.value.length);
              }}
              onSelect={(e) => setCaret(e.currentTarget.selectionStart ?? value.length)}
              onKeyDown={onKey}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              autoCapitalize="off"
              autoCorrect="off"
              autoComplete="off"
              spellCheck={false}
              enterKeyHint="go"
              aria-label="Terminal command"
            />
          </label>
        )}
        {busy && !matrix && <p className="os-term__l is-dim os-term__busy">▍</p>}
      </div>
      {matrix && <canvas className="os-term__matrix" ref={canvasRef} onPointerDown={() => stopMatrix.current?.()} />}
      <div className="os-term__quick" role="group" aria-label="Quick commands">
        {QUICK.map((q) => (
          <button key={q} disabled={busy || typing} onClick={() => void typeAndRun(q)}>
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}

/* Harmless "hack": falling glyph rain on a canvas. Returns a stopper. */
function runMatrix(canvas: HTMLCanvasElement | null, ms: number, done: () => void): () => void {
  if (!canvas) {
    done();
    return () => {};
  }
  const ctx = canvas.getContext('2d')!;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const W = canvas.clientWidth;
  const H = canvas.clientHeight;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.scale(dpr, dpr);
  const fs = 14;
  const cols = Math.ceil(W / fs);
  const drops = Array.from({ length: cols }, () => -Math.random() * (H / fs));
  const glyphs = 'ADELIA2026BKS01EVALS<>/#*{}♥';
  const t0 = performance.now();
  let raf = 0;
  let last = 0;
  let stopped = false;
  let tick = 0;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    cancelAnimationFrame(raf);
    window.removeEventListener('keydown', stop);
    done();
  };
  const frame = (now: number) => {
    if (stopped) return;
    if (now - t0 > ms) return stop();
    if (now - last > 45) {
      last = now;
      ctx.fillStyle = 'rgba(16, 20, 28, 0.2)';
      ctx.fillRect(0, 0, W, H);
      ctx.font = `700 ${fs}px "JetBrains Mono", monospace`;
      for (let i = 0; i < cols; i++) {
        const ch = glyphs[(Math.random() * glyphs.length) | 0];
        const y = drops[i] * fs;
        const r = Math.random();
        ctx.fillStyle = r > 0.95 ? '#ffffff' : r > 0.8 ? '#ff7eb6' : '#a9d6f5';
        ctx.fillText(ch, i * fs, y);
        if (y > H && Math.random() > 0.96) drops[i] = 0;
        drops[i] += 1;
      }
      if (++tick % 3 === 0) sfx('tick', { pitch: Math.random() * 12, gain: 0.3 });
    }
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  setTimeout(() => window.addEventListener('keydown', stop), 50);
  return stop;
}

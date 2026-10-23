/* ==========================================================================
   RM-06 · The pink mug — Is she a fit?
   Two ways in, one honest answer:
   • Fit check (60 s): five questions about the seat (keys 1–4) while the
     coffee level drops → her receipts are checked → a thermal receipt
     prints → the result: how good the fit is (including "Not yet"), the
     evidence from a case study, and a next step (book a call, read the
     case, or keep her CV for a junior opening).
   • Paste a job description: the legacy JD matcher (content/jd.ts) finds
     the skill areas a JD asks for, shows the ones she has with their proof
     and names the honest gaps. The text never leaves the browser.
   Both submit a `quiz` record (result, resultLabel, percent).

   props: { mode?: 'fit' | 'jd' }
   ========================================================================== */
import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent as RKeyboardEvent } from 'react';
import { Stage } from '@/ui/Panel';
import { Icon } from '@/ui/Icon';
import { useUI } from '@/state/ui';
import { game, useGame } from '@/state/game';
import { toast } from '@/state/toasts';
import { sfx } from '@/audio/engine';
import { submit, track } from '@/lib/api';
import { COMPANY, FIT, PRODUCTS, QUIZ, STACKS, WORK, type StackId } from '@/lib/content';
import { matchJD, SAMPLE_JD, type MatchResult } from '@/content/jd';
import { focus } from '@/stage/director';
import { STATIONS } from '@/stage/stations';
import './quiz.css';

type Mode = 'fit' | 'jd';
type Phase = 'intro' | 'q' | 'brew' | 'result';

const STACK_IDS = Object.keys(STACKS) as StackId[];
/** Short labels for the five outcomes (receipt lines, the breakdown). Keyed through FIT, never raw ids. */
const SHORT = {
  [FIT.endToEnd]: 'End to end',
  [FIT.quality]: 'Evals',
  [FIT.agents]: 'Agents',
  [FIT.aiUx]: 'AI UX',
  [FIT.notYet]: 'Senior seat',
} as Record<StackId, string>;
const QUIPS = ['Noted. That’s the seat.', 'Every team has one. Sip.', 'The first month matters most.', 'She’d want to meet those users.', 'Last sip. Checking her receipts…'];
const N = QUIZ.length;

interface Result {
  id: StackId;
  scores: Record<StackId, number>;
  pct: Record<StackId, number>;
  ranked: StackId[];
}

function tally(picks: number[]): Result {
  const scores = Object.fromEntries(STACK_IDS.map((s) => [s, 0])) as Record<StackId, number>;
  picks.forEach((p, i) => {
    const w = QUIZ[i]?.options[p]?.weights ?? {};
    (Object.keys(w) as StackId[]).forEach((k) => (scores[k] += w[k] ?? 0));
  });
  const total = STACK_IDS.reduce((a, s) => a + scores[s], 0) || 1;
  // percentages that always add up to 100 (largest remainder)
  const raw = STACK_IDS.map((s) => ({ s, v: (scores[s] / total) * 100 }));
  const floor = raw.map((r) => ({ ...r, f: Math.floor(r.v) }));
  let left = 100 - floor.reduce((a, r) => a + r.f, 0);
  [...floor]
    .sort((a, b) => b.v - b.f - (a.v - a.f))
    .forEach((r) => {
      if (left > 0 && r.v > 0) {
        r.f++;
        left--;
      }
    });
  const pct = Object.fromEntries(floor.map((r) => [r.s, r.f])) as Record<StackId, number>;
  // winner: highest total; ties go to the outcome the most recent answers favoured
  const recency = (s: StackId) => {
    for (let i = picks.length - 1; i >= 0; i--) {
      const w = QUIZ[i].options[picks[i]].weights[s];
      if (w) return i * 10 + w;
    }
    return -1;
  };
  const ranked = [...STACK_IDS].sort((a, b) => scores[b] - scores[a] || recency(b) - recency(a));
  return { id: ranked[0], scores, pct, ranked };
}

const wib = (d: Date, o: Intl.DateTimeFormatOptions) => {
  try {
    return new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jakarta', ...o }).format(d);
  } catch {
    return new Intl.DateTimeFormat('en-GB', o).format(d);
  }
};
const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const workName = (id?: string) => WORK.find((w) => w.id === id)?.client ?? '';

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;opacity:0;left:-9999px';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

function downloadCv(from: string) {
  sfx('click');
  track('cv_download', { from });
}

/* ================================================================== panel */

export default function QuizPanel({ mode: initialMode }: { mode?: Mode }) {
  const st = STATIONS.quiz;
  const [mode, setMode] = useState<Mode>(initialMode === 'jd' ? 'jd' : 'fit');
  const [phase, setPhase] = useState<Phase>('intro');
  const [step, setStep] = useState(0);
  const [picks, setPicks] = useState<number[]>([]);
  const [chosen, setChosen] = useState<number | null>(null);
  const [quip, setQuip] = useState('Fresh pour. Still warm.');
  const [sip, setSip] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [printedAt, setPrintedAt] = useState(() => new Date());
  const [jdText, setJdText] = useState('');
  const [jd, setJd] = useState<MatchResult | null>(null);
  const lastResult = useGame((s) => s.stats.quizResult) as StackId | undefined;
  const timers = useRef<number[]>([]);
  const busy = useRef(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const uid = useId().replace(/:/g, '');

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  useEffect(() => {
    track('quiz_open', { mode });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const answered = chosen !== null ? step + 1 : step;
  const level = phase === 'intro' ? 1 : phase === 'q' ? 1 - answered / N : 0;

  const switchMode = (m: Mode, focusIt = false) => {
    if (m === mode) return;
    sfx('switch');
    setMode(m);
    track('quiz_mode', { mode: m });
    if (focusIt) requestAnimationFrame(() => tabsRef.current?.querySelector<HTMLButtonElement>(`[data-mode="${m}"]`)?.focus());
  };
  const onTabsKey = (e: RKeyboardEvent) => {
    if (['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key)) {
      e.preventDefault();
      switchMode(e.key === 'ArrowRight' || e.key === 'End' ? 'jd' : 'fit', true);
    }
  };

  const start = () => {
    sfx('click');
    sfx('pop', { pitch: -4, gain: 0.6 });
    setPicks([]);
    setStep(0);
    setChosen(null);
    setResult(null);
    setQuip('Take your time. It’s warm.');
    setPhase('q');
    rootRef.current?.closest('.panel__body')?.scrollTo({ top: 0 });
    track('quiz_start');
  };

  const choose = (i: number) => {
    if (phase !== 'q' || busy.current) return;
    busy.current = true;
    setChosen(i);
    sfx('key');
    const next = [...picks.slice(0, step), i];
    setPicks(next);
    setSip((n) => n + 1);
    setQuip(QUIPS[step] ?? QUIPS[0]);
    later(() => sfx('pop', { pitch: -9 + step, gain: 0.5 }), 160);
    later(
      () => {
        busy.current = false;
        setChosen(null);
        if (step + 1 < N) {
          setStep(step + 1);
          sfx('tick');
        } else reveal(next);
      },
      reduced() ? 250 : 720,
    );
  };

  const prev = () => {
    if (phase !== 'q' || step === 0 || busy.current) return;
    sfx('back');
    setStep(step - 1);
    setPicks((p) => p.slice(0, step)); // keep the previous answer highlighted
    setQuip('Changed your mind? Happens in every hiring loop.');
  };

  const reveal = (final: number[]) => {
    setPhase('brew');
    later(
      () => {
        const r = tally(final);
        const s = STACKS[r.id];
        setResult(r);
        setPrintedAt(new Date());
        setPhase('result');
        useUI.getState().setFlag('quizSpin', Date.now());
        sfx('print');
        later(() => sfx('stamp'), 1350);
        const answers = final.map((a, i) => ({ q: QUIZ[i].id, a, label: QUIZ[i].options[a].label }));
        void submit('quiz', {
          mode: 'fit',
          answers,
          result: r.id,
          resultLabel: `${s.fit}: ${s.name}`,
          fit: s.fit,
          percent: r.pct[r.id],
          shares: r.pct,
          scores: r.scores,
          sessionId: game().sessionId,
          name: game().name || undefined,
        }).catch(() => {});
        game().updateStats(() => ({ quizResult: r.id }));
        track('quiz_result', { result: r.id, fit: s.fit });
      },
      reduced() ? 500 : 1300,
    );
  };

  // keyboard: 1–4 answer, Enter starts, Backspace goes back (fit check only)
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (mode !== 'fit') return;
      const t = e.target as HTMLElement | null;
      if (t?.closest?.('input, textarea, select, [contenteditable]')) return;
      // a focused button already turns Enter/Space into a click
      if ((e.key === 'Enter' || e.key === ' ') && t?.closest?.('button, a')) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (phase === 'intro' && e.key === 'Enter') {
        e.preventDefault();
        start();
      } else if (phase === 'q') {
        const n = Number(e.key);
        if (n >= 1 && n <= 4) {
          e.preventDefault();
          choose(n - 1);
        } else if (e.key === 'Backspace') {
          e.preventDefault();
          prev();
        }
      }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  });

  const stageClass = mode === 'jd' ? 'jd' : phase;

  return (
    <Stage code={st.code} title="Is she a fit?" kicker={st.name} className={`qz-stage qz-stage--${stageClass}`}>
      <div className={`qz qz--${stageClass}`} ref={rootRef}>
        {mode === 'jd' ? (
          <JdWindow result={jd} />
        ) : phase === 'result' && result ? (
          <Receipt result={result} picks={picks} at={printedAt} />
        ) : (
          <CoffeeWindow level={level} sip={sip} quip={phase === 'brew' ? 'Checking her receipts…' : quip} brewing={phase === 'brew'} />
        )}

        <div className="qz-main">
          <div className="qz-tabs" role="tablist" aria-label="How do you want to check?" ref={tabsRef} onKeyDown={onTabsKey}>
            <button
              type="button"
              role="tab"
              id={`${uid}-tab-fit`}
              data-mode="fit"
              aria-selected={mode === 'fit'}
              aria-controls={`${uid}-pane`}
              tabIndex={mode === 'fit' ? 0 : -1}
              className={`qz-tab ${mode === 'fit' ? 'is-on' : ''}`}
              onClick={() => switchMode('fit')}
            >
              <span className={`led led--blue ${mode === 'fit' ? '' : 'led--off'}`} /> 60-second fit check
            </button>
            <button
              type="button"
              role="tab"
              id={`${uid}-tab-jd`}
              data-mode="jd"
              aria-selected={mode === 'jd'}
              aria-controls={`${uid}-pane`}
              tabIndex={mode === 'jd' ? 0 : -1}
              className={`qz-tab ${mode === 'jd' ? 'is-on' : ''}`}
              onClick={() => switchMode('jd')}
            >
              <span className={`led led--blue ${mode === 'jd' ? '' : 'led--off'}`} /> Paste a job description
            </button>
          </div>

          <div className="qz-pane" id={`${uid}-pane`} role="tabpanel" aria-labelledby={`${uid}-tab-${mode}`}>
            {mode === 'jd' ? (
              <JdMatcher text={jdText} setText={setJdText} result={jd} setResult={setJd} />
            ) : (
              <>
                {phase === 'intro' && <Intro onStart={start} last={lastResult} onJd={() => switchMode('jd', true)} />}
                {phase === 'q' && <Question step={step} chosen={chosen ?? picks[step] ?? null} pressed={chosen} onChoose={choose} onPrev={prev} />}
                {phase === 'brew' && <Brewing />}
                {phase === 'result' && result && <ResultCard result={result} onRetake={start} onJd={() => switchMode('jd', true)} />}
              </>
            )}
          </div>
        </div>
      </div>
    </Stage>
  );
}

/* ================================================================== mug */
function Mug({ level, sip }: { level: number; sip: number }) {
  return (
    <div className="qz-mug" style={{ '--level': level } as CSSProperties} aria-hidden>
      <div className="qz-steam">
        <i />
        <i />
        <i />
      </div>
      <div className="qz-mug__handle" />
      <div className="qz-mug__body">
        <span className="qz-mug__mark">AT·26</span>
      </div>
      <div className="qz-mug__rim">
        <div className="qz-mug__inside">
          <div className="qz-mug__coffee">
            <i className="qz-mug__surface" key={sip} />
          </div>
        </div>
      </div>
    </div>
  );
}

function CoffeeWindow({ level, sip, quip, brewing }: { level: number; sip: number; quip: string; brewing: boolean }) {
  const pct = Math.round(level * 100);
  return (
    <aside className={`qz-window lcd ${brewing ? 'is-brewing' : ''}`} aria-label="Coffee level, which doubles as your progress">
      <div className="qz-window__top">
        <span className="t-label">{STATIONS.quiz.code} · Fit check</span>
        <span className={`led ${brewing ? 'led--blink' : ''}`} />
      </div>
      <div className="qz-window__mug">
        <Mug level={level} sip={sip} />
      </div>
      <div className="qz-readout">
        <div className="qz-readout__row">
          <span className="t-label">Coffee left</span>
          <b className="t-dot">{String(pct).padStart(3, '0')}%</b>
        </div>
        <div className="qz-levelbar" aria-hidden>
          {Array.from({ length: 10 }, (_, i) => (
            <i key={i} className={i < Math.round(level * 10) ? 'on' : ''} />
          ))}
        </div>
        <p className="qz-quip" key={quip} aria-live="polite">
          {quip}
        </p>
      </div>
    </aside>
  );
}

/* ================================================================ intro */
function Intro({ onStart, last, onJd }: { onStart: () => void; last?: StackId; onJd: () => void }) {
  return (
    <div className="qz-intro">
      <span className="t-label">
        <b className="t-primary">60 seconds</b> · 5 questions · an honest answer
      </span>
      <h3 className="qz-intro__title t-title">Is she a fit for your team?</h3>
      <p className="qz-intro__lead">
        Five questions about the seat you’re filling. You get a plain answer, the evidence behind it and a next step, including “not this seat” when that’s the truth.
      </p>
      <ol className="qz-steps">
        <li>
          <b className="t-dot">01</b>
          <span>Answer five questions about the role</span>
        </li>
        <li>
          <b className="t-dot">02</b>
          <span>See her receipts: a case study for the answer</span>
        </li>
        <li>
          <b className="t-dot">03</b>
          <span>A next step: a call, a case to read, or a polite no</span>
        </li>
      </ol>
      <ul className="qz-chips" aria-label="The five possible answers">
        {STACK_IDS.map((s) => (
          <li key={s} className={`chip ${last === s ? 'chip--primary' : ''}`}>
            {STACKS[s].name}
          </li>
        ))}
      </ul>
      <div className="qz-intro__cta">
        <button type="button" className="btn btn--primary btn--lg" onClick={onStart} autoFocus>
          Start the check
        </button>
        <span className="t-label qz-hint">
          or press <kbd>Enter</kbd>
        </span>
      </div>
      <p className="qz-alt">
        Have the job description open?{' '}
        <button type="button" className="qz-linkbtn" onClick={onJd}>
          Paste it instead
        </button>
      </p>
      {last && STACKS[last] && (
        <p className="qz-last">
          Last time: <b>{STACKS[last].fit}</b>, {STACKS[last].name}. Hiring for a different seat? Take it again.
        </p>
      )}
    </div>
  );
}

/* ============================================================= question */
function Progress({ step, total }: { step: number; total: number }) {
  return (
    <div className="qz-progress" role="progressbar" aria-valuemin={1} aria-valuemax={total} aria-valuenow={step + 1} aria-valuetext={`Question ${step + 1} of ${total}`} aria-label="Question progress">
      {Array.from({ length: total }, (_, i) => (
        <i key={i} className={i < step ? 'done' : i === step ? 'now' : ''} />
      ))}
    </div>
  );
}

function Question({ step, chosen, pressed, onChoose, onPrev }: { step: number; chosen: number | null; pressed: number | null; onChoose: (i: number) => void; onPrev: () => void }) {
  const q = QUIZ[step];
  const headRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    // keep keyboard and screen-reader users on the new question
    if (document.activeElement?.closest('.qz-answers') || document.activeElement === document.body) headRef.current?.focus({ preventScroll: true });
  }, [step]);
  return (
    <div className="qz-q" key={q.id}>
      <div className="qz-q__top">
        <span className="t-label">
          <span className="qz-q__word">Question </span>
          <b className="t-dot qz-q__n">{String(step + 1).padStart(2, '0')}</b> / {String(N).padStart(2, '0')}
        </span>
        <Progress step={step} total={N} />
        <button type="button" className="btn btn--sm btn--ghost qz-q__back" onClick={onPrev} disabled={step === 0} aria-label="Previous question">
          <Icon name="back" size={14} /> Back
        </button>
      </div>
      <h3 className="qz-q__text" tabIndex={-1} ref={headRef}>
        {q.q}
      </h3>
      <div className="qz-answers" role="group" aria-label={q.q}>
        {q.options.map((o, i) => (
          <button
            type="button"
            key={o.label}
            className={`qz-key ${pressed === i ? 'is-pressed' : ''} ${chosen === i ? 'is-chosen' : ''}`}
            aria-pressed={chosen === i}
            onClick={() => onChoose(i)}
            onPointerEnter={() => sfx('hover')}
            style={{ animationDelay: `${0.06 + i * 0.05}s` }}
          >
            <span className="qz-key__n t-mono" aria-hidden>
              {i + 1}
            </span>
            <span className="qz-key__label">{o.label}</span>
          </button>
        ))}
      </div>
      <p className="t-label qz-hint">
        Press <kbd>1</kbd>–<kbd>4</kbd> · <kbd>⌫</kbd> to go back
      </p>
    </div>
  );
}

function Brewing() {
  return (
    <div className="qz-brew" role="status">
      <div className="qz-brew__dots" aria-hidden>
        {Array.from({ length: 25 }, (_, i) => (
          <i key={i} style={{ animationDelay: `${(i % 5) * 0.08 + Math.floor(i / 5) * 0.12}s` }} />
        ))}
      </div>
      <span className="t-label">Checking her receipts</span>
      <p>Matching your answers against four case studies…</p>
    </div>
  );
}

/* ============================================================== receipt */
function barcode(seed: string) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  const bars: number[] = [];
  for (let i = 0; i < 46; i++) {
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    bars.push(1 + (Math.abs(h) % 3));
  }
  return bars;
}

function Receipt({ result, picks, at }: { result: Result; picks: number[]; at: Date }) {
  const sessionId = useGame((s) => s.sessionId);
  const st = STACKS[result.id];
  const product = PRODUCTS.find((p) => p.id === st.product);
  const order = (sessionId || 'adelia').replace(/[^a-z0-9]/gi, '').slice(0, 6).toUpperCase();
  const bars = useMemo(() => barcode(order + result.id), [order, result.id]);
  const [printing, setPrinting] = useState(true);
  useEffect(() => {
    const t = window.setTimeout(() => setPrinting(false), 1300);
    return () => clearTimeout(t);
  }, []);
  return (
    <aside className="qz-printer" aria-label="Your fit-check receipt">
      <div className="qz-printer__slot">
        <span className={`led ${printing ? 'led--blink' : 'led--green'}`} />
        <span className="t-label">{printing ? 'Printing · thermal' : 'Printed · tear here'}</span>
      </div>
      <div className="qz-paper">
        <div className="qz-receipt">
          <header className="qz-receipt__head">
            <b>Adelia’s Room</b>
            <span>Fit check · 60 seconds</span>
            <span>
              {COMPANY.role} · {COMPANY.cohort}
            </span>
            <span>{COMPANY.city} · WIB (UTC+7)</span>
          </header>
          <div className="qz-receipt__rule" />
          <div className="qz-receipt__meta">
            <span>{wib(at, { day: '2-digit', month: 'short', year: 'numeric' })}</span>
            <span>{wib(at, { hour: '2-digit', minute: '2-digit', hour12: false })} WIB</span>
          </div>
          <div className="qz-receipt__meta">
            <span>Check #{order}</span>
            <span>{STATIONS.quiz.code}</span>
          </div>
          <div className="qz-receipt__rule" />
          <ol className="qz-receipt__items">
            {picks.map((p, i) => {
              const o = QUIZ[i].options[p];
              const w = Object.entries(o.weights) as [StackId, number][];
              return (
                <li key={i}>
                  <span className="qz-receipt__qty">{String(i + 1).padStart(2, '0')}</span>
                  <span>
                    {o.label}
                    <em>{w.map(([s, v]) => `${SHORT[s]} +${v}`).join(' · ')}</em>
                  </span>
                </li>
              );
            })}
          </ol>
          <div className="qz-receipt__rule" />
          <div className="qz-receipt__total">
            <div>
              <span>Your seat</span>
              <b>{st.name}</b>
            </div>
            <div className={`qz-stamp ${st.fit === 'Not yet' ? 'is-no' : ''}`} aria-label={`${st.fit}, ${result.pct[result.id]}% of your answers`}>
              <span>{st.fit === 'Not yet' ? 'Not' : st.fit.split(' ')[0]}</span>
              <b>{st.fit === 'Not yet' ? 'YET' : 'FIT'}</b>
              <span>{result.pct[result.id]}%</span>
            </div>
          </div>
          <div className="qz-receipt__rule" />
          {product && (
            <div className="qz-receipt__meta">
              <span>Toolkit</span>
              <span>
                {product.model} · {product.name}
              </span>
            </div>
          )}
          <div className="qz-receipt__meta">
            <span>Receipt</span>
            <span>{workName(st.work)} case</span>
          </div>
          <div className="qz-barcode" aria-hidden>
            {bars.map((w, i) => (
              <i key={i} style={{ width: w, opacity: i % 2 ? 0 : 1 }} />
            ))}
          </div>
          <footer className="qz-receipt__foot">
            <span>Write the eval before the prompt.</span>
            <span>Show the receipts.</span>
            <span className="qz-receipt__thanks">Terima kasih · {COMPANY.domain}</span>
          </footer>
        </div>
      </div>
    </aside>
  );
}

/* =============================================================== result */
function ResultCard({ result, onRetake, onJd }: { result: Result; onRetake: () => void; onJd: () => void }) {
  const st = STACKS[result.id];
  const product = PRODUCTS.find((p) => p.id === st.product);
  const notYet = result.id === FIT.notYet;
  const caseName = workName(st.work);
  const seniorShare = result.pct[FIT.notYet];
  const [copied, setCopied] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // phones: once the receipt has printed, glide down to the result
  useEffect(() => {
    const t = window.setTimeout(() => {
      const el = rootRef.current;
      const body = el?.closest('.panel__body');
      if (!el || !body || !matchMedia('(max-width: 860px)').matches || body.scrollTop > 40) return;
      el.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' });
    }, 2300);
    return () => clearTimeout(t);
  }, []);

  const book = () => {
    track('quiz_cta', { cta: 'book', result: result.id });
    focus('printer', { tab: 'hiring', interest: result.id });
  };
  const read = () => {
    track('quiz_cta', { cta: 'case', result: result.id, work: st.work });
    focus('gallery', { work: st.work });
  };
  const shelf = () => {
    sfx('open');
    track('quiz_cta', { cta: 'product', result: result.id });
    useUI.getState().openPanel('products', { focus: st.product });
  };
  const copy = async () => {
    const lines = [
      `Fit check for ${COMPANY.name}, ${COMPANY.role} (${COMPANY.degree}, ${COMPANY.cohort.toLowerCase()})`,
      `${st.fit}: ${st.name}. ${st.line}`,
      `Evidence: ${st.evidence}`,
      `Next: ${st.next}`,
      `Where the answers pointed: ${result.ranked.map((s) => `${SHORT[s]} ${result.pct[s]}%`).join(' · ')}`,
      `${COMPANY.site} · ${COMPANY.email}`,
    ];
    const ok = await copyText(lines.join('\n'));
    sfx(ok ? 'pop' : 'error');
    setCopied(ok);
    if (ok) {
      track('quiz_cta', { cta: 'copy', result: result.id });
      window.setTimeout(() => setCopied(false), 2200);
    } else toast({ kind: 'info', title: 'Copy blocked', body: 'Your browser did not allow clipboard access.' });
  };

  return (
    <div className="qz-res" ref={rootRef}>
      <div className="qz-res__hero anim-rise" style={{ animationDelay: '0.9s' }}>
        <span className={`chip ${notYet ? 'chip--dark' : 'chip--primary'} qz-res__fit`}>
          <span className={`led ${notYet ? 'led--off' : 'led--blue'}`} /> {st.fit}
        </span>
        <h3 className="qz-res__name t-display">{notYet ? 'Probably not a fit for this seat' : st.name}</h3>
        <p className="qz-res__line">{st.line}</p>
        <p className="qz-res__body">{st.body}</p>
      </div>

      <section className="qz-proof surface--flat anim-rise" style={{ animationDelay: '1.05s' }} aria-label={notYet ? 'Why not' : 'The evidence'}>
        <span className="t-label">{notYet ? 'Here’s why' : `The receipt · ${caseName}`}</span>
        <p>{st.evidence}</p>
        <button type="button" className="qz-linkbtn" onClick={read}>
          {notYet ? `Read the ${caseName} case anyway` : `Read the ${caseName} case study`} <Icon name="arrow-right" size={14} />
        </button>
      </section>

      {!notYet && seniorShare >= 25 && (
        <p className="qz-caveat anim-rise" style={{ animationDelay: '1.1s' }}>
          <Icon name="eye" size={16} /> {seniorShare}% of your answers point to a more senior seat. She’s a 2026 new grad: if the role needs someone to lead from day one, hire senior first.
        </p>
      )}

      <div className="qz-next anim-rise" style={{ animationDelay: '1.2s' }}>
        <span className="t-label">Next step</span>
        <p className="qz-next__line">{st.next}</p>
        <div className="qz-ctas">
          {notYet ? (
            <>
              <a className="btn btn--primary btn--lg" href={COMPANY.cv} download="Adelia-Tiara-CV.pdf" onClick={() => downloadCv('quiz')}>
                <Icon name="download" size={18} /> Keep her CV for a junior seat
              </a>
              <button type="button" className="btn btn--lg" onClick={book}>
                <Icon name="ticket" size={18} /> Talk anyway
              </button>
            </>
          ) : (
            <>
              <button type="button" className="btn btn--primary btn--lg" onClick={book}>
                <Icon name="ticket" size={18} /> Book an intro call
              </button>
              <button type="button" className="btn btn--lg" onClick={read}>
                <Icon name="frame" size={18} /> Read {caseName}
              </button>
            </>
          )}
        </div>
        <div className="qz-ctas__minor">
          {product && !notYet && (
            <button type="button" className="btn btn--sm btn--ghost" onClick={shelf}>
              <Icon name="box" size={14} /> {product.name} on the shelf
            </button>
          )}
          {!notYet && (
            <a className="btn btn--sm btn--ghost" href={COMPANY.cv} download="Adelia-Tiara-CV.pdf" onClick={() => downloadCv('quiz')}>
              <Icon name="file" size={14} /> CV (PDF)
            </a>
          )}
          <button type="button" className="btn btn--sm btn--ghost" onClick={copy} aria-live="polite">
            <Icon name={copied ? 'check' : 'share'} size={14} /> {copied ? 'Copied' : 'Copy for your team'}
          </button>
          <button type="button" className="btn btn--sm btn--ghost" onClick={onRetake}>
            <Icon name="back" size={14} /> Retake
          </button>
        </div>
      </div>

      <section className="qz-chart anim-rise" style={{ animationDelay: '1.35s' }} aria-label="Where your answers pointed">
        <div className="rule">Where your answers pointed</div>
        <ul>
          {result.ranked.map((s, i) => (
            <li key={s} className={s === result.id ? 'is-top' : ''}>
              <span className="qz-chart__name">{STACKS[s].name}</span>
              <span className="qz-chart__track" aria-hidden>
                <i style={{ width: `${result.pct[s]}%`, animationDelay: `${1.4 + i * 0.08}s` }} />
              </span>
              <b className="qz-chart__v t-mono">{result.pct[s]}%</b>
            </li>
          ))}
        </ul>
        <p className="qz-fine">Share of your answers that point to each seat. A quick heuristic, not a test score: the case studies are the evidence.</p>
      </section>

      <p className="qz-alt anim-rise" style={{ animationDelay: '1.45s' }}>
        Want it checked against your actual role?{' '}
        <button type="button" className="qz-linkbtn" onClick={onJd}>
          Paste the job description
        </button>
      </p>
    </div>
  );
}

/* ============================================================ JD matcher */
const jdLevel = (score: number) => (score >= 80 ? { id: 'strong', label: 'Strong match' } : score >= 55 ? { id: 'good', label: 'Good match' } : { id: 'partial', label: 'Partial match' });

function Ring({ score, size = 132 }: { score: number; size?: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <svg className="qz-ring" viewBox="0 0 128 128" width={size} height={size} aria-hidden>
      <circle cx="64" cy="64" r={r} fill="none" className="qz-ring__track" strokeWidth="12" />
      <circle
        cx="64"
        cy="64"
        r={r}
        fill="none"
        className="qz-ring__bar"
        strokeWidth="12"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - score / 100)}
        transform="rotate(-90 64 64)"
      />
    </svg>
  );
}

function JdWindow({ result }: { result: MatchResult | null }) {
  const [shown, setShown] = useState(0);
  const found = result ? result.matched.length + result.gaps.length : 0;
  useEffect(() => {
    if (!result) return setShown(0);
    setShown(0);
    const t = window.setTimeout(() => setShown(result.score), reduced() ? 0 : 60);
    return () => clearTimeout(t);
  }, [result]);
  return (
    <aside className="qz-window qz-jdwin lcd" aria-label="JD scanner readout">
      <div className="qz-window__top">
        <span className="t-label">{STATIONS.quiz.code} · JD scanner</span>
        <span className={`led led--blue ${result ? '' : 'led--blink'}`} />
      </div>
      <div className="qz-jdwin__ring">
        <Ring score={result && found ? shown : 0} size={168} />
        <span className="qz-jdwin__score t-dot">{result && found ? `${result.score}%` : '--'}</span>
      </div>
      <div className="qz-readout">
        <div className="qz-readout__row">
          <span className="t-label">Skill areas found</span>
          <b className="t-dot">{String(found).padStart(2, '0')}</b>
        </div>
        <div className="qz-readout__row qz-readout__row--sm">
          <span className="t-label">She has</span>
          <b className="t-dot">{String(result?.matched.length ?? 0).padStart(2, '0')}</b>
        </div>
        <div className="qz-readout__row qz-readout__row--sm">
          <span className="t-label">Honest gaps</span>
          <b className="t-dot qz-gapnum">{String(result?.gaps.length ?? 0).padStart(2, '0')}</b>
        </div>
        <p className="qz-quip" key={result ? 'r' : 'i'} aria-hidden>
          {!result ? 'Paste a JD. Nothing leaves this browser.' : found ? jdLevel(result.score).label + '.' : 'No skills I recognise yet.'}
        </p>
      </div>
    </aside>
  );
}

function JdMatcher({ text, setText, result, setResult }: { text: string; setText: (s: string) => void; result: MatchResult | null; setResult: (r: MatchResult | null) => void }) {
  const id = useId();
  const resRef = useRef<HTMLDivElement>(null);
  const lastSent = useRef('');
  const [err, setErr] = useState('');

  const run = (value = text) => {
    if (!value.trim()) {
      setErr('Paste a job description first, or try the sample.');
      sfx('error', { gain: 0.5 });
      return;
    }
    setErr('');
    const r = matchJD(value);
    setResult(r);
    sfx('pop');
    const found = r.matched.length + r.gaps.length;
    const key = `${value.length}:${value.slice(0, 80)}`;
    track('jd_match', { score: r.score, found, words: r.words });
    if (found && lastSent.current !== key) {
      lastSent.current = key;
      const lvl = jdLevel(r.score);
      // the JD text itself is never sent: only the score and the skill areas it found
      void submit('quiz', {
        mode: 'jd',
        result: `jd-${lvl.id}`,
        resultLabel: `JD matcher: ${lvl.label}`,
        percent: r.score,
        matched: r.matched.map((s) => s.id),
        gaps: r.gaps.map((s) => s.id),
        words: r.words,
        sessionId: game().sessionId,
      }).catch(() => {});
    }
    window.setTimeout(() => resRef.current?.scrollIntoView({ block: 'nearest', behavior: reduced() ? 'auto' : 'smooth' }), 80);
  };

  const ask = () => {
    track('jd_moci', {});
    focus('moci', { ask: `Is Adelia a good fit for this role? ${text.slice(0, 700)}`, nonce: Date.now() });
  };
  const book = () => {
    track('quiz_cta', { cta: 'book', from: 'jd' });
    focus('printer', { tab: 'hiring', interest: result ? `jd:${result.score}` : 'jd' });
  };
  const found = result ? result.matched.length + result.gaps.length : 0;
  const lvl = result ? jdLevel(result.score) : null;

  return (
    <div className="qz-jd">
      <form
        className="qz-jd__form"
        onSubmit={(e) => {
          e.preventDefault();
          run();
        }}
      >
        <label className="field">
          <span>Job description</span>
          <textarea
            id={id}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              if (err) setErr('');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                run();
              }
            }}
            rows={8}
            placeholder="Paste the role here: the requirements section is enough."
            aria-invalid={!!err}
            aria-describedby={err ? `${id}-err` : `${id}-fine`}
          />
        </label>
        {err && (
          <p className="qz-err" id={`${id}-err`} role="alert">
            {err}
          </p>
        )}
        <div className="qz-jd__keys">
          <button type="submit" className="btn btn--primary">
            Match it
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => {
              setText(SAMPLE_JD);
              run(SAMPLE_JD);
            }}
          >
            Try a sample JD
          </button>
          <span className="t-label qz-hint">
            <kbd>Ctrl</kbd>+<kbd>Enter</kbd>
          </span>
        </div>
        <p className="qz-fine" id={`${id}-fine`}>
          The text stays in your browser. Only the score and the skill areas it found are counted, never the text itself.
        </p>
      </form>

      <div className="qz-jd__out" aria-live="polite" ref={resRef}>
        {!result ? (
          <div className="qz-jd__empty well">
            <p>Paste a job description and you’ll see what matches, with the project that proves it, and where the gaps are.</p>
          </div>
        ) : found === 0 ? (
          <div className="qz-jd__empty well">
            <p>I couldn’t find any skills I recognise in that text. Try pasting the requirements section, or ask Moci instead.</p>
            <button type="button" className="btn btn--sm" onClick={ask}>
              Ask Moci
            </button>
          </div>
        ) : (
          <div className="qz-jd__res">
            <div className="qz-jd__head">
              <div className="qz-jd__mini" aria-hidden>
                <Ring score={result.score} size={64} />
                <b className="t-dot">{result.score}</b>
              </div>
              <div>
                <p className="qz-jd__lvl">
                  {lvl?.label} · {result.score}%
                </p>
                <p className="qz-fine">
                  {result.matched.length} of {found} skill areas in this JD, weighted by how central they are.
                </p>
              </div>
            </div>

            <h4 className="rule">What it asks for, and her proof</h4>
            <ul className="qz-skills">
              {result.matched.map((s) => (
                <li key={s.id} className="qz-skill">
                  <span className="qz-skill__mark is-yes" aria-hidden>
                    <Icon name="check" size={12} />
                  </span>
                  <span className="qz-skill__txt">
                    <b>{s.label}</b> <span className="sr-only">(she has it)</span>
                    <span className="qz-skill__ev">{s.evidence}</span>
                    {s.project && workName(s.project) && (
                      <button type="button" className="qz-linkbtn" onClick={() => focus('gallery', { work: s.project })}>
                        Read {workName(s.project)} <Icon name="arrow-right" size={12} />
                      </button>
                    )}
                  </span>
                </li>
              ))}
            </ul>

            {result.gaps.length > 0 && (
              <>
                <h4 className="rule">Honest gaps</h4>
                <ul className="qz-skills">
                  {result.gaps.map((s) => (
                    <li key={s.id} className="qz-skill is-gap">
                      <span className="qz-skill__mark" aria-hidden>
                        –
                      </span>
                      <span className="qz-skill__txt">
                        <b>{s.label}</b> <span className="sr-only">(a gap)</span>
                        <span className="qz-skill__ev">{s.evidence}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}

            <div className="qz-ctas">
              <button type="button" className="btn btn--primary" onClick={book}>
                <Icon name="ticket" size={16} /> Book an intro call
              </button>
              <a className="btn" href={COMPANY.cv} download="Adelia-Tiara-CV.pdf" onClick={() => downloadCv('jd')}>
                <Icon name="download" size={16} /> Download the CV
              </a>
              <button type="button" className="btn btn--ghost" onClick={ask}>
                <Icon name="chat" size={16} /> Second opinion from Moci
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

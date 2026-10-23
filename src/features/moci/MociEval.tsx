/* ==========================================================================
   "How Moci is tested": the 25 eval cases (evals.ts) run through the
   offline brain right here in the visitor's browser, each with what a good
   answer must do, what Moci actually did, and pass / fail. Nothing is sent
   anywhere. The same cases run in Node: npm run eval:moci.
   ========================================================================== */
import { useEffect, useMemo, useRef, useState } from 'react';
import { sfx } from '@/audio/engine';
import { modelCard } from '@/content/profile';
import { Icon } from '@/ui/Icon';
import { think } from './brain';
import { MOCI_CASES, describeAnswer, type MociCase } from './evals';
import { evalRan, followSource } from './agent-store';

interface Row {
  pass: boolean;
  did: string;
  ms: number;
}

const KINDS: MociCase['kind'][] = ['Fact', 'Action', 'Honesty', 'Abstain'];
const KIND_NOTE: Record<MociCase['kind'], string> = {
  Fact: 'answers from her record, with the right source',
  Action: 'does the thing, inside the room only',
  Honesty: "won't exaggerate her experience",
  Abstain: "says it doesn't know",
};
const pad = (n: number) => String(n).padStart(2, '0');
/** "2,100+" from her model card: the hand-labelled eval cases behind her own products. */
const HER_EVALS = modelCard.evals.find((e) => /label/i.test(e.name))?.score;
const calm = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

function runAll(): { rows: Row[]; ms: number } {
  const t0 = performance.now();
  const rows = MOCI_CASES.map((c) => {
    const s = performance.now();
    const answer = think(c.q);
    let pass = false;
    try {
      pass = !!c.check(answer);
    } catch {
      pass = false;
    }
    return { pass, did: describeAnswer(answer), ms: performance.now() - s };
  });
  return { rows, ms: performance.now() - t0 };
}

export function MociEval() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [ms, setMs] = useState(0);
  // rows revealed so far: the run "ticks" down the list (all at once under reduced motion)
  const [shown, setShown] = useState(0);
  const timer = useRef<number | null>(null);
  const counts = useMemo(() => Object.fromEntries(KINDS.map((k) => [k, MOCI_CASES.filter((c) => c.kind === k).length])) as Record<MociCase['kind'], number>, []);

  useEffect(() => () => {
    if (timer.current) window.clearInterval(timer.current);
  }, []);

  const run = () => {
    if (timer.current) window.clearInterval(timer.current);
    sfx('click');
    const out = runAll();
    setRows(out.rows);
    setMs(out.ms);
    const passed = out.rows.filter((r) => r.pass).length;
    evalRan(passed, out.rows.length);
    if (calm()) {
      setShown(out.rows.length);
      sfx(passed === out.rows.length ? 'success' : 'error');
      return;
    }
    setShown(0);
    let i = 0;
    timer.current = window.setInterval(() => {
      i += 1;
      setShown(i);
      if (i >= out.rows.length) {
        if (timer.current) window.clearInterval(timer.current);
        timer.current = null;
        sfx(passed === out.rows.length ? 'success' : 'error');
      }
    }, 45);
  };

  const done = rows && shown >= rows.length;
  const passed = rows ? rows.slice(0, shown).filter((r) => r.pass).length : 0;
  const failedKnown = rows ? MOCI_CASES.filter((c, i) => c.known && !rows[i].pass).length : 0;

  return (
    <div className="moci-eval">
      <div className="moci-eval__head">
        <div className="moci-eval__intro">
          <p className="t-label">How Moci is tested · evals.ts</p>
          <h3>{MOCI_CASES.length} questions, checked every time Moci changes.</h3>
          <p>
            Questions visitors ask, plus ones that try to make Moci guess, exaggerate or leave the room. Each one has a check a good answer must pass. Running them sends nothing
            anywhere: they go through Moci’s offline brain, here in your browser. The same file runs on her machine with <code>npm run eval:moci</code>.
          </p>
        </div>
        <div className="moci-eval__meter">
          <div className="moci-eval__lcd lcd" aria-hidden>
            <span className="moci-eval__score t-dot">
              {rows ? pad(passed) : '--'}
              <small>/{MOCI_CASES.length}</small>
            </span>
            <span className="moci-eval__lcdline">{rows ? (done ? `${ms.toFixed(1)} ms · offline` : 'running…') : 'not run yet'}</span>
          </div>
          <button type="button" className="btn btn--primary moci-eval__run" onClick={run} disabled={!!rows && !done}>
            <Icon name="play" size={14} />
            {rows ? 'Run again' : `Run the ${MOCI_CASES.length} checks`}
          </button>
        </div>
      </div>

      <p className="moci-eval__status" role="status" aria-live="polite">
        {done
          ? `${passed} of ${rows!.length} passed in ${ms.toFixed(1)} ms${failedKnown ? `, ${failedKnown} known failure${failedKnown > 1 ? 's' : ''} (explained in the list)` : ''}.`
          : rows
            ? 'Running…'
            : ''}
      </p>

      <ul className="moci-eval__kinds" aria-label="Kinds of cases">
        {KINDS.map((k) => (
          <li key={k}>
            <span className={`moci-kind moci-kind--${k.toLowerCase()}`}>{k}</span>
            <span className="moci-eval__kindn t-mono">×{counts[k]}</span>
            <span className="moci-eval__kindnote">{KIND_NOTE[k]}</span>
          </li>
        ))}
      </ul>

      <ol className="moci-cases">
        {MOCI_CASES.map((c, i) => {
          const r = rows && i < shown ? rows[i] : null;
          const state = r ? (r.pass ? 'pass' : c.known ? 'known' : 'fail') : 'idle';
          return (
            <li key={c.q} className={`moci-case is-${state}`}>
              <span className="moci-case__n t-mono" aria-hidden>
                {pad(i + 1)}
              </span>
              <div className="moci-case__body">
                <p className="moci-case__q">{c.q}</p>
                <p className="moci-case__expect">
                  <span className="sr-only">A good answer: </span>
                  {c.expect}
                </p>
                {r && (
                  <p className="moci-case__did t-mono">
                    <span className="sr-only">What Moci did: </span>
                    <span>{r.did}</span>
                  </p>
                )}
                {r && !r.pass && c.known && <p className="moci-case__known">Known: {c.known}</p>}
              </div>
              <span className={`moci-kind moci-kind--${c.kind.toLowerCase()}`}>{c.kind}</span>
              <span className="moci-case__res">
                {state === 'idle' ? (
                  <span className="moci-case__dot" aria-label="Not run" />
                ) : state === 'pass' ? (
                  <>
                    <Icon name="check" size={14} stroke={2.2} /> Pass
                  </>
                ) : (
                  <>
                    <Icon name="close" size={13} stroke={2.2} /> {state === 'known' ? 'Known' : 'Fail'}
                  </>
                )}
              </span>
            </li>
          );
        })}
      </ol>

      <p className="moci-eval__foot">
        These test Moci, not Adelia. Her own evals{HER_EVALS ? ` (${HER_EVALS} cases labelled by hand)` : ''} sit on the toolkit shelf.{' '}
        <button type="button" className="moci-link" onClick={() => followSource('shelf/evals')}>
          Walk to the jar of marbles
          <Icon name="arrow-up-right" size={13} />
        </button>
      </p>
    </div>
  );
}

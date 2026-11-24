import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { call, chat, isTodo, person, posts, projects } from '@/content/site';
import { openOverlay, reducedMotion } from '@/state';
import { IconBack, IconNext } from './icons';

/** The four apps. Every word comes from src/content/site.ts; TODO_SEA values show as drafts. */

type AppProps = { onBack: () => void };

function AppHead({ title, sub, onBack, right, titleId }: { title: string; sub?: string; onBack: () => void; right?: ReactNode; titleId: string }) {
  return (
    <header className="ph-apphead">
      <button className="ph-back" onClick={onBack} aria-label="Back to home screen" data-phone-back>
        <IconBack />
      </button>
      <div className="ph-apptitle">
        <h3 id={titleId}>{title}</h3>
        {sub && <p className="ph-appsub">{sub}</p>}
      </div>
      <div className="ph-head-r">{right}</div>
    </header>
  );
}

/* ---------- Posts: her long About as a feed ------------------------------------------------------ */

export function Posts({ onBack }: AppProps) {
  const id = useId();
  const drafts = posts.filter((p) => isTodo(p.title) || isTodo(p.body) || isTodo(p.date)).length;
  const live = posts.length - drafts;
  return (
    <section className="ph-appview" aria-labelledby={id}>
      <AppHead titleId={id} title="Posts" sub={`${live} posts · ${drafts} drafts`} onBack={onBack} />
      <ol className="ph-feed ph-scroll">
        {posts.map((p) => {
          const draft = isTodo(p.title) || isTodo(p.body) || isTodo(p.date);
          return (
            <li key={p.id} className="ph-post" data-draft={draft || undefined}>
              <div className="ph-post-head">
                <span className="ph-avatar" aria-hidden="true">
                  {person.firstName.charAt(0)}
                </span>
                <span className="ph-post-who">{person.name}</span>
                <span className="ph-post-date">{draft ? 'Draft' : p.date}</span>
              </div>
              <h4>{p.title}</h4>
              <p>{p.body}</p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/* ---------- Chat: the recruiter FAQ, answered one bubble at a time -------------------------------- */

type Msg = { key: string; from: 'her' | 'you'; text: string; draft?: boolean; action?: 'email' | 'work' | 'cv' };

const GREETING = `Hi, I'm ${person.firstName}. Pick a question below. For anything else, email me.`;
const BEAT = 560; // the typing beat before each answer bubble
const mailto = `mailto:${person.email}`;

/** What was asked survives closing the phone, for the rest of the visit. */
const memory: { asked: number[] } = { asked: [] };

function answerMsgs(i: number): Msg[] {
  const qa = chat[i];
  return qa.a.map((text, j) => ({
    key: `a${i}-${j}`,
    from: 'her' as const,
    text,
    draft: isTodo(text),
    action: j === qa.a.length - 1 ? qa.action : undefined,
  }));
}
function exchange(i: number): Msg[] {
  return [{ key: `q${i}`, from: 'you', text: chat[i].q }, ...answerMsgs(i)];
}

export function Chat({ onBack }: AppProps) {
  const id = useId();
  const [msgs, setMsgs] = useState<Msg[]>(() => [{ key: 'hi', from: 'her', text: GREETING }, ...memory.asked.flatMap(exchange)]);
  const [asked, setAsked] = useState<number[]>(() => [...memory.asked]);
  const [typing, setTyping] = useState(false);
  const timers = useRef<number[]>([]);
  const pending = useRef<Msg[]>([]);
  const logRef = useRef<HTMLOListElement>(null);

  const clear = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  useEffect(() => clear, []);

  // Keep the newest bubble in view.
  useEffect(() => {
    const el = logRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: reducedMotion() ? 'auto' : 'smooth' });
  }, [msgs, typing]);

  /** Deliver whatever is still queued at once (a new question interrupts the typing beat). */
  const flush = () => {
    clear();
    if (pending.current.length) {
      const rest = pending.current;
      pending.current = [];
      setMsgs((m) => [...m, ...rest]);
    }
    setTyping(false);
  };

  const ask = (i: number) => {
    flush();
    memory.asked = [...memory.asked, i];
    setAsked(memory.asked);
    setMsgs((m) => [...m, { key: `q${i}`, from: 'you', text: chat[i].q }]);
    const answers = answerMsgs(i);
    pending.current = [...answers];
    setTyping(true);
    answers.forEach((msg, j) => {
      const t = window.setTimeout(() => {
        pending.current = pending.current.filter((p) => p.key !== msg.key);
        setMsgs((m) => [...m, msg]);
        setTyping(j < answers.length - 1);
      }, BEAT * (j + 1) + j * 240);
      timers.current.push(t);
    });
  };

  const showAll = () => {
    clear();
    pending.current = [];
    const rest = chat.map((_, i) => i).filter((i) => !memory.asked.includes(i));
    memory.asked = [...memory.asked, ...rest];
    setAsked(memory.asked);
    setTyping(false);
    setMsgs([{ key: 'hi', from: 'her', text: GREETING }, ...memory.asked.flatMap(exchange)]);
  };

  const left = chat.map((qa, i) => ({ qa, i })).filter(({ i }) => !asked.includes(i));

  return (
    <section className="ph-appview ph-chat" aria-labelledby={id}>
      <AppHead
        titleId={id}
        title={person.firstName}
        sub="Saved answers"
        onBack={onBack}
        right={
          left.length > 0 ? (
            <button className="ph-headbtn" onClick={showAll}>
              Show all
            </button>
          ) : null
        }
      />
      <ol className="ph-log ph-scroll" ref={logRef} role="log" aria-live="polite" aria-relevant="additions" aria-label="Conversation">
        {msgs.map((m) => (
          <li key={m.key} className="ph-msg-row" data-from={m.from}>
            <p className="ph-msg" data-from={m.from} data-draft={m.draft || undefined}>
              <span className="sr-only">{m.from === 'her' ? `${person.firstName}: ` : 'You: '}</span>
              {m.text}
            </p>
            {m.action === 'work' && (
              <button className="btn btn-sm ph-msg-act" onClick={() => openOverlay({ kind: 'run', id: 'p1' })}>
                Open {projects[0].run}
              </button>
            )}
            {m.action === 'cv' && (
              <a className="btn btn-sm ph-msg-act" href={mailto}>
                Ask for the CV by email
              </a>
            )}
            {m.action === 'email' && (
              <a className="btn btn-sm ph-msg-act" href={mailto}>
                Write to {person.email}
              </a>
            )}
          </li>
        ))}
      </ol>
      {typing && (
        <div className="ph-typing" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      )}
      <div className="ph-chips" role="group" aria-label="Questions you can ask">
        {left.map(({ qa, i }) => (
          <button key={i} className="ph-chip" onClick={() => ask(i)}>
            {qa.q}
          </button>
        ))}
        <a className="ph-chip ph-chip-commit" href={mailto}>
          Email me
        </a>
      </div>
    </section>
  );
}

/* ---------- Call: captions now, her voice later ---------------------------------------------------- */

const captionMs = (text: string) => Math.min(4200, Math.max(1900, text.length * 55));
const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

export function Call({ onBack }: AppProps) {
  const id = useId();
  const [phase, setPhase] = useState<'idle' | 'live' | 'done'>('idle');
  const [shown, setShown] = useState(0);
  const [secs, setSecs] = useState(0);
  const [skipped, setSkipped] = useState(false);
  const timers = useRef<number[]>([]);
  const tick = useRef(0);
  const capsRef = useRef<HTMLOListElement>(null);
  const noVoice = isTodo(call.audio);

  const stop = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    clearInterval(tick.current);
  };
  useEffect(() => stop, []);

  useEffect(() => {
    const el = capsRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [shown]);

  const start = () => {
    stop();
    setSkipped(false);
    setPhase('live');
    setShown(1);
    setSecs(0);
    tick.current = window.setInterval(() => setSecs((s) => s + 1), 1000);
    let at = 0;
    call.captions.forEach((text, i) => {
      at += captionMs(text);
      const t = window.setTimeout(() => {
        if (i < call.captions.length - 1) setShown(i + 2);
        else {
          clearInterval(tick.current);
          setPhase('done');
        }
      }, at);
      timers.current.push(t);
    });
  };
  const showAll = () => {
    stop();
    setSkipped(true);
    setShown(call.captions.length);
    setPhase('done');
  };
  const end = () => {
    stop();
    setSkipped(false);
    setPhase('idle');
    setShown(0);
    setSecs(0);
  };

  const state =
    phase === 'idle' ? 'Captions only' : phase === 'live' ? `On the line · ${mmss(secs)}` : skipped ? 'All captions' : `Call ended · ${mmss(secs)}`;

  return (
    <section className="ph-appview ph-call" aria-labelledby={id}>
      <AppHead titleId={id} title="Call" onBack={onBack} />
      <div className="ph-call-body">
        <div className="ph-callee">
          <span className="ph-callee-face" aria-hidden="true">
            {person.firstName.charAt(0)}
          </span>
          <p className="ph-callee-name">{person.name}</p>
          <p className="ph-callee-state">{state}</p>
        </div>
        {noVoice && (
          <p className="chip ph-call-note" data-todo>
            TODO_SEA: voice recording
          </p>
        )}
        <ol className="ph-captions" ref={capsRef} aria-live="polite" aria-label="Captions">
          {call.captions.slice(0, shown).map((c, i) => (
            <li key={i} className="ph-cap" data-current={i === shown - 1 || undefined}>
              {c}
            </li>
          ))}
        </ol>
        <div className="ph-callctl">
          {phase === 'idle' && (
            <button className="btn" onClick={start}>
              Start the call
            </button>
          )}
          {phase === 'live' && (
            <>
              <button className="btn btn-ghost" onClick={showAll}>
                Show all
              </button>
              <button className="btn" onClick={end}>
                End
              </button>
            </>
          )}
          {phase === 'done' && (
            <>
              <button className="btn btn-ghost" onClick={start}>
                Replay
              </button>
              <button className="btn" onClick={end}>
                End
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

/* ---------- Work: the three runs ----------------------------------------------------------------- */

export function Work({ onBack }: AppProps) {
  const id = useId();
  return (
    <section className="ph-appview" aria-labelledby={id}>
      <AppHead titleId={id} title="Work" sub="Framed on her wall" onBack={onBack} />
      <ul className="ph-runs ph-scroll">
        {projects.map((p) => {
          const meta = [p.role, p.year, p.status].filter((v) => !isTodo(v));
          const metaTodo = meta.length === 0;
          return (
            <li key={p.id}>
              <button className="ph-run" onClick={() => openOverlay({ kind: 'run', id: p.id })}>
                <span className="ph-run-body">
                  <span className="ph-run-tag">{p.run}</span>
                  <span className="ph-run-name" data-todo={isTodo(p.name) || undefined}>
                    {p.name}
                  </span>
                  <span className="ph-run-result" data-todo={isTodo(p.result) || undefined}>
                    {p.result}
                  </span>
                  <span className="ph-run-meta">
                    {metaTodo ? (
                      <span className="chip" data-todo>
                        TODO_SEA: role, year, status
                      </span>
                    ) : (
                      meta.map((m) => (
                        <span key={m} className="chip">
                          {m}
                        </span>
                      ))
                    )}
                  </span>
                </span>
                <span className="ph-run-go" aria-hidden="true">
                  <IconNext />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

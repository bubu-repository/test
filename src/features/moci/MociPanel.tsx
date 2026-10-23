/* ==========================================================================
   RM-19 · Moci — Adelia's AI agent, brought up close out of the clear jelly
   plush at the right end of her desk.

   A chat that answers from her content with a source (the object in the
   room the facts come from; tap it and the camera walks there), abstains
   when it isn't sure, and acts in the room with four tools: walk_to,
   copy_email, set_sound, book_chat. Online it's Claude (server/agent.mjs);
   without the API it answers from the offline brain in the browser, and
   says which one answered. "How Moci is tested" runs its 25 eval cases
   right here.

   Props (openPanel('moci', …) / openMoci() in agent-store.ts):
     ask   a question to answer on arrival (with `nonce` to ask it again)
     view  'evals' to open on "How Moci is tested"
   ========================================================================== */
import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Stage } from '@/ui/Panel';
import { Icon } from '@/ui/Icon';
import { sfx } from '@/audio/engine';
import { track } from '@/lib/api';
import { projects } from '@/content/projects';
import { MociAvatar, type MociMood } from './MociAvatar';
import { MociEval } from './MociEval';
import { RECRUITER_QUESTIONS } from './brain';
import { MOCI_CASES } from './evals';
import { sourceFor } from './knowledge';
import { ask, followSource, useMoci, type MociMessage } from './agent-store';
import './moci.css';

export { MociAvatar } from './MociAvatar';

const TOOLS: { name: string; does: string }[] = [
  { name: 'walk_to', does: 'walks you to an object' },
  { name: 'copy_email', does: 'copies her email' },
  { name: 'set_sound', does: 'sound on or off' },
  { name: 'book_chat', does: 'takes you to the printer' },
];

const coarse = () => typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
const narrow = () => typeof matchMedia !== 'undefined' && matchMedia('(max-width: 720px)').matches;
const calm = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ------------------------------------------------------------ the panel */

export default function MociPanel({ ask: question, nonce, view: initialView }: { ask?: string; nonce?: number; view?: string }) {
  const messages = useMoci((s) => s.messages);
  const busy = useMoci((s) => s.busy);
  const mode = useMoci((s) => s.mode);
  const view = useMoci((s) => s.view);
  const announce = useMoci((s) => s.announce);
  const setView = useMoci((s) => s.setView);
  const reset = useMoci((s) => s.reset);
  const ids = useId();

  // opened from elsewhere in the room: arrive on a view, or with a question to answer
  const asked = useRef<string | null>(null);
  useEffect(() => {
    track('moci', { action: 'open', from: question ? 'handoff' : 'room' });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (initialView === 'evals' || initialView === 'chat') setView(initialView);
  }, [initialView, setView]);
  useEffect(() => {
    const key = `${question ?? ''}·${nonce ?? ''}`;
    if (!question || asked.current === key) return;
    asked.current = key;
    const t = setTimeout(() => void ask(question), calm() ? 50 : 650);
    return () => clearTimeout(t);
  }, [question, nonce]);

  const last = [...messages].reverse().find((m) => m.role === 'moci');
  const mood: MociMood = busy ? 'think' : last?.abstained ? 'oops' : 'happy';

  const tabs: { id: 'chat' | 'evals'; label: string }[] = [
    { id: 'chat', label: 'Ask Moci' },
    { id: 'evals', label: 'How Moci is tested' },
  ];
  const onTabKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const next = view === 'chat' ? 'evals' : 'chat';
    setView(next);
    document.getElementById(`${ids}-tab-${next}`)?.focus();
  };

  return (
    <Stage
      code="RM-19"
      title="Moci"
      kicker="Her AI agent · answers with sources"
      bleed
      className="moci-stage"
      actions={
        view === 'chat' && messages.length > 0 ? (
          <button
            type="button"
            className="btn btn--sm moci-new"
            onClick={() => {
              sfx('click');
              reset();
            }}
            disabled={busy}
          >
            New chat
          </button>
        ) : null
      }
    >
      <div className="moci">
        <aside className="moci__side" aria-label="About Moci">
          <div className="moci__who">
            <div className="moci-plinth">
              <MociAvatar size={120} mood={mood} shadow blink title={`Moci, ${mood === 'think' ? 'thinking' : mood === 'oops' ? 'not sure' : 'happy'}`} />
              <span className="moci-plinth__slab" aria-hidden />
            </div>
            <Status mode={mode} busy={busy} />
          </div>

          <div className="moci-tabs" role="tablist" aria-label="Moci" onKeyDown={onTabKey}>
            {tabs.map((t) => (
              <button
                key={t.id}
                id={`${ids}-tab-${t.id}`}
                type="button"
                role="tab"
                aria-selected={view === t.id}
                aria-controls={`${ids}-view`}
                tabIndex={view === t.id ? 0 : -1}
                className={`moci-tab ${view === t.id ? 'is-on' : ''}`}
                onClick={() => {
                  if (view === t.id) return;
                  sfx('click');
                  setView(t.id);
                  track('moci', { action: 'view', view: t.id });
                }}
              >
                {t.label}
                {t.id === 'evals' && <span className="moci-tab__n t-mono">{MOCI_CASES.length}</span>}
              </button>
            ))}
          </div>

          <dl className="moci-spec">
            <div>
              <dt className="t-label">Knows</dt>
              <dd>{projects.length} case studies, her record and every object in this room</dd>
            </div>
            <div>
              <dt className="t-label">Shows</dt>
              <dd>the object each answer comes from</dd>
            </div>
            <div>
              <dt className="t-label">When unsure</dt>
              <dd>says so, and points you to her email</dd>
            </div>
            <div>
              <dt className="t-label">Tools</dt>
              <dd>
                <ul className="moci-tools">
                  {TOOLS.map((t) => (
                    <li key={t.name}>
                      <code>{t.name}()</code> <span>{t.does}</span>
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
          </dl>
          <p className="moci-side__note">Moci is an AI agent, not Adelia. Facts come from her own write-ups.</p>
        </aside>

        <section className="moci__main" id={`${ids}-view`} role="tabpanel" aria-labelledby={`${ids}-tab-${view}`}>
          {view === 'chat' ? (
            <Chat messages={messages} busy={busy} />
          ) : (
            <div className="moci-evalwrap scroll">
              <MociEval />
            </div>
          )}
        </section>
      </div>
      {/* the finished answer, read once (the typed-out text isn't announced word by word) */}
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {announce}
      </p>
    </Stage>
  );
}

/* ------------------------------------------------------------ status readout */

function Status({ mode, busy }: { mode: 'ready' | 'online' | 'offline'; busy: boolean }) {
  const line =
    mode === 'online'
      ? { big: 'ONLINE', small: 'Claude · room tools', led: 'led--green' }
      : mode === 'offline'
        ? { big: 'OFFLINE', small: 'Offline brain · in browser', led: 'led--blue' }
        : { big: 'READY', small: 'Claude · offline backup', led: 'led--blue' };
  return (
    <div className="moci-status lcd" role="img" aria-label={`Status: ${busy ? 'thinking' : line.big.toLowerCase()}. ${line.small}.`}>
      <span className="moci-status__row">
        <span className={`led ${line.led} ${busy ? 'led--blink' : ''}`} aria-hidden />
        <span className="moci-status__big t-dot">{busy ? 'THINKING' : line.big}</span>
      </span>
      <span className="moci-status__small">{line.small}</span>
    </div>
  );
}

/* ------------------------------------------------------------ the chat */

function Chat({ messages, busy }: { messages: MociMessage[]; busy: boolean }) {
  const [draft, setDraft] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const log = useRef<HTMLDivElement>(null);
  const inputId = useId();

  // keep the newest line in view while it types out
  useEffect(() => {
    const el = log.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: calm() ? 'auto' : 'smooth' });
  }, [messages]);

  // a keyboard is ready to type into (not on phones, where it would cover the answer)
  useEffect(() => {
    if (coarse()) return;
    const t = setTimeout(() => input.current?.focus({ preventScroll: true }), 760);
    return () => clearTimeout(t);
  }, []);

  const send = (text: string, via: 'typed' | 'chip' = 'typed') => {
    const q = text.trim();
    if (!q || busy) return;
    sfx(via === 'chip' ? 'click' : 'key');
    if (via === 'chip') track('moci', { action: 'suggestion', q });
    setDraft('');
    void ask(q);
  };
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    send(draft);
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    // ↑ in an empty field brings back the last question
    if (e.key === 'ArrowUp' && !draft) {
      const prev = [...messages].reverse().find((m) => m.role === 'user');
      if (prev) {
        e.preventDefault();
        setDraft(prev.text);
      }
    }
  };

  const last = messages[messages.length - 1];
  const followups = last && last.role === 'moci' && !last.pending ? last.followups : [];

  return (
    <div className="moci-chat">
      <div className="moci-log scroll" ref={log} aria-label="Conversation with Moci" aria-busy={busy} tabIndex={-1}>
        {messages.length === 0 ? (
          <Hello onAsk={(q) => send(q, 'chip')} />
        ) : (
          messages.map((m) => (m.role === 'user' ? <UserLine key={m.id} m={m} /> : <MociLine key={m.id} m={m} />))
        )}
      </div>

      <div className="moci-dock">
        {followups.length > 0 && (
          <div className="moci-chips" role="group" aria-label="Ask next">
            {followups.map((f) => (
              <button key={f} type="button" className="moci-chip" disabled={busy} onClick={() => send(f, 'chip')}>
                {f}
              </button>
            ))}
          </div>
        )}
        <form className="moci-ask" onSubmit={onSubmit}>
          <label htmlFor={inputId} className="sr-only">
            Ask Moci about Adelia’s work
          </label>
          <input
            id={inputId}
            ref={input}
            className="input moci-ask__input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKey}
            placeholder={narrow() ? 'Ask about Adelia’s work…' : 'Ask about her work, her stack, when she can start…'}
            maxLength={600}
            autoComplete="off"
            enterKeyHint="send"
          />
          <button type="submit" className="btn btn--primary btn--icon moci-ask__send" disabled={busy || !draft.trim()} aria-label="Ask Moci">
            <Icon name="arrow-right" size={18} stroke={2} />
          </button>
        </form>
      </div>
    </div>
  );
}

function Hello({ onAsk }: { onAsk: (q: string) => void }) {
  return (
    <div className="moci-hello">
      <p className="moci-hello__hi">Hi, I’m Moci.</p>
      <p className="moci-hello__lead">
        I know Adelia’s {projects.length} case studies, her record and this room. Every answer shows the object it comes from, and when I’m not sure, I say so instead of
        guessing.
      </p>
      <p className="t-label moci-hello__label">Hiring teams usually ask</p>
      <ul className="moci-starters">
        {RECRUITER_QUESTIONS.map((q, i) => (
          <li key={q}>
            <button type="button" className="moci-starter" onClick={() => onAsk(q)}>
              <span className="moci-starter__n t-mono" aria-hidden>
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="moci-starter__q">{q}</span>
              <Icon name="arrow-right" size={16} className="moci-starter__go" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function UserLine({ m }: { m: MociMessage }) {
  return (
    <div className="moci-msg moci-msg--user">
      <p>
        <span className="sr-only">You: </span>
        {m.text}
      </p>
    </div>
  );
}

function MociLine({ m }: { m: MociMessage }) {
  const src = m.source ? sourceFor(m.source) : undefined;
  const thinking = m.pending && !m.text;
  return (
    <div className={`moci-msg moci-msg--moci ${m.abstained ? 'is-abstained' : ''}`}>
      <MociAvatar size={30} mood={thinking ? 'think' : m.abstained ? 'oops' : 'happy'} className="moci-msg__face" />
      <div className="moci-msg__card">
        {thinking ? (
          <span className="moci-dots" role="img" aria-label="Moci is thinking">
            <i />
            <i />
            <i />
          </span>
        ) : (
          <p className="moci-msg__text">
            <span className="sr-only">Moci: </span>
            {m.text}
          </p>
        )}

        {m.actions.length > 0 && (
          <ul className="moci-acts" aria-label="What Moci did in the room">
            {m.actions.map((a, i) => (
              <li key={i} className={`moci-act ${a.done ? 'is-done' : ''}`}>
                {a.done ? <Icon name="check" size={13} stroke={2.2} /> : <span className="moci-act__wait" aria-hidden />}
                <span>{a.label}</span>
                <span className="sr-only">{a.done ? '(done)' : '(about to happen)'}</span>
              </li>
            ))}
          </ul>
        )}

        {!m.pending && (
          <div className="moci-meta">
            <span className="moci-meta__brain t-label">
              <span className={`led ${m.brain === 'online' ? 'led--green' : 'led--blue'}`} aria-hidden />
              {m.brain === 'online' ? 'Claude · online' : 'Offline brain'}
            </span>
            {m.abstained && <span className="moci-meta__abstain t-label">Abstained · not sure</span>}
            {src && (
              <button type="button" className="moci-src" onClick={() => followSource(src.key)} aria-label={`Source: ${src.label}. Walk there.`}>
                <span className="moci-src__k t-mono" aria-hidden>
                  Source
                </span>
                <span>{src.label}</span>
                <Icon name="arrow-up-right" size={13} stroke={2} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

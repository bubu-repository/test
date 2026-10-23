/* Mail — write to Adelia from her computer. A real message: it lands in
   the admin's Enquiries (`leads`, source os-mail) and she replies by email. */
import { useId, useRef, useState, type FormEvent } from 'react';
import { COMPANY } from '@/lib/content';
import { submit, track } from '@/lib/api';
import { sfx } from '@/audio/engine';
import { game } from '@/state/game';
import { focus } from '@/stage/director';
import { wait } from '../util';
import { useOS } from '../wm';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
type Field = 'name' | 'email' | 'message';

export default function Mail({ subject: initialSubject }: { subject?: string }) {
  const uid = useId();
  const [name, setName] = useState(() => game().name);
  const [email, setEmail] = useState(() => game().email);
  const [company, setCompany] = useState('');
  const [subject, setSubject] = useState(initialSubject || 'Hello from your room');
  const [message, setMessage] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [err, setErr] = useState<{ field?: Field; text: string } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const calm = useOS((s) => s.calm);

  const fail = (text: string, field?: Field) => {
    setErr({ text, field });
    sfx('error');
    if (field) requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>(`#${CSS.escape(`${uid}-${field}`)}`)?.focus());
  };

  const send = async (e?: FormEvent) => {
    e?.preventDefault();
    if (state === 'sending') return;
    if (!name.trim()) return fail('Who should she reply to? Add your name.', 'name');
    if (!EMAIL_RE.test(email.trim())) return fail('That email address looks off.', 'email');
    if (message.trim().length < 2) return fail('Write her at least a line.', 'message');
    setErr(null);
    setState('sending');
    sfx('paper');
    try {
      game().setProfile({ name: name.trim(), email: email.trim() });
      await Promise.all([
        submit('leads', {
          source: 'os-mail',
          name: name.trim(),
          email: email.trim(),
          company: company.trim(),
          subject: subject.trim(),
          message: message.trim(),
          to: COMPANY.email,
          sessionId: game().sessionId,
          points: game().points,
        }),
        wait(calm ? 200 : 1100),
      ]);
      track('os_mail_sent');
      track('email', { from: 'os' });
      sfx('whoosh');
      setTimeout(() => sfx('success'), 380);
      setState('sent');
    } catch {
      setState('idle');
      fail('The line dropped. Try again, or email her directly.');
    }
  };

  const clear = (f: Field) => err?.field === f && setErr(null);
  const invalid = (f: Field) => (err?.field === f ? true : undefined);
  const errId = `${uid}-err`;

  if (state === 'sent')
    return (
      <div className="os-mail os-mail--sent" role="status">
        <div className="os-mail__plane" aria-hidden>
          <svg viewBox="0 0 64 64" width="72" height="72">
            <path d="M6 30 58 8 46 56 32 40 24 52 22 36z" fill="#fff" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            <path d="M22 36 58 8 32 40" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            <path d="M44 22.6s-3-1.9-3-3.9a1.6 1.6 0 0 1 3-.8 1.6 1.6 0 0 1 3 .8c0 2-3 3.9-3 3.9z" fill="var(--accent)" />
          </svg>
        </div>
        <p className="t-label">Message sent</p>
        <h3>On its way to Adelia</h3>
        <p className="t-muted">
          She reads every one herself. {COMPANY.replyTime}, to {email.trim()}.
        </p>
        <div className="os-mail__after">
          <button
            className="btn btn--sm"
            onClick={() => {
              sfx('click');
              setMessage('');
              setState('idle');
            }}
          >
            Write another
          </button>
          <button
            className="btn btn--sm btn--primary"
            onClick={() => {
              track('cta', { from: 'os-mail', to: 'printer' });
              focus('printer');
            }}
          >
            Book a chat too
          </button>
        </div>
      </div>
    );

  return (
    <form ref={formRef} className={`os-mail ${state === 'sending' ? 'is-sending' : ''}`} onSubmit={send} noValidate aria-describedby={err ? errId : undefined}>
      <div className="os-toolbar">
        <button type="submit" className="btn btn--sm btn--primary" disabled={state === 'sending'}>
          {state === 'sending' ? 'Sending…' : 'Send'}
        </button>
        <span className="os-toolbar__meta" aria-live="polite">
          {state === 'sending' ? `Sending to ${COMPANY.city}…` : 'New message'}
        </span>
      </div>
      <div className="os-mail__sheet">
        <div className="os-mail__row">
          <span>To</span>
          <span className="chip chip--dark">Adelia Tiara · {COMPANY.email}</span>
        </div>
        <div className="os-mail__row">
          <label htmlFor={`${uid}-name`}>Name</label>
          <input id={`${uid}-name`} value={name} onChange={(e) => (setName(e.target.value), clear('name'))} placeholder="Your name" autoComplete="name" aria-invalid={invalid('name')} aria-required="true" maxLength={80} />
        </div>
        <div className="os-mail__row">
          <label htmlFor={`${uid}-email`}>From</label>
          <input
            id={`${uid}-email`}
            value={email}
            onChange={(e) => (setEmail(e.target.value), clear('email'))}
            placeholder="you@company.com"
            type="email"
            autoComplete="email"
            inputMode="email"
            aria-invalid={invalid('email')}
            aria-required="true"
            maxLength={254}
          />
        </div>
        <div className="os-mail__row">
          <label htmlFor={`${uid}-company`}>Team</label>
          <input id={`${uid}-company`} value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company or team (optional)" autoComplete="organization" maxLength={120} />
        </div>
        <div className="os-mail__row">
          <label htmlFor={`${uid}-subject`}>Subject</label>
          <input id={`${uid}-subject`} value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={140} />
        </div>
        <label className="sr-only" htmlFor={`${uid}-message`}>
          Message
        </label>
        <textarea
          id={`${uid}-message`}
          className="os-mail__body"
          value={message}
          onChange={(e) => (setMessage(e.target.value), clear('message'))}
          placeholder="Hiring for an AI product role? Say what the team builds and what her first month would look like. Or just say hi."
          aria-invalid={invalid('message')}
          aria-required="true"
          maxLength={4000}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void send();
          }}
        />
        <p className="os-mail__sig">— Sent from Adelia OS 26.10 · {COMPANY.city}</p>
        {err && (
          <p className="os-mail__err" role="alert" id={errId}>
            {err.text}
          </p>
        )}
        <p className="os-mail__alt">
          Prefer your own mail app?{' '}
          <a className="link" href={`mailto:${COMPANY.email}?subject=${encodeURIComponent(subject || 'Hello Adelia')}`} onClick={() => track('email', { from: 'os-mailto' })}>
            {COMPANY.email}
          </a>
        </p>
      </div>
    </form>
  );
}

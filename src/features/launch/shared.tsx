/* ==========================================================================
   Launch module — shared bits used by the coming-soon page (LaunchPage) and
   the in-room countdown station (LaunchPanel):
     useLaunch()      content.launch with LAUNCH_DEFAULT fallback
     useCountdown()   ticking { d, h, m, s, done }
     <Countdown>      dot-matrix DD HH MM SS
     <WaitlistForm>   "tell me when she's available": email (+ optional name/company) → submit('waitlist')
     <ShareRow>       copy link · X · LinkedIn · WhatsApp (· native share)
   ========================================================================== */
import { useEffect, useId, useRef, useState, type FormEvent, type RefObject } from 'react';
import { getContent, submit, track, type SiteContent } from '@/lib/api';
import { COMPANY, LAUNCH_DEFAULT } from '@/lib/content';
import { game, useGame } from '@/state/game';
import { audio, sfx } from '@/audio/engine';
import { Icon } from '@/ui/Icon';

export type Launch = SiteContent['launch'];

export function useLaunch(): { launch: Launch; loaded: boolean } {
  const [launch, setLaunch] = useState<Launch>({ ...LAUNCH_DEFAULT, enabled: false });
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let live = true;
    getContent()
      .then((c) => live && setLaunch({ ...LAUNCH_DEFAULT, ...(c.launch || {}), enabled: !!c.launch?.enabled }))
      .catch(() => {})
      .finally(() => live && setLoaded(true));
    return () => {
      live = false;
    };
  }, []);
  return { launch, loaded };
}

export interface Remaining {
  d: number;
  h: number;
  m: number;
  s: number;
  done: boolean;
  valid: boolean;
}

export function remaining(target: number, now = Date.now()): Remaining {
  if (!Number.isFinite(target)) return { d: 0, h: 0, m: 0, s: 0, done: false, valid: false };
  const ms = Math.max(0, target - now);
  const t = Math.floor(ms / 1000);
  return { d: Math.floor(t / 86400), h: Math.floor((t % 86400) / 3600), m: Math.floor((t % 3600) / 60), s: t % 60, done: ms <= 0, valid: true };
}

export function useCountdown(iso: string): Remaining {
  const target = Date.parse(iso);
  const [r, setR] = useState(() => remaining(target));
  useEffect(() => {
    let id: ReturnType<typeof setTimeout>;
    const tick = () => {
      setR(remaining(target));
      id = setTimeout(tick, 1000 - (Date.now() % 1000) + 5);
    };
    tick();
    return () => clearTimeout(id);
  }, [target]);
  return r;
}

const pad = (n: number, w = 2) => String(n).padStart(w, '0');

/** Dot-matrix countdown. `ghost` draws unlit 8s behind the digits like a real LED panel. */
export function Countdown({ r, className = '', ghost = true, labels = true }: { r: Remaining; className?: string; ghost?: boolean; labels?: boolean }) {
  const groups: [string, string][] = [
    [r.d > 99 ? String(r.d) : pad(r.d), 'Days'],
    [pad(r.h), 'Hrs'],
    [pad(r.m), 'Min'],
    [pad(r.s), 'Sec'],
  ];
  const label = r.valid ? (r.done ? 'It’s here' : `${r.d} days, ${r.h} hours, ${r.m} minutes and ${r.s} seconds to go`) : 'Date to be announced';
  return (
    <div className={`lc-count ${className}`} role="timer" aria-label={label}>
      {groups.map(([v, l], i) => (
        <div className="lc-count__g" key={l}>
          {i > 0 && (
            <span className="lc-count__colon t-dot" aria-hidden>
              :
            </span>
          )}
          <span className="lc-count__cell" aria-hidden>
            {ghost && <span className="lc-count__ghost t-dot">{'8'.repeat(v.length)}</span>}
            <span className="lc-count__v t-dot">{r.valid ? v : '--'}</span>
            {labels && <span className="lc-count__l">{l}</span>}
          </span>
        </div>
      ))}
    </div>
  );
}

/** "Mon, 9 November 2026 · 09:00 WIB" in Bekasi time (WIB, Asia/Jakarta). */
export function formatLaunchDate(iso: string, opts: { short?: boolean; weekday?: boolean } = {}) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Date to be announced';
  const date = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta',
    ...(opts.weekday === false ? {} : { weekday: 'short' as const }),
    day: 'numeric',
    month: opts.short ? 'short' : 'long',
    year: 'numeric',
  }).format(d);
  const time = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
  return `${date} · ${time} WIB`;
}

const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]{1,64}@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;
export const isEmail = (s: string) => EMAIL_RE.test(s.trim());

const codeFrom = (id: string) =>
  'WL-' +
  id
    .replace(/[^a-z0-9]/gi, '')
    .slice(-6)
    .toUpperCase()
    .padStart(6, '0');

/** Waitlist form + success state. */
export function WaitlistForm({
  source,
  compact = false,
  launchTitle,
  inputRef,
  onJoined,
  promise = 'when her start date is set',
}: {
  source: string;
  compact?: boolean;
  launchTitle: string;
  inputRef?: RefObject<HTMLInputElement | null>;
  onJoined?: () => void;
  /** what the one email is about: "when her start date is set" / "when the door opens" */
  promise?: string;
}) {
  const uid = useId();
  const storedName = useGame((s) => s.name);
  const storedEmail = useGame((s) => s.email);
  const already = useGame((s) => !!s.stats.waitlist);
  const [email, setEmail] = useState(storedEmail);
  const [name, setName] = useState(storedName);
  const [company, setCompany] = useState('');
  const [more, setMore] = useState(false);
  const [touched, setTouched] = useState(false);
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>(already ? 'done' : 'idle');
  const [code, setCode] = useState<string>(() => {
    try {
      return localStorage.getItem('adelia.waitlist.code') || '';
    } catch {
      return '';
    }
  });
  const localRef = useRef<HTMLInputElement>(null);
  const ref = inputRef ?? localRef;

  const emailOk = isEmail(email);
  const showErr = touched && !emailOk;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    void audio.unlock();
    if (!emailOk) {
      sfx('error');
      ref.current?.focus();
      return;
    }
    setState('sending');
    sfx('click');
    try {
      const rec = await submit('waitlist', {
        email: email.trim(),
        name: name.trim(),
        company: company.trim(),
        source,
        launch: launchTitle,
        sessionId: game().sessionId,
      });
      const c = codeFrom(String(rec.id));
      setCode(c);
      try {
        localStorage.setItem('adelia.waitlist.code', c);
      } catch {}
      game().setProfile({ email: email.trim(), ...(name.trim() ? { name: name.trim() } : {}) });
      game().updateStats(() => ({ waitlist: true }));
      track('waitlist', { source });
      sfx('success');
      setState('done');
      onJoined?.();
    } catch {
      sfx('error');
      setState('error');
    }
  }

  if (state === 'done') {
    return (
      <div className={`lc-done ${compact ? 'lc-done--compact' : ''}`} role="status">
        <div className="lc-done__badge">
          <span className="led led--green" />
          <span className="t-label">On the list{code ? ` · ${code}` : ''}</span>
        </div>
        <p className="lc-done__title">You’re on the list.</p>
        <p className="lc-done__body">
          One email to {storedEmail || email || 'you'} {promise}. Terima kasih! Know a team that’s hiring? Pass it on:
        </p>
        <ShareRow title={launchTitle} />
        <button
          type="button"
          className="lc-link"
          onClick={() => {
            sfx('click');
            setState('idle');
            setEmail('');
            setTouched(false);
            setTimeout(() => ref.current?.focus(), 30);
          }}
        >
          Add another email
        </button>
      </div>
    );
  }

  return (
    <form className={`lc-form ${compact ? 'lc-form--compact' : ''}`} onSubmit={onSubmit} noValidate>
      <div className="lc-form__row">
        <label className="field lc-form__email">
          <span>Email</span>
          <input
            ref={ref}
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => email && setTouched(true)}
            aria-invalid={showErr}
            aria-describedby={showErr ? `${uid}-err` : undefined}
            required
          />
        </label>
        <button className="btn btn--primary lc-form__go" type="submit" disabled={state === 'sending'}>
          {state === 'sending' ? (
            <>
              <span className="lc-spin" aria-hidden /> Joining
            </>
          ) : (
            <>
              Notify me <Icon name="arrow-right" size={14} />
            </>
          )}
        </button>
      </div>
      {showErr && (
        <p className="lc-err" id={`${uid}-err`} role="alert">
          {email ? 'That email looks incomplete. Check for a typo?' : 'Add your email so she can send you the note.'}
        </p>
      )}
      {state === 'error' && (
        <p className="lc-err" role="alert">
          The line dropped. Please try again, or write to {COMPANY.email}.
        </p>
      )}
      {more ? (
        <div className="lc-form__more">
          <label className="field">
            <span>Name · optional</span>
            <input autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" maxLength={120} />
          </label>
          <label className="field">
            <span>Company · optional</span>
            <input autoComplete="organization" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Where you work" maxLength={160} />
          </label>
        </div>
      ) : (
        <button
          type="button"
          className="lc-link"
          onClick={() => {
            sfx('click');
            setMore(true);
          }}
        >
          <Icon name="plus" size={12} /> Add name &amp; company (optional)
        </button>
      )}
      <p className="lc-fine">One email {promise}. No newsletter, no spam.</p>
    </form>
  );
}

function shareUrl() {
  return `${location.origin}/`;
}

export function ShareRow({ title, url = shareUrl(), dark = false }: { title: string; url?: string; dark?: boolean }) {
  const [copied, setCopied] = useState(false);
  const text = `${COMPANY.name} (${COMPANY.role}, ${COMPANY.cohort.toLowerCase()}) is open to full-time roles. ${title}: her room is at`;
  const enc = encodeURIComponent;
  const links = [
    { id: 'x', label: 'X', href: `https://twitter.com/intent/tweet?text=${enc(text)}&url=${enc(url)}`, glyph: <XGlyph /> },
    { id: 'linkedin', label: 'LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`, glyph: <span className="lc-share__in">in</span> },
    { id: 'whatsapp', label: 'WhatsApp', href: `https://wa.me/?text=${enc(`${text} ${url}`)}`, glyph: <WaGlyph /> },
  ];
  const canNative = typeof navigator !== 'undefined' && 'share' in navigator;
  async function copy() {
    sfx('click');
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
      } catch {}
      ta.remove();
    }
    setCopied(true);
    track('share', { via: 'copy' });
    setTimeout(() => setCopied(false), 1800);
  }
  return (
    <div className={`lc-share ${dark ? 'lc-share--dark' : ''}`}>
      <button type="button" className="btn btn--sm lc-share__copy" onClick={copy} aria-live="polite">
        <Icon name={copied ? 'check' : 'share'} size={14} /> {copied ? 'Link copied' : 'Copy link'}
      </button>
      {links.map((l) => (
        <a
          key={l.id}
          className="btn btn--sm btn--icon lc-share__icon"
          href={l.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Share on ${l.label}`}
          title={`Share on ${l.label}`}
          onClick={() => {
            sfx('click');
            track('share', { via: l.id });
          }}
        >
          {l.glyph}
        </a>
      ))}
      {canNative && (
        <button
          type="button"
          className="btn btn--sm btn--icon lc-share__icon lc-share__native"
          aria-label="More sharing options"
          onClick={() => {
            sfx('click');
            navigator.share({ title, text, url }).then(() => track('share', { via: 'native' })).catch(() => {});
          }}
        >
          <Icon name="arrow-up-right" size={14} />
        </button>
      )}
    </div>
  );
}

function XGlyph() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <path d="M17.8 3h3.1l-6.8 7.7L22 21h-6.2l-4.9-6.4L5.3 21H2.2l7.3-8.3L2 3h6.4l4.4 5.8L17.8 3Zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5Z" />
    </svg>
  );
}
function WaGlyph() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round">
      <path d="M4 20l1.3-4A8 8 0 1 1 8.4 19l-4.4 1Z" />
      <path d="M9 8.5c0 3.5 3 6.5 6.5 6.5l1-1.6-2-1-1 .8c-1-.5-2-1.5-2.6-2.6l.8-1-1-2L9 8.5Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

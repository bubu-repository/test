/* ==========================================================================
   RM-05 · The ticket printer — Book a chat with Adelia.
   Two tabs: Hiring teams (intro call / interview slot, with preferred
   times in WIB and the visitor's own zone) and Say hi (coffee chat, or
   just a question). On success the pink receipt printer on the desk prints
   a ticket (flags: ticket + printing) and the same ticket slides out here,
   ready to save as a PNG or pencil into a calendar (tentative: she
   confirms by email). Bookings land in `rsvps` (eventName + code), a
   question in `leads`.

   props: { tab?: 'hiring' | 'hi' | 'session' | 'event', event?: string, interest?: string, work?: string }
   ========================================================================== */
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent as RKeyboardEvent, type ReactNode } from 'react';
import { Sheet } from '@/ui/Panel';
import { Icon } from '@/ui/Icon';
import { sfx } from '@/audio/engine';
import { getContent, submit, track } from '@/lib/api';
import { COMPANY, EVENTS, PRODUCTS, STACKS, WORK, type StackId } from '@/lib/content';
import { game, useGame } from '@/state/game';
import { useUI } from '@/state/ui';
import { STATIONS } from '@/stage/stations';
import { buildICS, dotCode, downloadBlob, minutesOf, renderTicketPNG, stubLine, ticketCode, type TicketData } from './ticket';
import { SlotPicker, slotLabel, visitorZone, type Slot } from './slots';
import './rsvp.css';

type Tab = 'hiring' | 'hi';
type EventItem = (typeof EVENTS)[number];

interface Props {
  tab?: string;
  event?: string;
  interest?: string;
  work?: string;
}

const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]{1,64}@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;

/** Not a booking: a message she answers by email (lands in `leads`). */
const QUESTION: EventItem = {
  id: 'question',
  name: 'Just a question',
  date: '',
  city: 'By email',
  venue: 'By email, from her inbox',
  body: 'Ask about a case study, the Tenderlens thesis, her evals, or how this room was made. She answers by email.',
};

const HIRING_IDS = new Set(['session', 'interview']);
const isHiring = (e: EventItem) => HIRING_IDS.has(e.id) || (/intro|interview|hiring/i.test(e.name) && !/coffee/i.test(e.name));

const tabOf = (t?: string): Tab | null => (!t ? null : /^(hi|event|coffee|question|hello)$/i.test(t) ? 'hi' : 'hiring');

/** What the visitor came from (a Toolkit object, a fit-check result, a case study). */
function interestOf(raw?: string, work?: string): { value: string; label: string } | null {
  const k = (raw || '').trim();
  if (k) {
    const p = PRODUCTS.find((x) => x.id === k || `product:${x.id}` === k);
    if (p) return { value: `product:${p.id}`, label: `${p.name} (${p.model})` };
    if (k in STACKS) return { value: `fit:${k}`, label: `Fit check: ${STACKS[k as StackId].name}` };
    const w = WORK.find((x) => x.id === k);
    if (w) return { value: `work:${w.id}`, label: `${w.client} case study` };
    if (k === 'vault') return { value: 'work:tenderlens', label: 'Tenderlens, from the gacha machine' };
    const jd = /^jd(?::(\d{1,3}))?$/.exec(k);
    if (jd) return { value: 'jd', label: jd[1] ? `JD matcher: ${jd[1]}% match` : 'The JD matcher' };
    return { value: `other:${k}`, label: k.replace(/[-_:]+/g, ' ') };
  }
  const w = WORK.find((x) => x.id === work);
  return w ? { value: `work:${w.id}`, label: `${w.client} case study` } : null;
}

const venueLine = (e: { venue: string; city: string }) => (e.city && !e.venue.includes(e.city) ? `${e.venue}, ${e.city}` : e.venue);

function eventWhen(iso: string) {
  const d = new Date(iso);
  if (!iso || Number.isNaN(d.getTime())) return null;
  const part = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jakarta', ...o }).format(d);
  return {
    day: part({ day: '2-digit' }),
    mon: part({ month: 'short' }).toUpperCase(),
    wd: part({ weekday: 'short' }).toUpperCase(),
    long: `${part({ weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })} · ${part({ hour: '2-digit', minute: '2-digit', hour12: false })} WIB`,
    past: d.getTime() < Date.now() - 6 * 3600_000,
  };
}

/* ------------------------------------------------------------------ panel */

export default function RsvpPanel(props: Props) {
  const st = STATIONS.printer;
  const [events, setEvents] = useState<EventItem[]>(EVENTS);
  const initialTab: Tab = tabOf(props.tab) ?? (props.event && !isHiring(EVENTS.find((e) => e.id === props.event) ?? QUESTION) ? 'hi' : 'hiring');
  const [tab, setTab] = useState<Tab>(initialTab);
  const [ticket, setTicket] = useState<{ data: TicketData; event: EventItem; slot?: string } | null>(null);
  const person = usePerson();
  const interest = useMemo(() => interestOf(props.interest, props.work), [props.interest, props.work]);
  const tabsRef = useRef<HTMLDivElement>(null);
  const uid = useId().replace(/:/g, '');

  useEffect(() => {
    getContent()
      .then((c) => c.events?.length && setEvents(c.events))
      .catch(() => {});
    track('rsvp_open', { tab: initialTab, from: props.interest || props.work || '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hiring = events.filter(isHiring);
  const hi = [...events.filter((e) => !isHiring(e)), QUESTION];

  function switchTab(t: Tab, focusIt = false) {
    if (t === tab) return;
    sfx('switch');
    setTab(t);
    if (focusIt) requestAnimationFrame(() => tabsRef.current?.querySelector<HTMLButtonElement>(`[data-tab="${t}"]`)?.focus());
  }
  const onTabsKey = (e: RKeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      switchTab(e.key === 'ArrowRight' || e.key === 'End' ? 'hi' : 'hiring', true);
    }
  };
  const done = (data: TicketData, event: EventItem, slot?: string) => setTicket({ data, event, slot });

  return (
    <Sheet code={st.code} kicker={st.name} title={ticket ? 'Your ticket' : 'Book a chat'} className="rv-sheet">
      {ticket ? (
        <TicketView
          ticket={ticket.data}
          event={ticket.event}
          slot={ticket.slot}
          onAgain={() => {
            sfx('click');
            setTicket(null);
          }}
        />
      ) : (
        <div className="rv">
          <div className="rv-tabs" role="tablist" aria-label="Who’s booking?" ref={tabsRef} onKeyDown={onTabsKey}>
            <button
              type="button"
              role="tab"
              id={`${uid}-tab-hiring`}
              data-tab="hiring"
              aria-selected={tab === 'hiring'}
              aria-controls={`${uid}-pane`}
              tabIndex={tab === 'hiring' ? 0 : -1}
              className={`rv-tab ${tab === 'hiring' ? 'is-on' : ''}`}
              onClick={() => switchTab('hiring')}
            >
              <span className={`led led--blue ${tab === 'hiring' ? '' : 'led--off'}`} /> Hiring teams
            </button>
            <button
              type="button"
              role="tab"
              id={`${uid}-tab-hi`}
              data-tab="hi"
              aria-selected={tab === 'hi'}
              aria-controls={`${uid}-pane`}
              tabIndex={tab === 'hi' ? 0 : -1}
              className={`rv-tab ${tab === 'hi' ? 'is-on' : ''}`}
              onClick={() => switchTab('hi')}
            >
              <span className={`led ${tab === 'hi' ? '' : 'led--off'}`} /> Say hi
            </button>
          </div>
          <div id={`${uid}-pane`} role="tabpanel" aria-labelledby={`${uid}-tab-${tab}`}>
            {tab === 'hiring' ? (
              <BookingForm key="hiring" kind="hiring" options={hiring} initial={props.event} interest={interest} p={person} onDone={done} />
            ) : (
              <BookingForm key="hi" kind="hi" options={hi} initial={props.event} interest={interest} p={person} onDone={done} />
            )}
          </div>
        </div>
      )}
    </Sheet>
  );
}

/* ------------------------------------------------------------------ shared */

interface Errors {
  [k: string]: string | undefined;
}

function Field({ id, label, error, children, hint, optional }: { id: string; label: string; error?: string; children: ReactNode; hint?: string; optional?: boolean }) {
  return (
    <div className={`field rv-field ${error ? 'is-err' : ''}`}>
      <label htmlFor={id}>
        <span>
          {label}
          {optional ? <em> · optional</em> : <em aria-hidden> *</em>}
        </span>
      </label>
      {children}
      {error ? (
        <p className="rv-err" id={`${id}-err`}>
          <Icon name="close" size={12} /> {error}
        </p>
      ) : hint ? (
        <p className="rv-hint" id={`${id}-hint`}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function usePerson() {
  const storedName = useGame((s) => s.name);
  const storedEmail = useGame((s) => s.email);
  const [name, setName] = useState(storedName);
  const [email, setEmail] = useState(storedEmail);
  const [company, setCompany] = useState('');
  return { name, setName, email, setEmail, company, setCompany };
}
type Person = ReturnType<typeof usePerson>;

function fireTicket(t: TicketData) {
  const ui = useUI.getState();
  ui.setFlag('ticket', { title: t.title, name: t.name, date: t.date, venue: t.venue, code: t.code });
  ui.setFlag('printing', Date.now());
  sfx('print');
}

const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

function focusFirstError(uid: string, errs: Errors, order: string[]) {
  const k = order.find((x) => errs[x]);
  if (!k) return;
  const el = document.getElementById(`${uid}-${k}`) as HTMLElement | null;
  el?.focus();
  el?.scrollIntoView({ block: 'center', behavior: reduced() ? 'auto' : 'smooth' });
}

/** "jobs.example.com/123" → "https://jobs.example.com/123"; '' when it isn't a web link. */
function normaliseUrl(raw: string): string {
  const s = raw.trim();
  if (!s) return '';
  try {
    const u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
    return /\./.test(u.hostname) ? u.toString() : '';
  } catch {
    return '';
  }
}

/* ------------------------------------------------------------------ the form */

function BookingForm({
  kind,
  options,
  initial,
  interest,
  p,
  onDone,
}: {
  kind: Tab;
  options: EventItem[];
  initial?: string;
  interest: { value: string; label: string } | null;
  p: Person;
  onDone: (t: TicketData, ev: EventItem, slot?: string) => void;
}) {
  const uid = useId().replace(/:/g, '');
  const firstOpen = options.find((e) => !eventWhen(e.date)?.past)?.id ?? '';
  const [eventId, setEventId] = useState<string>(initial && options.some((e) => e.id === initial) ? initial : firstOpen);
  const [role, setRole] = useState('');
  const [jd, setJd] = useState('');
  // from a case study (props.work): start the note with the case's name, e.g. "Re: Tenderlens. "
  const [note, setNote] = useState(() => (interest?.value.startsWith('work:') ? `Re: ${interest.label.replace(/ case study$|, from the gacha machine$/, '')}. ` : ''));
  const [picks, setPicks] = useState<Slot[]>([]);
  const [errors, setErrors] = useState<Errors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const hiring = kind === 'hiring';
  const optionIds = options.map((o) => o.id).join();

  useEffect(() => {
    // content may arrive after mount
    if (!eventId || !options.some((e) => e.id === eventId)) setEventId(initial && options.some((e) => e.id === initial) ? initial : firstOpen);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [optionIds]);

  const event = options.find((x) => x.id === eventId);
  const isQuestion = event?.id === QUESTION.id;
  const dated = !!(event && eventWhen(event.date));
  const showSlots = !!event && !isQuestion && !dated;

  const validate = (): Errors => {
    const e: Errors = {};
    if (!eventId) e.event = 'Pick what kind of chat first.';
    if (!p.name.trim()) e.name = 'Who should the ticket be for?';
    if (!p.email.trim()) e.email = 'Add an email so she can reply.';
    else if (!EMAIL_RE.test(p.email.trim())) e.email = 'That email looks off. Check for a typo?';
    if (hiring && !p.company.trim()) e.company = 'Which company is hiring?';
    if (hiring && jd.trim() && !normaliseUrl(jd)) e.jd = 'That doesn’t look like a web link. Paste the full URL, or leave it empty.';
    if (isQuestion && note.trim().length < 3) e.note = 'Write your question here.';
    return e;
  };
  // live re-validation of touched fields
  useEffect(() => {
    const e = validate();
    setErrors((prev) => Object.fromEntries(Object.keys({ ...prev, ...touched }).map((k) => [k, touched[k] ? e[k] : undefined])));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.name, p.email, p.company, jd, note, eventId, touched]);

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault();
    const e = validate();
    setTouched({ event: true, name: true, email: true, company: hiring, jd: hiring, note: isQuestion });
    setErrors(e);
    if (Object.values(e).some(Boolean) || !event) {
      sfx('error');
      focusFirstError(uid, e, ['event', 'name', 'email', 'company', 'jd', 'note']);
      return;
    }
    const zone = visitorZone();
    const when = eventWhen(event.date);
    const slots = showSlots ? picks : [];
    const code = ticketCode(isQuestion ? 'AQ' : 'AT');
    const name = p.name.trim();
    const email = p.email.trim();
    const company = p.company.trim();
    setSending(true);
    setFailed(false);
    sfx('click');
    try {
      const common = {
        name,
        email,
        company,
        role: role.trim(),
        code,
        source: 'rsvp-panel',
        timeZone: zone.tz,
        interest: interest?.value ?? '',
        interestLabel: interest?.label ?? '',
        sessionId: game().sessionId,
      };
      if (isQuestion) {
        await submit('leads', { ...common, kind: 'question', interestLabel: interest?.label || 'A question', message: note.trim() });
        track('email', { from: 'printer', kind: 'question' });
        track('lead', { source: 'printer', kind: 'question' });
      } else {
        await submit('rsvps', {
          ...common,
          eventId: event.id,
          eventName: event.name,
          eventDate: event.date,
          kind,
          kindLabel: hiring ? 'Hiring team' : 'Say hi',
          venue: event.venue,
          city: event.city,
          jdUrl: hiring ? normaliseUrl(jd) : '',
          slots: slots.map((s) => s.iso),
          slotsLabel: slots.map((s) => slotLabel(s, zone.city)),
          slot: slots[0]?.iso ?? event.date ?? '',
          notes: note.trim(),
        });
        game().updateStats(() => ({ rsvp: event.id }));
        track('rsvp', { event: event.id, kind, slots: slots.length });
      }
      game().setProfile({ name, email });
      const first = slots[0];
      const t: TicketData = {
        kind: isQuestion ? 'question' : kind,
        title: event.name,
        name: name + (company ? ` · ${company}` : ''),
        date: isQuestion
          ? 'She answers within a day'
          : when
            ? when.long
            : first
              ? `${first.day} · ${first.wib} WIB${slots.length > 1 ? ` (+${slots.length - 1} more)` : ''}`
              : 'She replies with times in WIB',
        local: !isQuestion && !when && first?.local ? first.local : undefined,
        venue: venueLine(event),
        code,
      };
      fireTicket(t);
      onDone(t, event, first?.iso ?? (when ? event.date : undefined));
    } catch {
      sfx('error');
      setFailed(true);
    } finally {
      setSending(false);
    }
  }

  const blur = (k: string) => setTouched((t) => ({ ...t, [k]: true }));
  const describe = (k: string, hint?: boolean) => (errors[k] ? `${uid}-${k}-err` : hint ? `${uid}-${k}-hint` : undefined);

  return (
    <form ref={formRef} className={`rv-form rv-form--${kind}`} onSubmit={onSubmit} noValidate>
      {hiring ? (
        <div className="rv-intro well">
          <span className="led led--green" aria-hidden />
          <p>
            <b>Open to work.</b> {COMPANY.availability} She replies within a day, with times in WIB and in yours.
          </p>
        </div>
      ) : (
        <div className="rv-intro well">
          <span className="led" aria-hidden />
          <p>
            <b>Not hiring? Say hi anyway.</b> Students, builders and the curious are welcome: a coffee chat, or one good question.
          </p>
        </div>
      )}
      {interest && (
        <p className="rv-from">
          <span className="t-label">About</span> <span className="chip chip--primary">{interest.label}</span>
        </p>
      )}

      <fieldset className="rv-events" aria-describedby={errors.event ? `${uid}-event-err` : undefined}>
        <legend className="rule">{hiring ? 'What kind of chat?' : 'Coffee or a question?'}</legend>
        {options.map((e, i) => {
          const w = eventWhen(e.date);
          const on = e.id === eventId;
          const disabled = !!w?.past;
          const mins = e.id === QUESTION.id ? 0 : minutesOf(e.name, 0);
          return (
            <label key={e.id} className={`rv-ev ${on ? 'is-on' : ''} ${disabled ? 'is-past' : ''}`}>
              <input
                id={i === 0 ? `${uid}-event` : undefined}
                type="radio"
                name={`${uid}-ev`}
                value={e.id}
                checked={on}
                disabled={disabled}
                onChange={() => {
                  sfx('click');
                  setEventId(e.id);
                }}
                className="sr-only"
              />
              <span className="rv-ev__date lcd" aria-hidden>
                {w ? (
                  <>
                    <span className="t-label">{w.wd}</span>
                    <b className="t-dot">{w.day}</b>
                    <span className="t-label">{w.mon}</span>
                  </>
                ) : mins ? (
                  <>
                    <b className="t-dot">{mins}</b>
                    <span className="t-label">min</span>
                  </>
                ) : (
                  <>
                    <b className="t-dot">@</b>
                    <span className="t-label">email</span>
                  </>
                )}
              </span>
              <span className="rv-ev__main">
                <span className="rv-ev__name">{e.name}</span>
                <span className="rv-ev__meta">{w ? `${w.long} · ${venueLine(e)}` : venueLine(e)}</span>
                <span className="rv-ev__body">{e.body}</span>
              </span>
              <span className="rv-ev__check" aria-hidden>
                {disabled ? <span className="chip">Past</span> : <span className={`led ${hiring ? 'led--blue' : ''} ${on ? '' : 'led--off'}`} />}
              </span>
            </label>
          );
        })}
        {errors.event && (
          <p className="rv-err" id={`${uid}-event-err`}>
            {errors.event}
          </p>
        )}
      </fieldset>

      <div className="rule">{hiring ? 'You and the role' : 'About you'}</div>
      <div className="rv-grid">
        <Field id={`${uid}-name`} label="Your name" error={errors.name}>
          <input id={`${uid}-name`} autoComplete="name" value={p.name} onChange={(e) => p.setName(e.target.value)} onBlur={() => blur('name')} aria-invalid={!!errors.name} aria-required="true" aria-describedby={describe('name')} maxLength={120} placeholder="Your full name" />
        </Field>
        <Field id={`${uid}-email`} label={hiring ? 'Work email' : 'Email'} error={errors.email}>
          <input id={`${uid}-email`} type="email" inputMode="email" autoComplete="email" value={p.email} onChange={(e) => p.setEmail(e.target.value)} onBlur={() => blur('email')} aria-invalid={!!errors.email} aria-required="true" aria-describedby={describe('email')} maxLength={254} placeholder={hiring ? 'you@company.com' : 'you@example.com'} />
        </Field>
        <Field id={`${uid}-company`} label={hiring ? 'Company' : 'School or company'} error={errors.company} optional={!hiring}>
          <input id={`${uid}-company`} autoComplete="organization" value={p.company} onChange={(e) => p.setCompany(e.target.value)} onBlur={() => blur('company')} aria-invalid={!!errors.company} aria-required={hiring} aria-describedby={describe('company')} maxLength={160} placeholder={hiring ? 'Who’s hiring' : 'Where you study or work'} />
        </Field>
        {hiring && (
          <Field id={`${uid}-role`} label="The role" optional>
            <input id={`${uid}-role`} value={role} onChange={(e) => setRole(e.target.value)} maxLength={140} placeholder="e.g. AI Product Engineer" />
          </Field>
        )}
      </div>
      {hiring && (
        <Field id={`${uid}-jd`} label="Link to the job description" error={errors.jd} optional hint="She reads it before the call, so you can skip the basics.">
          <input id={`${uid}-jd`} type="url" inputMode="url" value={jd} onChange={(e) => setJd(e.target.value)} onBlur={() => jd && blur('jd')} aria-invalid={!!errors.jd} aria-describedby={describe('jd', true)} maxLength={600} placeholder="https://…" />
        </Field>
      )}

      {showSlots && <SlotPicker picks={picks} onChange={setPicks} />}

      <Field
        id={`${uid}-note`}
        label={isQuestion ? 'Your question' : hiring ? 'Anything she should know?' : 'What would you like to talk about?'}
        error={errors.note}
        optional={!isQuestion}
      >
        <textarea
          id={`${uid}-note`}
          rows={isQuestion ? 4 : 3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => isQuestion && blur('note')}
          aria-invalid={!!errors.note}
          aria-required={isQuestion}
          aria-describedby={describe('note')}
          maxLength={2000}
          placeholder={
            isQuestion
              ? 'e.g. How did you build the eval set for Tenderlens?'
              : hiring
                ? 'The team, the stage, who she’d meet, or times that suit you better'
                : 'Evals, field research, the thesis, or how this room was made'
          }
        />
      </Field>

      <div className="rv-submit">
        {failed && (
          <p className="rv-fail" role="alert">
            <Icon name="close" size={14} /> The printer jammed: your details didn’t go through.{' '}
            <button type="button" className="rv-linkbtn" onClick={() => formRef.current?.requestSubmit()}>
              Try again
            </button>{' '}
            or email{' '}
            <a className="link" href={`mailto:${COMPANY.email}`} onClick={() => track('email', { from: 'printer-error' })}>
              {COMPANY.email}
            </a>
            .
          </p>
        )}
        <p className="sr-only" role="status">
          {Object.values(errors).some(Boolean) ? 'Some fields need a fix. Each one says what, under the field.' : ''}
        </p>
        <button className="btn btn--primary btn--lg btn--block" type="submit" disabled={sending}>
          {sending ? (
            <>
              <span className="rv-spin" aria-hidden /> Printing your ticket…
            </>
          ) : (
            <>
              <Icon name={isQuestion ? 'mail' : 'ticket'} size={16} /> {isQuestion ? 'Send my question' : hiring ? 'Book it and print my ticket' : 'Print my ticket'}
            </>
          )}
        </button>
        <p className="rv-fine">Your details go to Adelia only, so she can reply to this. No mailing list.</p>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ ticket */

function DotCode({ code, rows = 7, cols = 30 }: { code: string; rows?: number; cols?: number }) {
  const grid = useMemo(() => dotCode(code, rows, cols), [code, rows, cols]);
  return (
    <svg className="rv-dots" viewBox={`0 0 ${cols} ${rows}`} preserveAspectRatio="none" aria-hidden>
      {grid.flatMap((row, r) => row.map((on, c) => (on ? <rect key={`${r}-${c}`} x={c + 0.08} y={r + 0.08} width={0.84} height={0.84} /> : null)))}
    </svg>
  );
}

function TicketView({ ticket, event, slot, onAgain }: { ticket: TicketData; event: EventItem; slot?: string; onAgain: () => void }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const isQuestion = ticket.kind === 'question';
  const ticketRef = useRef<HTMLElement>(null);
  const perfRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLParagraphElement>(null);

  // place the side notches exactly on the perforation line
  useLayoutEffect(() => {
    const place = () => {
      const t = ticketRef.current;
      const p = perfRef.current;
      if (t && p && t.offsetHeight) t.style.setProperty('--perf', `${p.offsetTop}px`);
    };
    place();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(place) : null;
    if (ticketRef.current) ro?.observe(ticketRef.current);
    return () => ro?.disconnect();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => sfx('success'), 1500);
    // the form is gone: move focus to the confirmation so keyboard and screen-reader users land on it
    headRef.current?.focus({ preventScroll: true });
    return () => clearTimeout(t);
  }, []);

  async function png() {
    setBusy(true);
    sfx('click');
    try {
      const blob = await renderTicketPNG(ticket);
      if (blob) {
        downloadBlob(blob, `adelia-ticket-${ticket.code}.png`);
        track('ticket_download', { code: ticket.code });
        setMsg('Ticket saved.');
      } else setMsg('Your browser could not draw the image.');
    } finally {
      setBusy(false);
    }
  }

  function ics() {
    if (!slot) return;
    sfx('click');
    const text = buildICS(event, ticket.code, slot);
    if (!text) return;
    downloadBlob(new Blob([text], { type: 'text/calendar;charset=utf-8' }), `adelia-${event.id}-tentative.ics`);
    track('ticket_ics', { event: event.id });
    setMsg('Calendar file saved, marked tentative until she confirms.');
  }

  return (
    <div className="rv-done">
      <div className="rv-printer" aria-hidden>
        <span className="rv-printer__slot" />
        <span className="led led--green rv-printer__led" />
        <span className="t-label rv-printer__label">RM-05 · Thermal</span>
      </div>
      <div className="rv-ticketwrap">
        <article ref={ticketRef} className="rv-ticket" aria-label={`Ticket ${ticket.code}: ${ticket.title}`}>
          <header className="rv-ticket__head t-dot">ADELIA’S ROOM · ADMIT ONE</header>
          <div className="rv-ticket__main">
            <h3 className="rv-ticket__title">{ticket.title}</h3>
            <dl className="rv-ticket__rows">
              <div>
                <dt className="t-label">{isQuestion ? 'From' : 'Guest'}</dt>
                <dd>{ticket.name}</dd>
              </div>
              <div>
                <dt className="t-label">When</dt>
                <dd>
                  {ticket.date}
                  {ticket.local && <small>{ticket.local} your time</small>}
                </dd>
              </div>
              <div className="rv-ticket__wide">
                <dt className="t-label">Where</dt>
                <dd>{ticket.venue}</dd>
              </div>
            </dl>
          </div>
          <div ref={perfRef} className="rv-ticket__perf" aria-hidden />
          <footer className="rv-ticket__stub">
            <div>
              <span className="t-label">Ticket no.</span>
              <b className="t-dot rv-ticket__code">{ticket.code}</b>
            </div>
            <DotCode code={ticket.code} />
            <span className="t-label rv-ticket__foot">
              <span className="led" /> {stubLine(ticket.kind)}
            </span>
          </footer>
        </article>
      </div>

      <div className="rv-thanks">
        <p className="rv-thanks__big" tabIndex={-1} ref={headRef}>
          Terima kasih! It’s on her desk.
        </p>
        <p className="rv-thanks__body">
          {isQuestion
            ? `Your question just printed on the printer in the room. She answers from ${COMPANY.email} within a day.`
            : `Your ticket just printed on the printer in the room. She replies from ${COMPANY.email} within a day${slot ? ' to confirm one of your times' : ', with times in WIB and in yours'}.`}
        </p>
      </div>

      <div className="rv-actions">
        <button type="button" className="btn btn--dark" onClick={png} disabled={busy}>
          <Icon name="download" size={16} /> {busy ? 'Drawing…' : 'Save ticket (PNG)'}
        </button>
        {slot && !isQuestion && (
          <button type="button" className="btn" onClick={ics}>
            <Icon name="calendar" size={16} /> Pencil it in (.ics)
          </button>
        )}
        <a
          className="btn"
          href={COMPANY.cv}
          download="Adelia-Tiara-CV.pdf"
          onClick={() => {
            sfx('click');
            track('cv_download', { from: 'printer' });
          }}
        >
          <Icon name="file" size={16} /> Her CV (PDF)
        </a>
      </div>
      <p className="rv-hint" aria-live="polite">
        {msg}
      </p>
      <button type="button" className="rv-linkbtn" onClick={onAgain}>
        {isQuestion ? 'Ask another question' : 'Book another chat'}
      </button>
    </div>
  );
}

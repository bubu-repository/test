/* ==========================================================================
   /admin — the back office of Adelia's Room.
   Login (keypad) → dashboard with a left rail:
   Overview · Bookings · Enquiries · Guestbook · Moci · Fit checks ·
   Leaderboard · Launch list · Analytics · Content
   Talks to the Node API when it is up ("Live API"), otherwise reads this
   browser's localStorage ("Local demo mode").
   ========================================================================== */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { adminData, adminDelete, adminSetNoteApproved, type AdminData, type Collection, type Record_, type SiteContent } from '@/lib/api';
import { PRODUCTS } from '@/lib/content';
import { COLOR_LABEL, SPECIES_LABEL } from '@/content/guestbook';
import { ACHIEVEMENTS, tierFor } from '@/state/achievements';
import { STATION_LIST } from '@/stage/stations';
import { Icon, type IconName } from '@/ui/Icon';
import { Login } from './Login';
import { Overview } from './Overview';
import { DataTable, ConfirmDialog, cell, type Column } from './DataTable';
import { ContentEditor } from './ContentEditor';
import { HBars, useTick } from './charts';
import { eventTypes, fmtAgo, isHouseNote, prettify, quizKey, quizLabel, topQuestions, ts } from './metrics';
import './admin.css';

type Section = 'overview' | 'rsvps' | 'leads' | 'guestbook' | 'questions' | 'quiz' | 'leaderboard' | 'waitlist' | 'analytics' | 'content';
interface Auth {
  token: string;
  mode: 'remote' | 'local';
  exp: number;
}

const NAV: { id: Section; label: string; icon: IconName; blurb: string; count?: keyof AdminData['collections'] }[] = [
  { id: 'overview', label: 'Overview', icon: 'monitor', blurb: 'How the room is working for her search' },
  { id: 'rsvps', label: 'Bookings', icon: 'calendar', blurb: 'Intro calls, interview slots and coffee chats booked at the printer', count: 'rsvps' },
  { id: 'leads', label: 'Enquiries', icon: 'mail', blurb: 'Messages and role enquiries sent from the room', count: 'leads' },
  { id: 'guestbook', label: 'Guestbook', icon: 'jelly', blurb: 'Notes released into the aquarium', count: 'guestbook' },
  { id: 'questions', label: 'Moci', icon: 'chat', blurb: 'What visitors asked Moci, and which brain answered', count: 'questions' },
  { id: 'quiz', label: 'Fit checks', icon: 'question', blurb: 'Results of the 60-second role-fit check', count: 'quiz' },
  { id: 'leaderboard', label: 'Leaderboard', icon: 'trophy', blurb: 'Guest Pass holders, game scores and redemptions', count: 'profiles' },
  { id: 'waitlist', label: 'Launch list', icon: 'rocket', blurb: 'People waiting for what’s next', count: 'waitlist' },
  { id: 'analytics', label: 'Analytics', icon: 'map', blurb: 'Raw interaction events', count: 'analytics' },
  { id: 'content', label: 'Content', icon: 'paper', blurb: 'Newspaper, slots and events, launch countdown, redirect and ticker' },
];

const KEY = 'adelia.admin.auth';
function readAuth(): Auth | null {
  try {
    const a = JSON.parse(sessionStorage.getItem(KEY) || 'null') as Auth | null;
    return a && a.exp > Date.now() ? a : null;
  } catch {
    return null;
  }
}

export default function AdminApp() {
  const [auth, setAuth] = useState<Auth | null>(readAuth);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const prev = document.title;
    document.title = 'Back office · Adelia’s Room';
    document.body.classList.add('adm-body');
    let robots = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    const created = !robots;
    if (!robots) {
      robots = document.createElement('meta');
      robots.name = 'robots';
      document.head.appendChild(robots);
    }
    robots.content = 'noindex, nofollow';
    return () => {
      document.title = prev;
      document.body.classList.remove('adm-body');
      if (created) robots?.remove();
    };
  }, []);

  const logout = useCallback((msg = '') => {
    try {
      sessionStorage.removeItem(KEY);
    } catch {}
    setNotice(msg);
    setAuth(null);
  }, []);

  if (!auth)
    return (
      <Login
        notice={notice}
        onAuth={(a) => {
          const full = { ...a, exp: Date.now() + 12 * 3600_000 - 60_000 };
          try {
            sessionStorage.setItem(KEY, JSON.stringify(full));
          } catch {}
          setNotice('');
          setAuth(full);
        }}
      />
    );
  return <Dashboard auth={auth} onLogout={logout} />;
}

/* ====================================================================== */

function sectionFromHash(): Section {
  const h = location.hash.replace('#', '') as Section;
  return NAV.some((n) => n.id === h) ? h : 'overview';
}

function Dashboard({ auth, onLogout }: { auth: Auth; onLogout: (msg?: string) => void }) {
  const [section, setSection] = useState<Section>(sectionFromHash);
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshedAt, setRefreshedAt] = useState(0);
  const [contentDirty, setContentDirty] = useState(false);
  const [pending, setPending] = useState<Section | null>(null);
  const [navOpen, setNavOpen] = useState(false);
  useTick(30_000);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await adminData(auth.token);
      setData(d);
      setError('');
      setRefreshedAt(Date.now());
    } catch (e) {
      const m = (e as Error).message || '';
      if (/^401/.test(m)) onLogout('Your sign-in expired. Sign in again.');
      else setError('Could not reach the data. Showing the last copy.');
    } finally {
      setLoading(false);
    }
  }, [auth.token, onLogout]);

  useEffect(() => {
    void load();
  }, [load]);

  // live mode: refresh every minute while visible (not while editing content)
  useEffect(() => {
    if (data?.mode !== 'remote') return;
    const id = setInterval(() => {
      if (document.visibilityState === 'visible' && section !== 'content') void load();
    }, 60_000);
    return () => clearInterval(id);
  }, [data?.mode, section, load]);

  useEffect(() => {
    const h = () => setSection(sectionFromHash());
    window.addEventListener('hashchange', h);
    return () => window.removeEventListener('hashchange', h);
  }, []);

  function go(s: string) {
    const next = s as Section;
    if (section === 'content' && contentDirty && next !== 'content') {
      setPending(next);
      return;
    }
    setSection(next);
    setNavOpen(false);
    history.replaceState(null, '', `#${next}`);
    document.querySelector('.adm-main')?.scrollTo({ top: 0 });
  }

  const del = useCallback(
    (collection: Collection) => async (r: Record_) => {
      await adminDelete(auth.token, collection, r.id);
      setData((d) => (d ? { ...d, collections: { ...d.collections, [collection]: d.collections[collection].filter((x) => x.id !== r.id) } } : d));
    },
    [auth.token],
  );

  const setApproved = useCallback(
    async (r: Record_, approved: boolean) => {
      await adminSetNoteApproved(auth.token, r.id, approved);
      setData((d) => (d ? { ...d, collections: { ...d.collections, guestbook: d.collections.guestbook.map((x) => (x.id === r.id ? { ...x, approved } : x)) } } : d));
    },
    [auth.token],
  );

  const mode = data?.mode ?? auth.mode;
  const nav = NAV.find((n) => n.id === section)!;

  return (
    <div className="adm">
      <aside className={`adm-rail ${navOpen ? 'is-open' : ''}`} aria-label="Back office navigation">
        <div className="adm-rail__brand">
          <span className="adm-rail__logo" aria-hidden>
            <b>AT</b>
            <i />
          </span>
          <div>
            <b>Adelia’s Room</b>
            <span className="t-label">Back office · RM-99</span>
          </div>
          <button className="btn btn--sm btn--icon adm-rail__menu" onClick={() => setNavOpen((o) => !o)} aria-expanded={navOpen} aria-label="Menu">
            <Icon name={navOpen ? 'close' : 'menu'} size={16} />
          </button>
        </div>
        <nav className="adm-rail__nav">
          {NAV.map((n) => {
            const count = n.count && data ? data.collections[n.count]?.length ?? 0 : null;
            return (
              <button key={n.id} className={`adm-nav ${section === n.id ? 'is-on' : ''}`} onClick={() => go(n.id)} aria-current={section === n.id ? 'page' : undefined}>
                <Icon name={n.icon} size={16} />
                <span>{n.label}</span>
                {count != null && <em>{count > 999 ? `${Math.floor(count / 1000)}K` : count}</em>}
                {n.id === 'content' && contentDirty && <i className="adm-dirty" aria-label="unsaved changes" />}
              </button>
            );
          })}
        </nav>
        <div className="adm-rail__foot">
          <ModeBadge mode={mode} />
          <a className="btn btn--sm btn--ghost btn--block" href="/" target="_blank" rel="noopener">
            Open the room <Icon name="arrow-up-right" size={14} />
          </a>
          <button className="btn btn--sm btn--block" onClick={() => onLogout('Signed out.')}>
            Sign out
          </button>
          <span className="t-label adm-rail__build">build 2026.10 · adelia.cc</span>
        </div>
      </aside>

      <main className="adm-main">
        <header className="adm-top">
          <div className="adm-top__t">
            <span className="t-label">
              <b className="t-primary">{String(NAV.indexOf(nav) + 1).padStart(2, '0')}</b> · {nav.blurb}
            </span>
            <h1>{nav.label}</h1>
          </div>
          <div className="adm-top__r">
            <ModeBadge mode={mode} compact />
            <span className="t-label adm-top__time" aria-live="polite">
              {loading ? 'Loading…' : refreshedAt ? `Updated ${fmtAgo(refreshedAt)}` : ''}
            </span>
            <button className="btn btn--sm btn--icon" onClick={() => void load()} aria-label="Refresh data" disabled={loading}>
              <svg className={loading ? 'adm-spin' : ''} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
                <path d="M20 12a8 8 0 1 1-2.34-5.66M20 4v5h-5" />
              </svg>
            </button>
          </div>
        </header>

        {error && (
          <div className="adm-alert" role="alert">
            <span className="led" /> {error}
            <button className="btn btn--sm" onClick={() => void load()}>
              Retry
            </button>
          </div>
        )}

        {!data ? (
          <div className="adm-loading">
            <span className="t-dot">LOADING</span>
          </div>
        ) : (
          <div className={`adm-body-in ${loading ? 'is-refreshing' : ''}`}>
            {section === 'overview' && <Overview data={data} onGo={go} />}
            {section === 'rsvps' && <BookingsSection rows={data.collections.rsvps} onDelete={del('rsvps')} events={data.content.events} />}
            {section === 'leads' && (
              <DataTable
                name="leads"
                noun={{ one: 'enquiry', many: 'enquiries' }}
                rows={data.collections.leads}
                columns={LEAD_COLS}
                onDelete={del('leads')}
                emptyTitle="No enquiries yet"
                emptyBody="Messages from Adelia OS mail, the fit check and the toolkit shelf arrive here."
              />
            )}
            {section === 'guestbook' && <GuestbookSection rows={data.collections.guestbook} onDelete={del('guestbook')} onApproved={setApproved} />}
            {section === 'questions' && <QuestionsSection rows={data.collections.questions} onDelete={del('questions')} />}
            {section === 'quiz' && <QuizSection rows={data.collections.quiz} onDelete={del('quiz')} />}
            {section === 'leaderboard' && <Leaderboard data={data} del={del} />}
            {section === 'waitlist' && (
              <DataTable
                name="waitlist"
                noun={{ one: 'sign-up', many: 'sign-ups' }}
                rows={data.collections.waitlist}
                columns={WAIT_COLS}
                onDelete={del('waitlist')}
                emptyTitle="Nobody on the launch list yet"
                emptyBody="Sign-ups from /launch and the LED sign arrive here."
              />
            )}
            {section === 'analytics' && <Analytics rows={data.collections.analytics} />}
            {section === 'content' && (
              <ContentEditor
                content={data.content}
                token={auth.token}
                onDirty={setContentDirty}
                onSaved={(c: SiteContent) => setData((d) => (d ? { ...d, content: c } : d))}
              />
            )}
          </div>
        )}
      </main>

      {pending && (
        <ConfirmDialog
          title="Leave without saving?"
          body="You have unsaved content changes. They will be lost if you leave this section."
          confirmLabel="Discard changes"
          onCancel={() => setPending(null)}
          onConfirm={() => {
            setContentDirty(false);
            const p = pending;
            setPending(null);
            setSection(p);
            history.replaceState(null, '', `#${p}`);
          }}
        />
      )}
    </div>
  );
}

function ModeBadge({ mode, compact }: { mode: 'remote' | 'local'; compact?: boolean }) {
  return (
    <span className={`adm-mode adm-mode--${mode} ${compact ? 'adm-mode--compact' : ''}`} title={mode === 'remote' ? 'Connected to the room’s API' : 'The API is not reachable — showing data stored in this browser only'}>
      <span className={`led ${mode === 'remote' ? 'led--green' : 'led--blink'}`} />
      <span>{mode === 'remote' ? 'Live API' : compact ? 'Local demo mode' : 'Local demo mode — data from this browser only'}</span>
    </span>
  );
}

/* ------------------------------------------------------------------ columns */
const dash = <span className="t-muted">—</span>;
const strong = (k: string) => (r: Record_) => <b className="adm-clip">{cell(r[k]) || dash}</b>;
const mail = (r: Record_) =>
  r.email ? (
    <a className="adm-clip adm-link" href={`mailto:${r.email}`} onClick={(e) => e.stopPropagation()}>
      {String(r.email)}
    </a>
  ) : (
    dash
  );
const chip = (k: string, cls = '') => (r: Record_) => (r[k] ? <span className={`chip ${cls}`}>{cell(r[k])}</span> : dash);
const clip = (v: string) => <span className="adm-clip">{v || dash}</span>;

const productName = (v: string) => {
  const id = v.replace(/^product:/, '');
  const p = PRODUCTS.find((x) => x.id === id);
  if (p) return `${p.model} · ${p.name}`;
  return prettify(v.replace(/^other:/, ''));
};
const leadAbout = (r: Record_) => cell(r.subject) || cell(r.interestLabel) || (r.interest ? productName(cell(r.interest)) : '') || cell(r.role);

const LEAD_COLS: Column[] = [
  { key: 'createdAt', label: 'When', width: '96px' },
  { key: 'name', label: 'Name', render: strong('name') },
  { key: 'email', label: 'Email', render: mail },
  { key: 'company', label: 'Company' },
  { key: 'about', label: 'About', value: leadAbout, render: (r) => clip(leadAbout(r)) },
  { key: 'timeline', label: 'Timeline', hideSm: true },
  { key: 'source', label: 'Source', render: chip('source'), hideSm: true },
];

const WAIT_COLS: Column[] = [
  { key: 'createdAt', label: 'When', width: '96px' },
  { key: 'email', label: 'Email', render: mail },
  { key: 'name', label: 'Name', render: strong('name') },
  { key: 'company', label: 'Company' },
  { key: 'source', label: 'Source', render: chip('source'), hideSm: true },
];

/* ------------------------------------------------------------------ bookings */
const bookingKind = (r: Record_) => cell(r.eventName) || cell(r.kindLabel) || cell(r.kind) || cell(r.eventId);

function BookingsSection({ rows, onDelete, events }: { rows: Record_[]; onDelete: (r: Record_) => Promise<void>; events: SiteContent['events'] }) {
  const [ev, setEv] = useState('');
  const ids = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of events) m.set(e.id, e.id === 'session' ? `${e.name} (booking)` : e.name);
    for (const r of rows) if (r.eventId && !m.has(String(r.eventId))) m.set(String(r.eventId), cell(r.eventName) || String(r.eventId));
    return [...m.entries()];
  }, [rows, events]);
  const filtered = ev ? rows.filter((r) => r.eventId === ev) : rows;
  const upcoming = filtered.filter((r) => {
    const t = Date.parse(cell(r.slot) || cell(r.when) || cell(r.date));
    return Number.isFinite(t) && t > Date.now();
  }).length;
  const cols: Column[] = [
    { key: 'createdAt', label: 'Booked', width: '96px' },
    { key: 'name', label: 'Name', render: strong('name') },
    { key: 'email', label: 'Email', render: mail },
    { key: 'eventName', label: 'Booking', value: bookingKind, render: (r) => clip(bookingKind(r)) },
    { key: 'company', label: 'Company', hideSm: true },
    { key: 'role', label: 'Role', hideSm: true },
    { key: 'code', label: 'Ticket', mono: true, hideSm: true },
  ];
  return (
    <DataTable
      name="bookings"
      noun={{ one: 'booking', many: 'bookings' }}
      rows={filtered}
      columns={cols}
      onDelete={onDelete}
      emptyTitle={ev ? 'No bookings for this slot yet' : 'No bookings yet'}
      emptyBody="Chats booked at the pink receipt printer arrive here, with the ticket code they printed."
      toolbar={
        <>
          <label className="adm-select">
            <span className="sr-only">Filter by slot or event</span>
            <select className="input" value={ev} onChange={(e) => setEv(e.target.value)}>
              <option value="">All bookings</option>
              {ids.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          {upcoming > 0 && <span className="chip chip--primary">{upcoming} upcoming</span>}
        </>
      }
    />
  );
}

/* ------------------------------------------------------------------ guestbook */
const SWATCH: Record<string, string> = {
  magenta: 'var(--accent)',
  pink: 'var(--accent)',
  sky: 'var(--baby)',
  aqua: 'var(--baby)',
  blue: 'var(--primary)',
  mint: 'var(--green)',
  violet: '#c8b6f2',
  lilac: '#c8b6f2',
  sun: 'var(--yellow)',
  peach: '#ffc9a8',
  lime: 'var(--lime)',
  pearl: 'var(--ice-2)',
};
function creatureOf(r: Record_) {
  const c = (r.creature && typeof r.creature === 'object' ? r.creature : {}) as Record<string, unknown>;
  const shape = String(c.shape ?? c.species ?? r.species ?? '');
  const colour = String(c.colour ?? c.color ?? r.color ?? '');
  const shapeLabel = (SPECIES_LABEL as Record<string, string>)[shape] ?? prettify(shape);
  const colourLabel = (COLOR_LABEL as Record<string, string>)[colour] ?? prettify(colour);
  const swatch = SWATCH[colour.toLowerCase()] ?? (/^#[0-9a-f]{3,8}$/i.test(colour) ? colour : 'var(--ice-4)');
  return { shape, colour, label: [colourLabel, shapeLabel].filter(Boolean).join(' '), swatch };
}

function GuestbookSection({ rows, onDelete, onApproved }: { rows: Record_[]; onDelete: (r: Record_) => Promise<void>; onApproved: (r: Record_, approved: boolean) => Promise<void> }) {
  const [show, setShow] = useState<'all' | 'shown' | 'hidden'>('all');
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const hidden = rows.filter((r) => r.approved === false).length;
  const filtered = show === 'all' ? rows : rows.filter((r) => (show === 'hidden' ? r.approved === false : r.approved !== false));
  const posters = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rows) if (typeof r.ipHash === 'string') m.set(r.ipHash, (m.get(r.ipHash) || 0) + 1);
    return m;
  }, [rows]);

  async function toggle(r: Record_) {
    setBusy(r.id);
    setErr('');
    try {
      await onApproved(r, r.approved === false);
    } catch (e) {
      setErr(`Could not update the note: ${(e as Error).message}`);
    } finally {
      setBusy(null);
    }
  }

  const cols: Column[] = [
    { key: 'createdAt', label: 'When', width: '96px' },
    {
      key: 'name',
      label: 'Name',
      render: (r) => (
        <span className="adm-gb-name">
          <b className="adm-clip">{cell(r.name) || 'Anonymous visitor'}</b>
          {isHouseNote(r) && <span className="chip chip--chrome">Example · the house</span>}
        </span>
      ),
    },
    { key: 'note', label: 'Note', render: (r) => <span className="adm-clip adm-clip--wide">{cell(r.note) || cell(r.message) || dash}</span> },
    {
      key: 'creature',
      label: 'Creature',
      value: (r) => creatureOf(r).label,
      render: (r) => {
        const c = creatureOf(r);
        return (
          <span className="adm-creature">
            <i style={{ background: c.swatch }} aria-hidden /> {c.label || '—'}
          </span>
        );
      },
      hideSm: true,
    },
    {
      key: 'ipHash',
      label: 'Poster',
      hideSm: true,
      value: (r) => cell(r.ipHash),
      render: (r) =>
        typeof r.ipHash === 'string' ? (
          <span className="t-mono adm-small" title="A salted hash of the visitor’s IP (the IP itself is never stored)">
            {r.ipHash.slice(0, 6)}
            {(posters.get(r.ipHash) || 0) > 1 && <em className="adm-gb-repeat"> ×{posters.get(r.ipHash)}</em>}
          </span>
        ) : (
          dash
        ),
    },
    {
      key: 'approved',
      label: 'In the tank',
      width: '120px',
      value: (r) => (r.approved === false ? 0 : 1),
      render: (r) => {
        const on = r.approved !== false;
        return (
          <button
            className={`adm-pill ${on ? 'is-on' : ''}`}
            aria-pressed={on}
            aria-label={`${on ? 'Shown' : 'Hidden'}: ${on ? 'hide' : 'show'} this note`}
            disabled={busy === r.id}
            onClick={(e) => {
              e.stopPropagation();
              void toggle(r);
            }}
          >
            <span className={`led ${on ? 'led--green' : 'led--off'}`} /> {on ? 'Shown' : 'Hidden'}
          </button>
        );
      },
    },
  ];
  return (
    <div className="adm-stack">
      <p className="adm-note">
        Notes appear in the aquarium as soon as they are posted (links, email addresses and a short blocklist are refused). Hide a note to take it out of the tank
        and keep it here; delete it to remove it for good. While the tank holds fewer than three notes, Moci’s three example notes keep it company (in local demo
        mode they are stored here, marked “Example · the house”).
      </p>
      {err && (
        <div className="adm-alert" role="alert">
          <span className="led" /> {err}
        </div>
      )}
      <DataTable
        name="guestbook"
        noun={{ one: 'note', many: 'notes' }}
        rows={filtered}
        columns={cols}
        onDelete={onDelete}
        emptyTitle={show === 'hidden' ? 'No hidden notes' : 'No guestbook notes yet'}
        emptyBody="Creatures released in the aquarium, with their notes, arrive here."
        toolbar={
          <div className="adm-seg" role="radiogroup" aria-label="Show notes">
            {(
              [
                ['all', `All · ${rows.length}`],
                ['shown', `Shown · ${rows.length - hidden}`],
                ['hidden', `Hidden · ${hidden}`],
              ] as const
            ).map(([id, label]) => (
              <button key={id} role="radio" aria-checked={show === id} className={show === id ? 'is-on' : ''} onClick={() => setShow(id)}>
                {label}
              </button>
            ))}
          </div>
        }
      />
    </div>
  );
}

/* ------------------------------------------------------------------ Moci questions */
function sourcesOf(r: Record_): string {
  const s = r.sources ?? r.source ?? r.citations;
  if (Array.isArray(s)) return s.map((x) => (typeof x === 'string' ? x : cell((x as { title?: unknown; id?: unknown })?.title ?? (x as { id?: unknown })?.id))).join(', ');
  return cell(s);
}

function QuestionsSection({ rows, onDelete }: { rows: Record_[]; onDelete: (r: Record_) => Promise<void> }) {
  const [brain, setBrain] = useState<'all' | 'online' | 'offline'>('all');
  const filtered = brain === 'all' ? rows : rows.filter((r) => (brain === 'online' ? r.answered === 'online' : r.answered !== 'online'));
  const top = useMemo(() => topQuestions(rows, 8), [rows]);
  const online = rows.filter((r) => r.answered === 'online').length;
  const abstained = rows.filter((r) => r.abstained === true).length;
  const cols: Column[] = [
    { key: 'createdAt', label: 'When', width: '96px' },
    { key: 'question', label: 'Question', render: (r) => <span className="adm-clip adm-clip--wide">{cell(r.question) || dash}</span> },
    {
      key: 'answered',
      label: 'Brain',
      width: '96px',
      render: (r) => <span className={`chip ${r.answered === 'online' ? 'chip--primary' : ''}`}>{r.answered === 'online' ? 'Online' : 'Offline'}</span>,
    },
    {
      key: 'abstained',
      label: 'Abstained',
      width: '96px',
      value: (r) => (r.abstained === true ? 1 : 0),
      render: (r) => (r.abstained === true ? <span className="chip chip--accent">Not sure</span> : r.abstained === false ? <span className="t-muted">Answered</span> : dash),
      hideSm: true,
    },
    { key: 'sources', label: 'Sources', value: sourcesOf, render: (r) => clip(sourcesOf(r)), hideSm: true },
  ];
  return (
    <div className="adm-stack">
      <div className="adm-grid">
        <section className="adm-card adm-col-8">
          <header className="adm-card__head">
            <div>
              <span className="t-label">All time · {rows.length.toLocaleString('en-US')} questions · grouped by wording</span>
              <h3>Most asked</h3>
            </div>
          </header>
          <HBars stacked items={top.map((q) => ({ id: q.id, key: q.text, label: q.text, value: q.n }))} total={rows.length} empty="Nobody has asked Moci anything yet." />
        </section>
        <section className="adm-card adm-col-4 adm-legend">
          <header className="adm-card__head">
            <div>
              <span className="t-label">How Moci answered</span>
              <h3>Brains</h3>
            </div>
          </header>
          <dl>
            <dt>Online · {online.toLocaleString('en-US')}</dt>
            <dd>Answered by server/agent.mjs (the Claude-backed brain, when ANTHROPIC_API_KEY is set).</dd>
            <dt>Offline · {(rows.length - online).toLocaleString('en-US')}</dt>
            <dd>Answered in the browser from her content, when the online brain is off or busy.</dd>
            <dt>Not sure · {abstained.toLocaleString('en-US')}</dt>
            <dd>Moci abstained instead of guessing. These are the questions her content doesn’t answer yet.</dd>
          </dl>
        </section>
      </div>
      <DataTable
        name="questions"
        noun={{ one: 'question', many: 'questions' }}
        rows={filtered}
        columns={cols}
        onDelete={onDelete}
        emptyTitle="No questions yet"
        emptyBody="Questions asked to Moci are logged here without names, emails or IP addresses."
        toolbar={
          <div className="adm-seg" role="radiogroup" aria-label="Filter by brain">
            {(
              [
                ['all', 'All'],
                ['online', 'Online'],
                ['offline', 'Offline'],
              ] as const
            ).map(([id, label]) => (
              <button key={id} role="radio" aria-checked={brain === id} className={brain === id ? 'is-on' : ''} onClick={() => setBrain(id)}>
                {label}
              </button>
            ))}
          </div>
        }
      />
    </div>
  );
}

/* ------------------------------------------------------------------ fit checks */
function QuizSection({ rows, onDelete }: { rows: Record_[]; onDelete: (r: Record_) => Promise<void> }) {
  const counts = useMemo(() => {
    const m = new Map<string, { label: string; n: number }>();
    for (const r of rows) {
      const k = quizKey(r);
      if (!k) continue;
      const cur = m.get(k) ?? { label: quizLabel(r), n: 0 };
      cur.n++;
      m.set(k, cur);
    }
    return [...m.entries()].map(([id, v]) => ({ id, key: v.label, label: v.label, value: v.n })).sort((a, b) => b.value - a.value);
  }, [rows]);
  const score = (r: Record_) => {
    const v = r.percent ?? r.score ?? r.match;
    return typeof v === 'number' ? v : Number(v) || 0;
  };
  const cols: Column[] = [
    { key: 'createdAt', label: 'When', width: '96px' },
    { key: 'result', label: 'Result', value: (r) => quizLabel(r), render: (r) => <b className="adm-clip">{quizLabel(r) || '—'}</b> },
    { key: 'percent', label: 'Match', width: '80px', value: score, render: (r) => (score(r) ? <span className="t-mono">{Math.round(score(r))}%</span> : dash) },
    { key: 'role', label: 'Role', hideSm: true },
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email', render: mail },
    { key: 'sessionId', label: 'Session', mono: true, hideSm: true },
  ];
  return (
    <div className="adm-stack">
      {counts.length > 0 && (
        <section className="adm-card">
          <header className="adm-card__head">
            <div>
              <span className="t-label">All time · {rows.length} fit checks</span>
              <h3>Results</h3>
            </div>
          </header>
          <HBars items={counts} total={rows.length} />
        </section>
      )}
      <DataTable
        name="quiz"
        noun={{ one: 'fit check', many: 'fit checks' }}
        rows={rows}
        columns={cols}
        onDelete={onDelete}
        emptyTitle="No fit checks yet"
        emptyBody="Results from the pink mug (the 60-second role-fit check and the JD matcher) arrive here."
      />
    </div>
  );
}

/* ------------------------------------------------------------------ leaderboard */
function Leaderboard({ data, del }: { data: AdminData; del: (c: Collection) => (r: Record_) => Promise<void> }) {
  const [tab, setTab] = useState<'pass' | 'scores' | 'redemptions'>('pass');
  const stationTotal = STATION_LIST.length;
  const stickerTotal = ACHIEVEMENTS.length;
  const profiles = useMemo(
    () =>
      data.collections.profiles
        .slice()
        .sort((a, b) => (Number(b.points) || 0) - (Number(a.points) || 0))
        .map((p, i) => ({ ...p, rank: i + 1 })),
    [data.collections.profiles],
  );
  const games = useMemo(() => {
    const by = new Map<string, Map<string, Record_>>();
    for (const s of data.collections.scores) {
      const g = String(s.game || 'game');
      const name = String(s.name || 'Guest').trim().toLowerCase();
      if (!by.has(g)) by.set(g, new Map());
      const m = by.get(g)!;
      const prev = m.get(name);
      if (!prev || Number(s.score) > Number(prev.score)) m.set(name, s);
    }
    return [...by.entries()].map(([g, m]) => ({ game: g, top: [...m.values()].sort((a, b) => Number(b.score) - Number(a.score)).slice(0, 10) }));
  }, [data.collections.scores]);
  const len = (v: unknown) => (Array.isArray(v) ? v.length : v && typeof v === 'object' ? Object.keys(v).length : 0);

  const passCols: Column[] = [
    { key: 'rank', label: '#', width: '52px', value: (r) => Number(r.rank), render: (r) => <span className="t-dot adm-rank">{String(r.rank).padStart(2, '0')}</span> },
    { key: 'name', label: 'Name', render: strong('name') },
    { key: 'email', label: 'Email', render: mail, hideSm: true },
    {
      key: 'points',
      label: 'Hearts',
      value: (r) => Number(r.points) || 0,
      render: (r) => (
        <b className="t-mono">
          <span className="adm-heart" aria-hidden>
            ♥
          </span>{' '}
          {(Number(r.points) || 0).toLocaleString('en-US')}
        </b>
      ),
      width: '96px',
    },
    {
      key: 'tier',
      label: 'Tier',
      value: (r) => Number(r.points) || 0,
      render: (r) => {
        const t = tierFor(Number(r.points) || 0);
        return (
          <span className="adm-tier">
            <i style={{ background: t.color }} /> {t.name}
          </span>
        );
      },
    },
    { key: 'achievements', label: 'Stickers', value: (r) => len(r.achievements), render: (r) => <span className="t-mono">{len(r.achievements)}/{stickerTotal}</span>, width: '80px' },
    { key: 'stamps', label: 'Objects', value: (r) => len(r.stamps), render: (r) => <span className="t-mono">{len(r.stamps)}/{stationTotal}</span>, width: '80px', hideSm: true },
    { key: 'manifesto', label: 'House rules', value: (r) => len(r.manifesto), render: (r) => <span className="t-mono">{len(r.manifesto)}/5</span>, width: '96px', hideSm: true },
    { key: 'updatedAt', label: 'Last seen', value: (r) => Number(r.updatedAt) || ts(r), render: (r) => <time>{fmtAgo(Number(r.updatedAt) || ts(r))}</time>, hideSm: true },
  ];
  const scoreCols: Column[] = [
    { key: 'createdAt', label: 'When', width: '96px' },
    { key: 'game', label: 'Game', render: chip('game') },
    { key: 'name', label: 'Name', render: strong('name') },
    { key: 'score', label: 'Score', value: (r) => Number(r.score) || 0, render: (r) => <b className="t-mono">{(Number(r.score) || 0).toLocaleString('en-US')}</b> },
  ];
  const perk = (r: Record_) => cell(r.perk) || cell(r.reward) || cell(r.item);
  const redCols: Column[] = [
    { key: 'createdAt', label: 'When', width: '96px' },
    { key: 'name', label: 'Name', render: strong('name') },
    { key: 'email', label: 'Email', render: mail },
    { key: 'perk', label: 'Perk', value: perk, render: (r) => clip(perk(r)) },
    { key: 'code', label: 'Code', mono: true },
  ];

  return (
    <div className="adm-stack">
      <div className="adm-filters">
        <div className="adm-seg" role="tablist" aria-label="Leaderboard views">
          {(
            [
              ['pass', `Guest Pass · ${profiles.length}`],
              ['scores', `Game scores · ${data.collections.scores.length}`],
              ['redemptions', `Redemptions · ${data.collections.redemptions.length}`],
            ] as const
          ).map(([id, label]) => (
            <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'is-on' : ''} onClick={() => setTab(id)}>
              {label}
            </button>
          ))}
        </div>
      </div>
      {tab === 'pass' && (
        <DataTable
          name="profiles"
          noun={{ one: 'pass holder', many: 'pass holders' }}
          rows={profiles as Record_[]}
          columns={passCols}
          onDelete={del('profiles')}
          defaultSort={{ key: 'rank', dir: 'asc' }}
          emptyTitle="No Guest Pass holders yet"
          emptyBody="Every visitor’s Guest Pass (hearts, stickers, objects found, house rules) is mirrored here."
        />
      )}
      {tab === 'scores' && (
        <>
          {games.length > 0 && (
            <div className="adm-games">
              {games.map((g) => (
                <section key={g.game} className="adm-card">
                  <header className="adm-card__head">
                    <div>
                      <span className="t-label">Best per player</span>
                      <h3>{prettify(g.game)}</h3>
                    </div>
                  </header>
                  <ol className="adm-podium">
                    {g.top.map((s, i) => (
                      <li key={s.id}>
                        <span className="t-dot">{String(i + 1).padStart(2, '0')}</span>
                        <b>{cell(s.name) || 'Guest'}</b>
                        <span className="t-mono">{(Number(s.score) || 0).toLocaleString('en-US')}</span>
                      </li>
                    ))}
                  </ol>
                </section>
              ))}
            </div>
          )}
          <DataTable
            name="scores"
            noun={{ one: 'score', many: 'scores' }}
            rows={data.collections.scores}
            columns={scoreCols}
            onDelete={del('scores')}
            emptyTitle="No scores yet"
            emptyBody="High scores from the cloud handheld arrive here."
          />
        </>
      )}
      {tab === 'redemptions' && (
        <DataTable
          name="redemptions"
          noun={{ one: 'redemption', many: 'redemptions' }}
          rows={data.collections.redemptions}
          columns={redCols}
          onDelete={del('redemptions')}
          emptyTitle="No redemptions yet"
          emptyBody="Guest Pass perks claimed by visitors arrive here."
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ analytics */
function Analytics({ rows }: { rows: Record_[] }) {
  const [type, setType] = useState('');
  const types = useMemo(() => eventTypes(rows), [rows]);
  const filtered = type ? rows.filter((r) => r.type === type) : rows;
  const sessions = useMemo(() => new Set(rows.map((r) => r.sessionId).filter((s) => s && s !== 'anon')).size, [rows]);
  const cols: Column[] = [
    { key: 'createdAt', label: 'When', width: '96px' },
    { key: 'type', label: 'Event', render: chip('type') },
    { key: 'data', label: 'Data', value: (r) => cell(r.data), render: (r) => <span className="adm-clip t-mono adm-small">{r.data && Object.keys(r.data as object).length ? cell(r.data) : '—'}</span> },
    { key: 'sessionId', label: 'Session', mono: true, render: (r) => <span className="t-mono adm-small">{String(r.sessionId || '').slice(0, 8)}</span> },
    { key: 'path', label: 'Path', mono: true, hideSm: true },
  ];
  return (
    <div className="adm-stack">
      <div className="adm-grid">
        <section className="adm-card adm-col-8">
          <header className="adm-card__head">
            <div>
              <span className="t-label">
                {rows.length.toLocaleString('en-US')} stored events · {sessions.toLocaleString('en-US')} visits · newest 50,000 kept
              </span>
              <h3>Events by type</h3>
            </div>
          </header>
          <HBars items={types.map((t) => ({ id: t.type, key: t.type, label: <span className="t-mono">{t.type}</span>, value: t.n }))} total={rows.length} limit={14} empty="No events recorded yet." />
        </section>
        <section className="adm-card adm-col-4 adm-legend">
          <header className="adm-card__head">
            <div>
              <span className="t-label">What gets tracked</span>
              <h3>Event glossary</h3>
            </div>
          </header>
          <dl>
            <dt>door_open · launch_view · door_try</dt>
            <dd>Walked in · saw (and tried) the coming-soon door</dd>
            <dt>station · stamp</dt>
            <dd>Zoomed onto an object · found it for the first time</dd>
            <dt>work_view · news_open · article · product_view</dt>
            <dd>Case studies, her paper and the toolkit shelf</dd>
            <dt>rsvp · lead · os_mail_sent · email</dt>
            <dd>Bookings, enquiries and emails (the hiring funnel)</dd>
            <dt>cv_download · redirect · big_button</dt>
            <dd>CV opens, outbound links and the big pink button</dd>
            <dt>moci</dt>
            <dd>Questions to Moci (ask · tool · source · eval)</dd>
            <dt>game_* · quiz_* · achievement · tier · manifesto</dt>
            <dd>Play, the fit check, stickers, Guest Pass tiers and house rules</dd>
          </dl>
        </section>
      </div>
      <DataTable
        name="analytics"
        noun={{ one: 'event', many: 'events' }}
        rows={filtered}
        columns={cols}
        canDelete={false}
        rowKey={(r, i) => r.id || `${r.t}-${i}`}
        emptyTitle="No events yet"
        emptyBody="Interactions in the room are batched and sent every few seconds."
        toolbar={
          <label className="adm-select">
            <span className="sr-only">Filter by event type</span>
            <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="">All types</option>
              {types.map((t) => (
                <option key={t.type} value={t.type}>
                  {t.type} ({t.n})
                </option>
              ))}
            </select>
          </label>
        }
      />
    </div>
  );
}

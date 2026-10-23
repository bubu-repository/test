/* ==========================================================================
   Content editor — her newspaper, bookable slots and events, the launch
   countdown (incl. launch mode), the big pink button's redirect and the
   ticker. Edits a draft; one Save writes everything via saveContent().
   All times are Bekasi time (WIB, UTC+7).
   ========================================================================== */
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { DEFAULT_CONTENT, saveContent, type SiteContent } from '@/lib/api';
import type { Article } from '@/lib/content';
import { identity, socials } from '@/content/profile';
import { Icon } from '@/ui/Icon';
import { ConfirmDialog } from './DataTable';

type Sub = 'news' | 'launch' | 'redirect' | 'events' | 'marquee';
type EventItem = SiteContent['events'][number];

const SUBS: { id: Sub; label: string }[] = [
  { id: 'news', label: 'News' },
  { id: 'events', label: 'Slots & events' },
  { id: 'launch', label: 'Countdown' },
  { id: 'redirect', label: 'Big button' },
  { id: 'marquee', label: 'Ticker' },
];

/** Where the big pink button may point: a web page, an email, a phone number, or a path on this site (e.g. /cv.pdf). */
const REDIRECT_OK = /^(https?:\/\/|mailto:|tel:|\/(?!\/))/i;

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'item';
const uniqueId = (base: string, taken: string[]) => {
  let id = slug(base);
  let n = 2;
  while (taken.includes(id)) id = `${slug(base)}-${n++}`;
  return id;
};

/* WIB (UTC+7, no DST) <-> <input type=datetime-local> */
export function isoToJktInput(iso: string): string {
  const d = new Date(iso);
  if (!iso || Number.isNaN(d.getTime())) return '';
  const j = new Date(d.getTime() + 7 * 3600_000);
  return j.toISOString().slice(0, 16);
}
export const jktInputToIso = (v: string) => (v ? `${v}:00+07:00` : '');

export function ContentEditor({ content, token, onSaved, onDirty }: { content: SiteContent; token: string; onSaved: (c: SiteContent) => void; onDirty: (d: boolean) => void }) {
  const [saved, setSaved] = useState<SiteContent>(() => clone(content));
  const [draft, setDraft] = useState<SiteContent>(() => clone(content));
  const [sub, setSub] = useState<Sub>('news');
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [err, setErr] = useState('');
  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(saved), [draft, saved]);
  const dirtyBy = (k: keyof SiteContent) => JSON.stringify(draft[k]) !== JSON.stringify(saved[k]);

  useEffect(() => onDirty(dirty), [dirty, onDirty]);
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  const set = <K extends keyof SiteContent>(k: K, v: SiteContent[K]) => {
    setDraft((d) => ({ ...d, [k]: v }));
    if (status === 'saved') setStatus('idle');
  };

  const problems = validate(draft);

  async function save() {
    if (problems.length) {
      setStatus('error');
      setErr(problems[0]);
      return;
    }
    setStatus('saving');
    setErr('');
    try {
      await saveContent(draft, token);
      setSaved(clone(draft));
      onSaved(clone(draft));
      setStatus('saved');
      setTimeout(() => setStatus((s) => (s === 'saved' ? 'idle' : s)), 3000);
    } catch (e) {
      setStatus('error');
      setErr((e as Error).message || 'Could not save');
    }
  }

  // ⌘/Ctrl+S
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void save();
      }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  });

  return (
    <div className="adm-cms">
      <div className="adm-cms__bar">
        <div className="adm-seg" role="tablist" aria-label="Content sections">
          {SUBS.map((s) => (
            <button key={s.id} role="tab" aria-selected={sub === s.id} className={sub === s.id ? 'is-on' : ''} onClick={() => setSub(s.id)}>
              {s.label}
              {dirtyBy(s.id) && <i className="adm-dirty" aria-label="unsaved changes" />}
            </button>
          ))}
        </div>
        <span className="adm-cms__status t-label" aria-live="polite">
          {status === 'saving' ? 'Saving…' : status === 'saved' ? 'Saved · live for new visitors' : status === 'error' ? err : dirty ? 'Unsaved changes' : 'All changes saved'}
        </span>
        <button className="btn btn--sm btn--ghost" onClick={() => setDraft(clone(saved))} disabled={!dirty || status === 'saving'}>
          Discard
        </button>
        <button className="btn btn--sm btn--primary" onClick={save} disabled={!dirty || status === 'saving'} title="Save (Ctrl/⌘+S)">
          <Icon name="check" size={14} /> Save
        </button>
      </div>

      {sub === 'news' && <NewsEditor items={draft.news} onChange={(v) => set('news', v)} onReset={() => set('news', clone(DEFAULT_CONTENT.news))} />}
      {sub === 'launch' && <LaunchEditor launch={draft.launch} savedEnabled={saved.launch.enabled} onChange={(v) => set('launch', v)} onReset={() => set('launch', clone(DEFAULT_CONTENT.launch))} />}
      {sub === 'redirect' && <RedirectEditor r={draft.redirect} onChange={(v) => set('redirect', v)} onReset={() => set('redirect', clone(DEFAULT_CONTENT.redirect))} />}
      {sub === 'events' && <EventsEditor items={draft.events} onChange={(v) => set('events', v)} onReset={() => set('events', clone(DEFAULT_CONTENT.events))} />}
      {sub === 'marquee' && <MarqueeEditor text={draft.marquee} onChange={(v) => set('marquee', v)} onReset={() => set('marquee', DEFAULT_CONTENT.marquee)} />}
    </div>
  );
}

function validate(c: SiteContent): string[] {
  const p: string[] = [];
  c.news.forEach((a, i) => {
    if (!a.headline.trim()) p.push(`News #${i + 1} needs a headline.`);
    if (a.date && Number.isNaN(Date.parse(a.date))) p.push(`News “${a.headline}” has an invalid date.`);
  });
  if (!c.launch.title.trim()) p.push('The countdown needs a title.');
  if (c.launch.date && Number.isNaN(Date.parse(c.launch.date))) p.push('The countdown date is invalid.');
  if (!REDIRECT_OK.test(c.redirect.url.trim())) p.push('The big button’s link must start with https://, mailto:, tel: or / (a page on this site).');
  c.events.forEach((e, i) => {
    if (!e.name.trim()) p.push(`Slot or event #${i + 1} needs a name.`);
  });
  return p;
}

/* ------------------------------------------------------------------ bits */
function Section({ title, kicker, children, actions }: { title: string; kicker?: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="adm-card">
      <header className="adm-card__head">
        <div>
          {kicker && <span className="t-label">{kicker}</span>}
          <h3>{title}</h3>
        </div>
        {actions}
      </header>
      {children}
    </section>
  );
}

function Text({ label, value, onChange, area, rows = 3, placeholder, hint, max, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; area?: boolean; rows?: number; placeholder?: string; hint?: ReactNode; max?: number; type?: string }) {
  return (
    <label className="field adm-f">
      <span>
        {label}
        {max ? (
          <em className={value.length > max ? 'is-over' : ''}>
            {value.length}/{max}
          </em>
        ) : null}
      </span>
      {area ? <textarea rows={rows} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} /> : <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />}
      {hint && <small className="adm-f__hint">{hint}</small>}
    </label>
  );
}

function ResetBtn({ onReset, what }: { onReset: () => void; what: string }) {
  const [ask, setAsk] = useState(false);
  return (
    <>
      <button className="btn btn--sm btn--ghost" onClick={() => setAsk(true)}>
        Reset to defaults
      </button>
      {ask && (
        <ConfirmDialog
          title={`Reset ${what}?`}
          body="This replaces the draft with the room’s original copy. Nothing is saved until you press Save."
          confirmLabel="Reset draft"
          onCancel={() => setAsk(false)}
          onConfirm={() => {
            onReset();
            setAsk(false);
          }}
        />
      )}
    </>
  );
}

/* ------------------------------------------------------------------ news */
function NewsEditor({ items, onChange, onReset }: { items: Article[]; onChange: (v: Article[]) => void; onReset: () => void }) {
  const [sel, setSel] = useState<string | null>(items[0]?.id ?? null);
  const [del, setDel] = useState<Article | null>(null);
  const cur = items.find((a) => a.id === sel) ?? null;
  const update = (patch: Partial<Article>) => onChange(items.map((a) => (a.id === sel ? { ...a, ...patch } : a)));

  function add() {
    const id = uniqueId('story-' + new Date().toISOString().slice(0, 10), items.map((a) => a.id));
    const a: Article = { id, date: new Date().toISOString().slice(0, 10), section: 'Now', headline: 'New headline', dek: '', body: [''], byline: identity.name };
    onChange([a, ...items]);
    setSel(id);
  }
  function move(id: string, d: -1 | 1) {
    const i = items.findIndex((a) => a.id === id);
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const next = items.slice();
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }

  return (
    <div className="adm-split">
      <Section
        kicker={`${items.length} articles · in order`}
        title="Her paper"
        actions={
          <div className="adm-row">
            <ResetBtn onReset={onReset} what="news" />
            <button className="btn btn--sm btn--dark" onClick={add}>
              <Icon name="plus" size={14} /> New
            </button>
          </div>
        }
      >
        <ul className="adm-list">
          {items.map((a, i) => (
            <li key={a.id} className={a.id === sel ? 'is-on' : ''}>
              <button className="adm-list__main" onClick={() => setSel(a.id)}>
                <span className="t-label">
                  {a.section || '—'} · {a.date || 'no date'}
                </span>
                <b>{a.headline || 'Untitled'}</b>
              </button>
              <span className="adm-list__ops">
                <button className="adm-iconbtn" onClick={() => move(a.id, -1)} disabled={i === 0} aria-label="Move up">
                  ▲
                </button>
                <button className="adm-iconbtn" onClick={() => move(a.id, 1)} disabled={i === items.length - 1} aria-label="Move down">
                  ▼
                </button>
              </span>
            </li>
          ))}
          {!items.length && <li className="adm-empty">No articles. Her paper will be empty.</li>}
        </ul>
      </Section>

      {cur ? (
        <Section
          kicker={`Editing · ${cur.id}`}
          title={cur.headline || 'Untitled'}
          actions={
            <button className="btn btn--sm btn--ghost adm-danger" onClick={() => setDel(cur)}>
              <Icon name="close" size={14} /> Delete
            </button>
          }
        >
          <div className="adm-form">
            <Text label="Headline" value={cur.headline} onChange={(v) => update({ headline: v })} max={90} />
            <Text label="Dek (standfirst)" value={cur.dek} onChange={(v) => update({ dek: v })} area rows={2} max={220} />
            <div className="adm-form__row">
              <Text label="Section" value={cur.section} onChange={(v) => update({ section: v })} placeholder="Now · Shipped · Events" />
              <Text label="Date" type="date" value={cur.date.slice(0, 10)} onChange={(v) => update({ date: v })} />
              <Text label="Byline" value={cur.byline || ''} onChange={(v) => update({ byline: v })} placeholder={identity.name} />
            </div>
            <div className="adm-paras">
              <span className="t-label">Body paragraphs</span>
              {cur.body.map((p, i) => (
                <div key={i} className="adm-para">
                  <span className="adm-para__n t-label">¶{i + 1}</span>
                  <textarea
                    className="input"
                    rows={3}
                    value={p}
                    onChange={(e) => update({ body: cur.body.map((x, j) => (j === i ? e.target.value : x)) })}
                    aria-label={`Paragraph ${i + 1}`}
                  />
                  <span className="adm-para__ops">
                    <button
                      className="adm-iconbtn"
                      disabled={i === 0}
                      aria-label="Move paragraph up"
                      onClick={() => {
                        const b = cur.body.slice();
                        [b[i - 1], b[i]] = [b[i], b[i - 1]];
                        update({ body: b });
                      }}
                    >
                      ▲
                    </button>
                    <button className="adm-iconbtn adm-iconbtn--danger" aria-label="Remove paragraph" onClick={() => update({ body: cur.body.filter((_, j) => j !== i) })}>
                      <Icon name="close" size={12} />
                    </button>
                  </span>
                </div>
              ))}
              <button className="btn btn--sm btn--ghost" onClick={() => update({ body: [...cur.body, ''] })}>
                <Icon name="plus" size={14} /> Add paragraph
              </button>
            </div>
          </div>
        </Section>
      ) : (
        <Section title="Select an article">
          <p className="adm-empty">Pick an article on the left, or create a new one.</p>
        </Section>
      )}
      {del && (
        <ConfirmDialog
          title="Delete this article?"
          body={`“${del.headline}” will be removed from the draft. Save to publish the change.`}
          onCancel={() => setDel(null)}
          onConfirm={() => {
            const rest = items.filter((a) => a.id !== del.id);
            onChange(rest);
            setSel(rest[0]?.id ?? null);
            setDel(null);
          }}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ launch */
function LaunchEditor({ launch, savedEnabled, onChange, onReset }: { launch: SiteContent['launch']; savedEnabled: boolean; onChange: (v: SiteContent['launch']) => void; onReset: () => void }) {
  const up = (p: Partial<SiteContent['launch']>) => onChange({ ...launch, ...p });
  const d = new Date(launch.date);
  const ms = Number.isNaN(d.getTime()) ? null : d.getTime() - Date.now();
  const days = ms == null ? null : Math.ceil(ms / 86_400_000);
  const pad = (n: number) => String(n).padStart(2, '0');
  const plate =
    ms == null
      ? '--:--:--:--'
      : ms <= 0
        ? 'OPEN'
        : [Math.floor(ms / 86_400_000), Math.floor(ms / 3_600_000) % 24, Math.floor(ms / 60_000) % 60, Math.floor(ms / 1000) % 60].map(pad).join(':');
  return (
    <div className="adm-split adm-split--even">
      <Section kicker="LED sign · coming-soon page /launch" title="Countdown" actions={<ResetBtn onReset={onReset} what="the countdown" />}>
        <div className="adm-form">
          <Text label="Title" value={launch.title} onChange={(v) => up({ title: v })} max={40} />
          <Text label="Subtitle" value={launch.subtitle} onChange={(v) => up({ subtitle: v })} area rows={2} max={140} />
          <Text
            label="Counts down to (Bekasi time, WIB)"
            type="datetime-local"
            value={isoToJktInput(launch.date)}
            onChange={(v) => up({ date: jktInputToIso(v) })}
            hint={days == null ? 'No date: the countdown shows “--”.' : days > 0 ? `${days} days from now · stored as ${launch.date}` : 'This date has passed: the countdown shows “OPEN”.'}
          />
          <Text label="Body" value={launch.body} onChange={(v) => up({ body: v })} area rows={3} max={320} />
        </div>
      </Section>

      <Section kicker="Public site behaviour" title="Launch mode">
        <div className={`adm-launchmode ${launch.enabled ? 'is-on' : ''}`}>
          <button className={`adm-toggle ${launch.enabled ? 'is-on' : ''}`} role="switch" aria-checked={launch.enabled} onClick={() => up({ enabled: !launch.enabled })}>
            <span className="adm-toggle__knob" />
            <span className="sr-only">Launch mode</span>
          </button>
          <div>
            <b>{launch.enabled ? 'On: the public site shows the coming-soon page' : 'Off: the public site shows the room'}</b>
            <p>
              When launch mode is on, everyone who visits <code>/</code> sees the closed door with the countdown and the launch list instead of the room.
              You can still walk in with <code>?preview=1</code> (e.g. <code>/?preview=1</code>). The <code>/launch</code> page is always available, and so are{' '}
              <code>/work/…</code> and <code>/cv.pdf</code>.
            </p>
            {launch.enabled !== savedEnabled && <p className="adm-warn">Not live yet — press Save to {launch.enabled ? 'switch the site to launch mode' : 'reopen the room'}.</p>}
          </div>
        </div>
        <div className="adm-row adm-row--wrap">
          <a className="btn btn--sm" href="/launch" target="_blank" rel="noopener">
            Open /launch <Icon name="arrow-up-right" size={14} />
          </a>
          <a className="btn btn--sm btn--ghost" href="/?preview=1" target="_blank" rel="noopener">
            Open the room (?preview=1) <Icon name="arrow-up-right" size={14} />
          </a>
        </div>
        <div className="adm-preview lcd">
          <span className="t-label">LED sign preview</span>
          <b className="t-dot">{plate}</b>
          <span>{launch.title}</span>
        </div>
      </Section>
    </div>
  );
}

/* ------------------------------------------------------------------ redirect */
const EMAIL_URL = `mailto:${identity.email}?subject=${encodeURIComponent(`Hello ${identity.name.split(' ')[0]}, from your room`)}`;
const LINKEDIN = socials.find((s) => s.label === 'LinkedIn' && s.href)?.href ?? null;

function RedirectEditor({ r, onChange, onReset }: { r: SiteContent['redirect']; onChange: (v: SiteContent['redirect']) => void; onReset: () => void }) {
  const ok = REDIRECT_OK.test(r.url.trim());
  return (
    <Section kicker="RM-23 · The big pink button" title="Big button" actions={<ResetBtn onReset={onReset} what="the big button" />}>
      <div className="adm-form adm-form--narrow">
        <Text label="Button label" value={r.label} onChange={(v) => onChange({ ...r, label: v })} max={40} hint="Shown as the title of the big button’s card." />
        <Text
          label="Where it goes"
          value={r.url}
          onChange={(v) => onChange({ ...r, url: v.trim() })}
          hint={
            ok ? (
              'mailto: and tel: open in place; https:// and /paths open in a new tab after the 3-2-1.'
            ) : (
              <span className="adm-warn">Must start with https://, mailto:, tel: or / (a page on this site)</span>
            )
          }
        />
        <div className="adm-row adm-row--wrap">
          <a className={`btn btn--sm ${ok ? '' : 'is-disabled'}`} href={ok ? r.url : undefined} target="_blank" rel="noopener noreferrer" aria-disabled={!ok}>
            Test the link <Icon name="arrow-up-right" size={14} />
          </a>
          <button className="btn btn--sm btn--ghost" onClick={() => onChange({ ...r, url: EMAIL_URL })}>
            Use her email
          </button>
          <button className="btn btn--sm btn--ghost" onClick={() => onChange({ ...r, url: '/cv.pdf' })}>
            Use the CV
          </button>
          {LINKEDIN && (
            <button className="btn btn--sm btn--ghost" onClick={() => onChange({ ...r, url: LINKEDIN })}>
              Use LinkedIn
            </button>
          )}
        </div>
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ events */
function EventsEditor({ items, onChange, onReset }: { items: EventItem[]; onChange: (v: EventItem[]) => void; onReset: () => void }) {
  const [sel, setSel] = useState<string | null>(items[0]?.id ?? null);
  const [del, setDel] = useState<EventItem | null>(null);
  const cur = items.find((e) => e.id === sel) ?? null;
  const update = (patch: Partial<EventItem>) => onChange(items.map((e) => (e.id === sel ? { ...e, ...patch } : e)));
  function add() {
    const id = uniqueId('slot', items.map((e) => e.id));
    const e: EventItem = { id, name: 'New slot', date: '', city: 'Online', venue: 'Video call', body: '' };
    onChange([...items, e]);
    setSel(id);
  }
  return (
    <div className="adm-split">
      <Section
        kicker={`${items.length} entries · the receipt printer`}
        title="Slots & events"
        actions={
          <div className="adm-row">
            <ResetBtn onReset={onReset} what="events" />
            <button className="btn btn--sm btn--dark" onClick={add}>
              <Icon name="plus" size={14} /> New
            </button>
          </div>
        }
      >
        <ul className="adm-list">
          {items.map((e) => {
            const d = new Date(e.date);
            const past = !Number.isNaN(d.getTime()) && d.getTime() < Date.now();
            return (
              <li key={e.id} className={e.id === sel ? 'is-on' : ''}>
                <button className="adm-list__main" onClick={() => setSel(e.id)}>
                  <span className="t-label">
                    {e.id === 'session' ? 'Book a chat (always on)' : e.date ? isoToJktInput(e.date).replace('T', ' · ') : 'Date TBA'} {past && '· past'}
                  </span>
                  <b>{e.name || 'Untitled'}</b>
                </button>
              </li>
            );
          })}
        </ul>
      </Section>
      {cur ? (
        <Section
          kicker={`Editing · ${cur.id}`}
          title={cur.name || 'Untitled'}
          actions={
            cur.id !== 'session' && (
              <button className="btn btn--sm btn--ghost adm-danger" onClick={() => setDel(cur)}>
                <Icon name="close" size={14} /> Delete
              </button>
            )
          }
        >
          <div className="adm-form">
            {cur.id === 'session' ? (
              <p className="adm-note">This entry describes the always-on “Book a chat” tab at the receipt printer. It is not listed as a dated slot.</p>
            ) : (
              <p className="adm-note">A dated slot people can book (an interview window, office hours) or an event she will be at.</p>
            )}
            <Text label="Name" value={cur.name} onChange={(v) => update({ name: v })} max={70} />
            <div className="adm-form__row">
              <Text label="Starts (Bekasi time, WIB)" type="datetime-local" value={isoToJktInput(cur.date)} onChange={(v) => update({ date: jktInputToIso(v) })} hint="Leave empty for “Date TBA”." />
              <Text label="Where" value={cur.city} onChange={(v) => update({ city: v })} placeholder="Online · or Bekasi / Jakarta" />
            </div>
            <Text label="Place or format" value={cur.venue} onChange={(v) => update({ venue: v })} placeholder="Video call · 30 minutes" />
            <Text label="Description" value={cur.body} onChange={(v) => update({ body: v })} area rows={3} max={260} />
          </div>
        </Section>
      ) : (
        <Section title="Select an entry">
          <p className="adm-empty">Pick a slot or event, or add one.</p>
        </Section>
      )}
      {del && (
        <ConfirmDialog
          title="Delete this entry?"
          body={`“${del.name}” will be removed from the receipt printer once you save. Existing bookings are kept.`}
          onCancel={() => setDel(null)}
          onConfirm={() => {
            const rest = items.filter((x) => x.id !== del.id);
            onChange(rest);
            setSel(rest[0]?.id ?? null);
            setDel(null);
          }}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ marquee */
function MarqueeEditor({ text, onChange, onReset }: { text: string; onChange: (v: string) => void; onReset: () => void }) {
  return (
    <Section kicker="Scrolling ticker" title="Ticker" actions={<ResetBtn onReset={onReset} what="the ticker" />}>
      <div className="adm-form adm-form--narrow">
        <Text label="Text" value={text} onChange={onChange} area rows={3} max={240} hint="Separate items with “ — ”." />
        <div className="adm-marquee lcd" aria-hidden>
          <div className="adm-marquee__track t-dot">
            <span>{text}</span>
            <span>{text}</span>
          </div>
        </div>
      </div>
    </Section>
  );
}

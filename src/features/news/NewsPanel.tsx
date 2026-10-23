/* ==========================================================================
   RM-04 · THE RECEIPTS — her paper, a zoomable broadsheet on the desk.
   ("Show the receipts" is House Rule II, written here.) Front page:
   masthead with the issue counted from her first year (2022), live Bekasi
   date + weather, LED ticker, lead story with a halftone photo, columns,
   and a sidebar with the weather, what she's doing now and a classifieds
   corner for hiring teams. Clicking a story zooms
   from its rect on the page into a reading view (FLIP + clip-path), with
   page-turn prev/next. Esc / back returns to the front page.
   ========================================================================== */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent } from 'react';
import { Stage } from '@/ui/Panel';
import { Icon } from '@/ui/Icon';
import { useUI } from '@/state/ui';
import { game } from '@/state/game';
import { toast } from '@/state/toasts';
import { back, focus } from '@/stage/director';
import { STATIONS } from '@/stage/stations';
import { sfx } from '@/audio/engine';
import { DEFAULT_CONTENT, getContent, track, type SiteContent } from '@/lib/api';
import { CHAPTERS, COMPANY, type Article } from '@/lib/content';
import { practical } from '@/content/profile';
import { calmMotion } from '@/features/computer/util';
import { TZ, formatTime, useWeather } from '@/lib/weather';
import { Halftone } from './Halftone';
import './news.css';

const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';
const reduced = () => calmMotion();
const PAPER = 'The Receipts';
const BYLINE = 'Adelia’s desk';
const firstSentence = (s: string) => s.split(/(?<=\.)\s/)[0].replace(/\.$/, '');

/* ---------------------------------------------------------------- helpers */
function longDate(iso: string): string {
  const d = new Date(/T/.test(iso) ? iso : `${iso}T12:00:00+07:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat('en-GB', { timeZone: TZ, day: 'numeric', month: 'long', year: 'numeric' }).format(d);
}
function readMins(a: Article) {
  const words = [a.headline, a.dek, ...a.body].join(' ').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
function roman(n: number) {
  const m: [number, string][] = [
    [1000, 'M'],
    [900, 'CM'],
    [500, 'D'],
    [400, 'CD'],
    [100, 'C'],
    [90, 'XC'],
    [50, 'L'],
    [40, 'XL'],
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I'],
  ];
  let s = '';
  for (const [v, r] of m) while (n >= v) (s += r), (n -= v);
  return s;
}
function hhmm(iso?: string) {
  return iso && iso.length >= 16 ? iso.slice(11, 16) : '—';
}
async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;opacity:0';
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
function useNow(ms: number) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

/* ================================================================ panel */
export default function NewsPanel() {
  const [content, setContent] = useState<SiteContent>(DEFAULT_CONTENT);
  const [loading, setLoading] = useState(true);
  const [reading, setReading] = useState<string | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const readerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const zoomFrom = useRef<DOMRect | null>(null);
  const turn = useRef<0 | 1 | -1>(0);
  const busy = useRef(false);
  const readingRef = useRef(reading);
  readingRef.current = reading;

  /* lifecycle: flag for the room overlay + paper rustle */
  useEffect(() => {
    useUI.getState().setFlag('newsOpen', true);
    sfx('paper');
    track('news_open');
    let alive = true;
    getContent()
      .then((c) => alive && setContent(c))
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
      useUI.getState().setFlag('newsOpen', false);
      useUI.getState().setFlag('newsArticle', null);
    };
  }, []);

  const news = useMemo(() => (content.news || []).filter((a) => a && a.id && a.headline), [content.news]);
  const idx = reading ? news.findIndex((a) => a.id === reading) : -1;
  const article = idx >= 0 ? news[idx] : null;

  /* deep link: #news/<id> opens straight into the article */
  useEffect(() => {
    if (loading) return;
    const m = /^#news\/(.+)$/.exec(location.hash);
    if (m && news.some((a) => a.id === decodeURIComponent(m[1]))) setReading(decodeURIComponent(m[1]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  /* reading → stats (3 articles → news-hound) */
  useEffect(() => {
    useUI.getState().setFlag('newsArticle', reading);
    if (!reading) return;
    game().updateStats((s) => ({ articlesRead: [...new Set([...s.articlesRead, reading])] }));
    track('article', { id: reading });
  }, [reading]);

  const open = (id: string, el: HTMLElement | null) => {
    if (busy.current || reading) return;
    zoomFrom.current = el ? el.getBoundingClientRect() : null;
    sfx('paper');
    setReading(id);
  };

  /* zoom in / page-turn in */
  useLayoutEffect(() => {
    if (!reading) return;
    const root = rootRef.current;
    const reader = readerRef.current;
    const sc = scrollRef.current;
    const page = pageRef.current;
    if (!root || !reader || !sc || !page) return;
    const from = zoomFrom.current;
    zoomFrom.current = null;
    const d = turn.current;
    turn.current = 0;
    if (d) {
      sc.scrollTop = 0;
      sc.getAnimations().forEach((a) => a.cancel());
      if (!reduced())
        sc.animate(
          [
            { transform: `perspective(1600px) translateX(${d * 7}%) rotateY(${-d * 9}deg)`, opacity: 0 },
            { transform: 'none', opacity: 1 },
          ],
          { duration: 460, easing: EASE },
        );
      busy.current = false;
    } else if (from && !reduced()) {
      const rr = root.getBoundingClientRect();
      const pr = page.getBoundingClientRect();
      const t = from.top - rr.top;
      const l = from.left - rr.left;
      const inset = `inset(${t}px ${rr.right - from.right}px ${rr.bottom - from.bottom}px ${l}px round 4px)`;
      reader.animate([{ clipPath: inset }, { clipPath: 'inset(0px 0px 0px 0px round 0px)' }], { duration: 760, easing: EASE });
      sc.animate(
        [
          { transform: `translate(${l}px, ${t}px) scale(${from.width / rr.width})`, opacity: 0.25 },
          { transform: 'translate(0px, 0px) scale(1)', opacity: 1 },
        ],
        { duration: 760, easing: EASE },
      );
      page.style.transformOrigin = `${from.left + from.width / 2 - pr.left}px ${from.top + from.height / 2 - pr.top}px`;
      page.animate(
        [
          { transform: 'scale(1)', opacity: 1 },
          { transform: 'scale(1.6)', opacity: 0.35 },
        ],
        { duration: 760, easing: EASE, fill: 'forwards' },
      );
    }
    reader.querySelector<HTMLElement>('.news-reader__headline')?.focus({ preventScroll: true });
  }, [reading]);

  const close = useCallback(() => {
    const root = rootRef.current;
    const reader = readerRef.current;
    const sc = scrollRef.current;
    const page = pageRef.current;
    const id = readingRef.current;
    if (!id || busy.current) return;
    sfx('paper');
    const done = () => {
      busy.current = false;
      page?.getAnimations().forEach((a) => a.cancel());
      setReading(null);
      requestAnimationFrame(() => page?.querySelector<HTMLElement>(`[data-article="${CSS.escape(id)}"] .news-hit`)?.focus({ preventScroll: true }));
    };
    const el = page?.querySelector<HTMLElement>(`[data-article="${CSS.escape(id)}"]`);
    if (!root || !reader || !sc || !page || !el || reduced()) return done();
    busy.current = true;
    // measure the article on an un-zoomed page, make sure it is in view
    page.getAnimations().forEach((a) => a.cancel());
    el.scrollIntoView({ block: 'nearest' });
    const rr = root.getBoundingClientRect();
    const pr = page.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const t = r.top - rr.top;
    const l = r.left - rr.left;
    const inset = `inset(${t}px ${rr.right - r.right}px ${rr.bottom - r.bottom}px ${l}px round 4px)`;
    page.style.transformOrigin = `${r.left + r.width / 2 - pr.left}px ${r.top + r.height / 2 - pr.top}px`;
    page.animate(
      [
        { transform: 'scale(1.6)', opacity: 0.35 },
        { transform: 'scale(1)', opacity: 1 },
      ],
      { duration: 600, easing: EASE, fill: 'forwards' },
    );
    sc.animate(
      [
        { transform: 'translate(0px, 0px) scale(1)', opacity: 1 },
        { transform: `translate(${l}px, ${t}px) scale(${r.width / rr.width})`, opacity: 0 },
      ],
      { duration: 600, easing: EASE, fill: 'forwards' },
    );
    const anim = reader.animate([{ clipPath: 'inset(0px 0px 0px 0px round 0px)' }, { clipPath: inset }], { duration: 600, easing: EASE, fill: 'forwards' });
    anim.onfinish = done;
    anim.oncancel = done;
  }, []);

  const go = useCallback(
    (d: 1 | -1) => {
      const i = news.findIndex((a) => a.id === readingRef.current) + d;
      if (i < 0 || i >= news.length || busy.current) return;
      sfx('paper', { pitch: d > 0 ? 2 : -2 });
      const sc = scrollRef.current;
      if (!sc || reduced()) {
        setReading(news[i].id);
        return;
      }
      busy.current = true;
      const out = sc.animate(
        [
          { transform: 'none', opacity: 1 },
          { transform: `perspective(1600px) translateX(${-d * 7}%) rotateY(${d * 9}deg)`, opacity: 0 },
        ],
        { duration: 220, easing: 'cubic-bezier(0.5, 0, 0.75, 0)', fill: 'forwards' },
      );
      out.onfinish = () => {
        turn.current = d;
        setReading(news[i].id);
      };
    },
    [news],
  );

  /* keyboard in the reader */
  useEffect(() => {
    if (!reading) return;
    const k = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest?.('input,textarea')) return;
      if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [reading, go]);

  /* Esc / back: reader → front page → close panel */
  const onClose = useCallback(() => (readingRef.current ? close() : back()), [close]);

  const share = async (a: Article) => {
    const url = `${location.origin}${location.pathname}#news/${encodeURIComponent(a.id)}`;
    track('article_share', { id: a.id });
    if (navigator.share && matchMedia('(pointer: coarse)').matches) {
      try {
        await navigator.share({ title: `${a.headline} · ${PAPER}`, text: a.dek, url });
        return;
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return;
      }
    }
    const ok = await copy(url);
    sfx(ok ? 'pop' : 'error');
    toast({ kind: 'info', title: ok ? 'Link copied' : 'Couldn’t copy the link', body: ok ? a.headline : url });
  };

  return (
    <Stage code={STATIONS.news.code} kicker={`${CHAPTERS[1].roman} · ${CHAPTERS[1].title}`} title={PAPER} className="news-stage" bleed onClose={onClose}>
      <div className={`news-root ${calmMotion() ? 'is-calm' : ''}`} ref={rootRef}>
        <div className="news-page scroll" ref={pageRef} aria-hidden={!!reading} inert={reading ? true : undefined}>
          <FrontPage news={news} marquee={content.marquee} loading={loading} onOpen={open} />
        </div>
        {article && (
          <div className="news-reader" ref={readerRef} role="region" aria-label={`Article: ${article.headline}`}>
            <div className="news-reader__bar">
              <button className="btn btn--sm" onClick={close}>
                <Icon name="arrow-left" size={14} /> Front page
              </button>
              <span className="news-reader__where t-label">
                Page A{idx + 1} · {article.section}
              </span>
              <div className="news-reader__nav">
                <button className="btn btn--sm btn--icon" onClick={() => go(-1)} disabled={idx <= 0} aria-label="Previous story">
                  <Icon name="arrow-left" size={15} />
                </button>
                <span className="t-dot news-reader__count">
                  {idx + 1}/{news.length}
                </span>
                <button className="btn btn--sm btn--icon" onClick={() => go(1)} disabled={idx >= news.length - 1} aria-label="Next story">
                  <Icon name="arrow-right" size={15} />
                </button>
                <button className="btn btn--sm btn--dark" onClick={() => share(article)}>
                  <Icon name="share" size={14} /> <span className="news-hide-xs">Share</span>
                </button>
              </div>
            </div>
            <div className="news-reader__scroll scroll" ref={scrollRef}>
              <ReaderBody a={article} idx={idx} news={news} onGo={go} />
            </div>
          </div>
        )}
      </div>
    </Stage>
  );
}

/* ================================================================ front page */
function FrontPage({ news, marquee, loading, onOpen }: { news: Article[]; marquee: string; loading: boolean; onOpen: (id: string, el: HTMLElement | null) => void }) {
  const now = useNow(20_000);
  const w = useWeather((s) => s.home);
  const year = Number(new Intl.DateTimeFormat('en-GB', { timeZone: TZ, year: 'numeric' }).format(now));
  // issues are counted from her first day of Informatics (Vol. I = 2022)
  const issue = Math.max(1, Math.floor((now.getTime() - Date.UTC(COMPANY.founded, 0, 1)) / 86_400_000));
  const dateLine = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(now);
  const lead = news[0];
  const rest = news.slice(1);
  const ticker = marquee || DEFAULT_CONTENT.marquee;
  const start = firstSentence(practical.find((p) => p.label === 'Start')?.value ?? '');
  const hours = `${String(COMPANY.workingHours.start).padStart(2, '0')}:00–${COMPANY.workingHours.end}:00 WIB`;

  const hit = (a: Article) => (e: MouseEvent<HTMLButtonElement>) => onOpen(a.id, e.currentTarget.closest('[data-article]') as HTMLElement);
  const go = (to: string, fn: () => void) => () => {
    track('cta', { from: 'news', to });
    fn();
  };

  return (
    <div className="news-sheet">
      <div className="news-strip">
        <span>
          Vol. {roman(year - COMPANY.founded + 1)} · No. {issue.toLocaleString('en-US')}
        </span>
        <span className="news-strip__mid">
          {COMPANY.city} · {dateLine} · {formatTime(TZ, now)} WIB
        </span>
        <span>Rp 0 · Free to read</span>
      </div>

      <header className="news-mast">
        <span className="news-mast__ear news-hide-sm">
          <b>{COMPANY.city}</b>
          <span>Edition</span>
        </span>
        <h1 className="news-mast__title">
          <span>The</span> Receipts
        </h1>
        <span className="news-mast__ear news-mast__ear--r news-hide-sm">
          <b className="t-dot">{Math.round(w.temp)}°</b>
          <span>{w.label}</span>
        </span>
      </header>
      <div className="news-motto">
        <span>Est. {COMPANY.founded}</span>
        <i>Her paper. Every number, with its method.</i>
        <span>{COMPANY.role}</span>
      </div>

      <div className="news-ticker" aria-label={ticker}>
        <div className="news-ticker__track" aria-hidden>
          {[0, 1].map((k) => (
            <span key={k}>
              {ticker} <b>◆</b> {Math.round(w.temp)}°C {w.label} in {COMPANY.city} <b>◆</b> {news.length} stories in this issue <b>◆</b>{' '}
            </span>
          ))}
        </div>
      </div>

      {loading && news.length === 0 ? (
        <div className="news-empty">
          <span className="t-label">Printing…</span>
        </div>
      ) : news.length === 0 ? (
        <div className="news-empty">
          <Icon name="paper" size={28} />
          <p>No news is good news. The next issue is on the press.</p>
        </div>
      ) : (
        <div className="news-grid">
          <main className="news-main">
            {lead && (
              <article className="news-lead news-art" data-article={lead.id}>
                <div className="news-lead__text">
                  <span className="news-kicker">
                    {lead.section} · {longDate(lead.date)}
                  </span>
                  <h2 className="news-lead__head">{lead.headline}</h2>
                  <p className="news-lead__dek">{lead.dek}</p>
                  <p className="news-byline">
                    By {lead.byline || BYLINE} · {readMins(lead)} min read
                  </p>
                  <p className="news-lead__body">{lead.body[0]}</p>
                  <span className="news-more">
                    Continue reading <Icon name="arrow-right" size={13} />
                  </span>
                </div>
                <Halftone id={lead.id} aspect={4 / 3} spot dot={6} className="news-lead__photo" />
                <button className="news-hit" onClick={hit(lead)} aria-label={`Read: ${lead.headline}`} />
              </article>
            )}
            <div className="news-cols">
              {rest.map((a, i) => (
                <article key={a.id} className={`news-item news-art ${i === 0 ? 'news-item--photo' : ''}`} data-article={a.id}>
                  {(i === 0 || i === 3) && <Halftone id={a.id} aspect={3 / 2} dot={4} />}
                  <span className="news-kicker">{a.section}</span>
                  <h3>{a.headline}</h3>
                  <p>{a.dek}</p>
                  <span className="news-more">
                    {longDate(a.date)} · {readMins(a)} min <Icon name="arrow-right" size={12} />
                  </span>
                  <button className="news-hit" onClick={hit(a)} aria-label={`Read: ${a.headline}`} />
                </article>
              ))}
            </div>
          </main>

          <aside className="news-side">
            <section className="news-wx" aria-label={`${COMPANY.city} weather`}>
              <div className="news-side__head">
                <span>Weather</span>
                <span className={`news-wx__live ${w.live ? 'is-live' : ''}`}>
                  {COMPANY.city} · {w.live ? 'Live' : 'Estimate'}
                </span>
              </div>
              <div className="news-wx__now">
                <b className="t-dot">{Math.round(w.temp)}°</b>
                <span>
                  <strong>{w.label}</strong>
                  Feels {Math.round(w.feels)}° · {Math.round(w.humidity)}% RH · {Math.round(w.wind)} km/h
                </span>
              </div>
              {w.hourly.length > 0 && (
                <ol className="news-wx__hours" aria-label="Next hours">
                  {w.hourly.slice(1, 7).map((h) => (
                    <li key={h.time}>
                      <span>{h.time.slice(11, 13)}h</span>
                      <b>{Math.round(h.temp)}°</b>
                    </li>
                  ))}
                </ol>
              )}
              {w.sunrise && w.sunset ? (
                <p className="news-wx__sun">
                  Sunrise {hhmm(w.sunrise)} · Sunset {hhmm(w.sunset)} WIB
                </p>
              ) : (
                <p className="news-wx__sun">
                  {COMPANY.city} · Updated {formatTime(TZ, new Date(w.updatedAt))} WIB
                </p>
              )}
            </section>

            <section className="news-now" aria-label="Now">
              <div className="news-side__head">
                <span>Now</span>
                <span className="news-now__status">
                  <i className="led led--blue" aria-hidden /> Open to work
                </span>
              </div>
              <p className="news-now__quote">“{COMPANY.now}”</p>
              <p className="news-now__avail">{COMPANY.availability}</p>
              <dl className="news-now__facts">
                {start && (
                  <div>
                    <dt>Start</dt>
                    <dd>{start}</dd>
                  </div>
                )}
                <div>
                  <dt>Hours</dt>
                  <dd>{hours}</dd>
                </div>
                <div>
                  <dt>Replies</dt>
                  <dd>{COMPANY.replyTime.replace(/^Replies /, '')}</dd>
                </div>
              </dl>
              <div className="news-now__actions">
                <a className="btn btn--sm" href={COMPANY.cv} download="Adelia-Tiara-CV.pdf" onClick={() => track('cv_download', { from: 'news' })}>
                  <Icon name="download" size={14} /> CV (PDF)
                </a>
                <a className="btn btn--sm btn--ghost" href={`mailto:${COMPANY.email}`} onClick={() => track('email', { from: 'news' })}>
                  <Icon name="mail" size={14} /> Email her
                </a>
              </div>
            </section>

            <section className="news-ads" aria-label="Classifieds">
              <div className="news-side__head">
                <span>Classifieds</span>
                <span>Small ads, real offers</span>
              </div>
              <div className="news-ad">
                <span className="news-ad__label">Wanted · for hiring teams</span>
                <b>Hiring an AI product engineer?</b>
                <p>Book a 30-minute intro call, or an interview slot. She replies within a day, with times in WIB.</p>
                <button className="btn btn--sm btn--primary" onClick={go('printer', () => focus('printer'))}>
                  Book a chat <Icon name="arrow-right" size={13} />
                </button>
              </div>
              <ul className="news-small">
                <li>
                  <button onClick={go('quiz', () => focus('quiz'))}>
                    <b>Not sure she fits?</b> A 60-second check for hiring teams, with the evidence behind the answer.
                    <span>At the pink mug →</span>
                  </button>
                </li>
                <li>
                  <button onClick={go('manifesto', () => useUI.getState().openPanel('manifesto'))}>
                    <b>Lost: five House Rules.</b> Scattered around the room. Finders keep the hearts.
                    <span>Read the rules →</span>
                  </button>
                </li>
                <li>
                  <button onClick={go('moci', () => focus('moci'))}>
                    <b>Ask the jelly.</b> Moci answers questions about her work, shows its sources and says when it can’t tell.
                    <span>Wake Moci →</span>
                  </button>
                </li>
              </ul>
            </section>
          </aside>
        </div>
      )}

      <footer className="news-colophon">
        <span>
          Printed in {COMPANY.city} by {COMPANY.name}
        </span>
        <span>
          {COMPANY.email} · {COMPANY.replyTime.toLowerCase()}
        </span>
        <span>{COMPANY.holding}</span>
      </footer>
    </div>
  );
}

/* ================================================================ reader */
function ReaderBody({ a, idx, news, onGo }: { a: Article; idx: number; news: Article[]; onGo: (d: 1 | -1) => void }) {
  const prev = news[idx - 1];
  const next = news[idx + 1];
  return (
    <article className="news-reader__inner">
      <span className="news-kicker">
        {a.section} · {longDate(a.date)}
      </span>
      <h2 className="news-reader__headline" tabIndex={-1}>
        {a.headline}
      </h2>
      <p className="news-reader__dek">{a.dek}</p>
      <p className="news-byline">
        By {a.byline || BYLINE} · {COMPANY.city} · {readMins(a)} min read
      </p>
      <Halftone id={a.id} aspect={16 / 8} spot={idx === 0} dot={6} className="news-reader__photo" />
      <div className={`news-reader__body ${a.body.length > 2 ? 'is-cols' : ''}`}>
        {a.body.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
        <span className="news-end" aria-hidden>
          ■
        </span>
      </div>
      <nav className="news-reader__more" aria-label="More stories">
        {prev ? (
          <button onClick={() => onGo(-1)}>
            <span className="t-label">
              <Icon name="arrow-left" size={12} /> Previous · {prev.section}
            </span>
            <b>{prev.headline}</b>
          </button>
        ) : (
          <span />
        )}
        {next ? (
          <button className="is-next" onClick={() => onGo(1)}>
            <span className="t-label">
              Next · {next.section} <Icon name="arrow-right" size={12} />
            </span>
            <b>{next.headline}</b>
          </button>
        ) : (
          <span />
        )}
      </nav>
    </article>
  );
}

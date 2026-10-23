/* ==========================================================================
   RM-03 · The Wall of Work — Adelia's four case studies as the four posters
   in acrylic frames on her wall. Browse the wall (←/→ between frames), or
   open a case: the panel grows into a tall case file you read inside the
   room (CaseFile, shared with the plain /work/:slug page).
   props: { work?: 'tenderlens' | 'ask-hr' | 'catat' | 'lintas', section?: step id }
   Opening a case: read mark + galleryViewed (→ Curator) + track('work_view');
   reading to the end: a "read" sticker, hearts, track('work_read').
   ========================================================================== */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { Stage } from '@/ui/Panel';
import { Icon } from '@/ui/Icon';
import { useUI } from '@/state/ui';
import { game } from '@/state/game';
import { sfx } from '@/audio/engine';
import { track } from '@/lib/api';
import { back } from '@/stage/director';
import { CaseFile, ReadStamp } from '@/features/case/CaseFile';
import { CaseCtx, scrollToEl, type CaseEnv } from '@/features/case/env';
import { CASES, CASE_SLUGS, GUIDE, caseBySlug, caseNumber, caseUrl, pad2, posterFor, readTime, sectionId } from '@/features/case/data';
import { markOpened, reads as readMarks, useReads } from '@/features/case/reads';
import { preloadScreens } from '@/features/case/Lazy';
import './gallery.css';

const valid = (s: unknown): s is string => typeof s === 'string' && CASE_SLUGS.includes(s);
const HEARTS_PER_READ = 20;

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
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

/** Fold the case read marks (which the plain /work pages also write) into the game's galleryViewed. */
function syncViewed(extra?: string) {
  const g = game();
  const opened = Object.keys(readMarks().opened).filter(valid);
  if (extra) opened.push(extra);
  if (opened.every((s) => g.stats.galleryViewed.includes(s))) return;
  g.updateStats((s) => ({ galleryViewed: [...new Set([...s.galleryViewed, ...opened])] }));
}

/* ---------------------------------------------------------------- read meter (header) */
function ReadMeter() {
  const r = useReads();
  const n = CASES.filter((p) => r.read[p.slug]).length;
  return (
    <span className="gw-meter" role="img" aria-label={`${n} of ${CASES.length} case studies read`}>
      <span className="t-label">
        Read {n}/{CASES.length}
      </span>
      <span className="gw-meter__leds">
        {CASES.map((p) => (
          <i key={p.slug} className={`led ${r.read[p.slug] ? '' : r.opened[p.slug] ? 'led--blue' : 'led--off'}`} />
        ))}
      </span>
    </span>
  );
}

/* ---------------------------------------------------------------- the wall */
function Wall({ onOpen, focusSlug }: { onOpen: (slug: string) => void; focusSlug: string | null }) {
  const r = useReads();
  const listRef = useRef<HTMLUListElement>(null);

  // coming back from a case: focus that case's frame
  useEffect(() => {
    if (!focusSlug) return;
    listRef.current?.querySelector<HTMLButtonElement>(`[data-slug="${focusSlug}"]`)?.focus();
  }, [focusSlug]);

  // ←/→ (and ↑/↓, Home/End) move between the frames
  const onKey = (e: KeyboardEvent<HTMLUListElement>) => {
    const keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
    if (!keys.includes(e.key)) return;
    const btns = [...(listRef.current?.querySelectorAll<HTMLButtonElement>('.gw-read') ?? [])];
    const i = btns.indexOf(document.activeElement as HTMLButtonElement);
    if (i < 0) return;
    e.preventDefault();
    const n = btns.length;
    const j = e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? (i - 1 + n) % n : (i + 1) % n;
    sfx('hover');
    btns[j].focus();
  };

  return (
    <div className="gw scroll">
      <div className="gw-top">
        <p className="gw-intro">
          <b>Four products, read in any order.</b> Each answers a hiring question; the engineering has its own section.
        </p>
        <p className="gw-hint t-label" aria-hidden>
          <kbd>←</kbd>
          <kbd>→</kbd> browse · <kbd>↵</kbd> read
        </p>
      </div>

      <ul className="gw-wall" ref={listRef} onKeyDown={onKey} aria-label="The four case studies">
        {CASES.map((p, k) => {
          const read = !!r.read[p.slug];
          return (
            <li key={p.slug} className="gw-item" style={{ '--i': k } as CSSProperties}>
              {/* the frame is a big pointer target; the keyboard uses the read key below */}
              <div
                className="gw-frame"
                aria-hidden
                onClick={() => onOpen(p.slug)}
                onPointerEnter={() => {
                  sfx('hover');
                  preloadScreens();
                }}
              >
                <span className="gw-frame__glass">
                  <img src={posterFor(p.slug)} alt="" width={415} height={590} decoding="async" draggable={false} />
                </span>
                <span className="screws">
                  <i />
                  <i />
                  <i />
                  <i />
                </span>
                {read && <ReadStamp />}
              </div>
              <div className="gw-label">
                <p className="gw-label__meta">
                  <span className="nameplate">No.{p.index}</span>
                  <span className="t-label">{p.year}</span>
                  <span className="gw-label__time t-label">{readTime(p)}</span>
                </p>
                <h3 className="gw-label__name">{p.name}</h3>
                <p className="gw-label__line">{p.kind}</p>
                <p className="gw-label__ctx t-label">{p.context}</p>
                <dl className="gw-stats lcd">
                  {p.stats.map((s) => (
                    <div key={s.label}>
                      <dt>{s.label}</dt>
                      <dd className="t-dot">{s.value}</dd>
                    </div>
                  ))}
                </dl>
                <div className="gw-label__foot">
                  <button
                    className="btn btn--sm gw-read"
                    data-slug={p.slug}
                    onClick={() => onOpen(p.slug)}
                    onFocus={preloadScreens}
                    aria-label={`${read ? 'Read it again' : 'Read the case study'}: ${p.name}, ${p.kind}, ${p.year}${read ? ' (read)' : ''}`}
                  >
                    {read ? 'Read it again' : 'Read the case study'} <Icon name="arrow-right" size={14} />
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <section className="gw-guide" aria-labelledby="gw-guide-title">
        <h3 id="gw-guide-title" className="t-label">
          Hiring for something specific? Start here
        </h3>
        <ul>
          {GUIDE.map((g) => {
            const p = caseBySlug(g.slug);
            if (!p) return null;
            return (
              <li key={g.slug}>
                <button className="gw-q" onClick={() => onOpen(g.slug)}>
                  <span className="gw-q__q">{g.q}</span>
                  <span className="gw-q__why">
                    <b>{p.name}.</b> {g.why}
                  </span>
                  <Icon name="arrow-right" size={16} />
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <footer className="gw-foot">
        <span className="t-label">Prefer a plain page?</span>
        <a className="link" href="/work" target="_blank" rel="noopener noreferrer">
          {location.host}/work
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
        <span className="t-muted">Shareable, and it reads well on a phone.</span>
      </footer>
    </div>
  );
}

/* ---------------------------------------------------------------- the reader */
function Reader({ slug, section, onWall, onStep, onOpen }: { slug: string; section?: string; onWall: () => void; onStep: (d: 1 | -1) => void; onOpen: (slug: string) => void }) {
  const p = caseBySlug(slug)!;
  const [scroller, setScroller] = useState<HTMLDivElement | null>(null);
  const [copied, setCopied] = useState(false);
  const n = caseNumber(p);

  // a new case starts at the top, with focus on its name; or at the section Moci pointed at
  useLayoutEffect(() => {
    if (!scroller) return;
    scroller.scrollTop = 0;
    scroller.querySelector<HTMLElement>('#case-title')?.focus({ preventScroll: true });
    if (section) scrollToEl(document.getElementById(sectionId(section)), scroller, 12, true);
  }, [scroller, slug, section]);

  const env = useMemo<CaseEnv>(
    () => ({
      mode: 'room',
      scrollRoot: scroller,
      base: 2,
      tick: () => sfx('tick'),
      onAsk: (q) => {
        sfx('click');
        track('cta', { from: 'case', work: slug, to: 'moci' });
        useUI.getState().openPanel('moci', { ask: q, nonce: Date.now() });
      },
      onBook: () => {
        sfx('click');
        track('cta', { from: 'case', work: slug, to: 'rsvp' });
        useUI.getState().openPanel('rsvp', { tab: 'session', work: slug });
      },
      onOpen,
      hrefFor: (s) => `/work/${s}`,
      onRead: (s) => {
        const q = caseBySlug(s);
        sfx('stamp');
        track('work_read', { id: s, from: 'room' });
        if (q) game().addPoints(HEARTS_PER_READ, `Read ${q.name} to the end`);
      },
    }),
    [scroller, slug, onOpen],
  );

  const copy = async () => {
    const ok = await copyText(caseUrl(slug));
    sfx(ok ? 'success' : 'error');
    track('share', { what: 'case', id: slug });
    setCopied(ok);
    setTimeout(() => setCopied(false), 2200);
  };

  return (
    <div className="gr">
      <div className="gr-bar">
        <button className="btn btn--sm btn--ghost" onClick={onWall}>
          <Icon name="arrow-left" size={14} /> The wall
        </button>
        <span className="gr-bar__pos t-label" aria-hidden>
          {pad2(n)} / {pad2(CASES.length)}
        </span>
        <span className="gr-bar__step">
          <button className="btn btn--sm btn--icon" onClick={() => onStep(-1)} aria-label="Previous case study">
            <Icon name="arrow-left" size={14} />
          </button>
          <button className="btn btn--sm btn--icon" onClick={() => onStep(1)} aria-label="Next case study">
            <Icon name="arrow-right" size={14} />
          </button>
        </span>
        <span className="gr-bar__fill" />
        <button className="btn btn--sm" onClick={copy}>
          <Icon name={copied ? 'check' : 'share'} size={14} /> <span aria-live="polite">{copied ? 'Link copied' : 'Copy link'}</span>
        </button>
        <a className="btn btn--sm btn--ghost gr-bar__page" href={`/work/${slug}`} target="_blank" rel="noopener noreferrer">
          Open as a page <Icon name="arrow-up-right" size={14} />
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      </div>
      <div className="gr-scroll scroll" ref={setScroller} tabIndex={-1} aria-label={`${p.name} case study`} role="region">
        {scroller && (
          <CaseCtx.Provider value={env}>
            <CaseFile key={slug} project={p} />
          </CaseCtx.Provider>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- panel */
export default function GalleryPanel({ work, section }: { work?: string; section?: string }) {
  const [openSlug, setOpenSlug] = useState<string | null>(() => (valid(work) ? work : null));
  const [returnTo, setReturnTo] = useState<string | null>(null);
  const [sec, setSec] = useState<string | undefined>(section);

  // Moci (or a poster) can re-point an open wall at a case / a section
  useEffect(() => {
    if (valid(work)) {
      setOpenSlug(work);
      setSec(section);
    }
  }, [work, section]);

  // reads made on the plain /work pages count on the wall too
  useEffect(() => {
    syncViewed();
    preloadScreens();
  }, []);

  // a case opens: stamp it as opened, count it for the Curator sticker, tell the dashboard
  useEffect(() => {
    if (!openSlug) return;
    const first = markOpened(openSlug);
    syncViewed(openSlug);
    track('work_view', { id: openSlug, from: 'room', first });
  }, [openSlug]);

  const open = useCallback((slug: string) => {
    if (!valid(slug)) return;
    sfx('paper');
    setSec(undefined);
    setOpenSlug(slug);
  }, []);

  const toWall = useCallback(() => {
    sfx('back');
    setReturnTo(openSlug);
    setOpenSlug(null);
  }, [openSlug]);

  const step = useCallback(
    (d: 1 | -1) => {
      if (!openSlug) return;
      const i = CASE_SLUGS.indexOf(openSlug);
      const next = CASE_SLUGS[(i + d + CASE_SLUGS.length) % CASE_SLUGS.length];
      sfx('paper', { pitch: d > 0 ? 2 : -2 });
      setSec(undefined);
      setOpenSlug(next);
    },
    [openSlug],
  );

  // ←/→ in the reader: the previous / next case (not while a table, the code or a control has focus)
  useEffect(() => {
    if (!openSlug) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      const t = e.target as HTMLElement | null;
      if (t?.closest?.('input, textarea, select, [contenteditable], .case-table, .codeblock__scroll, .arch__scroll, .case-screens, .ba')) return;
      e.preventDefault();
      step(e.key === 'ArrowRight' ? 1 : -1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openSlug, step]);

  const onClose = () => (openSlug ? toWall() : back());
  const p = caseBySlug(openSlug);

  return (
    <Stage
      code="RM-03"
      title="The Wall of Work"
      kicker={p ? `Case file ${pad2(caseNumber(p))} · ${p.name}` : 'Four case studies · 2024–2026'}
      bleed
      className={`gw-stage ${p ? 'is-reading' : ''}`}
      onClose={onClose}
      actions={<ReadMeter />}
    >
      {p ? <Reader slug={p.slug} section={sec} onWall={toWall} onStep={step} onOpen={open} /> : <Wall onOpen={open} focusSlug={returnTo} />}
    </Stage>
  );
}

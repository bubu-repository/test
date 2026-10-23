/* ==========================================================================
   /work and /work/:slug — the case studies as a normal, scrollable page
   outside the room: fast (no plate, no 3D, no room bundle), readable on a
   phone, with its title and meta set for sharing. A header with "Enter the
   room" (→ the door) and "Book a chat" (→ the room, straight to the printer).
   ========================================================================== */
import { useEffect, useLayoutEffect, useMemo, type MouseEvent, type ReactNode } from 'react';
import { identity, bio } from '@/content/profile';
import { linkClick, navigate } from '@/lib/router';
import { track } from '@/lib/api';
import { Icon, Mark } from '@/ui/Icon';
import { CaseFile, ReadStamp } from './CaseFile';
import { CaseCtx, type CaseEnv } from './env';
import { CASES, GUIDE, caseBySlug, pad2, posterFor, readTime, sectionId, STEPS, type Project } from './data';
import { markOpened, useReads } from './reads';
import { preloadScreens } from './Lazy';
import './case.css';
import './work-page.css';

/* ---------------------------------------------------------------- meta (title, description, OG, JSON-LD) */

interface Meta {
  title: string;
  description: string;
  path: string;
  type: 'website' | 'article';
  image?: string;
  noindex?: boolean;
  jsonld?: Record<string, unknown>;
}

function setMetaTag(attr: 'name' | 'property', key: string, value: string | null) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (value === null) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.content = value;
}

function setLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.rel = rel;
    document.head.appendChild(el);
  }
  el.href = href;
}

/** Snapshot of the head as index.html shipped it, so leaving /work puts the room's meta back. */
function snapshotHead() {
  const get = (sel: string, attr = 'content') => document.head.querySelector(sel)?.getAttribute(attr) ?? null;
  return {
    title: document.title,
    description: get('meta[name="description"]'),
    canonical: get('link[rel="canonical"]', 'href'),
    ogTitle: get('meta[property="og:title"]'),
    ogDescription: get('meta[property="og:description"]'),
    ogType: get('meta[property="og:type"]'),
    ogUrl: get('meta[property="og:url"]'),
    ogImage: get('meta[property="og:image"]'),
    robots: get('meta[name="robots"]'),
  };
}

function applyMeta(m: Meta) {
  const url = `${identity.url}${m.path}`;
  document.title = m.title;
  setMetaTag('name', 'description', m.description);
  setLink('canonical', url);
  setMetaTag('property', 'og:title', m.title);
  setMetaTag('property', 'og:description', m.description);
  setMetaTag('property', 'og:type', m.type);
  setMetaTag('property', 'og:url', url);
  setMetaTag('property', 'og:image', m.image ? `${identity.url}${m.image}` : null);
  setMetaTag('name', 'twitter:title', m.title);
  setMetaTag('name', 'twitter:description', m.description);
  setMetaTag('name', 'robots', m.noindex ? 'noindex' : null);
  let ld = document.getElementById('work-jsonld');
  if (m.jsonld) {
    if (!ld) {
      ld = document.createElement('script');
      ld.id = 'work-jsonld';
      ld.setAttribute('type', 'application/ld+json');
      document.head.appendChild(ld);
    }
    ld.textContent = JSON.stringify(m.jsonld);
  } else ld?.remove();
}

function restoreHead(s: ReturnType<typeof snapshotHead>) {
  document.title = s.title;
  setMetaTag('name', 'description', s.description);
  if (s.canonical) setLink('canonical', s.canonical);
  setMetaTag('property', 'og:title', s.ogTitle);
  setMetaTag('property', 'og:description', s.ogDescription);
  setMetaTag('property', 'og:type', s.ogType);
  setMetaTag('property', 'og:url', s.ogUrl);
  setMetaTag('property', 'og:image', s.ogImage);
  setMetaTag('name', 'twitter:title', null);
  setMetaTag('name', 'twitter:description', null);
  setMetaTag('name', 'robots', s.robots);
  document.getElementById('work-jsonld')?.remove();
}

/** "AI Product Engineer" → "AI product engineer" (acronyms kept). */
const sentenceRole = identity.role.replace(/ (?![A-Z]{2,})(\w)/g, (_, c: string) => ` ${c.toLowerCase()}`);

const author = { '@type': 'Person', name: identity.name, jobTitle: identity.role, url: identity.url, address: identity.location };

function metaFor(p: Project | undefined, slug: string | undefined): Meta {
  if (p)
    return {
      title: `${p.name}: ${p.kind} · ${identity.name}`,
      description: `${p.tagline} A case study by ${identity.name}, ${sentenceRole}: research, design decisions, the pipeline, models and evals, and results.`,
      path: `/work/${p.slug}`,
      type: 'article',
      image: posterFor(p.slug),
      jsonld: {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: `${p.name}: ${p.kind}`,
        description: p.tagline,
        url: `${identity.url}/work/${p.slug}`,
        image: `${identity.url}${posterFor(p.slug)}`,
        inLanguage: 'en',
        author,
        about: p.stack,
      },
    };
  if (slug)
    return { title: `Case study not found · ${identity.name}`, description: 'This case study does not exist. Four others do.', path: `/work/${slug}`, type: 'website', noindex: true };
  return {
    title: `Case studies · ${identity.name}, ${identity.role}`,
    description: `Four products designed and built by ${identity.name}: ${CASES.map((c) => c.name).join(', ').replace(/, ([^,]*)$/, ' and $1')}. Each case study shows the research, the design decisions and what they cost, the rounds that failed, the shipped screens and the results.`,
    path: '/work',
    type: 'website',
    jsonld: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: `Case studies by ${identity.name}`,
      url: `${identity.url}/work`,
      author,
      hasPart: CASES.map((c) => ({ '@type': 'Article', headline: `${c.name}: ${c.kind}`, url: `${identity.url}/work/${c.slug}` })),
    },
  };
}

/* ---------------------------------------------------------------- shell */

const BOOK = '/?go=printer';

function A({ href, className, children, onClick, current }: { href: string; className?: string; children: ReactNode; onClick?: () => void; current?: boolean }) {
  return (
    <a
      href={href}
      className={className}
      aria-current={current ? 'page' : undefined}
      onClick={(e: MouseEvent) => {
        onClick?.();
        linkClick(e, href);
      }}
    >
      {children}
    </a>
  );
}

function Header({ index }: { index: boolean }) {
  return (
    <header className="wp-head">
      <div className="wp-head__in">
        <A href="/work" className="wp-brand" current={index}>
          <Mark size={30} />
          <span>
            <b>{identity.name}</b>
            <small>
              {identity.role} · {identity.cohort}
            </small>
          </span>
        </A>
        <nav className="wp-nav" aria-label="Site">
          <A href="/work" className="wp-nav__link" current={index}>
            Case studies
          </A>
          <A href="/" className="btn btn--sm btn--ghost" onClick={() => track('cta', { from: 'work-page', to: 'room' })}>
            Enter the room
          </A>
          <A href={BOOK} className="btn btn--sm btn--primary" onClick={() => track('cta', { from: 'work-page', to: 'rsvp' })}>
            Book a chat
          </A>
        </nav>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="wp-foot">
      <div className="wp-foot__in">
        <div>
          <p className="t-label">Hiring? Say hello</p>
          <a className="wp-foot__mail" href={`mailto:${identity.email}`} onClick={() => track('email', { from: 'work-page' })}>
            <Icon name="mail" size={18} /> {identity.email}
          </a>
          <p className="wp-foot__avail">{bio.availability}</p>
        </div>
        <div className="wp-foot__keys">
          <a className="btn btn--sm" href="/cv.pdf" download="Adelia-Tiara-CV.pdf" onClick={() => track('cv_download', { from: 'work-page' })}>
            <Icon name="download" size={15} /> CV (PDF)
          </a>
          <A href="/" className="btn btn--sm btn--ghost">
            Enter the room
          </A>
        </div>
      </div>
      <p className="wp-foot__line t-label">
        {identity.domain} · {identity.location} · {identity.timeZoneLabel}
      </p>
    </footer>
  );
}

/* ---------------------------------------------------------------- /work */

function WorkIndex() {
  const r = useReads();
  return (
    <div className="wp-index">
      <header className="wp-index__head">
        <p className="t-label">Case studies · {CASES.length} products · 2024–2026</p>
        <h1 className="wp-index__title t-title">Four products, read in any order.</h1>
        <p className="wp-index__lead">
          Each one answers a hiring question, with the engineering in its own section. Tenderlens is the full case, under 20 minutes; the others take 10 to 15.
        </p>
      </header>

      <section className="wp-guide" aria-labelledby="wp-guide-title">
        <h2 id="wp-guide-title" className="t-label">
          Hiring for something specific? Start here
        </h2>
        <ul>
          {GUIDE.map((g) => {
            const p = caseBySlug(g.slug);
            if (!p) return null;
            return (
              <li key={g.slug}>
                <A href={`/work/${p.slug}`} className="wp-guide__q">
                  <span className="wp-guide__ask">{g.q}</span>
                  <span className="wp-guide__why">
                    <b>{p.name}.</b> {g.why}
                  </span>
                </A>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-label="Case studies">
        <ul className="wp-cards">
          {CASES.map((p) => {
            const read = !!r.read[p.slug];
            return (
              <li key={p.slug}>
                <A href={`/work/${p.slug}`} className="wp-card">
                  <span className="wp-card__poster" aria-hidden>
                    <img src={posterFor(p.slug)} alt="" width={415} height={590} loading="lazy" decoding="async" />
                    <span className="screws">
                      <i />
                      <i />
                      <i />
                      <i />
                    </span>
                  </span>
                  <span className="wp-card__body">
                    <span className="wp-card__meta">
                      <span className="nameplate">No.{p.index}</span>
                      <span className="t-label">
                        {p.year} · {p.context}
                      </span>
                    </span>
                    <h2 className="wp-card__name">{p.name}</h2>
                    <span className="wp-card__kind">{p.kind}</span>
                    <span className="wp-card__tagline">{p.tagline}</span>
                    <span className="wp-card__stats lcd">
                      {p.stats.map((s) => (
                        <span key={s.label}>
                          <b className="t-dot">{s.value}</b>
                          <small>{s.label}</small>
                        </span>
                      ))}
                    </span>
                    <span className="wp-card__cta">
                      {read ? 'Read it again' : 'Read the case study'} <Icon name="arrow-right" size={15} />
                      <small className="t-label">{readTime(p)}</small>
                    </span>
                  </span>
                  {read && <ReadStamp />}
                </A>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="wp-also" aria-labelledby="wp-also-title">
        <h2 id="wp-also-title" className="wp-also__title">
          Also here
        </h2>
        <ul>
          <li>
            <A href="/" className="wp-also__card">
              <b>Her room</b>
              <span>The same four posters on her wall, her toolkit on a chrome shelf, Moci (her AI agent), and a printer that books a chat.</span>
            </A>
          </li>
          <li>
            <a href="/cv.pdf" download="Adelia-Tiara-CV.pdf" className="wp-also__card" onClick={() => track('cv_download', { from: 'work-index' })}>
              <b>CV (PDF)</b>
              <span>One page: roles, dates, tools and education.</span>
            </a>
          </li>
          <li>
            <a href={`mailto:${identity.email}`} className="wp-also__card" onClick={() => track('email', { from: 'work-index' })}>
              <b>Email her</b>
              <span>{identity.email}</span>
            </a>
          </li>
        </ul>
      </section>
    </div>
  );
}

function NotFound({ slug }: { slug: string }) {
  return (
    <div className="wp-404">
      <p className="t-label">404 · /work/{slug}</p>
      <h1 className="wp-index__title t-title">No case study by that name.</h1>
      <p className="wp-index__lead">There are four. Pick one:</p>
      <ul className="wp-404__list">
        {CASES.map((p) => (
          <li key={p.slug}>
            <A href={`/work/${p.slug}`} className="cf-link">
              {p.name}
            </A>{' '}
            <span className="t-muted">· {p.kind}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------------------------------------------------------------- page */

export default function WorkPage({ slug }: { slug?: string }) {
  const p = caseBySlug(slug);

  // title, description, canonical, OG, JSON-LD — put the room's back when leaving
  useEffect(() => {
    const snap = snapshotHead();
    return () => restoreHead(snap);
  }, []);
  useEffect(() => {
    applyMeta(metaFor(p, slug));
  }, [p, slug]);

  // a case opens: read mark + the dashboard (it also counts any /work/<slug> path)
  useEffect(() => {
    if (!p) return;
    preloadScreens(); // the mockups chunk, in parallel with the text
    const first = markOpened(p.slug);
    track('work_view', { id: p.slug, from: 'page', first });
  }, [p]);

  // new page: start at the top (or at the section in the hash), focus the heading
  useLayoutEffect(() => {
    const id = location.hash.replace('#', '');
    if (p && STEPS.some((s) => s.id === id)) {
      const el = document.getElementById(sectionId(id));
      if (el) window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 84);
    } else window.scrollTo(0, 0);
    document.querySelector<HTMLElement>(p ? '#case-title' : '.wp-main h1')?.focus({ preventScroll: true });
  }, [slug, p]);

  const env = useMemo<CaseEnv>(
    () => ({
      mode: 'page',
      scrollRoot: null,
      base: 1,
      onAsk: (q) => {
        track('cta', { from: 'case-page', work: p?.slug, to: 'moci' });
        navigate(`/?go=moci&ask=${encodeURIComponent(q)}`);
      },
      onBook: () => {
        track('cta', { from: 'case-page', work: p?.slug, to: 'rsvp' });
        navigate(BOOK);
      },
      onOpen: (s) => navigate(`/work/${s}`),
      hrefFor: (s) => `/work/${s}`,
      onRead: (s) => track('work_read', { id: s, from: 'page' }),
    }),
    [p],
  );

  return (
    <div className="wp">
      <a className="wp-skip" href="#main">
        Skip to the {p ? 'case study' : 'case studies'}
      </a>
      <Header index={!slug} />
      <main id="main" className="wp-main" tabIndex={-1}>
        {p ? (
          <CaseCtx.Provider value={env}>
            <CaseFile key={p.slug} project={p} />
          </CaseCtx.Provider>
        ) : slug ? (
          <NotFound slug={slug} />
        ) : (
          <WorkIndex />
        )}
        {p && (
          <p className="wp-back">
            <A href="/work" className="cf-link">
              ← All {CASES.length} case studies
            </A>
            <span className="t-label">
              Case {pad2(CASES.indexOf(p) + 1)} of {pad2(CASES.length)}
            </span>
          </p>
        )}
      </main>
      <Footer />
    </div>
  );
}

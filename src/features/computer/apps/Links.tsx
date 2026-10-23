/* Links — a small browser through her real links (ECOSYSTEM): the CV, code,
   the live products, the eval set and the thesis. Every one opens for real. */
import { useEffect, useRef, useState } from 'react';
import { COMPANY, ECOSYSTEM, WORK } from '@/lib/content';
import { sfx } from '@/audio/engine';
import { track } from '@/lib/api';

type Site = (typeof ECOSYSTEM)[number];
const HOME = 'home';

const isRelative = (url: string) => url.startsWith('/');
const host = (url: string) => (isRelative(url) ? `${COMPANY.domain}${url}` : url.replace(/^https?:\/\//, '').replace(/\/$/, ''));
const isCv = (s: Site) => s.id === 'cv' || /\/cv\.pdf$/.test(s.url);

function kindOf(s: Site) {
  if (s.id === 'site') return 'This room';
  if (isCv(s)) return 'PDF · one page';
  if (/\.pdf$/i.test(s.url)) return 'PDF';
  if (/github\.com/.test(s.url)) return 'Code';
  if (/linkedin\.com/.test(s.url)) return 'Profile';
  return 'Live product';
}
const yearOf = (s: Site) => WORK.find((w) => s.id === w.id || s.id.startsWith(`${w.id}-`))?.year || (s.id === 'thesis' ? '2026' : '');

function visit(s: Site) {
  sfx('open');
  if (isCv(s)) track('cv_download', { from: 'os-links' });
  else track('ecosystem_visit', { id: s.id, url: s.url });
}

export default function Links() {
  const [hist, setHist] = useState<string[]>([HOME]);
  const [pos, setPos] = useState(0);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const cur = hist[pos];
  const site = ECOSYSTEM.find((e) => e.id === cur) ?? null;

  useEffect(() => () => clearTimeout(timer.current), []);

  const load = () => {
    setLoading(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setLoading(false), 480);
  };
  const go = (id: string) => {
    if (id === cur) return;
    sfx('click');
    setHist((h) => [...h.slice(0, pos + 1), id]);
    setPos((p) => p + 1);
    load();
  };
  const nav = (d: number) => {
    const n = pos + d;
    if (n < 0 || n >= hist.length) return;
    sfx('tick');
    setPos(n);
    load();
  };

  const url = site ? host(site.url) : 'her://links';

  return (
    <div className="os-web">
      <div className="os-web__bar">
        <button aria-label="Back" disabled={pos === 0} onClick={() => nav(-1)}>
          ‹
        </button>
        <button aria-label="Forward" disabled={pos >= hist.length - 1} onClick={() => nav(1)}>
          ›
        </button>
        <button aria-label="All links" onClick={() => go(HOME)}>
          ⌂
        </button>
        <div className="os-web__url" title={site?.url ?? url}>
          <i className={`os-web__lock ${site ? '' : 'is-local'}`} aria-hidden />
          <span>{url}</span>
          {loading && <b className="os-web__progress" aria-hidden />}
        </div>
        {site && (
          <a
            className="btn btn--sm btn--primary"
            href={site.url}
            target="_blank"
            rel="noopener noreferrer"
            download={isCv(site) ? 'Adelia-Tiara-CV.pdf' : undefined}
            onClick={() => visit(site)}
          >
            {isCv(site) ? 'Download' : 'Open'} ↗
          </a>
        )}
      </div>
      <div className="os-web__body">
        <nav className="os-web__marks scroll" aria-label="Bookmarks">
          <button className={!site ? 'is-on' : ''} aria-current={!site ? 'page' : undefined} onClick={() => go(HOME)}>
            <i>◎</i> All links
          </button>
          {ECOSYSTEM.map((e) => (
            <button key={e.id} className={site?.id === e.id ? 'is-on' : ''} aria-current={site?.id === e.id ? 'page' : undefined} onClick={() => go(e.id)}>
              <i>{e.name.slice(0, 1)}</i> {e.name}
            </button>
          ))}
        </nav>
        <div className={`os-web__page scroll ${loading ? 'is-loading' : ''}`} key={cur + pos} aria-busy={loading}>
          {!site ? (
            <div className="os-web__home">
              <p className="t-label">her://links · {ECOSYSTEM.length} bookmarks</p>
              <h3>Her links. Every claim opens its source.</h3>
              <div className="os-web__grid">
                {ECOSYSTEM.map((e, i) => (
                  <button key={e.id} className="os-web__card" onClick={() => go(e.id)}>
                    <span className="t-spec">
                      {String(i + 1).padStart(2, '0')} · {kindOf(e)}
                    </span>
                    <b>{e.name}</b>
                    <small>{e.body}</small>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <SitePage s={site} />
          )}
        </div>
      </div>
    </div>
  );
}

function SitePage({ s }: { s: Site }) {
  const y = yearOf(s);
  const idx = ECOSYSTEM.findIndex((e) => e.id === s.id);
  return (
    <article className="os-web__site">
      <div className="os-web__hero">
        <span className="t-spec">{host(s.url)}</span>
        <h3>{s.name}</h3>
        <div className="os-web__art" aria-hidden>
          {Array.from({ length: 24 }, (_, i) => (
            <i key={i} style={{ height: `${20 + (((i + 3) * (idx + 5) * 37) % 80)}%` }} className={i % 7 === idx % 7 ? 'is-on' : i % 11 === idx % 11 ? 'is-blue' : ''} />
          ))}
        </div>
      </div>
      <p className="os-web__lede">{s.body}</p>
      <dl className="os-web__facts">
        <div>
          <dt>Type</dt>
          <dd>{kindOf(s)}</dd>
        </div>
        {y && (
          <div>
            <dt>Year</dt>
            <dd>
              <span className="t-dot os-web__year">{y}</span>
            </dd>
          </div>
        )}
        <div>
          <dt>Address</dt>
          <dd className="os-web__host">{host(s.url)}</dd>
        </div>
      </dl>
      <a className="btn btn--dark btn--sm" href={s.url} target="_blank" rel="noopener noreferrer" download={isCv(s) ? 'Adelia-Tiara-CV.pdf' : undefined} onClick={() => visit(s)}>
        {isCv(s) ? 'Download the CV (PDF)' : `Open ${host(s.url)}`} ↗
      </a>
    </article>
  );
}

/* ==========================================================================
   The Toolkit — the chrome wire shelf, as a hardware datasheet.
   Six objects from the shelf, one capability each: an index rail, the
   object itself (the room cut-out) on an engineering-paper sweep, and a
   spec sheet with the evidence behind it. Every number links to the case
   study it comes from, and the shelf's own hit areas deep-link here with
   { focus: '<product id>' }.
   ========================================================================== */
import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent as RPointerEvent } from 'react';
import { Stage } from '@/ui/Panel';
import { Icon } from '@/ui/Icon';
import { PRODUCTS, WORK, type Product, type WorkId } from '@/lib/content';
import { useUI } from '@/state/ui';
import { game } from '@/state/game';
import { sfx } from '@/audio/engine';
import { track } from '@/lib/api';
import { focus as walkTo } from '@/stage/director';
import type { PanelId } from '@/stage/stations';
import './products.css';

/** The room cut-out of each object (transparent webp, plate scale): natural size. */
const CUT: Record<string, { file: string; w: number; h: number }> = {
  'field-research': { file: 'cassette', w: 330, h: 220 },
  retrieval: { file: 'cd', w: 286, h: 252 },
  evals: { file: 'jar', w: 202, h: 292 },
  agents: { file: 'robot', w: 178, h: 316 },
  design: { file: 'zines', w: 462, h: 150 },
  'full-stack': { file: 'usb', w: 172, h: 252 },
};
const cutOf = (id: string) => CUT[id] ?? { file: 'cassette', w: 330, h: 220 };
const srcOf = (id: string) => `/assets/room/cut/${cutOf(id).file}.webp`;
/** Display width: at most 1.25× the cut-out (it is plate-scale), at most 340px tall, 460px wide. */
const dispOf = (id: string) => {
  const c = cutOf(id);
  const k = Math.min(1.25, 340 / c.h, 460 / c.w);
  return Math.round(c.w * k);
};

/** The product's theme colour, used only as a small signal (LED, rule). */
const SIGNAL: Record<Product['color'], string> = {
  orange: 'var(--accent)',
  alu: 'var(--ice-5)',
  graphite: 'var(--ink)',
  blue: 'var(--primary)',
};

const pad = (n: number) => String(n).padStart(2, '0');
const workName = (id: string) => WORK.find((w) => w.id === id)?.client;
const isCv = (href?: string) => !!href && /\/cv\.pdf(\?|#|$)/.test(href);

export default function ProductsPanel({ focus }: { focus?: string }) {
  const indexOf = (id?: string) => Math.max(0, PRODUCTS.findIndex((p) => p.id === id));
  const [idx, setIdx] = useState(() => indexOf(focus));
  const [dir, setDir] = useState<1 | -1>(1);
  const photoRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const p = PRODUCTS[idx];
  const cut = cutOf(p.id);
  const work = WORK.find((w) => w.id === p.work);

  // deep link: openPanel('products', { focus })
  useEffect(() => {
    if (focus) setIdx(indexOf(focus));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus]);

  // preload every cut-out so switching is instant
  useEffect(() => {
    PRODUCTS.forEach((x) => {
      const img = new Image();
      img.src = srcOf(x.id);
    });
  }, []);

  // stats + analytics on each view
  useEffect(() => {
    game().updateStats((s) => ({ productsViewed: [...new Set([...s.productsViewed, p.id])] }));
    track('product_view', { id: p.id });
    sheetRef.current?.scrollTo({ top: 0 });
    const el = railRef.current?.querySelector<HTMLElement>(`[data-id="${p.id}"]`);
    el?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
  }, [p.id]);

  const idxRef = useRef(idx);
  idxRef.current = idx;
  const go = useCallback((next: number, d?: 1 | -1) => {
    const n = PRODUCTS.length;
    const i = ((next % n) + n) % n;
    const cur = idxRef.current;
    if (cur === i) return;
    idxRef.current = i;
    setDir(d ?? (i > cur ? 1 : -1));
    setIdx(i);
    sfx('switch', { pitch: (i % 4) * 2 });
  }, []);

  // ←/→ switches object
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if ((e.target as HTMLElement)?.closest?.('input, textarea, select, [contenteditable]')) return;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        go(idxRef.current + 1, 1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        go(idxRef.current - 1, -1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go]);

  // subtle parallax tilt (pointer only)
  const onMove = (e: RPointerEvent<HTMLDivElement>) => {
    const el = photoRef.current;
    if (!el || e.pointerType === 'touch') return;
    const r = el.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 2 - 1;
    const y = ((e.clientY - r.top) / r.height) * 2 - 1;
    el.style.setProperty('--ry', `${(x * 7).toFixed(2)}deg`);
    el.style.setProperty('--rx', `${(-y * 5).toFixed(2)}deg`);
    el.style.setProperty('--sx', `${(-x * 14).toFixed(1)}px`);
  };
  const onLeave = () => {
    const el = photoRef.current;
    if (!el) return;
    el.style.setProperty('--ry', '0deg');
    el.style.setProperty('--rx', '0deg');
    el.style.setProperty('--sx', '0px');
  };

  /* ------------------------------------------------------------ actions */
  const open = (id: PanelId, props: Record<string, unknown> = {}) => {
    sfx('click');
    track('cta', { from: 'products', product: p.id, to: id });
    useUI.getState().openPanel(id, props);
  };
  /** Walk to the Wall of Work and open that case study. */
  const readCase = (w: string, via = 'proof') => {
    track('cta', { from: 'products', product: p.id, to: 'gallery', work: w, via });
    walkTo('gallery', { work: w as WorkId });
  };
  const onSource = (source: string) => {
    if (source === 'model-card') {
      track('cta', { from: 'products', product: p.id, to: 'about', via: 'evidence' });
      walkTo('about');
    } else readCase(source, 'evidence');
  };
  const book = () => open('rsvp', { tab: 'session', interest: p.id });
  const primary = () => {
    const target = (p.cta.panel ?? 'rsvp') as PanelId;
    if (target === 'rsvp') book();
    else if (target === 'gallery') readCase(p.work, 'cta');
    else open(target);
  };
  const onHref = (href: string) => {
    sfx('paper');
    if (isCv(href)) track('cv_download', { from: 'shelf', product: p.id });
    else track('cta', { from: 'products', product: p.id, to: href });
  };
  const href = p.cta.href;
  const primaryIsBooking = !href && (p.cta.panel ?? 'rsvp') === 'rsvp';
  const toGacha = () => {
    track('cta', { from: 'products', product: p.id, to: 'vault' });
    walkTo('vault');
  };

  return (
    <Stage
      code="RM-01"
      title="The toolkit"
      kicker="Datasheet · 6 objects"
      bleed
      className="pd-stage"
      actions={
        <div className="pd-pager">
          <button className="btn btn--sm btn--icon" onClick={() => go(idx - 1, -1)} aria-label="Previous object">
            <Icon name="arrow-left" size={15} />
          </button>
          <span className="t-spec pd-pager__count">
            <b>{pad(idx + 1)}</b> / {pad(PRODUCTS.length)}
          </span>
          <button className="btn btn--sm btn--icon" onClick={() => go(idx + 1, 1)} aria-label="Next object">
            <Icon name="arrow-right" size={15} />
          </button>
        </div>
      }
    >
      <div className="pd" style={{ '--signal': SIGNAL[p.color] } as CSSProperties}>
        {/* ---------------------------------------------------------- rail */}
        <nav className="pd-rail scroll" ref={railRef} aria-label="The objects on the shelf">
          <span className="t-label pd-rail__title">Index</span>
          <div className="pd-rail__list" role="tablist" aria-label="Objects">
            {PRODUCTS.map((x, i) => (
              <button
                key={x.id}
                data-id={x.id}
                role="tab"
                id={`pd-tab-${x.id}`}
                aria-selected={i === idx}
                aria-controls="pd-sheet"
                className={`pd-rail__item ${i === idx ? 'is-active' : ''}`}
                onClick={() => go(i)}
                onMouseEnter={() => i !== idx && sfx('hover')}
              >
                <span className="pd-rail__thumb" aria-hidden>
                  <img src={srcOf(x.id)} alt="" loading="lazy" draggable={false} />
                </span>
                <span className="pd-rail__text">
                  <b className="pd-rail__model">{x.model}</b>
                  <span className="pd-rail__name">{x.name}</span>
                </span>
              </button>
            ))}
          </div>
          <button className="pd-rail__gacha" onClick={toGacha} onMouseEnter={() => sfx('hover')}>
            <span className="t-spec">Also on the shelf</span>
            <b>The gacha machine</b>
            <span className="pd-rail__gacha-sub">Tenderlens, module by module, in 3D</span>
            <Icon name="arrow-up-right" size={14} />
          </button>
        </nav>

        {/* ---------------------------------------------------------- photo */}
        <div className="pd-photo hairgrid" ref={photoRef} onPointerMove={onMove} onPointerLeave={onLeave}>
          <div className="pd-photo__ghost" key={`g-${p.id}`} aria-hidden>
            {p.model}
          </div>
          <span className="pd-photo__mark pd-photo__mark--tl" aria-hidden />
          <span className="pd-photo__mark pd-photo__mark--tr" aria-hidden />
          <span className="pd-photo__mark pd-photo__mark--bl" aria-hidden />
          <span className="pd-photo__mark pd-photo__mark--br" aria-hidden />
          <div className="pd-photo__meta t-spec" aria-hidden>
            <span>
              Fig. {pad(idx + 1)} · <b>{p.model}</b>
            </span>
            <span>{p.object}</span>
          </div>

          <figure
            key={p.id}
            className={`pd-figure ${dir > 0 ? 'pd-figure--next' : 'pd-figure--prev'}`}
            style={{ '--pw': `${dispOf(p.id)}px`, '--ar': `${cut.w} / ${cut.h}` } as CSSProperties}
          >
            <div className="pd-figure__tilt">
              <div className="pd-figure__float">
                <img src={srcOf(p.id)} alt={`${p.object}: ${p.name}`} draggable={false} />
              </div>
            </div>
            <div className="pd-figure__riser" aria-hidden />
            <div className="pd-figure__shadow" aria-hidden />
          </figure>

          <div className="pd-photo__keys t-spec" aria-hidden>
            <kbd>←</kbd>
            <kbd>→</kbd> next object
          </div>
        </div>

        {/* ---------------------------------------------------------- spec sheet */}
        <div className="pd-sheet scroll" ref={sheetRef} id="pd-sheet" role="tabpanel" aria-labelledby={`pd-tab-${p.id}`}>
          <div className="pd-sheet__inner" key={p.id}>
            <div className="pd-sheet__top">
              <span className="t-label pd-sheet__obj">
                <i className="pd-led" aria-hidden />
                {p.object}
              </span>
              <span className="readout readout--blue pd-model">{p.model}</span>
            </div>
            <h3 className="pd-name">{p.name}</h3>
            <p className="pd-tagline">{p.tagline}</p>
            <p className="pd-desc">{p.description}</p>

            <div className="rule">Evidence</div>
            <ul className="pd-evidence">
              {p.evidence.map((e) => {
                const src = e.source === 'model-card' ? 'Her model card' : (workName(e.source) ?? e.source);
                return (
                  <li key={e.value + e.label}>
                    <span className="pd-evidence__value t-dot">{e.value}</span>
                    <span className="pd-evidence__label">{e.label}</span>
                    <button className="pd-evidence__src" onClick={() => onSource(e.source)} aria-label={`${e.value}: source, ${src}`}>
                      {src} <Icon name="arrow-up-right" size={12} />
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="rule">Spec sheet</div>
            <dl className="pd-specs">
              {p.specs.map((s) => (
                <div key={s.k}>
                  <dt>{s.k}</dt>
                  <dd>{s.v}</dd>
                </div>
              ))}
            </dl>

            <div className="rule">What it covers</div>
            <ol className="pd-features">
              {p.features.map((f, i) => (
                <li key={f}>
                  <span className="t-spec">{pad(i + 1)}</span>
                  <span>{f}</span>
                </li>
              ))}
            </ol>

            <aside className="pd-proof lcd">
              <span className="t-label">
                <span className="led led--blue" /> Field proof
              </span>
              <p>{p.proof}</p>
              {work && (
                <button className="pd-proof__link" onClick={() => readCase(work.id)}>
                  Read the case · {work.client} <Icon name="arrow-up-right" size={14} />
                </button>
              )}
            </aside>
          </div>

          <div className="pd-cta">
            {href ? (
              <a
                className="btn btn--primary btn--lg pd-cta__main"
                href={href}
                {...(isCv(href) ? { download: 'Adelia-Tiara-CV.pdf' } : { target: '_blank', rel: 'noopener' })}
                onClick={() => onHref(href)}
              >
                {p.cta.label} <Icon name={isCv(href) ? 'download' : 'arrow-up-right'} size={16} />
              </a>
            ) : (
              <button className="btn btn--primary btn--lg pd-cta__main" onClick={primary}>
                {p.cta.label} <Icon name="arrow-right" size={16} />
              </button>
            )}
            {primaryIsBooking ? (
              <a className="btn btn--lg pd-cta__alt" href="/cv.pdf" download="Adelia-Tiara-CV.pdf" onClick={() => onHref('/cv.pdf')} aria-label="Download her CV (PDF)">
                <Icon name="download" size={16} /> CV
              </a>
            ) : (
              <button className="btn btn--lg pd-cta__alt" onClick={book}>
                Book a chat
              </button>
            )}
          </div>
        </div>
      </div>
    </Stage>
  );
}

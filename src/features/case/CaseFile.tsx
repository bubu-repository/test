/* ==========================================================================
   The case file: one of Adelia's four case studies, in full. Shared by the
   reader on the Wall of Work (inside the room) and the plain /work/:slug
   page. Every word and number comes from src/content/projects.ts.
   Order (from the old adelia.cc case page): header · cover (shipped screens,
   the 20-second version, facts, where it is now, the receipts) · contents
   rail + 01 problem · 02 role · 03 research · 04 decisions · 05 iterations
   (full case only) · 06 the shipped design · 07 engineering · 08 results ·
   09 reflection · the read stamp, "ask instead", keep reading.
   ========================================================================== */
import { useEffect, useMemo, useRef, type MouseEvent, type ReactNode } from 'react';
import type { Project } from '@/content/projects';
import { CASES, caseNumber, neighbours, pad2, posterFor, readTime, sectionId, stepsFor } from './data';
import { H, scrollToEl, useCase } from './env';
import { markRead, useReads } from './reads';
import { TraceRail } from './TraceRail';
import { Engineering } from './Engineering';
import { BeforeAfter } from './BeforeAfter';
import { Table } from './Table';
import { FlowPlayer, Screen, Wire } from './Lazy';
import './case.css';

/* ---------------------------------------------------------------- small parts */

/** The "read" sticker: a little holo stamp on a case you've read to the end. */
export function ReadStamp({ size = 'sm', label = 'Read' }: { size?: 'sm' | 'lg'; label?: string }) {
  return (
    <span className={`read-stamp read-stamp--${size} holo`}>
      <svg viewBox="0 0 12 12" width="11" height="11" aria-hidden>
        <path d="M2.5 6.4 5 8.8l4.6-5.3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {label}
    </span>
  );
}

/** A link to another case that opens in place (and still has a real href to share or open in a tab). */
export function CaseLink({ slug, className, children, label }: { slug: string; className?: string; children: ReactNode; label?: string }) {
  const { hrefFor, onOpen } = useCase();
  const click = (e: MouseEvent) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    onOpen(slug);
  };
  return (
    <a href={hrefFor(slug)} className={className} onClick={click} aria-label={label}>
      {children}
    </a>
  );
}

const Ext = ({ href, children, className = 'cf-link' }: { href: string; children: ReactNode; className?: string }) => (
  <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
    {children} ↗<span className="sr-only"> (opens in a new tab)</span>
  </a>
);

function SectionHead({ n, eyebrow, title, id, lead }: { n: number; eyebrow: string; title: string; id: string; lead?: string }) {
  return (
    <header className="cf-head">
      <p className="cf-head__eyebrow">
        <span className="cf-head__n">{pad2(n)}</span>
        <span className="t-label">{eyebrow}</span>
        <i aria-hidden />
      </p>
      <H depth={1} id={`${sectionId(id)}-title`} className="cf-h2">
        {title}
      </H>
      {lead && <p className="cf-head__lead">{lead}</p>}
    </header>
  );
}

/* ---------------------------------------------------------------- cover */

/** Project tone → the tint on its "what happened" card (colour stays an accent). */
const TONE: Record<string, string> = { accent: 'pink', sun: 'blue', cobalt: 'mint', violet: 'blue', sky: 'blue', lime: 'mint' };

function Cover({ p }: { p: Project }) {
  const [main, left, right] = p.cover ?? p.screens.slice(0, 3).map((x) => x.key);
  const a = p.screens.find((x) => x.key === main) ?? p.screens[0];
  return (
    <section aria-label="Overview" className="cf-cover">
      <div className={`case-stage case-stage--${p.slug}`}>
        <span className="case-stage__fig t-label" aria-hidden>
          Fig. 01 · shipped screens
        </span>
        <span className="screws" aria-hidden>
          <i />
          <i />
          <i />
          <i />
        </span>
        <div className="case-stage__phones">
          <Screen id={left} className="case-stage__side case-stage__side--l" />
          <Screen id={main} className="case-stage__main" label={`${p.name}: ${a.title}. ${a.caption}`} />
          <Screen id={right} className="case-stage__side case-stage__side--r" />
        </div>
      </div>

      <dl className="cf-tldr">
        {(
          [
            ['The problem', p.tldr.problem],
            ['What I did', p.tldr.did],
            ['What happened', p.tldr.outcome],
          ] as const
        ).map(([k, v], i) => (
          <div key={k} className={`cf-tldr__item ${i === 2 ? `is-outcome tone-${TONE[p.tone] ?? 'pink'}` : ''}`}>
            <dt className="t-label">
              {pad2(i + 1)} · {k}
            </dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>

      <dl className="cf-facts">
        {[
          ['Role', p.role.title],
          ['Team', p.team],
          ['Timeline', p.timeline],
          ['Tools', p.stack.slice(0, 4).join(', ')],
        ].map(([k, v]) => (
          <div key={k}>
            <dt className="t-label">{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
        <div className="cf-facts__now">
          <dt className="t-label">
            <span className="led led--green" aria-hidden /> Where it is now
          </dt>
          <dd>{p.status}</dd>
        </div>
      </dl>

      <div className="cf-receipts" aria-labelledby={`receipts-${p.slug}`}>
        <p id={`receipts-${p.slug}`} className="t-label">
          Check the receipts
        </p>
        <ul>
          {p.evidence.map((e) =>
            e.href ? (
              <li key={e.label}>
                <a href={e.href} target="_blank" rel="noopener noreferrer" className="cf-receipt">
                  <b>{e.label} ↗</b>
                  <span>{e.note}</span>
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </li>
            ) : (
              <li key={e.label}>
                <span className="cf-receipt" data-static="">
                  <b>{e.label}</b>
                  <span>{e.note}</span>
                </span>
              </li>
            ),
          )}
        </ul>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- the file */

export function CaseFile({ project: p }: { project: Project }) {
  const env = useCase();
  const { scrollRoot, mode, onAsk, onBook, onRead } = env;
  const full = p.depth === 'full';
  const steps = useMemo(() => stepsFor(p), [p]);
  const no = (id: string) => steps.findIndex((s) => s.id === id) + 1;
  const bodyRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const reads = useReads();
  const read = !!reads.read[p.slug];
  const { prev, next } = neighbours(p.slug);
  const i = caseNumber(p);

  // Reached the end: stamp it.
  useEffect(() => {
    const el = endRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        // only a reader who actually scrolled down here gets the stamp (not a layout that shows it all at once)
        const scrolled = scrollRoot ? scrollRoot.scrollTop : window.scrollY;
        if (scrolled < 600) return;
        io.disconnect();
        if (markRead(p.slug)) onRead?.(p.slug);
      },
      { root: scrollRoot, threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [p.slug, scrollRoot, onRead]);

  const skipTo = (id: string) => (e: MouseEvent) => {
    e.preventDefault();
    env.tick?.();
    scrollToEl(document.getElementById(sectionId(id)), scrollRoot, mode === 'page' ? 84 : 12);
  };

  return (
    <article className={`cf cf--${mode}`} data-slug={p.slug} aria-labelledby="case-title">
      {/* ------------------------------------------------ header */}
      <header className="cf-hero">
        <div className="cf-hero__poster" aria-hidden>
          <img src={posterFor(p.slug)} alt="" width={415} height={590} decoding="async" />
          <span className="screws">
            <i />
            <i />
            <i />
            <i />
          </span>
          {read && <ReadStamp />}
        </div>
        <div className="cf-hero__text">
          <p className="cf-hero__meta">
            <span className="nameplate">
              Case {pad2(i)}/{pad2(CASES.length)}
            </span>
            <span className="t-label">
              {p.context}, {p.year} · {readTime(p)}
            </span>
          </p>
          <H depth={0} id="case-title" className="cf-title t-title" tabIndex={-1}>
            {p.name}
          </H>
          <p className="cf-kind">{p.kind}</p>
          <p className="cf-lead">{p.tagline}</p>
          <p className="cf-links">
            {p.links.live ? (
              <>
                <Ext href={p.links.live}>Try the live product</Ext>
                {p.links.repo && <Ext href={p.links.repo}>Read the code</Ext>}
              </>
            ) : (
              p.company && <span className="cf-company">{p.company}</span>
            )}
            <a href="#engineering" className="cf-link" onClick={skipTo('engineering')}>
              Skip to the engineering ↓
            </a>
          </p>
        </div>
      </header>

      <Cover p={p} />

      {/* ------------------------------------------------ body */}
      <div className="cf-layout">
        <TraceRail steps={steps} bodyRef={bodyRef} />

        <div className="cf-body" ref={bodyRef}>
          {/* 01 Problem */}
          <section id={sectionId('problem')} aria-labelledby={`${sectionId('problem')}-title`} className="cf-sec">
            <SectionHead n={no('problem')} eyebrow="Problem" title="The problem" id="problem" />
            <figure className="cf-quote">
              <blockquote>“{p.prompt}”</blockquote>
              <figcaption>— {p.promptBy}</figcaption>
            </figure>
            <div className="cf-prose">
              {p.problem.body.map((t) => (
                <p key={t}>{t}</p>
              ))}
            </div>
            <H depth={2} className="cf-h3">
              Constraints
            </H>
            <ul className="cf-constraints">
              {p.problem.constraints.map((c, k) => (
                <li key={c}>
                  <span className="t-label" aria-hidden>
                    C{k + 1}
                  </span>
                  {c}
                </li>
              ))}
            </ul>
          </section>

          {/* 02 Role */}
          <section id={sectionId('role')} aria-labelledby={`${sectionId('role')}-title`} className="cf-sec">
            <SectionHead n={no('role')} eyebrow="Role" title="My role" id="role" />
            <div className="cf-role">
              <div className="cf-prose">
                <p className="cf-role__title">{p.role.title}</p>
                <p>{p.role.summary}</p>
                <H depth={2} className="cf-h3">
                  The calls that were mine
                </H>
                <ol className="cf-numbered">
                  {p.role.decisions.map((d, n) => (
                    <li key={d}>
                      <span aria-hidden>{n + 1}</span>
                      {d}
                    </li>
                  ))}
                </ol>
              </div>
              <div className="cf-card cf-with">
                <H depth={2} className="cf-h3">
                  Who I worked with
                </H>
                <ul>
                  {p.role.with.map((w) => (
                    <li key={w.who}>
                      <b>{w.who}</b>
                      <span>{w.part}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <ol className="cf-process" aria-label="How the project went">
              {p.process.map((s, n) => (
                <li key={s.title}>
                  <span className="t-label">
                    {n + 1} · {s.stage}
                  </span>
                  <b>{s.title}</b>
                  <span className="cf-process__body">{s.body}</span>
                  <span className="cf-process__time">{s.duration}</span>
                </li>
              ))}
            </ol>
          </section>

          {/* 03 Research */}
          <section id={sectionId('research')} aria-labelledby={`${sectionId('research')}-title`} className="cf-sec">
            <SectionHead n={no('research')} eyebrow="Research" title="What I learned in the field" id="research" />
            <ul className="cf-methods">
              {p.research.methods.map((m) => (
                <li key={m.label} className="cf-card">
                  <b>{m.label}</b>
                  <span>{m.detail}</span>
                </li>
              ))}
            </ul>
            <ol className="cf-insights">
              {p.research.insights.map((ins, n) => (
                <li key={ins.title}>
                  <span className="cf-insights__n" aria-hidden>
                    {n + 1}
                  </span>
                  <div>
                    <H depth={2} className="cf-h3">
                      {ins.title}
                    </H>
                    <p>{ins.body}</p>
                  </div>
                </li>
              ))}
            </ol>
            {full && (
              <figure className="case-board">
                <figcaption>
                  <span className="t-label">Raw notes</span> {p.artifact.title}
                </figcaption>
                <div className="case-board__cols">
                  {p.artifact.clusters.map((c, k) => (
                    <section key={c.label} className="case-board__col" data-k={k} aria-label={c.label}>
                      <p className="case-board__label">{c.label}</p>
                      <ul className="case-board__notes">
                        {c.notes.map((n) => (
                          <li key={n} className="case-note">
                            {n}
                          </li>
                        ))}
                      </ul>
                    </section>
                  ))}
                </div>
              </figure>
            )}
            <p className="cf-note">
              <span className="t-label">Consent &amp; data</span>
              <span>{p.research.ethics}</span>
            </p>
          </section>

          {/* 04 Decisions */}
          <section id={sectionId('decisions')} aria-labelledby={`${sectionId('decisions')}-title`} className="cf-sec">
            <SectionHead
              n={no('decisions')}
              eyebrow="Decisions"
              title="The decisions that shaped it"
              id="decisions"
              lead="What I considered, what I chose, why, and what it cost."
            />
            <ol className="cf-decisions">
              {p.decisions.map((d, n) => (
                <li key={d.title} className="cf-decision">
                  <p className="cf-decision__n">
                    <span className="nameplate">D-{pad2(n + 1)}</span>
                    <span className="t-label">Decision {n + 1}</span>
                  </p>
                  <H depth={2} className="cf-h3 cf-decision__title">
                    {d.title}
                  </H>
                  <div className="cf-decision__grid">
                    <div>
                      <p className="t-label">Options I tried</p>
                      <ul className="cf-options">
                        {d.options.map((o, k) => {
                          const chosen = k === d.options.length - 1;
                          return (
                            <li key={o} className={chosen ? 'is-chosen' : ''}>
                              <span aria-hidden className="cf-options__mark">
                                {chosen ? '✓' : '✗'}
                              </span>
                              <span>
                                {o}
                                {chosen ? <span className="sr-only"> (chosen)</span> : <span className="cf-options__not">Not chosen</span>}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                    <div className="cf-prose cf-decision__why">
                      <p>
                        <b>The call. </b>
                        {d.chose}
                      </p>
                      <p>
                        <b>Why. </b>
                        {d.why}
                      </p>
                      <p className="cf-cost">
                        <b>What it cost. </b>
                        {d.cost}
                      </p>
                    </div>
                  </div>
                  {d.table && <Table caption={d.table.caption} head={d.table.head} rows={d.table.rows} chosen={d.table.chosen} wrap={[0]} />}
                </li>
              ))}
            </ol>
          </section>

          {/* 05 Iterations (full cases only) */}
          {full && (
            <section id={sectionId('iterations')} aria-labelledby={`${sectionId('iterations')}-title`} className="cf-sec">
              <SectionHead
                n={no('iterations')}
                eyebrow="Iterations"
                title="Three rounds of the key screen"
                id="iterations"
                lead="Wireframes from each round of testing, and what people did with them."
              />
              <ol className="case-rounds">
                {p.iterations.map((it, n) => (
                  <li key={it.name} className="case-round" data-kept={it.kept || undefined}>
                    <div className="case-round__phone">
                      <Wire slug={p.slug} n={n} label={`Round ${n + 1} wireframe: ${it.name}`} />
                    </div>
                    <p className="case-round__meta">
                      <span className="t-label">Round {n + 1}</span>
                      <span className={`chip ${it.kept ? 'chip--primary' : ''}`}>{it.kept ? 'Shipped' : 'Dropped'}</span>
                    </p>
                    <H depth={2} className="cf-h3">
                      {it.name}
                    </H>
                    <p>{it.finding}</p>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {/* 06 The shipped design */}
          <section id={sectionId('design')} aria-labelledby={`${sectionId('design')}-title`} className="cf-sec">
            <SectionHead
              n={no('design')}
              eyebrow="Design"
              title="The shipped design"
              id="design"
              lead="The screens people use, including the ones for when the AI isn't sure or gets it wrong."
            />
            <FlowPlayer slug={p.slug} name={p.name} />
            {full && (
              <>
                <p className="t-label cf-states-label">Every state, side by side</p>
                <ol className="case-screens">
                  {p.screens.map((sc) => (
                    <li key={sc.key} className="case-screen">
                      <Screen id={sc.key} label={`${sc.title}. ${sc.caption}`} />
                      <H depth={2} className="cf-h4">
                        {sc.title}
                      </H>
                      <p>{sc.caption}</p>
                    </li>
                  ))}
                </ol>
              </>
            )}
            <div className="cf-cols cf-design-notes">
              <div className="cf-card">
                <p className="t-label">What didn’t work</p>
                <H depth={2} className="cf-h3">
                  {p.deadEnd.title}
                </H>
                <p>{p.deadEnd.body}</p>
              </div>
              <div className="cf-card">
                <p className="t-label">Accessibility &amp; inclusion</p>
                <H depth={2} className="cf-h3">
                  Who else it had to work for
                </H>
                <ul className="cf-dots">
                  {p.inclusion.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {/* 07 Engineering */}
          <section id={sectionId('engineering')} aria-labelledby={`${sectionId('engineering')}-title`} className="cf-sec">
            <SectionHead n={no('engineering')} eyebrow="Engineering" title="How it’s built" id="engineering" lead={p.engineering.summary} />
            <Engineering project={p} />
          </section>

          {/* 08 Results */}
          <section id={sectionId('results')} aria-labelledby={`${sectionId('results')}-title`} className="cf-sec">
            <SectionHead n={no('results')} eyebrow="Results" title="What happened" id="results" />
            <dl className="cf-metrics">
              {p.results.metrics.map((m, n) => (
                <div key={m.label} className={`cf-metric ${n === 0 ? 'cf-metric--lead lcd' : ''}`}>
                  <dt className="sr-only">{m.label}</dt>
                  <dd>
                    <span className="cf-metric__v">{m.value}</span>
                    <span className="cf-metric__label" aria-hidden>
                      {m.label}
                    </span>
                    <span className="cf-metric__how">How we measured: {m.how}</span>
                  </dd>
                </div>
              ))}
            </dl>
            <div className="cf-prose">
              {p.results.body.map((t) => (
                <p key={t}>{t}</p>
              ))}
            </div>
            <p className="cf-note">
              <span className="t-label">Business</span>
              <span>{p.results.business}</span>
            </p>
            <BeforeAfter data={p.beforeAfter} />
            <figure className="cf-quote cf-quote--user">
              <blockquote>“{p.results.quote.text}”</blockquote>
              <figcaption>— {p.results.quote.who}</figcaption>
            </figure>
          </section>

          {/* 09 Reflection */}
          <section id={sectionId('reflection')} aria-labelledby={`${sectionId('reflection')}-title`} className="cf-sec">
            <SectionHead n={no('reflection')} eyebrow="Reflection" title="What I’d tell my past self" id="reflection" />
            <p className="cf-reflection">{p.reflection}</p>
            <p className="cf-next">
              <b>Next: </b>
              {p.next}
            </p>
            <div className="cf-actions">
              <button type="button" className="btn" onClick={() => onAsk(`What was the hardest part of ${p.name}?`)}>
                <MociDot /> Ask Moci about {p.name}
              </button>
              {p.links.live && <Ext href={p.links.live} className="btn btn--ghost">Live product</Ext>}
              {p.links.repo && <Ext href={p.links.repo} className="btn btn--ghost">Code</Ext>}
            </div>
          </section>

          {/* ------------------------------------------------ the end */}
          <div className="cf-end" ref={endRef}>
            <div className={`cf-stamp ${read ? 'is-read' : ''}`} aria-live="polite">
              {read ? (
                <>
                  <ReadStamp size="lg" label={`Case ${pad2(i)} read`} />
                  <p>
                    {Object.keys(reads.read).length} of {CASES.length} case studies read.
                  </p>
                </>
              ) : (
                <p className="t-label">End of case file {pad2(i)}</p>
              )}
            </div>
            <div className="cf-cta">
              <div>
                <p className="cf-cta__title">Hiring for a role like this?</p>
                <p>Book a chat with Adelia, or ask Moci about {p.name} first: it answers from the same numbers, and says when it doesn’t know.</p>
              </div>
              <div className="cf-cta__keys">
                <button type="button" className="btn btn--primary" onClick={onBook}>
                  Book a chat
                </button>
                <button type="button" className="btn btn--ghost" onClick={() => onAsk(`Tell me about ${p.name}.`)}>
                  Rather ask than read?
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------ keep reading */}
      <nav className="cf-more" aria-label="More case studies">
        <p className="t-label">Keep reading</p>
        <ul>
          {[
            { q: prev, dir: 'Previous case' },
            { q: next, dir: 'Next case' },
          ].map(({ q, dir }) => (
            <li key={dir}>
              <CaseLink slug={q.slug} className="cf-more__card" label={`${dir}: ${q.name}, ${q.kind}`}>
                <span className="cf-more__poster" aria-hidden>
                  <img src={posterFor(q.slug)} alt="" loading="lazy" decoding="async" />
                </span>
                <span className="cf-more__text">
                  <span className="t-label">
                    {dir === 'Previous case' ? '← ' : ''}
                    {dir}
                    {dir === 'Next case' ? ' →' : ''}
                  </span>
                  <b>{q.name}</b>
                  <span>
                    {q.kind} · {q.year}
                  </span>
                </span>
                {reads.read[q.slug] && <ReadStamp />}
              </CaseLink>
            </li>
          ))}
        </ul>
      </nav>
    </article>
  );
}

/** Moci's face, tiny (a jelly drop, never a sparkle). */
function MociDot() {
  return (
    <svg width="18" height="18" viewBox="0 0 64 64" aria-hidden>
      <path d="M32 5C32 5 11 27.5 11 40.5a21 21 0 0 0 42 0C53 27.5 32 5 32 5Z" fill="#A9D6F5" stroke="#5AA9E6" strokeWidth="3" />
      <circle cx="25" cy="42" r="3.4" fill="#18263A" />
      <circle cx="39" cy="42" r="3.4" fill="#18263A" />
      <path d="M29 48c1.8 1.6 4.2 1.6 6 0" stroke="#18263A" strokeWidth="2.6" strokeLinecap="round" fill="none" />
    </svg>
  );
}
